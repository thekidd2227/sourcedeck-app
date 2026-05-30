// services/ai/watsonx-readiness.js
//
// Deterministic IBM watsonx runtime-context readiness diagnostics.
//
// Repairs OPEN-002 in the troubleshooting KB. The module classifies the
// most common runtime/permission/context failures into a small, stable
// set of statuses; redacts any secret-shaped material from IBM error
// bodies before exposing them; and produces a renderer-safe readiness
// report and remediation steps.
//
// HARD RULES enforced here:
//   - This module NEVER receives, returns, or logs a watsonx API key,
//     bearer token, account id, project/space id value, or IBM trace id
//     in a form that would expose secrets. Presence flags only.
//   - The renderer-safe report contains: provider name, configured
//     boolean, missing[] config-field names (not values), classified
//     status, redacted error detail string, and remediation steps.
//   - This file makes NO network calls. The classifier takes errors
//     that the provider has already produced; the provider lives in
//     services/ai/providers/watsonx.js.

'use strict';

const { redactString } = require('../audit/audit-log');

// ── classification statuses ─────────────────────────────────────────
const STATUS = Object.freeze({
  READY:                  'ready',
  PROVIDER_DISABLED:      'provider_disabled',
  MISSING_CREDENTIALS:    'missing_credentials',
  MISSING_PROJECT_ID:     'missing_project_id',
  MISSING_REGION_OR_URL:  'missing_region_or_url',
  UNAUTHORIZED_401:       'unauthorized_401',
  FORBIDDEN_403:          'forbidden_403',
  NETWORK_ERROR:          'network_error',
  UNKNOWN_ERROR:          'unknown_error'
});

// Strict allow-list of safe IBM error codes / fragments. These survive
// the redactor unchanged when they appear in the error body and help the
// operator diagnose the real cause.
const SAFE_IBM_FRAGMENTS = [
  'no_associated_service_instance_error',
  'authentication_failure',
  'authorization_rejected',
  'invalid_token',
  'iam_token_expired',
  'project_id is not associated with a WML instance',
  'space_id is not associated with a WML instance',
  'model_not_supported',
  'model_not_available',
  'region_mismatch'
];

// ── helpers ─────────────────────────────────────────────────────────

function _str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }

// Validate the watsonx config from a status snapshot (e.g. produced by
// services/config.js watsonxStatus). Pure: no I/O.
function validateWatsonxConfig(config, credentialStatus) {
  const cfg = config || {};
  const cred = credentialStatus || {};
  const missing = [];

  // Credential — accept either env-sourced apiKey presence flag (the
  // config snapshot already redacts the value to a boolean via the
  // `missing` field) or the safeStorage credentials.status() presence.
  const credPresent = !!(cred.present && cred.present.watsonx) || (cfg.apiKeyPresent === true);
  if (!credPresent && (cfg.missing || []).some(m => /WATSONX_API_KEY/i.test(m))) {
    missing.push('WATSONX_API_KEY');
  } else if (!credPresent) {
    // Fall through: trust the missing[] list if present, else require explicit creds.
    if ((cfg.missing || []).some(m => /WATSONX_API_KEY/i.test(m))) missing.push('WATSONX_API_KEY');
  }
  if ((cfg.missing || []).some(m => /WATSONX_PROJECT_ID/i.test(m))) missing.push('WATSONX_PROJECT_ID');
  if ((cfg.missing || []).some(m => /WATSONX_URL/i.test(m)))        missing.push('WATSONX_URL');
  if ((cfg.missing || []).some(m => /WATSONX_MODEL_ID/i.test(m)))   missing.push('WATSONX_MODEL_ID');

  // De-duplicate; do not echo any values.
  const out = Array.from(new Set(missing));
  return { ok: out.length === 0, missing: out };
}

// Classify a watsonx error (or status snapshot) into a deterministic
// status code. The classifier never accesses live IBM; the caller has
// already produced `error` from a request, `status` from the response,
// or `null` if no call was attempted yet.
function classifyWatsonxError(input) {
  const e = input || {};
  // Provider disabled (AI_PROVIDER != watsonx)
  if (e.providerDisabled === true || e.target === 'disabled') return STATUS.PROVIDER_DISABLED;
  // Missing-config short-circuits
  if (Array.isArray(e.missing) && e.missing.length) {
    if (e.missing.some(m => /API_KEY/i.test(m))) return STATUS.MISSING_CREDENTIALS;
    if (e.missing.some(m => /PROJECT_ID|SPACE_ID/i.test(m))) return STATUS.MISSING_PROJECT_ID;
    if (e.missing.some(m => /URL/i.test(m))) return STATUS.MISSING_REGION_OR_URL;
    return STATUS.MISSING_CREDENTIALS;
  }
  // HTTP statuses
  const code = Number(e.status || (typeof e.error === 'string' && (e.error.match(/_(\d{3})$/) || [])[1])) || null;
  if (code === 401) return STATUS.UNAUTHORIZED_401;
  if (code === 403) return STATUS.FORBIDDEN_403;
  // Named error codes from the provider
  const named = _str(e.error || e.code).toLowerCase();
  if (named === 'iam_auth_failed') return STATUS.UNAUTHORIZED_401;
  if (named === 'network_error' || /fetch|enotfound|econnreset|timeout/i.test(named)) return STATUS.NETWORK_ERROR;
  if (named === 'watsonx_not_configured') return STATUS.MISSING_CREDENTIALS;
  if (!named && !code && e.configured === true) return STATUS.READY;
  if (!named && !code) return STATUS.UNKNOWN_ERROR;
  return STATUS.UNKNOWN_ERROR;
}

// Redact an error payload before exposing to the renderer. Keeps a small
// allow-list of useful IBM diagnostic fragments visible; everything else
// is run through the audit redactor (which strips bearer tokens, sk-/rk-
// keys, long base64 blobs, etc.). Project/space id VALUES are masked.
function redactWatsonxError(error) {
  const e = error || {};
  const status = (typeof e.status === 'number') ? e.status : null;
  const named  = _str(e.error || e.code) || null;
  let detail   = _str(e.detail || e.message || '');

  if (detail) {
    // Mask project_id / space_id values (keep the label so the operator
    // knows IBM mentioned a binding mismatch).
    detail = detail
      .replace(/project_id\s+[A-Za-z0-9-]{8,}/g, 'project_id <redacted>')
      .replace(/space_id\s+[A-Za-z0-9-]{8,}/g,   'space_id <redacted>')
      // Mask trace ids (32-char hex).
      .replace(/"trace"\s*:\s*"[0-9a-f]{16,}"/gi, '"trace":"<redacted>"');
    // Run through audit-log redactor for any remaining secret-shaped strings.
    detail = redactString(detail);
    // Belt-and-braces: scrub provider-key shapes the audit redactor does
    // NOT catch (sk-/sk-ant-/long opaque tokens / JWT-style payload).
    detail = detail
      .replace(/\bsk-ant-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g,    '[REDACTED_OPENAI_KEY]')
      .replace(/\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g, '[REDACTED_JWT]')
      .replace(/\b[A-Fa-f0-9]{32,}\b/g,         '[REDACTED_LONG_HEX]');
    // Preserve allow-list fragments verbatim (already in detail) — they
    // contain no secrets.
  }
  return { status, code: named, detail };
}

function getWatsonxRemediationSteps(report) {
  const r = report || {};
  switch (r.status) {
    case STATUS.READY:
      return ['watsonx readiness check passed. No action required.'];
    case STATUS.PROVIDER_DISABLED:
      return ['watsonx is not the active AI provider. Set AI_PROVIDER=watsonx to enable it.'];
    case STATUS.MISSING_CREDENTIALS:
      return [
        'Set WATSONX_API_KEY in the main-process environment (never in renderer / localStorage).',
        'Restart the app so the new value is loaded.'
      ];
    case STATUS.MISSING_PROJECT_ID:
      return [
        'Set WATSONX_PROJECT_ID (or WATSONX_SPACE_ID) in the main-process environment.',
        'Confirm the project/space belongs to the same IBM Cloud account as your API key.'
      ];
    case STATUS.MISSING_REGION_OR_URL:
      return [
        'Set WATSONX_URL to the region-specific service URL (e.g. https://us-south.ml.cloud.ibm.com).',
        'Confirm the region contains your watsonx.ai (WML) service instance and project.'
      ];
    case STATUS.UNAUTHORIZED_401:
      return [
        'IAM returned unauthorized. Verify the WATSONX_API_KEY is current and not revoked.',
        'Confirm the IAM identity has access to the watsonx.ai (WML) service.'
      ];
    case STATUS.FORBIDDEN_403:
      return [
        'IBM returned a permission/context error. Check IBM account, project ID, region, model access, and IAM permissions.',
        'Common cause: the configured project/space ID is not associated with a WML instance in your selected region (no_associated_service_instance_error).',
        'Verify the API key belongs to the same IBM Cloud account as the project.',
        'Confirm WATSONX_URL matches the region of your WML instance.',
        'Confirm WATSONX_MODEL_ID is enabled in your region/plan.',
        'Confirm your IAM role on the project includes watsonx.ai access.'
      ];
    case STATUS.NETWORK_ERROR:
      return [
        'A network error occurred reaching IBM. Retry after checking outbound connectivity to *.cloud.ibm.com.',
        'If the failure persists, verify the WATSONX_URL host resolves and is reachable.'
      ];
    case STATUS.UNKNOWN_ERROR:
    default:
      return [
        'watsonx failed with an unclassified error.',
        'Inspect the redacted detail field and IBM status page; re-run the readiness check.'
      ];
  }
}

// Build a renderer-safe readiness report. Inputs:
//   config           — { configured, missing[], url, modelId, target, projectId('set'|null), spaceId('set'|null), apiKeyPresent? }
//   credentialStatus — { present: { watsonx: boolean, ... } }  (optional; from credentials.status())
//   lastError        — { status?, error?, code?, detail?, providerDisabled? } (optional)
// Output:
//   { provider:'watsonx', configured, missing[], status, ready, fieldPresence, error?, remediation[], note }
function buildWatsonxReadinessReport(config, credentialStatus, lastError) {
  const cfg = config || {};
  const cred = credentialStatus || {};
  const validation = validateWatsonxConfig(cfg, cred);

  const fieldPresence = {
    apiKey:    !!(cred.present && cred.present.watsonx) || cfg.apiKeyPresent === true || !(validation.missing.includes('WATSONX_API_KEY')),
    projectId: cfg.projectId === 'set' || !!cfg.projectIdPresent,
    spaceId:   cfg.spaceId === 'set' || !!cfg.spaceIdPresent,
    url:       !!cfg.url,
    modelId:   !!cfg.modelId
  };

  let status;
  if (cfg.target && cfg.target !== 'watsonx' && cfg.providerDisabled !== false) {
    // If the global provider isn't watsonx, surface that as "disabled"
    // rather than misclassifying as missing creds.
    status = (cfg.target === 'watsonx') ? null : STATUS.PROVIDER_DISABLED;
  }
  if (!status) {
    if (!validation.ok) {
      status = classifyWatsonxError({ missing: validation.missing });
    } else if (lastError) {
      status = classifyWatsonxError(lastError);
    } else {
      status = STATUS.READY;
    }
  }

  const error = lastError ? redactWatsonxError(lastError) : null;
  const ready = status === STATUS.READY;

  return Object.freeze({
    provider: 'watsonx',
    configured: validation.ok,
    missing: validation.missing,
    fieldPresence,
    status,
    ready,
    error,
    remediation: getWatsonxRemediationSteps({ status }),
    note: 'watsonx credentials are stored securely and are not exposed back to the interface.'
  });
}

module.exports = {
  STATUS,
  SAFE_IBM_FRAGMENTS,
  validateWatsonxConfig,
  classifyWatsonxError,
  redactWatsonxError,
  buildWatsonxReadinessReport,
  getWatsonxRemediationSteps
};
