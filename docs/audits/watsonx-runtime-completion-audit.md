# Audit — IBM watsonx Runtime Completion (Phase 18A)

**Date:** 2026-06-02
**Branch:** `fix/watsonx-runtime-completion`
**Scope:** Convert the partial OPEN-002 / WX-005 state into one of two
honest outcomes — `verified_ready` (a real runtime request succeeded) or
`blocked_by_ibm_config` (code correct, IBM-side configuration missing or
invalid) — with redacted evidence.

This phase does **not** claim watsonx is live. It must not claim watsonx
is live unless a real runtime request succeeds and is captured as
`verified_ready` evidence.

---

## 1. Current provider abstraction

- `services/config.js` — `loadConfig(env)` reads `process.env` and returns
  presence flags only; `watsonxStatus()` returns `{ configured, missing[] }`
  without echoing values.
- `services/ai/provider-factory.js` — selects the AI provider
  (`local` default; `watsonx` when `AI_PROVIDER=watsonx`).
- `services/ai/providers/watsonx.js` — the **only** place that performs
  outbound IBM calls. `getIamToken()` exchanges the API key for an IAM
  bearer (cached in memory, never logged); `generate()` performs the
  `ml/v1/text/generation` runtime request. Errors are normalized and the
  response body is run through the audit redactor before exposure.
- `services/ai/watsonx-readiness.js` — Phase 15B **static** diagnostic.
  Classifies an already-produced error/status snapshot; makes no network
  calls.

## 2. Current watsonx readiness diagnostic behavior

`watsonx-readiness.js` classifies into `ready` / `provider_disabled` /
`missing_credentials` / `missing_project_id` / `missing_region_or_url` /
`unauthorized_401` / `forbidden_403` / `network_error` / `unknown_error`,
redacts project/space ids + trace ids + key/JWT/Bearer shapes, and feeds
the settings-panel readiness sub-panel + IPC `ai:watsonx-readiness`.

It is **diagnostic-only**: it does not, by itself, prove a runtime call
succeeds. That gap is what Phase 18A closes.

## 3. Required IBM env vars (by NAME only — never commit values)

| Purpose            | Primary name           | Alternate              | Default if unset |
|--------------------|------------------------|------------------------|------------------|
| API key            | `WATSONX_API_KEY`      | `IBM_CLOUD_API_KEY`    | — (required)     |
| Project/space bind | `WATSONX_PROJECT_ID`   | `WATSONX_SPACE_ID`     | — (required, one)|
| Service URL/region | `WATSONX_URL`          | `WATSONX_REGION`       | `us-south`       |
| Model / deployment | `WATSONX_MODEL_ID`     | `WATSONX_DEPLOYMENT_ID`| `ibm/granite-13b-chat-v2` |

**Chosen required rule:** a real runtime request requires an API key
**and** exactly one of project-id / space-id. URL and model both have safe
defaults, so they are reported but not treated as "missing required". This
matches `services/config.js` (`project_id` OR `space_id`, not both).

## 4. OPEN-002 / WX-005 status

- **OPEN-002:** PARTIALLY FIXED. Static diagnostic shipped; live runtime
  readiness still pending IBM-side account/IAM/project association.
- **WX-005:** `status: manual` reminder that public copy must not claim
  watsonx is live until a real runtime check passes.

## 5. What is app-side complete (Phase 18A)

- `services/ai/watsonx-runtime-evidence.js` — stable 9-state machine,
  presence-only env reporting, deep redaction, classification + rollup,
  markdown/JSON formatters. Pure; no network.
- `scripts/watsonx-runtime-probe.js` — live probe CLI. Reads env only;
  attempts a real IAM exchange + minimal runtime request **only** when
  required env is present; writes redacted evidence; honest exit codes.
- `npm` scripts: `watsonx:runtime-probe[:json|:evidence|:strict]`.
- Troubleshooting **WX-006** finding (PASS only on `verified_ready`;
  MANUAL/WARN when not configured / blocked; FAIL only on app-side
  regression). Auto-repair stays disabled; human approval required.
- Release-evidence `watsonxRuntime` summary block (presence-only).
- `test/watsonx-runtime-evidence.test.js` (17 tests) wired into `npm test`.

## 6. What is IBM-side pending (to reach VERIFIED_READY)

Operator, from an environment with valid IBM credentials, must:

1. Set `WATSONX_API_KEY` (or `IBM_CLOUD_API_KEY`) and `WATSONX_PROJECT_ID`
   (or `WATSONX_SPACE_ID`) in the **main-process** environment — never in
   the renderer or `localStorage`, never committed.
2. Ensure the project/space is associated with a Watson Machine Learning
   service instance in the same IBM Cloud account as the API key.
3. Ensure `WATSONX_URL`/`WATSONX_REGION` matches that instance's region.
4. Ensure the IAM identity has watsonx.ai inference access and the model
   is enabled for the region/plan.
5. Run `npm run watsonx:runtime-probe:evidence`.

## 7. Exact evidence needed to declare VERIFIED_READY

- A captured `reports/watsonx-runtime/latest-watsonx-runtime-evidence.json`
  with `outcome: "verified_ready"` and `verifiedReady: true`, produced by a
  real runtime request returning HTTP 200 with generated text present
  (text itself is **not** stored — presence flag only).
- WX-006 then flips to PASS automatically; only at that point may
  OPEN-002 be promoted and any "live" wording be reconsidered.

Until that evidence exists, the honest state is `blocked_by_ibm_config`
(or `not_configured`), and public copy must not claim watsonx is live.
