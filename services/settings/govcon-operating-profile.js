// services/settings/govcon-operating-profile.js
//
// GovCon Operating Profile — the full business / GovCon / content
// context SourceDeck uses during normal premium operation.
//
// RELATIONSHIP TO targeting-profile.js
//   The existing services/govcon/targeting-profile.js remains the
//   canonical store for SAM-search *targeting* (naics, psc, agencies,
//   set-asides, contract types, notice types, posted/deadline windows).
//   This operating profile OWNS the rest (business identity, GovCon
//   identifiers, capability-statement-approved fields, past performance,
//   content/social profile, safety rules) and, when a targeting service
//   is injected, routes targeting fields THROUGH it so there is one
//   source of truth — no duplication.
//
// CREDENTIAL SAFETY (critical)
//   - This profile NEVER stores API keys. save() strips any
//     credential-looking value and records it in `_rejected` for the
//     caller to surface; it never persists or logs the value.
//   - Credential *presence* flags (samGovPresent, openaiPresent, ...)
//     are DERIVED from credentials.status() at read time, never stored
//     as truth.
//
// Pure data layer. No network, no IPC. main.js wires it up.

'use strict';

const STORE_KEY = 'govcon.operatingProfile';

// Service ids whose presence we surface on the profile. Maps a profile
// presence flag -> credential service id (see services/settings/credentials).
const PRESENCE_MAP = Object.freeze({
  samGovPresent:    'sam-gov',
  openaiPresent:    'openai',
  anthropicPresent: 'anthropic',
  watsonxPresent:   'watsonx',
  canvaPresent:     'canva',
  metaPresent:      'meta',
  instagramPresent: 'instagram',
  facebookPresent:  'facebook',
  tiktokPresent:    'tiktok',
  linkedinPresent:  'linkedin'
});

const CERT_KEYS = Object.freeze(['SDVOSB', 'VOSB', 'HUBZone', '8(a)', 'WOSB', 'EDWOSB', 'MBE', 'DBE', 'SBE', 'other']);
const CONTENT_GOALS = Object.freeze(['authority', 'leads', 'website_traffic', 'prime_partner_credibility', 'recruiting', 'local_business_trust']);
const POSTING_PLATFORMS = Object.freeze(['meta_business_suite', 'facebook', 'instagram', 'tiktok', 'linkedin']);
const SOCIAL_KEYS = Object.freeze(['linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'xTwitter']);

// ── credential-looking string detection ──────────────────────────────
// We refuse to persist anything that looks like a secret into the
// (non-secret) operating profile. Conservative, never logs the value.
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,         // OpenAI-style
  /\bsk-ant-[A-Za-z0-9_-]{10,}\b/,     // Anthropic-style
  /\bAKIA[0-9A-Z]{12,}\b/,             // AWS access key id
  /\bBearer\s+[A-Za-z0-9._-]{12,}/i,   // bearer token
  /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, // JWT
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,  // Slack-style
  /\b[A-Za-z0-9_-]{40,}\b/,            // long opaque token (40+ chars)
  /api[_-]?key\s*[:=]/i,               // "api_key:" / "apikey="
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/ // PEM private key
];
function looksLikeSecret(v) {
  if (typeof v !== 'string') return false;
  return SECRET_PATTERNS.some(re => re.test(v));
}

// ── small sanitizers ─────────────────────────────────────────────────
function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max || 200) : ''; }
function bool(v) { return v === true; }
function dateStr(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : ''; }
function uniqStr(arr, max, perCap, lower) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set(); const out = [];
  for (const v of arr) {
    if (v == null) continue;
    let s = String(v).trim().slice(0, perCap || 120);
    if (lower) s = s.toLowerCase();
    if (!s || looksLikeSecret(s) || seen.has(s)) continue;
    seen.add(s); out.push(s);
  }
  return out.slice(0, max || 40);
}
function naicsLike(s) { return /^\d{2,6}$/.test(String(s)); }
function pscLike(s)   { return /^[A-Z0-9]{1,4}$/i.test(String(s)); }
function ueiLike(s)   { return /^[A-Z0-9]{12}$/i.test(String(s)); }
function cageLike(s)  { return /^[A-Z0-9]{5}$/i.test(String(s)); }

function defaultProfile() {
  return {
    schemaVersion: 1,
    business: {
      legalBusinessName: '', dbaName: '', website: '', businessEmail: '', businessPhone: '',
      headquartersAddress: '', headquartersState: '', serviceArea: '',
      primaryContactName: '', primaryContactTitle: '',
      shortBusinessDescription: '', elevatorPitch: '',
      differentiators: [], coreServices: [], industriesServed: []
    },
    identifiers: {
      uei: '', cageCode: '', samRegistrationStatus: '', samExpirationDate: '',
      smallBusinessStatus: '',
      certifications: { SDVOSB: false, VOSB: false, HUBZone: false, '8(a)': false, WOSB: false, EDWOSB: false, MBE: false, DBE: false, SBE: false, other: '' }
    },
    targeting: {
      naicsCodes: [], pscCodes: [], targetAgencies: [], excludedAgencies: [],
      targetOpportunityTypes: [], excludedOpportunityTypes: [],
      targetContractSize: '', minimumAcceptableMargin: null,
      targetStates: [], targetRegions: [],
      remoteOnsitePreference: '', subcontractingPreference: '', primePartnershipPreferences: ''
    },
    capabilityStatement: {
      capabilityStatementMetadata: { fileName: '', byteLength: null, addedAt: '' },
      extractedLegalName: '', extractedUEI: '', extractedCAGE: '',
      extractedNAICS: [], extractedPSC: [], extractedCertifications: [],
      extractedServices: [], extractedDifferentiators: [], extractedPastPerformanceSnippets: [],
      extractionConfidenceLabels: {}, userApprovedExtractedFields: []
    },
    pastPerformance: {
      projects: [], agenciesOrCustomers: [], scopes: [], contractValuesOptional: [],
      dates: [], performanceOutcomes: [], referenceAvailableFlag: false, piiApproved: false
    },
    content: {
      brandVoice: '', approvedTone: '', restrictedTopics: [], approvedClaims: [], blockedClaims: [],
      websiteUrl: '', bookingOrContactUrl: '',
      socialHandles: { linkedin: '', facebook: '', instagram: '', tiktok: '', youtube: '', xTwitter: '' },
      defaultPostingPlatforms: [],
      contentGoals: [], hashtagPreferences: [], imageStylePreferences: [],
      brandAssetReferencesMetadataOnly: []
    },
    safety: {
      requireApprovalBeforeOutreach: true,
      requireApprovalBeforeContentPosting: true,
      blockUnsupportedCertificationClaims: true,
      blockConfidentialContent: true
    },
    _rejected: []   // names of fields dropped because they looked like secrets
  };
}

// Deep-sanitize a patch merged onto current. Never persists secrets.
function sanitizeProfile(input) {
  const out = defaultProfile();
  const rejected = [];
  if (!input || typeof input !== 'object') return out;

  // Guard: scan the WHOLE incoming payload for credential-looking
  // strings and record/skip them.
  const scan = (obj, pathPrefix) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      const p = pathPrefix ? pathPrefix + '.' + k : k;
      if (typeof v === 'string' && looksLikeSecret(v)) rejected.push(p);
      else if (v && typeof v === 'object') scan(v, p);
    }
  };
  scan(input, '');

  const b = input.business || {};
  Object.assign(out.business, {
    legalBusinessName: cleanField(b.legalBusinessName, 160, rejected, 'business.legalBusinessName'),
    dbaName:           cleanField(b.dbaName, 160, rejected, 'business.dbaName'),
    website:           cleanField(b.website, 200, rejected, 'business.website'),
    businessEmail:     cleanField(b.businessEmail, 160, rejected, 'business.businessEmail'),
    businessPhone:     cleanField(b.businessPhone, 40, rejected, 'business.businessPhone'),
    headquartersAddress: cleanField(b.headquartersAddress, 240, rejected, 'business.headquartersAddress'),
    headquartersState: cleanField(b.headquartersState, 40, rejected, 'business.headquartersState'),
    serviceArea:       cleanField(b.serviceArea, 200, rejected, 'business.serviceArea'),
    primaryContactName:  cleanField(b.primaryContactName, 120, rejected, 'business.primaryContactName'),
    primaryContactTitle: cleanField(b.primaryContactTitle, 120, rejected, 'business.primaryContactTitle'),
    shortBusinessDescription: cleanField(b.shortBusinessDescription, 600, rejected, 'business.shortBusinessDescription'),
    elevatorPitch:     cleanField(b.elevatorPitch, 600, rejected, 'business.elevatorPitch'),
    differentiators:   uniqStr(b.differentiators, 20, 240),
    coreServices:      uniqStr(b.coreServices, 30, 160),
    industriesServed:  uniqStr(b.industriesServed, 30, 120)
  });

  const id = input.identifiers || {};
  out.identifiers.uei  = ueiLike(str(id.uei)) ? str(id.uei, 12).toUpperCase() : '';
  out.identifiers.cageCode = cageLike(str(id.cageCode)) ? str(id.cageCode, 5).toUpperCase() : '';
  out.identifiers.samRegistrationStatus = cleanField(id.samRegistrationStatus, 40, rejected, 'identifiers.samRegistrationStatus');
  out.identifiers.samExpirationDate = dateStr(id.samExpirationDate);
  out.identifiers.smallBusinessStatus = cleanField(id.smallBusinessStatus, 60, rejected, 'identifiers.smallBusinessStatus');
  if (id.certifications && typeof id.certifications === 'object') {
    for (const c of CERT_KEYS) {
      if (c === 'other') out.identifiers.certifications.other = cleanField(id.certifications.other, 120, rejected, 'identifiers.certifications.other');
      else out.identifiers.certifications[c] = bool(id.certifications[c]);
    }
  }

  const t = input.targeting || {};
  Object.assign(out.targeting, {
    naicsCodes: uniqStr(t.naicsCodes, 40, 6).filter(naicsLike),
    pscCodes:   uniqStr(t.pscCodes, 40, 4).filter(pscLike),
    targetAgencies: uniqStr(t.targetAgencies, 40, 120),
    excludedAgencies: uniqStr(t.excludedAgencies, 40, 120),
    targetOpportunityTypes: uniqStr(t.targetOpportunityTypes, 20, 60),
    excludedOpportunityTypes: uniqStr(t.excludedOpportunityTypes, 20, 60),
    targetContractSize: cleanField(t.targetContractSize, 60, rejected, 'targeting.targetContractSize'),
    minimumAcceptableMargin: (typeof t.minimumAcceptableMargin === 'number' && isFinite(t.minimumAcceptableMargin))
      ? Math.max(0, Math.min(100, t.minimumAcceptableMargin)) : null,
    targetStates: uniqStr(t.targetStates, 60, 40),
    targetRegions: uniqStr(t.targetRegions, 30, 60),
    remoteOnsitePreference: cleanField(t.remoteOnsitePreference, 40, rejected, 'targeting.remoteOnsitePreference'),
    subcontractingPreference: cleanField(t.subcontractingPreference, 60, rejected, 'targeting.subcontractingPreference'),
    primePartnershipPreferences: cleanField(t.primePartnershipPreferences, 240, rejected, 'targeting.primePartnershipPreferences')
  });

  const cs = input.capabilityStatement || {};
  if (cs.capabilityStatementMetadata && typeof cs.capabilityStatementMetadata === 'object') {
    out.capabilityStatement.capabilityStatementMetadata = {
      fileName: cleanField(cs.capabilityStatementMetadata.fileName, 200, rejected, 'capabilityStatement.fileName'),
      byteLength: (typeof cs.capabilityStatementMetadata.byteLength === 'number') ? cs.capabilityStatementMetadata.byteLength : null,
      addedAt: dateStr(cs.capabilityStatementMetadata.addedAt)
    };
  }
  out.capabilityStatement.extractedLegalName = cleanField(cs.extractedLegalName, 160, rejected, 'capabilityStatement.extractedLegalName');
  out.capabilityStatement.extractedUEI  = ueiLike(str(cs.extractedUEI)) ? str(cs.extractedUEI, 12).toUpperCase() : '';
  out.capabilityStatement.extractedCAGE = cageLike(str(cs.extractedCAGE)) ? str(cs.extractedCAGE, 5).toUpperCase() : '';
  out.capabilityStatement.extractedNAICS = uniqStr(cs.extractedNAICS, 40, 6).filter(naicsLike);
  out.capabilityStatement.extractedPSC   = uniqStr(cs.extractedPSC, 40, 4).filter(pscLike);
  out.capabilityStatement.extractedCertifications = uniqStr(cs.extractedCertifications, 20, 40);
  out.capabilityStatement.extractedServices = uniqStr(cs.extractedServices, 40, 160);
  out.capabilityStatement.extractedDifferentiators = uniqStr(cs.extractedDifferentiators, 20, 240);
  out.capabilityStatement.extractedPastPerformanceSnippets = uniqStr(cs.extractedPastPerformanceSnippets, 20, 400);
  if (cs.extractionConfidenceLabels && typeof cs.extractionConfidenceLabels === 'object') {
    for (const [k, v] of Object.entries(cs.extractionConfidenceLabels)) {
      out.capabilityStatement.extractionConfidenceLabels[str(k, 40)] = str(v, 20);
    }
  }
  out.capabilityStatement.userApprovedExtractedFields = uniqStr(cs.userApprovedExtractedFields, 40, 60);

  const pp = input.pastPerformance || {};
  Object.assign(out.pastPerformance, {
    projects: uniqStr(pp.projects, 30, 200),
    agenciesOrCustomers: uniqStr(pp.agenciesOrCustomers, 30, 160),
    scopes: uniqStr(pp.scopes, 30, 240),
    contractValuesOptional: uniqStr(pp.contractValuesOptional, 30, 40),
    dates: uniqStr(pp.dates, 30, 40),
    performanceOutcomes: uniqStr(pp.performanceOutcomes, 30, 240),
    referenceAvailableFlag: bool(pp.referenceAvailableFlag),
    piiApproved: bool(pp.piiApproved)
  });

  const c = input.content || {};
  out.content.brandVoice = cleanField(c.brandVoice, 240, rejected, 'content.brandVoice');
  out.content.approvedTone = cleanField(c.approvedTone, 120, rejected, 'content.approvedTone');
  out.content.restrictedTopics = uniqStr(c.restrictedTopics, 30, 120);
  out.content.approvedClaims = uniqStr(c.approvedClaims, 40, 240);
  out.content.blockedClaims = uniqStr(c.blockedClaims, 40, 240);
  out.content.websiteUrl = cleanField(c.websiteUrl, 200, rejected, 'content.websiteUrl');
  out.content.bookingOrContactUrl = cleanField(c.bookingOrContactUrl, 200, rejected, 'content.bookingOrContactUrl');
  if (c.socialHandles && typeof c.socialHandles === 'object') {
    for (const s of SOCIAL_KEYS) out.content.socialHandles[s] = cleanField(c.socialHandles[s], 200, rejected, 'content.socialHandles.' + s);
  }
  out.content.defaultPostingPlatforms = uniqStr(c.defaultPostingPlatforms, 10, 40, true).filter(p => POSTING_PLATFORMS.includes(p));
  out.content.contentGoals = uniqStr(c.contentGoals, 10, 40, true).filter(g => CONTENT_GOALS.includes(g));
  out.content.hashtagPreferences = uniqStr(c.hashtagPreferences, 40, 60);
  out.content.imageStylePreferences = uniqStr(c.imageStylePreferences, 20, 120);
  out.content.brandAssetReferencesMetadataOnly = uniqStr(c.brandAssetReferencesMetadataOnly, 30, 200);

  const sf = input.safety || {};
  out.safety.requireApprovalBeforeOutreach = sf.requireApprovalBeforeOutreach === false ? false : true;
  out.safety.requireApprovalBeforeContentPosting = sf.requireApprovalBeforeContentPosting === false ? false : true;
  out.safety.blockUnsupportedCertificationClaims = sf.blockUnsupportedCertificationClaims === false ? false : true;
  out.safety.blockConfidentialContent = sf.blockConfidentialContent === false ? false : true;

  out._rejected = Array.from(new Set(rejected));
  return out;
}

// Clean a scalar text field; if it looks like a secret, drop it and record.
function cleanField(v, max, rejected, path) {
  if (typeof v === 'string' && looksLikeSecret(v)) { rejected.push(path); return ''; }
  return str(v, max);
}

// Merge a patch onto an existing profile (shallow per section, deep enough).
function mergeProfile(current, patch) {
  const base = current || defaultProfile();
  const merged = JSON.parse(JSON.stringify(base));
  if (patch && typeof patch === 'object') {
    for (const section of ['business', 'identifiers', 'targeting', 'capabilityStatement', 'pastPerformance', 'content', 'safety']) {
      if (patch[section] && typeof patch[section] === 'object') {
        merged[section] = Object.assign({}, merged[section], patch[section]);
      }
    }
  }
  return merged;
}

// Store-bound service. deps: { store, credentials?, targetingProfile? }
function createOperatingProfileService(deps) {
  deps = deps || {};
  const store = deps.store;
  const credentials = deps.credentials || null;
  const targetingProfile = deps.targetingProfile || null;
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('govcon-operating-profile: store with get/set is required');
  }

  async function presence() {
    const flags = {};
    for (const k of Object.keys(PRESENCE_MAP)) flags[k] = false;
    if (credentials && typeof credentials.status === 'function') {
      try {
        const st = await credentials.status();
        const present = (st && st.present) || {};
        for (const [flag, svc] of Object.entries(PRESENCE_MAP)) flags[flag] = !!present[svc];
      } catch (_) { /* presence stays false */ }
    }
    return flags;
  }

  async function get() {
    const stored = store.get(STORE_KEY);
    const profile = sanitizeProfile(stored || {});
    // Targeting comes from the canonical targeting service when present.
    if (targetingProfile && typeof targetingProfile.load === 'function') {
      try {
        const tp = targetingProfile.load();
        profile.targeting.naicsCodes = tp.naics && tp.naics.length ? tp.naics.slice() : profile.targeting.naicsCodes;
        profile.targeting.pscCodes = tp.psc && tp.psc.length ? tp.psc.slice() : profile.targeting.pscCodes;
        if (tp.agencies) {
          if (tp.agencies.include && tp.agencies.include.length) profile.targeting.targetAgencies = tp.agencies.include.slice();
          if (tp.agencies.exclude && tp.agencies.exclude.length) profile.targeting.excludedAgencies = tp.agencies.exclude.slice();
        }
      } catch (_) {}
    }
    profile.credentialPresence = await presence();
    return profile;
  }

  async function save(patch) {
    // Hard refuse a payload that smuggles API keys at top level.
    const current = sanitizeProfile(store.get(STORE_KEY) || {});
    const merged = mergeProfile(current, patch);
    const clean = sanitizeProfile(merged);
    store.set(STORE_KEY, clean);
    // Route targeting fields to the canonical targeting service (no dupe).
    if (targetingProfile && typeof targetingProfile.save === 'function' && patch && patch.targeting) {
      try {
        targetingProfile.save({
          naics: clean.targeting.naicsCodes,
          psc: clean.targeting.pscCodes,
          agencies: { include: clean.targeting.targetAgencies, exclude: clean.targeting.excludedAgencies }
        });
      } catch (_) {}
    }
    const result = await get();
    result._rejected = clean._rejected;
    return result;
  }

  function reset() {
    const fresh = defaultProfile();
    store.set(STORE_KEY, fresh);
    return fresh;
  }

  return { get, save, reset, presence };
}

module.exports = {
  createOperatingProfileService,
  defaultProfile,
  sanitizeProfile,
  mergeProfile,
  looksLikeSecret,
  STORE_KEY,
  PRESENCE_MAP,
  CERT_KEYS,
  CONTENT_GOALS,
  POSTING_PLATFORMS,
  SOCIAL_KEYS
};
