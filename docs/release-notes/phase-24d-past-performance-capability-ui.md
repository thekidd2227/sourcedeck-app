# Release Notes — Phase 24D: Past Performance Library + Capability Statement Studio UI

## What was added

- **Past Performance Library** — added GovCon workflow value framing, a
  visible **Relevance** column in the records table, and value-framing empty
  state copy (*"Add past performance records to strengthen bid/no-bid
  decisions and proposal packages."*).
- **Capability Statement Studio** — added a **Company / contact summary**
  field, clearer **Core competencies / capabilities** and **Past performance
  highlights** labels, a precise internal-review disclaimer, and a
  **local/offline capability import** that parses pasted capability text
  on-device into candidate fields for review.
- **Tests** — new `test/govcon-past-performance-capability-ui.test.js`
  (15 checks), wired into `npm test`.

## Existing services / IPC surfaced (no backend rewrite)

- `services/govcon/past-performance.js` →
  `window.sd.govcon.pastPerformance.{list,save,remove,match}`
- `services/govcon/capability-statement-extractor.js` →
  `window.sd.govcon.operatingProfile.extractCapabilityStatement(input)`

The capability import calls the offline extractor and degrades gracefully
when the desktop bridge is unavailable (manual entry unaffected).

## Buyer story

Past performance now reads as a capture asset that strengthens bid/no-bid
and proposal work; the Capability Statement Studio lets operators draft,
review, and optionally bootstrap capability content from pasted text —
all on-device, all human-reviewed.

## Safety / boundaries

- No Send Email / Submit Bid / Submit Quote / Export-and-submit / portal
  upload controls.
- Capability import is **local/offline only** — no `fetch` / XHR /
  `.post()` / `.upload()`; no network request.
- No live SAM run; no outreach/email send; no bid/quote/proposal submission.
- Internal-review draft posture: *"Internal review draft. SourceDeck does
  not send, submit, upload, or certify this content."*
- No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO / signed-notarized /
  Apple-notarized / guaranteed-award claims.
- System Readiness / System Flow remains removed.
- Pricing source of truth unchanged; no $79 / $349 / $999 in active UI.

## Preserved

- Phase 24B audit log panel (`#gc-audit-log`).
- Phase 24C profile-driven SAM NAICS loader (`#gc-naics-filter`).
- Response Desk no-send boundary, Show All Tools toggle, local-only
  Markdown export, Phase 22B Operating Rhythm.

## Tests / gates

- `govcon-past-performance-capability-ui` — 15/15 PASS
- Full GovCon / Response Desk / SAM Sprint / renderer-boot guard suite — PASS
- `npm test` — green (exit 0)
- `release:evidence`, `troubleshooting:scan`, `govcon:smoke`,
  `phase13:rc-check`, `i18n:audit`, `release-check.js` — PASS

## Next phase

- **Phase 24E — Stakeholder Graph UI Surface.**
