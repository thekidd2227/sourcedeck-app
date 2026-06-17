# Phase 25AA — GovCon Local Index Release Notes

## Summary
- Corrected SAM.gov live filter semantics for NAICS, set-aside, place, keyword/title, deadline, limit, and offset.
- Replaced confusing `Keyword only` NAICS behavior with `Apply NAICS`, `Broaden NAICS family`, and `Ignore NAICS`.
- Added a local GovCon opportunity index under app userData.
- Added GovCon Data Index settings and Dashboard status card.
- Added local-first search when the index is fresh, while keeping live SAM.gov search available.

## Safety
- No `.env` changes.
- No secrets printed or stored.
- No raw SAM key display.
- No `api_key` URL leaks.
- No auto-contact, email sending, bid submission, quote submission, proposal submission, or portal upload.
- Metadata indexing only by default.
- Attachments are downloaded only by explicit user action.

## Tests
Added Phase 25AA tests for:
- SAM filter parameters.
- Set-aside mapping.
- Local index schema.
- Daily index scheduler.
- Local index search.
- Index settings.
- Storage safety.
