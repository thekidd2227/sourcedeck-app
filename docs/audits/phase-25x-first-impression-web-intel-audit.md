# Phase 25X — First Impression + Web Intel Audit

## Goal
Add two high-value GovCon workflows without clutter: "Make the Right First
Impression" (COR clarification questions + email draft) and "Web Opportunity
Intel" (supplemental open-web search), integrated into the existing
architecture.

## Placement decisions
- **First Impression** → a card under Proposal Workspace (`#pw-first-impression`),
  not a sidebar item. Shortcuts from Saved Pursuits + Solicitation Workspace.
- **Web Intel** → an internal mode toggle inside Find Opportunities
  (`gcFindMode` → `#gc-find-mode-sam` / `#gc-find-mode-web`), default SAM.gov.
- **Rejected**: standalone "SAM Search" sidebar tab + duplicate SAM search
  section + truncated `ss-*` CSS snippet. Confirmed absent.

## First Impression
- Source: saved pursuit / pasted text / Phase 25W fetched-source. No source →
  guidance message; never pretends.
- Timer: timing fields stored on save; advisory timers; missing → manual entry;
  timezone honesty; no guessing.
- Questions: deterministic local generator (3 questions, why/source/risk,
  honest "source section not identified"); Copy AI Prompt for provider use.
- COR email: company profile from `sd.govcon.profile.get()`, ARCG placeholder
  only; includes the 3 questions; no overclaim; no award-entitlement; no send.
- Controls: copy/save/review/reset. No Send. Concise footer (no heavy panel).

## Web Intel
- Provider-aware: `local` provider is not web-capable → search-plan / copy-prompt
  / paste-to-structure fallback; never fabricates results. Web-capable provider
  → `sd.ai.generate` through the credential boundary.
- Prompt builder enforces active-only, title+URL, verify-on-source, no
  fabrication, coverage + inaccessible reports, duplicate flagging.
- Parser drops expired/awarded/cancelled/closed and requires title + source URL.
- SAM.gov cross-check (user-triggered) upgrades matched records; saved results
  labeled "Web Intel — verify on source," not SAM-verified until matched.
- Coverage report: searched / no-result / inaccessible / totals / closing
  windows / forecast / filters relaxed.

## Safety verification
- No `.env`/secret/key exposure. No api_key in URLs/logs (strip/redact helpers
  only). No auto-run (SAM or web). No send/submit/upload. No login scraping or
  bypass. No pricing/Stripe/checkout changes. Blank-canvas default and approved
  logo preserved. GovCon Outreach OS stays removed; no heavy Human Review panels.

## Gates
7 new Phase 25X tests + Phase 25W/25U/25R/25Q regressions + core runtime gates
+ `npm test`, `govcon:smoke`, `troubleshooting:scan`, `release-check.js` — all pass.
