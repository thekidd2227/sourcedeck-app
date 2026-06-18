# SourceDeck tablet/PWA companion plan

## Executive conclusion

Build the tablet experience as a narrow web/PWA companion over the existing
`createAppApi` boundary. Do not port or rewrite the Electron shell. The first
release should support review, coordination, notes, deadlines, and draft work
that is valuable away from a desk, while Electron remains the controlled tool
for local files and compute-heavy solicitation processing.

This slice hardens the current renderer at tablet widths and defines the
contract for the later authenticated PWA. It does not expose a public server,
move credentials into the browser, or claim desktop feature parity.

## Workflow boundary

| Workflow | Tablet companion | Electron desktop |
|---|---|---|
| Saved pursuits | List, filter, review, update pursuit metadata | Same, plus local package actions |
| Pipeline | Stage, owner, next action, bid/no-bid notes | Same |
| Solicitation | Sanitized summary, sections, risks, forms, manifest status | Download, preview, unzip, and extract packages |
| Deadlines | Review/edit operator-confirmed dates and reminders | Extract candidate dates from source packages |
| Notes | Create/edit tenant-scoped pursuit and coordination notes | Same plus local source excerpts |
| Vendors/partners | Status, assignments, pricing/coordination notes, draft outreach | Local attachments and bulk source review |
| First Impression | Review/edit clarification questions and COR email drafts | Generate from local package text; local copy/export |
| Heavy extraction | Show status and approved results only | OCR, DOCX/PDF parsing, compliance-matrix generation |
| Local delivery | Not available | Package folders, ZIPs, file preview, native open dialogs |

The companion never submits bids, sends outreach, contacts a COR, or presents
draft output as verified. Existing human-review rules remain in force.

## Architecture path

```text
iPad PWA
  -> authenticated HTTPS/JSON routes
  -> tenant + role + revision enforcement
  -> createAppApi({ store, credentials, audit, fetchFn, now })
  -> platform-neutral services

Electron renderer
  -> preload/IPC
  -> the same createAppApi adapter
  -> desktop-only package/file services where authorized
```

The future HTTP layer is an adapter, not a second business-logic stack. It
maps authenticated routes to an allowlist of `createAppApi` methods, validates
payloads, attaches tenant identity, adds revision IDs, and returns sanitized
DTOs. `api/index.js` must remain free of DOM and Electron imports.

## First API allowlist

Existing adapter methods that can support the first companion:

- `govcon.opportunities.list/get/patch/favorite/remove`
- `govcon.deadlines.approve`
- `govcon.clarifications.generate`
- `govcon.communications.draftEmail`
- `govcon.primes.find/draft/memo`
- `audit.list`

Before a PWA ships, add tenant-scoped APIs for pipeline stages, general notes,
vendor coordination, and draft persistence. Do not proxy
`govcon.packages.downloadSolicitationPackage` or local extraction routes to
the tablet. The web surface receives only sanitized package manifest/status
records already associated with an opportunity.

## PWA and security rules

- Backend credentials stay in the server-side credential adapter. No raw keys
  in browser storage, JavaScript bundles, URLs, logs, or API responses.
- Require SSO/session authentication, workspace membership, role checks, CSRF
  protection, request size limits, schema validation, and append-only audit.
- Cache only hashed static shell assets. Do not service-worker-cache API
  responses, solicitation text, notes, drafts, manifests, or user identity.
- Start online-only for mutations. Add offline edits only after records carry
  revision IDs and the UI can resolve conflicts without silent overwrites.
- Return stable safe error codes. Never return filesystem paths or raw rejected
  HTML/app-shell bodies.

## Responsive implementation slice

The Electron renderer now provides the reusable layout baseline:

- 44px minimum touch targets on coarse-pointer tablets.
- 16px form controls on tablets to avoid iPadOS focus zoom.
- Touch-contained horizontal scrolling for wide compliance/pricing tables.
- Content-sized 44px sub-navigation pills after the 899px nav collapse.
- Single-column capture/vendor coordination grids at 768px and below.
- First Impression forced into the real content column after nav collapse.

These rules are deliberately additive and scoped to tablet/coarse-pointer
conditions. Desktop layout and native behavior are unchanged.

## Delivery sequence

1. Ship this responsive hardening and keep Electron as the only runtime.
2. Add an authenticated HTTP facade over the allowlisted `createAppApi`
   methods, with tenant/revision enforcement and contract tests.
3. Scaffold `/web` as a small installable PWA. Start with Saved Pursuits,
   pursuit notes, pipeline status, and deadline review.
4. Add vendor/partner coordination and First Impression draft review.
5. Add sanitized solicitation summaries and package-manifest status after the
   desktop-to-server synchronization contract is explicit.

## Exit criteria for a tablet pilot

- No horizontal page overflow at 1180x820, 1024x768, 900x768, and 768x1024.
- Every primary action and navigation control has a 44px touch target.
- Saved pursuits, pipeline, deadlines, notes, vendors/partners, and First
  Impression drafts work without local filesystem access.
- Package download, local preview, ZIP creation, and heavy extraction remain
  unavailable in the PWA and clearly direct the operator to Electron.
- Browser storage and service-worker caches contain no credentials or source
  material; all writes are tenant-scoped, audited, and conflict-aware.
