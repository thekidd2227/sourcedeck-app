# Release Notes — Phase 25X: First Impression + Web Opportunity Intel

## Summary
Two high-value GovCon workflows, integrated cleanly (no sidebar clutter, no
duplicate SAM search).

## Highlights
- **Make the Right First Impression** — a focused page under Proposal Workspace
  that drafts 3 clarification questions (with why / source / risk) and a concise
  COR email from a saved pursuit, fetched 25W source material, or pasted text.
  Company details come from your profile (ARCG is placeholder-only). Copy / Save
  / Mark Reviewed / Reset controls. Draft-only — no send.
- **Solicitation timer** — saved pursuits store deadline fields and show
  advisory "Questions due / Proposal due" timers; missing deadlines are entered
  manually (never guessed); timezone shown honestly.
- **Web Opportunity Intel** — a supplemental, provider-aware open-web search
  mode inside Find Opportunities (SAM.gov API search stays default/canonical).
  Without a web-capable provider it prepares a search plan / prompt and never
  fakes results; with one it queries through the credential boundary.
- **SAM.gov cross-check** — "Check in SAM.gov" upgrades matched web-intel
  results; saved web-intel records are labeled "Web Intel — verify on source."
- Rejected the standalone "SAM Search" sidebar tab and the broken `ss-*` CSS
  snippet; re-asserted GovCon Outreach OS removal.

## Safety
- No `.env` changes. No secrets/keys printed or in URLs/logs.
- No auto-run (SAM or web). No email send. No COR/agency/vendor auto-contact.
- No bid/quote/proposal submission. No portal upload. No login scraping/bypass.
- No pricing source change. No checkout/payment change.

## Tests / gates
7 new Phase 25X tests wired into `npm test`; Phase 25W/25U/25R/25Q regressions
and core runtime gates pass; `govcon:smoke`, `troubleshooting:scan`,
`release-check.js` pass.

## Next
Merge when green, rebuild app package, refresh Day 0 package, then manually
verify First Impression and Web Opportunity Intel.
