// services/govcon/capture-os.js
//
// Opportunity mode selection, fast-cash scoring, compliance guardrails,
// fulfillment-model labels, and quote-packet generation.

'use strict';

const { classifyNaics } = require('./naics-expansion');

const OPPORTUNITY_MODES = Object.freeze({
  core_lanes: Object.freeze({
    id: 'core_lanes',
    label: 'Core Lanes',
    description: 'Current registered NAICS and existing capability lanes.'
  }),
  expansion_lanes: Object.freeze({
    id: 'expansion_lanes',
    label: 'Expansion Lanes',
    description: 'Adjacent cash-positive lanes that may require adding NAICS or building proof.'
  }),
  any_fast_cash: Object.freeze({
    id: 'any_fast_cash',
    label: 'Any Fast-Cash Opportunity',
    description: 'Broad SAM search with risk scoring and strict no-bid cues.'
  }),
  micro_purchase_radar: Object.freeze({
    id: 'micro_purchase_radar',
    label: 'Micro-Purchase Radar',
    description: 'Low-dollar quick-turn buys, simple services, and fast quote packets.'
  }),
  subcontractor_ready: Object.freeze({
    id: 'subcontractor_ready',
    label: 'Subcontractor-Ready',
    description: 'Delegable opportunities where the prime still manages admin, schedule, QA, and client communication.'
  })
});

const FULFILLMENT_MODELS = Object.freeze([
  'self-perform',
  'subcontractor-supported',
  'supplier/reseller',
  'no-bid'
]);

function buildSearchFilters(input, profile) {
  input = input && typeof input === 'object' ? input : {};
  profile = profile && typeof profile === 'object' ? profile : {};
  const mode = OPPORTUNITY_MODES[input.mode] ? input.mode : 'core_lanes';
  const filters = {
    keyword: input.keyword || '',
    psc: Array.isArray(input.psc) ? input.psc : [],
    setAsides: Array.isArray(input.setAsides) ? input.setAsides : (profile.setAsides || []),
    noticeTypes: input.noticeTypes || { active_solicitation: true, pre_rfp_intel: mode !== 'micro_purchase_radar', awards: false, modifications: false },
    posted: input.posted || profile.posted || { withinDays: 90 },
    limit: input.limit || 25,
    mode
  };
  if (mode === 'core_lanes') {
    filters.naics = Array.isArray(input.naics) && input.naics.length ? input.naics : (profile.naics || []);
  } else if (mode === 'expansion_lanes' || mode === 'subcontractor_ready') {
    filters.naics = Array.isArray(input.naics) ? input.naics : [];
  } else {
    filters.naics = [];
  }
  if (mode === 'micro_purchase_radar') {
    filters.keyword = filters.keyword || 'micro purchase quote services supplies';
    filters.noticeTypes = { active_solicitation: true, pre_rfp_intel: false, awards: false, modifications: false };
    filters.limit = Math.min(filters.limit || 50, 50);
  }
  return filters;
}

function evaluateOpportunity(opp, profile, opts) {
  opp = opp && typeof opp === 'object' ? opp : {};
  profile = profile && typeof profile === 'object' ? profile : {};
  opts = opts && typeof opts === 'object' ? opts : {};
  const text = [
    opp.title, opp.description, opp.noticeType, opp.noticeGroup, opp.contractType,
    opp.setAside, opp.psc, opp.naics
  ].filter(Boolean).join(' ').toLowerCase();
  const fulfillmentModel = normalizeFulfillmentModel(opts.fulfillmentModel || inferFulfillmentModel(opp, text));
  const warnings = [];
  const positives = [];
  const due = typeof opp.daysUntilDue === 'number' ? opp.daysUntilDue : parseDays(opp);
  const naicsStatus = classifyNaics(opp.naics, profile);
  const setAside = String(opp.setAside || '').toLowerCase();
  const isSetAside = !!setAside && !/open|full/.test(setAside);
  const isSupply = /supply|supplies|equipment|product|hardware|furniture|vehicle|manufacturer|medical|dental|parts|material|commodity/.test(text)
    || /^[0-9]{2}$/.test(String(opp.psc || ''));
  const needsLicenseBondInsurance = /construct|renovat|repair|paint|electrical|plumb|hvac|security|guard|medical|clinical|janitorial|facility|facilities|transport|hazmat|licensed|bond|insurance|wage determination/.test(text);
  const likelyStaffingHeavy = /staff|personnel|onsite|on-site|labor hour|temporary|full[-\s]?time|shift|24\/7|coverage/.test(text);

  let riskPoints = 0;
  let fastCashPoints = 45;
  let quoteReadiness = 45;

  if (naicsStatus === 'registered-current') positives.push('Current registered NAICS/capability lane.');
  if (naicsStatus === 'candidate-to-add') { warnings.push('Candidate NAICS: can pursue discovery, but do not treat as current SAM registration.'); riskPoints += 12; }
  if (naicsStatus === 'opportunistic-high-risk') { warnings.push('Outside current/candidate NAICS: opportunistic lane with proof and compliance gap.'); riskPoints += 22; }

  if (fulfillmentModel === 'subcontractor-supported') {
    positives.push('Prime can manage admin, scheduling, client communication, QA, invoicing, and vendor coordination.');
    if (isSetAside) { warnings.push('Set-aside subcontracting model needs limitation-on-subcontracting and similarly situated subcontractor review.'); riskPoints += 22; }
  }
  if (fulfillmentModel === 'supplier/reseller') {
    warnings.push('Supply/reseller model may trigger nonmanufacturer or authorized reseller requirements.');
    riskPoints += isSupply ? 26 : 14;
  }
  if (fulfillmentModel === 'no-bid') {
    warnings.push('Marked no-bid by operator.');
    riskPoints += 80;
  }
  if (fulfillmentModel !== 'self-perform' && !opts.managementPlan) {
    warnings.push('Management/admin/QA plan must be explicit; passive handoff is not acceptable prime performance.');
    riskPoints += 18;
  }
  if (needsLicenseBondInsurance) {
    warnings.push('License, bonding, insurance, wage, or site-access requirements may apply.');
    riskPoints += 18;
  }
  if (likelyStaffingHeavy) {
    warnings.push('Staffing and delivery coverage risk: confirm recruiting bench, supervision, and backup coverage.');
    riskPoints += 12;
  }
  if (due !== null) {
    if (due <= 3) { warnings.push('Very short response window. Quote only if scope and vendor pricing are already clear.'); riskPoints += 14; fastCashPoints += 14; }
    else if (due <= 10) { fastCashPoints += 18; quoteReadiness += 8; }
    else if (due <= 21) { fastCashPoints += 8; }
  }
  if (/rfq|quote|combined synopsis|combined synopsis\/solicitation/i.test(String(opp.noticeType || '') + ' ' + text)) {
    fastCashPoints += 15;
    quoteReadiness += 14;
  }
  if (/firm.fixed|ffp|fixed price|fixed-price/i.test(String(opp.contractType || '') + ' ' + text)) {
    fastCashPoints += 8;
    quoteReadiness += 12;
  }
  if (/micro|credit card|purchase card|p-?card|simplified acquisition|sap|under \$?10,?000|under \$?25,?000|low dollar/i.test(text)) {
    fastCashPoints += 22;
    quoteReadiness += 18;
  }
  if (/statement of work|sow|scope|deliverable|schedule/i.test(text)) quoteReadiness += 10;
  if (warnings.length === 0) positives.push('No obvious middleman compliance red flags detected from available metadata.');

  const complianceScore = clamp(100 - riskPoints, 0, 100);
  const riskLabel = complianceScore >= 75 ? 'Green' : complianceScore >= 45 ? 'Yellow' : 'Red';
  const passiveHandoffWarning = warnings.some(w => /passive handoff/i.test(w));
  return Object.freeze({
    mode: OPPORTUNITY_MODES[opts.mode] ? opts.mode : (opts.mode || 'core_lanes'),
    fulfillmentModel,
    naicsStatus,
    riskLabel,
    complianceScore,
    fastCashPotential: clamp(fastCashPoints - Math.max(0, riskPoints - 55), 0, 100),
    quoteReadiness: clamp(quoteReadiness - Math.max(0, riskPoints - 45), 0, 100),
    warnings,
    positives,
    guardrails: Object.freeze({
      primeSelfPerformancePlan: fulfillmentModel === 'self-perform'
        ? 'Document ARCG/operator labor, supervision, deliverables, and QA controls.'
        : 'Document prime management/admin/scheduling/QA/invoicing plus sub/vendor task boundaries.',
      similarlySituatedNeeded: isSetAside && fulfillmentModel === 'subcontractor-supported',
      limitationOnSubcontractingWarning: isSetAside && fulfillmentModel === 'subcontractor-supported',
      nonmanufacturerWarning: isSupply || fulfillmentModel === 'supplier/reseller',
      licenseBondInsuranceWarning: needsLicenseBondInsurance,
      staffingDeliveryRisk: likelyStaffingHeavy,
      passiveHandoffWarning
    })
  });
}

function enhanceOpportunities(records, profile, opts) {
  return (Array.isArray(records) ? records : []).map(r => {
    const capture = evaluateOpportunity(r, profile, opts || {});
    return Object.freeze(Object.assign({}, r, { capture }));
  });
}

function generateQuotePacket(input) {
  input = input && typeof input === 'object' ? input : {};
  const opp = input.opportunity && typeof input.opportunity === 'object' ? input.opportunity : {};
  const company = input.company && typeof input.company === 'object' ? input.company : {};
  const capture = input.capture || evaluateOpportunity(opp, input.profile || {}, input);
  const price = input.price || '[fixed price]';
  const schedule = input.schedule || '[delivery schedule]';
  const subNote = capture.fulfillmentModel === 'subcontractor-supported'
    ? 'Subcontractor-supported delivery may be used. Prime retains management, administration, scheduling, client communication, QA, invoicing, and acceptance responsibility.'
    : capture.fulfillmentModel === 'supplier/reseller'
      ? 'Supplier/reseller fulfillment is subject to authorized source, nonmanufacturer, domestic preference, and product compliance verification.'
      : 'Prime intends to self-perform management and delivery tasks unless the quote states otherwise.';
  const lines = [
    `Cover Note: ${company.name || '[Company]'} submits this fixed-price quote for ${opp.title || '[opportunity title]'}.`,
    '',
    `Fixed-Price Quote: ${price}`,
    '',
    'Scope of Work:',
    input.scope || '[Describe deliverables, quantities, service levels, and acceptance criteria.]',
    '',
    'Exclusions:',
    input.exclusions || 'Work not expressly listed in the scope, after-hours support, travel, permits, bonding, and agency-directed changes unless separately authorized.',
    '',
    'Assumptions:',
    input.assumptions || 'Agency will provide timely site access, points of contact, required documentation, and acceptance feedback.',
    '',
    `Schedule: ${schedule}`,
    '',
    'Management/Admin/QA Role:',
    input.managementRole || 'Prime will manage client communication, scheduling, subcontractor/vendor coordination, quality checks, issue tracking, invoicing, and closeout documentation.',
    '',
    `Subcontractor Utilization: ${subNote}`,
    '',
    `UEI/CAGE/Certifications: UEI ${company.uei || '[UEI]'} | CAGE ${company.cage || '[CAGE]'} | Certifications ${company.certifications || '[certifications]'}`,
    `NAICS/PSC: NAICS ${opp.naics || '[NAICS]'} | PSC ${opp.psc || '[PSC]'}`
  ];
  return Object.freeze({
    ok: true,
    packet: lines.join('\n'),
    riskLabel: capture.riskLabel,
    quoteReadiness: capture.quoteReadiness,
    humanReviewRequired: true
  });
}

function inferFulfillmentModel(opp, text) {
  if (/supply|supplies|equipment|reseller|manufacturer|product|commodity/.test(text)) return 'supplier/reseller';
  if (/janitorial|facility|facilities|staff|onsite|on-site|painting|maintenance|labor/.test(text)) return 'subcontractor-supported';
  return 'self-perform';
}

function normalizeFulfillmentModel(v) {
  const s = String(v || '').trim().toLowerCase();
  return FULFILLMENT_MODELS.includes(s) ? s : 'self-perform';
}

function parseDays(opp) {
  const raw = opp.daysUntilDue || opp.daysLeft || opp['Days Until Due'];
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  return null;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
}

module.exports = {
  OPPORTUNITY_MODES,
  FULFILLMENT_MODELS,
  buildSearchFilters,
  evaluateOpportunity,
  enhanceOpportunities,
  generateQuotePacket
};
