'use strict';

const { guardDraft } = require('./outreach-window');
const { buildStakeholderGraph } = require('./stakeholder-graph');

function generateClarificationQuestions(input) {
  input = input || {};
  const opportunity = input.opportunity || {};
  const text = String(input.text || opportunity.description || '');
  const gate = guardDraft(opportunity, 'clarification');
  const sections = findRiskySections(text);
  const questions = buildQuestions(sections).slice(0, 10);
  while (questions.length < 10) {
    questions.push({
      question: fallbackQuestion(questions.length),
      sourceSection: 'General',
      sourceQuote: 'No specific quote provided; user review required.',
      risk: 'missing_detail',
      safeRoute: 'Official Q&A / named POC route only'
    });
  }
  return {
    ok: true,
    label: isActive(opportunity) ? 'Official Q&A / Clarification Draft' : 'Clarification Planning Draft',
    qAndADeadlinePassed: deadlinePassed(opportunity.qAndADeadline || opportunity.qaDeadline),
    outreachWindow: gate.window,
    directOutreachAllowed: gate.allowed,
    questions,
    complianceNote: 'Submit only through the official Q&A portal or named solicitation POC. Do not seek non-public information or side-channel influence.'
  };
}

function buildRelationshipStrategy(input) {
  input = input || {};
  const opportunity = input.opportunity || {};
  const graph = buildStakeholderGraph(opportunity, input.extras || {});
  return {
    ok: true,
    stakeholderMap: graph.nodes || [],
    engagementPriorities: [
      'Use official Q&A for active solicitation questions.',
      'Engage Small Business Specialist only when solicitation rules allow.',
      'Use industry days, pre-solicitation notices, and public capability statements before release.',
      'Use post-award debriefs and future-opportunity follow-up after the restricted window closes.'
    ],
    communicationStrategy: 'Ethical, FAR-compliant, public-record and official-channel engagement only.',
    complianceChecklist: [
      'FAR 3.101-1 integrity reviewed',
      'No gifts or preferential treatment requested',
      'No non-public source-selection information requested',
      'Active solicitation communications routed through official Q&A/POC'
    ],
    interactionLogStructure: ['date', 'stakeholderRole', 'officialRoute', 'topic', 'sourceOpportunity', 'followUpOwner'],
    relationshipHealthIndicators: ['allowed touchpoints completed', 'response clarity', 'post-award debrief captured', 'future-fit notes logged'],
    safetyNote: graph.safetyNote
  };
}

function findRiskySections(text) {
  const lines = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  const risky = lines.filter(l => /shall|must|required|ambiguous|submit|pricing|past performance|site visit|insurance|bond|deadline|delivery|section [clm]/i.test(l));
  return risky.slice(0, 12).map((quote, i) => ({ section: sectionName(quote, i), quote }));
}

function buildQuestions(sections) {
  const stems = [
    'Please confirm whether the requirement in the cited section applies to the prime, subcontractor, or both.',
    'Please confirm the accepted submission format and whether any supporting attachment is required.',
    'Please clarify the evaluation impact if an offeror proposes an equivalent method for this requirement.',
    'Please confirm whether the deadline in the cited section is final or subject to amendment.',
    'Please clarify whether pricing should be submitted as a single total, line-item detail, or both.',
    'Please confirm whether past performance examples may include subcontracted or team-member work.',
    'Please clarify any site-visit attendance, RSVP, or access requirements tied to this section.',
    'Please confirm insurance, bonding, licensing, or certification requirements that must be active at proposal submission.',
    'Please clarify the expected deliverable acceptance criteria for this requirement.',
    'Please confirm whether questions on this item must be submitted through the Q&A portal only.'
  ];
  return sections.map((s, i) => ({
    question: stems[i % stems.length],
    sourceSection: s.section,
    sourceQuote: s.quote.slice(0, 500),
    risk: classifyRisk(s.quote),
    safeRoute: 'Official Q&A / named POC route only'
  }));
}

function fallbackQuestion(i) {
  return [
    'Please confirm all required proposal volumes, page limits, and file naming instructions.',
    'Please confirm whether amendments change any response date, Q&A date, or submission instruction.',
    'Please confirm the evaluation factors and relative importance used for award.',
    'Please confirm required subcontractor documentation for proposal submission.'
  ][i % 4];
}

function classifyRisk(q) {
  if (/price|cost/i.test(q)) return 'pricing';
  if (/deadline|due|date/i.test(q)) return 'deadline';
  if (/site|onsite|visit/i.test(q)) return 'site_access';
  if (/past performance/i.test(q)) return 'past_performance';
  return 'ambiguity';
}

function sectionName(q, i) {
  const m = q.match(/\b(section\s+[A-Z](?:\.\d+)*)\b/i) || q.match(/\b([CLM]\.\d+(?:\.\d+)*)\b/i);
  return m ? m[1].toUpperCase() : `Source ${i + 1}`;
}
function isActive(o) { return /solicitation|rfp|rfq|combined/i.test(String(o.noticeType || o.noticeGroup || '')); }
function deadlinePassed(d) { const t = Date.parse(d || ''); return Number.isFinite(t) ? t < Date.now() : false; }

module.exports = { generateClarificationQuestions, buildRelationshipStrategy };
