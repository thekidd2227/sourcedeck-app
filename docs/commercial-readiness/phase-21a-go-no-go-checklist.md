# Phase 21A — Buyer Demo Go / No-Go Checklist

**Repo state at lock:** `main @ 9dc9350`.
**Audit:** `docs/audits/phase-21a-buyer-demo-acceptance-audit.md`.
**Walkthrough:** `docs/demo/phase-21a-buyer-demo-walkthrough.md`.

Use this checklist before any buyer-facing walkthrough. If any **NO-GO** condition is hit, reschedule or scope the meeting down. Do not proceed past a NO-GO with "we'll cover it in follow-up."

---

## A. Default-state hygiene — must all be GO

| # | Gate | GO if… | NO-GO if… |
|---|---|---|---|
| A1 | App opens on a **default-state install** (a machine that has never been logged in or has had Settings wiped) | Yes | Presenter is using the operator's working machine with active pipeline data |
| A2 | Dashboard Automation Status card reads "No automations active. Connect tools in Settings to populate this panel." | Empty state visible | PROD-XX rows or "ACTIVE" badges visible |
| A3 | Activity Feed reads "No activity yet." | Empty state visible | Any pre-loaded activity visible |
| A4 | Sysflow → Active Webhooks / Infrastructure / HTTP Standards all show empty state | Empty | Any fake webhook ID, Airtable base ID, Gmail connection ID visible |
| A5 | Ad Engine title reads "Ad Engine" (not "Faceless Ad Engine"), 11 generic topics, 49 industries, 27 platforms in dropdowns | Yes | "Faceless Ad Engine" title or operator-codenamed topics (Diagnosis-First, MedPilot, Government Contractor Diagnostic, Caribbean & LatAm Operator Diagnostic, etc.) visible |
| A6 | Lead Generator region select shows 4 neutral options (Select market…, United States, Canada, United Kingdom, User-defined) | Yes | NYC Metro / Manhattan / Brooklyn / Bronx / Queens / Staten Island / Westchester / Spanish Caribbean defaults visible |
| A7 | Daily Operating Rhythm shows empty state | "No operating rhythm yet…" visible | Any preloaded Day-1–Day-4 operator checklist visible |
| A8 | Demo data is OFF (`SOURCEDECK_DEMO_MODE` is unset or anything other than `true`) | Yes | Demo mode on without explicit operator opt-in |

**Evidence (regression-asserted):** `test/default-state-policy.test.js` 22/22 PASS at `main @ 9dc9350`.

## B. Protected-feature integrity — must all be GO

| # | Gate | GO if… | NO-GO if… |
|---|---|---|---|
| B1 | Response Desk tab loads with no Send Email / Auto-Send / Submit Quote button | Verified absent | Any send-style button visible |
| B2 | Response Desk pane shows the "Human approval required" section explicitly | Visible | Section missing or relabeled |
| B3 | Response Desk audit-friendly status text reads "Draft only — not sent" | Visible | Missing or rewritten |
| B4 | GovCon → SAM Sprint panel shows "Free users: 1 NAICS per sprint. Paid users: all configured NAICS codes." | Visible | Plan limits missing or misstated |
| B5 | SAM Sprint does not auto-send and does not auto-submit any opportunity outreach during the walkthrough | Verified | Any auto-send / auto-submit behavior |
| B6 | watsonx readiness panel reads "Click 'Run readiness check' to validate configuration" (presence/status/remediation only) | Visible | Any "watsonx live" wording on the panel |
| B7 | `.btn-gold` instances render cool gold (`#C9941A`) — not brass | Cool gold | Brass on any `.btn-gold` button |
| B8 | App resizes cleanly at the 900 / 899 px responsive boundary (sidebar collapses to horizontal at ≤899 px) | Clean | Layout regression at the breakpoint |

**Evidence (regression-asserted):** `test/response-desk.test.js` 24/24, `test/sam-opportunity-sprint.test.js` 62/0, `test/default-state-policy.test.js` #17–#22.

## C. Claim posture — must all be GO

| # | Gate | GO if… | NO-GO if… |
|---|---|---|---|
| C1 | Presenter has not added any claim outside the safe-claim column in `docs/demo/phase-21a-buyer-demo-walkthrough.md` § D | Yes | A forbidden claim has been added to the deck or recap |
| C2 | Presenter will **not** say "auto-send," "auto-submit," "send outreach automatically," "submit proposals automatically" | Yes | Presenter intends to say any of those |
| C3 | Presenter will **not** say "watsonx live" or "IBM watsonx is live in the shipping product" | Yes | Presenter intends to say it |
| C4 | Presenter will **not** say "signed and notarized" | Yes | The build the buyer will see is not actually signed + notarized through Apple's service |
| C5 | Presenter will **not** say "SOC 2 certified," "FedRAMP authorized," "CMMC certified," "HIPAA certified," "HITRUST certified," "ISO 27001 certified," or "government compliant" | Yes | Any of those words will be used |
| C6 | Presenter will **not** say "guaranteed contract," "guaranteed award," "guaranteed revenue," "guaranteed ROI," or "guaranteed savings" | Yes | Any guarantee will be implied |
| C7 | Presenter will **not** say "unlimited AI" | Yes | Unlimited AI will be implied |
| C8 | Presenter is ready to answer all 8 buyer objections in `docs/demo/phase-21a-buyer-demo-walkthrough.md` § F with the approved-response language | Yes | Presenter has not reviewed the objection table |

**Evidence:** Claims audit grep across `README.md`, `docs/**`, `sourcedeck.html` returns 0 positive unsupported claims. Every hit is a negative assertion (sanitizer, forbidden-list, or test forbidden-term array). See `docs/audits/phase-21a-buyer-demo-acceptance-audit.md` § Claims audit.

## D. watsonx live status rule

A "watsonx live" claim is **NO-GO** by default. The only path from NO-GO → GO for "watsonx live" wording:

1. An operator runs `npm run watsonx:runtime-probe:strict --evidence` against the buyer's environment.
2. The probe produces a `verified_ready` evidence artifact under `reports/release-evidence/`.
3. The signed evidence is reviewed by the operator before any "watsonx live" language is approved for that buyer's deployment.
4. Even after `verified_ready`, the live claim is scoped to that buyer's deployment — not the shipping product baseline.

Without `verified_ready`: **NO-GO for "watsonx live" claim.** Use the safe wording: *"watsonx readiness is presence/status/remediation only."*

## E. Signed / notarized status rule

A "signed and notarized" claim is **NO-GO** by default. The only path from NO-GO → GO for "signed and notarized" wording:

1. Apple Developer signing credentials are configured in the build environment.
2. `npm run build:mac` is executed with full signing identity.
3. The build is submitted to Apple's notarization service and returns a notarized artifact.
4. `npm run release:mac-signing-readiness:strict` confirms the readiness state.
5. The notarized artifact is the one the buyer is shown.

Without all four steps: **NO-GO for "signed and notarized" claim.** Use the safe wording: *"unsigned development build for demo purposes."*

## F. Final Go / No-Go matrix

| Section | All gates GO? | Notes |
|---|---|---|
| A — Default-state hygiene | ☐ Yes ☐ No | If No: redo the default-state install before demo. |
| B — Protected-feature integrity | ☐ Yes ☐ No | If No: investigate regression before demo. |
| C — Claim posture | ☐ Yes ☐ No | If No: rework presenter deck. |
| D — watsonx live status | ☐ Use safe wording ☐ `verified_ready` evidence present | Default = safe wording. |
| E — Signed/notarized status | ☐ Use safe wording ☐ notarized artifact present | Default = safe wording. |

**Decision:**

- All of A, B, C all GO and D / E are at safe wording → **GO** for controlled buyer walkthrough.
- Any of A, B, C has a NO-GO row → **NO-GO**. Close the gap or reschedule.
- D or E is set to the elevated wording without the evidence trail → **NO-GO** for that wording (but the rest of the demo may still GO with safe wording).

## G. Post-demo discipline

After the demo, the operator must:

1. Send the recap email using only the safe-claim language. Re-read it for forbidden claims (compliance certifications, guaranteed outcomes, unlimited AI, watsonx-as-live, signed/notarized claims, auto-send / auto-submit) before sending.
2. Log any objections the buyer raised that are **not** covered in `docs/demo/phase-21a-buyer-demo-walkthrough.md` § F. Add them to that table in a follow-up docs PR.
3. If the buyer asked for a feature that does not exist in `main @ 9dc9350`, log it as a feature request — do not promise it.
4. If anything in the walkthrough rendered differently from what this checklist predicted, flag it before the next demo and re-run the audit.

## H. Sign-off

| Role | Name | Date | GO / NO-GO |
|---|---|---|---|
| Demo operator |   |   | ☐ GO ☐ NO-GO |
| Reviewer |   |   | ☐ GO ☐ NO-GO |

If both rows are GO and signed: the demo may proceed. The signed checklist is the audit trail.
