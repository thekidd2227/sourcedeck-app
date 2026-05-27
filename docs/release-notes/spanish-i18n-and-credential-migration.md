# Release Notes: Credential Migration + Spanish i18n

**Date:** 2026-05-27
**PRs:** #12 (audit + security), #13 (i18n extension)
**Merge SHAs:** `5d84c21` (PR #12), `fbe25ed` (PR #13)

## Credential Migration (PR #12)

All 10 renderer-side `fetch()` calls that built `Authorization` / `x-api-key`
headers with raw OpenAI and Claude API keys have been eliminated. The renderer
now routes all AI calls through `window.sd.ai.generate()` (IPC to main process).

**What changed:**
- `callAI()` routes through `window.sd.ai.generate()` — zero direct fetch to
  `api.openai.com` or `api.anthropic.com` in the renderer
- `saveSettings()` stores OpenAI/Claude keys via `window.sd.credentials.set()`
  into safeStorage — keys are never written to localStorage
- `loadSettings()` reads credential presence from the adapter and shows
  write-only placeholders — never pre-fills input fields with raw values
- One-time boot migration copies `lcc_OPENAI_KEY` / `lcc_CLAUDE_KEY` from
  localStorage to safeStorage, then removes them
- `window.OPENAI_KEY` and `window.CLAUDE_KEY` are presence-only flags

**Boundary verification (15 tests in `test/renderer-ai-migration.test.js`):**
- 0 `fetch()` to `api.openai.com` in renderer
- 0 `fetch()` to `api.anthropic.com` in renderer
- 0 `localStorage.setItem` for `lcc_OPENAI_KEY` or `lcc_CLAUDE_KEY`
- 0 raw key assignments to window globals from form values

## Spanish i18n (PR #6 + PR #13)

191-entry inline EN/ES dictionary covering sidebar nav, topbar KPIs, common
buttons, form labels, settings labels, placeholders, tooltips (lead validation
states), and clinical/EHR labels.

**Language switcher:** top-right of topbar next to LIVE indicator. Two
`<button>` elements with `aria-pressed`, keyboard accessible (ArrowLeft/Right).

**Persistence:** `localStorage["site.language"]`. Query param `?lang=es` /
`?lang=en` overrides storage.

## How to Test

### English (default)
1. Open the app with no query params
2. Sidebar, topbar, buttons, labels should all render in English

### Spanish
1. Add `?lang=es` to the URL, or click the ES button in the topbar switcher
2. Sidebar labels, section headers, KPI titles, buttons, form labels,
   placeholders, and tooltips should render in Spanish
3. Reload — Spanish should persist via localStorage

### Language switcher
1. Click ES in the topbar switcher — page translates without reload
2. Click EN — page restores to English
3. Keyboard: Tab to switcher, ArrowLeft/Right to cycle, Enter to activate

## Privacy Gate
`node scripts/release-check.js` — passes. No owner strings in shipped source.

## Known Limitations
- Single-file HTML monolith (~9000 lines) — web-first decomposition planned
- Airtable field IDs are hardcoded per operator
- macOS notarization disabled (unsigned builds only)
- Some dynamic text rendered by JavaScript at runtime (KPI values, table rows,
  lead names) is data-driven and not translated

## Rollback
Revert commits `fbe25ed` and `5d84c21` on main. The credential migration is
self-contained in `sourcedeck.html`; reverting restores the previous direct-fetch
pattern. The i18n dictionary is additive and can be reverted independently.
