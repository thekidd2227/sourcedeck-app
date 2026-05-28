// services/govcon/naics-expansion.js
//
// Candidate NAICS library for expansion discovery. These records are
// intentionally separate from the user's registered/current SAM NAICS.

'use strict';

const DELIVERY_MODELS = Object.freeze([
  'self-perform',
  'subcontract',
  'supplier',
  'staffing',
  'broker-risk'
]);

const CANDIDATE_NAICS = Object.freeze([
  {
    code: '541611',
    description: 'Administrative Management and General Management Consulting Services',
    deliveryModel: 'self-perform',
    licenseRequirements: 'Generally no trade license; verify agency-specific labor/category rules.',
    marginPotential: 'High',
    speedToCash: 'Medium',
    buyerFrequency: 'High',
    microPurchaseFit: 'Medium',
    proofGap: 'Management consulting proof and federal references strengthen competitiveness.'
  },
  {
    code: '561110',
    description: 'Office Administrative Services',
    deliveryModel: 'subcontract',
    licenseRequirements: 'Usually no trade license; background checks/site access may apply.',
    marginPotential: 'Medium',
    speedToCash: 'High',
    buyerFrequency: 'High',
    microPurchaseFit: 'High',
    proofGap: 'Need admin operations examples and staffing bench.'
  },
  {
    code: '561210',
    description: 'Facilities Support Services',
    deliveryModel: 'subcontract',
    licenseRequirements: 'May require site-specific insurance, safety plans, and licensed trades depending scope.',
    marginPotential: 'Medium',
    speedToCash: 'Medium',
    buyerFrequency: 'High',
    microPurchaseFit: 'Medium',
    proofGap: 'Need qualified local subs, COIs, and QA plan.'
  },
  {
    code: '561720',
    description: 'Janitorial Services',
    deliveryModel: 'subcontract',
    licenseRequirements: 'Local business licensing, insurance, wage determinations, and site access may apply.',
    marginPotential: 'Medium',
    speedToCash: 'High',
    buyerFrequency: 'High',
    microPurchaseFit: 'High',
    proofGap: 'Need vetted cleaning subs, rates, and supervision plan.'
  },
  {
    code: '561320',
    description: 'Temporary Help Services',
    deliveryModel: 'staffing',
    licenseRequirements: 'State employment rules, workers comp, insurance, and payroll controls required.',
    marginPotential: 'Medium',
    speedToCash: 'Medium',
    buyerFrequency: 'High',
    microPurchaseFit: 'Medium',
    proofGap: 'Need staffing process, payroll/HR controls, and candidates.'
  },
  {
    code: '541519',
    description: 'Other Computer Related Services',
    deliveryModel: 'subcontract',
    licenseRequirements: 'Cyber, clearance, or certification requirements may apply by solicitation.',
    marginPotential: 'High',
    speedToCash: 'Medium',
    buyerFrequency: 'High',
    microPurchaseFit: 'Medium',
    proofGap: 'Need technical past performance or qualified IT sub.'
  },
  {
    code: '541990',
    description: 'All Other Professional, Scientific, and Technical Services',
    deliveryModel: 'subcontract',
    licenseRequirements: 'Scope-specific credentials may apply.',
    marginPotential: 'Medium',
    speedToCash: 'Medium',
    buyerFrequency: 'Medium',
    microPurchaseFit: 'Medium',
    proofGap: 'Broad code; proof must map tightly to the actual scope.'
  },
  {
    code: '332311',
    description: 'Prefabricated Metal Building and Component Manufacturing',
    deliveryModel: 'supplier',
    licenseRequirements: 'Supply-chain, warranty, installation, bonding, and manufacturer rules may apply.',
    marginPotential: 'Variable',
    speedToCash: 'Low',
    buyerFrequency: 'Medium',
    microPurchaseFit: 'Low',
    proofGap: 'High reseller/nonmanufacturer risk unless manufacturer/distributor path is real.'
  },
  {
    code: '238320',
    description: 'Painting and Wall Covering Contractors',
    deliveryModel: 'subcontract',
    licenseRequirements: 'Trade license, bonding, insurance, site safety, wage determinations likely.',
    marginPotential: 'Medium',
    speedToCash: 'Medium',
    buyerFrequency: 'Medium',
    microPurchaseFit: 'Medium',
    proofGap: 'Need licensed local subs and bonding capacity.'
  },
  {
    code: '423450',
    description: 'Medical, Dental, and Hospital Equipment and Supplies Merchant Wholesalers',
    deliveryModel: 'supplier',
    licenseRequirements: 'Nonmanufacturer rule, authorized reseller status, FDA/supply documentation may apply.',
    marginPotential: 'Variable',
    speedToCash: 'High',
    buyerFrequency: 'High',
    microPurchaseFit: 'High',
    proofGap: 'Need authorized supplier line and compliant product documentation.'
  }
]);

function listCandidateNaics(opts) {
  opts = opts && typeof opts === 'object' ? opts : {};
  let rows = CANDIDATE_NAICS.slice();
  if (opts.deliveryModel) rows = rows.filter(r => r.deliveryModel === opts.deliveryModel);
  if (opts.microPurchaseOnly) rows = rows.filter(r => /high/i.test(r.microPurchaseFit));
  return rows.map(r => Object.freeze(Object.assign({}, r)));
}

function classifyNaics(code, profile) {
  const s = String(code || '').trim();
  const current = profile && Array.isArray(profile.naics) ? profile.naics.map(String) : [];
  if (current.includes(s)) return 'registered-current';
  if (CANDIDATE_NAICS.some(r => r.code === s)) return 'candidate-to-add';
  return 'opportunistic-high-risk';
}

module.exports = {
  DELIVERY_MODELS,
  CANDIDATE_NAICS,
  listCandidateNaics,
  classifyNaics
};
