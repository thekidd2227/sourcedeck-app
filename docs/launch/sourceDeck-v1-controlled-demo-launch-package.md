# SourceDeck v1 — Controlled Demo Launch Package

**Phase:** 19B — Final Launch Package / Handoff
**Date:** 2026-06-02
**Main HEAD at packaging:** `15c512f` (PR #35 Release Candidate Lock)
**Decision:** SourceDeck is RC-ready for a controlled buyer demo.

This package is the single entry point for launching a SourceDeck v1
controlled buyer demo and handing the build off to buyers and to internal
support. It is documentation only; it changes no runtime behavior.

---

## 1. Launch posture (authoritative)

| Item | Status |
|---|---|
| Controlled buyer demo | **GO** |
| Public signed macOS release | **NO-GO** |
| Present-tense watsonx live claim | **NO-GO** unless `verified_ready` evidence exists |
| New feature work after RC lock | **Frozen** |

SourceDeck is RC-ready for a controlled buyer demo. It is not ready for a
public signed macOS release, and SourceDeck must not claim watsonx is live
unless a runtime probe has captured `verified_ready` evidence for that
environment.

## 2. What is in this package

- `sourceDeck-v1-controlled-demo-launch-package.md` — this file.
- `sourceDeck-v1-buyer-handoff.md` — buyer-facing handoff guide.
- `sourceDeck-v1-internal-support-handoff.md` — internal support runbook.
- `sourceDeck-v1-known-limitations-for-buyers.md` — buyer-facing limits.
- `sourceDeck-v1-demo-day-checklist.md` — pre-demo verification checklist.
- `../audits/launch-package-handoff-audit.md` — packaging audit.
- `../release-notes/launch-package-handoff.md` — release note.

Related (pre-existing) references:
- `../release-candidate/sourceDeck-v1-rc-lock.md` — RC lock record.
- `../release-candidate/go-no-go-checklist.md` — go/no-go gate list.
- `../operator/demo-operator-runbook.md` — demo operation script.
- `../demo/sourceDeck-v1-buyer-demo-script.md` — buyer demo narrative.
- `../ai/watsonx-runtime-setup.md` — watsonx state interpretation.

## 3. RC baseline merged into main

- PR #33 Commercial Smoke / Demo Readiness
- PR #34 IBM watsonx Runtime Evidence Probe
- PR #35 Release Candidate Lock

## 4. Verified gate state at packaging

All normal gates green. watsonx runtime state `not_configured`. Release
evidence state `packaged_unsigned` (asar present, local macOS artifact
unsigned — acceptable for controlled demo, not for public release).
Troubleshooting scan: 0 critical/high failures.

Expected strict blockers (correct, not bugs):
- `npm run watsonx:runtime-probe:strict` exits `1` (not `verified_ready`).
- `npm run release:evidence:strict` exits `1` (signing readiness not
  complete; working tree must also be clean).

## 5. Claim discipline

**Safe language:**
- "SourceDeck is RC-ready for a controlled buyer demo."
- "Standard plans use customer-provided AI keys."
- "Premium and enterprise deployments may include SourceDeck-managed IBM
  watsonx configuration or customer-provided AI credentials depending on
  workflow risk, usage volume, and deployment requirements."
- "Usage limits, overages, or enterprise deployment terms may apply."
- "Human approval is required before sending, publishing, proposal use,
  pricing decisions, compliance decisions, teaming decisions, or bid/no-bid
  decisions."

**Forbidden language** — the demo must not claim, and operators avoid: a present-tense watsonx-live claim, "IBM watsonx included", "signed and notarized", any HIPAA / FedRAMP / SOC 2 / CMMC / HITRUST / ISO / government-compliance certification, guaranteed contracts / awards / revenue, unlimited AI, auto-send, or auto-submit.

## 6. Human-approval model (non-negotiable)

Human approval remains required before: outreach sending, publishing,
proposal use, pricing decisions, compliance decisions, bid/no-bid
decisions, and teaming decisions. SourceDeck produces drafts; a human is
always the last step before anything leaves the building.
SourceDeck does not auto-send and does not auto-submit.

## 7. RC freeze rule

After RC lock, allowed changes are limited to: critical bug fixes, claim
cleanup, documentation correction, evidence updates, and release-blocker
remediation. New features, runtime architecture changes, new provider
behavior, workflow changes, and release publishing are out of scope and
must be treated as a new release-candidate cycle.
