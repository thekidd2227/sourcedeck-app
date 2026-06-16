# Phase 25W — SAM.gov Source Materials Contract

How SourceDeck uses the SAM.gov Opportunities API key capabilities to give a
saved pursuit usable source material — without ever exposing the API key.

## SAM.gov API capabilities used
- **Search parameters**: `noticeid`, `solnum`, `title`, `postedFrom`/`postedTo`,
  `ncode` (NAICS), `typeOfSetAside`, `state`/`zip`, `organizationName`/`code`,
  `rdlfrom`/`rdlto`, `limit`/`offset` (search + Refresh Source Details).
- **Response fields preserved on a saved pursuit**: `noticeId`, `title`,
  `solicitationNumber`, `department`/`fullParentPathName`, `postedDate`,
  `responseDeadLine`, `naicsCode`, `typeOfSetAside(Description)`,
  `placeOfPerformance`, `pointOfContact`, `description` (link), `uiLink`,
  `links` (self), `resourceLinks`.

## Link behaviors
- **`description`** is a LINK to the opportunity description endpoint. The text
  is fetched on demand through the credential boundary; the public API key is
  appended **only inside the main process** and is redacted from the returned
  text, errors, and logs. Stored locally per pursuit once fetched.
- **`resourceLinks`** are direct attachment URLs. Shown in Source Materials
  with Open Source and Import to SourceDeck (local intake). api.sam.gov
  resource URLs route through the credential boundary; non-keyed hosts open
  directly. If a download is unsupported, the UI says
  "This file may require opening SAM.gov directly."
- **`uiLink`** may require a SAM.gov login/role and may 404 — the Open SAM.gov
  Notice action warns the user and never relies on it alone.
- **Fallbacks**: `sourceUrl` (key-stripped), then a constructed
  `sam.gov/opp/{noticeId}/view`, then the api self link used only internally.
  If nothing exists: "SAM.gov source link was not included for this record.
  Try Refresh Source Details."

## Credential boundary
- Renderer bridge: `window.sd.govcon.samFetchSource({ url, kind })`.
- IPC: `govcon:sam-fetch-source` → `appApi.govcon.sam.fetchSource`.
- Service: `services/govcon/sam-source-fetch.js` — GET-only; strips any
  incoming `api_key`; appends the stored `sam-gov` key only for api.sam.gov
  hosts; returns `{ ok, status, contentType, text, truncated, sourceUrlSafe }`
  with the key absent from every field; redacts `api_key=…` from returned text
  and errors. Caps returned text at 200 KB.

## Never persisted / never exposed
Raw API key, any URL containing `api_key`, secret headers, hidden credentials.
All stored URLs are api_key-stripped; `originalSAMRecordSafe` is redacted.

## Safety
No upload to SAM.gov / PIEE / eBuy / GSA / portals. No email. No send. No bid /
quote / proposal submission. Source-material intake is local only.
