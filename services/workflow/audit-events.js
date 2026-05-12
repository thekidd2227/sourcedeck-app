'use strict';

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|credential|password|authorization|bearer)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
const BEARER_PATTERN = /bearer\s+[a-z0-9._~+\/-]+=*/gi;

function createAuditEvent(input) {
  const src = _asObject(input);
  return _stripUndefined({
    eventId: _string(src.eventId || _id('audit')),
    tenantId: _string(src.tenantId),
    actor: _string(src.actor || 'system'),
    action: _string(src.action || 'workflow.event'),
    objectRef: _string(src.objectRef),
    metadataRedacted: redactMetadata(src.metadata || src.metadataRedacted || {}),
    createdAt: _iso(src.createdAt)
  });
}

function redactMetadata(value) {
  if (Array.isArray(value)) return value.map(redactMetadata);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = '[redacted]';
      } else {
        out[key] = redactMetadata(nested);
      }
    }
    return out;
  }
  if (typeof value === 'string') return _redactString(value);
  return value;
}

function _redactString(value) {
  return value
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(EMAIL_PATTERN, '[email-redacted]')
    .replace(PHONE_PATTERN, '[phone-redacted]');
}

function _id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _iso(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function _asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function _string(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function _stripUndefined(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'undefined') continue;
    if (typeof value === 'string' && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

module.exports = {
  createAuditEvent,
  redactMetadata,
  _internal: { EMAIL_PATTERN, PHONE_PATTERN, BEARER_PATTERN, SENSITIVE_KEY_PATTERN }
};
