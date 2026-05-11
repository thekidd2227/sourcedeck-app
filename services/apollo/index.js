// services/apollo/index.js
//
// Apollo enrichment wrapper for the SourceDeck main-process / API tier.
//
// Renderer never sets x-api-key. The Apollo key is read from a
// CredentialStore at call time and bolted on inside this module
// before fetch.
//
// Procurement-safe wording is enforced:
//   - we never label any returned contact as a "cold outreach" target
//   - we never recommend mass DMs or contact during restricted comms
//   - results carry an explicit FAR-aware safety note
//
// Pure data layer; no DOM, no Electron import.

'use strict';

const API_BASE = 'https://api.apollo.io/api/v1';

// Safety note attached to every result payload. Mirrors the wording on
// the public sourcedeck-site /federal/ and /data-sources/ pages.
const SAFETY_NOTE = [
  'Reference intelligence only.',
  'Follow solicitation instructions and procurement communication windows.',
  'Do not contact contracting officers, COs, COSs, or CORs outside permitted channels',
  'or during a restricted communication window.',
  'SourceDeck does not draft or send outreach to a CO/COR.'
].join(' ');

// Allowlisted endpoints. Anything else is rejected at the boundary so
// renderer-supplied input cannot route to an arbitrary Apollo path.
const ALLOWED_ENDPOINTS = new Set([
  'organizations/enrich',
  'people/match',
  'mixed_people/search',
  'mixed_companies/search'
]);

const STR_FIELDS = new Set([
  'q_organization_domains', 'q_keywords',
  'organization_domain', 'organization_name',
  'first_name', 'last_name', 'name', 'email',
  'title', 'organization_id'
]);
const ARRAY_FIELDS = new Set([
  'organization_domains', 'organization_names',
  'titles', 'q_organization_naics_codes',
  'organization_locations'
]);
const INT_FIELDS = new Set(['page', 'per_page']);

function _sanitizeBody(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (STR_FIELDS.has(k) && typeof v === 'string' && v.length <= 200) {
      out[k] = v.trim();
    } else if (ARRAY_FIELDS.has(k) && Array.isArray(v)) {
      out[k] = v.filter(x => typeof x === 'string' && x.length <= 200).slice(0, 25);
    } else if (INT_FIELDS.has(k) && typeof v === 'number' && isFinite(v)) {
      out[k] = Math.max(1, Math.min(100, v | 0));
    }
  }
  return out;
}

// Normalize an Apollo organization into a SourceDeck-shape that we can
// safely show in the UI. We deliberately drop person-level personal
// emails / direct phones from this layer -- those go through a
// separate, audited "contact reveal" pathway later.
function _normalizeOrg(org) {
  if (!org || typeof org !== 'object') return null;
  return {
    id:           org.id || null,
    name:         org.name || null,
    website:      org.website_url || org.primary_domain || null,
    naicsCodes:   Array.isArray(org.naics_codes) ? org.naics_codes : [],
    industry:     org.industry || null,
    foundedYear:  org.founded_year || null,
    estEmployees: org.estimated_num_employees || null,
    city:         org.city || null,
    state:        org.state || null,
    country:      org.country || null,
    description:  org.short_description || null,
    _source:      'apollo'
  };
}

// Person normalization. We deliberately do NOT surface personal
// emails or phone numbers here -- only role/firmographic context.
// Caller must explicitly request contact reveal through a separate
// audited path.
function _normalizePerson(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    id:           p.id || null,
    name:         p.name || (p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : null),
    title:        p.title || null,
    organization: p.organization && p.organization.name || null,
    seniority:    p.seniority || null,
    departments:  Array.isArray(p.departments) ? p.departments : [],
    linkedinUrl:  p.linkedin_url || null,
    _source:      'apollo'
  };
}

function createApolloService(deps) {
  deps = deps || {};
  const credentials = deps.credentials;
  if (!credentials || typeof credentials.get !== 'function') {
    throw new Error('apollo: deps.credentials with get() is required');
  }
  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  const audit   = deps.audit || null;

  function _audit(eventType, status, metadata) {
    if (!audit || typeof audit.append !== 'function') return;
    try {
      audit.append({
        type: eventType, provider: 'apollo',
        status, metadata: metadata || {}
      });
    } catch (_) {}
  }

  async function _request(endpoint, body) {
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return { ok: false, error: 'endpoint_not_allowed', detail: endpoint };
    }
    if (!fetchFn) return { ok: false, error: 'no_fetch_available' };
    const key = await credentials.get('apollo');
    if (!key) return { ok: false, error: 'no_credential' };
    const safeBody = _sanitizeBody(body);
    let resp;
    try {
      resp = await fetchFn(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(safeBody)
      });
    } catch (e) {
      return { ok: false, error: 'fetch_failed', detail: e.message };
    }
    let payload = null;
    try { payload = await resp.json(); } catch (_) {}
    if (!resp.ok) {
      // Strip Apollo error body of anything that looks like a key.
      const safeMsg = payload && payload.error && typeof payload.error === 'string'
        ? payload.error.slice(0, 200) : null;
      return { ok: false, error: 'http_' + resp.status, detail: safeMsg };
    }
    return { ok: true, body: payload };
  }

  return Object.freeze({
    SAFETY_NOTE,

    async enrichOrganization(input) {
      const r = await _request('organizations/enrich', input);
      if (!r.ok) {
        _audit('AI_REQUEST_FAILED', 'error', { op: 'apollo.enrich_org', error: r.error });
        return r;
      }
      const org = _normalizeOrg(r.body && r.body.organization);
      _audit('AI_RESPONSE_RECEIVED', 'ok', { op: 'apollo.enrich_org', hit: !!org });
      return { ok: true, org, safetyNote: SAFETY_NOTE };
    },

    async searchPeople(input) {
      const r = await _request('mixed_people/search', input);
      if (!r.ok) {
        _audit('AI_REQUEST_FAILED', 'error', { op: 'apollo.search_people', error: r.error });
        return r;
      }
      const people = (r.body && Array.isArray(r.body.people) ? r.body.people : []).map(_normalizePerson).filter(Boolean);
      _audit('AI_RESPONSE_RECEIVED', 'ok', { op: 'apollo.search_people', count: people.length });
      return { ok: true, people, safetyNote: SAFETY_NOTE };
    },

    async searchOrganizations(input) {
      const r = await _request('mixed_companies/search', input);
      if (!r.ok) {
        _audit('AI_REQUEST_FAILED', 'error', { op: 'apollo.search_orgs', error: r.error });
        return r;
      }
      const orgs = (r.body && Array.isArray(r.body.organizations) ? r.body.organizations : []).map(_normalizeOrg).filter(Boolean);
      _audit('AI_RESPONSE_RECEIVED', 'ok', { op: 'apollo.search_orgs', count: orgs.length });
      return { ok: true, organizations: orgs, safetyNote: SAFETY_NOTE };
    }
  });
}

module.exports = {
  createApolloService,
  SAFETY_NOTE,
  _internal: { ALLOWED_ENDPOINTS, _normalizeOrg, _normalizePerson, _sanitizeBody }
};
