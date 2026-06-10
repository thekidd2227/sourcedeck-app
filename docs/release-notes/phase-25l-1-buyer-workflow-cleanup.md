# Phase 25L.1 — Buyer Workflow Cleanup · Release Note

**Date:** 2026-06-10
**Repo:** `thekidd2227/sourcedeck-app`
**Sub-phase:** 25L.1 (Navigation + Calendar + Settings + Dashboard cleanup)

---

## What ships

1. **Sidebar reduced from 17 visible items to 8.** New surface, fixed order:
   `Dashboard → GovCon → Leads → Calendar → Response Desk → Proposal Workspace → Settings → Help / FAQ`. Top-of-fold lands on Dashboard.
2. **`GovCon Capture OS` renamed to `GovCon`** in topbar `brand-ver`, sidebar `nav-label`, and Setup Wizard copy.
3. **Calendar event Edit / Mark Complete / Reschedule / Delete buttons on every card,** with the explicit local-only delete confirmation: *"This removes it from SourceDeck only. It does not delete it from Google, iCloud, Outlook, or any external calendar."* Every card carries a small italicized footer note reiterating that editing/deleting here does not change the external calendar.
4. **ICS help icon + help panel** above Import .ics File. Covers what an ICS file is, that import is local-only (not live sync), step-by-step Google / Apple-iCloud / Outlook export, and the safety footer including the explicit *"Importing an .ics file does not give SourceDeck access to your email inbox. Calendar import and email import are separate."*
5. **Settings → Calendar Import card** (after API Keys card). One-click access to `.ics` import, paste calendar text, and the ICS help panel.
6. **Settings → Email Import card** (after Calendar Import). Future secure Gmail/Outlook OAuth placeholder; explicit no-password / no-OAuth-in-this-phase copy.
7. **Settings → API Keys → Hunter.io API Key field** (optional, write-only via the safe credential adapter). Phase 25L.3 is the consumer.
8. **Response Desk subtitle removed** (was `Inbound reply triage · intent detection · next-action routing · draft-only responses`). Header copy updated to the provider-gated Phase 25L language. No ICS / calendar controls remain on Response Desk.
9. **Dashboard rebuild as operating hub launchpad.** 10 consolidation cards surfacing Active pursuits, Overdue items, Today's Tasks, Pipeline value, Proposal deadlines, Vendor follow-ups, Calendar events, Open risks · replies, Leads, Reports — each with a one-click `openTab()` button into the right destination. Dashboard does not render full module tables.
10. **Phase-label scrub on visible UI** (Help/FAQ banner, Settings notes, GovCon CC placeholder, GovCon Bid/No-Bid snapshot rows, Export Matrix toast).

## What does NOT ship in 25L.1

- Proposal Workspace solicitation/RFQ/RFP upload + extraction pipeline → **Phase 25L.2**
- Section-level proposal drafting from extracted sections → **Phase 25L.2**
- Subcontractor research workflow (Place-of-Performance linkage, 50-mile radius) → **Phase 25L.3**
- Incumbents & Awards research workflow (FSD link, AI research prompt) → **Phase 25L.3**
- Hunter.io contact-enrichment trigger → **Phase 25L.3**

## Hidden reachability buffer

Per the Phase 23C invariant, every pre-25L commercial nav button (`outreach`, `primes`, `cmd`, `command`, `email`, `overdue`, `content`, `dailyops`, `socials`, `createlead`, `aigenerate`, `delivery`, `opportunities`, `dealwork`, `pipeline`, `proof`, `revenue`) remains in DOM inside `#nav-section-removed-25l` (`style="display:none"`, `aria-hidden="true"`, `data-phase-25l="removed-from-active-nav"`). Each button carries `data-phase-25l-removed="true"` for downstream filtering. Programmatic `openTab('cmd')`, `openTab('overdue')`, etc. continue to resolve.

## Safety

- No `.env` touched
- No secrets printed
- No new paid dependencies
- No deploy / public release / public download
- No live SAM run
- No email sending
- No vendor/agency auto-contact
- No bid/quote/proposal submission
- No portal upload
- No calendar provider upload/sync
- No Google/Microsoft/iCloud password or OAuth request
- No pricing source change
- No checkout/payment change
- No legal advice or certified-compliance claim
- Phase 25A no-send/no-submit/no-upload boundary preserved
- Phase 25C master delivery method preserved
- Approved SourceDeck logo unchanged

## Tests

- `test/phase-25l-navigation-cleanup.test.js`
- `test/phase-25l-calendar-edit-delete-help.test.js`
- `test/phase-25l-dashboard-consolidation.test.js`
- `test/phase-25l-settings-integrations.test.js`

All four pass on the working tree. Wired into `npm test`.

## Operator next step

Merge Phase 25L.1, then proceed to Phase 25L.2 (Proposal Workspace solicitation intake). Day 0 trial-package regeneration should wait until 25L.1, 25L.2, 25L.3, and the Phase 25I-recovery PR all land on `main`.
