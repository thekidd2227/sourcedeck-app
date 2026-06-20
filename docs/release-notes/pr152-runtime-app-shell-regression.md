# Release notes — Block app-shell text across solicitation and vendor sinks

**Branch:** `fix/pr152-runtime-app-shell-regression`

## What was wrong

In the installed Buyer Trial app, the **Vendor Quote Room** could display
SourceDeck's own navigation/help text and raw CSS as if it were solicitation or
vendor content (the "app-shell dump"). The Scope Coverage and Vendor Candidates
tables rendered persisted workspace data without screening it for app-shell text.

## Root cause

The Vendor Quote Room renderers added in PR #151 (`renderCoverage`,
`renderCandidates`) wrote persisted state into the page through a helper that
only removed angle brackets. SourceDeck UI/CSS text has no angle brackets, so it
was displayed verbatim. The stronger app-shell guard added in Phase 25AL
protected the Solicitation Center but was never applied to these newer sinks.
PR #152 did not change any runtime code.

## What changed

- A single shared render-time boundary now screens every dynamic field before it
  reaches the page, substituting a clear safe message when it detects app-shell
  text:

  > SourceDeck blocked application UI text from being rendered as solicitation or
  > vendor content. Clear contaminated workspace data and re-import the
  > solicitation.

- The Vendor Quote Room Scope Coverage, Vendor Candidates, Quote Tracker, and
  Vendor Comparison tables are all shielded, including a row-level check so a
  contaminated row shows the safe message instead of leaking scattered UI text.
- On launch, SourceDeck now quarantines any app-shell text already saved in the
  Vendor Quote Room workspace, removing only the contaminated text fields and
  flagging the workspace for re-import.

## What is preserved

All existing capabilities are intact: manual upload of up to five solicitation
documents, extraction across all selected documents, Solicitation Center field
mapping, Proposal Workspace, Vendor Quote Room capability mapping, vendor search
strategy, draft outreach, and approval/send safeguards. Quarantine never deletes
credentials, saved pursuits, vendor records, pricing, company profile, past
performance, or valid solicitation metadata.

## Verification

- New regression test `test/pr152-runtime-app-shell-regression.test.js`
  (7/7) reproduces the dump against the real renderers and proves it is blocked,
  valid content still renders, and quarantine preserves protected data.
- Reproduced and fixed live (CDP) in the exact installed Buyer Trial bundle:
  before, all app-shell markers leaked into `#gc-vqr-scope-coverage` /
  `#gc-vqr-vendor-candidates`; after, zero markers, the safe message appears, and
  valid rows remain.
- `npm test` suite, `govcon:smoke` (47/0), `troubleshooting:scan`, and
  `release-check` all green (the only failing suite test,
  `phase-24d-buyer-surface-tightening`, is a pre-existing font/CSS check
  unrelated to this fix).
