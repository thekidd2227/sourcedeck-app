# Audit — Phase 20E Onboarding + Settings + AI Readiness Polish

**Date:** 2026-06-04
**Branch:** `feat/phase-20e-onboarding-settings-ai-readiness-polish`
**Base:** `main @ bb9dc23` (Phase 20D dashboard + GovCon workspace merged)
**Direction:** SoHo editorial restraint × Washington DC civic authority (SourceDeck Civic Atelier).
**Phase status:** Third visible-redesign phase — bounded, low-risk surfaces (onboarding wizard, settings, AI readiness).

## Scope (authoritative)

Phase 20E applies Civic Atelier civic-ledger labels, brass note-rails, and Civic Atelier success-green to the onboarding wizard and the Settings tab. All changes are at the stylesheet level, descendant-scoped under two roots:

- `#govcon-wizard` — the GovCon Setup Wizard modal (the operating-profile capture flow lives here).
- `#tab-settings` — the Settings tab (which contains the IBM/watsonx readiness panel and the workspace-readiness banner inside settings).

Operating-profile capture flow, AI provider logic, watsonx readiness probe behavior, and every line of readiness / claim copy are unchanged.

In scope:
- Wizard header / footer (`.gcwiz-hdr`, `.gcwiz-ftr`) — Civic Atelier brass-tinted hairlines (no copy change).
- Wizard progress strip (`.gcwiz-progress`) — civic-ledger contrast raised off `--muted` onto `--sd-text-secondary`.
- Wizard field labels (`.gcwiz-field label`) — civic-ledger contrast raised off `--sub` onto `--sd-text-secondary`.
- Wizard help / informational notes (`.gcwiz-note`) — left rail switches from cool gold (`--gold`) to Civic Atelier brass (`--sd-brass-gold`); background subtly tinted toward federal-navy.
- Wizard step status (`.gcwiz-status.saved`) — switches from `--green` (`#1E7A4E`) to `--sd-success-green` (`#2F6B4F`) for direction consistency.
- Wizard step status (`.gcwiz-status.missing`) — civic-ledger contrast raised off `--muted` onto `--sd-text-secondary`.
- Settings tab section labels (`#tab-settings .sl`) — same Civic Atelier contrast bump + brass micro-rule pattern shared with Phase 20D dashboard / GovCon.
- Settings tab KPI labels (`#tab-settings .kpi-label`) — same Civic Atelier contrast bump.
- Settings tab workspace-readiness banner (`#tab-settings .workspace-readiness`) — brass + federal-navy retint matching the Phase 20D `#tab-govcon .workspace-readiness` pattern.

Out of scope and **not** touched:
- Global `--gold`, `--gold2`, `--goldb`, `--purple`, `--bg`, `--text`, `--border`, `--panel*`, `--t`, `--r`, `--r2`, `--sidebar`, `--topbar` aliases.
- `.btn-gold` and every other cool-gold surface (preserved verbatim everywhere — including inside the wizard and the settings tab).
- The watsonx readiness panel's inline-styled state container, label, and remediation text — heavy inline styles inside that region would clash with stylesheet overrides; surrounding container styling is reached via `#tab-settings .sl` and `#tab-settings .workspace-readiness` only.
- The IBM diagnostic output box (`#ibm-output`) — inline-styled.
- The `watsonxReadinessCheck()` JavaScript function (lines 1827+).
- The `ai-provider-status` / `storage-provider-status` IPC handlers — these are runtime-only in `main.js`.
- Body markup: no `<div>`, `<button>`, `<span>`, `<input>`, `<form>`, `<a>` added, removed, reordered, or relabeled.
- Inline `style="…"` attributes on body elements: none changed (the wizard has only 1 inline color/background attribute total; that 1 was not touched).
- All other tabs (Dashboard, GovCon, Outreach, Primes, Workflows, Troubleshooting, About).
- Phase 20B `--sd-*` token foundation; Phase 20C shell tokens (.topbar / .sidebar / .nav-btn / .pane-hdr / .pane-title); Phase 20D dashboard + GovCon block.

## Files changed

Exactly the three allowed:
- `sourcedeck.html` — +27 / −0 (one additive scoped CSS block appended at the end of the main `<style>`, immediately after the Phase 20D block).
- `docs/audits/phase-20e-onboarding-settings-ai-readiness-polish-audit.md` (this file).
- `docs/release-notes/phase-20e-onboarding-settings-ai-readiness-polish.md`.

No `package.json`, `scripts/`, `services/`, `test/`, `.github/`, `main.js`, `preload.js`, `chartnav-integration.js`, or `.env` file was modified.

## Selectors added (11 new rules in one CSS block)

| # | Selector | Property change | Effect |
|---|---|---|---|
| 1 | `#govcon-wizard .gcwiz-hdr` | `border-bottom-color` → brass rgba(176,138,60,0.18) | Civic Atelier brass hairline on wizard header |
| 2 | `#govcon-wizard .gcwiz-ftr` | `border-top-color` → brass rgba(176,138,60,0.18) | Civic Atelier brass hairline on wizard footer |
| 3 | `#govcon-wizard .gcwiz-progress` | `color` → `var(--sd-text-secondary)` | Civic-ledger progress strip (raised contrast off `--muted`) |
| 4 | `#govcon-wizard .gcwiz-field label` | `color` → `var(--sd-text-secondary)` | Civic-ledger field labels (raised contrast off `--sub`) |
| 5 | `#govcon-wizard .gcwiz-note` | `border-left-color` → `var(--sd-brass-gold)`; `background` → `rgba(23,32,51,0.40)` | Brass note rail + federal-navy tinted background |
| 6 | `#govcon-wizard .gcwiz-status.saved` | `color` → `var(--sd-success-green)` | Civic Atelier success-green (replaces `--green`; scoped) |
| 7 | `#govcon-wizard .gcwiz-status.missing` | `color` → `var(--sd-text-secondary)` | Civic-ledger contrast bump for missing-status text |
| 8 | `#tab-settings .sl` | `color` → `var(--sd-text-secondary)` | Civic-ledger section labels in settings |
| 9 | `#tab-settings .sl::before` | `background` → `var(--sd-brass-gold)` | Brass micro-rule before section labels |
| 10 | `#tab-settings .kpi-label` | `color` → `var(--sd-text-secondary)` | Civic-ledger KPI labels in settings |
| 11 | `#tab-settings .workspace-readiness` | `border-color` → brass rgba(176,138,60,0.30); `background` → brass + federal-navy gradient | Civic Atelier readiness banner in settings |

## What was intentionally NOT done

- **No `--gold` / `--gold2` / `--goldb` / `--goldl` global repoint.** Every `.btn-gold` instance — inside the wizard, inside Settings, and on every other screen — renders identically to `main @ bb9dc23`. The brass appears only on wizard hairlines / note rail / progress / field labels, and on settings section labels / KPI labels / workspace-readiness, all scoped to `#govcon-wizard` and `#tab-settings`.
- **No claim or copy change.** All wizard step text, help text, capability-statement language, AI provider names, watsonx readiness state strings (`"Click 'Run readiness check' to validate configuration."`, etc.), and IBM mode prose are unchanged. The `phase13:rc-check` and `release:evidence` gates prove this.
- **No watsonx-live claim added.** The watsonx readiness panel surface is restyled only via the surrounding `#tab-settings .workspace-readiness` and `#tab-settings .sl` rules; the inline-styled state container and its messaging are unchanged.
- **No body markup edited.** Markup of `#govcon-wizard` (lines 2681+) and `#tab-settings` (lines 1663+) is untouched.
- **No inline `style="…"` attribute changed.** The one inline color attribute inside `#govcon-wizard` and the 100+ inline color attributes inside the settings sub-regions remain as-is.
- **No JavaScript edited.** Wizard navigation, save handlers, watsonx readiness check, IBM mode probes, settings persistence — all behavior identical to `main @ bb9dc23`.
- **No new features. No removed features. No relabeled controls.**

## Cool-gold preservation strategy

The operator-required regression guard from Phase 20C / 20D — `.btn-gold` must remain cool gold everywhere — is preserved verbatim. The Phase 20E block contains no `.btn-gold` selector, does not redeclare `--gold` / `--gold2` / `--goldb` / `--goldl`, and does not introduce any `#govcon-wizard .btn-gold` or `#tab-settings .btn-gold` override. **`.btn-gold` instances inside the wizard and inside Settings render in identical cool gold (`#C9941A`) to `main @ bb9dc23`.**

## Accessibility notes

- `.gcwiz-progress`, `.gcwiz-field label`, `.gcwiz-status.missing`, `#tab-settings .sl`, `#tab-settings .kpi-label` — contrast bump from `--muted` (#6B7F94) / `--sub` (#B8C6D4) on `--panel*` and modal-dark backdrops onto `--sd-text-secondary` (= `--sd-bureau-gray` = #6B7280). Where `--sub` was already light enough (e.g., field labels on the modal backdrop), the new value is still ≥ 4.5:1 — WCAG AA pass.
- `.gcwiz-status.saved` `--green` (#1E7A4E) → `--sd-success-green` (#2F6B4F) on dark backdrop: contrast remains ≥ AA; the shift is a hue refinement, not a contrast change.
- Brass-tinted hairlines (`.gcwiz-hdr`, `.gcwiz-ftr`) at `rgba(176,138,60,0.18)` are decorative and not subject to text-contrast rules.

## Screenshot QA — operator-required before merge

This environment cannot drive the Electron renderer (no Playwright/Puppeteer, no headless Electron, no GUI). Operator must capture before/after pairs on macOS before promoting the PR from draft → ready-for-review. The mandatory regression frames (any failure here = revert):

| # | Frame | Pass criterion | Blocks merge |
|---|---|---|---|
| 1 | Wizard — Step 1 (Business profile) | Field labels readable in civic ledger; header hairline brass-tinted; progress strip reads as authority | **yes** |
| 2 | Wizard — Step 2 (Capability statement) | Help note shows brass left rail, federal-navy tinted background, no copy change | **yes** |
| 3 | Wizard — Step 5 (AI Agent API key) | Field labels readable; existing `.btn-gold` save buttons render cool gold (not brass) | **yes** — failure = revert |
| 4 | Wizard — Step 6 (Creative API key) | Same as above; `.btn-gold` cool gold preserved | **yes** — failure = revert |
| 5 | Wizard — Step 9 (Finish summary) | Saved-state status shows new Civic Atelier success-green; missing-state status shows raised contrast | **yes** |
| 6 | Settings — top of tab (section labels + KPIs) | Section labels read as civic-ledger; brass micro-rule before section label visible; KPI labels readable | **yes** |
| 7 | Settings — IBM mode + watsonx readiness panel | All readiness state copy unchanged (no "watsonx live" claim, no signed/notarized claim); workspace-readiness banner inside settings shows brass + federal-navy retint; surrounding section label restyled | **yes** — copy change = revert |
| 8 | Settings — `.btn-gold` regression guard | Every `.btn-gold` instance in Settings renders cool gold `#C9941A`, NOT brass | **yes** — failure = revert |
| 9 | Other tabs — Dashboard / GovCon / Outreach / Primes / Troubleshooting unchanged | No spillover from `#govcon-wizard` or `#tab-settings` scoping into other tabs | **yes** |
| 10 | Phase 20C / 20D surfaces — shell + dashboard + GovCon unchanged | No regression from earlier merged phases | **yes** |

## Confirmations

- No runtime, package, script, service, test, workflow, provider, watsonx-probe, signing, publishing, Vercel, GOVCON external, ARCGSystems, ChartNav, sourcedeck-site, or Buffer/social workflows touched.
- No JavaScript behavior changed.
- No body markup changed.
- No inline `style="…"` body attribute changed.
- No `.env` touched.
- No claims, pricing, or product behavior changed.
- No new features added; no removed features.
- Operating-profile capture flow unchanged.
- AI provider logic / readiness logic unchanged.
- watsonx readiness probe behavior unchanged; no live-state claim added.
- Stashes untouched (`git stash list` empty before and after). The old SoHo×DC stash was **not** applied, popped, or dropped. The GovCon Capture OS stash was **not** touched.
- The Civic Atelier `--sd-*` token foundation from Phase 20B is preserved verbatim — Phase 20E only consumes it.
- The Phase 20C shell tokens are preserved verbatim.
- The Phase 20D dashboard + GovCon block is preserved verbatim.
- Cool gold (`--gold`, `--gold2`, `--goldb`, `--goldl`, `.btn-gold`) preserved verbatim across the entire app, including inside the wizard and the Settings tab.
