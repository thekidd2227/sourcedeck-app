# Phase 25B — 7-Day Internal Trial + Troubleshooting Burn-In

**Date:** 2026-06-08
**Phase:** 25B — 7-Day Internal Trial + Troubleshooting Burn-In.
**Branch:** `docs/phase-25b-7-day-internal-trial`.
**Base:** `main @ 993d446` (post-PR #98 — Phase 25A combined launch-readiness sprint).

---

## What this phase delivered

This is a **docs-only phase**. It produces the 7-day internal trial framework, daily checklist, troubleshooting log template, operator scenarios, go/no-go scorecard, and runner command checklist. The trial itself is executed locally by the operator after this PR merges.

**No runtime change** (unless a documented blocker fix is required and scoped to a separate PR).
**No website change.**
**No public launch.**
**No buyer outreach.**
**No deployment.**
**No live SAM Sprint.**
**No public download.**
**No signed-release / Apple-notarized / production-signed claim.**

## Docs added

| Doc | Role |
|---|---|
| `docs/trial/phase-25b-7-day-internal-trial-plan.md` | Purpose, posture, Day 0–Day 7 schedule, decision pathways. |
| `docs/trial/phase-25b-daily-test-checklist.md` | Per-day objective, steps, hold conditions, evidence to record locally. |
| `docs/trial/phase-25b-troubleshooting-log-template.md` | Structured issue record schema, severity definitions, severity → decision rules, example record, local-only retention. |
| `docs/trial/phase-25b-operator-scenarios.md` | 10 realistic internal scenarios (SDVOSB setup, facility services, IT services, vendor quote comparison, capability statement, prime planning, stakeholder graph, submission readiness, internal review export, restart/reopen recovery), all synthetic inputs. |
| `docs/trial/phase-25b-go-no-go-scorecard.md` | 15-row scorecard, issue summary, decision rules, decision selection, buyer-readiness recommendation. |
| `docs/trial/phase-25b-trial-runner-command.md` | Daily prep commands, day-specific run instructions, do-not commands list, Day 7 wrap-up. |
| `docs/release-notes/phase-25b-7-day-internal-trial.md` | This release note. |

## Next action

After this PR merges, the operator runs **Day 0** locally (baseline gate run) using `docs/trial/phase-25b-trial-runner-command.md`, then proceeds through Day 1–Day 7 over the next 7 days. The Day 7 scorecard selects one of three decisions:

1. **READY TO SEEK FIRST PILOT BUYER.** A future phase produces the buyer-facing package.
2. **NEEDS FIXES BEFORE BUYER OUTREACH.** Narrowly-scoped fix PRs follow; the 7-day trial reruns once fixes land.
3. **BLOCKED — DO NOT SHOW BUYERS.** Tier-2 escalation; product is not shown to buyers until resolved.

## Baseline gate results (re-run before this PR)

| Command | Result |
|---|---|
| `node test/setup-wizard-first-run.test.js` | ✅ PASS 35/35 |
| `node test/govcon-final-runtime-polish.test.js` | ✅ PASS 23/23 |
| `node test/govcon-stakeholder-graph-ui.test.js` | ✅ PASS 25/25 |
| `node test/govcon-past-performance-capability-ui.test.js` | ✅ PASS 15/15 |
| `node test/govcon-core-hardening.test.js` | ✅ PASS 15/15 |
| `node test/response-desk.test.js` | ✅ PASS 24/24 |
| `node test/sam-opportunity-sprint.test.js` | ✅ 62/0 PASS |
| `node test/macos-signing-readiness.test.js` | ✅ PASS 19/19 |
| `node test/release-evidence.test.js` | ✅ PASS 20/20 |
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run govcon:smoke` | ✅ 47/0 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING` (expected local-dev posture) |

## Safety / boundary confirmations

- ✅ No runtime code changes.
- ✅ No website changes.
- ✅ No `.env` files touched in either repo.
- ✅ Stashes untouched.
- ✅ No secrets printed.
- ✅ No payment / Stripe / checkout changes.
- ✅ No outreach sent.
- ✅ No live SAM Sprint run.
- ✅ No public download / free demo / try now / get started free CTA introduced.
- ✅ No "signed and notarized" / "Apple notarized" / "production signed" / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 claim introduced.
- ✅ No guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No build artifacts / dist / release / out / reports / media / .qa output committed.
- ✅ No certificate / provisioning profile / private key committed.
- ✅ `docs/product/pricing-source-of-truth.md` not modified.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.
- ✅ Phase 25A bounding conditions preserved.

## Status (unchanged from Phase 25A)

**READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD.**

Public signed release remains NO-GO. Public launch is NO-GO until the 7-day trial passes (Day 7 selects READY TO SEEK FIRST PILOT BUYER).

---

## Signature

Phase 25B 7-day internal trial framework is complete. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD** (with public launch gated on a successful 7-day trial). Next action: operator runs Day 0 locally after this PR merges.
