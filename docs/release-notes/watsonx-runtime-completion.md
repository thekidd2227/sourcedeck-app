# Release Notes — IBM watsonx Runtime Completion (Phase 18A)

**Branch:** `fix/watsonx-runtime-completion`
**Status:** app-side complete; live runtime outcome depends on IBM-side
configuration in the target environment.

## What shipped

- **`services/ai/watsonx-runtime-evidence.js`** — a stable 9-state runtime
  state machine with presence-only env reporting, deep redaction, and
  renderer-/log-safe markdown + JSON formatters. Pure; makes no network
  calls.
- **`scripts/watsonx-runtime-probe.js`** — a live runtime probe CLI. It
  reads IBM/watsonx env from `process.env` only, attempts a real IBM IAM
  token exchange and a minimal watsonx runtime request **only** when the
  required env is present, and captures redacted evidence.
- **npm scripts:** `watsonx:runtime-probe`, `watsonx:runtime-probe:json`,
  `watsonx:runtime-probe:evidence`, `watsonx:runtime-probe:strict`.
- **Troubleshooting WX-006** — PASS only when the latest runtime evidence
  outcome is `verified_ready`; MANUAL/WARN when not configured or blocked
  by IBM-side config; FAIL only on an app-side regression. Auto-repair is
  disabled and human approval is required (invariant preserved).
- **Release evidence** now includes a presence-only `watsonxRuntime`
  summary when a report exists.
- **Tests:** `test/watsonx-runtime-evidence.test.js` (17 tests) added to
  `npm test`.
- **Docs:** setup guide, audit, and KB updates.

## Honest outcomes

The probe resolves to one of two terminal outcomes (plus the
"not configured" outcomes when env is absent/incomplete):

- **`verified_ready`** — a real watsonx runtime request succeeded and
  redacted evidence was captured.
- **`blocked_by_ibm_config`** — the code is correct, but IBM-side
  project/space/deployment/IAM/runtime configuration is still missing or
  invalid, with exact operator next steps documented.

SourceDeck must not claim watsonx is live unless `verified_ready` evidence
exists for the target environment.

## Positioning (unchanged, conditional)

- Standard plans support customer-provided AI keys (BYOK).
- Premium/enterprise deployments may use SourceDeck-managed IBM watsonx or
  customer-provided AI credentials, depending on workflow risk, usage
  volume, and deployment requirements. AI usage is not unlimited.

## Safety

- No IBM credentials added; no `.env` files committed.
- Presence-only reporting; no keys, bearer tokens, JWTs, project/space/
  deployment ids, or generated text are stored.
- No renderer/preload key exposure; no watsonx keys in `localStorage`.
- No compliance claims: SourceDeck must not claim SOC 2, FedRAMP, CMMC, HIPAA, HITRUST, ISO 27001, or government compliance.

## How to verify in an IBM-configured environment

```bash
export WATSONX_API_KEY="<placeholder>"      # main-process env only; never committed
export WATSONX_PROJECT_ID="<placeholder>"   # or WATSONX_SPACE_ID
npm run watsonx:runtime-probe:evidence
npm run watsonx:runtime-probe:strict   # exits 0 only on verified_ready
```

See `docs/ai/watsonx-runtime-setup.md` for state-by-state interpretation.
