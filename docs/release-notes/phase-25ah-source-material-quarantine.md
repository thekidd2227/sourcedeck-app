# Release Notes — Phase 25AH: Source Material Quarantine

## Summary
SourceDeck no longer stores, displays, extracts, or reasons over its own
app-shell / UI / CSS text when a SAM.gov source fetch, resource import, or stale
cache returns a portal / login / error / app-shell HTML page instead of real
solicitation content.

## What changed
- **Shared body/text classifier** (`services/govcon/sam-body-classifier.js`)
  rejects HTML / app-shell / SAM-login / error responses while preserving real
  PDF / ZIP / DOCX / XLSX / legacy-OLE attachments by magic bytes.
- **SAM source fetch** (`services/govcon/sam-source-fetch.js`) gates every body
  through the classifier and a stripped-app-shell-text check before returning
  any text; never leaks keys.
- **Renderer source materials** reject toxic text on save/import (stored as a
  safe `rejected` row, never the raw payload) and never render app-shell text.
- **Fallback extraction & First Impression** consume only sanitized source text
  and never fabricate section content; with no valid text they prompt for a
  package instead.
- **Boot sanitizer + migration** cleans poisoned `localStorage`
  (`sd.govcon.sourceMaterials.v1`, `sd.govcon.solWorkspace.v1`,
  `sd.govcon.firstImpression.v1`), writes the marker
  `sd.govcon.sourceMaterialQuarantine.v1`, and shows one notice:
  > SourceDeck removed contaminated cached source text from a previous session.

## Preserved
Package download, saved pursuits, Solicitation Center, the Phase 25AF extraction
engine, the right-side viewer, Open Local File, and the Phase 25AG preview
hardening (PR #143) are all intact. Valid solicitation text still extracts and
drives the compliance matrix.

## If contamination persists
Run once in DevTools console:
```js
localStorage.removeItem('sd.govcon.sourceMaterials.v1');
localStorage.removeItem('sd.govcon.solWorkspace.v1');
localStorage.removeItem('sd.govcon.firstImpression.v1');
```

## Safety
No `.env`/secrets/key exposure, no SAM search-logic changes beyond poisoned-text
rejection, no send/submit/upload, no pricing/payment changes, no deploy/publish.
