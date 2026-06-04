# Audit — Default-State Data Hygiene

**Date:** 2026-06-04
**Branch:** `fix/remove-preloaded-operator-data`
**Base:** `main @ d71a9a6` (after Response Desk merge)
**Phase:** Cleanup — remove preloaded operator/demo/user-specific data from ordinary user-facing screens.

## Pre-existing state (contamination found)

A static-source scan of `sourcedeck.html` surfaced the following preloaded operator/demo/seed data in default user-facing markup (i.e. visible to a brand-new install with no user action):

| Surface | Contamination | Lines (pre-cleanup) |
|---|---|---|
| Dashboard → Automation Status card | `PROD-01 Assessment / PROD-02 Notion Sync / PROD-03 Instantly (4595758) / PROD-04 Reply Intel / PROD-05 Booking Brief` rows, all marked `ACTIVE` | 997–1002 |
| Leads → Region select | Operator-priority markets (NYC Metro, Mid-Atlantic), Spanish Caribbean (Puerto Rico, Dominican Republic, Cuba, Jamaica), Mexico, Colombia, Canada, South Africa, UK clusters | 1024–1075 |
| Ad Engine pane title | "Faceless Ad Engine" | 1285 |
| Ad Engine → Topic select | 60+ operator-codenamed topics across "Diagnosis-First Families (20)", "SourceDeck (GovCon Opportunity Intelligence)", "MedPilot (Ophthalmology & Specialty)", "Legacy Topics" — including Revenue Leakage Math, Operator POV, Government Contractor Diagnostic, Caribbean & LatAm Operator Diagnostic, Bad-Fit Opportunity Chase, etc. | 1308–1376 |
| Ad Engine → Industry select | 6 operator-biased industries only | 1380–1386 |
| Ad Engine → Platform select | 4 platforms only | 1394–1398 |
| Ad Engine → Campaign placeholder | `"e.g. NYC PM Q2 2026"` | 1396 |
| Sysflow → Active Webhooks card | PROD-01 / PROD-05 rows with fake tokens (`ti5tlit9s9ir0sr1vha7vqjyemcuvlnq`, `jpu2xjxufd8x7yt3qnsk9ntxd0ns77jk`) | 1511–1514 |
| Sysflow → Infrastructure card | `Airtable Base: appXXXXXXXXXXXXXXX`, `Notion Leads DB`, `Instantly Campaign`, `Gmail Connection: 8125092` | 1516–1521 |
| Sysflow → HTTP Standards card | hard-coded body-type rules | 1523–1527 |
| AI Generate → Target profile placeholder | `"Healthcare / medical billing practices in NYC with 5-50 employees…"` | 1640 |
| AI Generate → Geography select | Full New York metro split (Manhattan, Bronx, Brooklyn, Queens, Staten Island, Long Island, Westchester), Mid-Atlantic, Southeast, Texas, Midwest, West Coast, Southwest, Canada, Spanish Caribbean, Mexico, Colombia, UK, South Africa, Scope (~80+ options) | 1655–1745 |
| AI Generate → Industry Focus | Operator-biased 8-industry list including "AI / Automation Agency" | 1747–1758 |
| AI Generate → Assessment Webhook label | `"Assessment Webhook (PROD-01-v2)"` | 1864 |
| AI Generate → System Identifiers card | `Airtable Base: appXXXXXXXXXXXXXXX`, `Gmail Connection: 8125092`, `Notion Leads DB` rows | 1873–1877 |
| AI Generate → Automation Path Confirmed card | Sequence hardcoded as `Airtable → Notion (PROD-02, 15min) → Instantly (PROD-03, …) → Reply / Booking (PROD-04 → PROD-05)` | 1880–1885 |
| Daily Operating Rhythm → Day options | `Day 1 — Outreach + Replies`, `Day 2 — Follow-Up + Content`, etc. | 1445–1448 |
| Daily Operating Rhythm → Weekly Rhythm card | 5 hardcoded operator weekly tasks including Notion stage updates | 1463–1471 |
| Daily Operating Rhythm → Operator Escalation Rules card | 5 hardcoded operator escalation rules | 1473–1480 |
| Clinical config locations placeholder | `"Main Office — 123 Main St, Bronx, NY"` | 2820 (now 2748) |

## What was removed

### Dashboard
- Automation Status card: 5 PROD-XX rows → single empty state: *"No automations active. Connect tools in Settings to populate this panel."*

### Leads pane
- Region select: 8 operator/diaspora-tied optgroups (Priority Markets, Spanish Caribbean, Mexico, Colombia, Canada, South Africa, UK) → neutral 4-option list (`United States (Nationwide)`, `Canada`, `United Kingdom`, `User-defined`).

### Ad Engine pane
- Title: "Faceless Ad Engine" → **"Ad Engine"**.
- Topic select: 60+ operator-codenamed topics → **11 generic intent-based categories** (Awareness, Lead generation, Educational, Offer, Retargeting, Testimonial, Seasonal, Recruiting, Brand authority, Product/service explainer, Other) + helper copy *"Topics are generated from your industry, platform, offer, audience, goal, and notes."*
- Industry select: 6 operator-biased industries → **49 Top-50 industries** + "All / Mixed" default + "Other".
- Platform select: 4 platforms → **27 Social/Content Platforms** (Instagram, Facebook, LinkedIn, TikTok, YouTube, YouTube Shorts, X / Twitter, Threads, Pinterest, Snapchat, Reddit, Quora, Google Business Profile, Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads, YouTube Ads, Email, SMS, Blog / SEO, Landing Page, Podcast, Webinar, Marketplace, Multi-Platform, Other).
- Campaign placeholder: `"e.g. NYC PM Q2 2026"` → `"e.g. Q2 product launch"`.

### Sysflow infrastructure cards
- Active Webhooks: 3 PROD rows with fake tokens → empty state.
- Infrastructure: 4 operator integration rows → empty state.
- HTTP Standards: 4 hard-coded body-type rules → empty state.

### AI Generate (Create Lead)
- Target profile placeholder: NYC/medical-billing example → generic *"Describe your ideal customer, location, offer, company size, pain point, and urgency…"*
- Geography select: 80+ operator-biased regions → neutral 5-option list (`Select market…`, `Nationwide`, `United States`, `Canada`, `United Kingdom`, `User-defined`).
- Industry Focus: 8 operator-biased industries → 43 broad industries.
- Assessment Webhook label: `(PROD-01-v2)` codename → plain "Assessment Webhook" + placeholder URL.
- System Identifiers card: 5 operator integration rows → empty state.
- Automation Path Confirmed card: hardcoded PROD-XX sequence → empty state.

### Daily Operating Rhythm pane
- Day options 1–4: operator copy → neutral `Day 1`/`Day 2`/`Day 3`/`Day 4`.
- Day-1 title: operator copy → neutral `Day 1`.
- Day-1 checklist: empty → empty-state message *"No operating rhythm yet. Add tasks, connect workflows, or ask AI to generate a daily rhythm from your goals."*
- Weekly Rhythm card: 5 hardcoded operator weekly tasks → empty state.
- Operator Escalation Rules card: 5 hardcoded operator rules → renamed "Escalation Rules" + empty state.

### Clinical config
- Locations placeholder: `"Main Office — 123 Main St, Bronx, NY"` → neutral `"Street, City, State"` template.

## What remains only behind explicit demo mode

The MOCK_LEADS and PROMPT_LIBRARY arrays already ship empty (`MOCK_LEADS=[]`, `PROMPT_LIBRARY={}`) and are wired to load from `demo/fixtures.json` only when explicitly enabled. The new `services/default-state-policy.js` formalizes this gate: `isDemoMode(env)` returns `true` only when `SOURCEDECK_DEMO_MODE` is exactly `'true'` / `'1'` / `1` / `true`. Demo data is **off by default** and there is no production code path that flips it without operator intent.

## What is now safe for a new user

- **Brand new user** opening the app for the first time sees:
  - Dashboard with no automation status rows (empty state).
  - Leads pane with 4 generic region options.
  - Ad Engine titled "Ad Engine" with generic 11-category topics, 49 industries, 27 platforms.
  - Sysflow infrastructure cards all empty until tools are connected.
  - AI Generate with neutral target profile placeholder, neutral 5-option geography, 43 broad industries.
  - Daily Operating Rhythm with no preloaded weekly tasks or escalation rules.
  - Response Desk pane with no preloaded operator state (unchanged from PR #51 — already clean).
  - GovCon SAM Sprint behavior unchanged (Free=1 NAICS / paid=many; preserved).
- **No fake production tokens, no operator IDs, no operator-specific geographies, no operator topic codenames, no operator escalation rules.**

## New policy module

`services/default-state-policy.js` exports:
- `isDemoMode(env)` — `true` only when `SOURCEDECK_DEMO_MODE === 'true' | '1' | 1 | true`.
- `assertNoOperatorSeedData(value)` — throws with `code: 'FORBIDDEN_SEED_TERM'` when any forbidden term (operator names, PROD-XX, internal IDs, operator-bias geographies, operator topic codenames, fake demo IDs) is found.
- `sanitizeDefaultUserState(value)` — recursively scrubs forbidden terms from strings / arrays / objects.
- `FORBIDDEN_SEED_TERMS` — the canonical exclusion list (regexes + strings).
- `DEFAULT_EMPTY_STATES` — 14 named empty-state copy strings.
- `TOP_50_INDUSTRIES` — 50 entries (broad coverage).
- `SOCIAL_CONTENT_PLATFORMS` — 27 entries (all major social/content platforms).
- `GENERIC_AD_TOPIC_CATEGORIES` — 11 intent-based categories.

UMD-style: works as a CommonJS module for tests and attaches to `window.SDDefaultState` for renderer use (loaded via `<script src="services/default-state-policy.js">` in `<head>`, no preload/main change required).

## Tests (`test/default-state-policy.test.js`)

22 tests, 22 pass:

| # | Test | Result |
|---|---|---|
| 1 | demo mode is OFF by default | ✅ |
| 2 | demo mode requires SOURCEDECK_DEMO_MODE=true | ✅ |
| 3 | TOP_50_INDUSTRIES ≥ 50 + key industries present | ✅ |
| 4 | SOCIAL_CONTENT_PLATFORMS contains all major platforms | ✅ |
| 5 | GENERIC_AD_TOPIC_CATEGORIES are generic | ✅ |
| 6 | assertNoOperatorSeedData flags PROD-XX, NYC, ARCG, Jean-Max, etc. | ✅ |
| 7 | assertNoOperatorSeedData ignores neutral text | ✅ |
| 8 | sanitizeDefaultUserState scrubs forbidden terms from objects | ✅ |
| 9 | DEFAULT_EMPTY_STATES covers all critical surfaces | ✅ |
| 10 | renderer markup has no PROD-XX activity rows | ✅ |
| 11 | renderer markup has no NYC/Manhattan/Brooklyn dropdown defaults | ✅ |
| 12 | renderer markup has no Spanish Caribbean dropdown | ✅ |
| 13 | renderer markup has no fake operator IDs | ✅ |
| 14 | renderer markup has no operator ad topics | ✅ |
| 15 | Ad Engine pane title is "Ad Engine" (not "Faceless Ad Engine") | ✅ |
| 16 | Response Desk label still present + no Reply Analyzer regression | ✅ |
| 17 | Response Desk: no Send Email surface | ✅ |
| 18 | Response Desk service module still preserves invariants | ✅ |
| 19 | SAM Sprint entitlements: Free=1, paid plans allow many | ✅ |
| 20 | SAM_GOV_API_KEY remains environment-only | ✅ |
| 21 | `.btn-gold` remains cool gold (no global `--gold` repoint) | ✅ |
| 22 | 900px / 899px breakpoint guards present | ✅ |

## Files changed

- `sourcedeck.html` (modified) — 12 surgical markup edits removing operator/demo seed data; renames "Faceless Ad Engine" → "Ad Engine"; replaces topic/industry/platform/geography dropdowns; replaces infrastructure cards with empty states; loads the new policy module via `<script src>`.
- `services/default-state-policy.js` (new) — UMD policy module.
- `test/default-state-policy.test.js` (new) — 22 tests covering policy + renderer hygiene + regressions.
- `docs/audits/default-state-data-hygiene-audit.md` (this file).
- `docs/release-notes/default-state-data-hygiene.md` (new).
- `package.json` (modified) — appends `test/default-state-policy.test.js` to `npm test` chain.

No file outside this set was modified. No `.env`, `main.js`, `preload.js`, `chartnav-integration.js`, `reports/**`, SAM Sprint service / CLI, GovCon entitlement, Response Desk service or test, watsonx, signing, Vercel, ARCGSystems, ChartNav, sourcedeck-site, or Buffer file was touched.

## Confirmations

- **No secrets** committed. `assertNoOperatorSeedData` flags any string containing the operator's known seed identifiers; tests verify.
- **No `.env`** changes.
- **No reports** committed (gitignored output paths unaffected).
- **No SAM Sprint behavior change.** `services/govcon/sam-sprint-entitlements.js` and `services/govcon/sam-opportunity-sprint.js` not touched. Free=1 / paid=many entitlement preserved (asserted by test #19).
- **No Response Desk behavior change.** `services/response-desk.js` and `test/response-desk.test.js` not touched. The renderer pane is untouched. Tests #16–#18 verify Response Desk invariants still hold.
- **No Phase 20G visual guard regression.** `.btn-gold` remains cool gold (`--gold:#C9941A`); 900px/899px responsive boundary preserved. Asserted by tests #21–#22.
- **Stashes untouched** (`git stash list` empty before and after).
- **Old SoHo/DC stash not applied.**
- **No GovCon Capture OS stash touched.**
- **No runtime outreach behavior changed.** All changes are static-markup substitutions of preloaded data with empty states or generic options.
- **No payment, pricing, watsonx-live, signed-notarized, compliance claims added.**
