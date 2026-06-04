# Release Note — Phase 23B GovCon Mode Navigation Polish + Signed Demo Build Path Audit

**Branch:** `feat/phase-23b-govcon-mode-navigation-polish`
**Base:** `main @ a560be8` (post-PR #67 — Phase 23A GovCon Demo Polish merged).
**Posture:** Low-risk navigation polish + signed-demo-build path audit. **No new feature surfaces. No safety-posture changes.** No signing credentials added. No notarization run. No signed/notarized claim made.

---

## Summary

Phase 23B reduces buyer confusion about whether SourceDeck is a GovCon Capture OS vs. a generic CRM/ad/email tool, without breaking navigation or release safety:

- **Brand sub-label updated** from `Intelligence Platform` to `GovCon Capture OS`. The very first thing a buyer sees on the brand mark is now the GovCon framing.
- **GovCon Mode indicator** added at the top of `tab-govcon`. Headline reads *"GovCon Mode — Capture OS workflow"*; civic-ledger sub-label reads *"Active surface · Capture → Solicitation → Vendor + Pricing → Proof + Teaming → Submission readiness"*; oxblood-warn `GovCon` chip on the right; microcopy acknowledges other tabs remain accessible: *"Other business tools (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR, etc.) remain available in the sidebar but this demo focuses on the GovCon capture workflow. SourceDeck does not submit bids, quotes, or government responses; no outreach is sent automatically; human approval is required for every action."*
- **Signed demo build path audited** (doc only). Documents the existing Phase 17A/17B signing diagnostic chain (`release:mac-signing-readiness`, `release:evidence`, `release-check.js`), enumerates the credentials required at build time (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`), enumerates the 7-step verification chain (`mac-signing-readiness:strict` → `build:mac` → `release-check.js` → `codesign --verify` → `spctl --assess` → `xcrun stapler validate` → `release:evidence:strict` reports `packaged_signed_verified`), and enumerates forbidden language until the chain has been verified on the exact build being demoed.

**No nav tab hidden, renamed, or reordered.** **No default-active-tab change.** **No signing credentials added.** **No notarization run.** **No signed/notarized claim made.**

---

## What changed

### Renderer

- `sourcedeck.html`:
  - Brand sub-label updated: `<div class="brand-ver" id="brand-ver-el">GovCon Capture OS</div>`.
  - New `<section id="gc-mode-indicator" data-section="govcon-mode-indicator">` block at the top of `tab-govcon`'s `.pane-body`, just before the existing Outreach OS helper.

### Tests

- `test/govcon-mode-navigation.test.js` — 17 static + VM-based assertions covering: GovCon Mode indicator + brand sub-label, GovCon tab remains accessible, Phase 23A Demo Mode remains accessible, Phase 22B/22C/22D/22E/22F surfaces remain intact, Response Desk Import Email, SAM Sprint Free=1 NAICS, no System Readiness/Flow tab, no Send Email / Submit Bid / Submit Quote buttons, **no positive signed/notarized claim added**, every inline `<script>` block still parses, `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

### Docs

- `docs/audits/phase-23b-govcon-mode-navigation-polish-audit.md` — navigation-polish audit + signed-demo-build path audit + safety/non-claims block + Phase 23C deferral list.
- `docs/release-notes/phase-23b-govcon-mode-navigation-polish.md` — this file.

### Package wiring

- `package.json` — `test` script chain appends `node test/govcon-mode-navigation.test.js`. No new dependency. No build script change.

---

## Signed-demo-build path — summary

**Current state (truthful):** `release:evidence` reports `packaged_unsigned` in the development environment. `release-check.js` emits the benign `code object is not signed at all` WARN. No signed or notarized macOS build is available on `main`.

**Credentials required at build time** (must NOT be committed to the repo): `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.

**Verification chain that must succeed on the EXACT build being demoed before any "signed" / "notarized" claim is made:**

1. `npm run release:mac-signing-readiness:strict` → exits 0 with `status: ready_to_sign`.
2. `npm run build:mac` runs against the signing-credential-laden environment.
3. `node scripts/release-check.js` passes the privacy + signing + size gates.
4. `codesign --verify --deep --strict --verbose=2 dist/mac/SourceDeck.app` exits 0.
5. `spctl --assess --type execute --verbose dist/mac/SourceDeck.app` returns `accepted`.
6. `xcrun stapler validate dist/mac/SourceDeck.app` returns `validated`.
7. `npm run release:evidence:strict` reports state `packaged_signed_verified`.

**Forbidden language until the chain is verified**: "SourceDeck is signed and notarized", "Apple notarized", "Production signed", "Notarized release", "Publicly signed", "SourceDeck is signed", "SourceDeck is notarized". Test #15 asserts the renderer does not introduce any of these claims.

**Safe language (always usable):** "Local test builds may show unsigned-artifact warnings", "Do not present signing/notarization as complete until release-check verifies it", "The build you're seeing is an unsigned development build for demo purposes."

Full detail in `docs/audits/phase-23b-govcon-mode-navigation-polish-audit.md` §3.

---

## What did NOT change

- **No nav tab hidden, renamed, or reordered.** The sidebar still has Command Center / Dashboard / Lead Generator / Revenue / Email Tracker / Overdue / Response Desk / Ad Engine / Daily Ops / Socials / Create Lead / AI Lead Builder / Settings / Client Delivery / GovCon / Outreach / Prime Partners / etc. in the same order.
- **No default-active-tab change.** `Dashboard` remains the cold-open active tab.
- **No signing credentials added.** No `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` added.
- **No notarization run.** No `npm run build:mac`. No `xcrun notarytool` call.
- **No signed/notarized completion claim made.**
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`.** No new IPC bridge. No new dependency.
- **No pricing changed.** No `docs/pricing/sourceDeck-pricing-packaging.md` edit. No Stripe Price ID. No `assets/sd-config.js` (site repo) touched.
- **No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim added.**
- **No watsonx-live / guaranteed-outcome claim added.**
- **No `.env*` touched.** No API key printed. No secret exposed.
- **No stashes touched. No branches deleted.**
- **System Readiness / System Flow tab remains removed.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Phase 22E Past Performance + Capability + Prime Partner preserved** (24/24).
- **Phase 22F Submission Readiness Gate preserved** (30/30).
- **Phase 23A Demo Mode preserved** (27/27).
- **Response Desk preserved.** Import Email intact. `never auto-sends, never auto-submits` copy intact.
- **SAM Sprint Free=1 NAICS preserved.**
- **Phase 20G `.btn-gold` guard preserved.**

---

## Tests run / results — all green

- `node test/govcon-mode-navigation.test.js` — **17/17 PASS**
- `node test/govcon-demo-polish.test.js` — **27/27 PASS** (Phase 23A preserved)
- `node test/govcon-submission-readiness.test.js` — **30/30 PASS** (Phase 22F preserved)
- `node test/govcon-past-performance-prime.test.js` — **24/24 PASS** (Phase 22E preserved)
- `node test/govcon-vendor-pricing.test.js` — **25/25 PASS** (Phase 22D preserved)
- `node test/govcon-solicitation-workspace.test.js` — **19/19 PASS** (Phase 22C preserved)
- `node test/govcon-capture-command-center.test.js` — **15/15 PASS** (Phase 22B preserved)
- `node test/remove-system-readiness-tab.test.js` — **9/9 PASS**
- `node test/renderer-boot.test.js` — **7/7 PASS**
- `node test/response-desk-email-import.test.js` — **20/20 PASS**
- `node test/response-desk.test.js` — **24/24 PASS**
- `node test/default-state-policy.test.js` — **22/22 PASS**
- `node test/sam-opportunity-sprint.test.js` — PASS
- `node test/troubleshooting-agent.test.js` — **95/95 PASS**
- `npm test` — all suites PASS
- `npm run release:evidence` — state `packaged_unsigned`
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected non-release env)

---

## Rollback

Additive. Revert this PR's single commit to roll back. Phases 22B-22F + 23A remain intact on `main`. The sidebar brand mark returns to `Intelligence Platform` and the GovCon tab returns to its post-Phase-23A state.

---

## Phase 23C deferral list (full detail in the audit)

- **23C-A** GovCon Mode primary-nav reorder (move `GovCon` button to top of sidebar AND change default-active-tab from `Dashboard` to `GovCon`).
- **23C-B** GovCon Mode commercial-tab demotion behind a `Show all` toggle.
- **23C-C** Signed-demo-build CI workflow (`workflow_dispatch`-only; no auto-publish).
- **23C-D** Local-only "Export as Markdown" download wired to Phase 22F Export Placeholder.
- **23C-E** "Last updated" timestamps per phase section.

All five remain compatible with the Phase 22 safety posture.
