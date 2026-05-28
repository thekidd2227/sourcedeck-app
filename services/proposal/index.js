'use strict';

const HUMAN_REVIEW_REQUIRED = 'AI draft. Human review required before submission. Verify Section L, Section M, amendments, pricing assumptions, and company facts.';

const TABS = Object.freeze([
  'Begin Proposal Drafting',
  'Technical Proposal',
  'Cost Volume',
  'Past Performance',
  'Compliance Checklist',
  'Partner Appendix',
  'Review / Export'
]);

function createProposalWorkspace(input) {
  input = input || {};
  const opportunity = input.opportunity || {};
  const company = normalizeCompany(input.companyProfile || input.company || {});
  if (!company.name) {
    return {
      ok: false,
      reason: 'missing_company_profile',
      missingInputs: ['companyProfile.name'],
      tabs: TABS.slice(),
      prompt: 'Add the configured company profile before drafting. SourceDeck will not emit placeholders.'
    };
  }
  const matrix = input.complianceMatrix || {};
  const requiredInputs = requiredInputsFor(opportunity, matrix);
  return {
    ok: true,
    opportunityId: opportunity.noticeId || opportunity.solicitationNumber || null,
    company,
    tabs: TABS.slice(),
    requiredInputs,
    tableOfContents: buildToc(matrix),
    currentStep: 'Executive Summary',
    drafts: draftSections(Object.assign({}, input, { companyProfile: company })).drafts,
    qualityGate: qualityGate(company, opportunity, requiredInputs),
    aiPolicy: HUMAN_REVIEW_REQUIRED
  };
}

function draftSections(input) {
  input = input || {};
  const opportunity = input.opportunity || null;
  const company = normalizeCompany(input.companyProfile || input.company || {});
  const matrix = input.complianceMatrix || null;
  const sections = Array.isArray(input.sections) && input.sections.length
    ? input.sections
    : ['Executive Summary', 'Technical Proposal', 'Cost Volume', 'Past Performance', 'Compliance Checklist'];

  if (!opportunity) return { ok: false, reason: 'no_opportunity' };
  if (!company.name) {
    return {
      ok: false,
      reason: 'missing_company_profile',
      missingInputs: ['companyProfile.name'],
      aiPolicy: HUMAN_REVIEW_REQUIRED
    };
  }

  const drafts = sections.map(section => draftOne(section, opportunity, matrix, company, input));
  return Object.freeze({
    ok: true,
    opportunityId: opportunity.noticeId || opportunity.solicitationNumber || null,
    drafts,
    aiPolicy: HUMAN_REVIEW_REQUIRED,
    qualityGate: qualityGate(company, opportunity, requiredInputsFor(opportunity, matrix))
  });
}

function draftOne(section, opportunity, matrix, company, input) {
  const name = String(section || 'Executive Summary');
  if (/cost|price/i.test(name)) return draftCostVolume(input);
  const rows = matrix && Array.isArray(matrix.rows)
    ? matrix.rows.filter(r => sectionMatch(r, name))
    : [];
  const text = noPlaceholders([
    `${name}`,
    '',
    `${company.name} will serve as the prime contractor for ${val(opportunity.title)}. The prime role is oversight, coordination, compliance, scheduling, quality control, subcontractor management, invoicing, and final accountability.`,
    rows.length ? 'This section responds to: ' + rows.map(r => r.sourceSection || r.reqId).filter(Boolean).join(', ') + '.' : 'Section L and Section M alignment requires user verification before final text.',
    /technical/i.test(name) ? 'The technical approach will map each Section C requirement to the highest-weighted Section M factors and identify SOW areas that require approved subcontractor expertise.' : '',
    /past/i.test(name) ? 'Past performance will use only approved company or partner references with permission and substantiated scope relevance.' : '',
    /partner/i.test(name) ? 'Partners remain unnamed until the user approves specific names, qualifications, and role descriptions.' : '',
    '',
    HUMAN_REVIEW_REQUIRED
  ].filter(Boolean).join('\n'), company);
  return {
    section: name,
    status: 'draft_for_review',
    text,
    reviewerNotes: [
      'Confirm company profile facts and certifications.',
      'Cross-reference Section C, Section L, and Section M.',
      'Do not name partners until approved by the user.'
    ],
    sourceMatrixRows: rows.map(r => r.reqId || r.sourceSection).filter(Boolean)
  };
}

function draftCostVolume(input) {
  input = input || {};
  const quote = analyzeVendorQuote(input.vendorQuote || input.quote || {});
  const markupPct = Number.isFinite(Number(input.markupPct)) ? Number(input.markupPct) : 35;
  const finalPrice = quote.totalCost == null ? null : round(quote.totalCost * (1 + markupPct / 100), 2);
  const breakdownRequired = !!input.breakdownRequired;
  const breakdown = quote.totalCost == null ? null : {
    subcontractorCostDisplayed: breakdownRequired ? round(quote.totalCost * 1.25, 2) : quote.totalCost,
    primeProfitManagementDisplayed: breakdownRequired ? round(quote.totalCost * 0.10, 2) : null,
    finalPrice
  };
  return {
    section: 'Cost Volume',
    status: quote.totalCost == null ? 'needs_input' : 'draft_for_review',
    text: quote.totalCost == null
      ? 'Vendor quote total is missing. Add a quote before SourceDeck drafts final cost text.'
      : [
          'Cost Volume',
          `Proposed price: $${finalPrice.toLocaleString()}.`,
          breakdownRequired ? 'The required breakdown separates adjusted subcontractor cost from prime management/profit.' : 'Markup detail is not included in customer-facing text unless the solicitation requires it.',
          'Review FAR 15.408, FAR 15.404-1, FAR 52.215-20, and FAR 31.205-26 for applicability.',
          HUMAN_REVIEW_REQUIRED
        ].join('\n'),
    quoteAnalysis: quote,
    markupPct,
    finalPrice,
    breakdown,
    reviewerNotes: quote.ambiguities.concat(quote.unallowableCostRisks)
  };
}

function analyzeVendorQuote(quote) {
  quote = typeof quote === 'string' ? { text: quote } : (quote || {});
  const text = String(quote.text || '');
  const total = dollars(quote.totalCost || quote.total || firstMatch(text, /total[^\d$]*\$?([\d,]+(?:\.\d{2})?)/i));
  return {
    totalCost: total,
    labor: dollars(quote.labor || firstMatch(text, /labor[^\d$]*\$?([\d,]+(?:\.\d{2})?)/i)),
    materials: dollars(quote.materials || firstMatch(text, /materials?[^\d$]*\$?([\d,]+(?:\.\d{2})?)/i)),
    equipment: dollars(quote.equipment || firstMatch(text, /equipment[^\d$]*\$?([\d,]+(?:\.\d{2})?)/i)),
    travel: dollars(quote.travel || firstMatch(text, /travel[^\d$]*\$?([\d,]+(?:\.\d{2})?)/i)),
    assumptions: list(quote.assumptions),
    exclusions: list(quote.exclusions),
    ambiguities: total == null ? ['Total vendor quote cost is missing.'] : [],
    unallowableCostRisks: /alcohol|entertainment|lobbying|bad debt/i.test(text) ? ['Potential unallowable cost term detected.'] : []
  };
}

function requiredInputsFor(opportunity, matrix) {
  const missing = [];
  if (!opportunity.title) missing.push('opportunity.title');
  if (!opportunity.solicitationNumber) missing.push('opportunity.solicitationNumber');
  if (!opportunity.responseDeadline) missing.push('opportunity.responseDeadline');
  if (!matrix || !Array.isArray(matrix.rows) || !matrix.rows.length) missing.push('complianceMatrix.rows');
  return missing;
}

function qualityGate(company, opportunity, missing) {
  return {
    passed: missing.length === 0 && !!company.name,
    checks: [
      { name: 'company_profile_present', passed: !!company.name },
      { name: 'no_placeholders', passed: true },
      { name: 'required_inputs_present', passed: missing.length === 0 },
      { name: 'human_review_label', passed: true }
    ],
    missingInputs: missing
  };
}

function buildToc(matrix) {
  const rows = matrix && Array.isArray(matrix.rows) ? matrix.rows : [];
  const base = ['Executive Summary'];
  for (const label of ['Technical Proposal', 'Past Performance', 'Management Plan', 'Cost Volume', 'Compliance Checklist']) {
    if (!rows.length || rows.some(r => sectionMatch(r, label))) base.push(label);
  }
  return base;
}

function sectionMatch(row, sectionName) {
  if (!row || !sectionName) return false;
  const haystack = ((row.requirement || '') + ' ' + (row.sourceQuote || '') + ' ' + (row.sourceSection || '')).toLowerCase();
  const s = sectionName.toLowerCase();
  if (s.includes('technical') && /technical|approach|staffing|section c/.test(haystack)) return true;
  if (s.includes('past') && /past\s+performance|cpars|reference/.test(haystack)) return true;
  if (s.includes('management') && /management|transition|org\s*chart|quality/.test(haystack)) return true;
  if (s.includes('price') || s.includes('cost')) return /price|cost|volume/.test(haystack);
  if (s.includes('compliance')) return /shall|must|required|compliance/.test(haystack);
  return false;
}

function normalizeCompany(c) { return { name: String(c.name || '').trim(), profile: c }; }
function noPlaceholders(text) { return String(text).replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim(); }
function firstMatch(text, re) { const m = String(text || '').match(re); return m && m[1]; }
function dollars(v) { if (v == null || v === '') return null; const n = Number(String(v).replace(/[$,]/g, '')); return Number.isFinite(n) ? n : null; }
function list(v) { return Array.isArray(v) ? v.filter(Boolean).map(String) : v ? [String(v)] : []; }
function round(n, p) { const f = Math.pow(10, p || 0); return Math.round(n * f) / f; }
function val(v) { return v == null || v === '' ? 'Unknown' : String(v); }

module.exports = {
  draftSections,
  createProposalWorkspace,
  analyzeVendorQuote,
  draftCostVolume,
  HUMAN_REVIEW_REQUIRED,
  TABS
};
