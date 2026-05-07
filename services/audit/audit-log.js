// services/audit/audit-log.js
// Bounded, append-only audit/governance log for the desktop app.
//
// Persists to electron-store under key `audit.events` so the host app
// can survive restarts. Never persists secrets, document content, or
// raw prompts. Caller-provided metadata is run through a denylist +
// pattern redactor + size cap before persisting.
//
// Renderer-facing API exposes only counts and last-event status — the
// raw event objects stay in the main process.

'use strict';
const crypto = require('crypto');

const MAX_EVENTS         = 500;            // ring buffer
const MAX_METADATA_BYTES = 4 * 1024;       // truncate metadata over 4 KB

const FORBIDDEN_KEYS = new Set([
  'apiKey', 'api_key', 'apikey',
  'authorization', 'token', 'bearer', 'secret',
  'password',
  'document', 'documentContent', 'fileContent', 'fileBody', 'body',
  'prompt', 'promptText', 'aiPrompt', 'rawText',
  'WATSONX_API_KEY', 'IBM_COS_SECRET_ACCESS_KEY', 'IBM_COS_ACCESS_KEY_ID'
]);

const TYPES = Object.freeze({
  AI_PROVIDER_SELECTED:           'AI_PROVIDER_SELECTED',
  AI_REQUEST_CREATED:             'AI_REQUEST_CREATED',
  AI_RESPONSE_RECEIVED:           'AI_RESPONSE_RECEIVED',
  AI_REQUEST_FAILED:              'AI_REQUEST_FAILED',
  STORAGE_OPERATION_STARTED:      'STORAGE_OPERATION_STARTED',
  STORAGE_OPERATION_COMPLETED:    'STORAGE_OPERATION_COMPLETED',
  STORAGE_OPERATION_FAILED:       'STORAGE_OPERATION_FAILED',
  CONTEXT_SET:                    'CONTEXT_SET',
  SENSITIVE_ACTION_DENIED:        'SENSITIVE_ACTION_DENIED',
  CONFIG_INSPECTED:               'CONFIG_INSPECTED'
});

// Pattern redactors for string values that look like secrets even if
// they appear under a non-denylisted key.
const STRING_PATTERNS = [
  { rx: /\bBearer\s+[A-Za-z0-9._\-]+/g,                replace: 'Bearer [REDACTED]' },
  { rx: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/g,      replace: '[REDACTED_STRIPE]' },
  { rx: /\bAKIA[0-9A-Z]{16}\b/g,                        replace: '[REDACTED_AWS_ACCESS_KEY]' },
  { rx: /"(api[_-]?key|secret|token|bearer)":\s*"[^"]+"/gi, replace: '"$1":"[REDACTED]"' },
  { rx: /([A-Za-z0-9+/]{40,}={0,2})/g,                  replace: (s) => s.length > 80 ? '[REDACTED_LONG_BASE64]' : s }
];

function redactString(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const p of STRING_PATTERNS) out = out.replace(p.rx, p.replace);
  return out;
}

function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  function walk(node) {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (FORBIDDEN_KEYS.has(k))                           continue;
        if (/secret|key|token|password|bearer/i.test(k))     { out[k] = '[REDACTED]'; continue; }
        if (typeof v === 'string')                           out[k] = redactString(v);
        else if (typeof v === 'object' && v !== null)        out[k] = walk(v);
        else                                                 out[k] = v;
      }
      return out;
    }
    if (typeof node === 'string') return redactString(node);
    return node;
  }
  let result;
  try { result = walk(meta); } catch { result = {}; }
  // Cap final size.
  const json = JSON.stringify(result);
  if (json && json.length > MAX_METADATA_BYTES) {
    return { _truncated: true, byteSize: json.length, cap: MAX_METADATA_BYTES };
  }
  return result;
}

function newEventId() {
  return 'evt_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Build an AuditLog bound to an electron-store-like persistence handle.
 * `store` must implement .get(key, default) and .set(key, value).
 * Pass `null` to use an in-memory buffer (test mode).
 */
function createAuditLog(store) {
  let memory = [];

  function load() {
    if (!store) return memory;
    return store.get('audit.events', []) || [];
  }
  function save(events) {
    if (!store) { memory = events; return; }
    store.set('audit.events', events);
  }

  function append(input) {
    if (!input || !TYPES[input.type]) {
      return { ok: false, error: 'invalid_event_type' };
    }
    const event = {
      eventId:       newEventId(),
      eventType:     input.type,
      tenantId:      input.tenantId      || null,
      workspaceId:   input.workspaceId   || null,
      userId:        input.userId        || null,
      role:          input.role          || null,
      provider:      input.provider      || null,
      modelId:       input.modelId       || null,
      requestId:     input.requestId     || null,
      resourceType:  input.resourceType  || null,
      resourceId:    input.resourceId    || null,
      status:        input.status        || 'ok',
      decisionStatus:input.decisionStatus|| null,
      classification:input.classification|| null,
      retentionTag:  input.retentionTag  || null,
      fileHash:      input.fileHash      || null,
      metadata:      sanitizeMetadata(input.metadata),
      timestamp:     new Date().toISOString()
    };
    const events = load();
    events.push(event);
    while (events.length > MAX_EVENTS) events.shift();
    save(events);
    return { ok: true, event };
  }

  return {
    TYPES,
    append,
    list:    () => load().slice(),
    count:   () => load().length,
    last:    () => { const e = load(); return e.length ? e[e.length - 1] : null; },
    summary: () => {
      const evs = load();
      return {
        count: evs.length,
        cap:   MAX_EVENTS,
        last:  evs.length ? { eventType: evs[evs.length - 1].eventType, status: evs[evs.length - 1].status, timestamp: evs[evs.length - 1].timestamp } : null
      };
    },
    clear:   () => save([])
  };
}

module.exports = { createAuditLog, TYPES, sanitizeMetadata, redactString, MAX_EVENTS, MAX_METADATA_BYTES };
