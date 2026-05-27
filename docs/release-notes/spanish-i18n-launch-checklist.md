# SourceDeck Spanish i18n Launch Checklist

**Release date:** 2026-05-27
**PRs:** #6 (initial i18n), #12 (security + audit), #13 (i18n extension)

## Pre-launch Verification

### English Default
- [ ] Open app with no query params — all UI renders in English
- [ ] Sidebar: 30 nav items display English labels
- [ ] Topbar KPIs: Pipeline, Expected, Leads display English
- [ ] LIVE indicator shows "LIVE"
- [ ] Settings labels display in English
- [ ] Form placeholders display in English

### Spanish (?lang=es)
- [ ] Add `?lang=es` to URL — UI switches to Spanish
- [ ] Sidebar: all 30 nav items display Spanish labels
- [ ] Topbar KPIs: Pipeline, Esperado, Leads display Spanish
- [ ] LIVE indicator shows "EN VIVO"
- [ ] Settings labels display in Spanish
- [ ] Form placeholders display in Spanish
- [ ] Clinical/EHR labels display in Spanish
- [ ] Lead validation tooltips display in Spanish

### Language Switcher
- [ ] EN/ES buttons visible in topbar (right side, next to LIVE)
- [ ] Click ES — page translates without full reload
- [ ] Click EN — page restores to English
- [ ] Active language button shows `aria-pressed="true"`
- [ ] Keyboard: Tab to switcher, ArrowLeft/Right to cycle, Enter to activate
- [ ] Language persists across page reload via `localStorage["site.language"]`
- [ ] `document.documentElement.lang` updates to "es" or "en"

### Translation Coverage
- [ ] 189+ dictionary entries confirmed (`npm run i18n:audit`)
- [ ] Sidebar section labels: Overview, Action, Create, Pipeline, Delivery, Federal, Operations, Capabilities
- [ ] Sidebar nav buttons: all 22 items
- [ ] Topbar KPIs + tooltips
- [ ] Common buttons: Save, Cancel, Delete, Add, Edit, Search, Filter, etc.
- [ ] Common labels: Status, Type, Name, Date, Owner, Email, Company, etc.
- [ ] Form labels: Business Name, Contact Name, Lead Email, Deal Value, etc.
- [ ] Settings: API key labels, Campaign ID, Webhook URLs
- [ ] Placeholders: Search, Notes, context prompts
- [ ] Tooltips: lead validation states (Validated, Unverified, Demoted, Rejected)
- [ ] Clinical/EHR: Organization/Clinic Name, EHR/EMR System, Transcription Provider

### Credential Migration Safety
- [ ] Zero `localStorage.setItem` for `lcc_OPENAI_KEY` or `lcc_CLAUDE_KEY`
- [ ] Zero direct `fetch()` to `api.openai.com` or `api.anthropic.com` in renderer
- [ ] Zero `anthropic-dangerous-direct-browser-access` header
- [ ] Settings inputs are write-only (not pre-filled with raw keys)
- [ ] One-time migration from localStorage to safeStorage on boot

### Automated Gates
- [ ] `npm test` — 201/201 pass
- [ ] `npm run i18n:audit` — 31/31 pass
- [ ] `node scripts/release-check.js` — privacy gate clean

## Known Limitations
- Dynamic runtime text (KPI values, table rows, lead names) is data-driven, not translated
- Single-file HTML monolith (~9000 lines) — web-first decomposition planned
- Airtable field IDs hardcoded per operator
- macOS notarization disabled (unsigned builds)
- Translation is operational, not legally certified

## Rollback
Revert `fbe25ed` (i18n extension) and/or `5d84c21` (security + audit) on main.
The i18n dictionary is additive and can be reverted independently of the credential migration.
