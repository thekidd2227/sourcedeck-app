# Phase 25H — Calendar Module + GovCon Integration

**Phase:** 25H — SourceDeck Calendar Module + Open Calendar Import + GovCon Task Integration.
**Date:** 2026-06-09.
**Branch:** `feat/phase-25h-calendar-module`.
**Base:** `main @ d34b6e1` (post-PR #105 — Phase 25F).
**Companion contract:** `docs/product/phase-25h-calendar-module-contract.md`.
**Companion IA:** `docs/product/phase-25h-open-calendar-import-options.md`.
**Companion integration:** `docs/product/phase-25h-calendar-govcon-integration.md`.
**Companion audit:** `docs/audits/phase-25h-calendar-privacy-safety-audit.md`.

---

## What this phase delivered

A standalone, local-only Calendar module integrated with GovCon and the Phase 25E.2 Proposal Workspace.

**Standalone nav button.** Calendar sits in its own always-on nav section (outside the Phase 25E.1 "Other business tools" collapsible). Buyers reach Calendar in one click on cold open.

**Four views.** Today / Week / Month / List. The Today view renders a single-day event list. The Week view shows seven columns (Sun→Sat) with the current day accented. The Month view is a 6×7 grid with click-to-jump cells. The List view is a chronological dump of every event.

**Open `.ics` import.** File picker (`<input type="file" accept=".ics,text/calendar">`) reads via `FileReader` in-renderer. RFC 5545 subset parser handles SUMMARY, DTSTART, DTEND, DESCRIPTION, LOCATION, UID, RRULE, DTSTAMP. Folded lines and DATE/DATE-TIME forms supported. RRULE events get annotated; full expansion is a future-phase enhancement.

**Paste calendar text.** Textarea + preview modal. Non-ICS pastes are politely rejected; the buyer is invited to use Add Event instead.

**Manual event form.** Full modal with title, date, start/end, all-day, location, notes, plus link fields (solicitation, vendor, proposal section) and the eight GovCon-flavored task types (vendor-follow-up, quote-due, appointment, site-visit, qa-deadline, proposal-deadline, internal-review, subcontractor-meeting, plus calendar-event / proposal-section-work / other). Five status values: scheduled / completed / missed / reschedule / canceled.

**Today's Work Plan integration.** A second Phase 25H script mirrors today's calendar events into the Daily Operating Rhythm pane's existing `#do-checklist` host. Read-only — Calendar is the source of truth. Empty state offers a one-click jump back to the Calendar tab.

**GovCon link fields.** Every event can link to a GovCon solicitation (free text), a vendor/sub (free text), and one of the 13 Phase 25E.2 proposal sections (dropdown). The chips render on the event card in every view.

## What did NOT change

- Phase 25A no-send / no-submit / no-upload posture (verified — no Send Invite / Email Invite / Contact Vendor / Contact Agency / Upload to portal control on the pane).
- Phase 25C master delivery method.
- Phase 25D approved brand mark.
- Phase 25E.6 Daily Ops empty-state invariant (the Phase 25H integration is additive; the static pane copy is untouched).
- Phase 25F Outreach defaults + GovCon section nav + buyer-safe navigation sentinels.
- `package.json` dependencies. **Zero new dependencies added.** Phase 25H ships a small inline RFC 5545 subset parser (no `ical.js`, no `node-ical`, no `tsdav`).
- `services/**`, `scripts/**`, `main.js`, `preload.js`.
- Pricing source-of-truth.
- The Phase 23C "every commercial nav button + pane remains in the DOM" invariant.

## No OAuth. No paid API. No external sync.

Per mission requirements, Phase 25H ships only the open `.ics` standard. Google Calendar / Microsoft Graph / iCloud OAuth / CalDAV are explicitly out of scope. The future-phase CalDAV path is documented in `phase-25h-open-calendar-import-options.md` §4 but ships no code in this phase.

## Test / gate results

| Command | Result |
|---|---|
| `npm test` (full chain) | ✅ exit 0 |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run troubleshooting:scan` | ✅ no fail / warn |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `node scripts/release-check.js` | ✅ privacy clean; signing env MISSING (expected) |
| 4 Phase 25H sentinels (38 assertions) | ✅ all PASS |
| Phase 25F sentinel (preserved) | ✅ 8/8 PASS |

## Safety / boundary confirmations

- ✅ No tabs/panes removed; no `data-tab` IDs renamed.
- ✅ No Send Email / Submit Bid / Submit Quote / portal-upload control introduced.
- ✅ No Send Invite / Email Invite / Contact Vendor / Contact Agency control introduced.
- ✅ No Google / Outlook / iCloud / OAuth login prompt introduced.
- ✅ No signed/notarized / Apple-notarized / production-signed / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / guaranteed-award / guaranteed-revenue claim introduced.
- ✅ No `Free demo` / `Try now` / `Download now` / `Get started free` CTA introduced.
- ✅ No deprecated `$79` / `$349` / `$999` pricing in active app UI.
- ✅ No operator-identifying string in renderer.
- ✅ No `.env` / payment / Stripe / checkout / services / scripts / website change.
- ✅ No new dependency in `package.json`.
- ✅ No build artifacts / `dist/` / `release/` / `out/` / `reports/` / media / `.qa/` committed.
- ✅ All Phase 24-series + Phase 25A/B/C/D + Phase 25E.1–25E.8 + Phase 25F invariants preserved.

## Status

Unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.

## Next operator action after merge

```sh
cd ~/sourcedeck-app
git checkout main && git pull origin main
rm -rf dist
npm run pack:mac
bash ~/sd-day0-refresh.sh
```

The new bundle boots with the Calendar nav button visible on cold open, the Calendar pane reachable in one click, and the Today's Work Plan mirror surfacing in the Daily Ops pane. Restart Day 0 GUI checks against the refreshed bundle.

---

## Signature

Phase 25H is a standalone, local-only, open-standard Calendar module + GovCon link contract. No OAuth, no paid API, no external sync, no calendar invites sent. Zero new dependencies. Decision unchanged: **READY FOR LIMITED PAID PILOT — UNSIGNED DEV/RC BUILD**.
