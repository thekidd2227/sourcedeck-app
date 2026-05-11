# SourceDeck — Web-first architecture roadmap

This document is the migration plan for moving SourceDeck from a
desktop-first Electron app to a **web-first GovCon SaaS platform**
with an optional Electron desktop companion.

It is intentionally not a rewrite. The plan is staged so the
existing Electron app keeps shipping value at every step.

---

## 1. Current architecture (as of this commit)

```
┌──────────────────────────────────────────────────────────────────┐
│  Electron renderer (sourcedeck.html, ~8,500 lines)              │
│  - Direct fetch to api.airtable.com  (Bearer header in renderer) │
│  - Direct fetch to api.apollo.io     (x-api-key in renderer)     │
│  - Direct fetch to api.openai.com    (Bearer header in renderer) │
│  - Direct fetch to api.anthropic.com (x-api-key in renderer)     │
│  - SAM.gov: opens human-search URL OR talks to a Python proxy   │
│    on 127.0.0.1:7779                                            │
│  - Credentials read from localStorage                            │
└──────────────────────────────────────────────────────────────────┘
                          │ contextBridge
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Electron main (main.js + preload.js)                           │
│  - safeStorage-encrypted electron-store for keys.{service}      │
│  - IPC: store-key/get-key/delete-key, store-get/set,            │
│         ai-generate (watsonx + local providers),                │
│         storage-test-put (local + IBM COS),                     │
│         govcon:* (NEW in prior commit)                          │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  services/                                                       │
│   ├── ai/      (watsonx + local providers, audit-wrapped)       │
│   ├── audit/   (500-event ring, secret-redacting metadata)      │
│   ├── config/  (env-driven; never echoes secrets)               │
│   ├── context/ (workspace identity + sensitive-action guard)    │
│   ├── security/(upload validation, sha256, mime/ext checks)     │
│   ├── storage/ (local + IBM COS providers)                      │
│   └── govcon/  (targeting, sam-search, compliance, pre-rfp,     │
│                 past-performance, stakeholder-graph)            │
└──────────────────────────────────────────────────────────────────┘
```

**Findings from the audit:**
- 31 Bearer-header builds in renderer code.
- 18 localStorage credential read/write sites.
- External API surface from the renderer: `api.airtable.com`,
  `api.anthropic.com`, `api.apollo.io`, `api.openai.com`,
  `app.leonardo.ai`, `sam.gov`, plus DNS lookups and a few
  legacy property-management hosts left over from the old positioning.
- Hardcoded `APPROVED_NAICS` list in renderer (real-estate / facilities
  codes — not GovCon-IT).
- No client/API adapter layer; renderer does business logic AND
  network AND UI in one file.
- Audit log exists but renderer surface is `auditSummary` only
  (no list view).

---

## 2. Target architecture

```
┌────────────────────────┐    ┌────────────────────────┐    ┌─────────────────┐
│  /web/  React SPA      │    │  /electron/  shell     │    │  CLI / mobile   │
│  (browser; Tailwind)   │    │  (main + preload +     │    │  (future)       │
│                        │    │   renderer-as-frame)   │    │                 │
└──────────┬─────────────┘    └──────────┬─────────────┘    └────────┬────────┘
           │ HTTP/JSON                     │ IPC                       │
           ▼                               ▼                           ▼
                ┌─────────────────────────────────────────────┐
                │  /api/  createAppApi adapter                │
                │  - single boundary every UI client uses     │
                │  - no Electron imports                      │
                │  - constructed with: store, credentials,    │
                │    audit, fetch, now                        │
                └────────────────────┬────────────────────────┘
                                     │ in-process require
                                     ▼
                ┌─────────────────────────────────────────────┐
                │  /services/  shared, platform-neutral       │
                │  ├── sam/         (search + normalize)      │
                │  ├── compliance/  (matrix generation)       │
                │  ├── stakeholders/(FAR-aware graph)         │
                │  ├── capture/     (pre-rfp + past perf)     │
                │  ├── proposal/    (drafting; scaffold)      │
                │  ├── settings/    (targeting + credentials) │
                │  ├── audit/       (append-only log)         │
                │  ├── ai/          (watsonx + local)         │
                │  └── storage/     (local + IBM COS)         │
                └─────────────────────────────────────────────┘
```

The `/api/createAppApi` adapter is the key piece. It's
constructed with a store + a credential adapter + an audit log,
and it returns a frozen object with the entire SourceDeck app
surface. Today the Electron main process uses it via IPC. A
future Express/Fastify server will mount the same adapter
behind authenticated HTTP routes.

---

## 3. What belongs where

### `/services/` — shared, platform-neutral
- **No** DOM access. **No** Electron imports. **No** globals.
- Pure data in / data out.
- Testable with `node --test` in CI.
- Every existing GovCon module (sam-search, targeting-profile,
  compliance-matrix, pre-rfp, past-performance, stakeholder-graph)
  lives here today via `services/govcon/*` and is re-exported
  from `services/{sam,compliance,stakeholders,capture,settings}/*`.

### `/api/` — adapter boundary
- `createAppApi({ store, credentials, audit, fetchFn, now })`.
- Stable shape, documented in `api/index.js`.
- Never returns a raw credential to the caller.
- Used in-process by Electron main today; will be used over HTTP
  by the web app later.

### `/electron/` — desktop shell
- `main.js`, `preload.js`, `sourcedeck.html`, `chartnav-integration.js`
  (still at repo root in this commit; documented destination is
  `/electron/`).
- `safeStorage`-backed credential adapter.
- Native menu, native notifications, file dialogs, autoUpdater,
  deep protocols.
- IPC handlers that thinly wrap `createAppApi` calls.

### `/web/` — web app target
- Placeholder today. Will house a Vite + React + TypeScript SPA.
- Consumes `/api/` over HTTP.
- Inherits the design tokens from the public `sourcedeck-site` repo.
- First screen target: audit-log UI (it validates the boundary
  end-to-end).

---

## 4. Credential & security risks

| Risk | Severity | Where | Migration |
|---|---|---|---|
| Renderer builds Bearer headers for Airtable PAT | High | `sourcedeck.html` × 14+ | Move into `api.govcon.airtable.*` (next commit) |
| Renderer builds x-api-key headers for Apollo | High | `sourcedeck.html` × 1 | Move into `api.govcon.apollo.*` |
| Renderer builds Bearer for OpenAI / Anthropic | High | `sourcedeck.html` × 4 | Move into `api.ai.*` (existing `services/ai/*` grows beyond watsonx) |
| Credentials stored in `localStorage` | High | `lcc_AT_PAT`, `lcc_APOLLO_KEY`, `lcc_OPENAI_KEY`, `lcc_CLAUDE_KEY` | Replace with IPC-only credential set/status; renderer never sees raw value |
| SAM.gov key path was Python sub-proxy (port 7779) | Medium | `services/govcon/sam-search.js` (NEW) handles natively | Already mitigated this commit |
| Hardcoded `APPROVED_NAICS` | Medium | `sourcedeck.html` line 6976 | Replace with `api.govcon.targeting.get()` |
| Audit log not exposed in UI | Low | `preload.js` exposes `auditSummary` only | `auditList` IPC added in prior commit; UI panel pending |
| No SSO posture | Enterprise blocker | n/a | Backend tier; planned in 60-day band |
| No team workspaces | Enterprise blocker | n/a | Multi-tenant API; planned in 90-day band |
| No central admin / data-export UI | Enterprise blocker | n/a | Ships with `/web/` |

---

## 5. Enterprise blockers

GovCon enterprise buyers will not adopt a desktop-only product.
The following must ship alongside the web migration:

1. **SSO** (Okta / Azure AD / Google Workspace; GCC variants on
   request). Federal Workspace tenants supported on enterprise
   scoping.
2. **Team workspaces** with role-based access (owner / admin /
   analyst / viewer).
3. **Central audit trail** (the existing audit-log is a great
   foundation; web UI panel makes it usable).
4. **Per-tenant credential vault** (the `VaultAdapter` placeholder
   in `services/settings/credentials.js` is the seam).
5. **Custom DPA + security review support** (already documented
   on the `sourcedeck-site` `/federal/` page).
6. **Data export** (CSV, Word, PDF) for compliance matrices and
   capture decks — the matrix generator already produces an
   export-ready shape.

---

## 6. 30 / 60 / 90-day migration roadmap

### Day 0 (this commit)
- Shared services tree + `/api/` adapter built.
- Credential abstraction in place.
- Architecture doc + tests.

### 30 days
- Migrate `main.js` IPC handlers to call `createAppApi` instead
  of importing services directly. IPC shape unchanged.
- Migrate the Airtable + Apollo + OpenAI + Claude code paths in
  `sourcedeck.html` to call `window.sd.<surface>` instead of
  building Bearer headers. Pull the keys from the credential
  adapter at the IPC handler.
- Replace `lcc_AT_PAT`, `lcc_APOLLO_KEY`, `lcc_OPENAI_KEY`,
  `lcc_CLAUDE_KEY` localStorage storage with IPC-only credential
  set/get. Renderer keeps a presence indicator only.
- Move `main.js` / `preload.js` / `sourcedeck.html` /
  `chartnav-integration.js` into `/electron/` and update
  `package.json -> build.files` in the same commit.

### 60 days
- Stand up `/api/server/` (Express or Fastify) that mounts
  `createAppApi` over HTTP with authenticated routes.
- Add a per-tenant credential vault implementation behind
  `VaultAdapter` (Postgres + envelope encryption is fine to
  start; a real KMS comes later).
- Stand up `/web/` (Vite + React + TypeScript). First screen:
  audit-log UI consuming `api.audit.list()`.
- Add SSO middleware (Auth.js or equivalent) — Okta and Azure AD
  first, Google Workspace + GCC variants on customer demand.
- Web app GovCon-tab: opportunity intake, SAM.gov search,
  targeting profile editor.

### 90 days
- Web app reaches feature parity with the Electron tab for the
  GovCon workflow (intake → fit → source deck → matrix →
  stakeholders → proposal scaffold → capture timeline).
- Audit-log export (Splunk / OpenSearch / SIEM forwarders).
- Customer-driven scoping: SOC 2 Type II, FedRAMP Tailored, or
  CMMC Level 2 — opened only when a paying enterprise contract
  requires it (per `sourcedeck-site/federal/`).

---

## 7. Recommended business delivery model

- **Web-first SaaS** is the primary product. Marketing site
  positioning, federal posture page, sample SourceDeck, demo
  walkthrough, qualification form, and resources hub are all in
  place at `sourcedeck-site` and assume the web product.
- **Electron desktop** is an optional companion for power users
  who need offline workflows or local-file integration. The
  desktop shell consumes the same `/api/` adapter (in-process
  today, over HTTP in the 60-day band).
- **CLI / mobile** are downstream possibilities; both can mount
  the same adapter without further architecture work.

---

## 8. How we avoid a risky big-bang rewrite

The discipline that keeps this safe:

1. **Re-export, don't move.** The new `services/sam/`,
   `services/compliance/`, `services/stakeholders/`,
   `services/settings/`, `services/capture/`,
   `services/proposal/` directories re-export from the existing
   `services/govcon/*` implementations. Existing imports keep
   working; new callers use the canonical names.
2. **Credential adapter is additive.** The new
   `services/settings/credentials.js` provides the SAFE path.
   The existing `keys.{service}` electron-store path continues
   to work (the safeStorage adapter uses the same key namespace).
3. **`/api/createAppApi` runs in-process today.** The same
   adapter is what a future HTTP server mounts. We never have to
   choose between desktop and web — both call the same code.
4. **Tests gate the migration.** `test/govcon-core.test.js` (27)
   + `test/architecture-boundary.test.js` (NEW) prove the
   shared services have no DOM/Electron coupling, the credential
   adapter never echoes values, the SAM API key flows through
   the credential adapter, and stakeholder language remains
   FAR-aware.
5. **Renderer migration is per-surface, not all-at-once.** The
   GovCon SAM.gov path migrated first (prior commit). Airtable
   migrates next. Apollo, OpenAI, Anthropic each get their own
   commit. At every step, `npm test` and Electron startup remain
   green.

---

## 9. References

- `services/govcon/*` — current GovCon implementations (live).
- `services/settings/credentials.js` — credential adapter (NEW).
- `api/index.js` — app-API adapter (NEW).
- `electron/README.md` — Electron-shell boundary doc (NEW).
- `web/README.md` — web-app target doc (NEW).
- `test/govcon-core.test.js` — service-level tests.
- `test/architecture-boundary.test.js` — adapter + boundary tests
  (NEW).
- `sourcedeck-site/federal/` — federal posture statement.
- `sourcedeck-site/methodology/` — AI output policy.
