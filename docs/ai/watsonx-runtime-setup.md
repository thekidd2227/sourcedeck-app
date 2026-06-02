# IBM watsonx Runtime Setup & Probe

How SourceDeck configures and verifies the IBM watsonx runtime path, and
how to interpret each runtime evidence state.

## AI credential model

- **Standard plans:** SourceDeck supports **customer-provided AI keys
  (BYOK)**. Operators bring their own AI provider credentials.
- **Premium / enterprise deployments:** may use **SourceDeck-managed IBM
  watsonx or customer-provided AI credentials**, depending on workflow
  risk, usage volume, and deployment requirements. This is conditional —
  watsonx is not bundled into every plan and AI usage is not unlimited.

Live watsonx status is never assumed. It requires a verified runtime
probe; SourceDeck must not claim watsonx is live unless a real runtime
request succeeds.

## Required environment (NAME only — never commit values)

Set these in the **main-process environment** only. Never place them in
the renderer, in `localStorage`, or in any committed `.env` file.

| Purpose            | Name (primary / alternate)                       |
|--------------------|--------------------------------------------------|
| API key            | `WATSONX_API_KEY` / `IBM_CLOUD_API_KEY`          |
| Project or space   | `WATSONX_PROJECT_ID` / `WATSONX_SPACE_ID` (one)  |
| Service URL/region | `WATSONX_URL` / `WATSONX_REGION` (default us-south) |
| Model / deployment | `WATSONX_MODEL_ID` / `WATSONX_DEPLOYMENT_ID` (default `ibm/granite-13b-chat-v2`) |

**Required rule:** an API key **and** exactly one of project-id /
space-id. URL and model have safe defaults.

## Running the probe

```bash
npm run watsonx:runtime-probe            # human-readable diagnosis
npm run watsonx:runtime-probe:json       # redacted JSON to stdout
npm run watsonx:runtime-probe:evidence   # write redacted evidence reports
npm run watsonx:runtime-probe:strict     # exit 1 unless verified_ready
```

Evidence is written (redacted) to:

```
reports/watsonx-runtime/latest-watsonx-runtime-evidence.md
reports/watsonx-runtime/latest-watsonx-runtime-evidence.json
reports/watsonx-runtime/<YYYY-MM-DD>-watsonx-runtime-evidence.md
reports/watsonx-runtime/<YYYY-MM-DD>-watsonx-runtime-evidence.json
```

These reports are git-ignored (except `.gitkeep`). The probe makes
outbound IBM calls **only** when the required env is present.

## Interpreting each state

| State | Meaning | Action |
|---|---|---|
| `not_configured` | No watsonx env set | Expected for BYOK/standard. Nothing to do unless enabling managed watsonx. |
| `configured_missing_required_env` | Some env present, a required value missing | Set the names under `env.missingRequired`, re-run probe. |
| `iam_token_failed` | IBM IAM rejected the API key | Verify the key is current and has watsonx.ai access. |
| `project_or_space_invalid` | IBM rejected the project/space binding | Associate it with a WML instance in the same account; match region. |
| `model_or_deployment_invalid` | IBM rejected the model/deployment | Enable the model for the region/plan, or set a valid deployment id. |
| `runtime_request_failed` | Runtime request failed for another reason | Inspect redacted detail; check connectivity to `*.ml.cloud.ibm.com`. |
| `runtime_request_succeeded` | A real runtime request returned 200 | Rolls up to `verified_ready`. |
| `blocked_by_ibm_config` | Headline rollup for the IBM-side failures above | Code is correct; follow the specific remediation. |
| `verified_ready` | Real runtime request succeeded, redacted evidence captured | watsonx may be described as verified **for this environment**. |

## Resolving `blocked_by_ibm_config` — operator steps

1. Confirm the API key is current in IBM Cloud → Manage → Access (IAM) →
   API keys, and that the identity has watsonx.ai access.
2. Confirm `WATSONX_PROJECT_ID` (or `WATSONX_SPACE_ID`) is associated with
   a Watson Machine Learning service instance.
3. Confirm the project/space and the API key are in the **same** IBM Cloud
   account.
4. Confirm `WATSONX_URL`/`WATSONX_REGION` matches the WML instance region.
5. Confirm `WATSONX_MODEL_ID` is enabled for your region/plan (or set
   `WATSONX_DEPLOYMENT_ID`).
6. Re-run `npm run watsonx:runtime-probe:evidence`.

## Safety invariants

- No IBM credentials in the repo. No `.env` files committed.
- Presence-only reporting; no API keys, bearer tokens, JWTs, project/
  space/deployment ids, or generated text are stored.
- No Authorization/Bearer/x-api-key construction in renderer or preload;
  no watsonx keys in `localStorage`.
- No compliance claims: SourceDeck must not claim SOC 2, FedRAMP, CMMC, HIPAA, HITRUST, ISO 27001, or any government-compliance certification.
- AI usage is not unlimited, and watsonx is not included on every plan.
