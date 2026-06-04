# Phase 23B — GovCon Mode Navigation Polish + Signed Demo Build Path Audit

**Date:** 2026-06-04
**Branch:** `feat/phase-23b-govcon-mode-navigation-polish`
**Base:** `main @ a560be8` (post-PR #67 — Phase 23A GovCon Demo Polish merged).
**Scope:** Two pieces: (1) low-risk navigation polish so the GovCon tab visually announces itself as the primary demo surface; (2) a documentation-only audit of the signed-demo-build path with explicit forbidden-claim guidance. **No new feature surfaces. No safety-posture changes.**

---

## 0. Purpose

Phase 23A made the GovCon demo usable with sample data. Phase 22G also flagged that "the first thing the buyer sees is a sidebar of dark commercial-CRM tabs (Dashboard, Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR) BEFORE they see the GovCon tab" (`docs/audits/phase-22g-govcon-buyer-demo-qa.md` §2.4 #7 and §2.10 item #3).

Phase 23B addresses that visual confusion **without** hiding or reordering nav tabs (any such change would break the nav-button tests, the responsive sidebar collapse at 899px, and the keyboard-navigation paths). It instead:

- **Updates the brand sub-label** from `Intelligence Platform` to `GovCon Capture OS` so the very first thing a buyer sees on the brand mark is the GovCon framing.
- **Adds a visible GovCon Mode indicator** at the very top of `tab-govcon` (just inside `.pane-body`, immediately before the existing Outreach OS helper). The indicator carries a Cormorant Garamond italic "GovCon Mode — Capture OS workflow" headline, a civic-ledger sub-label, an oxblood-warn `GovCon` chip, and microcopy that explicitly acknowledges other tabs remain accessible: *"Other business tools (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR, etc.) remain available in the sidebar but this demo focuses on the GovCon capture workflow. SourceDeck does not submit bids, quotes, or government responses; no outreach is sent automatically; human approval is required for every action."*

Phase 23B also addresses Phase 22G §2.10 item #4 ("Demo build signing path so the troubleshooting tour doesn't expose `code object is not signed at all`") with a **documentation-only** signed-demo-build audit. **No signing credentials are added, no notarization is run, no signing claim is made.**

---

## 1. Inputs

### 1.1 Repo evidence (read, not edited)

- `sourcedeck.html` — sidebar nav block (lines 780–827) carries 22+ nav buttons; default active tab is `tab-dashboard` (line 914). Edited only to:
  1. Update the brand sub-label (line 747) from `Intelligence Platform` → `GovCon Capture OS`.
  2. Insert a `<section id="gc-mode-indicator">` block at the top of `tab-govcon`'s `.pane-body` (just before the existing GovCon Outreach OS helper).
- `scripts/release-check.js` — already implements an honest signing posture: *"Refuses to claim a signed/notarized build when the credentials that would have produced one are missing from the environment."* The Phase 23B audit does not change this script.
- `services/release/release-evidence.js` (Phase 17B), `services/release/mac-signing-readiness.js` (Phase 17A), `docs/release/macos-signing-and-notarization.md`, `docs/release/release-evidence.md` — referenced; not edited.
- `docs/audits/macos-signing-release-readiness-audit.md`, `docs/audits/release-artifact-evidence-capture-audit.md` — referenced; not edited.

### 1.2 What was deliberately not done

- **No nav tab hiding.** Removing or hiding Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Daily Ops / Delivery / Create Lead / AI Lead Builder would break:
  - The Phase 22G QA's full-workflow runtime checks that verify each tab is reachable.
  - The responsive sidebar collapse at 899px which assumes a known nav button count.
  - The keyboard-navigation paths that rely on a stable button list.
  - Existing inline `openTab(...)` calls that route deep links between tabs.
  Documented as Phase 23C below.
- **No default-active-tab change** from `Dashboard` to `GovCon`. Changing the default active tab requires verifying every renderer-init path that assumes Dashboard is active on cold open. Out of Phase 23B scope.
- **No new signing credentials.** No `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` added or referenced as present.
- **No notarization run.** The audit documents what the path looks like; it does not execute any step of it.
- **No claim that the macOS build is signed or notarized.** The renderer remains honest: `packaged_unsigned` is the current `release:evidence` state and the audit explicitly says so.
- **No edits to `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js`, `.env*`, `.gitignore`, `reports/`.**
- **No new dependency. No new IPC bridge. No pricing change. No compliance certification claim. No `watsonx-live` claim.**

---

## 2. Navigation polish — what was built

### 2.1 Brand sub-label

`sourcedeck.html` line 747:

```html
<!-- before -->
<div class="brand-ver">Intelligence Platform</div>

<!-- after -->
<div class="brand-ver" id="brand-ver-el">GovCon Capture OS</div>
```

Effect: the sidebar brand mark now reads `SourceDeck / GovCon Capture OS` instead of `SourceDeck / Intelligence Platform`. Buyer's first eye-fixation on the chrome lands on GovCon framing.

### 2.2 GovCon Mode indicator

A new `<section id="gc-mode-indicator" data-section="govcon-mode-indicator">` block inserted at the top of `tab-govcon`'s `.pane-body`, immediately before the existing Outreach OS helper. Contains:

- **Cormorant Garamond italic headline**: *"GovCon Mode — Capture OS workflow"*.
- **IBM Plex Mono civic-ledger sub-label**: *"Active surface · Capture → Solicitation → Vendor + Pricing → Proof + Teaming → Submission readiness"*.
- **Oxblood-warn `GovCon` chip** on the right-hand side.
- **Microcopy** acknowledging other tabs remain accessible AND restating the Phase 22 safety posture: *"Other business tools (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR, etc.) remain available in the sidebar but this demo focuses on the GovCon capture workflow. SourceDeck does not submit bids, quotes, or government responses; no outreach is sent automatically; human approval is required for every action."*

The indicator sits **above** the existing Phase 23A Demo Mode block, the GovCon Outreach OS helper, and the Phase 22B Capture Command Center, so it is the first content a buyer sees inside the GovCon tab.

### 2.3 Tests added

`test/govcon-mode-navigation.test.js` — 17 static + VM-based assertions covering: GovCon Mode indicator + brand sub-label, GovCon tab remains accessible, Phase 23A Demo Mode remains accessible, Phase 22B/22C/22D/22E/22F surfaces remain intact, Response Desk Import Email, SAM Sprint Free=1 NAICS, no System Readiness/Flow, no Send Email / Submit Bid / Submit Quote buttons, no positive signed/notarized claim added, every inline `<script>` block still parses, `.btn-gold` Phase 20G guard preserved. Wired into `npm test`.

---

## 3. Signed demo build path — audit

### 3.1 Current state (truthful)

`npm run release:evidence` reports **`packaged_unsigned`** in this development environment. `node scripts/release-check.js` emits the benign WARN `[release-check] WARN: /Users/.../dist/mac/SourceDeck.app: code object is not signed at all`. That is the honest current posture. There is **no** signed or notarized macOS build available on `main`.

The existing infrastructure already implements honest signing diagnostics — built across Phases 17A (macOS signing readiness) and 17B (release artifact evidence capture):

| Diagnostic | Module | Reports |
|---|---|---|
| `npm run release:mac-signing-readiness` | `services/release/mac-signing-readiness.js` | `unsigned_dev_ok` / `ready_to_sign` / `blocked_missing_signing` |
| `npm run release:mac-signing-readiness:json` | same | machine-readable JSON of the same |
| `npm run release:mac-signing-readiness:strict` | same | exits 1 unless `ready_to_sign` |
| `npm run release:evidence` | `services/release/release-evidence.js` | 7 stable evidence states incl. `packaged_unsigned`, `signing_ready`, `signing_blocked_missing_credentials`, `packaged_signed_verified` |
| `npm run release:evidence:strict` | same | exits 1 unless safe-to-publish |
| `node scripts/release-check.js` | `scripts/release-check.js` | privacy + signing + size gates; refuses to claim signed/notarized without credentials |

**None of this changes in Phase 23B.** The audit only documents what already exists.

### 3.2 What credentials are needed for a signed demo build

Per the existing `docs/release/macos-signing-and-notarization.md`, a signed macOS build requires the following environment variables present **at build time**:

- `CSC_LINK` — path or URL to the Developer ID Application `.p12` certificate.
- `CSC_KEY_PASSWORD` — password for the `.p12`.
- `APPLE_ID` — Apple ID with notarization privileges.
- `APPLE_APP_SPECIFIC_PASSWORD` — app-specific password for that Apple ID.
- `APPLE_TEAM_ID` — Apple Developer Team ID.

These are **not present** in the demo environment and **must not** be added to `main` or to any committed `.env*` file. They must be supplied at build time only.

### 3.3 What must be verified before saying "signed"

A build may be presented as "signed" or "notarized" to a buyer **only after** all of the following return success on the exact artifact being demoed:

1. `npm run release:mac-signing-readiness:strict` → exits 0 with `status: ready_to_sign`.
2. `npm run build:mac` runs against the actual signing-credential-laden environment.
3. `node scripts/release-check.js` passes the privacy + signing + size gates.
4. `codesign --verify --deep --strict --verbose=2 dist/mac/SourceDeck.app` exits 0.
5. `spctl --assess --type execute --verbose dist/mac/SourceDeck.app` returns `accepted`.
6. `xcrun stapler validate dist/mac/SourceDeck.app` returns `validated`.
7. `npm run release:evidence:strict` reports state `packaged_signed_verified`.

If any of those fail, the build is **not** signed/notarized and **must not** be presented as such.

### 3.4 Forbidden language (until step 3.3 is verified)

Demoer must not say or display any of the following until the §3.3 chain of verifications has passed on the exact build being demoed:

- "SourceDeck is signed and notarized."
- "Apple notarized."
- "Production signed."
- "Notarized release."
- "Publicly signed."
- "SourceDeck is signed."
- "SourceDeck is notarized."

Phase 23B introduces zero such claims to the renderer. Test #15 (`no signed / notarized completion claim added by Phase 23B`) statically asserts this.

### 3.5 Safe language (always usable)

- "Local test builds may show unsigned-artifact warnings."
- "Do not present signing/notarization as complete until release-check verifies it."
- "The build you're seeing is an unsigned development build for demo purposes." (verbatim from `docs/demo/phase-22g-govcon-buyer-demo-script.md` §5.3)
- "signing readiness is presence and status only" (verbatim from the same).

### 3.6 What a buyer sees in the demo today

A buyer who opens a signed-release build will not see the unsigned warning. A buyer who opens an **unsigned dev** build sees:

1. On first launch, macOS may show a Gatekeeper warning. The demo script (`docs/demo/phase-22g-govcon-buyer-demo-script.md` §1) already prescribes launching the app **before** the buyer joins so the Gatekeeper dialog never appears in the demo.
2. Inside the app, the **Troubleshooting tab** surfaces release-check output. The Phase 22G demo script (§2.6) explicitly recommends scoping the troubleshooting tour around the **release-evidence panel** rather than the signing report so the unsigned warning is not the focal point.

These mitigations remain operator-driven — Phase 23B does not change either path.

---

## 4. Safety / non-claims

- **No live SAM call. No bid / quote / government-response submission. No portal upload. No email transmission.**
- **No `Send Email` / `Submit Bid` / `Submit Quote` button added.**
- **No auto-send. No auto-submit.**
- **No signed / notarized completion claim added.** Test #15 enforces. The audit explicitly documents the verification chain required *before* such a claim can be made.
- **No FedRAMP / SOC 2 / CMMC / HITRUST / HIPAA / ISO 27001 / government-compliant claim added.**
- **No watsonx-live claim added.**
- **No guaranteed contract / award / revenue / ROI / unlimited-AI claim added.**
- **No nav tab hidden, no nav tab renamed, no nav default-active changed.**
- **No `services/**`, `scripts/**`, `main.js`, `preload.js`, `chartnav-integration.js` touched.**
- **No `.env*` touched. No new dependency. No new IPC bridge.**
- **No pricing changed.**
- **No stashes touched. No branches deleted.**
- **Phase 22B Capture Command Center preserved** (15/15).
- **Phase 22C Solicitation Workspace preserved** (19/19).
- **Phase 22D Vendor Quote Room + Pricing Worksheet preserved** (25/25).
- **Phase 22E Past Performance + Capability + Prime Partner preserved** (24/24).
- **Phase 22F Submission Readiness Gate preserved** (30/30).
- **Phase 23A Demo Mode preserved** (27/27).
- **Renderer boot preserved** (7/7 — every inline `<script>` block parses; 7 inline blocks; no SyntaxError).
- **System Readiness / System Flow tab remains removed** (9/9).

---

## 5. Validation

The following gates passed on the branch HEAD prior to commit:

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
- `npm run release:evidence` — state `packaged_unsigned` (expected; matches the honest signing posture this audit describes)
- `npm run troubleshooting:scan` — critical/high failures: 0
- `npm run govcon:smoke` — PASS
- `npm run phase13:rc-check` — PASS
- `npm run i18n:audit` — 31/31 PASS
- `node scripts/release-check.js` — benign WARN on unsigned local artifact (expected; matches §3.1)

---

## 6. Remaining Phase 23C recommendations

| ID | Recommendation | Why deferred from 23B |
|---|---|---|
| **23C-A** | GovCon Mode primary-nav reorder — physically move the `GovCon` button to the top of the sidebar nav block AND change the default-active-tab from `Dashboard` to `GovCon`. | Requires verifying every renderer-init path that assumes Dashboard is active on cold open + every `openTab(...)` deep-link path. Non-trivial; out of 23B's "no nav break" scope. |
| **23C-B** | GovCon Mode commercial-tab demotion — collapse Lead Generator / Email Tracker / Ad Engine / Socials / Clinical/EHR / Daily Ops / Delivery / Create Lead / AI Lead Builder behind a `Show all` toggle. | Same risk profile as 23C-A; out of 23B scope. |
| **23C-C** | Signed-demo-build CI workflow — a `workflow_dispatch`-only GitHub Actions workflow that runs the full §3.3 verification chain when signing credentials are present in the workflow secrets. **Does not auto-publish.** | Touches `.github/workflows/`; explicit Phase 23B hard rule says no signing claim made and no notarization run. CI scaffolding for a future phase. |
| **23C-D** | Local-only "Export as Markdown" download wired to the Phase 22F Export Placeholder action. Still no submission, still no email — just a portable internal-review artifact. | Carried over from Phase 23A's 23B deferral list; still out of scope. |
| **23C-E** | "Last updated" timestamps per phase section. | Carried over from Phase 23A; still out of scope. |

All five items remain compatible with the Phase 22 safety posture: no auto-send, no auto-submit, no portal upload, no email transmission, no compliance certification claim, no positive signed/notarized claim.

---

## 7. Rollback

Additive. Revert the single phase commit to roll back. Phases 22B-22F + 23A remain intact on `main`. The sidebar brand mark returns to `Intelligence Platform` and the GovCon tab returns to its post-Phase-23A state (Demo Mode block at the top, no Phase 23B indicator above it).
