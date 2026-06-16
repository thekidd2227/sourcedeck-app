# Phase 25W — SAM.gov Source Materials Audit

## Problem (confirmed)
1. Saving/pursuing SAM.gov opportunities worked, and Saved Pursuits listed them.
2. "View Source" did not reliably open the source — the row `onclick` referenced
   an out-of-scope `o` variable and silently failed.
3. Saved pursuits did not preserve `description`/`resourceLinks`/`uiLink`, so the
   user could not explore the solicitation, view/download attachments, fetch the
   description, or extract requirements without manual paste.

## Fix
- `_samUpsert` now persists full **api_key-stripped** source metadata:
  `noticeId, solicitationNumber, department/fullParentPathName, naics, setAside,
  postedDate, responseDeadline, placeOfPerformance, pointOfContact, sourceUrl,
  uiLink, descriptionLink, resourceLinks, apiSelfLink, originalSAMRecordSafe,
  savedAt, userStatus`.
- Saved Pursuits rows expose View Details, Open SAM.gov Notice, Source
  Materials, Refresh Source Details, Send to Solicitation Workspace (global
  id-keyed handlers — the View Source scope bug is gone).
- **Fetch Description** and resource **Import** route through the credential
  boundary (`samFetchSource` → `govcon:sam-fetch-source` →
  `services/govcon/sam-source-fetch.js`). The `sam-gov` key is appended only in
  the main process and is redacted from text/errors/logs; the renderer receives
  a key-free `sourceUrlSafe`.
- Solicitation Workspace shows a Source Materials panel and Extract Requirements
  runs against fetched/imported source text + pasted text.

## Key-leak verification
- Service unit test: key appended server-side, absent from `text`,
  `sourceUrlSafe`, and the whole response; echoed key redacted to
  `api_key=REDACTED`.
- Renderer never builds an `api_key` URL; Open actions refuse any URL containing
  `api_key`.
- Safety-scan `api_key` hits in `sourcedeck.html` are strip/redact helpers and
  negative comments only.

## Safety posture
GET-only fetch. No upload / email / send / submission. Local source-material
intake only. No pricing/Stripe/checkout changes. Blank-canvas default
preserved. GovCon Outreach OS remains removed (Phase 25V), re-asserted by a
sentinel test.

## Gates
6 new Phase 25W tests + Phase 25U/25R/25Q regressions + core runtime gates +
`npm test`, `govcon:smoke`, `troubleshooting:scan`, `release-check.js` — all pass.
