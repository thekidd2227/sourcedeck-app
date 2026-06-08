# Phase 24E — Stakeholder Graph UI Acceptance Criteria

**Date:** 2026-06-08
**Branch:** `docs/phase-24e-stakeholder-graph-contract`
**Companion:** `docs/product/phase-24e-stakeholder-graph-implementation-contract.md`.
**Posture:** Docs-only acceptance criteria + test contract. **No test file created in this PR.** The Phase 24E runtime PR creates `test/govcon-stakeholder-graph-ui.test.js` against this contract.

---

## 1. Acceptance criteria (numbered; each line in the future test file)

Every Phase 24E PR must satisfy ALL 21 acceptance criteria below. The future test file `test/govcon-stakeholder-graph-ui.test.js` MUST add one named test per criterion.

| # | Criterion | Expected verification approach |
|---|---|---|
| 1 | Stakeholder Graph parent section renders inside `#tab-govcon`. | Assert `<section id="gc-stakeholder-graph">` exists; sliced inside `#tab-govcon` pane. |
| 2 | Account/agency stakeholder map renders. | Assert `<div id="gc-stakeholder-by-agency">` (or equivalent) exists inside `#gc-stakeholder-graph`. |
| 3 | Opportunity stakeholder map renders. | Assert `<div id="gc-stakeholder-by-opportunity">` (or equivalent) exists. |
| 4 | Prime/vendor/internal-owner relationships render. | Assert `data-stakeholder-category="partner_prime_or_sub"` AND `data-stakeholder-category="internal_owner"` markers are present on at least one row each in the sample state. |
| 5 | Role labels are clear. | Assert each rendered node has a `role` text node ≥ 3 chars, no empty `role`. |
| 6 | Allowed engagement posture is visible. | Assert each node displays a `data-posture="…"` attribute with one of the 5 backend postures OR the synthetic `internal`. |
| 7 | Prohibited engagement warning is visible when posture is `restricted` OR `graph.inRestrictedWindow === true`. | Assert at least one `[data-stakeholder-warning="restricted"]` element is rendered in the sample state, and its text contains "Restricted communication window" or equivalent. |
| 8 | Sample/demo labels are visible. | Assert `data-or-source="sample"` (or equivalent) is on each sample row AND each row carries a visible `SAMPLE` chip. |
| 9 | Internal capture planning disclaimer is visible verbatim. | Assert the panel slice contains the verbatim string `Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes.` |
| 10 | No Send Email / Submit Bid / Submit Quote button anywhere in the rendered surface. | Re-run the global regression guard: `assert.ok(!/>\s*(?:📧\s*)?Send Email\s*</i.test(HTML))` etc. |
| 11 | No portal upload (positive claim) anywhere in the panel slice. | Negative-assertion check: `upload to (SAM\|PIEE\|eBuy\|GSA)` only appears with leading guard ("does not upload", "no upload"). |
| 12 | No autonomous submission. | Assert no `auto_send: true` / `auto_submit: true` / `submit automatically` / `send automatically` is introduced. |
| 13 | No improper CO/COR outreach language. | Forbidden-phrase grep against the panel slice for the 12 phrases in implementation contract §D. |
| 14 | No unsupported compliance / revenue / signing claims. | `FedRAMP certified`, `SOC 2 certified`, `CMMC certified`, `HIPAA certified`, `HITRUST`, `ISO 27001 certified`, `signed and notarized`, `Apple notarized`, `production signed`, `guaranteed award`, `guaranteed revenue` — none introduced as positive claims. |
| 15 | System Readiness / System Flow remains absent. | Existing `test/remove-system-readiness-tab.test.js` 9/9 still passes; new test re-checks that `data-tab="sysflow"` and `id="tab-sysflow"` are not reintroduced. |
| 16 | Phase 24B audit log panel remains visible. | Re-assert `id="gc-audit-log"` exists inside `#gc-operating-rhythm`. |
| 17 | Phase 24C NAICS profile behavior remains intact. | Re-assert `let APPROVED_NAICS = []` declaration and `gcRenderNaicsFilter()` function still present (Phase 24C 15/15 still passes). |
| 18 | Phase 24D Past Performance / Capability Statement surfaces remain intact. | Re-assert `id="gc-pp"`, `id="gc-cs"`, `id="gc-ppf"` are present. |
| 19 | Renderer boot passes. | Existing `test/renderer-boot.test.js` 7/7 still PASS; every inline `<script>` parses via `new vm.Script(...)`. |
| 20 | `npm test` (full chain) passes — exit 0. | Run the full 55-test chain (now 56 once `test/govcon-stakeholder-graph-ui.test.js` is added). |
| 21 | Safety grep has no active unsafe buyer-facing hits. | Run the safety scan from the Phase 24C PR (forbidden phrases + deprecated pricing + sysflow restoration); all hits in negative-assertion contexts only. |

---

## 2. Future test file: `test/govcon-stakeholder-graph-ui.test.js`

The Phase 24E PR MUST create this file. It MUST be wired into `npm test` (appended to the end of the chain in `package.json`, same pattern as `govcon-operating-rhythm` and `govcon-core-hardening`).

### 2.1 Minimum required assertions

```js
// pseudocode — actual implementation uses node assert + vm patterns
// already established in test/govcon-operating-rhythm.test.js

const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

// Slice the GovCon tab pane for tighter scope.
const PANE_START = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
const PANE = HTML.slice(PANE_START, /* end-of-pane slice */);

// Criterion 1
test('Stakeholder Graph parent #gc-stakeholder-graph exists in #tab-govcon');
// Criterion 2 + 3 + 4
test('Stakeholder Graph contains by-agency, by-opportunity, and partner/internal-owner anchors');
// Criterion 5 + 6
test('each sample row has a non-empty role label and a data-posture attribute');
// Criterion 7
test('at least one restricted-posture warning row is rendered in the sample state');
// Criterion 8
test('every sample row carries data-or-source="sample" and a visible SAMPLE chip');
// Criterion 9
test('Stakeholder Graph parent carries the verbatim internal-capture-planning disclaimer');
// Criterion 10 + 11 + 12 + 13
test('no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload positive claim in the panel');
test('none of the 12 forbidden phrases appears in the panel (Contact CO, Email COR, ...)');
// Criterion 14
test('no FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-notarized / Apple-notarized / production-signed claim');
// Criterion 15
test('System Readiness / System Flow remains removed (sysflow nav + pane both absent)');
// Criterion 16
test('Phase 24B Audit Log panel #gc-audit-log remains intact');
// Criterion 17
test('Phase 24C profile-driven NAICS loader + filter render remain intact');
// Criterion 18
test('Phase 24D Past Performance + Capability + Prime Partner surfaces remain intact');
// Criterion 19
test('every inline <script> block still parses (renderer-boot guard)');
// Criterion 6 / synthetic flag
test('synthetic internal_owner nodes carry the synthetic: true marker (or equivalent renderer attribute)');
// Bridge guard
test('preload.js still pure IPC bridge; window.sd.govcon.stakeholders signature unchanged');
// Audit emission
test('stakeholder-graph render emits a STAKEHOLDER_GRAPH_VIEWED audit event via window.sd.audit?.add (advisory; renderer-only)');
```

The Phase 24E PR can use any equivalent test framework or naming, but every numbered acceptance criterion must map to at least one assertion.

### 2.2 Sentinel sweep

The Phase 24E PR must run AND pass the following BEFORE opening:

| Gate | Expectation |
|---|---|
| `node test/govcon-stakeholder-graph-ui.test.js` (new) | ALL acceptance criteria green |
| `node test/govcon-core.test.js` | 27/27 (stakeholder-graph backend assertions still pass) |
| `node test/govcon-core-hardening.test.js` | 15/15 |
| `node test/govcon-operating-rhythm.test.js` | 23/23 |
| `node test/renderer-boot.test.js` | 7/7 |
| `node test/remove-system-readiness-tab.test.js` | 9/9 |
| `node test/architecture-boundary.test.js` | 22/22 |
| `node test/govcon-primary-navigation.test.js` | 23/23 |
| `node test/govcon-mode-navigation.test.js` | 17/17 |
| `node test/govcon-demo-recording-blockers.test.js` | 32/32 |
| `node test/govcon-submission-readiness.test.js` | 30/30 |
| `node test/response-desk.test.js` | 24/24 |
| `node test/response-desk-email-import.test.js` | 20/20 |
| `node test/default-state-policy.test.js` | 22/22 |
| `node test/sam-opportunity-sprint.test.js` | 62/0 |
| `node test/govcon-opportunity-outreach.test.js` | 28/28 (Phase 24C fix preserved) |
| `npm test` (full chain) | exit 0 |
| `npm run release:evidence` | PASS |
| `npm run troubleshooting:scan` | no fail/warn |
| `npm run govcon:smoke` | 47/47 PASS |
| `npm run phase13:rc-check` | 16/16 PASS |
| `npm run i18n:audit` | 31/31 PASS |
| `node scripts/release-check.js` | privacy gate clean |

---

## 3. Out-of-scope assertions (Phase 24E NOT required to test)

These belong to Phase 24F or later:

- Multi-tenant sync of stakeholder notes.
- Server-side persistence of stakeholder records (none exists today; none added).
- Posture-change automation.
- AI-driven stakeholder discovery.
- Live person-identification.
- Email/phone enrichment.

---

## 4. Manual QA checklist for the Phase 24E PR

The Phase 24E PR's manual QA section must include these steps:

1. Cold-launch the desktop app. Open the **GovCon** tab.
2. Confirm the new Stakeholder Graph section renders between Prime Partner Finder (`#gc-ppf`) and Submission Readiness (`#gc-sub-gate`).
3. Confirm the parent disclaimer is visible: *"Internal capture planning only. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes."*
4. Confirm all six sample stakeholder rows render with visible `SAMPLE` chips and role-only labels.
5. Confirm the **contracting officer** row shows `posture-restricted` styling AND a "Restricted communication window — official Q&A only" warning row.
6. Confirm the **internal capture owner** row carries the synthetic marker (visible attribute or chip) and does NOT match any of the 5 backend categories.
7. Confirm no Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload control exists anywhere in the new section.
8. Confirm the existing Phase 22B Operating Rhythm panels, Phase 24B Audit Log panel, Phase 24C NAICS filter dropdown, and Phase 24D Past Performance / Capability Statement / Prime Partner surfaces are all intact.
9. Verify the Audit Log panel shows a `STAKEHOLDER_GRAPH_VIEWED` event after the panel rendered (advisory; only if the Phase 24E PR wired the audit emission).
10. Verify no `$79 / $349 / $999` deprecated pricing copy is reintroduced anywhere.

---

## 5. Reviewer checklist for the Phase 24E PR

Before approving the Phase 24E PR, reviewer confirms:

- [ ] `services/**` is **unchanged**.
- [ ] `api/index.js` is **unchanged**.
- [ ] `main.js` is **unchanged**.
- [ ] `preload.js` is **unchanged**.
- [ ] `package.json` change is limited to wiring `test/govcon-stakeholder-graph-ui.test.js` into `npm test`.
- [ ] No new dependency added.
- [ ] No `.env`, `.qa/`, video, or screenshot committed.
- [ ] No website-repo file edited.
- [ ] No payment / Stripe / checkout file edited.
- [ ] No deprecated `$79 / $349 / $999` reintroduced.
- [ ] No System Readiness / `sysflow` resurrection.
- [ ] All 21 acceptance criteria green.
- [ ] Full `npm test` chain exits 0.
- [ ] Safety grep clean (acceptable hits in negative-assertion contexts only).
