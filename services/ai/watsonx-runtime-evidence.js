// services/ai/watsonx-runtime-evidence.js
//
// Phase 18A — IBM watsonx runtime evidence: stable state machine,
// presence-only env reporting, redaction, and renderer-/log-safe
// formatters for the live runtime probe.
//
// This module is the honest-state layer that converts a runtime probe
// result into one of two terminal outcomes:
//   • verified_ready        — a real watsonx runtime request succeeded
//   • blocked_by_ibm_config — code is correct, IBM-side config invalid
// (plus the "not configured" outcomes when env is absent/incomplete).
//
// HARD RULES enforced here:
//   - Presence-only env reporting. Never returns a raw API key, bearer
//     token, JWT, project id, space id, deployment id, or generated
//     text that could contain secrets.
//   - Project / space / deployment identifier VALUES are masked.
//     Model catalog ids (ibm/granite-*) are public and survive.
//   - Pure functions. NO network calls are made from this module; the
//     probe CLI performs the outbound calls and hands results here.
//   - Every text payload that leaves this module passes through
//     redactWatsonxEvidence() as a belt-and-braces guard.

'use strict';

const { redactString } = require('../audit/audit-log');

// ── stable runtime states ───────────────────────────────────────────
// The first four are the canonical "headline" outcomes the rest of the
// app keys off of (troubleshooting / release evidence); the middle ones
// are the precise diagnostic classifications a blocked probe resolves to.
const STATE = Object.freeze({
  NOT_CONFIGURED:                  'not_configured',
  CONFIGURED_MISSING_REQUIRED_ENV: 'configured_missing_required_env',
  IAM_TOKEN_FAILED:                'iam_token_failed',
  PROJECT_OR_SPACE_INVALID:        'project_or_space_invalid',
  MODEL_OR_DEPLOYMENT_INVALID:     'model_or_deployment_invalid',
  RUNTIME_REQUEST_FAILED:          'runtime_request_failed',
  RUNTIME_REQUEST_SUCCEEDED:       'runtime_request_succeeded',
  BLOCKED_BY_IBM_CONFIG:           'blocked_by_ibm_config',
  VERIFIED_READY:                  'verified_ready'
});

// Env var names recognized (by NAME only — values are never read here).
const API_KEY_ENV    = Object.freeze(['WATSONX_API_KEY', 'IBM_CLOUD_API_KEY']);
const BINDING_ENV    = Object.freeze(['WATSONX_PROJECT_ID', 'WATSONX_SPACE_ID']);
const URL_ENV        = Object.freeze(['WATSONX_URL', 'WATSONX_REGION']);
const MODEL_ENV      = Object.freeze(['WATSONX_MODEL_ID', 'WATSONX_DEPLOYMENT_ID']);
const ALL_WATSONX_ENV = Object.freeze([...API_KEY_ENV, ...BINDING_ENV, ...URL_ENV, ...MODEL_ENV]);

function _str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
function _has(env, name) { return !!(env && env[name] && _str(env[name]).trim().length > 0); }

// ── presence-only env status ────────────────────────────────────────
// Required rule (documented): a real runtime request requires an API
// key AND a project-or-space binding. WATSONX_URL and the model id both
// have safe defaults (us-south + ibm/granite-13b-chat-v2), so they are
// reported but not treated as "missing required". project_id and
// space_id are mutually exclusive — only one is needed.
function getWatsonxEnvStatus(envIn) {
  const env = envIn || process.env || {};
  const present = {};
  for (const n of ALL_WATSONX_ENV) present[n] = _has(env, n);

  const apiKeySource = API_KEY_ENV.find(n => present[n]) || null;
  const bindingSource = BINDING_ENV.find(n => present[n]) || null;
  const urlSource = URL_ENV.find(n => present[n]) || null;
  const modelSource = MODEL_ENV.find(n => present[n]) || null;

  const hasApiKey = !!apiKeySource;
  const hasBinding = !!bindingSource;

  const missingRequired = [];
  if (!hasApiKey)  missingRequired.push('WATSONX_API_KEY (or IBM_CLOUD_API_KEY)');
  if (!hasBinding) missingRequired.push('WATSONX_PROJECT_ID (or WATSONX_SPACE_ID)');

  const anyConfigured = ALL_WATSONX_ENV.some(n => present[n]);

  return Object.freeze({
    present,                       // booleans only — never values
    apiKeySource,
    bindingSource,
    urlSource,                     // null → default us-south will be used
    modelSource,                   // null → default ibm/granite-* will be used
    hasApiKey,
    hasBinding,
    hasUrl: !!urlSource,
    hasModelOrDeployment: !!modelSource,
    anyConfigured,
    missingRequired,
    configured: missingRequired.length === 0,
    note: 'Presence-only — no IBM/watsonx credential values are read or returned by this module.'
  });
}

// ── redaction ───────────────────────────────────────────────────────
// Order matters; most specific first. Masks anything secret- or
// identifier-shaped. UUID/GUID values cover project/space/deployment
// ids. Public model catalog ids (ibm/granite-...) are intentionally
// NOT matched and survive.
const REDACTION_PATTERNS = [
  { rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, repl: '[REDACTED_PEM_PRIVATE_KEY]' },
  { rx: /\b(WATSONX_API_KEY|IBM_CLOUD_API_KEY|WATSONX_PROJECT_ID|WATSONX_SPACE_ID|WATSONX_DEPLOYMENT_ID)\s*=\s*\S+/g, repl: '$1=[REDACTED]' },
  { rx: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]+/gi, repl: 'Authorization: Bearer [REDACTED]' },
  { rx: /\bBearer\s+[A-Za-z0-9._\-]+/g, repl: 'Bearer [REDACTED]' },
  { rx: /['"]?x-api-key['"]?\s*[:=]\s*['"]?[^'"\s,}]+/gi, repl: 'x-api-key:[REDACTED]' },
  { rx: /"(api[_-]?key|apikey|access_token|refresh_token|bearer|secret|token)"\s*:\s*"[^"]+"/gi, repl: '"$1":"[REDACTED]"' },
  { rx: /\b(project_id|space_id|deployment_id)\s*[:=]\s*["']?[A-Za-z0-9-]{8,}["']?/gi, repl: '$1:[REDACTED]' },
  { rx: /\bey[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{4,}\b/g, repl: '[REDACTED_JWT]' },
  // UUID/GUID (project / space / deployment ids).
  { rx: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, repl: '[REDACTED_ID]' },
  { rx: /\bsk-ant-[A-Za-z0-9_\-]{8,}\b/g, repl: '[REDACTED_ANTHROPIC_KEY]' },
  { rx: /\bsk-[A-Za-z0-9_\-]{16,}\b/g, repl: '[REDACTED_OPENAI_KEY]' },
  { rx: /\bAKIA[0-9A-Z]{16}\b/g, repl: '[REDACTED_AWS_ACCESS_KEY]' },
  { rx: /\b[A-Fa-f0-9]{32,}\b/g, repl: '[REDACTED_LONG_HEX]' },
  { rx: /\b[A-Za-z0-9+/]{60,}={0,2}\b/g, repl: '[REDACTED_LONG_BASE64]' }
];

// Redact a string or (deeply) an object. Returns the same shape, with
// all secret-/identifier-shaped material masked. Also runs the shared
// audit redactor as a second pass over strings.
function redactWatsonxEvidence(input) {
  if (typeof input === 'string') {
    let out = input;
    for (const p of REDACTION_PATTERNS) out = out.replace(p.rx, p.repl);
    return redactString(out);
  }
  if (Array.isArray(input)) return input.map(redactWatsonxEvidence);
  if (input && typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      // Drop any obviously-secret keys entirely rather than risk echoing.
      if (/^(apiKey|api_key|apikey|bearer|token|secret|password|generated_text|generatedText|prompt)$/i.test(k)) {
        out[k] = '[REDACTED]';
        continue;
      }
      out[k] = redactWatsonxEvidence(v);
    }
    return out;
  }
  return input;
}

// ── classification ──────────────────────────────────────────────────
// Map a probe result into the most specific applicable state.
//
// result shape (all optional):
//   {
//     env:     <getWatsonxEnvStatus()>,
//     attempted: { iam: bool, runtime: bool },
//     iam:     { ok: bool, status: number|null } | null,
//     runtime: { ok: bool, status: number|null, error: string|null, detail: string } | null
//   }
function classifyWatsonxRuntimeEvidence(result) {
  const r = result || {};
  const env = r.env || getWatsonxEnvStatus(r.envSource || {});

  // No watsonx env at all → not configured.
  if (!env.anyConfigured) return STATE.NOT_CONFIGURED;
  // Some env, but required pieces missing → can't even attempt a call.
  if (!env.configured) return STATE.CONFIGURED_MISSING_REQUIRED_ENV;

  // IAM token exchange outcome.
  if (r.iam && r.iam.ok === false) return STATE.IAM_TOKEN_FAILED;

  // Runtime request outcome.
  if (r.runtime) {
    if (r.runtime.ok === true) return STATE.RUNTIME_REQUEST_SUCCEEDED;
    if (r.runtime.ok === false) {
      const status = Number(r.runtime.status) || null;
      const blob = (_str(r.runtime.error) + ' ' + _str(r.runtime.detail)).toLowerCase();
      if (/project_id|space_id|no_associated_service_instance|not associated|project or space/.test(blob)) {
        return STATE.PROJECT_OR_SPACE_INVALID;
      }
      if (/model|deployment|model_not_supported|model_not_available|model_no_access/.test(blob)) {
        return STATE.MODEL_OR_DEPLOYMENT_INVALID;
      }
      if (status === 404) return STATE.MODEL_OR_DEPLOYMENT_INVALID;
      if (status === 403) return STATE.PROJECT_OR_SPACE_INVALID;
      return STATE.RUNTIME_REQUEST_FAILED;
    }
  }

  // Env present + configured but no call attempted yet (e.g. pure helper
  // invocation without a probe) → treat as still missing live evidence.
  return STATE.CONFIGURED_MISSING_REQUIRED_ENV;
}

// Roll a precise diagnostic state up to one of the four headline
// outcomes used elsewhere in the app.
function rollupWatsonxRuntimeOutcome(state) {
  switch (state) {
    case STATE.RUNTIME_REQUEST_SUCCEEDED:
    case STATE.VERIFIED_READY:
      return STATE.VERIFIED_READY;
    case STATE.NOT_CONFIGURED:
      return STATE.NOT_CONFIGURED;
    case STATE.CONFIGURED_MISSING_REQUIRED_ENV:
      return STATE.CONFIGURED_MISSING_REQUIRED_ENV;
    case STATE.IAM_TOKEN_FAILED:
    case STATE.PROJECT_OR_SPACE_INVALID:
    case STATE.MODEL_OR_DEPLOYMENT_INVALID:
    case STATE.RUNTIME_REQUEST_FAILED:
    case STATE.BLOCKED_BY_IBM_CONFIG:
      return STATE.BLOCKED_BY_IBM_CONFIG;
    default:
      return STATE.NOT_CONFIGURED;
  }
}

function isVerifiedReady(stateOrEvidence) {
  if (!stateOrEvidence) return false;
  if (typeof stateOrEvidence === 'string') return stateOrEvidence === STATE.VERIFIED_READY;
  return stateOrEvidence.outcome === STATE.VERIFIED_READY || stateOrEvidence.verifiedReady === true;
}

// Operator remediation per outcome. Free-text — passes through the
// redactor in the formatters.
function getWatsonxRuntimeRemediation(state) {
  switch (rollupWatsonxRuntimeOutcome(state)) {
    case STATE.VERIFIED_READY:
      return ['A real watsonx runtime request succeeded. watsonx may be described as verified for this environment.'];
    case STATE.NOT_CONFIGURED:
      return [
        'No IBM watsonx environment is configured. This is expected for BYOK / standard-tier deployments.',
        'To enable SourceDeck-managed watsonx, set WATSONX_API_KEY (or IBM_CLOUD_API_KEY) and WATSONX_PROJECT_ID (or WATSONX_SPACE_ID) in the main-process environment, then run `npm run watsonx:runtime-probe:evidence`.'
      ];
    case STATE.CONFIGURED_MISSING_REQUIRED_ENV:
      return [
        'Some watsonx env is present but a required value is missing.',
        'Set the names listed under env.missingRequired in the main-process environment (never in renderer / localStorage).',
        'Then re-run `npm run watsonx:runtime-probe:evidence`.'
      ];
    case STATE.BLOCKED_BY_IBM_CONFIG:
      // Specific next steps depend on the precise state.
      switch (state) {
        case STATE.IAM_TOKEN_FAILED:
          return [
            'BLOCKED_BY_IBM_CONFIG (iam_token_failed): IBM IAM rejected the API key.',
            'Confirm WATSONX_API_KEY / IBM_CLOUD_API_KEY is current and not revoked in IBM Cloud → Manage → Access (IAM) → API keys.',
            'Confirm the identity has access to the watsonx.ai (Watson Machine Learning) service instance.'
          ];
        case STATE.PROJECT_OR_SPACE_INVALID:
          return [
            'BLOCKED_BY_IBM_CONFIG (project_or_space_invalid): IBM rejected the project/space binding.',
            'Confirm WATSONX_PROJECT_ID (or WATSONX_SPACE_ID) is associated with a Watson Machine Learning service instance.',
            'Confirm the project/space and the API key belong to the SAME IBM Cloud account.',
            'Confirm WATSONX_URL (or WATSONX_REGION) matches the region of the WML instance.'
          ];
        case STATE.MODEL_OR_DEPLOYMENT_INVALID:
          return [
            'BLOCKED_BY_IBM_CONFIG (model_or_deployment_invalid): IBM rejected the model or deployment.',
            'Confirm WATSONX_MODEL_ID is enabled in your region/plan, or set a valid WATSONX_DEPLOYMENT_ID.',
            'Confirm your IAM role on the project includes watsonx.ai inference access.'
          ];
        case STATE.RUNTIME_REQUEST_FAILED:
        default:
          return [
            'BLOCKED_BY_IBM_CONFIG (runtime_request_failed): the runtime request did not succeed.',
            'Inspect the redacted detail field and the IBM Cloud status page; re-run `npm run watsonx:runtime-probe:evidence`.',
            'Verify outbound connectivity to iam.cloud.ibm.com and *.ml.cloud.ibm.com.'
          ];
      }
    default:
      return ['Unable to classify watsonx runtime evidence; inspect the redacted evidence report.'];
  }
}

// Build the canonical, renderer-/log-safe evidence object from a probe
// result. Always presence-only; identifier values are masked.
function buildWatsonxRuntimeEvidence(result, options) {
  const r = result || {};
  const opts = options || {};
  const env = r.env || getWatsonxEnvStatus(r.envSource || {});
  const state = classifyWatsonxRuntimeEvidence({ ...r, env });
  const outcome = rollupWatsonxRuntimeOutcome(state);

  const evidence = {
    module: 'watsonx-runtime-evidence',
    schema: 'phase-18a',
    generatedAt: opts.generatedAt || new Date().toISOString(),
    env,
    attempted: {
      iam: !!(r.attempted && r.attempted.iam),
      runtime: !!(r.attempted && r.attempted.runtime)
    },
    iam: r.iam ? { ok: r.iam.ok === true, status: r.iam.status ?? null } : null,
    runtime: r.runtime ? {
      ok: r.runtime.ok === true,
      status: r.runtime.status ?? null,
      error: r.runtime.error ? _str(r.runtime.error) : null,
      detail: r.runtime.detail ? _str(r.runtime.detail) : null,
      // Presence-only metadata about the response — never the text.
      responseTextPresent: r.runtime.responseTextPresent === true
    } : null,
    state,
    outcome,
    verifiedReady: outcome === STATE.VERIFIED_READY,
    blockedReason: outcome === STATE.BLOCKED_BY_IBM_CONFIG ? state : null,
    remediation: getWatsonxRuntimeRemediation(state),
    note: 'Presence-only. No IBM/watsonx API keys, bearer tokens, project/space/deployment ids, or generated text are stored. watsonx is not "live" unless outcome is verified_ready.'
  };

  // Deep-redact the whole object as a belt-and-braces guard.
  return Object.freeze(redactWatsonxEvidence(evidence));
}

// ── formatters ──────────────────────────────────────────────────────
function formatWatsonxRuntimeEvidenceJson(evidence) {
  return redactWatsonxEvidence(JSON.stringify(evidence, null, 2));
}

function formatWatsonxRuntimeEvidenceMarkdown(evidence) {
  const e = evidence || {};
  const env = e.env || {};
  const lines = [];
  lines.push('# IBM watsonx Runtime Evidence — SourceDeck');
  lines.push('');
  lines.push('- Generated:     ' + (e.generatedAt || ''));
  lines.push('- Module:        ' + (e.module || 'watsonx-runtime-evidence'));
  lines.push('- State:         `' + (e.state || 'unknown') + '`');
  lines.push('- Outcome:       **' + (e.outcome || 'unknown') + '**');
  lines.push('- verified_ready: ' + (e.verifiedReady === true ? 'yes' : 'no'));
  if (e.blockedReason) lines.push('- blocked reason: `' + e.blockedReason + '`');
  lines.push('');
  lines.push('## Environment (presence-only)');
  lines.push('- configured:           ' + (env.configured ? 'yes' : 'no'));
  lines.push('- api key present:      ' + (env.hasApiKey ? 'yes (' + (env.apiKeySource || '') + ')' : 'no'));
  lines.push('- project/space binding: ' + (env.hasBinding ? 'yes (' + (env.bindingSource || '') + ')' : 'no'));
  lines.push('- url source:           ' + (env.urlSource || 'default (us-south)'));
  lines.push('- model/deployment:     ' + (env.modelSource || 'default (ibm/granite-13b-chat-v2)'));
  if (env.missingRequired && env.missingRequired.length) {
    lines.push('- missing required:     ' + env.missingRequired.join(', '));
  }
  lines.push('');
  lines.push('## Runtime attempt');
  lines.push('- IAM attempted:     ' + ((e.attempted && e.attempted.iam) ? 'yes' : 'no'));
  if (e.iam) lines.push('- IAM token ok:      ' + (e.iam.ok ? 'yes' : 'no') + (e.iam.status != null ? ' (status ' + e.iam.status + ')' : ''));
  lines.push('- runtime attempted: ' + ((e.attempted && e.attempted.runtime) ? 'yes' : 'no'));
  if (e.runtime) {
    lines.push('- runtime ok:        ' + (e.runtime.ok ? 'yes' : 'no') + (e.runtime.status != null ? ' (status ' + e.runtime.status + ')' : ''));
    if (e.runtime.error) lines.push('- runtime error:     ' + e.runtime.error);
    if (e.runtime.detail) lines.push('- runtime detail:    ' + e.runtime.detail);
  }
  lines.push('');
  lines.push('## Remediation');
  for (const step of (e.remediation || [])) lines.push('- ' + step);
  lines.push('');
  lines.push('---');
  lines.push(e.note || '');
  return redactWatsonxEvidence(lines.join('\n'));
}

module.exports = {
  STATE,
  API_KEY_ENV,
  BINDING_ENV,
  URL_ENV,
  MODEL_ENV,
  ALL_WATSONX_ENV,
  getWatsonxEnvStatus,
  redactWatsonxEvidence,
  classifyWatsonxRuntimeEvidence,
  rollupWatsonxRuntimeOutcome,
  isVerifiedReady,
  getWatsonxRuntimeRemediation,
  buildWatsonxRuntimeEvidence,
  formatWatsonxRuntimeEvidenceJson,
  formatWatsonxRuntimeEvidenceMarkdown
};
