# SourceDeck v1 Go / No-Go Checklist

## Current Decision

| Decision Area | Status |
|---|---|
| Controlled buyer demo | GO |
| Public signed macOS release | NO-GO |
| Present-tense watsonx live claim | NO-GO |
| New feature work after RC lock | NO-GO |

## GO Conditions Met

- PR #29 through PR #34 are merged into the audited baseline.
- Normal automated gates pass.
- Release evidence generation works.
- watsonx runtime evidence generation works.
- Troubleshooting reports show no fail/warn findings.
- Email alert workflow remains dry-run safe.
- GovCon smoke and outreach OS audits pass.
- Human approval guardrails remain present.
- No raw secrets were reported by the credential scan.
- Targeted claim cleanup was performed.

## NO-GO Conditions Remaining

- watsonx runtime evidence is not `verified_ready`.
- Apple signing/notarization readiness is not complete.
- Strict release evidence blocks with `blocked_missing_signing`.
- The local macOS artifact is unsigned.

## Required Before Public Signed Release

1. Run signing/notarization from a real Apple credentialed environment.
2. Confirm `npm run release:mac-signing-readiness:strict` returns `ready_to_sign`.
3. Confirm `npm run release:evidence:strict` exits `0`.
4. Confirm release evidence references signed/notarized artifacts.
5. Keep all public copy within approved claims.

## Required Before watsonx Live Claim

1. Configure IBM/watsonx environment in the main process only.
2. Run `npm run watsonx:runtime-probe:evidence`.
3. Confirm evidence outcome is `verified_ready`.
4. Keep evidence redacted / presence-only.
5. Only then approve present-tense watsonx live language.

## Human Approval Checklist

Before demo or buyer use, confirm the operator states:

- Outreach drafts require human approval.
- Proposal outputs require human approval.
- Pricing outputs require human approval.
- Compliance use requires human approval.
- Bid/no-bid decisions require human approval.
- Teaming decisions require human approval.
- Publishing and posting require human approval.
- Sending requires human approval.

## Final Checklist Result

**Controlled demo:** GO  
**Public signed macOS release:** NO-GO  
**watsonx live claim:** NO-GO unless `verified_ready` exists

