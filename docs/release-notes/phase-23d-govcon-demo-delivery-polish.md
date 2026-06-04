# Phase 23D — GovCon Demo Delivery Polish

**Release date:** 2026-06-04
**Branch:** `feat/phase-23d-govcon-demo-delivery-polish`

## What's new

A buyer running through the GovCon Capture OS workflow can now:

- see **Last Updated** chips on every workflow section so the demo
  doesn't feel "frozen" and the buyer can tell which area was touched
  most recently; and
- download a **local-only Internal Review Markdown** of the package —
  a take-home `.md` artifact summarizing every included section, the
  Last Updated timestamps, and the safety boundary copy.

### Local-only Markdown export

A new ghost button **"Export Internal Review Markdown"** sits in the
Submission Readiness Gate package form, alongside the existing
Phase 22F Build Package Preview and Export Package Placeholder
actions. Clicking it triggers a browser Blob download of an `.md`
file. Filename pattern:
`YYYYMMDD-<slug-of-pkg-name>-INTERNAL-REVIEW-DRAFT.md`.

Every payload begins with `INTERNAL REVIEW DRAFT — NOT SUBMITTED` and
ends with `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`. The payload
includes:

- a no-submit / no-upload / no-email / no-transmit safety blockquote;
- a **conditional SAMPLE DEMO DATA — Replace before proposal use.**
  warning when Phase 23A Demo Mode is active;
- operator-supplied package metadata;
- included-section summaries (advisory counts only);
- Phase 23D Last Updated timestamps;
- a safety boundaries footer.

The export is purely a browser Blob download. **No `window.sd.invoke`,
no IPC, no `fetch`, no network call.** Nothing is sent, uploaded,
emailed, or transmitted.

### Last Updated chips

Each of the five GovCon workflow sections grew a small monospace pill
in its header:

| Section | Watched localStorage |
| --- | --- |
| GovCon Capture Command Center | `sd.govcon.captureBoard.v1` |
| Solicitation Workspace | `sd.govcon.solWorkspace.v1` |
| Vendor Quote Room + Pricing Worksheet | `sd.govcon.vqr.v1`, `sd.govcon.pricing.v1` |
| Past Performance + Capability + Prime Partner | `sd.govcon.pp.v1`, `sd.govcon.cs.v1`, `sd.govcon.ppf.v1` |
| Submission Readiness Gate | `sd.govcon.subGate.v1`, `sd.govcon.subGatePkg.v1` |

On cold open every chip reads **"Last updated: Not yet"** — Phase 23D
captures a baseline signature on `DOMContentLoaded` and does NOT
stamp a timestamp at that moment. Persisted-from-prior-session data
keeps the chip at "Not yet" until a real edit happens this session,
honoring the spec rule "Do not fake timestamps on cold-open."

A polling loop (every 2.5 s + on `focus` / `visibilitychange`) detects
real localStorage changes and stamps `Last updated: YYYY-MM-DD HH:MM`
(local). Phase 23A's `Load Sample GovCon Demo Data` writes to several
storage keys → the next poll tick stamps every affected section.

The `lastUpdated` map persists at
`sd.govcon.demoDelivery.lastUpdated.v1`.

### Preserved (verified)

- All 21 commercial nav buttons + 21 commercial tab-panes remain in
  the DOM (Phase 23C).
- GovCon remains the primary nav section + the cold-open active tab
  (Phase 23C).
- Show All Tools toggle remains visible and operational (Phase 23C).
- Phase 22B Capture Command Center, 22C Solicitation Workspace +
  Compliance Matrix, 22D Vendor Quote Room + Pricing Worksheet,
  22E Past Performance + Capability Statement + Prime Partner Finder,
  22F Submission Readiness Gate + Package Export — all intact.
- Phase 23A Demo Mode (Load / Clear sample) — intact and visible
  inside the now-default GovCon pane.
- Phase 23B GovCon Mode indicator + brand sub-label "GovCon Capture
  OS" — intact.
- Phase 21F removed System Readiness / System Flow tab — remains
  removed.
- Phase 20G `.btn-gold` guard — preserved.
- 899 px responsive sidebar collapse — untouched (validated at 900
  and 899 in the runtime harness).
- Response Desk remains draft-only: never auto-sends, never
  auto-submits, never dispatches email.
- SAM Sprint Free=1 NAICS — preserved.

### Safety boundaries (unchanged)

- SourceDeck still **does not submit bids, quotes, or government
  responses.** There is no Send Email, Submit Bid, or Submit Quote
  button anywhere in the renderer **or** in the Markdown payload.
- No portal upload. No SAM / PIEE / eBuy / GSA interaction.
- No email transmission.
- No signed / notarized completion claim.
- No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001
  certification claim.

## Migration notes

- No data migrations. No schema changes. No new IPC channels.
- Returning users: Last Updated chips will read "Not yet" on the
  first boot after upgrade until a real edit fires the poll.
- The new `sd.govcon.demoDelivery.lastUpdated.v1` localStorage key is
  client-only and safe to clear.

## What's deferred to Phase 23E

- **23E-A** Persist Show-All-Tools collapsed state in localStorage.
- **23E-B** "Last edited by" attribution (multi-user-aware).
- **23E-C** Optional local PDF / DOCX export.
- **23E-D** Full iPad / small-laptop responsive sweep including the
  Phase 23D chips and the new export button.
- **23E-E** Operator-controlled manual "Mark updated" per section.
- **23E-F** Signed-build CI workflow for macOS notarization.

## Verification

- `npm test` — all 51 test files PASS
- `node test/govcon-demo-delivery-polish.test.js` — **26/26 PASS**
- `npm run release:evidence` — PASS
- `npm run troubleshooting:scan` — PASS
- `npm run govcon:smoke` — PASS (passes 47, failures 0)
- `npm run phase13:rc-check` — PASS (passes 16, failures 0)
- `npm run i18n:audit` — PASS (31/31)
- `node scripts/release-check.js` — PASS (local-dev signing warn only)
- Headless chromium runtime DOM sanity — **43/43 PASS**

See `docs/audits/phase-23d-govcon-demo-delivery-polish-audit.md` for
the full audit including the runtime harness assertions.
