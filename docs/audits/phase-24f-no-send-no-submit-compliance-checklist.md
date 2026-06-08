# Phase 24F-PREP — No-Send / No-Submit Compliance Checklist

**Date:** 2026-06-08
**Posture:** Docs / audit only. **No runtime change.** This checklist is run by the release-candidate hardening agent against the runtime **after Phase 24E merges**, and at every RC cut.
**Companion:** `docs/product/phase-24f-release-candidate-packaging-contract.md`.

---

## A. Required boundaries

The runtime MUST NOT contain any of the following (as active controls or positive claims):

- [ ] No **Send Email** button.
- [ ] No **Submit Bid** button.
- [ ] No **Submit Quote** button.
- [ ] No **Export and submit** control.
- [ ] No "**package submitted**" claim.
- [ ] No "**portal upload completed**" claim.
- [ ] No **auto-send** (`auto_send: true`, "send automatically").
- [ ] No **auto-submit** (`auto_submit: true`, "submit automatically").
- [ ] No **agency-contact automation** (no automated CO/COR/official contact).
- [ ] No **improper CO / COR outreach** copy (no "Contact CO", "Email COR", "Submit to agency", "Send to contracting officer", "Agency submission complete", "Backchannel", "Circumvent competition", "Lobby this office", "Preferred relationship", "Influence buyer").

Reassuring **negation** copy (e.g. "nothing was uploaded", "does not send") is allowed and expected — only **positive** send/submit/upload behavior or claims are forbidden.

---

## B. Surfaces to verify

- [ ] **Response Desk** — draft-only; "never auto-sends, never auto-submits"; no Send Email.
- [ ] **SAM Sprint** — dry-run / manual-review; no auto-send; profile-driven NAICS.
- [ ] **Submission Readiness** — advisory red/yellow/green; never auto-submits.
- [ ] **Internal-review Markdown export** — "INTERNAL REVIEW DRAFT — NOT SUBMITTED" header; local Blob only.
- [ ] **Capability Statement Studio** — internal-review draft; local/offline import only.
- [ ] **Past Performance Library** — local records; no send/submit/upload.
- [ ] **Stakeholder Graph** — *if Phase 24E runtime merged* — read-only reference; FAR-aware posture labels; restricted-window warnings; **never acts** (no contact/submit/upload).
- [ ] **Website copy** — *if/when the website phase begins later* (in `sourcedeck-site`, not this repo) — same boundary applies.

---

## C. Required disclaimers (verbatim)

At least the following disclaimer strings must be present on their respective surfaces:

- [ ] `INTERNAL REVIEW DRAFT — NOT SUBMITTED`
- [ ] `SourceDeck does not submit, upload, email, or transmit this package.`
- [ ] `No portal upload.`
- [ ] `No email transmission.`
- [ ] `Internal review draft. SourceDeck does not send, submit, upload, or certify this content.`
- [ ] `Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes.`

> Note: the first five strings are present on `main` today (export bundle, Capability Statement Studio header). The sixth is the **Stakeholder Graph** internal-capture disclaimer specified by the Phase 24E contract; verify it once the Phase 24E runtime merges.

---

## D. Verification commands (future runtime phase)

Run all of the following at RC-hardening time. All must pass (exit 0); the stakeholder-graph runtime test is conditional.

```
node test/remove-system-readiness-tab.test.js
node test/renderer-boot.test.js
node test/response-desk.test.js
node test/response-desk-email-import.test.js
node test/sam-opportunity-sprint.test.js
node test/govcon-core-hardening.test.js
node test/govcon-past-performance-capability-ui.test.js
node test/govcon-stakeholder-graph-ui.test.js   # if present (Phase 24E runtime)
npm test
npm run release:evidence
npm run troubleshooting:scan
npm run govcon:smoke
npm run phase13:rc-check
npm run i18n:audit
node scripts/release-check.js
```

**Static safety grep (active surfaces + docs):**

```
grep -RInE "Submit Bid|Submit Quote|Send Email|Export and submit|auto_send.*true|auto_submit.*true|submit automatically|send automatically|package submitted|bid submitted|quote submitted|upload to (SAM|PIEE|eBuy|GSA)|SourceDeck submits|guaranteed award|guaranteed revenue|FedRAMP certified|SOC ?2 certified|CMMC certified|HIPAA certified|HITRUST|ISO 27001 certified|signed and notarized|Apple notarized|production signed|System Readiness|System Flow|Contact CO|Email COR|Submit to agency|Send to contracting officer|Agency submission complete|\$79|\$349|\$999" sourcedeck.html services scripts test docs --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.qa
```

Acceptable hits: negative tests, forbidden-copy lists, required disclaimers, historical/deprecated pricing docs. **Unacceptable:** any positive unsafe behavior/claim in active app UI.

**This-phase status (prep run, `main @ aa18e4d`, docs-only):**
- `remove-system-readiness-tab` 9/9 · `renderer-boot` 7/7 · `response-desk` 24/24 · `response-desk-email-import` 20/20 · `sam-opportunity-sprint` PASS · `govcon-core-hardening` 15/15 · `govcon-past-performance-capability-ui` 15/15 · `default-state-policy` 22/22 — **all PASS**.
- `npm test` exit 0 (0 ❌). `release:evidence` pass=44 fail=0 warn=0 manual=3. `troubleshooting:scan` no fail/warn. `govcon:smoke` PASS. `phase13:rc-check` PASS. `i18n:audit` 31/31. `release-check.js` PASS.
- `test/govcon-stakeholder-graph-ui.test.js` **not present** — **Phase 24E runtime still in progress; stakeholder graph runtime gate deferred until that PR merges.**

---

## E. Hard-stop failures

Any one of these is a release blocker — do not cut the RC:

- [ ] Any positive submit / send / upload claim in active app UI.
- [ ] Any active unsafe CTA (Send Email / Submit Bid / Submit Quote / Export-and-submit / portal upload).
- [ ] Any unsupported compliance-certification claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO).
- [ ] Any guaranteed award / guaranteed revenue claim.
- [ ] System Readiness / System Flow restored (nav button or pane).
- [ ] Stale pricing visible in active app UI (`$79` / `$349` / `$999` or any off-source-of-truth price).
- [ ] Real secrets printed (keys, tokens, credentials).
