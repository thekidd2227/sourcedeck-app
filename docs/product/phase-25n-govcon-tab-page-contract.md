# Phase 25N — GovCon Tab Page Contract

**Date:** 2026-06-11
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Buyer screenshots showed the GovCon pane rendering as one long vertical scroll: GovCon Mode banner → Demo Controls → Capture Command Center → Operating Rhythm → Solicitation Workspace → Vendors + Pricing → Past Performance + Capability + Prime → Stakeholder Graph → Submission Readiness → Package Export → Pursuit Profile copy → SAM Sprint card → legacy KPI strip + opportunity table. Everything was visible, all the time, on cold open.

Phase 25N replaces that with a **real tab-page architecture**: each tab opens its own focused panel and other panels stay hidden until selected. The retired "Overview" experience is removed from the active user runtime.

## 2. Tab structure

| # | Tab label              | `data-gc-tab`              | Primary content                                                                          |
|---|------------------------|----------------------------|------------------------------------------------------------------------------------------|
| 1 | **Find Opportunities** *(default)* | `find-opportunities`       | SAM.gov key presence pill · Search SAM.gov / Upload Solicitation / Paste Solicitation Text actions · saved-pursuits preview |
| 2 | Saved Pursuits         | `saved-pursuits`           | List of saved/pursuing opportunities pulled from `sd.govcon.opportunities.list()`        |
| 3 | Solicitation           | `solicitation`             | Surfaces the existing `#gc-sol-workspace` section                                          |
| 4 | Scope                  | `scope`                    | Stub that routes the user to Proposal Workspace → Solicitation intake                    |
| 5 | Vendors + Pricing      | `vendors-pricing`          | Surfaces `#gc-vqr-pricing`                                                               |
| 6 | Past Performance       | `past-performance`         | Surfaces `#gc-pp-cs-pp` + `#gc-stakeholder-graph`                                          |
| 7 | FAR Reference          | `far-reference`            | Advisory reference list (full FAR work lands with the Phase 25I-recovery PR)              |
| 8 | Submission Readiness   | `submission-readiness`     | Surfaces `#gc-sub-gate` (which already contains the package-export sub-section)            |
| 9 | Audit Log              | `audit-log`                | Stub describing local-only audit trail (richer rendering follows)                         |

## 3. Routing model

Every existing GovCon `<section>` carries a `data-gc-tab-page="<tab-id>"` attribute on its opening tag plus an inline `style="display:none"`. `gcTabSwitch(tabId)` toggles `display` on every `[data-gc-tab-page]` inside `#tab-govcon`:

```js
for (var i = 0; i < pages.length; i++){
  pages[i].style.display = (pages[i].getAttribute('data-gc-tab-page') === id) ? '' : 'none';
}
```

Sections that fed the retired Overview — `gc-mode-indicator`, `gc-demo-mode`, `gc-capture-cc`, `gc-operating-rhythm`, the legacy `gc-kpis`/`gc-tbody` strip, the `govcon-pursuit-profile-card` copy block, the `sam-sprint-card` — are routed to `data-gc-tab-page="hidden-internal"`. They stay in the DOM (Phase 23C reachability invariant) but never match a user-facing tab and never appear on cold open.

The Phase 25F scroll-pill bar (`<nav id="gc-section-nav">`) is retired in favor of `<nav id="gc-tab-nav" role="tablist">` with real tab buttons.

## 4. Default landing

The boot hook calls `gcTabSwitch(localStorage['sd.govcon.lastTab'] || 'find-opportunities')`. Cold open lands on **Find Opportunities**. Last active tab is persisted so a return visit restores the user's working tab.

## 5. Find Opportunities surface

- **Heading + key status pill.** *"Search SAM.gov, upload a solicitation, or paste solicitation text to begin."* + presence-only SAM.gov key pill (`#gc-tab-sam-key-status`).
- **Key-missing banner.** Shown when `sd.credentials.status().present['sam-gov']` is falsy. *"SAM.gov key missing. Add it in Setup or Settings → API Keys to enable in-app search. SourceDeck never displays the raw key."*
- **Three intake actions:**
  - `data-gc-find-action="search-sam"` → `gcTabSearchSam()` → `sd.govcon.samSearch({})`.
  - `data-gc-find-action="upload-solicitation"` → opens Proposal Workspace → `pwSolOpenFilePicker()`.
  - `data-gc-find-action="paste-solicitation"` → opens Proposal Workspace → `pwSolTogglePasteArea()`.
- **Saved-pursuits preview.** If saved/pursuing opportunities exist, the tab renders a compact preview table below the actions. Otherwise the empty-state copy stays visible.
- **No raw SAM.gov key input.** Presence-only. The user must add the key in Setup or Settings.
- **No auto-search on page load.** The boot hook only refreshes the key status indicator.

## 6. Safety preserved

- No portal upload · no email send · no bid submission.
- No auto-search.
- Raw key never in DOM.
- Phase 25A no-send / no-submit / no-upload boundary intact.
- Phase 23C reachability invariant: every retired section still has its original id in the DOM.

## 7. Tests

- `test/phase-25n-govcon-tab-pages.test.js`
- `test/phase-25n-govcon-overview-removed.test.js`
- `test/phase-25n-govcon-copy-cleanup.test.js`
- Updated `test/phase-25f-govcon-sections.test.js` (Phase 25N supersession).

`npm test` → 62 PASS suites, 0 FAIL.
