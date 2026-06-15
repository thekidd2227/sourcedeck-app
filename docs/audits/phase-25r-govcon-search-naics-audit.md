# Phase 25R · GovCon Search Merge + NAICS Audit

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Findings

| Surface                                         | Pre-25R                                                       | Post-25R                                          |
|-------------------------------------------------|---------------------------------------------------------------|---------------------------------------------------|
| GovCon → Find Opportunities                     | One section with key status + result-count + Search + intake  | Same section + merged filter row + Find NAICS + Saved NAICS profile + Refresh + Clear filters |
| GovCon Pipeline (`#gc-sam-pipeline`)            | Duplicate SAM search form routed to find-opportunities tab    | Routed to hidden-internal (DOM preserved, never visible) |
| Status line                                     | *"Showing up to N · returned X · last run …"*                  | *"Showing up to N · returned X · visible Y · last run …"* |
| NAICS Finder                                    | Not present                                                    | New modal with 20-sector menu + 16 seeded codes + multi-select + apply + save-as-profile |
| Saved NAICS profiles                            | Not present                                                    | Local-only CRUD; profile selector on Find Opportunities; storage at `govcon.naicsProfiles` / `sd.govcon.naicsProfiles.v1` |

## 2. Safety scan

| Query                                       | Active-UI hits | Status |
|---------------------------------------------|---------------:|--------|
| Duplicate "Search SAM.gov · Save · Pursue" on Find Opportunities | 0 | ✅ |
| Raw key literal in source                   |              0 | ✅     |
| Pre-25Q "Open Saved Pursuits or refresh after saving" copy in active UI | 0 | ✅ |
| Invented NAICS codes (claimed without verified description) | 0 | ✅ |
| Affirmative "guaranteed NAICS classification" / "official NAICS classification" claim | 0 | ✅ |
| `>Submit Bid<` / `>Submit Quote<` / `>Send Email<` | 0 | ✅     |
| Visible Phase labels on Find Opportunities tab |             0 | ✅     |

Boundaries preserved end-to-end: no auto-search on load, no portal upload, no email send, no auto-contact, raw SAM key never in DOM/logs/docs/exports.

## 3. Tests + gates

- `test/phase-25r-govcon-search-merge.test.js`
- `test/phase-25r-naics-finder.test.js`
- `test/phase-25r-saved-naics-profiles.test.js`
- Updated `test/phase-25p-govcon-section-routing.test.js` and `test/phase-25q-sam-result-count-selector.test.js` for supersession
- `npm test` → **78 PASS suites, 0 FAIL**
- `npm run govcon:smoke` → 47 PASS, 0 FAIL
- `npm run troubleshooting:scan` → no fail/warn findings
- `node scripts/release-check.js` → privacy gate passes

## 4. Operator handoff

```bash
cd ~/sourcedeck-app && \
  git checkout main && \
  git pull origin main && \
  rm -rf dist && \
  npm run pack:mac && \
  bash ~/sd-day0-refresh.sh
```

Then verify one canonical SAM search section and saved NAICS profiles.
