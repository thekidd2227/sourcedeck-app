# Phase 23C — GovCon Primary Navigation Reorder + Show All Tools Toggle (Audit)

**Date:** 2026-06-04
**Branch:** `feat/phase-23c-govcon-primary-navigation`
**Renderer:** `sourcedeck.html`

## 1. Why this phase exists

Phase 23B (PR #68) introduced the GovCon Mode indicator and brand
sub-label so the product *looked* like GovCon Capture OS when a buyer
opened the GovCon tab. It did **not** change navigation order:
Dashboard remained the cold-open default and GovCon was visually buried
inside the Workflow group. Phase 23C makes GovCon the primary buyer
experience — the first tab a buyer sees on cold open and the first
nav-section in the sidebar — while preserving every commercial tool
that shipped in prior phases.

The goal is *visual demotion only* of the commercial tabs. Phase 23C
must not delete tabs, orphan panes, break keyboard reachability, break
the 899px responsive collapse, or alter the Phase 21F/22B-22F/23A/23B
GovCon surfaces.

## 2. What changed in `sourcedeck.html`

### 2.1 Sidebar nav-section reorder

The sidebar's first nav-section is now `#nav-section-govcon-primary`
with the separator label **"GovCon Capture OS"** and three nav buttons:

| `data-tab` | Surface |
| --- | --- |
| `govcon` | GovCon Capture OS (Phase 22B-22F + 23A/23B) |
| `outreach` | GovCon Opportunity Outreach OS |
| `primes` | Prime Partner Finder |

Immediately below the GovCon group is a new nav-section
`#nav-section-show-tools-toggle` containing the **"Show All Tools — Shown / Hidden"**
toggle button (Phase 23C; see §2.3).

After the toggle, seven non-GovCon nav-sections are tagged with the
`data-other-business-tools` attribute and re-labeled with the
**"Other business tools · X"** prefix so the buyer sees an unambiguous
separation between the primary GovCon experience and the legacy
commercial tooling:

| nav-section id | Label |
| --- | --- |
| `nav-section-operations` | Other business tools · Operations |
| `nav-section-alerts` | Other business tools · Alerts |
| `nav-section-workflow` | Other business tools · Workflow |
| `nav-section-tools` | Other business tools · Tools |
| `nav-section-client` | Other business tools · Client |
| `nav-section-intelligence` | Other business tools · Intelligence |
| `nav-capabilities` (Healthcare) | Other business tools · Healthcare *(display:none unless capability flag set — Phase 11 behaviour preserved)* |

### 2.2 Default-active tab swap (Dashboard → GovCon)

- `<button class="nav-btn active" data-tab="govcon">` (was Dashboard)
- `<div class="tab-pane active" id="tab-govcon">` (was `#tab-dashboard`)
- Renderer init (DOMContentLoaded block) now defaults to `'govcon'`:
  - `let tab='govcon';` (was `'dashboard'`)
  - `localStorage.getItem('lcc_active_tab')||'govcon'`
  - missing-pane fallback now `tab='govcon'`

Returning users who had explicitly selected another tab continue to
land on that tab — the `lcc_active_tab` localStorage key still takes
priority. **First-time / fresh-profile users** (and the buyer demo
environment, which has no localStorage state) cold-open into GovCon.

### 2.3 "Show All Tools" toggle (Phase 23C)

A new sidebar button (`#gc-show-all-tools-btn`) calls
`gcToggleAllTools()` to flip every `.nav-section[data-other-business-tools]`
between `display:''` and `display:'none'`. The button text reads
**"Other business tools — Shown"** by default (Shown swaps to
Hidden when collapsed). The GovCon primary nav-section and the
toggle itself are **never** hidden by the toggle.

Visibility-only semantics:
- No nav button or `.tab-pane` is removed from the DOM.
- Toggling is purely a `style.display` change on six DOM nodes.
- Keyboard tab order, ARIA wiring, and the 899px responsive collapse
  remain untouched.

## 3. Whether GovCon became the default tab

**Yes — confirmed.** The Phase 23C runtime visual-sanity harness
(`/tmp/phase23c-visual-sanity.mjs`, NOT committed) navigated a fresh
chromium context to `sourcedeck.html` with a stub `window.sd` preload
and verified:

- the first nav-section inside `.sidebar` is `#nav-section-govcon-primary`
- the cold-open active pane is `#tab-govcon` (not `#tab-dashboard`)
- the GovCon pane is visible without any click
- the Phase 23A Demo Mode block and Phase 23B GovCon Mode indicator
  are both visible inside the GovCon pane
- no `SyntaxError` / `ReferenceError` / `TypeError` appears in
  console or `pageerror` events

Static + VM-based parse via `test/renderer-boot.test.js` is also green
(7/7). The renderer-boot static test exercises every inline `<script>`
block in the file via `vm.Script` and would have flagged any parse
regression introduced by the Phase 23C edits.

## 4. How commercial tools remain reachable

All 21 commercial nav buttons + 21 commercial tab-panes remain in the
DOM. The Phase 23C regression test
(`test/govcon-primary-navigation.test.js`) asserts the full enumerated
list survives:

```
cmd, dashboard, leads, revenue, email, overdue, reply, content,
dailyops, socials, createlead, aigenerate, settings, delivery,
govcon, outreach, primes, command, opportunities, dealwork,
pipeline, execution, proof, clinical
```

Buyer-side reachability paths:

1. **Default visible:** the "Show All Tools" toggle defaults to
   **Shown**, so every commercial section is visible on cold open;
   the buyer can click any tab immediately.
2. **Collapsed mode:** when the buyer collapses commercial tools, the
   six `data-other-business-tools` sections are hidden via `display:none`
   but the underlying DOM is intact — clicking the toggle once
   re-expands them.
3. **Keyboard tabbing:** because the toggle is `display:''` /
   `display:'none'` (not `visibility:hidden`), hidden sections are
   correctly removed from the tab order when collapsed and re-added
   when expanded — no orphaned focus states.

The runtime harness verified the end-to-end flow:
toggle → all 6 sections hidden → GovCon still visible → toggle
again → all 6 sections shown → click Dashboard → `#tab-dashboard`
becomes the active pane.

## 5. Risky nav changes — none deferred

Phase 23C took the full default-tab swap, which the spec marked as
optional-if-safe. It did NOT regress renderer boot, so deferring was
unnecessary. There are no risky nav changes deferred to Phase 23D.

## 6. Phase 23D recommendations

| ID | Recommendation | Why deferred |
| --- | --- | --- |
| 23D-A | Signed-build CI workflow for macOS notarization | `release:check` still warns "code object is not signed at all" in local dev; production releases must run through a CI signing job before public distribution. Out-of-scope for a navigation reorder. |
| 23D-B | Local-only Markdown export of the buyer-demo session (current GovCon pane state) so a buyer can take notes home | UX/export work, not navigation. |
| 23D-C | "Last updated" timestamps inside the Phase 22B Capture Command Center cards so demo data feels live without enabling live SAM polling | Phase 22B polish, not nav. |
| 23D-D | Validate the 899px responsive sidebar collapse under the new GovCon-primary layout on iPad and small laptop viewports | Runtime visual sanity was done at 1440×900 only; full responsive sweep deferred. |
| 23D-E | Persist Show-All-Tools collapsed state in `localStorage` so a buyer who collapses commercial tools stays collapsed across reloads | Currently the default is Shown on every cold open. Adding persistence would let buyers self-curate a stripped-down view. |
| 23D-F | Add a keyboard shortcut (e.g. `g` `g` while in the sidebar) to focus the GovCon nav button | Discoverability polish; not required for the buyer-demo cold open path. |

## 7. Files touched

- `sourcedeck.html` — sidebar reorder, default-active swap, init
  fallback swap, Show All Tools toggle script
- `test/govcon-primary-navigation.test.js` — NEW (23 assertions)
- `package.json` — appended new test file to the test chain
- `docs/audits/phase-23c-govcon-primary-navigation-audit.md` — NEW (this file)
- `docs/release-notes/phase-23c-govcon-primary-navigation.md` — NEW

## 8. Safety-copy preservation (verified)

- "Drafts only. Human approval required." — present
- "Response Desk never auto-sends, never auto-submits" — present
- "No portal upload. No government-response submission." — present
- SAM Sprint "Free users: 1 NAICS per sprint." — present
- No Send Email / Submit Bid / Submit Quote button anywhere
- No signed/notarized / FedRAMP / StateRAMP / HIPAA certification claim
- System Readiness / System Flow tab remains removed (Phase 21F)
- Phase 22B-22F GovCon Capture OS surfaces all intact (anchors
  `#gc-capture-cc`, `#gc-sol-workspace`, `#gc-vqr`, `#gc-pricing`,
  `#gc-pp`, `#gc-cs`, `#gc-ppf`, `#gc-sub-gate` all verified
  present and visible)
- Phase 23A Demo Mode + Phase 23B GovCon Mode indicator both
  preserved and visible inside the now-default GovCon pane

## 9. Test + gate status

- `node test/govcon-primary-navigation.test.js` — **23/23 PASS**
- `npm test` — **all 50 test files PASS**
- `npm run release:evidence` — PASS
- `npm run troubleshooting:scan` — PASS (auto-repair disabled)
- `npm run govcon:smoke` — PASS (failures: 0)
- `npm run phase13:rc-check` — PASS (failures: 0)
- `npm run i18n:audit` — PASS (31/31)
- `npm run release:check` — PASS *(local-dev signing warn only;
  expected in this environment)*
- Runtime visual sanity (chromium, headless, 1440×900) — **36/36 PASS**
