# Phase 25X — Web Opportunity Intel Contract

## Placement
An internal **mode** of GovCon → Find Opportunities, toggled at the top of the
page: **SAM.gov API Search** (default, canonical) and **Web Opportunity Intel**
(supplemental). Implemented as `#gc-find-mode-sam` / `#gc-find-mode-web`
panels with a `gcFindMode()` toggle.

### Why a standalone "SAM Search" sidebar tab was rejected
A standalone SAM Search sidebar tab + a second SAM search section would
duplicate the canonical search, clutter the sidebar, and bypass the GovCon
tab-page architecture. The earlier truncated CSS snippet (`ss-layout`,
`ss-form-col`, `ss-profile-strip`, `data-tab="samsearch"`) is explicitly
rejected and asserted absent by `phase-25x-no-clutter-regression`.

## Form parameters
NAICS, set-asides, place of performance, agency focus, contract type, dollar
range, deadline window, keywords, source group (Federal / Defense / Civilian /
State-local / Aggregators / All), and max results (10/25/50). Button: **Run
Web Intel Search**. No auto-run.

## Provider boundary
Web capability is determined through the AI provider boundary
(`sd.aiProviderStatus()`). The default `local` deterministic provider is **not**
web-capable.
- **No web-capable provider** → SourceDeck does not fake results. It shows:
  "No web-search provider configured. SourceDeck can prepare a search plan, but
  cannot verify live web opportunities until a web-capable provider is
  connected," plus **Generate Search Plan**, **Copy Search Prompt**, and
  **Paste Web Search Results for Structuring**.
- **Web-capable provider** → the structured prompt is sent through
  `sd.ai.generate` (credential boundary) and the JSON results are parsed.

## Prompt template (managed builder)
`buildPrompt()` composes: system role, search parameters, source groups,
active-only rules, output schema, precision rules, caveats. It requires:
active/open/future only; no expired/awarded/cancelled; title + working source
URL required; deadlines verified or "VERIFY ON SOURCE"; no fabricated
solicitation numbers/agencies/deadlines; a source-coverage report; an
inaccessible/blocked report; duplicates flagged.

## Output + parser
Table columns: Title, Sol #, Agency, NAICS, Set-aside, Type, Deadline, Place,
Source, Confidence, Actions (Open Source, Save to SourceDeck, Mark Pursue,
Send to Solicitation Workspace, Check in SAM.gov, Add Note). The parser is
**active-only** (drops expired/awarded/cancelled/closed), requires a title and
a source URL, and flags duplicates.

## SAM.gov cross-check
"Check in SAM.gov" queries the SAM.gov API by solnum/title (user-triggered, no
auto-run). Matched → "SAM.gov matched"; otherwise "Not matched in SAM.gov —
verify source manually." Saved Web Intel results are labeled **"Web Intel —
verify on source"** and are never treated as SAM.gov-verified unless matched.

## Source coverage report
Sources searched, sources with no result, inaccessible/blocked sources, total
found, closing within 30 / 31–90 days, forecast/pipeline, filters relaxed.

## Safety
No auto-run. No portal scraping. No login bypass (login-protected pages are
reported inaccessible; the user can paste results manually). No send/submit/
upload. No raw provider/API key in the DOM, logs, or URLs.
