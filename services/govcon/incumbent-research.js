'use strict';

function researchIncumbent(input) {
  input = input || {};
  const opportunity = input.opportunity || input.opp || {};
  const awards = Array.isArray(input.awards) ? input.awards : [];
  const profile = input.profile || {};
  const likely = chooseIncumbent(opportunity, awards);
  const scenarios = pricingScenarios(likely, profile);
  const confidence = confidenceScore(opportunity, likely, awards);

  return Object.freeze({
    ok: true,
    opportunityId: opportunity.noticeId || opportunity.solicitationNumber || null,
    incumbent: likely ? normalizeAward(likely) : null,
    missingIncumbent: !likely,
    pricingAnalysis: scenarios,
    sdvosbPositioning: sdvosbPosition(opportunity, likely),
    recommendation: goNoGo(confidence, scenarios, opportunity),
    confidence,
    sourceNotes: sourceNotes(likely, awards),
    publicSources: [
      'SAM.gov award notices when available',
      'USASpending.gov award records',
      'FPDS/contract award data when available',
      'Agency public websites'
    ],
    aiPolicy: 'Public-source research aid only. Human review required before pricing or bid decision.'
  });
}

function chooseIncumbent(opportunity, awards) {
  const sol = norm(opportunity.solicitationNumber);
  const title = norm(opportunity.title);
  const agency = norm(opportunity.agency || opportunity.office || opportunity.organizationName);
  const scored = awards.map(a => ({ award: a, score: awardScore(a, sol, title, agency) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].award : null;
}

function awardScore(a, sol, title, agency) {
  const text = norm([
    a.solicitationNumber, a.title, a.description, a.agency, a.office,
    a.contractNumber, a.awardeeName, a.recipientName
  ].filter(Boolean).join(' '));
  let score = 0;
  if (sol && text.includes(sol)) score += 45;
  if (agency && text.includes(agency)) score += 20;
  const titleTokens = title.split(/\s+/).filter(t => t.length > 4);
  score += Math.min(25, titleTokens.filter(t => text.includes(t)).length * 5);
  if (a.awardAmount || a.amount || a.obligatedAmount) score += 5;
  if (a.periodOfPerformance || a.popStart || a.popEnd) score += 5;
  return score;
}

function normalizeAward(a) {
  if (!a) return null;
  const amount = dollars(a.awardAmount || a.amount || a.obligatedAmount || a.totalObligation);
  return Object.freeze({
    companyName: a.companyName || a.awardeeName || a.recipientName || a.vendorName || null,
    uei: a.uei || a.ueiSAM || null,
    cage: a.cage || a.cageCode || null,
    awardAmount: amount,
    awardDate: dateOnly(a.awardDate || a.dateSigned || a.actionDate),
    contractNumber: a.contractNumber || a.piid || a.awardId || null,
    periodOfPerformance: a.periodOfPerformance || {
      start: dateOnly(a.popStart || a.periodOfPerformanceStartDate),
      end: dateOnly(a.popEnd || a.periodOfPerformanceEndDate)
    },
    agency: a.agency || a.awardingAgency || a.office || null,
    naics: a.naics || a.naicsCode || null,
    psc: a.psc || a.classificationCode || null,
    setAside: a.setAside || a.typeOfSetAside || null,
    modificationHistory: Array.isArray(a.modificationHistory) ? a.modificationHistory : [],
    publicVulnerabilities: Array.isArray(a.publicVulnerabilities) ? a.publicVulnerabilities : [],
    sourceLinks: list(a.sourceLinks || a.sources || a.url || a.samUrl)
  });
}

function pricingScenarios(award, profile) {
  const normAward = normalizeAward(award);
  const baseline = normAward ? normAward.awardAmount : null;
  const subPct = pct(profile.subcontractorCostPct, 70);
  const overheadPct = pct(profile.overheadPct || profile.primeAdminCostPct, 0);
  const scenarios = [
    ['conservative_match_incumbent', 1],
    ['competitive_5_under', 0.95],
    ['aggressive_10_under', 0.90]
  ].map(([name, mult]) => {
    const price = baseline == null ? null : round(baseline * mult, 2);
    const directCost = price == null ? null : round(price * subPct / 100, 2);
    const overhead = price == null ? null : round(price * overheadPct / 100, 2);
    const profit = price == null ? null : round(price - directCost - overhead, 2);
    const marginPct = price ? round(profit / price * 100, 2) : null;
    return { name, proposedPrice: price, subcontractorCost: directCost, overhead, profit, marginPct };
  });
  return { baselineHistoricalPrice: baseline, assumptions: { subcontractorCostPct: subPct, overheadPct }, scenarios };
}

function confidenceScore(opportunity, incumbent, awards) {
  if (!incumbent) return 25;
  let score = 45;
  if (incumbent.awardAmount || incumbent.amount) score += 15;
  if (incumbent.contractNumber || incumbent.piid) score += 15;
  if (incumbent.companyName || incumbent.awardeeName || incumbent.recipientName) score += 10;
  if (incumbent.periodOfPerformance || incumbent.popStart || incumbent.popEnd) score += 10;
  if (awards.length > 1) score += 5;
  return Math.min(95, score);
}

function sdvosbPosition(opportunity, incumbent) {
  const setAside = String(opportunity.setAside || incumbent?.setAside || '').toLowerCase();
  if (/sdvosb|service.disabled|veteran/.test(setAside)) {
    return 'SDVOSB lane appears relevant. Verify eligibility, limitation-on-subcontracting, and similarly situated subcontractor posture before bidding.';
  }
  return 'No SDVOSB-specific positioning found from provided public award facts.';
}

function goNoGo(confidence, pricing, opportunity) {
  const scenarios = pricing.scenarios || [];
  const competitive = scenarios.find(s => s.name === 'competitive_5_under') || {};
  if (confidence < 45) return { decision: 'MORE_RESEARCH_NEEDED', reason: 'Likely incumbent could not be established from provided public records.' };
  if (competitive.marginPct != null && competitive.marginPct < 25) {
    return { decision: 'KILL', reason: 'Competitive incumbent-price scenario does not preserve target margin.' };
  }
  return { decision: 'BID_IF_TIME', reason: 'Incumbent baseline found; verify scope deltas, amendments, and pricing assumptions.' };
}

function sourceNotes(incumbent, awards) {
  if (!incumbent) return ['No likely incumbent found in provided award records. Pull SAM.gov, USASpending, FPDS, and agency award pages before relying on this report.'];
  const n = normalizeAward(incumbent);
  return [
    `Likely incumbent selected from ${awards.length} public award record(s).`,
    n.sourceLinks.length ? `Source links: ${n.sourceLinks.join(', ')}` : 'No direct source link was provided with the award record.'
  ];
}

function dollars(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function pct(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function round(n, p) { const f = Math.pow(10, p || 0); return Math.round(n * f) / f; }
function dateOnly(v) { if (!v) return null; const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : String(v).slice(0, 10); }
function list(v) { return Array.isArray(v) ? v.filter(Boolean).map(String) : v ? [String(v)] : []; }
function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

module.exports = { researchIncumbent, chooseIncumbent, pricingScenarios };
