# Credential Boundary Audit — OpenAI & Anthropic/Claude Keys

**Phase:** 15A  
**Audit date:** 2026-05-30  
**Related issue:** OPEN-001 (SD-2026-041)  
**Auditor:** SourceDeck Troubleshooting Agent

---

## Finding

**The renderer-side credential boundary for OpenAI and Anthropic keys is fully enforced.**

The prior documentation (`docs/renderer-credential-migration.md`) noted these providers as "⏳ Not migrated" at an earlier point in the project. Subsequent commits completed the migration before this audit. All tests pass.

---

## Audit Results — Current State

### 1. Renderer save path (sourcedeck.html `saveSettings()`)

| Key | Storage | Raw key in renderer after save? |
|---|---|---|
| OpenAI | `window.sd.credentials.set('openai', value)` → IPC → `credentials.get('openai')` in main | No — input cleared, global set to sentinel `'<openai_credential_present>'` |
| Anthropic | `window.sd.credentials.set('anthropic', value)` → IPC → `credentials.get('anthropic')` in main | No — input cleared, global set to sentinel `'<anthropic_credential_present>'` |

### 2. Renderer load path (sourcedeck.html `loadSettings()`)

| Key | Read source | Raw key returned to renderer? |
|---|---|---|
| OpenAI | `window.sd.credentials.status().then(s => s.present.openai)` | No — only boolean presence |
| Anthropic | `window.sd.credentials.status().then(s => s.present.anthropic)` | No — only boolean presence |

### 3. Legacy localStorage migration (one-time cleanup)

`loadSettings()` contains a one-time migration path that:
1. Reads `lcc_OPENAI_KEY` / `lcc_CLAUDE_KEY` from localStorage (if present from an older install)
2. Migrates the value to safeStorage via `window.sd.credentials.set(...)`
3. Immediately removes the localStorage entry
4. Never logs or re-displays the key
5. Sets the renderer global to the sentinel string

This is correct behavior — it is the cleanup path. After it runs once, no localStorage credential entries remain.

### 4. Renderer globals (window.OPENAI_KEY, window.CLAUDE_KEY)

These are **sentinel presence flags**, not raw key values:
- `''` (empty string) — credential not present
- `'<openai_credential_present>'` or `'<anthropic_credential_present>'` — credential saved in safeStorage

They are used throughout `sourcedeck.html` for presence checks only (e.g., deciding whether to show AI-powered options). They never hold the raw API key value in runtime.

### 5. AI call path

All AI generation calls use the IPC boundary:
```
renderer → window.sd.ai.generate({...}) → IPC 'ai-generate' channel
         → main.js → api/index.js → services/ai/providers/openai.js (or anthropic.js)
         → credentials.get('openai') / credentials.get('anthropic') in main process
         → Bearer / x-api-key header built in main process only
         → HTTP response returned to renderer (text content only, no key echo)
```

### 6. Direct API fetch count in renderer

| Pattern | Count in sourcedeck.html |
|---|---|
| `fetch(...'https://api.openai.com/...')` | 0 |
| `fetch(...'https://api.anthropic.com/...')` | 0 |
| `Authorization: 'Bearer ' + OPENAI_KEY` | 0 |
| `x-api-key: CLAUDE_KEY` | 0 |
| `localStorage.setItem('lcc_OPENAI_KEY', ...)` | 0 |
| `localStorage.setItem('lcc_CLAUDE_KEY', ...)` | 0 |

### 7. Preload surface

`preload.js` credentials namespace exposes:
- `credentials.status()` — presence only, no raw values
- `credentials.set(service, value)` — write-only path
- `credentials.remove(service)` — removal path

**Not exposed:**
- `credentials.get(service)` — blocked; renderer cannot retrieve raw key values

### 8. Main/API provider boundary

`services/ai/providers/openai.js` and `services/ai/providers/anthropic.js`:
- Both require `credentials` dep with `get()` function
- Both call `credentials.get('openai')` / `credentials.get('anthropic')` at call time inside main process
- Both build auth headers inside the service, never return them to caller
- Both return normalized result shape (text content only) — no key echo

---

## Test Coverage

| Test file | Tests | Result |
|---|---|---|
| `test/renderer-ai-migration.test.js` | 15 | 15/15 PASS |
| `test/credential-boundary.test.js` | 14 | 14/14 PASS |
| `test/credential-boundary-openai-claude.test.js` | 18 | 18/18 PASS (new) |
| `test/first-run-safety.test.js` | 7 | 7/7 PASS |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  RENDERER (sourcedeck.html)                                 │
│                                                             │
│  saveSettings() → window.sd.credentials.set('openai', k)   │
│                   ↓ clears input field                      │
│                   ↓ sets OPENAI_KEY = '<sentinel>'          │
│                                                             │
│  callAI() → window.sd.ai.generate({prompt,...})             │
│             ↓ IPC only — no raw key                         │
├────────────────────────── IPC ──────────────────────────────┤
│  MAIN PROCESS (main.js + api/index.js)                      │
│                                                             │
│  credentials:set handler → safeStorage.encrypt(key)         │
│  ai-generate handler → services/ai/providers/openai.js      │
│                         → credentials.get('openai')         │
│                         → Bearer header (main-side only)    │
│                         → HTTP fetch → OpenAI API           │
│                         → return text (no key)              │
└─────────────────────────────────────────────────────────────┘
```

---

## OPEN-001 Resolution

**Status: FIXED**

All renderer localStorage credential paths for OpenAI and Anthropic are removed. All AI calls route through the IPC boundary. All tests pass. The migration noted in `docs/renderer-credential-migration.md` is complete.

The credential boundary for these providers now matches the pattern already in place for Airtable, Apollo, and SAM.gov.

---

## Prevention Rules Added

1. `grep sourcedeck.html` for `lcc_OPENAI_KEY`, `lcc_CLAUDE_KEY`, `api.openai.com`, `api.anthropic.com`, `Bearer.*OPENAI`, `x-api-key.*CLAUDE` → must return 0 results (agent check A-005)
2. `test/renderer-ai-migration.test.js` runs in `npm test` — CI blocks any regression
3. `test/credential-boundary-openai-claude.test.js` runs in `npm test` — dedicated enforcement
