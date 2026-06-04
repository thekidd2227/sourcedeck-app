# Audit — Phase 21B Controlled Demo Dry Run

**Date:** 2026-06-04
**Branch:** `docs/phase-21b-demo-dry-run`
**Base:** `main @ f23bd07` (Phase 21A buyer demo acceptance gate merged).
**Scope:** Docs only. No runtime, package, script, service, test, or workflow change.

## Purpose

Produce the operator-facing dry-run package required before any buyer-facing recording: rehearsal protocol, frame-by-frame shot list, claim-safe narration practice, buyer Q&A drill, red-flag stop conditions, post-demo follow-up template, and corrections list format.

## Materials produced

- **`docs/demo/phase-21b-controlled-demo-dry-run.md`** — 12-section rehearsal protocol covering: pre-recording machine and presenter setup; the exact 5-minute and 15-minute rehearsal flows with timing and source quotes from Phase 21A § A and § B; screen capture shot list (summary); what not to show (stop-and-cut moments); claim-safe narration with 5 pivot moments; buyer / reviewer Q&A; known limitations; red-flag stop conditions; post-demo follow-up email template; corrections list format; final demo readiness recommendation.
- **`docs/demo/phase-21b-recording-shot-list.md`** — 15-shot frame-by-frame capture list, pre-roll and post-roll checklists, per-shot "Verify before capture" lines, file-handling rules for `tmp/phase-21b-recordings/`, what-to-do-if-a-shot-fails procedure, approval criteria.
- **`docs/audits/phase-21b-demo-dry-run-audit.md`** — this file.
- **`docs/release-notes/phase-21b-controlled-demo-dry-run.md`** — release note.

## Source materials reviewed

| File | Purpose |
|---|---|
| `docs/demo/phase-21a-buyer-demo-walkthrough.md` | Verbatim narration source for the 5-min and 15-min flows. Phase 21B references its § A, § B, § D, § F, § K, § L. |
| `docs/commercial-readiness/phase-21a-go-no-go-checklist.md` | Pre-meeting gate. Phase 21B references its sign-off as a precondition for the "READY" recommendation. |
| `docs/audits/phase-21a-buyer-demo-acceptance-audit.md` | Default-state hygiene proof and protected-feature preservation proofs that the dry run relies on. |
| `docs/release-notes/phase-21a-buyer-demo-acceptance.md` | The Phase 21A "GO for controlled buyer walkthrough" decision that Phase 21B operationalizes. |

## Claims audit at `main @ f23bd07`

Static-source scan against the four new Phase 21B docs (`docs/demo/phase-21b-controlled-demo-dry-run.md`, `docs/demo/phase-21b-recording-shot-list.md`, `docs/audits/phase-21b-demo-dry-run-audit.md`, `docs/release-notes/phase-21b-controlled-demo-dry-run.md`):

| Regex pattern | Hits in new docs | Verdict |
|---|---|---|
| `guaranteed (award\|revenue\|ROI)` | only inside negative assertions / forbidden-claim columns | ✅ no positive claim added |
| `we guarantee` | 0 | ✅ |
| `auto-send` / `auto-submit` / `send automatically` / `submit automatically` | only inside negative assertions ("does not auto-send," "no auto-send," "Mandatory re-read pass" forbidden list) | ✅ no positive claim added |
| `SOC ?2 certified` / `FedRAMP authorized` / `CMMC certified` / `HIPAA certified` / `HITRUST` / `ISO 27001 certified` | only inside the forbidden-claim grep instructions and the post-demo re-read list | ✅ no positive claim added |
| `watsonx live` | only inside the negative assertion "no 'watsonx live' wording anywhere in frame" and the pivot-moment correction | ✅ no positive claim added |
| `signed and notarized` | only inside the negative assertion "Not in this environment" and the watsonx/signed-notarized status rules | ✅ no positive claim added |
| `unlimited AI` | only inside the negative assertion in the pivot-moment correction and the post-demo re-read list | ✅ no positive claim added |

**Result: 0 positive unsupported claims** added in Phase 21B. Every claim mention is in negative form ("do not say X" / forbidden-claim column / sanitizer / pivot-correction / post-demo re-read list / red-flag stop condition).

## Demo surface coverage

The dry-run protocol and the shot list explicitly instruct the operator to show:

| Surface | Required shot(s) | Status |
|---|---|---|
| Clean first launch (default-state install) | Shot 1 default desktop shell; pre-roll checklist | ✅ covered |
| Dashboard empty / default state | Shot 2 Automation Status empty state | ✅ covered |
| Activity Feed empty state | Shot 3 | ✅ covered |
| Leads region select (neutral options) | Shot 4 | ✅ covered |
| Ad Engine neutral title / topics / industries / platforms | Shots 5, 6, 7 | ✅ covered |
| Response Desk draft-only workflow + no Send Email button | Shots 8, 9, **Shot 10 (critical)** | ✅ covered |
| Daily Operating Rhythm empty / user-driven state | Shot 11 | ✅ covered |
| Sysflow Active Webhooks / Infrastructure / HTTP Standards empty | Shot 12 | ✅ covered |
| GovCon → SAM Sprint plan limit copy (Free=1 NAICS / manual-only) | Shot 13 | ✅ covered |
| Settings without exposing secrets (watsonx readiness panel) | Shot 14 | ✅ covered |
| `.btn-gold` Phase 20G visual guard | Shot 15 | ✅ covered |
| 900 / 899 px responsive boundary | pre-roll checklist § 1.B last line | ✅ covered |

## Protected-feature integrity (re-verified at `main @ f23bd07`)

| Feature | Evidence | Status |
|---|---|---|
| Response Desk draft-only + no Send Email | `test/response-desk.test.js` 24/24 PASS; `test/default-state-policy.test.js` #17 verifies no Send Email surface | ✅ preserved |
| Response Desk hard invariants | `test/response-desk.test.js` #12–#13 verify `human_approval_required: true` / `auto_send: false` | ✅ preserved |
| SAM Sprint Free=1 / paid=many | `test/default-state-policy.test.js` #19 verifies `PLAN_LIMITS.free.max_naics_codes === 1` | ✅ preserved |
| SAM_GOV_API_KEY env-only | `test/default-state-policy.test.js` #20 verifies no renderer `localStorage.setItem` | ✅ preserved |
| `.btn-gold` cool gold | `:root --gold:#C9941A` at `sourcedeck.html:60`; rule at `:181`; `test/default-state-policy.test.js` #21 verifies | ✅ preserved |
| 900 / 899 px responsive boundary | `sourcedeck.html:438` and `:540`; `test/default-state-policy.test.js` #22 verifies | ✅ preserved |
| Default-state hygiene (PR #52) | 22-test policy suite at `test/default-state-policy.test.js` | ✅ preserved |

## Files NOT changed

- `sourcedeck.html` — not touched.
- `services/**` — not touched.
- `scripts/**` — not touched.
- `test/**` — not touched.
- `package.json` — not touched.
- `package-lock.json` — not present.
- `.env*` — not touched.
- `main.js`, `preload.js`, `chartnav-integration.js` — not touched.
- `reports/**` — no generated reports committed.
- Vercel config — not touched.
- watsonx / signing / provider files — not touched.
- Other repos — not touched.

## Dry-run readiness recommendation

**Recording side is operator-required.** The dry-run protocol, shot list, and corrections-list format are now in place at `main @ f23bd07` (this PR's docs). The actual recording must happen on macOS with a screen recorder and the operator on camera — that step cannot be executed from the CI/build environment.

Per the dry-run doc § 12 final-readiness criteria, the demo is **READY** for the first buyer-facing meeting only when:

1. A 5-minute approvable take exists in `tmp/phase-21b-recordings/`.
2. A 15-minute approvable take exists in `tmp/phase-21b-recordings/`.
3. Both takes pass the post-recording forbidden-claim grep / re-watch.
4. The Phase 21A Go / No-Go checklist (`docs/commercial-readiness/phase-21a-go-no-go-checklist.md`) is signed off.

Until the operator captures and approves both takes: **NOT READY for live buyer meeting**, even though the docs are in place.

## Confirmations

- **Docs-only.** No runtime, package, script, service, test, or workflow file modified.
- **No new claims added.** Every claim mention in the new docs is in negative form.
- **No watsonx-live claim added.**
- **No signed/notarized claim added.**
- **No guaranteed-outcome claim added.**
- **No compliance-certification claim added.**
- **No auto-send / auto-submit claim added.**
- **No pricing change.**
- **No new product feature.**
- **No `.env`** touched.
- **No recordings or screenshots committed.** The shot-list doc explicitly tells the operator not to commit `tmp/phase-21b-recordings/` content.
- **No generated reports committed.**
- **Stashes untouched** (`git stash list` empty before and after).
- **Phase 20G `.btn-gold` cool gold + 900 / 899 px guards** preserved by virtue of not editing `sourcedeck.html`.
- **Response Desk** behavior preserved by virtue of not editing `services/response-desk.js`, `test/response-desk.test.js`, or `#tab-reply` pane.
- **SAM Sprint** behavior preserved by virtue of not editing `services/govcon/sam-*`, `scripts/sam-*`, or the SAM Sprint UI.
- **Live SAM Sprint not run** during this audit (no SAM.gov API call).
- **No outreach sent.**
