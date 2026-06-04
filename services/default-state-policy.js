// services/default-state-policy.js
//
// Default-state policy — the canonical rules and lists that govern what
// SourceDeck shows a brand-new user before they have configured anything.
//
// PRINCIPLE
//   Nothing personal, client-specific, operator-specific, ARCG-specific,
//   demo-specific, fake-production, or seed-like preloads for ordinary
//   users. Demo data is only ever available behind an explicit
//   SOURCEDECK_DEMO_MODE=true env flag.
//
// USAGE
//   const policy = require('./services/default-state-policy');
//   if (policy.isDemoMode(process.env)) { /* show demo */ }
//   policy.assertNoOperatorSeedData('Acme widgets'); // OK
//   policy.assertNoOperatorSeedData('NYC Metro');    // throws

'use strict';

// ── Demo-mode gate ──────────────────────────────────────────────────
// Demo data is off by default. Operators who want to populate the app
// with sample content must explicitly set SOURCEDECK_DEMO_MODE=true in
// their environment. The flag is read at runtime and is never persisted.
function isDemoMode(env) {
  const v = (env && env.SOURCEDECK_DEMO_MODE);
  return v === 'true' || v === '1' || v === 1 || v === true;
}

// ── Operator / demo / seed terms that must never appear in default
// user-facing state. The list is intentionally specific (proper nouns,
// internal codenames, geographic biases tied to the operator). Generic
// English words are not blocked.
const FORBIDDEN_SEED_TERMS = Object.freeze([
  // Operator identity / personal names
  'ARCG', 'ARCG Systems', 'ariver', 'arivergroup',
  'Jean-Max', 'JeanMax', 'jeanmax',
  // Internal pipeline / workflow IDs
  /\bPROD-0\d\b/,
  // Operator integrations as fake-status defaults
  'Notion pipeline', 'Notion Leads DB',
  /\bAirtable Base\b.*appX/,
  /\bGmail Connection\b.*\d{5,}/,
  'Instantly Campaign',
  // Operator-specific topic / diagnostic codenames
  'Diagnosis-First', 'Diagnosis First',
  'Revenue Leakage Math', 'Revenue Leakage',
  'Operator POV',
  'Property Management Diagnostic',
  'Government Contractor Diagnostic',
  'Caribbean & LatAm Operator Diagnostic',
  'Bad-Fit Opportunity Chase',
  'Faceless Ad Engine',
  'MedPilot',
  // Geo bias that surfaces operator's home market
  /\bNYC Metro\b/,
  /\bManhattan\b/, /\bBronx\b/, /\bBrooklyn\b/, /\bQueens\b/, /\bStaten Island\b/,
  /\bWestchester\b/,
  'Spanish Caribbean',
  // Fake-looking demo IDs the operator's screenshots have shown
  /\bti5tlit9s9ir0sr1vha7vqjyemcuvlnq\b/,
  /\bjpu2xjxufd8x7yt3qnsk9ntxd0ns77jk\b/,
  /\b8125092\b/,
  /\b4595758\b/,
  /\bappXXXXXXXXXXXXXXX\b/
]);

function assertNoOperatorSeedData(value) {
  if (value == null) return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const t of FORBIDDEN_SEED_TERMS) {
    const hit = (t instanceof RegExp) ? t.test(text) : text.includes(t);
    if (hit) {
      const label = (t instanceof RegExp) ? t.source : t;
      const err = new Error('default-state-policy: forbidden seed term: ' + label);
      err.code = 'FORBIDDEN_SEED_TERM';
      err.term = label;
      throw err;
    }
  }
  return value;
}

function sanitizeDefaultUserState(value) {
  if (value == null) return value;
  // For arrays/objects, recursively redact any string containing a forbidden term.
  const scrub = (s) => {
    if (typeof s !== 'string') return s;
    let t = s;
    for (const term of FORBIDDEN_SEED_TERMS) {
      if (term instanceof RegExp) {
        if (term.test(t)) t = t.replace(new RegExp(term.source, term.flags + (term.flags.includes('g') ? '' : 'g')), '');
      } else if (t.includes(term)) {
        t = t.split(term).join('');
      }
    }
    return t.replace(/\s{2,}/g, ' ').trim();
  };
  if (typeof value === 'string') return scrub(value);
  if (Array.isArray(value)) return value.map(sanitizeDefaultUserState);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeDefaultUserState(value[k]);
    return out;
  }
  return value;
}

// ── Default empty-state copy ────────────────────────────────────────
const DEFAULT_EMPTY_STATES = Object.freeze({
  leads:               'No leads yet. Describe a target profile and generate leads.',
  activity:            'No activity yet.',
  webhooks:            'No webhooks active. Connect tools in Settings to populate this panel.',
  connections:         'No connections configured.',
  infrastructure:      'No integrations configured.',
  automationStatus:    'No automations active.',
  dailyRhythm:         'No operating rhythm yet. Add tasks, connect workflows, or ask AI to generate a daily rhythm from your goals.',
  weeklyRhythm:        'No weekly rhythm yet.',
  escalationRules:     'No escalation rules configured.',
  adTopics:            'Topics are generated from your industry, platform, offer, audience, goal, and notes.',
  adIndustries:        'Select an industry that matches your business.',
  adPlatforms:         'Select where this content will be published.',
  systemIdentifiers:   'No system identifiers configured. Set integrations in Settings.',
  responseDesk:        'Paste a reply and click Analyze reply.',
  govconWorkspace:     'No opportunities tracked yet.'
});

// ── Generic top-50 industry list (alphabetic clustering, broad coverage) ──
const TOP_50_INDUSTRIES = Object.freeze([
  'Property Management',
  'Real Estate',
  'Construction',
  'Facilities Management',
  'Home Services',
  'Healthcare',
  'Dental',
  'Ophthalmology',
  'Optometry',
  'Medical Billing',
  'Legal Services',
  'Accounting',
  'Insurance',
  'Financial Services',
  'Staffing Agencies',
  'Recruiting',
  'Government Contractors',
  'Nonprofits',
  'Education',
  'Coaching / Consulting',
  'SaaS',
  'IT Services',
  'Cybersecurity',
  'Managed Services',
  'E-commerce',
  'Retail',
  'Restaurants',
  'Hospitality',
  'Travel',
  'Automotive',
  'Transportation / Logistics',
  'Cleaning / Janitorial',
  'Landscaping',
  'HVAC / Plumbing / Electrical',
  'Roofing',
  'Fitness',
  'Beauty / Wellness',
  'Events',
  'Entertainment',
  'Media / Creative',
  'Manufacturing',
  'Distribution',
  'Agriculture',
  'Security Services',
  'Senior Care',
  'Childcare',
  'Pet Services',
  'Professional Services',
  'Local Services',
  'Other'
]);

// ── Broad social / content platform list ───────────────────────────
const SOCIAL_CONTENT_PLATFORMS = Object.freeze([
  'Instagram',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'YouTube Shorts',
  'X / Twitter',
  'Threads',
  'Pinterest',
  'Snapchat',
  'Reddit',
  'Quora',
  'Google Business Profile',
  'Google Ads',
  'Meta Ads',
  'LinkedIn Ads',
  'TikTok Ads',
  'YouTube Ads',
  'Email',
  'SMS',
  'Blog / SEO',
  'Landing Page',
  'Podcast',
  'Webinar',
  'Marketplace',
  'Multi-Platform',
  'Other'
]);

// ── Generic ad-topic categories (intent-based, not operator-codenamed) ──
const GENERIC_AD_TOPIC_CATEGORIES = Object.freeze([
  'Awareness',
  'Lead generation',
  'Educational',
  'Offer',
  'Retargeting',
  'Testimonial',
  'Seasonal',
  'Recruiting',
  'Brand authority',
  'Product/service explainer',
  'Other'
]);

const _api = {
  isDemoMode,
  assertNoOperatorSeedData,
  sanitizeDefaultUserState,
  FORBIDDEN_SEED_TERMS,
  DEFAULT_EMPTY_STATES,
  TOP_50_INDUSTRIES,
  SOCIAL_CONTENT_PLATFORMS,
  GENERIC_AD_TOPIC_CATEGORIES
};
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
if (typeof window !== 'undefined') window.SDDefaultState = _api;
