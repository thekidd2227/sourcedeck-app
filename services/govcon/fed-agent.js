// services/govcon/fed-agent.js
//
// Layer 2: Fed Agent reasoning wrapper.
//
// This is a structured bidding co-pilot, not a chatbot. It consumes
// deterministic Middleman Fit outputs and converts them into practical
// strategy, RFQs, quote drafts, relationship plans, pricing notes, and
// next actions. It never overrides deterministic KILL or MORE_RESEARCH_NEEDED.

'use strict';

const middleman = require('./middleman-fit');

const MODES = Object.freeze([
  'ANALYZE_SOLICITATION',
  'MIDDLEMAN_FIT',
  'BID_NO_BID',
  'PRICE_STRATEGY',
  'SOURCE_SUBS',
  'GENERATE_SUB_RFQ',
  'BUILD_QUOTE_PACKET',
  'COMPLIANCE_CHECK',
  'RELATIONSHIP_PLAN',
  'DAILY_CAPTURE_BRIEF',
  'MOVE_TO_PIPELINE'
]);

function runFedAgent(mode, input, context) {
  mode = MODES.includes(mode) ? mode : 'MIDDLEMAN_FIT';
  input = input && typeof input === 'object' ? input : {};
  context = context && typeof context === 'object' ? context : {};
  const opportunity = input.opportunity || input;
  const profile = input.profile || context.profile || {};
  const bench = input.subcontractorBench || context.subcontractorBench || [];
  const analysis = normalizeAnalysis(input.middlemanAnalysis) || middleman.analyzeMiddlemanFit(opportunity, profile, bench);

  let markdown;
  let json;
  if (mode === 'MIDDLEMAN_FIT' || mode === 'ANALYZE_SOLICITATION') {
    markdown = buildBidDecisionNarrative(analysis);
    json = Object.assign({}, analysis.structured, { mode: 'MIDDLEMAN_FIT' });
  } else if (mode === 'GENERATE_SUB_RFQ') {
    markdown = buildSubcontractorRFQ(opportunity, analysis);
    json = { mode, decision: analysis.decision, document: markdown, pipelineRecommendation: analysis.pipelineRecommendation };
  } else if (mode === 'BUILD_QUOTE_PACKET') {
    markdown = buildQuotePacketDraft(opportunity, analysis, profile);
    json = { mode, decision: analysis.decision, document: markdown, pipelineRecommendation: analysis.pipelineRecommendation };
  } else if (mode === 'PRICE_STRATEGY') {
    markdown = buildPricingStrategy(opportunity, analysis);
    json = { mode, decision: analysis.decision, pricingStrategy: markdown, profitStressTest: analysis.profitStressTest };
  } else if (mode === 'RELATIONSHIP_PLAN') {
    markdown = buildRelationshipPlan(opportunity, input.phase || 'active_solicitation', input.stakeholderType || 'official_poc');
    json = { mode, decision: analysis.decision, relationshipPlan: markdown };
  } else {
    markdown = [
      buildBidDecisionNarrative(analysis),
      '',
      '## Immediate Workflow',
      list(buildImmediateActions(opportunity, analysis))
    ].join('\n');
    json = { mode, decision: analysis.decision, score: analysis.score, nextActions: buildImmediateActions(opportunity, analysis), pipelineRecommendation: analysis.pipelineRecommendation };
  }

  return Object.freeze({
    ok: true,
    mode,
    decision: analysis.decision,
    score: analysis.score,
    deterministicLocked: isDeterministicGateLocked(analysis),
    profitGateLocked: analysis.profitStressTest && analysis.profitStressTest.passesStress === false,
    markdown,
    json,
    middlemanAnalysis: analysis
  });
}

function buildBidDecisionNarrative(analysis) {
  analysis = normalizeAnalysis(analysis) || middleman.analyzeMiddlemanFit({}, {}, []);
  const locked = isDeterministicGateLocked(analysis)
    ? '\nDeterministic gate is locked. Do not override this with AI reasoning.'
    : '';
  return [
    '# MIDDLEMAN FIT ANALYSIS',
    `- Decision: ${analysis.decision || 'MORE_RESEARCH_NEEDED'}`,
    `- Score: ${analysis.score || 0}/100`,
    locked,
    '',
    '## Prime Role Required',
    list(analysis.primeRole || middleman.PRIME_ROLE),
    '',
    '## Subcontractor Role Required',
    list(analysis.subcontractorRole || middleman.SUB_ROLE),
    '',
    '## Remote Management Feasibility',
    analysis.remoteManagementFeasibility || 'unknown',
    '',
    '## On-Site Presence Risk',
    categoryLines(analysis.warnings, 'site_presence_risk') || '- No explicit site-presence issue from provided facts.',
    '',
    '## Subcontracting/Pass-Through Risk',
    categoryLines(analysis.warnings, ['limitation_on_subcontracting', 'similarly_situated_sub_required', 'passive_pass_through_risk']) || '- Prime role still must be documented and active.',
    '',
    '## License/Bond/Insurance Needs',
    categoryLines(analysis.warnings, ['license_required', 'bonding_required', 'insurance_required']) || '- Not identified from provided facts.',
    '',
    '## Profit Stress Test',
    profitLines(analysis.profitStressTest),
    '',
    '## Compliance Warnings',
    list((analysis.warnings || []).map(w => `${w.category}: ${w.message}`)),
    '',
    '## Missing Data',
    list(analysis.missingData || []),
    '',
    '## Immediate Actions',
    list(buildImmediateActions(null, analysis))
  ].filter(Boolean).join('\n');
}

function buildSubcontractorRFQ(opportunity, middlemanAnalysis) {
  opportunity = opportunity && typeof opportunity === 'object' ? opportunity : {};
  middlemanAnalysis = normalizeAnalysis(middlemanAnalysis) || middleman.analyzeMiddlemanFit(opportunity, {}, []);
  const blocked = blockNotice(middlemanAnalysis);
  return [
    '# SUBCONTRACTOR RFQ',
    blocked,
    '',
    `Opportunity: ${opportunity.title || opportunity.Title || '[title]'}`,
    `Solicitation: ${opportunity.solicitationNumber || opportunity.noticeId || opportunity['Solicitation Number'] || opportunity['Notice ID'] || '[solicitation/notice id]'}`,
    `Agency: ${opportunity.agency || opportunity.Agency || '[agency]'}`,
    `Place of Performance: ${opportunity.placeOfPerformance || opportunity['Place of Performance'] || '[place]'}`,
    `Response Needed By: [insert sub quote deadline before prime deadline]`,
    '',
    '## Requested Subcontractor Quote',
    '- Fixed-price quote for the field execution scope.',
    '- Labor, materials, equipment, supervision, travel, and applicable taxes/fees clearly separated.',
    '- Confirmation of availability for the period of performance.',
    '- Confirmation of licenses, insurance, bonding, wage compliance, and site-access readiness.',
    '- List assumptions, exclusions, and lead times.',
    '',
    '## Prime Responsibilities',
    list(middlemanAnalysis.primeRole || middleman.PRIME_ROLE),
    '',
    '## Subcontractor Responsibilities',
    list(middlemanAnalysis.subcontractorRole || middleman.SUB_ROLE),
    '',
    '## Required Attachments',
    '- Capability summary',
    '- Relevant past performance',
    '- License/insurance/bonding evidence',
    '- Socioeconomic/similarly situated status if applicable',
    '- Quote with validity date'
  ].filter(Boolean).join('\n');
}

function buildQuotePacketDraft(opportunity, middlemanAnalysis, profile) {
  opportunity = opportunity && typeof opportunity === 'object' ? opportunity : {};
  profile = profile && typeof profile === 'object' ? profile : {};
  middlemanAnalysis = normalizeAnalysis(middlemanAnalysis) || middleman.analyzeMiddlemanFit(opportunity, profile, []);
  const blocked = blockNotice(middlemanAnalysis);
  return [
    '# QUOTE PACKET DRAFT',
    blocked,
    '',
    `Offeror: ${profile.name || '[company name]'}`,
    `UEI/CAGE/Certifications: ${profile.uei || '[UEI]'} | ${profile.cage || '[CAGE]'} | ${profile.certifications || '[certifications]'}`,
    `Opportunity: ${opportunity.title || opportunity.Title || '[title]'}`,
    `Solicitation: ${opportunity.solicitationNumber || opportunity.noticeId || opportunity['Solicitation Number'] || opportunity['Notice ID'] || '[id]'}`,
    `NAICS/PSC: ${opportunity.naics || opportunity.NAICS || '[NAICS]'} / ${opportunity.psc || opportunity.PSC || '[PSC]'}`,
    '',
    '## Fixed-Price Quote',
    '[Insert price after sub quotes, compliance review, and margin stress test.]',
    '',
    '## Scope',
    '[Describe deliverables, quantities, service levels, and acceptance criteria.]',
    '',
    '## Prime Management/Admin/QA Role',
    list(middlemanAnalysis.primeRole || middleman.PRIME_ROLE),
    '',
    '## Subcontractor Utilization Note',
    'Subcontractor support may be used for field execution. The prime retains management, administration, scheduling, customer communication, QA/QC, compliance documentation, invoicing, performance tracking, issue escalation, subcontractor coordination, and final accountability.',
    '',
    '## Assumptions and Exclusions',
    '- Agency provides timely access and official answers through allowed channels.',
    '- Work outside the stated scope, after-hours support, permits, travel, bonding, and changed conditions require written authorization unless included in final pricing.'
  ].filter(Boolean).join('\n');
}

function buildRelationshipPlan(opportunity, phase, stakeholderType) {
  phase = phase || 'active_solicitation';
  stakeholderType = stakeholderType || 'official_poc';
  const active = /active|solicitation|rfq|rfp/i.test(phase);
  return [
    '# FEDERAL RELATIONSHIP PLAN',
    `Stakeholder Type: ${stakeholderType}`,
    `Phase: ${phase}`,
    '',
    active
      ? 'Use only the official solicitation Q&A, amendment, or listed POC process. Do not pursue informal persuasion or side-channel outreach during the restricted window.'
      : 'Use public, procurement-safe channels to understand mission needs, upcoming requirements, and industry-day opportunities.',
    '',
    '## Allowed Actions',
    '- Read the solicitation and amendments before contacting anyone.',
    '- Submit factual clarification questions through the allowed channel.',
    '- Track answers and amendments in the opportunity file.',
    '- Keep all communications professional, procurement-safe, and documented.'
  ].join('\n');
}

function buildPricingStrategy(opportunity, middlemanAnalysis) {
  middlemanAnalysis = normalizeAnalysis(middlemanAnalysis) || middleman.analyzeMiddlemanFit(opportunity, {}, []);
  const p = middlemanAnalysis.profitStressTest || {};
  return [
    '# PRICING STRATEGY',
    `Decision Gate: ${middlemanAnalysis.decision}`,
    `Contract Value Used: ${money(p.contractValue)}`,
    `Base Sub Cost: ${num(p.baseSubCostPct)}%`,
    `Prime Admin Cost: ${num(p.primeAdminCostPct)}%`,
    `Stress High Sub Cost: ${num(p.stressHighSubCostPct)}%`,
    `Stress High Margin: ${num(p.stressHighMarginPct)}%`,
    `Stress Pass: ${p.passesStress ? 'yes' : 'no'}`,
    '',
    p.passesStress
      ? 'Proceed only after written sub quotes confirm pricing, inclusions, exclusions, wage assumptions, and documentation requirements.'
      : 'Do not bid at current assumptions. Reduce sub cost, increase price, narrow scope, or no-bid.'
  ].join('\n');
}

function buildImmediateActions(opportunity, middlemanAnalysis) {
  middlemanAnalysis = normalizeAnalysis(middlemanAnalysis);
  if (!middlemanAnalysis) return [];
  if (middlemanAnalysis.decision === 'KILL') return ['Move to Killed/No-Bid and record hard-stop rationale.'];
  const base = [
    'Verify solicitation facts and fill the missing-data checklist.',
    'Contact official POC only through allowed solicitation channels.',
    'Identify 3-5 qualified subcontractors.',
    'Request sub quotes with license, insurance, bonding, wage, and availability confirmations.',
    'Prepare quote packet after profit stress test passes.',
    'Review compliance risks before final bid/no-bid decision.'
  ];
  if (middlemanAnalysis.decision === 'MORE_RESEARCH_NEEDED') return base.slice(0, 4);
  return base;
}

function blockNotice(analysis) {
  analysis = normalizeAnalysis(analysis);
  if (!analysis) return '';
  if (analysis.decision === 'KILL') return 'Deterministic decision is KILL. Use this draft only for internal documentation unless leadership records an exception.';
  if (analysis.decision === 'MORE_RESEARCH_NEEDED') return 'Deterministic decision is MORE_RESEARCH_NEEDED. Do not submit until missing facts are resolved.';
  if (analysis.profitStressTest && analysis.profitStressTest.passesStress === false) return 'Deterministic profit stress gate failed. Use this draft for internal pricing work only; do not submit until margin assumptions pass.';
  return '';
}

function isDeterministicGateLocked(analysis) {
  return analysis && (
    analysis.decision === 'KILL' ||
    analysis.decision === 'MORE_RESEARCH_NEEDED' ||
    (analysis.profitStressTest && analysis.profitStressTest.passesStress === false)
  );
}

function normalizeAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return null;
  const decision = typeof analysis.decision === 'string' ? analysis.decision : 'MORE_RESEARCH_NEEDED';
  return Object.assign({
    ok: true,
    decision,
    score: typeof analysis.score === 'number' ? analysis.score : 0,
    hardStops: Array.isArray(analysis.hardStops) ? analysis.hardStops : [],
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    missingData: Array.isArray(analysis.missingData) ? analysis.missingData : [],
    primeRole: Array.isArray(analysis.primeRole) ? analysis.primeRole : middleman.PRIME_ROLE.slice(),
    subcontractorRole: Array.isArray(analysis.subcontractorRole) ? analysis.subcontractorRole : middleman.SUB_ROLE.slice(),
    remoteManagementFeasibility: analysis.remoteManagementFeasibility || 'unknown',
    profitStressTest: analysis.profitStressTest && typeof analysis.profitStressTest === 'object' ? analysis.profitStressTest : { passesStress: false },
    nextActions: Array.isArray(analysis.nextActions) ? analysis.nextActions : [],
    pipelineRecommendation: analysis.pipelineRecommendation || (decision === 'KILL' ? 'kill' : decision === 'MORE_RESEARCH_NEEDED' ? 'research' : 'no_bid')
  }, analysis);
}

function categoryLines(warnings, categories) {
  categories = Array.isArray(categories) ? categories : [categories];
  const rows = (warnings || []).filter(w => categories.includes(w.category));
  return rows.map(w => `- ${w.message}`).join('\n');
}
function profitLines(p) {
  p = p || {};
  return [
    `- Contract Value: ${money(p.contractValue)}`,
    `- Base Sub Cost: ${num(p.baseSubCostPct)}%`,
    `- Base Margin: ${num(p.baseMarginPct)}%`,
    `- Stress High Sub Cost: ${num(p.stressHighSubCostPct)}%`,
    `- Stress High Margin: ${num(p.stressHighMarginPct)}%`,
    `- Passes Stress: ${p.passesStress ? 'yes' : 'no'}`
  ].join('\n');
}
function list(items) { return (items || []).length ? items.map(i => `- ${i}`).join('\n') : '- None'; }
function money(v) { return typeof v === 'number' ? '$' + Math.round(v).toLocaleString('en-US') : 'unknown'; }
function num(v) { return typeof v === 'number' ? String(v) : 'unknown'; }

module.exports = {
  MODES,
  runFedAgent,
  buildBidDecisionNarrative,
  buildSubcontractorRFQ,
  buildQuotePacketDraft,
  buildRelationshipPlan,
  buildPricingStrategy,
  buildImmediateActions
};
