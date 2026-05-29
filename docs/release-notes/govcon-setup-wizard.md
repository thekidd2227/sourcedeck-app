# GovCon First-Time Setup Wizard + Release Smoke

## Why this phase exists

The GovCon Capture Suite is merged, but a new user landing in the GovCon
tab faces an empty workspace with no guidance: no profile, no SAM.gov
key, no opportunities. This phase makes the existing suite usable, safe,
and release-ready — it adds onboarding and release-smoke tooling, not new
capture features.

## What changed

- **First-time setup wizard** in `sourcedeck.html` — a 5-step guided
  flow (profile → SAM.gov access → demo/import → safety → finish).
- **GovCon setup banner** — a state-only banner at the top of the GovCon
  tab using approved vocabulary ("Setup incomplete", "Ready for review",
  "Demo data"). It never claims "compliant", "certified", "fully
  operational", or "safe to send".
- **Readiness banner integration** — the workspace readiness banner now
  surfaces GovCon profile and SAM.gov key state (presence-only).
- **Release smoke tooling** —
  `scripts/govcon-release-smoke.mjs` (static checks) wired as
  `npm run govcon:smoke`, plus the manual checklist
  `docs/manual-qa/govcon-release-smoke.md`.
- **Tests** — `test/govcon-setup-wizard.test.js` added to `npm test`.

## What it enables

- A new user can complete GovCon setup without reading docs.
- SAM.gov key onboarding through the existing safe credential boundary.
- Clear, honest workspace state at a glance.
- A fast pre-release gate (`npm run govcon:smoke`) before shipping.

## Security boundary

- The renderer only calls `sd.credentials.set / status / remove`.
- The SAM.gov key is stored under service id `sam-gov` via the
  main-process `safeStorage` credential adapter.
- The renderer never reads a raw key (`credentials.get` is main-process
  only), never logs one, and never builds an Authorization / x-api-key
  header. Key status is presence-only; the input is cleared from the DOM
  immediately after save.

## Procurement-integrity guardrails (unchanged)

- `RED_RESTRICTED` continues to block informal outreach draft generation.
- A `KILL` decision remains irreversible.
- AI does not make final bid/no-bid, outreach, compliance, proposal, or
  pricing decisions; deterministic rules run first and AI cannot override
  `KILL` / `MORE_RESEARCH_NEEDED`.
- The wizard's safety step restates these explicitly to the user.

## Manual smoke instructions

Run the static gate, then the manual checklist:

```
npm test
npm run govcon:smoke
```

Then follow `docs/manual-qa/govcon-release-smoke.md` against a local
build (`npm start`) — confirm the wizard appears when setup is
incomplete, SAM status is presence-only, the banner uses safe wording,
and procurement guardrails hold.

## Known limitations

- The wizard's "import first opportunity" option captures a title /
  solicitation string only; full ingestion still uses the existing SAM
  search / opportunity-record paths.
- Demo mode is a labeled flag; it does not fabricate verified vendor or
  incumbent data.
- `npm run govcon:smoke` is a static wiring/boundary gate; true UI
  behavior still requires the manual checklist.
- Codesigning warnings from `release-check` are environment-related and
  out of scope for this phase.

## Rollback guidance

This phase is additive (wizard UI + banner + smoke tooling + one test).
To roll back, revert the phase commit / PR; the GovCon Capture Suite and
credential boundary are unaffected. No data migrations are involved, and
no stored credentials are modified by a rollback.
