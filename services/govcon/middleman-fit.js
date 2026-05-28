// services/govcon/middleman-fit.js
//
// Layer 1: deterministic Middleman Fit Analyzer.
//
// This service intentionally runs before any AI/provider call. It kills weak
// or noncompliant deals early, returns MORE_RESEARCH_NEEDED when key facts are
// missing, and separates prime duties from subcontractor duties.

'use strict';

const WARNING_CATEGORIES = Object.freeze([
  'limitation_on_subcontracting',
  'similarly_situated_sub_required',
  'passive_pass_through_risk',
  'nonmanufacturer_rule_risk',
  'license_required',
  'bonding_required',
  'insurance_required',
  'wage_determination_risk',
  'site_presence_risk',
  'key_personnel_risk',
  'past_performance_gap',
  'deadline_risk',
  'subcontractor_capacity_risk'
]);

const PRIME_ROLE = Object.freeze([
  'Scheduling and project coordination',
  'Customer communication through allowed solicitation channels',
  'QA/QC and acceptance review',
  'Compliance documentation and file control',
  'Invoicing and contract administration',
  'Performance tracking and issue escalation',
  'Subcontractor coordination',
  'Final accountability for delivery'
]);

const SUB_ROLE = Object.freeze([
  'Field execution within the approved scope',
  'Qualified labor, supervision, equipment, and materials assigned to the subcontracted tasks',
  'Daily field reporting to the prime',
  'License, insurance, bonding, safety, wage, and site-access documentation where required',
  'Prompt quote updates and issue escalation'
]);

function analyzeMiddlemanFit(opportunity, profile, subcontractorBench) {
  opportunity = normalizeOpportunity(opportunity);
  profile = normalizeProfile(profile);
  subcontractorBench = Array.isArray(subcontractorBench) ? subcontractorBench : [];

  const hardStops = evaluateHardStops(opportunity, profile);
  const profitStressTest = evaluateProfitStress(opportunity, profile);
  const warnings = evaluateComplianceWarnings(opportunity, profile, subcontractorBench);
  const missingData = findMissingData(opportunity);
  const scoreBreakdown = scoreMiddlemanFit(opportunity, profile, subcontractorBench, {
    hardStops,
    profitStressTest,
    warnings,
    missingData
  });

  let decision = scoreBreakdown.rating;
  if (hardStops.length) decision = 'KILL';
  else if (missingData.length) decision = 'MORE_RESEARCH_NEEDED';
  else if (!profitStressTest.passesStress) decision = 'RISKY_FIT';

  const analysis = Object.freeze({
    ok: true,
    decision,
    rating: decision,
    score: scoreBreakdown.score,
    scoreBreakdown: scoreBreakdown.breakdown,
    hardStops,
    warnings,
    missingData,
    primeRole: PRIME_ROLE.slice(),
    subcontractorRole: SUB_ROLE.slice(),
    remoteManagementFeasibility: remoteManagementFeasibility(opportunity, warnings),
    profitStressTest,
    nextActions: buildImmediateActions(opportunity, { decision, hardStops, warnings, missingData, profitStressTest }),
    pipelineRecommendation: pipelineRecommendation(decision),
    structured: null,
    markdown: ''
  });
  const structured = toStructured(analysis);
  const markdown = buildMiddlemanFitSummary(Object.assign({}, analysis, { structured }));
  return Object.freeze(Object.assign({}, analysis, { structured, markdown }));
}

function evaluateHardStops(opportunity, profile) {
  opportunity = normalizeOpportunity(opportunity);
  profile = normalizeProfile(profile);
  const text = haystack(opportunity);
  const out = [];

  if (isClearanceRequired(opportunity, text)) {
    out.push(stop('security_clearance_required', 'Security clearance appears required. Kill unless the company already has the required cleared personnel/facility path.'));
  }
  if (requiresPrimeOnsite(opportunity, text) && !allowsSubSiteLead(opportunity, text)) {
    out.push(stop('prime_onsite_required', 'Prime appears required to be physically on-site daily or weekly, with no clear allowance for an assigned subcontractor/site lead.'));
  }
  const value = contractValue(opportunity);
  if (isConstruction(opportunity, text) && value !== null && value > 1000000) {
    out.push(stop('construction_over_1m', 'Construction-heavy opportunity over $1M. Kill by default unless leadership explicitly overrides outside this analyzer.'));
  }
  if ((isSupplyOnly(opportunity, text) || isManufacturingOrEquipmentHeavy(opportunity, text)) && !hasNonmanufacturerPath(opportunity, text)) {
    out.push(stop('supply_or_manufacturing_without_path', 'Manufacturing, supply-only, or equipment-heavy work without an explicit nonmanufacturer/authorized reseller compliance path.'));
  }
  const pop = periodMonths(opportunity);
  if (value !== null && pop !== null && value < 100000 && pop < 12) {
    out.push(stop('low_value_short_pop', 'Single-year or short-period opportunity under $100K. Kill by default to protect bid effort and admin burden.'));
  }
  if (profile.killNaics && Array.isArray(profile.killNaics) && profile.killNaics.includes(String(opportunity.naics))) {
    out.push(stop('profile_blocked_naics', 'Operator profile blocks this NAICS lane.'));
  }
  return out;
}

function evaluateProfitStress(opportunity, profile) {
  opportunity = normalizeOpportunity(opportunity);
  profile = normalizeProfile(profile);
  const value = contractValue(opportunity);
  const baseSubCostPct = pct(profile.subcontractorCostPct, 70);
  const primeAdminCostPct = pct(profile.primeAdminCostPct, 0);
  const minimumTargetNetMarginPct = pct(profile.minimumTargetNetMarginPct, 25);
  const baseMarginPct = value === null ? null : round(100 - baseSubCostPct - primeAdminCostPct, 2);
  const stressHighSubCostPct = round(baseSubCostPct + 5, 2);
  const stressLowSubCostPct = Math.max(0, round(baseSubCostPct - 5, 2));
  const stressHighMarginPct = value === null ? null : round(100 - stressHighSubCostPct - primeAdminCostPct, 2);
  const stressLowMarginPct = value === null ? null : round(100 - stressLowSubCostPct - primeAdminCostPct, 2);
  return Object.freeze({
    contractValue: value,
    baseSubCostPct,
    primeAdminCostPct,
    minimumTargetNetMarginPct,
    baseSubCost: value === null ? null : round(value * baseSubCostPct / 100, 2),
    baseMarginPct,
    baseMarginDollars: value === null || baseMarginPct === null ? null : round(value * baseMarginPct / 100, 2),
    stressHighSubCostPct,
    stressHighMarginPct,
    stressHighMarginDollars: value === null || stressHighMarginPct === null ? null : round(value * stressHighMarginPct / 100, 2),
    stressLowSubCostPct,
    stressLowMarginPct,
    passesStress: value !== null && stressHighMarginPct !== null && stressHighMarginPct >= minimumTargetNetMarginPct
  });
}

function evaluateComplianceWarnings(opportunity, profile, subcontractorBench) {
  opportunity = normalizeOpportunity(opportunity);
  profile = normalizeProfile(profile);
  subcontractorBench = Array.isArray(subcontractorBench) ? subcontractorBench : [];
  const text = haystack(opportunity);
  const out = [];
  const setAside = String(opportunity.setAside || '').toLowerCase();
  const isSetAside = !!setAside && !/open|full/.test(setAside);

  if (isSetAside) {
    out.push(warn('limitation_on_subcontracting', 'Set-aside work requires limitation-on-subcontracting review before relying on subcontractor-heavy execution.', 'high'));
    out.push(warn('similarly_situated_sub_required', 'A similarly situated subcontractor may be needed to preserve compliance under a set-aside model.', 'high'));
  }
  if ((subcontractorHeavy(opportunity, profile) || /subcontract|subcontractor|vendor/.test(text)) && !hasPrimeManagementPlan(text)) {
    out.push(warn('passive_pass_through_risk', 'Prime must retain meaningful management, admin, scheduling, QA, compliance, customer communication, invoicing, and final accountability.', 'high'));
  }
  if ((isSupplyOnly(opportunity, text) || isManufacturingOrEquipmentHeavy(opportunity, text))) {
    out.push(warn('nonmanufacturer_rule_risk', hasNonmanufacturerPath(opportunity, text)
      ? 'Supply/reseller path appears documented, but nonmanufacturer/authorized reseller compliance still needs verification.'
      : 'Supply/reseller path is not documented; nonmanufacturer rule risk is material.', 'high'));
  }
  if (/license|licensed|permit|certified technician|professional engineer|trade license|state license/.test(text)) out.push(warn('license_required', 'License or permit requirements appear likely. Verify prime/sub license responsibility.', 'medium'));
  if (/bond|bonding|performance bond|payment bond|bid bond/.test(text)) out.push(warn('bonding_required', 'Bonding requirement appears likely. Verify bonding capacity before pricing.', 'high'));
  if (/insurance|coi|general liability|workers comp|workers compensation|auto liability/.test(text)) out.push(warn('insurance_required', 'Insurance/COI requirement appears likely. Verify limits and endorsements.', 'medium'));
  if (/wage determination|service contract act|sca|davis-bacon|prevailing wage/.test(text)) out.push(warn('wage_determination_risk', 'Wage determination risk. Confirm labor categories, rates, and flow-downs.', 'high'));
  if (/onsite|on-site|site visit|site lead|daily|weekly|shift|24\/7|coverage/.test(text)) out.push(warn('site_presence_risk', 'Site presence or coverage requirement may reduce remote-manageability.', 'medium'));
  if (/key personnel|resume|required personnel|project manager|supervisor/.test(text)) out.push(warn('key_personnel_risk', 'Key personnel may be required. Confirm named staff or subcontractor personnel availability.', 'medium'));
  if (!hasRelevantPastPerformance(profile)) out.push(warn('past_performance_gap', 'Profile does not show relevant past performance. Proof gap may weaken bid/no-bid posture.', 'medium'));
  const days = daysUntilDue(opportunity);
  if (days !== null && days <= 7) out.push(warn('deadline_risk', 'Response deadline is within 7 days. Only proceed if facts, pricing, and subs are ready.', 'high'));
  if (needsSubcontractor(opportunity, profile) && qualifiedSubs(subcontractorBench, opportunity).length < 1) {
    out.push(warn('subcontractor_capacity_risk', 'No matching qualified subcontractor found in bench. Need sub sourcing before bid decision.', 'high'));
  }
  return dedupeWarnings(out);
}

function scoreMiddlemanFit(opportunity, profile, subcontractorBench, precomputed) {
  opportunity = normalizeOpportunity(opportunity);
  profile = normalizeProfile(profile);
  subcontractorBench = Array.isArray(subcontractorBench) ? subcontractorBench : [];
  precomputed = precomputed || {};
  const hardStops = precomputed.hardStops || evaluateHardStops(opportunity, profile);
  const profit = precomputed.profitStressTest || evaluateProfitStress(opportunity, profile);
  const warnings = precomputed.warnings || evaluateComplianceWarnings(opportunity, profile, subcontractorBench);
  const missing = precomputed.missingData || findMissingData(opportunity);
  const text = haystack(opportunity);

  const profitStrength = profit.contractValue === null ? 0
    : profit.passesStress ? clamp((profit.stressHighMarginPct - 25) * 2 + 24, 0, 35)
    : clamp((profit.stressHighMarginPct || 0) * 0.8, 0, 24);
  let deliverySimplicity = 12;
  if (isService(opportunity, text)) deliverySimplicity += 7;
  if (/remote|offsite|administrative|coordination|scheduling|qa|quality/.test(text)) deliverySimplicity += 4;
  if (/daily|weekly|onsite|on-site|24\/7|shift/.test(text)) deliverySimplicity -= 8;
  if (isConstruction(opportunity, text) || isSupplyOnly(opportunity, text)) deliverySimplicity -= 8;
  deliverySimplicity = clamp(deliverySimplicity, 0, 25);

  const highWarnings = warnings.filter(w => w.severity === 'high').length;
  const medWarnings = warnings.filter(w => w.severity === 'medium').length;
  const complianceSafety = clamp(20 - highWarnings * 4 - medWarnings * 2, 0, 20);
  const matchedSubs = qualifiedSubs(subcontractorBench, opportunity);
  const subcontractorAvailability = needsSubcontractor(opportunity, profile)
    ? clamp(matchedSubs.length * 4 + (matchedSubs.some(s => hasDocs(s)) ? 6 : 0), 0, 10)
    : 8;
  const strategicFit = strategicFitScore(opportunity, profile);

  let score = Math.round(profitStrength + deliverySimplicity + complianceSafety + subcontractorAvailability + strategicFit);
  if (hardStops.length) score = Math.min(score, 20);
  if (missing.length) score = Math.min(score, 55);
  let rating = 'RISKY_FIT';
  if (hardStops.length) rating = 'KILL';
  else if (missing.length) rating = 'MORE_RESEARCH_NEEDED';
  else if (score >= 80 && profit.passesStress && complianceSafety >= 14 && deliverySimplicity >= 18) rating = 'STRONG_FIT';
  else if (score >= 60 && profit.passesStress) rating = 'POSSIBLE_FIT';
  else rating = 'RISKY_FIT';

  return Object.freeze({
    score,
    rating,
    breakdown: Object.freeze({
      profitStrength: Math.round(profitStrength),
      deliverySimplicity,
      complianceSafety,
      subcontractorAvailability,
      strategicPortfolioFit: strategicFit
    })
  });
}

function buildMiddlemanFitSummary(analysis) {
  analysis = analysis || {};
  const profit = analysis.profitStressTest || {};
  const warnings = analysis.warnings || [];
  const missing = analysis.missingData || [];
  const hardStops = analysis.hardStops || [];
  const lines = [
    '# MIDDLEMAN FIT ANALYSIS',
    `- Decision: ${analysis.decision || 'MORE_RESEARCH_NEEDED'}`,
    `- Score: ${typeof analysis.score === 'number' ? analysis.score : 0}/100`,
    '',
    '## Prime Role Required',
    list(analysis.primeRole || PRIME_ROLE),
    '',
    '## Subcontractor Role Required',
    list(analysis.subcontractorRole || SUB_ROLE),
    '',
    '## Remote Management Feasibility',
    String(analysis.remoteManagementFeasibility || 'unknown'),
    '',
    '## On-Site Presence Risk',
    warningText(warnings, 'site_presence_risk') || 'No explicit on-site presence issue found from provided facts.',
    '',
    '## Subcontracting/Pass-Through Risk',
    warningText(warnings, 'passive_pass_through_risk') || 'Prime role must still be documented and active; paper pass-through delivery is not acceptable.',
    '',
    '## License/Bond/Insurance Needs',
    warningText(warnings, ['license_required', 'bonding_required', 'insurance_required']) || 'No license, bonding, or insurance requirement identified from provided facts.',
    '',
    '## Profit Stress Test',
    `- Contract Value: ${money(profit.contractValue)}`,
    `- Base Sub Cost: ${num(profit.baseSubCostPct)}%`,
    `- Base Margin: ${num(profit.baseMarginPct)}%`,
    `- Stress High Sub Cost: ${num(profit.stressHighSubCostPct)}%`,
    `- Stress High Margin: ${num(profit.stressHighMarginPct)}%`,
    `- Passes Stress: ${profit.passesStress ? 'yes' : 'no'}`,
    '',
    '## Hard Stops',
    hardStops.length ? list(hardStops.map(h => h.message)) : '- None',
    '',
    '## Compliance Warnings',
    warnings.length ? list(warnings.map(w => `${w.category}: ${w.message}`)) : '- None',
    '',
    '## Missing Data',
    missing.length ? list(missing) : '- None',
    '',
    '## Immediate Actions',
    list(analysis.nextActions || [])
  ];
  return lines.join('\n');
}

function findMissingData(opportunity) {
  const missing = [];
  const checks = [
    ['title', opportunity.title],
    ['solicitationNumber or noticeId', opportunity.solicitationNumber || opportunity.noticeId],
    ['agency/office', opportunity.agency || opportunity.office],
    ['setAside', opportunity.setAside],
    ['place of performance', opportunity.placeOfPerformance],
    ['response deadline', opportunity.responseDeadline],
    ['period of performance', opportunity.periodOfPerformance || opportunity.popMonths],
    ['estimated value or value range', opportunity.estimatedValue || opportunity.value || opportunity.contractValue || opportunity.valueRange],
    ['service/supply/construction classification', opportunity.classification || opportunity.workType],
    ['site presence requirement', opportunity.sitePresenceRequirement],
    ['clearance requirement', opportunity.clearanceRequirement],
    ['license/bond/insurance requirements', opportunity.licenseBondInsuranceRequirements],
    ['subcontracting restrictions', opportunity.subcontractingRestrictions]
  ];
  for (const [label, value] of checks) {
    if (isBlank(value) || /unknown|tbd|n\/a|not provided|unclear|ambiguous/i.test(String(value))) missing.push(label);
  }
  if (!missing.includes('response deadline') && !validDateLike(opportunity.responseDeadline)) {
    missing.push('response deadline');
  }
  if (!missing.includes('period of performance') && periodMonths(opportunity) === null) {
    missing.push('period of performance');
  }
  if (!missing.includes('estimated value or value range') && contractValue(opportunity) === null) {
    missing.push('estimated value or value range');
  }
  if (!opportunity.naics && !opportunity.psc) missing.push('NAICS/PSC when available');
  return Array.from(new Set(missing));
}

function buildImmediateActions(opportunity, analysis) {
  const actions = [];
  if ((analysis.hardStops || []).length) {
    actions.push('Record no-bid/kill rationale and stop bid spend unless leadership documents an explicit exception.');
    return actions;
  }
  if ((analysis.missingData || []).length) {
    actions.push('Verify missing solicitation facts before bid/no-bid.');
    actions.push('Confirm value, period of performance, response deadline, site presence, and subcontracting restrictions.');
  }
  actions.push('Separate prime management/admin/QA duties from subcontractor field duties in writing.');
  actions.push('Identify 3-5 qualified subcontractors and request written quotes with insurance/license/bonding evidence.');
  actions.push('Verify limitation-on-subcontracting, similarly situated subcontractor, wage, and nonmanufacturer issues before pricing.');
  actions.push('Run final bid/no-bid after sub pricing and compliance facts are confirmed.');
  return actions;
}

function toStructured(analysis) {
  const profit = analysis.profitStressTest || {};
  return Object.freeze({
    mode: 'MIDDLEMAN_FIT',
    decision: analysis.decision,
    score: analysis.score,
    hardStops: analysis.hardStops,
    warnings: analysis.warnings,
    missingData: analysis.missingData,
    primeRole: analysis.primeRole,
    subcontractorRole: analysis.subcontractorRole,
    remoteManagementFeasibility: analysis.remoteManagementFeasibility,
    profitStressTest: {
      contractValue: profit.contractValue || 0,
      contractValueKnown: typeof profit.contractValue === 'number',
      baseSubCostPct: profit.baseSubCostPct,
      baseMarginPct: profit.baseMarginPct || 0,
      stressHighSubCostPct: profit.stressHighSubCostPct,
      stressHighMarginPct: profit.stressHighMarginPct || 0,
      passesStress: !!profit.passesStress
    },
    nextActions: analysis.nextActions,
    pipelineRecommendation: analysis.pipelineRecommendation
  });
}

function normalizeOpportunity(input) {
  input = input && typeof input === 'object' ? input : {};
  return Object.freeze(Object.assign({}, input, {
    title: first(input.title, input.Title),
    solicitationNumber: first(input.solicitationNumber, input['Solicitation Number']),
    noticeId: first(input.noticeId, input['Notice ID']),
    agency: first(input.agency, input.Agency, input.office, input.Office),
    office: first(input.office, input.Office),
    setAside: first(input.setAside, input['Set-Aside Code']),
    naics: first(input.naics, input.naicsCode, input.NAICS),
    psc: first(input.psc, input.PSC),
    placeOfPerformance: first(input.placeOfPerformance, input['Place of Performance']),
    responseDeadline: first(input.responseDeadline, input.responseDate, input['Response Deadline']),
    periodOfPerformance: first(input.periodOfPerformance, input.POP, input['Period of Performance']),
    estimatedValue: first(input.estimatedValue, input.value, input.contractValue, input['Estimated Value'], input.valueRange),
    classification: first(input.classification, input.workType, input.type, input.noticeType),
    sitePresenceRequirement: first(input.sitePresenceRequirement, input.sitePresence, input['Site Presence Requirement']),
    clearanceRequirement: first(input.clearanceRequirement, input.clearance, input['Clearance Requirement']),
    licenseBondInsuranceRequirements: first(input.licenseBondInsuranceRequirements, input.licenseRequirements, input.bondingRequirements, input.insuranceRequirements),
    subcontractingRestrictions: first(input.subcontractingRestrictions, input['Subcontracting Restrictions'])
  }));
}

function normalizeProfile(input) {
  input = input && typeof input === 'object' ? input : {};
  return Object.freeze(Object.assign({
    subcontractorCostPct: 70,
    primeAdminCostPct: 0,
    minimumTargetNetMarginPct: 25,
    naics: [],
    capabilities: [],
    pastPerformance: []
  }, input));
}

function stop(code, message) { return Object.freeze({ code, message }); }
function warn(category, message, severity) { return Object.freeze({ category, message, severity: severity || 'medium' }); }

function haystack(o) {
  return Object.keys(o || {}).map(k => o[k]).filter(v => v !== null && v !== undefined).join(' ').toLowerCase();
}
function isClearanceRequired(o, text) {
  const explicit = String(o.clearanceRequirement || '').toLowerCase();
  if (/none|not required|no clearance/.test(explicit)) return false;
  return /secret clearance|top secret|ts\/sci|security clearance|required clearance|cleared personnel|facility clearance|fcl/.test(text);
}
function requiresPrimeOnsite(o, text) {
  const site = String(o.sitePresenceRequirement || '').toLowerCase();
  return /(prime|contractor|awardee).{0,40}(daily|weekly|on-?site|physically present)|daily.{0,30}prime|weekly.{0,30}prime/.test(site + ' ' + text);
}
function allowsSubSiteLead(o, text) {
  return /(subcontractor|vendor|site lead|field supervisor|assigned representative).{0,80}(may|can|allowed|satisfy|fulfill|serve|provide).{0,80}(on-?site|presence|daily|weekly)|on-?site.{0,80}(may|can|allowed).{0,80}(subcontractor|site lead|field supervisor)/.test(text);
}
function isConstruction(o, text) {
  return /construction|renovation|build-out|buildout|demolition|roofing|electrical|plumbing|hvac|painting|238\d{3}|236\d{3}/.test(text) || /^23/.test(String(o.naics || ''));
}
function isSupplyOnly(o, text) {
  return /supply-only|supplies only|equipment only|product only|commodity|deliver supplies|furnish equipment/.test(text);
}
function isManufacturingOrEquipmentHeavy(o, text) {
  return /manufactur|equipment-heavy|heavy equipment|vehicle|furniture|medical equipment|hardware|parts|reseller|authorized distributor/.test(text) || /^3[1-3]/.test(String(o.naics || '')) || /^42/.test(String(o.naics || ''));
}
function hasNonmanufacturerPath(o, text) {
  return /nonmanufacturer rule|nmr waiver|authorized reseller|authorized distributor|manufacturer letter|supply compliance path|small business manufacturer/.test(text);
}
function validDateLike(v) {
  if (v instanceof Date) return isFinite(v.getTime());
  const s = String(v || '').trim();
  if (!s) return false;
  if (/^(none|not applicable|n\/a)$/i.test(s)) return false;
  return isFinite(Date.parse(s));
}
function isService(o, text) {
  return /service|support|admin|janitorial|facility|staffing|management|maintenance|consulting|541|561/.test(text) && !isSupplyOnly(o, text);
}
function contractValue(o) {
  const raw = first(o.estimatedValue, o.value, o.contractValue, o.valueRange);
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  const mult = /\bm\b|million/.test(s) ? 1000000 : /\bk\b|thousand/.test(s) ? 1000 : 1;
  const nums = (s.match(/\$?\s*[\d,.]+/g) || []).map(x => Number(x.replace(/[$,\s]/g, '')) * mult).filter(isFinite);
  if (!nums.length) return null;
  return Math.max.apply(null, nums);
}
function periodMonths(o) {
  if (typeof o.popMonths === 'number' && isFinite(o.popMonths)) return o.popMonths;
  const s = String(first(o.periodOfPerformance, o.POP, o['Period of Performance']) || '').toLowerCase();
  if (!s) return null;
  const month = s.match(/(\d+(?:\.\d+)?)\s*(month|mo)/);
  if (month) return Number(month[1]);
  const year = s.match(/(\d+(?:\.\d+)?)\s*(year|yr)/);
  if (year) return Number(year[1]) * 12;
  const dateRange = s.match(/(\d{4}-\d{2}-\d{2}).{1,20}(\d{4}-\d{2}-\d{2})/);
  if (dateRange) {
    const a = Date.parse(dateRange[1]);
    const b = Date.parse(dateRange[2]);
    if (isFinite(a) && isFinite(b) && b > a) return Math.round((b - a) / 86400000 / 30);
  }
  return null;
}
function daysUntilDue(o) {
  if (typeof o.daysUntilDue === 'number') return o.daysUntilDue;
  const t = Date.parse(String(o.responseDeadline || ''));
  if (!isFinite(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}
function subcontractorHeavy(o, profile) {
  return pct(profile.subcontractorCostPct, 70) >= 50 || /subcontract|subcontractor|vendor/.test(haystack(o));
}
function needsSubcontractor(o, profile) {
  return subcontractorHeavy(o, profile) || /field|onsite|on-site|janitorial|facility|construction|maintenance|staffing/.test(haystack(o));
}
function qualifiedSubs(bench, o) {
  const text = haystack(o);
  return (bench || []).filter(s => {
    const sub = [s.name, s.company, s.serviceCategory, s.notes, s.serviceArea, ...(s.certifications || []), ...(s.licenses || [])].filter(Boolean).join(' ').toLowerCase();
    return sub && sub.split(/[^a-z0-9]+/).filter(t => t.length > 3).some(t => text.includes(t));
  });
}
function hasDocs(s) {
  return !!(s.insurance || s.bonding || (Array.isArray(s.docsOnFile) && s.docsOnFile.length) || (Array.isArray(s.licenses) && s.licenses.length));
}
function hasRelevantPastPerformance(profile) {
  if (Array.isArray(profile.pastPerformance)) return profile.pastPerformance.length > 0;
  return !!String(profile.pastPerformance || '').trim();
}
function hasPrimeManagementPlan(text) {
  return /(prime|contractor).{0,80}(manage|management|admin|scheduling|quality|qa|q\/c|customer communication|reporting|accountability)|scheduling.{0,80}(quality|qa|reporting|customer)|quality.{0,80}(scheduling|reporting|customer)/.test(text);
}
function strategicFitScore(o, profile) {
  const text = haystack(o);
  const codes = Array.isArray(profile.naics) ? profile.naics.map(String) : [];
  if (codes.includes(String(o.naics || ''))) return 8;
  const caps = Array.isArray(profile.capabilities) ? profile.capabilities : String(profile.capabilities || '').split(/[,;\n]/);
  let hits = 0;
  for (const c of caps) if (c && text.includes(String(c).trim().toLowerCase())) hits++;
  return clamp(4 + hits * 2, 0, 10);
}
function remoteManagementFeasibility(o, warnings) {
  if (warnings.some(w => w.category === 'site_presence_risk')) return allowsSubSiteLead(o, haystack(o)) ? 'partial' : 'no';
  if (findMissingData(o).includes('site presence requirement')) return 'unknown';
  return 'yes';
}
function pipelineRecommendation(decision) {
  if (decision === 'KILL') return 'kill';
  if (decision === 'MORE_RESEARCH_NEEDED') return 'research';
  if (decision === 'STRONG_FIT' || decision === 'POSSIBLE_FIT') return 'advance';
  return 'no_bid';
}
function warningText(warnings, categories) {
  categories = Array.isArray(categories) ? categories : [categories];
  const rows = warnings.filter(w => categories.includes(w.category));
  return rows.map(w => `- ${w.message}`).join('\n');
}
function list(items) { return (items || []).length ? items.map(i => `- ${i}`).join('\n') : '- None'; }
function money(v) { return typeof v === 'number' ? '$' + Math.round(v).toLocaleString('en-US') : 'unknown'; }
function num(v) { return typeof v === 'number' ? String(v) : 'unknown'; }
function pct(v, fallback) { const n = Number(v); return isFinite(n) ? n : fallback; }
function round(n, d) { const p = Math.pow(10, d || 0); return Math.round(n * p) / p; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(Number(n) || 0))); }
function first() { for (const v of arguments) if (!isBlank(v)) return v; return ''; }
function isBlank(v) { return v === null || v === undefined || String(v).trim() === ''; }
function dedupeWarnings(rows) {
  const seen = new Set();
  return rows.filter(w => { if (seen.has(w.category)) return false; seen.add(w.category); return true; });
}

module.exports = {
  WARNING_CATEGORIES,
  PRIME_ROLE,
  SUB_ROLE,
  analyzeMiddlemanFit,
  evaluateHardStops,
  evaluateProfitStress,
  evaluateComplianceWarnings,
  scoreMiddlemanFit,
  buildMiddlemanFitSummary
};
