# Phase 24E — Stakeholder Graph Backend / IPC Readiness Audit

**Date:** 2026-06-08
**Branch:** `docs/phase-24e-stakeholder-graph-contract`
**Base:** `main @ 7fc16dc` (post-PR #85 — Phase 24C; post-PR #84 — Phase 24B; post-PR #83 — Phase 22B).
**Posture:** Read-only inventory. **No runtime, no service, no test, no `package.json`, no `sourcedeck.html` edited.** No backend rewrite recommended.

---

## 1. Executive finding

**READY FOR UI IMPLEMENTATION.**

The Stakeholder Graph backend is fully present, IPC is fully wired, safety constants and FAR-aware posture labels are exposed, and existing service-level tests assert the core safety invariants. **The only missing piece is the renderer UI consumer** — `sourcedeck.html` contains no stakeholder graph surface today. Phase 24E runtime work can implement the UI without any backend extension. Two **optional** UI-side composition gaps are documented in §6 (multi-opportunity rollup, internal-owner role); both are renderer-side aggregation patterns, not backend changes.

---

## 2. Stakeholder Graph backend inventory

### 2.1 Source files

| File | Lines | Role |
|---|---|---|
| `services/govcon/stakeholder-graph.js` | 179 | Canonical implementation. Pure data; no IO, no network, no DOM. |
| `services/stakeholders/index.js` | 27 | Re-export surface so future callers can import from `services/stakeholders` instead of `services/govcon/`. |
| `api/index.js:264-267` | 4 | App-API namespace exposing `api.govcon.stakeholders.forOpp({ opp, extras })`. |
| `main.js:320-321` | 2 | `ipcMain.handle('govcon:stakeholders-for-opp', …)` → `appApi.govcon.stakeholders.forOpp(payload)`. |
| `preload.js:55` | 1 | `window.sd.govcon.stakeholders(payload)` → `ipcRenderer.invoke('govcon:stakeholders-for-opp', payload)`. |

### 2.2 Methods exported

- `buildStakeholderGraph(opp, extras)` — synchronous; returns a frozen object.
- `isInRestrictedWindow(opp)` — boolean; true when an active solicitation has a future response deadline.
- `POSTURE_LABELS` — frozen map of posture → human label.
- `POSTURE_BY_CATEGORY` — frozen map of category → default posture.
- `SAFETY_NOTE` — string; FAR 3.104 + Section L communication-window reminder.

### 2.3 Input payload shape

```js
// Input to buildStakeholderGraph(opp, extras)
{
  opp: {
    noticeId, solicitationNumber,
    noticeType, noticeGroup,                 // 'active_solicitation' | 'pre_rfp_intel' | 'awards' | 'modifications'
    responseDeadline,                        // ISO 8601 string
    agency, subAgency, contractingOffice
  },
  extras: {
    partners: [                              // optional; user-curated teaming candidates
      { role: 'Prime sub', label: '…', name: '…' },
      …
    ]
  }
}
```

### 2.4 Output payload shape

```js
// buildStakeholderGraph(...) returns:
{
  opportunityId: string|null,                 // noticeId || solicitationNumber || null
  nodes: [                                    // frozen array
    {
      role: 'Contracting officer (CO)',
      category: 'contracting_office',         // categories below
      label: 'GSA.PBS contracting office',
      posture: 'restricted',                  // postures below
      postureLabel: 'Restricted. Communications are limited …',
      instructions: 'Use the SAM.gov Q&A mechanism …'
    },
    …
  ],
  safetyNote: 'SourceDeck does not draft or send outreach …',
  postureLabels: POSTURE_LABELS,              // frozen map
  inRestrictedWindow: boolean
}
```

### 2.5 Categories (5)

| Category | Default posture | When emitted |
|---|---|---|
| `contracting_office` | `restricted` | Always; **forced `restricted` when in active solicitation window**, regardless of input. |
| `program_office` | `research_target` | Always emitted twice — once for "Program / mission office" (`research_target`), once for "Small Business Specialist (SBS)" (`outreach_candidate`). |
| `incumbent` | `research_target` | Always emitted ("Likely incumbent · Public-record FPDS award (if any)"). |
| `partner_prime_or_sub` | `outreach_candidate` | One node per `extras.partners[*]`; if `extras.partners` is empty, one placeholder "Potential teaming partner" node. |
| `industry_day` | `engagement_candidate` | Only when `opp.noticeGroup === 'pre_rfp_intel'` OR `noticeType` matches `sources sought` / `industry day`. |

### 2.6 Postures (5)

| Posture | Label (verbatim) |
|---|---|
| `reference_only` | `Reference intelligence only.` |
| `research_target` | `Research target. Approachable through public-record channels and industry days only.` |
| `outreach_candidate` | `Outreach candidate. Standard pre-RFP teaming/capability outreach.` |
| `engagement_candidate` | `Engagement candidate IF allowed by the solicitation and agency.` |
| `restricted` | `Restricted. Communications are limited to the official mechanism named in the solicitation.` |

### 2.7 Persistence model

**None.** The graph is built per-call from the supplied `opp` + `extras`. There is no electron-store key for stakeholder records and no per-opportunity persistence beyond the opportunity record itself (`opportunity-records.js`).

### 2.8 IPC exposure

| Layer | Symbol | Behavior |
|---|---|---|
| Renderer | `window.sd.govcon.stakeholders(payload)` | Async; returns `{ ok, ...graph }` or `{ ok: false, ... }`. |
| Preload | `ipcRenderer.invoke('govcon:stakeholders-for-opp', payload)` | One-way bridge. |
| Main | `ipcMain.handle('govcon:stakeholders-for-opp', (_e, payload) => appApi.govcon.stakeholders.forOpp(payload \|\| {}))` | Synchronous in main; promise out. |
| App-API | `api.govcon.stakeholders.forOpp({ opp, extras })` | Calls `buildStakeholderGraph(payload.opp, payload.extras)`. |

### 2.9 Existing test coverage

| Test file | Stakeholder assertions |
|---|---|
| `test/govcon-core.test.js` | 3 tests under "── stakeholder-graph ──": contracting office is `restricted` in active solicitation window; pre-RFP opp is NOT in restricted window; never produces cold-outreach phrasing. |
| `test/architecture-boundary.test.js` | 2 tests: `services/stakeholders` re-exports `buildStakeholderGraph + safety constants`; `app-api: stakeholders.forOpp returns a graph with the safety note`. |
| **No dedicated** `test/stakeholder-graph.test.js` | — |
| **No UI test** `test/govcon-stakeholder-graph-ui.test.js` | Future Phase 24E test file. |

### 2.10 Banned-phrasing filter (already enforced server-side)

`buildStakeholderGraph` runs a final regex pass over every node and **drops any node whose `label + instructions` matches**:

```
/\b(cold\s+(?:email|call|outreach)|cold[-]?dm|dm\s+the\s+(?:co|cor|contracting))\b/i
```

So even if a future code path passed harmful copy in via `extras.partners`, the server-side filter would drop it. The UI implementation should **trust** the safety filter but **also** scan its own copy for the same patterns to avoid drift.

---

## 3. FAR / compliance posture inventory

### 3.1 What the backend says

| Topic | Backend behavior |
|---|---|
| Contracting officer (CO/CS/PCO) | **Reference only.** Forced to `restricted` posture inside an active solicitation window. Instructions point at the SAM.gov Q&A mechanism. |
| Program / mission office | **Research target.** Approachable through industry days and capability briefings; explicit "Do not pitch in restricted period." |
| Small Business Specialist (SBS) | **Outreach candidate.** "Standard pre-RFP capability outreach is generally appropriate. Confirm any agency-specific guidance before reaching out." |
| Incumbent | **Research target.** Win/loss analysis only via FPDS-NG. |
| Potential prime / sub partner | **Outreach candidate.** "Mutual NDA standard before sharing capability details." |
| Industry-day / Sources-Sought respondents | **Engagement candidate IF allowed.** "Never solicit non-public information." |
| Safety note (always returned) | Cites FAR 3.104 (procurement integrity) and Section L communication instructions. |

### 3.2 Language the UI MUST AVOID

The backend already filters these; the UI must also not introduce them in static copy:

- "DM the CO/COR/contracting officer"
- "cold email/call/outreach"
- "cold-dm"
- "Contact CO"
- "Email COR"
- "Influence buyer"
- "Submit to agency"
- "Send to contracting officer"
- "Guaranteed award"
- "Preferred relationship"
- "Backchannel"
- "Lobby this office"
- "Circumvent competition"
- "Portal upload"
- "Agency submission complete"

### 3.3 Procurement ethics posture

The UI is a **research/planning surface**, not an outreach engine. The buyer's mental model the UI must reinforce:

- *"This shows me who the stakeholders are; I decide what to do about them within the rules."*

The UI must NOT imply:
- That SourceDeck initiates contact.
- That SourceDeck has a relationship with any government official.
- That posture labels confer outreach permission (they describe what *the operator's posture toward the role* should be, not what SourceDeck does).
- That any stakeholder's contact information is being collected or stored beyond what the operator manually enters.

### 3.4 Private/personally sensitive data

- The backend's default nodes use **role-only** labels (e.g., "Likely incumbent · Public-record FPDS award (if any)") — no real person names by default.
- Optional `extras.partners[*].name` / `.label` is operator-supplied.
- There is **no PII collection** in the backend. The UI must continue this — any operator-entered name/email/phone stays local; **never transmitted, never uploaded**.

---

## 4. Risk table

| # | Risk | Severity | Affected file | Mitigation | Phase 24E UI can proceed? |
|---|---|---|---|---|---|
| 1 | UI introduces copy that reads as outreach permission (e.g., "Reach out to the CO") | **HIGH** | future UI in `sourcedeck.html` | Acceptance criteria + safety grep + test assertion that none of the banned phrases appears in the panel slice. | ✅ Yes — bounded by Phase 24E test contract. |
| 2 | UI shows real person names/emails | **HIGH** | future UI | Default to role-only labels; never echo operator-entered email/phone into a "share" / "copy" / "export" action; never call any send/submit/upload IPC. | ✅ Yes. |
| 3 | UI persists stakeholder data to a remote service | **HIGH** | future UI | Per-opp graph is built from in-memory `opp` + operator-curated `extras`; no new electron-store key is required for a basic per-opportunity view. Multi-opp persistence (see §6) must be local-only. | ✅ Yes for per-opp view; multi-opp rollup needs explicit local-only design. |
| 4 | UI mis-renders the "restricted communication window" indicator and lets a buyer assume outreach is OK | **HIGH** | future UI | UI must display `graph.inRestrictedWindow` prominently and use `posture === 'restricted'` styling that visually distinguishes from other postures. Acceptance criteria #6, #7. | ✅ Yes. |
| 5 | UI hardcodes posture labels instead of reading `graph.postureLabels` | **MEDIUM** | future UI | Use `graph.postureLabels[node.posture]` returned by the IPC, not literal strings. If a literal label is shown, the safety filter must match the canonical text. | ✅ Yes. |
| 6 | Account-level rollup is requested (mission Step 4 §B "account/agency stakeholder map") but backend only ships per-opportunity | **LOW** | future UI | UI loops over `window.sd.govcon.opportunities.list()` and calls `stakeholders(opp)` per record, then groups by `opp.agency`. **Pure renderer composition. No backend change.** | ✅ Yes — documented as UI-side aggregation. |
| 7 | Internal-owner role is requested (mission Step 4 §B "internal owner") but backend has no `internal_owner` category | **LOW** | future UI | UI synthesizes an "Internal capture owner" node from the operator's targeting-profile or pursuit-profile (`govcon-pursuit-profile.js` already stores `assignedOwner`-shaped fields). **Pure renderer composition; backend remains unchanged.** Document the synthetic-node pattern in the contract. | ✅ Yes — documented. |
| 8 | Sample/demo content not clearly labeled | **MEDIUM** | future UI | Every sample stakeholder row carries a visible `SAMPLE` chip (matches Phase 22B Operating Rhythm pattern). | ✅ Yes. |
| 9 | UI consumer breaks renderer boot | **MEDIUM** | future UI | Acceptance criteria #19 + the existing `test/renderer-boot.test.js` 7/7 guard. | ✅ Yes. |
| 10 | Sample data leaks a real agency's POC name or email | **HIGH** | future sample data | Sample data contract §3 forbids real person names, emails, phones. Generic role names only. | ✅ Yes. |
| 11 | Phase 24D files are touched in this PR | n/a | Phase 24E PREP scope | This is a docs-only audit phase; the allowed-file list excludes all Phase 24D paths. | ✅ Yes — enforced at scope check. |

**No HIGH-severity risk requires backend changes to proceed.** All HIGH-severity mitigations are enforceable at the UI layer via the existing safety filter, the contract document, the test contract, and the safety grep.

---

## 5. Hard boundary confirmation

The Stakeholder Graph backend already enforces — and the future UI must continue to enforce — the following hard boundaries:

- ❌ **No send.** No code path calls `send`, `sendEmail`, `dispatch`, or `transport`. The renderer panel must add no Send Email button.
- ❌ **No submit.** No `submitBid`, `submitQuote`, `submit-to-agency`. The renderer panel must add no Submit-Bid / Submit-Quote / "Export and submit" control.
- ❌ **No upload.** No portal upload to SAM.gov / PIEE / eBuy / GSA. The renderer panel must declare "No portal upload" in its disclaimer copy.
- ❌ **No improper CO/COR outreach.** Server-side banned-phrasing filter drops any node carrying the forbidden phrases. UI must not reintroduce them in static copy.
- ❌ **No certification claim.** No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized wording is — or may be — added to the Stakeholder Graph surface.
- ❌ **No guaranteed-award / guaranteed-revenue claim.** None present; none allowed.
- ❌ **No private/personally sensitive stakeholder data unless user-provided and local.** Backend defaults to role-only labels. Any operator-entered name/email/phone stays in local storage (no remote sync, no upload, no transmission).

---

## 6. Optional UI-side composition gaps (renderer aggregation, **not** backend changes)

These are documented here so the Phase 24E runtime agent makes an informed choice — **no service edit is needed for either**.

### 6.1 Account/agency stakeholder map (multi-opportunity rollup)

The backend builds the graph **per opportunity**. The mission's Phase 24E UI contract asks for an "account/agency stakeholder map" view. The Phase 24E renderer should compose this view client-side:

```js
// pseudocode
const oppsList = await window.sd.govcon.opportunities.list();
const allGraphs = await Promise.all(
  oppsList.opportunities.map(o => window.sd.govcon.stakeholders({ opp: o }))
);
const byAgency = groupBy(allGraphs.flatMap(g => g.nodes.map(n => ({ ...n, agency: g.agency }))), 'agency');
```

Pure renderer aggregation. No backend extension required.

### 6.2 Internal-owner role

The backend's 5 categories do not include `internal_owner` (the operator's own capture lead, BD owner, or proposal manager). The renderer can synthesize one or more "Internal capture owner" nodes from data already in the operator's pursuit profile (`services/govcon/govcon-pursuit-profile.js`) — these stay on the operator's side and never appear in the FAR-classified backend graph.

The synthetic node pattern:

```js
{
  role: 'Internal capture owner',
  category: 'internal_owner',                // synthetic; NOT one of the backend's 5
  label: profile?.assignedOwner || 'Operator (you)',
  posture: 'internal',                       // synthetic; NOT one of backend's 5
  postureLabel: 'Internal capture planning only.',
  instructions: 'Local capture-team note; never transmitted.',
  synthetic: true                            // marker so tests can filter synthetic vs backend nodes
}
```

The test contract should require the `synthetic: true` flag so the UI can never inadvertently send a synthetic role into a backend-expecting code path.

---

## 7. Files inspected (read-only)

| File | Purpose |
|---|---|
| `services/govcon/stakeholder-graph.js` | Canonical implementation. |
| `services/stakeholders/index.js` | Re-export surface. |
| `api/index.js` (lines 264-267, 26) | App-API stakeholders namespace + example doc comment. |
| `main.js` (lines 320-321) | IPC handler. |
| `preload.js` (line 55) | Bridge function. |
| `sourcedeck.html` | Confirmed: **no stakeholder UI surface exists today.** Read-only inspection only — not edited. |
| `test/govcon-core.test.js` | 3 stakeholder-graph assertions. |
| `test/architecture-boundary.test.js` | 2 stakeholder-graph assertions. |
| `test/govcon-core-hardening.test.js` | Phase 24B + 24C hardening guards (renderer-side only). |
| `docs/product/phase-22a-govcon-feature-opportunity-map.md` (F08, F13) | Original Phase 22A audit identified stakeholder graph UI as F13 (medium-high buyer value). |
| `docs/product/phase-24b-govcon-core-hardening.md` | Confirms backend exists; UI is the missing piece. |
| `docs/product/pricing-source-of-truth.md` | Phase 22A-P canonical pricing. No edit. |

**No file outside this read-only inventory was opened or modified.**

---

## 8. Conclusion

The Stakeholder Graph backend is production-ready, the IPC bridge is wired, FAR-aware safety constants are exposed, and existing service-level tests assert the core invariants. **Phase 24E runtime UI implementation can begin immediately after Phase 24D merges.** No service-layer change is needed; all HIGH-severity risks are bounded by the test contract and safety grep that the Phase 24E acceptance criteria document specifies.

**Decision: READY FOR UI IMPLEMENTATION.**
