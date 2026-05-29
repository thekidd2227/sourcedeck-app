# SAM.gov Opportunity → Outreach Agent

A SourceDeck product feature for GovCon customers. It finds federal
opportunities closing within a 7- or 30-day window, scores them for fit,
and generates **compliant, draft-only** buyer-outreach emails staged for
human approval.

It is built **on top of** the existing GovCon services — it does not add a
second SAM.gov pipeline, a second scorer, or a second draft engine.

## What it reuses (no duplication)

| Concern | Reused module |
|---|---|
| Opportunity discovery | `services/govcon/sam-search.js` (official SAM.gov v2 API) |
| Fit scoring (0–100) | `services/govcon/middleman-fit.js` (`analyzeMiddlemanFit`) |
| Outreach gating | `services/govcon/outreach-window.js` (`classify`/`guardDraft`) |
| Draft generation | `services/govcon/email-compliance.js` (`draftOfficialEmail`) |
| POC postures | `services/govcon/stakeholder-graph.js` |
| Persistence | `services/govcon/opportunity-records.js` (electron-store) |

The orchestrator is `services/govcon/opportunity-outreach.js`.

## Hard safety policies

- **No auto-send (Phase 1).** No send transport exists anywhere. Every draft
  carries `sendingEnabled: false` and `requiresApproval: true`. SourceDeck
  never contacts anyone — the operator acts manually after review.
- **Human approval required.** Nothing reaches `Approved` status without an
  explicit user action; approval logs `approvedByUser: true` and still does
  **not** enable sending.
- **Restricted-window rule.** For an active/restricted solicitation the agent
  produces an **official Q&A / clarification draft only** (never a cold pitch),
  and the record is flagged **Needs Review**. Capability-introduction drafts
  are produced only for pre-RFP / market-research windows. Contracting
  officers/CORs are never targeted for cold outreach during restricted periods.
- **No certification overclaim.** A draft may mention a certification (SDVOSB,
  VOSB, 8(a), HUBZone, WOSB, EDWOSB, SDB) **only** if it is present in the
  user's profile. Unbacked cert tokens are stripped.
- **No guarantee/endorsement language.** Phrases implying a guaranteed award,
  guaranteed savings, guaranteed response, risk-free results, or government
  endorsement are scrubbed from every draft.

## SAM.gov key storage model

- The key is stored only in the **main process**, encrypted via `safeStorage`
  under the canonical credential service `sam-gov`.
- Set it from the Outreach tab → it routes through
  `window.sd.credentials.set('sam-gov', …)`.
- The **renderer never receives the raw key**. `sam-search` reads it in-process
  via `credentials.get('sam-gov')`. The orchestrator itself never reads keys.

## Demo / mock mode

If no `sam-gov` key is configured, a scan runs in **demo mode** with a small
set of sample opportunities so the feature is fully usable (and testable)
without a live key. A live key switches scans to the real SAM.gov API.

## Daily draft cap

Each scan honors a per-day draft limit (default 25, clamped 1–200). Once the
cap is reached, additional opportunities are scored but left in `Scored`
status; `generateDraft` returns `daily_draft_cap_reached`.

## Closing-window + deduplication

- Only opportunities whose response deadline is in the future **and** within
  the selected 7/30-day window are kept. Past-deadline and beyond-window
  opportunities are excluded.
- Duplicates are removed (by `noticeId`, then `solicitationNumber`).

## Status lifecycle

`New → Scored → Drafted → Needs Review → Approved → Rejected → Bid Target → Archived`

## IPC surface

`window.sd.govcon.outreach.{ scan, generateDraft, setStatus, export }` →
`govcon:outreach-*` (sanitized in `main.js`) → `appApi.govcon.outreach.*`.

## Tests

`test/govcon-opportunity-outreach.test.js` covers no-key demo scan, live-API
normalization/dedup, past-deadline exclusion, 7/30-day windows, scoring,
draft-only + no-autosend + approval-required, restricted-window Q&A-only
behavior, certification/claim scrubbing, the daily cap, status transitions,
and the credential boundary.
