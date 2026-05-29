# Phase 13 — Operator Smoke Evidence

## Environment constraint (read first)

This phase was executed in a **headless agent environment** on macOS with:

- No GUI/window session available to the agent (`DISPLAY` unset; no
  interactive desktop session driveable by the agent).
- **No browser-automation tooling** installed (Playwright / Puppeteer
  absent from `node_modules`).
- The `computer-use` MCP (desktop screenshot/control) **disconnected**
  during this session.

Therefore the Electron GUI **was not launched or visually observed by
the agent, and PNG screenshots could not be auto-captured.** Per the
Phase 13 rules, this is documented honestly rather than faked.

Instead, the operator smoke was executed two ways that ARE possible
headlessly:

1. **Functional smoke** — `headless-smoke-driver.mjs` exercises the
   REAL main-process service logic behind each operator UI action with
   synthetic data. Output saved to `functional-smoke-output.txt`
   (**19/19 PASS**).
2. **Static surface/copy verification** — `npm run govcon:outreach-os:audit`
   (66/66) and grep checks confirm the UI surfaces, approved/forbidden
   copy, and HTML-escaping are present.

## Checklist coverage map (all 30 items)

| Item | How verified | Result |
|------|--------------|--------|
| 1 Launch app | Static: app entry + tab panes present (audit) | UI not launched by agent — operator step |
| 2 Setup wizard appears if incomplete | Functional/static: auto-open logic + govcon-setup-wizard tests | PASS (logic) |
| 3 Add/skip SAM key (presence-only) | Static: `sd.credentials.set('sam-gov')`, wizard tests | PASS (logic) |
| 4 Raw key never shown after save | Static: input cleared, no `credentials.get` in renderer | PASS (boundary) |
| 5 Open GovCon tab | Static: `id="tab-govcon"` | PASS (surface) |
| 6 SAM search w/o key -> fallback | Functional driver | PASS |
| 7 GovCon Analyze deterministic | Functional driver (`deterministicDecision`) | PASS |
| 8 KILL cannot be promoted by AI | Functional driver (`fast-cash` KILL stays KILL) | PASS |
| 9 RED_RESTRICTED blocks outreach | Functional driver (`outreach-window`) | PASS |
| 10 Official Q&A for restricted active | Functional driver (`guardDraft`) | PASS |
| 11 Open Outreach tab | Static: `id="tab-outreach"` | PASS (surface) |
| 12 SAM Opportunity Outreach demo | Functional driver (scan demoMode) | PASS |
| 13 Closing-window 7/30 filters | Functional driver | PASS |
| 14 Past-deadline excluded | Functional driver | PASS |
| 15 Draft staged only, not sent | Functional driver | PASS |
| 16 requiresApproval:true / sendingEnabled:false | Functional driver (persisted) | PASS |
| 17 Overclaim/cert language scrubbed | Functional driver (`scrubClaims`) | PASS |
| 18 Open Prime Partners | Static: `id="tab-primes"` | PASS (surface) |
| 19 Prime Finder by NAICS (demo) | Functional driver (16 primes) | PASS |
| 20 Live USAspending / graceful fallback | Functional driver (graceful error) | PASS |
| 21 Scoring labels display | Functional driver (`getScoreLabel`) | PASS |
| 22 Generate prime outreach draft | Functional driver | PASS |
| 23 No email auto-sent | Functional driver (flags) | PASS |
| 24 Generate capability memo | Functional driver | PASS |
| 25 Human-review footer | Functional driver (`NO_AUTO_SEND_NOTE`) | PASS |
| 26 Prime status lifecycle | Static: status `<select>` + `ppfUpdateStatus` (12-state) | PASS (control present) |
| 27 Exports strip secrets | Functional driver (`createExport`) | PASS |
| 28 Readiness approved copy | Static grep (all 4 phrases) | PASS |
| 29 No forbidden copy | Static grep (no positive claims) | PASS |
| 30 Result modal escapes HTML | Static: `escapeHtml(JSON.stringify(...))` | PASS |

## Screenshots

Auto-capture was not possible (see constraint above). The required
screenshot list is retained below; an operator with a desktop session
should capture these into this folder before a public release.

| File | Surface to capture |
|------|--------------------|
| 01-app-launch.png | App on launch (Dashboard/Command Center) |
| 02-setup-wizard.png | GovCon setup wizard (Step 1) |
| 03-govcon-tab.png | GovCon tab pipeline + Outreach OS helper |
| 04-readiness-banner.png | GovCon setup banner state |
| 05-official-qa-draft.png | Official Q&A / Clarification Draft modal |
| 06-outreach-tab.png | Outreach tab |
| 07-outreach-demo-results.png | SAM Opportunity Outreach demo scan results |
| 08-outreach-draft-review.png | Outreach draft (requiresApproval / not sent) |
| 09-prime-partners-tab.png | Prime Partners tab |
| 10-prime-results.png | Prime Finder results by NAICS + score labels |
| 11-prime-draft-review.png | Prime outreach draft review |
| 12-capability-memo.png | Capability match memo (human-review footer) |
| 13-export-or-secret-strip-confirmation.png | Export output (no secrets) |

### Manual capture steps

1. On a macOS desktop session, run `npm start`.
2. Walk the 30-step checklist in
   `docs/manual-qa/govcon-outreach-os-release-smoke.md`.
3. Capture each surface above with `Cmd+Shift+4` (region) into this
   folder using the listed filenames.
4. Ensure no real API keys / secrets appear in any screenshot.

## Files in this folder

- `headless-smoke-driver.mjs` — functional smoke driver (re-runnable).
- `functional-smoke-output.txt` — captured driver output (19/19 PASS).
- `README.md` — this file.
