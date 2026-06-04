# Phase 23D — GovCon Demo Delivery Polish (Audit)

**Date:** 2026-06-04
**Branch:** `feat/phase-23d-govcon-demo-delivery-polish`
**Renderer:** `sourcedeck.html`

## 1. Why this phase exists

Phase 23C made GovCon Capture OS the primary buyer-demo experience.
The next gap was the *delivery* layer of the demo:

- a buyer running through Capture → Solicitation → Quote → Pricing →
  Past Performance / Capability → Submission Readiness has no way to
  walk out with a take-home internal-review artifact;
- nothing in the UI communicates *when* each section was last touched
  — the demo can feel "frozen" without a freshness signal;
- the Phase 22F export was still a placeholder toast.

Phase 23D polishes that delivery layer **without** adding any
submission behavior. The hard rule is unchanged: SourceDeck does not
submit bids, quotes, or government responses, does not upload to any
portal, and does not send email.

## 2. What changed in `sourcedeck.html`

### 2.1 Local-only Markdown export (Phase 22F + Phase 23D)

A new ghost button **"Export Internal Review Markdown"**
(`id="gc-pkg-md-export-btn"`) sits inside the Submission Readiness Gate
package form, alongside the unchanged Phase 22F buttons:

```
[ Build Package Preview ] [ Export Package Placeholder ]
[ Export Internal Review Markdown ] [ Clear Preview ]
```

`gcExportInternalReviewMarkdown()` builds a Markdown payload from the
same in-page form values and `window.localStorage` keys the Phase 22F
preview already reads. The payload is delivered to the user as a
browser **Blob download** via `URL.createObjectURL` + an `<a download>`
anchor click. No `window.sd.invoke`, no `fetch`, no IPC, no network.

The payload structure:

1. `# INTERNAL REVIEW DRAFT — NOT SUBMITTED` header.
2. A no-submit / no-upload / no-email / no-transmit blockquote
   (SourceDeck does not submit, upload, email, or transmit this
   package; no portal upload; no SAM / PIEE / eBuy / GSA interaction;
   no email transmission; no bid, quote, or government response is
   submitted by this surface; final submission requires human review
   outside SourceDeck).
3. **Conditional Demo Mode warning** — when
   `sd.govcon.demoMode.active.v1 === 'true'` OR the Capture board
   contains rows tagged `source: 'phase-23a-demo'`, the payload prepends
   `> **SAMPLE DEMO DATA — Replace before proposal use.**` so a buyer
   cannot accidentally treat the take-home Markdown as proposal-ready.
4. Package metadata (operator-supplied name / solicitation / notes).
5. Included-sections summary using the same checkbox state as Phase 22F
   Build Preview.
6. **Last Updated** local timestamps from Phase 23D (see §2.2).
7. Safety boundaries footer + `END OF INTERNAL REVIEW DRAFT — NOT
   SUBMITTED`.

Filename pattern: `YYYYMMDD-<slug-of-pkg-name>-INTERNAL-REVIEW-DRAFT.md`.

The Phase 22F `gcPkgExportPlaceholder()` action and the "Export Package
Placeholder" label remain so the Phase 22F regression test keeps
passing — the new Markdown export is a *third* delivery action, not a
rename.

### 2.2 Last Updated timestamps

Each of the five GovCon workflow sections grew a small pill in its
header:

```
LAST UPDATED: NOT YET
```

The pill is a `<span class="gc-dd-last-updated" data-gc-dd-section="…">`
in the section's intro block. The five sections:

| `data-gc-dd-section` | Surface | Watched localStorage keys |
| --- | --- | --- |
| `capture-cc` | Capture Command Center | `sd.govcon.captureBoard.v1` |
| `sol-workspace` | Solicitation Workspace + Compliance Matrix + Risk | `sd.govcon.solWorkspace.v1` |
| `vendor-pricing` | Vendor Quote Room + Pricing Worksheet | `sd.govcon.vqr.v1`, `sd.govcon.pricing.v1` |
| `past-perf` | Past Performance + Capability Statement + Prime Partner Finder | `sd.govcon.pp.v1`, `sd.govcon.cs.v1`, `sd.govcon.ppf.v1` |
| `sub-gate` | Submission Readiness Gate | `sd.govcon.subGate.v1`, `sd.govcon.subGatePkg.v1` |

The Phase 23D script:

1. On `DOMContentLoaded`, captures a **baseline signature** for each
   section by reading the watched keys and computing
   `key + ':' + value.length + ':' + first-32-chars`.
2. **Never** stamps a timestamp from this baseline read — cold open
   with persisted data leaves every chip showing `Last updated: Not
   yet`. This satisfies the explicit task-spec rule "Do not fake
   timestamps on cold-open."
3. Polls every 2.5 seconds (and on `window.focus` /
   `document.visibilitychange`) and stamps `new Date().toISOString()`
   for any section whose signature drifted from baseline.
4. Persists the `lastUpdated` map to
   `sd.govcon.demoDelivery.lastUpdated.v1` and renders chips as
   `Last updated: YYYY-MM-DD HH:MM` (local).

The Phase 23A Demo Mode loader rewrites multiple Phase 22 storage
keys → the next poll tick stamps every affected section. Clearing
Demo Mode flips the signatures back → another stamp.

### 2.3 No new IPC, no new permissions

The whole module is browser-only:

- `Blob` + `URL.createObjectURL` + `<a download>` for the file save;
- `window.localStorage` for state I/O;
- `setInterval` + `window.addEventListener` for polling.

No `window.sd.invoke`, no `electron-store`, no `fs`, no `fetch`.

## 3. No-send / no-submit boundary

Phase 23D does NOT change the safety posture:

- the Markdown payload's safety footer reiterates the boundary verbatim;
- the payload's first line is `INTERNAL REVIEW DRAFT — NOT SUBMITTED`;
- when Demo Mode is active, the payload begins with `SAMPLE DEMO DATA
  — Replace before proposal use.`;
- the payload contains no Send Email / Submit Bid / Submit Quote button
  text, no `package submitted` / `bid submitted` / `quote submitted` /
  `government response submitted`, no `auto-send`, no `auto-submit`;
- the export uses *no* network call — verified by the runtime sanity
  harness which captured the Blob payload via a `URL.createObjectURL`
  intercept and counted exactly one `<a>.click()` per export.

## 4. Responsive QA result

The Phase 23D runtime harness exercised three viewports without
redesigning any breakpoint:

- **1440 × 900** (cold open default): GovCon nav primary,
  every workflow section anchor visible, every Last Updated chip
  visible, the new export button visible.
- **900 × 800** (still desktop per the existing media-query guard):
  GovCon nav button visible, GovCon pane visible, Show All Tools
  toggle visible.
- **899 × 800** (the established mobile/collapsed breakpoint): GovCon
  nav button visible, GovCon pane visible. The existing collapse
  behavior is untouched and composes cleanly with the Phase 23C
  `display: '' / 'none'` Show All Tools toggle.

No CSS was added or rewritten. The chips and the new button inherit
the existing flex / wrap container behavior. **Phase 23E-D below**
captures the deferred follow-up — full iPad / small-laptop sweep.

## 5. Show All Tools toggle preservation

Phase 23C's `gcToggleAllTools()` and
`.nav-section[data-other-business-tools]` markup are untouched. The
runtime harness exercised the toggle after Phase 23D loaded and
confirmed all six commercial nav-sections still collapse cleanly.

Toggle-state persistence to localStorage is *not* implemented in
Phase 23D — see **Phase 23E-A** below for the deferred item.

## 6. Phase 23E recommendations

| ID | Recommendation | Why deferred |
| --- | --- | --- |
| 23E-A | Persist Show-All-Tools collapsed state in `localStorage` so a buyer who collapses commercial tools stays collapsed across reloads | Currently the default is Shown on every cold open. Polish, not a buyer-blocker. |
| 23E-B | Add per-section "Last edited by" attribution if/when multi-user state lands | Out of scope for single-operator desktop demo. |
| 23E-C | Optional PDF / DOCX export of the Internal Review Draft (still local-only, no transmission) | Markdown is the lowest-risk format and satisfies the buyer take-home need. PDF/DOCX export would need a wider dependency review. |
| 23E-D | Full iPad / small-laptop responsive sweep including the Phase 23D chips and the new export button | The harness validated 900 / 899 px; the chips inherit existing flex-wrap so they should compose, but a wider device sweep remains deferred. |
| 23E-E | Operator-controlled manual "Mark updated" button on each section header that stamps the chip without requiring a polled signature change | Polling already catches every observed change pattern; the manual control is a quality-of-life polish. |
| 23E-F | Signed-build CI workflow for macOS notarization | Carried forward from Phase 23D-A — `release:check` still warns `code object is not signed at all` in local dev. |

## 7. Files touched

- `sourcedeck.html` — 5 Last Updated chip slots, 1 new Markdown export
  button, 1 new `<script>` block implementing the Phase 23D module.
- `test/govcon-demo-delivery-polish.test.js` — NEW (26 assertions).
- `package.json` — appended new test file to the test chain.
- `docs/audits/phase-23d-govcon-demo-delivery-polish-audit.md` — NEW
  (this file).
- `docs/release-notes/phase-23d-govcon-demo-delivery-polish.md` — NEW.

## 8. Safety-copy preservation (verified)

- Response Desk "never auto-sends, never auto-submits" copy — present.
- SAM Sprint "Free users: 1 NAICS per sprint" copy — present.
- "Drafts only. Human approval required." — present.
- "No portal upload. No SAM / PIEE / eBuy / GSA interaction." — present.
- No Send Email / Submit Bid / Submit Quote button anywhere in the
  renderer or in the Markdown payload.
- No signed / notarized / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST /
  ISO 27001 certification claim.
- Phase 21F removed System Readiness / System Flow tab stays removed.
- Phase 22B-22F GovCon workflow sections intact and visible.
- Phase 23A Demo Mode intact and exposed.
- Phase 23B GovCon Mode indicator + brand sub-label intact.
- Phase 23C primary nav order + default-active = GovCon + Show All
  Tools toggle intact.

## 9. Test + gate status

| Gate | Result |
| --- | --- |
| `node test/govcon-demo-delivery-polish.test.js` | **26/26 PASS** |
| `npm test` (all 51 test files) | PASS |
| `npm run release:evidence` | PASS |
| `npm run troubleshooting:scan` | PASS (auto-repair disabled) |
| `npm run govcon:smoke` | PASS (passes 47, failures 0) |
| `npm run phase13:rc-check` | PASS (passes 16, failures 0) |
| `npm run i18n:audit` | PASS (31/31) |
| `node scripts/release-check.js` | PASS (local-dev signing warn only, expected) |
| Headless chromium runtime DOM sanity (1440 / 900 / 899) | **43/43 PASS** |
