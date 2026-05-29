# GovCon Outreach OS — Release Hardening (Phase 12)

## Why this phase exists

Several GovCon flows shipped in separate PRs (#18 SAM Opportunity
Outreach, #19 Prime Partner Finder, #20 First-Time Setup Wizard) on top
of the existing GovCon Capture Suite. This phase does **no new feature
work** — it integrates and hardens those flows into one coherent
"GovCon Outreach OS", verifies the credential boundary and
procurement-integrity guardrails hold across the merged surfaces, and
closes the UI-verification gap PR #18 flagged.

## PRs integrated

- **#18** — SAM.gov Opportunity Outreach Agent (MERGED)
- **#19** — Prime Partner Finder — subcontracting outreach by NAICS (MERGED)
- **#20** — First-Time GovCon Setup Wizard + smoke checks (MERGED)

## What was verified

A read-only baseline + 6-dimension static integration audit confirmed:

- **UI surfaces** — GovCon tab, Outreach tab (`tab-outreach`), Prime
  Partners tab (`tab-primes`), Setup button + 5-step wizard modal,
  readiness banners (`workspace-readiness` + `govcon-setup-banner`),
  "Official Q&A / Clarification Draft" label, no-auto-send / human-
  approval language, demo/sample labeling.
- **Preload** — one `window.sd.govcon` root with `deadlines`,
  `subcontractors`, `incumbent`, `solicitation`, `clarifications`,
  `communications`, `exports`, `scheduledSearches`, `outreach`
  (`scan`/`generateDraft`/`setStatus`/`export`), `primes`
  (`find`/`findLive`/`draft`/`memo`); `credentials` is presence-only
  (`status`/`set`/`remove`, no `get`).
- **IPC** — matching `govcon:*` and `credentials:*` handlers in `main.js`.
- **API** — `api/index.js` wires outreach, primes, exports, and
  solicitation analysis; the SAM key is read only in the main process
  (`credentials.get('sam-gov')`).
- **Guardrails** — RED_RESTRICTED blocks outreach drafts; KILL is
  irreversible; MORE_RESEARCH_NEEDED exists; AI cannot override
  deterministic verdicts; `requiresApproval:true` + `sendingEnabled:false`
  are defensively re-asserted in both outreach and prime services;
  export secret stripping is present; human-review language is present.
- **Credential boundary** — INTACT. No Authorization/x-api-key/Bearer
  construction, no raw key reads, no `credentials.get` in the renderer/
  preload, no email transport/send path.

## User journey

Find opportunities → score fit → prepare draft outreach → identify
prime partners → review and approve. A coherence helper line and safety
microcopy ("Drafts only. Human approval required. Follow solicitation
instructions and communication windows.") were added to the GovCon pane.

## Credential boundary

The renderer never receives raw SAM.gov / OpenAI / Anthropic / Airtable
/ Apollo keys and never builds auth headers. Keys live in main-process
`safeStorage`; the renderer uses presence-only
`sd.credentials.status/set/remove`. Exports strip secret-shaped fields.

## Procurement-integrity guardrails

- RED_RESTRICTED blocks informal outreach drafts during restricted/
  active windows; only the official Q&A mechanism is offered.
- KILL stays KILL (irreversible); AI cannot promote it to a bid.
- AI does not make final bid/no-bid, outreach, compliance, proposal,
  pricing, or teaming decisions; deterministic rules run first.

## No-auto-send rule

No outreach or prime email is ever sent by the app. Both services assert
`requiresApproval:true` and `sendingEnabled:false`; there is no SMTP /
nodemailer / transport / sendMail path anywhere in the codebase.

## Manual QA checklist

`docs/manual-qa/govcon-outreach-os-release-smoke.md` — a 30-step
integrated operator flow. This must be run by an operator against a
local build before release (closes the PR #18 UI-verification gap).

## Automated tests / scripts added

- `scripts/govcon-outreach-os-audit.mjs` → `npm run govcon:outreach-os:audit` (66 checks).
- `test/govcon-outreach-os-integration.test.js` → wired into `npm test` (12 checks).

## Known limitations

- Live USAspending prime lookup (`primes.findLive`) requires network;
  tests/audit cover only the graceful-fallback path with synthetic data.
- PDF/DOCX text is assumed pre-extracted; no live binary parsing or web
  scraping was added.
- `release-check` codesigning warnings are environment-related (unsigned
  dev artifact) and out of scope.
- The static audit verifies wiring and copy; true UI behavior still
  requires the manual operator checklist.

## Release readiness decision

**Conditionally release-ready.** All automated gates pass (npm test,
`govcon:smoke` 47/0, `govcon:outreach-os:audit` 66/0, `i18n:audit`
31/31, `release-check` 0). The credential boundary and procurement
guardrails are verified intact. **The one remaining gate is the manual
operator smoke** (`docs/manual-qa/govcon-outreach-os-release-smoke.md`),
which must be signed off before shipping a build that exposes the GovCon
Outreach OS.

## Rollback guidance

This phase is additive (audit script, integration test, docs, a small
UI helper line). To roll back, revert the phase commit/PR; the GovCon
Capture Suite, outreach, prime-finder, setup wizard, and credential
boundary are unaffected. No data migrations; no stored credentials are
changed by a rollback.
