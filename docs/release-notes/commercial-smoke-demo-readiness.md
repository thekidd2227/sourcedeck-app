# Commercial Smoke Demo Readiness — Release Notes

This release is documentation-only. It packages the artifacts an operator needs to run the SourceDeck v1 buyer smoke demo and to brief a buyer truthfully about the current state of the product. No runtime, package, test, script, or workflow files are modified.

## What changed

Six new documentation files are added under `docs/`. Nothing else in the repository is touched.

- `docs/audits/commercial-readiness-audit.md` — read-only audit of what is shippable today versus what remains gated by external dependencies.
- `docs/commercial-readiness/final-commercial-smoke-checklist.md` — the gate-by-gate checklist an operator walks before any buyer demo or smoke run.
- `docs/commercial-readiness/buyer-one-page-overview.md` — single-page buyer-facing overview of SourceDeck v1, with the SAFE-AI language and the human-approval invariant included.
- `docs/demo/sourceDeck-v1-buyer-demo-script.md` — the staged demo script the operator follows in front of a buyer, including the verbatim fallback language for AI provisioning questions.
- `docs/operator/demo-operator-runbook.md` — the operator runbook for preparing, running, and recovering the demo environment.
- `docs/release-notes/commercial-smoke-demo-readiness.md` — this file.

## What did NOT change

To keep this PR low-risk and reviewable as a docs-only change, the following areas are intentionally untouched:

- `services/` (no service code, no business logic, no integration adapters)
- `scripts/` (no new or modified npm scripts or release scripts)
- `test/` (no test files added, removed, or modified)
- `package.json` and lockfiles (no dependency, version, or script changes)
- `sourcedeck.html`, `main.js`, `preload.js` (no renderer, main-process, or preload changes)
- `.github/` (no workflow, action, or CI configuration changes)
- `.gitignore`
- `reports/` (no committed reports)
- IBM watsonx runtime files (no provider, adapter, or client changes)
- Apple signing / notarization files (no entitlements, profiles, or build-config changes)
- Release publishing configuration (no publish channels, no release manifests)

If a reviewer sees a change outside `docs/` in this PR, that is a defect and the PR should be rejected.

## Claims posture

This release does not introduce any new product claims. The following remain explicitly out of scope and must not be asserted by any artifact in this PR or by an operator using these docs:

- No compliance claims. Do not claim FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, or ISO 27001 status. Do not claim the product is "government compliant" or offers "government compliance."
- No guaranteed-outcome claims. Do not claim guaranteed contract, guaranteed award, or guaranteed revenue.
- No unlimited-AI claims. Do not claim "unlimited AI."
- No live watsonx claim. Do not claim IBM watsonx is live, included, or shipping until Phase 18A verification completes. Until then, AI provisioning is described using the SAFE-AI language below.
- No signing claims. Do not claim SourceDeck is signed or notarized. The current local macOS artifact is unsigned developer build only.

Human approval remains required for outreach, proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically. The operator is the human in the loop for every external action.

## Safe demo posture

The operator runs the documented baseline gates from the final commercial smoke checklist before any buyer demo, follows the buyer demo script step by step, and falls back to the SAFE-AI verbatim language whenever a buyer asks how AI is provisioned, what model is used, or what is included.

Verbatim SAFE-AI language to use when describing AI provisioning to a buyer:

> Standard plans use customer-provided AI keys. Premium and enterprise deployments may include SourceDeck-managed IBM watsonx configuration or customer-provided AI credentials depending on workflow risk, usage volume, and deployment requirements. Usage limits, overages, or enterprise deployment terms may apply.

The operator does not extemporize on AI provisioning beyond this language. If a buyer presses for more detail than the language covers, the operator records the question and routes it to product before answering.

## Remaining dependencies

Two external dependencies remain outside this PR and must be resolved before the corresponding claims can be made:

- Phase 18A watsonx verification. Until Phase 18A completes successfully, the watsonx runtime cannot be described to buyers as `verified_ready` or live. The SAFE-AI language above is the only buyer-facing description permitted until then.
- Apple signing and notarization credentials. Until real Apple Developer ID credentials are provisioned and the signing-readiness and release-evidence gates pass in strict mode end to end, the public macOS release cannot be described as signed or notarized. The current local artifact remains an unsigned developer build.

Both items are tracked outside this docs-only PR and do not block the buyer smoke demo, which is explicitly designed to run truthfully under the current state.

## Tests run

This is a docs-only change, so no new tests were added. The standard read-only gates were executed against the working tree to confirm the documentation does not perturb the existing surface:

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run troubleshooting:scan:json`
- `npm run troubleshooting:email-dry-run`
- `npm run govcon:smoke`
- `npm run govcon:outreach-os:audit`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

All gates are expected to be green. The only acceptable warning from `release-check` is the known unsigned local macOS artifact, which reflects the documented Apple signing dependency and is not regressed by this PR.

## Rollback

This change is additive and docs-only. To roll back, revert the commit or close the PR. There is no runtime impact, no schema or data migration, no dependency change, and no configuration change. Reverting the six added files restores the prior documentation state with no further action required.
