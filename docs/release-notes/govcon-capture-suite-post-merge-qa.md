# GovCon Capture Suite — Post-Merge QA

Post-merge production QA record for the GovCon capture suite.

## References

- **Merge commit:** `3698dbb1d086ce5a0002d2b797ed8afa0e111523`
  (Merge pull request #15 from `feat/govcon-capture-suite`)
- **Feature commit:** `848cdbd feat(govcon): add capture suite extensions`
- **PR:** https://github.com/thekidd2227/sourcedeck-app/pull/15
- **QA run date:** 2026-05-28
- **Branch under QA:** `main`

## Scope

The capture suite adds, within the existing `services/govcon/` boundary:
deadline extraction, subcontractor sourcing, incumbent research,
scheduled SAM.gov searches, deterministic solicitation analysis,
compliant Q&A / email drafting, proposal workspace, shared exports,
and opportunity record storage. No duplicate GovCon subsystem was
created; all flows route through existing `api/index.js` → `main.js`
IPC → `preload.js` (`window.sd.govcon.*`) surfaces.

## Automated test summary

- `npm test` — **all suites green**, including:
  - govcon-core 27/27
  - architecture-boundary 22/22
  - credential-boundary 14/14
  - fast-cash + outreach-window 59/59
  - renderer-ai-migration 15/15, renderer-airtable 12/12, renderer-apollo 14/14
  - workflow-engine 38, connect 33, watsonx 7
- 8 new GovCon suites, each also run individually — all PASS:
  govcon-deadlines, govcon-subcontractor-sourcing, govcon-incumbent-research,
  govcon-sam-scheduled-search, govcon-solicitation-analysis,
  govcon-proposal-workspace, govcon-email-compliance, govcon-export
- `node --check` passes on all new/modified service modules,
  `api/index.js`, `preload.js`, `main.js`, `services/proposal/index.js`.
- `node scripts/release-check.js` — asar contains required files; the
  only warnings are local codesigning (artifact unsigned in dev). Not a
  capture-suite issue.

## Credential boundary summary

- Renderer (`sourcedeck.html`) and `preload.js` build **no** auth
  headers and receive **no** raw API keys. The only `SAM_API_KEY`
  reference in the renderer is a descriptive comment.
- All auth-header construction stays in main-process services
  (`services/airtable`, `services/apollo`, `services/ai/providers/*`,
  `services/govcon/sam-search.js`).
- Exports strip secrets: `services/govcon/export.js` drops any field
  matching `api_key|authorization|secret|token|credential`, and
  `test/govcon-export.test.js` asserts `apiKey` / `Bearer` values do not
  appear in export output.

## Procurement integrity summary

- **RED_RESTRICTED** (`services/govcon/outreach-window.js`) returns
  `draftsAllowed: false, qaOnly: true` — no outreach drafts during a
  restricted communication window.
- `guardDraft()` blocks, regardless of phase, any intent requesting
  source-selection info, incumbent pricing, nonpublic evaluation
  preferences, or inside guidance; and blocks direct COR/CO/program-office
  contact during an active solicitation, directing to the official Q&A
  mechanism.
- The Q&A UI action is labeled **"Official Q&A / Clarification Draft."**
- **KILL is irreversible** (`services/govcon/fast-cash.js`: "Previously
  killed. KILL stays KILL.").
- AI cannot override deterministic verdicts: solicitation-analysis policy
  states "Deterministic rules run before AI. AI may explain or draft but
  cannot override KILL or MORE_RESEARCH_NEEDED." Incumbent research
  returns `MORE_RESEARCH_NEEDED` when confidence is too low rather than
  asserting a fabricated incumbent.

## UI smoke review summary

GovCon table actions render and each calls an existing preload method:

| Button | Handler | Preload call |
|--------|---------|--------------|
| Analyze | `analyzeGovcon` | `sd.govcon.solicitation.analyze` |
| ☆ Favorite | `favoriteGovcon` | `sd.govcon.opportunities.favorite` |
| Dates | `extractGovconDeadlines` | `sd.govcon.deadlines.extract` |
| Subs | `sourceGovconSubs` | `sd.govcon.subcontractors.source` |
| Inc | `researchGovconIncumbent` | `sd.govcon.incumbent.research` |
| Q&A | `draftGovconQuestions` | `sd.govcon.clarifications.generate` |
| Prop | `openGovconProposal` | `sd.govcon.proposal.workspace` |

- Handlers guard missing data (`if(!opp||!window.sd?.govcon?...)return;`) —
  no crash on absent opportunity or unavailable bridge.
- `showGovconResult` renders via `escapeHtml` + `JSON.stringify`
  (XSS-safe) and degrades to a toast if the overlay is absent.
- Results are surfaced as workspace results / drafts for human review;
  no fabricated vendor or incumbent data is presented as verified.

## Manual QA checklist

See `docs/manual-qa/govcon-capture-suite.md` for the operator-run
steps. Summary of must-pass checks:

- [ ] GovCon tab loads with no console crash.
- [ ] SAM search works with and without a SAM key (graceful fallback).
- [ ] Favorite / Dates / Subs / Inc / Q&A / Prop / Analyze each run and
      return a labeled result.
- [ ] Active solicitation → official Q&A-only behavior; no informal
      COR/CO outreach drafts.
- [ ] RED_RESTRICTED blocks informal outreach draft generation.
- [ ] KILL cannot be promoted without user-reviewed evidence.
- [ ] No raw credentials in renderer, logs, exports, or UI state.
- [ ] Exports contain no API keys.
- [ ] No fabricated vendor/incumbent data shown as verified.

## Known limitations

- PDF/DOCX extraction assumes text has already been extracted upstream;
  the suite operates on provided text, not raw binary parsing.
- Linked calendar writes are represented as internal reminder/event
  output unless a provider integration exists.
- Subcontractor and incumbent research use supplied/enriched records;
  no live web scraping was added.
- XLSX/PDF exports are safe export shapes, not full rich-document binary
  rendering unless real binary rendering exists.
- Human review remains required for proposal, Q&A, pricing, and outreach
  content.

## Rollback note

To revert the capture suite, revert merge commit
`3698dbb1d086ce5a0002d2b797ed8afa0e111523`
(`git revert -m 1 3698dbb`). The suite is additive within
`services/govcon/` plus IPC/preload/UI wiring; reverting the merge
removes the new modules, tests, and wiring without affecting the
premium-spec consolidation merged earlier in #11.

## Operator warnings

- Do not present incumbent/pricing/vendor outputs as verified facts;
  low-confidence results are marked `MORE_RESEARCH_NEEDED` for a reason.
- Do not use the suite to contact a CO/COR outside the official Q&A
  mechanism during an active solicitation.
- Keep all API keys in main-process secure storage; never paste keys
  into the renderer or exports.

## What not to claim yet

- Do not claim live PDF/DOCX ingestion or live web scraping.
- Do not claim automated calendar/provider writes unless a provider
  integration is actually wired.
- Do not claim rich binary XLSX/PDF document rendering.
- Do not claim the suite makes autonomous bid/no-bid decisions — final
  decisions remain human, with deterministic gates ahead of AI.
