# Release Notes — Phase 25W: SAM.gov Source Materials

## Summary
Connects saved SAM.gov pursuits to their real source material so the user can
open the notice, view/download attachments, fetch the description, and extract
requirements — all through the credential boundary, with the API key never
exposed.

## Highlights
- Saving/pursuing a SAM.gov result now preserves `descriptionLink`,
  `resourceLinks`, `uiLink`, `sourceUrl`, `pointOfContact`, and full
  (api_key-stripped) source metadata.
- Saved Pursuits gains a **Source Materials** panel with View Details, Open
  SAM.gov Notice, Refresh Source Details, and Send to Solicitation Workspace.
  (Fixes the broken "View Source" button.)
- **Fetch Description** downloads the SAM.gov description through the credential
  boundary; the key is appended only in the main process and redacted
  everywhere else.
- **Resource links / attachments** render with Open Source and Import to
  SourceDeck (local intake only).
- **Solicitation Workspace** shows source materials for the linked pursuit and
  **Extract Requirements** runs against fetched/imported source text + pasted
  text — no more "paste-only".
- GovCon Outreach OS stays removed (re-asserted by a sentinel test).

## Safety
- No `.env` changes. No secrets printed. No raw SAM key display. No `api_key`
  in URLs/logs.
- No auto SAM search on load. No email. No vendor/agency auto-contact.
- No bid/quote/proposal submission. No portal upload. Local source-material
  intake only.
- No pricing source change. No checkout/payment change.

## Tests / gates
6 new Phase 25W tests wired into `npm test`; Phase 25U/25R/25Q regressions and
core runtime gates pass; `govcon:smoke`, `troubleshooting:scan`,
`release-check.js` pass.

## Next
Merge when green, rebuild app package, refresh Day 0 package, then manually
verify Saved Pursuits source materials and Extract Requirements from linked
SAM.gov source.
