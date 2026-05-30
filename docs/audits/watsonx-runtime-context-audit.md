# watsonx Runtime Context — Pre-Repair Audit (OPEN-002)

Read-only audit of the current IBM watsonx integration in this repo
before adding the safe readiness diagnostics in Phase 15B.

## Current watsonx credential / config fields

| Field | Source | Where consumed |
|-------|--------|----------------|
| `WATSONX_API_KEY` | env (`services/config.js:14`) | IAM token exchange in `services/ai/providers/watsonx.js:15-39` |
| `WATSONX_URL` | env (default `https://us-south.ml.cloud.ibm.com`) | base URL for `/ml/v1/text/generation` |
| `WATSONX_PROJECT_ID` | env | sent as `project_id` in request body |
| `WATSONX_SPACE_ID` | env (alternative to project) | sent as `space_id` |
| `WATSONX_MODEL_ID` | env (default `ibm/granite-13b-chat-v2`) | request model id |
| `watsonx` service in `services/settings/credentials.js` | `KNOWN_SERVICES` list (present) | currently **not** read by the provider — provider reads ENV |

Credential boundary: `services/settings/credentials.js` already lists
`watsonx` as a known service for presence-only tracking; the provider
itself, however, currently reads the key from `process.env`. That is
still main-process-only — the renderer never sees the key.

## Where watsonx status / readiness is checked today

- `services/config.js:38 watsonxStatus(cfg)` — returns presence-only
  flags + a `missing[]` list for the four env vars. Exposes
  `projectId: 'set'|null` and `spaceId: 'set'|null` (never the value).
- `services/ai/provider-factory.js getAiProviderStatus()` — wraps the
  above and is the renderer-safe surface.
- `main.js:203 ipcMain.handle('ai-provider-status', …)` — IPC channel.
- `preload.js:12 sd.aiProviderStatus()` — renderer call.
- `sourcedeck.html:1635-1669` — settings panel calls
  `sd.aiProviderStatus()` and renders provider + model id; **no
  watsonx-specific remediation copy**.

## Is HTTP 403 reproducible today?

Yes — the `services/ai/providers/watsonx.js:111-128` HTTP-error branch
returns `{ ok:false, error:'watsonx_http_403', status:403, detail:redactString(bodyText) }`,
and `test/ibm-readiness.test.js:438-452` captures the **exact live 403**
that motivates OPEN-002:

```
{"errors":[{"code":"no_associated_service_instance_error",
 "message":"project_id 6b51cbcb-3dd7-4316-9bec-6a555c8f19cd is not
  associated with a WML instance",
 "more_info":"https://cloud.ibm.com/apidocs/watsonx-ai#text-generation"}],
 "trace":"1413b61981839b7112f55615f6c64513","status_code":403}
```

There is **no semantic classifier** that maps this to a normalized
runtime-context status; downstream callers see only `watsonx_http_403`
with a redacted body and no remediation guidance.

## Likely root causes for 403 (from IBM's body + community knowledge)

1. **`no_associated_service_instance_error`** — the configured
   `project_id` (or `space_id`) belongs to a different IBM Cloud account
   than the API key, or is not bound to a watsonx.ai (WML) service
   instance.
2. API key lacks **watsonx.ai role** (no IAM role on the WML instance).
3. **Region/URL mismatch** — `WATSONX_URL` region does not contain the
   project/space.
4. Model not enabled / not available in selected region.
5. IAM role missing or revoked on the project.
6. Stale IAM token after account/permission changes (handled by the
   60-second pre-expiry refresh, but a new 403 still surfaces on the
   next request).

## Required env / config (no secrets in this doc)

- `WATSONX_API_KEY` — main-process only (env or future safeStorage).
- `WATSONX_PROJECT_ID` *or* `WATSONX_SPACE_ID` — must belong to the same
  IBM Cloud account as the API key and the regional WML instance.
- `WATSONX_URL` — region-specific base URL (e.g. `us-south`, `eu-de`).
- `WATSONX_MODEL_ID` — defaulted; must be enabled in the chosen region.

## Files inspected

- `services/ai/providers/watsonx.js`
- `services/ai/provider-factory.js`
- `services/ai/providers/openai.js`, `anthropic.js`, `local.js`
- `services/config.js`
- `services/settings/credentials.js`
- `services/audit/audit-log.js` (`redactString`)
- `main.js`, `preload.js`, `api/index.js`
- `sourcedeck.html` (settings panel, AI provider status block)
- `test/ibm-readiness.test.js`
- `docs/troubleshooting-knowledge-base/{open-issues,error-repair-ledger,agent-rules,diagnostic-playbooks}.md`
- `docs/IBM_READINESS.md`

## Current failure behavior

- Renderer sees a generic `{provider:'watsonx', missing:[…]}` snapshot
  only on initial status. After a real call:
  - On 401: provider returns `iam_auth_failed` (no message detail).
  - On 403: provider returns `watsonx_http_403` + redacted body — no
    semantic classification, no remediation steps, no UI surface.
  - On network failure: `network_error` only.
- No deterministic readiness check that combines config + credential
  presence + the last classified error.
- `aws4` is required by `services/storage/providers/ibm-cos.js` but is
  **not declared as a dependency**; `test/ibm-readiness.test.js:327-339`
  silently skips when missing, which the agent-rules forbid for OPEN-002.

## Target repair behavior (Phase 15B)

1. New `services/ai/watsonx-readiness.js` exporting:
   `validateWatsonxConfig`, `buildWatsonxReadinessReport`,
   `classifyWatsonxError`, `redactWatsonxError`,
   `getWatsonxRemediationSteps`.
2. Error classification:
   `ready` · `missing_credentials` · `missing_project_id` ·
   `missing_region_or_url` · `forbidden_403` · `unauthorized_401` ·
   `network_error` · `provider_disabled` · `unknown_error`.
3. Renderer-safe IPC: `ai:watsonx-readiness` → `window.sd.ai.watsonxReadiness()`.
4. Settings copy in `sourcedeck.html`: presence-only fields + safe 403
   remediation message + the disclaimer
   "watsonx credentials are stored securely and are not exposed back to
   the interface."
5. New tests in `test/watsonx-runtime-context.test.js` covering every
   classification + redaction + renderer-boundary checks.
6. Decision on `aws4`: declare as a real dependency (it is legitimately
   needed by `ibm-cos.js`) and remove the silent skip in
   `test/ibm-readiness.test.js`.
7. Troubleshooting KB updates: mark OPEN-002 fixed/partially fixed per
   the actual result (account-owner IAM steps remain outside the app).

No `Authorization`, `Bearer`, or `x-api-key` header construction may
appear in `sourcedeck.html` or `preload.js`. The renderer must only see
presence/status/readiness messages and remediation copy.
