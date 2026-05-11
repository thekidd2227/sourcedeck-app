// services/airtable/index.js
//
// Airtable wrapper for the SourceDeck main-process / API tier.
//
// Renderer never builds an Authorization header. The Airtable PAT
// is read from a CredentialStore at call time and bolted on inside
// this module before fetch.
//
// Sanitizes baseId / tableNameOrId / recordId / queryString shapes
// so a misconfigured renderer can't smuggle a path component or a
// header into the request.
//
// Audit-aware: every mutating call (create/update/delete) emits a
// structured audit event via the optional audit dependency.
//
// Pure data layer; no DOM, no Electron import.

'use strict';

const API_BASE = 'https://api.airtable.com/v0';

// Airtable resource IDs are tightly bounded; reject anything else.
const BASE_ID_RE   = /^app[A-Za-z0-9]{14,}$/;
const TABLE_ID_RE  = /^tbl[A-Za-z0-9]{14,}$/;
const RECORD_ID_RE = /^rec[A-Za-z0-9]{14,}$/;
// Display-name table reference (when the renderer used the human name).
const TABLE_NAME_RE = /^[A-Za-z0-9 _\-]{1,80}$/;

function _validateBase(baseId) {
  if (!BASE_ID_RE.test(String(baseId || ''))) {
    throw new Error('airtable: invalid baseId');
  }
}
function _validateTable(tableRef) {
  const s = String(tableRef || '');
  if (!s) throw new Error('airtable: tableRef required');
  if (TABLE_ID_RE.test(s) || TABLE_NAME_RE.test(s)) return s;
  throw new Error('airtable: invalid tableRef');
}
function _validateRecord(recordId) {
  if (!RECORD_ID_RE.test(String(recordId || ''))) {
    throw new Error('airtable: invalid recordId');
  }
}

// Build a sanitized querystring from a plain object. Allowlist Airtable
// query params; everything else is silently dropped.
const ALLOWED_PARAMS = new Set([
  'maxRecords', 'pageSize', 'view', 'filterByFormula', 'fields',
  'sort', 'cellFormat', 'timeZone', 'userLocale', 'returnFieldsByFieldId',
  'offset'
]);
function _buildQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(k)) continue;
    if (Array.isArray(v)) {
      for (const item of v) u.append(`${k}[]`, String(item));
    } else if (k === 'sort' && typeof v === 'object') {
      // sort: [{field, direction}] -> sort[0][field]= ... &sort[0][direction]= ...
      // (keep the simple bracket form so callers can pass a normal array of objects)
      continue;
    } else if (v !== undefined && v !== null) {
      u.set(k, String(v));
    }
  }
  // Sort handling for arrays of objects.
  if (Array.isArray(params.sort)) {
    params.sort.forEach((s, i) => {
      if (s && typeof s === 'object') {
        if (s.field)     u.set(`sort[${i}][field]`,     String(s.field));
        if (s.direction) u.set(`sort[${i}][direction]`, String(s.direction));
      }
    });
  }
  const qs = u.toString();
  return qs ? '?' + qs : '';
}

// Cap fields payloads to a defensible size; we don't want a renderer
// memory-leak shipping multi-MB records into our process.
const MAX_FIELDS_BYTES = 256 * 1024;
function _sanitizeFields(fields) {
  if (!fields || typeof fields !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof k !== 'string' || !k.length) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  const json = JSON.stringify(out);
  if (json.length > MAX_FIELDS_BYTES) {
    throw new Error('airtable: fields payload too large');
  }
  return out;
}

// Factory: bind credentials + audit + fetch + clock.
//   deps.credentials   -> CredentialStore (services/settings/credentials)
//   deps.fetchFn       -> fetch-compatible (defaults to global fetch)
//   deps.audit         -> { append } from services/audit/audit-log
//   deps.now           -> () => epochMs (default Date.now)
function createAirtableService(deps) {
  deps = deps || {};
  const credentials = deps.credentials;
  if (!credentials || typeof credentials.get !== 'function') {
    throw new Error('airtable: deps.credentials with get() is required');
  }
  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  const audit   = deps.audit || null;

  async function _authHeaders() {
    const pat = await credentials.get('airtable');
    if (!pat) {
      const err = new Error('airtable: no credential configured');
      err.code = 'no_credential';
      throw err;
    }
    return { 'Authorization': 'Bearer ' + pat, 'Content-Type': 'application/json' };
  }

  function _audit(eventType, status, metadata) {
    if (!audit || typeof audit.append !== 'function') return;
    try {
      audit.append({
        type: eventType,
        provider: 'airtable',
        status: status,
        metadata: metadata || {}
      });
    } catch (_) { /* never crash on audit */ }
  }

  async function _request(method, path, body) {
    if (!fetchFn) {
      return { ok: false, error: 'no_fetch_available' };
    }
    let headers;
    try { headers = await _authHeaders(); }
    catch (e) { return { ok: false, error: e.code || 'no_credential' }; }
    let resp;
    try {
      resp = await fetchFn(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      return { ok: false, error: 'fetch_failed', detail: e.message };
    }
    let payload = null;
    try { payload = await resp.json(); } catch (_) { /* may be empty */ }
    if (!resp.ok) {
      // Strip Airtable error body of anything that looks like a key.
      const safeDetail = payload && payload.error
        ? { type: payload.error.type, message: String(payload.error.message || '').slice(0, 200) }
        : null;
      return { ok: false, error: 'http_' + resp.status, detail: safeDetail };
    }
    return { ok: true, status: resp.status, body: payload };
  }

  return Object.freeze({
    async listRecords(input) {
      input = input || {};
      _validateBase(input.baseId);
      const tableRef = _validateTable(input.tableRef);
      const qs = _buildQuery(input.query || {});
      const r = await _request('GET', `/${input.baseId}/${encodeURIComponent(tableRef)}${qs}`);
      _audit('AI_RESPONSE_RECEIVED', r.ok ? 'ok' : 'error',
        { op: 'list', baseId: input.baseId, tableRef, count: r.body && r.body.records ? r.body.records.length : 0,
          error: r.ok ? undefined : r.error });
      return r;
    },

    async createRecord(input) {
      input = input || {};
      _validateBase(input.baseId);
      const tableRef = _validateTable(input.tableRef);
      const fields = _sanitizeFields(input.fields);
      const r = await _request('POST', `/${input.baseId}/${encodeURIComponent(tableRef)}`,
        { records: [{ fields }], typecast: !!input.typecast });
      _audit('STORAGE_OPERATION_COMPLETED', r.ok ? 'ok' : 'error',
        { op: 'airtable.create', baseId: input.baseId, tableRef, fieldKeys: Object.keys(fields),
          error: r.ok ? undefined : r.error });
      return r;
    },

    async updateRecord(input) {
      input = input || {};
      _validateBase(input.baseId);
      const tableRef = _validateTable(input.tableRef);
      _validateRecord(input.recordId);
      const fields = _sanitizeFields(input.fields);
      const r = await _request('PATCH', `/${input.baseId}/${encodeURIComponent(tableRef)}/${input.recordId}`,
        { fields, typecast: !!input.typecast });
      _audit('STORAGE_OPERATION_COMPLETED', r.ok ? 'ok' : 'error',
        { op: 'airtable.update', baseId: input.baseId, tableRef, recordId: input.recordId,
          fieldKeys: Object.keys(fields), error: r.ok ? undefined : r.error });
      return r;
    },

    async deleteRecord(input) {
      input = input || {};
      _validateBase(input.baseId);
      const tableRef = _validateTable(input.tableRef);
      _validateRecord(input.recordId);
      const r = await _request('DELETE', `/${input.baseId}/${encodeURIComponent(tableRef)}/${input.recordId}`);
      _audit('STORAGE_OPERATION_COMPLETED', r.ok ? 'ok' : 'error',
        { op: 'airtable.delete', baseId: input.baseId, tableRef, recordId: input.recordId,
          error: r.ok ? undefined : r.error });
      return r;
    }
  });
}

module.exports = {
  createAirtableService,
  _internal: { BASE_ID_RE, TABLE_ID_RE, RECORD_ID_RE, ALLOWED_PARAMS }
};
