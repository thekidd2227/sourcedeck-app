// services/govcon/addons.js
//
// GovCon add-on registry.
//
// The registry makes GovCon capture features packageable as consumer
// modules instead of ARCG-only hardcoding. Callers can enable/disable
// modules by config or future subscription entitlements.

'use strict';

const MODULES = Object.freeze({
  'govcon-core': Object.freeze({
    id: 'govcon-core',
    name: 'GovCon Core',
    description: 'Broad SAM discovery, mode selection, result normalization, and capture OS labels.'
  }),
  'micro-purchase-radar': Object.freeze({
    id: 'micro-purchase-radar',
    name: 'Micro-Purchase Radar',
    description: 'Low-dollar, fast-quote opportunity detection and quote-readiness cues.'
  }),
  'middleman-compliance': Object.freeze({
    id: 'middleman-compliance',
    name: 'Middleman Compliance',
    description: 'Self-performance, limitation-on-subcontracting, reseller, licensing, bonding, and passive-handoff guardrails.'
  }),
  'fed-agent-core': Object.freeze({
    id: 'fed-agent-core',
    name: 'Fed Agent Core',
    description: 'Structured GovCon bidding co-pilot that applies deterministic rules before strategy generation.'
  }),
  'middleman-fit-analyzer': Object.freeze({
    id: 'middleman-fit-analyzer',
    name: 'Middleman Fit Analyzer',
    description: 'Prime-with-subcontractor delivery fit scoring, hard stops, profit stress tests, and role separation.'
  }),
  'bid-decision-engine': Object.freeze({
    id: 'bid-decision-engine',
    name: 'Bid Decision Engine',
    description: 'Bid/no-bid recommendation engine with early kill and research gating.'
  }),
  'sub-rfq-generator': Object.freeze({
    id: 'sub-rfq-generator',
    name: 'Sub RFQ Generator',
    description: 'Subcontractor RFQ drafting for qualified vendor quote collection.'
  }),
  'naics-expansion': Object.freeze({
    id: 'naics-expansion',
    name: 'NAICS Expansion',
    description: 'Candidate NAICS library separated from current SAM registrations.'
  }),
  'subcontractor-bench': Object.freeze({
    id: 'subcontractor-bench',
    name: 'Subcontractor Bench',
    description: 'Vendor/sub profile tracking, readiness, documentation, and similarly situated checks.'
  }),
  'quote-packet-generator': Object.freeze({
    id: 'quote-packet-generator',
    name: 'Quote Packet Generator',
    description: 'Quick-turn fixed-price quote packet scaffold with management/admin/QA language.'
  }),
  'workflow-automation': Object.freeze({
    id: 'workflow-automation',
    name: 'Workflow Automation',
    description: 'Task generation, missing-data checklists, compliance checklists, and pipeline movement.'
  })
});

const DEFAULT_ENABLED = Object.freeze(Object.keys(MODULES).reduce((acc, id) => {
  acc[id] = true;
  return acc;
}, {}));

function sanitizeFeatureFlags(input) {
  const out = Object.assign({}, DEFAULT_ENABLED);
  if (!input || typeof input !== 'object') return out;
  for (const id of Object.keys(MODULES)) {
    if (typeof input[id] === 'boolean') out[id] = input[id];
  }
  return out;
}

function createAddonRegistryService(store) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('addons: store must implement get(key) and set(key, value)');
  }
  const KEY = 'govcon.addons.enabled';
  function list() {
    const enabled = sanitizeFeatureFlags(store.get(KEY));
    return Object.keys(MODULES).map(id => Object.freeze(Object.assign({}, MODULES[id], {
      enabled: !!enabled[id]
    })));
  }
  function flags() {
    return sanitizeFeatureFlags(store.get(KEY));
  }
  function save(patch) {
    const next = sanitizeFeatureFlags(Object.assign({}, flags(), patch || {}));
    store.set(KEY, next);
    return next;
  }
  return { list, flags, save };
}

module.exports = {
  MODULES,
  DEFAULT_ENABLED,
  sanitizeFeatureFlags,
  createAddonRegistryService
};
