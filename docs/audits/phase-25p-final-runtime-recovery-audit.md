# Phase 25P · Final Runtime Recovery Audit

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Phase 25P consolidates the remaining open runtime work after the Phase 25L → 25O chain landed. The headline finding: **most of the mission was already complete on main** by the time the audit started. Verification + one targeted reconciliation fix.

## 2. Merged baseline on main (pre-25P audit)

| PR | Phase | Status |
|---|---|---|
| #112 | 25L-1 — Sidebar 8 items + Dashboard launchpad | ✅ merged |
| #113 | 25L-2 — Calendar Edit/Delete + ICS help + Settings Calendar Import | ✅ merged |
| #114 | 25L-3 — Response Desk simplification + Email Import boundary | ✅ merged |
| #115 | 25M — SAM key status repair + in-app SAM search + Calendar delete repair + Proposal solicitation intake | ✅ merged |
| #116 | 25N — GovCon tab-page architecture, Overview retired | ✅ merged |
| #117 | 25O — AI Lead Builder scope card | ✅ merged |
| #119 | 25I — FAR Reference + Proposal Word/PDF export | ✅ merged |

`npm test` → 70 PASS · 0 FAIL.
`npm run govcon:smoke` → 47 PASS · 0 FAIL.

## 3. Regression discovered

After GitHub auto-merged PR #115 (Phase 25M) **on top of** PR #116 (Phase 25N), two specific problems landed on main:

1. **Phase 25M `#gc-sam-pipeline` section lacked `data-gc-tab-page`.**
   Phase 25N's `gcTabSwitch(tabId)` toggles `display` only on elements that carry the attribute. The Phase 25M section had no attribute, so it rendered under **every** GovCon tab on cold open — exactly the kind of clutter Phase 25N was built to retire.
2. **Duplicate `<section id="gc-mode-indicator">`.**
   Two copies landed on main after the merge cascade: one hidden-internal (Phase 25N), one fully visible (Phase 25M's re-introduction of the original Phase 23B markup). Duplicate IDs are invalid HTML and `document.getElementById()` returns only the first match, masking the visible second copy from any cleanup pass.

## 4. Phase 25P reconciliation fix

### 4.1 Route `#gc-sam-pipeline` to Find Opportunities

```diff
- <section id="gc-sam-pipeline" class="gc-sam-pipeline" data-section="govcon-sam-pipeline" data-phase-25m="sam-pipeline" style="margin-bottom:18px;…">
+ <section id="gc-sam-pipeline" class="gc-sam-pipeline" data-section="govcon-sam-pipeline" data-phase-25m="sam-pipeline" data-gc-tab-page="find-opportunities" style="display:none;margin-bottom:18px;…">
```

The Phase 25M section now lives on the Find Opportunities tab alongside the Phase 25N `#gc-tab-find-opportunities` intake controls.

### 4.2 Resolve the duplicate `gc-mode-indicator`

Removed the duplicate **visible** copy that came back via the Phase 25M merge. The canonical hidden-internal copy (Phase 25N) gets the original Phase 23B body content restored so existing regression tests (Phase 23B `govcon-mode-navigation`, Phase 23C `govcon-primary-navigation`, Phase 23D `govcon-demo-delivery-polish`) keep their assertions on `Other business tools … remain available in the sidebar` and `GovCon Mode — Capture OS workflow`.

### 4.3 Routing regression test

`test/phase-25p-govcon-section-routing.test.js` asserts:

- `#gc-sam-pipeline` carries `data-gc-tab-page="find-opportunities"` + inline `display:none`.
- **Every top-level `<section>` directly inside `#tab-govcon` carries `data-gc-tab-page`.** Catches any future PR that adds a section without tab routing.
- `gcTabSwitch()` still uses `pages[i].getAttribute('data-gc-tab-page')` — sections without the attribute will render under every tab.

## 5. Safety scan (post-fix)

| Query                                                   | Hits | Status |
|---------------------------------------------------------|-----:|--------|
| `drugs` (stale event data)                              |    0 | ✅     |
| `api_key=…` literals in source                          |    0 | ✅     |
| `raw key=`                                              |    0 | ✅     |
| `Founder@` (preloaded operator data)                    |    0 | ✅     |
| Duplicate `<section id="gc-…">` IDs                     |    0 | ✅     |
| Top-level GovCon `<section>` without `data-gc-tab-page` |    0 | ✅     |
| Visible "GovCon Mode — Capture OS workflow" (outside hidden-internal / comments) | 0 | ✅ |

## 6. Tests + gates after fix

- `npm test` → **71 PASS suites, 0 FAIL** (one new test: `phase-25p-govcon-section-routing`).
- `npm run govcon:smoke` → 47 PASS, 0 FAIL, PASS.
- `npm run troubleshooting:scan` → no fail/warn findings.
- `node scripts/release-check.js` → privacy gate passes.

## 7. Boundaries preserved

- No `.env` touched · no secrets printed · no stashes touched
- No deploy · no public release · no GitHub release
- No portal upload · no email send · no auto-contact
- No legal advice / certified-compliance claim
- Phase 25A no-send / no-submit / no-upload boundary intact
- Phase 23C reachability invariant intact (every preserved `gc-*` id is still in DOM)
- Approved SourceDeck logo unchanged

## 8. Operator handoff

After this PR merges, the rebuild flow is:

```bash
cd ~/sourcedeck-app && \
  git checkout main && \
  git pull origin main && \
  rm -rf dist && \
  npm run pack:mac && \
  bash ~/sd-day0-refresh.sh
```

Then begin fresh Day 0 manual smoke test.
