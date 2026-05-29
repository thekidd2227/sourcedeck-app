# Phase 13 — Release Candidate Report

- **Date:** 2026-05-29
- **Branch:** `release/phase-13-operator-smoke-rc`
- **main HEAD at start:** `ff304c73d7f5793730ead71ff8886ad7a03ec4ae` (Phase 12 merge)
- **PRs included:** #18 (SAM Opportunity Outreach), #19 (Prime Partner
  Finder), #20 (First-Time Setup Wizard), #21 (Outreach OS Integration QA)

## Automated gates (re-run on this branch)

| Gate | Result |
|------|--------|
| `npm test` | PASS — full suite incl. opportunity-outreach 28/28, prime-partner-finder, govcon-setup-wizard 12/12, govcon-outreach-os-integration 12/12, credential-boundary 14/14 |
| `npm run govcon:smoke` | PASS 47/0 |
| `npm run govcon:outreach-os:audit` | PASS 66/0 |
| `npm run i18n:audit` | PASS 31/31 |
| `node scripts/release-check.js` | PASS (only non-fatal codesign WARN — unsigned dev artifact) |
| `npm run phase13:rc-check` | PASS |

## Manual smoke checklist result

Source of truth: `docs/manual-qa/govcon-outreach-os-release-smoke.md`
(30 steps).

**Was the real UI launched?** No. This phase ran in a headless agent
environment (macOS, no driveable GUI session; Playwright/Puppeteer
absent; `computer-use` MCP disconnected). The Electron GUI was **not
launched or visually observed by the agent**, and PNG screenshots could
not be auto-captured. This is documented honestly, not faked.

In place of visual UI smoke, two headless-possible methods were run:

1. **Functional smoke** (`docs/release-evidence/phase-13-operator-smoke/headless-smoke-driver.mjs`)
   — exercises the real main-process service logic behind each operator
   action with synthetic data: **19/19 PASS**
   (`functional-smoke-output.txt`).
2. **Static surface/copy verification** — `govcon:outreach-os:audit`
   (66/66) + targeted greps for approved/forbidden copy and HTML escaping.

**Per-item coverage:** all 30 checklist items are accounted for in
`docs/release-evidence/phase-13-operator-smoke/README.md`. Items
6–10, 12–17, 19–25, 27 are functional-driver PASS; items 26, 28, 29, 30
are static-verified PASS; items 1, 5, 11, 18 are surface-present;
items 2–4 are logic/boundary-verified. **Visual confirmation of the
rendered UI remains an operator step.**

## Evidence folder

`docs/release-evidence/phase-13-operator-smoke/`
(README + functional smoke driver + captured output; screenshots to be
captured by an operator with a desktop session).

## Bugs found

None in the product. The functional driver initially reported 3
mismatches that were **driver-shape errors, not product defects**:
`generateDraft` persists `requiresApproval:true`/`sendingEnabled:false`
via `opportunities.patch(...)` (the test fake lacked `get`/`patch`), and
`analyzeSolicitation` returns `deterministicDecision` (the driver
checked `decision`). After correcting the driver to the real contracts,
all 19 functional items pass.

## Fixes made

No product code fixes were required. Changes in this phase are additive
release-gate artifacts only:
- `scripts/phase-13-rc-check.mjs` (+ `npm run phase13:rc-check`)
- `docs/manual-qa/...` already present from Phase 12; evidence + report
  added here.

## Credential-boundary confirmation

INTACT. Renderer/preload build no Authorization/x-api-key/Bearer
headers, never read a raw key, expose only presence-only
`credentials.status/set/remove` (no `get`). The SAM key is read only in
the main process (`credentials.get('sam-gov')`). Exports strip
secret-shaped fields (verified: injected `SECRET_KEY_VALUE` / `Bearer
SECRET` did not appear in export output).

## Procurement-integrity confirmation

- RED_RESTRICTED classified for active restricted solicitations and
  blocks outreach drafts (`draftsAllowed:false`); informal CO contact
  is blocked, routing to official Q&A only.
- KILL stays KILL (irreversible); AI cannot promote it.
- AI does not make final bid/no-bid, outreach, compliance, proposal,
  pricing, or teaming decisions; deterministic verdicts (KILL /
  MORE_RESEARCH_NEEDED) run first.

## No-auto-send confirmation

Both outreach and prime drafts are staged only with
`requiresApproval:true` and `sendingEnabled:false`; no SMTP / nodemailer
/ transport / sendMail path exists anywhere. Prime status lifecycle is
client-side state only (no send).

## Release decision

**PASS WITH WARNINGS — Release candidate ready after listed caveats.**

All automated gates pass and the headless functional smoke is 19/19.
The credential boundary and procurement guardrails are verified intact.
The remaining caveats are operator/release-engineering steps, not
product defects.

## Exact remaining blockers (caveats)

1. **Visual operator smoke not performed by the agent** — an operator
   with a macOS desktop session must walk the 30-step checklist and
   capture the 13 screenshots before a public release. (Functional +
   static coverage is in place; only rendered-UI confirmation is
   outstanding.)
2. **Code signing** — `release-check` reports the macOS artifact is
   unsigned. A signed/notarized build is required for a distributable
   desktop release (release-engineering, out of product scope).

## Recommended delivery model

**Web SaaS / PWA first; Electron later only if a desktop requirement is
proven.**

1. **Web SaaS / PWA first (recommended default).** Browser/PWA delivery
   removes macOS code-signing and notarization friction (caveat #2
   disappears for early access), avoids enterprise desktop-install
   friction and Apple review delays, and lets customers reach the GovCon
   Outreach OS immediately. The credential boundary already keeps keys
   in a main-process/backend trust layer, which maps cleanly to a
   server-side vault in a web deployment.
2. **Electron later.** Add the desktop build once a concrete desktop-only
   requirement is proven (e.g. offline use, local file workflows). It
   should not block early customer access.
3. **Electron-only — not recommended.** Forces signing/notarization and
   install friction onto every customer for no current benefit.

Default recommendation: **Web SaaS/PWA first, Electron later only if a
desktop requirement is proven.**

## Rollback guidance

This phase is additive (RC-check script, evidence folder, report). To
roll back, revert the phase commit/PR; no product behavior, services, or
stored credentials are affected.
