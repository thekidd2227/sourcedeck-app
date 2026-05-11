# Renderer credential migration

This doc tracks the migration of credential-bearing API calls out of
`sourcedeck.html` and into the main-process `createAppApi` surface
that landed in commit `aaa7dcf`.

The goal is to remove **all** Bearer-header building and localStorage
credential storage from the renderer so the same code can later run
in a browser-based web app without leaking secrets.

---

## 1. Status by API (after Airtable migration)

| API | Renderer status | Where the credential lives |
|---|---|---|
| **Airtable PAT** | ✅ **Migrated** (commit pending). 0 direct fetches, 0 Bearer header builds. | `safeStorage` via `window.sd.credentials.set('airtable', ...)` |
| Apollo key | ⏳ Not migrated. 1 direct `x-api-key` build. | `lcc_APOLLO_KEY` in localStorage |
| OpenAI key | ⏳ Not migrated. 4 Bearer builds. | `lcc_OPENAI_KEY` in localStorage |
| Anthropic / Claude key | ⏳ Not migrated. 2 `x-api-key` builds. | `lcc_CLAUDE_KEY` in localStorage |
| SAM.gov key | ✅ Already migrated (commit 90cc04f). | `safeStorage` via `keys.sam-gov` |

### Renderer surface counts (refresh with `grep -cE`)

| Pattern | Pre-migration | Post-migration (this commit) |
|---|---|---|
| `fetch('https://api.airtable.com/...` direct calls | 27 | **0** |
| `'Bearer '+AT_PAT` header builds | 14+ | **0** |
| `lcc_AT_PAT_OVERRIDE` localStorage write sites in renderer | 1 | **0** (1-time-migration read still present in `loadSettings()`, then `removeItem()`) |
| `lcc_APOLLO_KEY` / `lcc_OPENAI_KEY` / `lcc_CLAUDE_KEY` writes | 1 each | unchanged (next migration step) |
| `sdAirtableFetch(` call sites | 0 | **33** |

Summary: **31 renderer-side Bearer-header builds, 4 distinct
localStorage credential keys, 18 read/write sites.**

---

## 2. Migrated paths (this commit)

The new `window.sd` surface gives the renderer safe entry points
that route through `main.js -> createAppApi -> services/*` with the
credential pulled from `safeStorage` at call time.

### Migrated to safe IPC

| Renderer call (old) | Replacement (new) |
|---|---|
| `fetch('https://api.airtable.com/v0/{baseId}/{table}', { headers: { Authorization: 'Bearer ' + AT_PAT } })` | `await window.sd.airtable.listRecords({ baseId, tableRef, query })` |
| `fetch('https://api.airtable.com/v0/.../', { method: 'POST', headers: { Authorization: 'Bearer ' + AT_PAT, 'Content-Type': 'application/json' }, body: JSON.stringify({ records:[{ fields }] }) })` | `await window.sd.airtable.createRecord({ baseId, tableRef, fields, typecast })` |
| `fetch('.../{recordId}', { method: 'PATCH', ... })` | `await window.sd.airtable.updateRecord({ baseId, tableRef, recordId, fields })` |
| `fetch('.../{recordId}', { method: 'DELETE', ... })` | `await window.sd.airtable.deleteRecord({ baseId, tableRef, recordId })` |
| `fetch('https://api.apollo.io/api/v1/organizations/enrich', { headers: { 'x-api-key': APOLLO_KEY } })` | `await window.sd.enrichment.enrichOrganization({ organization_domain })` |
| `fetch('https://api.apollo.io/api/v1/mixed_people/search', ...)` | `await window.sd.enrichment.searchPeople({ titles, organization_domain, ... })` |
| `fetch('https://api.openai.com/v1/chat/completions', { headers: { Authorization: 'Bearer '+OPENAI_KEY } })` | `await window.sd.ai.generate({ provider:'openai', userMessage, systemPrompt, maxTokens })` |
| `fetch('https://api.anthropic.com/v1/messages', { headers: { 'x-api-key': CLAUDE_KEY } })` | `await window.sd.ai.generate({ provider:'anthropic', userMessage, systemPrompt, maxTokens })` |

### Credential storage

| Old | New |
|---|---|
| `localStorage.setItem('lcc_AT_PAT', value)` | `await window.sd.credentials.set('airtable', value)` |
| `localStorage.getItem('lcc_AT_PAT')` (presence check only) | `(await window.sd.credentials.status()).present.airtable` |
| `localStorage.removeItem('lcc_AT_PAT')` | `await window.sd.credentials.remove('airtable')` |
| Same pattern for `lcc_APOLLO_KEY` → `'apollo'` | same |
| Same pattern for `lcc_OPENAI_KEY` → `'openai'` | same |
| Same pattern for `lcc_CLAUDE_KEY` → `'anthropic'` | same |

**Renderer can no longer fetch the value back.** That is intentional —
it is the point of the boundary. Settings UI should treat each
credential as a write-only field with a presence dot.

---

## 3. Remaining direct-fetch / Bearer-header sites

These remain in `sourcedeck.html` and will migrate in subsequent
commits. They are **not** broken — they continue to work via the
legacy `localStorage` + Bearer-build path. The migration is
per-call so a regression in one cell doesn't take the GovCon tab
down.

| File:line (approx) | API | Replacement target |
|---|---|---|
| `sourcedeck.html:2387` | Airtable `listRecords` (legacy GovCon table) | `window.sd.airtable.listRecords` |
| `sourcedeck.html:2440` | Apollo `enrich` | `window.sd.enrichment.enrichOrganization` |
| `sourcedeck.html:3464,3737` | Airtable `createRecord` / `update` (deal table) | `window.sd.airtable.createRecord/update` |
| `sourcedeck.html:3974` | OpenAI chat completion | `window.sd.ai.generate({provider:'openai'})` |
| `sourcedeck.html:3983` | Anthropic message | `window.sd.ai.generate({provider:'anthropic'})` |
| `sourcedeck.html:4029,4264,4300,4318` | Airtable list/update (Funnel Health) | `window.sd.airtable.*` |
| `sourcedeck.html:4368` | Internal proxy (Stripe) — **not credential-bearing**, leave | — |
| `sourcedeck.html:4589,4594` | Cloudflare DNS / Google DNS — public, no key | leave |
| `sourcedeck.html:4635` | Airtable update | `window.sd.airtable.updateRecord` |
| `sourcedeck.html:5368,5375,5382` | Airtable search-then-create | `window.sd.airtable.listRecords` + `createRecord` |
| `sourcedeck.html:5521` | Booking webhook — internal, no key | leave |
| `sourcedeck.html:5541` | Airtable list | `window.sd.airtable.listRecords` |
| `sourcedeck.html:5851,5854` | OpenAI / Anthropic visual prompt | `window.sd.ai.generate` |
| `sourcedeck.html:6826` | Airtable list (GovCon table) | `window.sd.airtable.listRecords` |

Run this from repo root to refresh the list:

```bash
grep -nE "'Bearer '\+|x-api-key" sourcedeck.html
grep -nE "lcc_(AT_PAT|APOLLO_KEY|OPENAI_KEY|CLAUDE_KEY)" sourcedeck.html
```

---

## 4. Migration sequence (recommended)

1. **Airtable.** Highest leverage — 14+ Bearer sites collapse to
   four `window.sd.airtable.*` calls. Migrate the GovCon table reads
   first (read-only, lowest risk), then deal/Funnel writes.
2. **Apollo.** One Bearer site. Migrate alongside the
   stakeholder-graph UI work.
3. **OpenAI / Anthropic.** Replace four Bearer sites with
   `window.sd.ai.generate({ provider })`. The provider returns a
   normalized result with `aiPolicy: "AI draft. Human review required."`
   already.
4. **Old `localStorage` cleanup.** Once every Bearer-build site is
   gone, remove the four `lcc_*` localStorage keys. Settings UI
   becomes presence-only.
5. **Settings UI rewrite.** Replace the current Settings inputs
   with a write-only credential entry pattern + presence indicator.
   Migration is small once steps 1–4 are done.

---

## 5. How this supports web-first SaaS

- The renderer surface (`window.sd.*`) is the **same shape** the
  future web app will use against an HTTP API server. Today
  `window.sd.airtable.listRecords({...})` calls IPC; in the
  web build it will call `fetch('/api/airtable/list', ...)` with
  identical input/output shape and a session cookie for auth.
- `services/airtable/`, `services/apollo/`, `services/ai/providers/{openai,anthropic}`
  are platform-neutral — they have no Electron / DOM dependency
  and pull the credential from a `CredentialStore`. The same
  modules can run inside a Node API server unchanged; only the
  credential adapter changes (`SafeStorageAdapter` →
  `VaultAdapter` from `services/settings/credentials.js`).
- Once the renderer no longer holds credentials, the web app
  build can ship without any of the legacy `lcc_*` localStorage
  scaffolding. The renderer becomes a UI-only artifact.
- Audit-log coverage already wraps every external call (provider,
  status, metadata) — that trail is exactly what an enterprise
  GovCon buyer asks for in a vendor security review.

---

## 6. Verification commands

```bash
# How many Bearer-header builds remain in renderer?
grep -cE "'Bearer '\+|Bearer\s\$\{" sourcedeck.html

# How many lcc_* credential reads/writes remain?
grep -cE "lcc_(AT_PAT|APOLLO_KEY|OPENAI_KEY|CLAUDE_KEY)" sourcedeck.html

# Tests for the new boundary
node test/credential-boundary.test.js
node test/architecture-boundary.test.js

# Full chain
npm test
```
