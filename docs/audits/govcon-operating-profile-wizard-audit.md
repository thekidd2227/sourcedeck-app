# GovCon Operating Profile Wizard — Pre-Build Audit

Read-only audit of the current state before upgrading the GovCon setup
wizard into a full Operating Profile Wizard (Phase 14A).

## Current wizard (sourcedeck.html)

- 5-step modal `#govcon-wizard`, opened by `openGovconSetupWizard()`
  (`_GC_WIZ_MAX = 5`). Steps: (1) GovCon profile — company name +
  certification checkboxes + target NAICS/agencies/excluded types;
  (2) SAM.gov API key; (3) demo/import/manual start; (4) safety
  acknowledgment (read-only); (5) confirmation.
- Functions: `openGovconSetupWizard`, `closeGovconSetupWizard`,
  `_gcWizShow`, `gcWizNav`, `gcWizSaveProfile`, `_gcWizUpdateSamStatus`,
  `gcWizSaveSam`, `gcWizRemoveSam`, `gcWizFinish`; state `_gcWizStep`,
  `_govconSetupState`; helpers `govconProfile`, `refreshGovconSetupState`,
  `govconSetupComplete`, `refreshGovconSetup`.
- Auto-opens once per session when `!govconSetupComplete()` (session key
  `lcc_govcon_wizard_seen`).

## Where data is stored today

- **GovCon profile (name, certifications):** `ARCG_OS.brand` (localStorage
  `arcg_brand`) via `ARCG_OS.saveBrand()`.
- **Targeting (naics, agencies, excluded):** `sd.govcon.saveTargeting()`
  → main-process electron-store key `govcon.targeting`
  (`services/govcon/targeting-profile.js`, re-exported by
  `services/settings/targeting-profile.js`).
- **SAM key:** `sd.credentials.set('sam-gov', …)` → safeStorage
  (presence-only to renderer).
- **Demo mode:** localStorage `lcc_govcon_demo_mode`.

## Credentials (services/settings/credentials.js)

- `KNOWN_SERVICES` = `sam-gov, airtable, apollo, openai, anthropic,
  watsonx, ibm-cos` (7).
- Adapters (memory / safeStorage / vault) share `get/set/remove/status`.
- `get()` is **never bridged to the renderer**; IPC surface is
  presence-only: `credentials:status / set / remove`.

## Capability statement extraction

- **Does not exist.** No upload/paste/extraction anywhere. Must be built.

## AI / imaging / social credential onboarding

- **Not in the wizard.** AI keys (Claude/OpenAI/watsonx) live only in
  Settings → Brand. No Canva/imaging or social-platform credential
  onboarding exists. Social handles are free-text in Settings → Brand.

## Wiring pattern (preload / main / api)

- **preload.js:** `window.sd.govcon.*` thin `ipcRenderer.invoke('govcon:*')`
  wrappers. Targeting is exposed flat (`getTargeting/saveTargeting/
  resetTargeting`); a nested `profile: { get, save, reset,
  extractCapabilityStatement }` will be added.
- **main.js:** flat `ipcMain.handle('govcon:*')` list (targeting at
  293-295) delegating to `appApi.govcon.*`.
- **api/index.js:** `createAppApi(opts)` requires `opts.store` +
  `opts.credentials`; builds the frozen `govcon` surface from required
  services. `targeting: { get/save/reset }` is the exact template for
  `profile`.

## What must be added

1. `services/settings/govcon-operating-profile.js` — full operating
   profile schema + sanitizer; delegates targeting to the existing
   targeting service (no duplication); derives credential presence from
   `credentials.status()`; **rejects credential-looking strings**.
2. Extend `credentials.js` `KNOWN_SERVICES` with `canva, meta,
   instagram, facebook, tiktok, linkedin, google, x-twitter`.
3. `services/govcon/capability-statement-extractor.js` — candidate-only
   field extraction (UEI/CAGE/NAICS/PSC/certs/services/differentiators),
   user-approval required, no auto-save, no external upload.
4. preload/main/api: `govcon.profile.{get,save,reset,
   extractCapabilityStatement}`.
5. Wizard upgrade to 9 steps (business, capability statement, targeting,
   SAM key, AI key, creative key, social handles, safety, finish).
6. Premium Content Agent spec consumes the operating profile.
7. Pricing revaluation doc; tests; release notes; manual QA update.

## Constraints carried forward

No auto-post, no auto-send, no live scraping, no platform-connector
claims, no compliance/certification claims. Credential boundary stays
presence-only; RED_RESTRICTED and irreversible KILL unchanged.
