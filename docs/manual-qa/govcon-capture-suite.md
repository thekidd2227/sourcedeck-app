# Manual QA — GovCon Capture Suite

Manual verification steps for the GovCon capture-suite extensions
(deadline extraction, subcontractor sourcing, incumbent research,
scheduled SAM search, deterministic solicitation analysis, compliant
Q&A / email drafting, proposal workspace, shared exports, opportunity
record storage).

Run these against a local build before approving the PR. None of these
steps should ever expose raw API keys in the renderer, logs, exports,
or UI state.

## Setup

1. Launch the app (`npm start`).
2. Open the **GovCon** tab.

## SAM search (with and without key)

3. Run a SAM search **without** a SAM API key configured.
   - Expect a graceful fallback (sam.gov human-search URL), no crash,
     and no key required.
4. Configure a SAM key in Settings, then run a SAM search again.
   - Expect normalized, deduped, targeted results.
   - Confirm the key never appears in the renderer, console, or network
     panel request initiator from the renderer (the request is issued
     by the main-process service).

## Opportunity actions

5. **Favorite** an opportunity and confirm it persists.
6. With an opportunity selected, run each capture action:
   - **Dates** (deadline extraction)
   - **Subs** (subcontractor sourcing)
   - **Incumbent** (incumbent research)
   - **Q&A** (clarification strategy)
   - **Proposal** (proposal workspace)
   - **Analyze** (solicitation analysis)
   - Confirm each returns deterministic output and a human-review note.

## Procurement-integrity controls

7. For an **active solicitation**, confirm outreach behavior is
   **official Q&A-only** — the suite must not draft informal outreach
   to a CO/COR during the restricted window.
8. Confirm **RED_RESTRICTED** blocks informal outreach draft generation
   entirely (no draft is produced; only the official Q&A path is
   offered).
9. Confirm a **KILL** verdict cannot be promoted/undone without
   user-reviewed evidence — KILL stays KILL.

## Credential & data-integrity checks

10. Confirm **no raw credentials** appear in the renderer, logs,
    exports, or UI state at any point.
11. Open an **export** and confirm it contains **no API keys** or
    authorization headers.
12. Confirm **no fabricated vendor or incumbent data** is presented as
    verified — inferred/candidate data must be labeled as such, and
    low-confidence results must be marked, not asserted as fact.
