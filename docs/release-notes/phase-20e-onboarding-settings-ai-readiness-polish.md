# Release Note — Phase 20E Onboarding + Settings + AI Readiness Polish

**Branch:** `feat/phase-20e-onboarding-settings-ai-readiness-polish`
**Type:** Visible polish — **scoped to onboarding wizard and Settings tab stylesheet rules only**.
**Base:** `main @ bb9dc23` (Phase 20D dashboard + GovCon workspace merged).

## Summary

Phase 20E continues the SourceDeck Civic Atelier direction by polishing the GovCon Setup Wizard (operating-profile onboarding) and the Settings tab. All changes are at the stylesheet level, descendant-scoped under `#govcon-wizard` and `#tab-settings`. Operating-profile capture, AI provider logic, watsonx readiness probe behavior, and every line of readiness / claim copy are unchanged. Cool-gold `.btn-gold` remains cool gold everywhere — the global `--gold` / `--gold2` / `--goldb` aliases are deliberately untouched.

## What changed (visible)

- **GovCon Setup Wizard** (`#govcon-wizard`) — civic-ledger labels and brass note rails:
  - Wizard header (`.gcwiz-hdr`) and footer (`.gcwiz-ftr`) hairlines retinted to Civic Atelier brass (`rgba(176,138,60,0.18)`).
  - Wizard progress strip (`.gcwiz-progress`) — contrast raised off `--muted` onto `--sd-text-secondary`.
  - Wizard field labels (`.gcwiz-field label`) — contrast raised off `--sub` onto `--sd-text-secondary`.
  - Wizard help notes (`.gcwiz-note`) — left rail switches from cool gold to `--sd-brass-gold`; background subtly tinted toward federal-navy (no copy change).
  - Wizard step status (`.gcwiz-status.saved`) → `--sd-success-green`; (`.gcwiz-status.missing`) → `--sd-text-secondary`.
- **Settings tab** (`#tab-settings`) — civic-ledger labels and Civic Atelier readiness banner:
  - Section labels (`.sl`) — contrast raised off `--dim` onto `--sd-text-secondary`; leading micro-rule is brass.
  - KPI labels (`.kpi-label`) — contrast raised off `--muted` onto `--sd-text-secondary`.
  - Workspace-readiness banner inside Settings (`.workspace-readiness`) — brass + federal-navy retint, matching the Phase 20D pattern already in place inside the GovCon tab.

## What did NOT change

- **No `--gold` / `--gold2` / `--goldb` / `--purple` global repoint.** Every `.btn-gold` instance — inside the wizard, inside Settings, and on every other screen — renders identically to `main @ bb9dc23`. The brass appears only on stylesheet rules descended from `#govcon-wizard` or `#tab-settings`.
- **No `--bg` / `--text` recoloring.** Body, modals, forms, dashboards, tables, workflow panels visually unchanged in their structural surfaces.
- **No body markup edited.** No `<div>`, `<button>`, `<span>`, `<input>`, `<form>`, `<a>` was added, removed, reordered, or relabeled in either scope.
- **No inline `style="…"` attribute changed.** The wizard has only 1 inline color/background attribute — it remains as-is.
- **No JavaScript edited.** Wizard navigation, save handlers, `watsonxReadinessCheck()`, IBM mode probes, settings persistence — all behavior identical to `main @ bb9dc23`.
- **No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` change.**
- **No claims / pricing / watsonx / signing / publishing / Vercel / GOVCON external / ARCGSystems / ChartNav / sourcedeck-site / Buffer change.** No watsonx-live claim added. No signed-notarized claim added. No compliance claim added.
- **No watsonx readiness copy change.** The state strings (`"Click 'Run readiness check' to validate configuration."`, the remediation prose, IBM mode prose, "credentials are stored securely and are not exposed back to the interface", etc.) are unchanged. The `phase13:rc-check` gate verifies this.
- **No new features. No removed features. No relabeled controls.**
- **The watsonx readiness panel's inline-styled inner surfaces** are intentionally not restyled — heavy inline overrides would clash with stylesheet retint, and the surrounding `#tab-settings` rules handle the civic-ledger feel of the panel's surrounding section without disturbing the readiness state copy.

## Cool-gold preservation (operator-required regression guard)

The Phase 20C / 20D / 20E operator regression guard — `.btn-gold` must remain cool gold everywhere — is preserved verbatim. The Phase 20E block contains no `.btn-gold` selector and does not redeclare `--gold`, `--gold2`, `--goldb`, or `--goldl`. Cool gold renders identically inside the wizard, inside Settings, and across all other tabs.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed / notarized claim, any compliance claim (FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001), guaranteed-outcome or unlimited-AI language, or auto-send / auto-submit copy. None were added in 20E. The watsonx readiness panel retains its honest "Click 'Run readiness check' to validate configuration" state and remediation pattern.

## Stashes

Stashes were not modified. The old SoHo×DC stash was not applied, popped, or dropped. The GovCon Capture OS stash was not touched.

## Files changed

- `sourcedeck.html` — +27 / −0 (one additive scoped CSS block, appended at the end of the main `<style>` immediately after the Phase 20D block).
- `docs/audits/phase-20e-onboarding-settings-ai-readiness-polish-audit.md` (new).
- `docs/release-notes/phase-20e-onboarding-settings-ai-readiness-polish.md` (this file).

## Tests run

- `npm test`
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

Results recorded in the PR description.

## Screenshots

**Operator-required before merge.** This environment cannot drive the Electron renderer (no Playwright/Puppeteer, no headless Electron, no GUI). The PR is opened as a **draft** to enforce the screenshot gate. The 10-row required-frame checklist (including the cool-gold regression guards on rows 3, 4, and 8) lives in `docs/audits/phase-20e-onboarding-settings-ai-readiness-polish-audit.md` § Screenshot QA.

## Next phase

**Phase 20F — Troubleshooting + Release Evidence Visual System** (parchment ground, Cormorant italic finding titles, monospace evidence body, oxblood severity rule on the troubleshooting view; brass-hairline "receipt" aesthetic on the release-evidence view). 20F lands only after 20E screenshots are reviewed and the cool-gold regression guards on rows 3, 4, and 8 are confirmed absent.
