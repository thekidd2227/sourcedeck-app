# Release Note — Default-State Data Hygiene

**Branch:** `fix/remove-preloaded-operator-data`
**Type:** Cleanup — removes preloaded operator/demo data from ordinary user-facing screens.
**Base:** `main @ d71a9a6` (after Response Desk merge).

## Summary

Removes operator-specific and demo-specific data that was preloaded into ordinary user-facing screens. A brand-new user opening SourceDeck now sees neutral empty states or broad generic starter options rather than the operator's NYC/Caribbean markets, PROD-XX webhook IDs, MedPilot/Diagnosis-First topic codenames, Notion/Instantly/Airtable status rows with fake IDs, or operator-specific weekly rhythm and escalation rules. Demo data is now gated behind an explicit `SOURCEDECK_DEMO_MODE=true` environment variable.

## What changed

- **Ad Engine** renamed from "Faceless Ad Engine" to **"Ad Engine"**.
- **Ad Engine topics** are now 11 generic intent-based categories (Awareness, Lead generation, Educational, Offer, Retargeting, Testimonial, Seasonal, Recruiting, Brand authority, Product/service explainer, Other) with the helper copy "Topics are generated from your industry, platform, offer, audience, goal, and notes." The 60+ operator-codenamed topics (Diagnosis-First Families, MedPilot, Caribbean & LatAm Operator Diagnostic, etc.) are gone.
- **Ad Engine industries** expanded to a **49-entry Top-50 list** plus "All / Mixed" and "Other"; replaces the prior 6-industry operator-bias list.
- **Ad Engine platforms** expanded to **27 social/content platforms** (Instagram, Facebook, LinkedIn, TikTok, YouTube, YouTube Shorts, X / Twitter, Threads, Pinterest, Snapchat, Reddit, Quora, Google Business Profile, Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads, YouTube Ads, Email, SMS, Blog / SEO, Landing Page, Podcast, Webinar, Marketplace, Multi-Platform, Other); replaces the prior 4-platform list.
- **Ad Engine campaign placeholder** is now neutral ("e.g. Q2 product launch") instead of "e.g. NYC PM Q2 2026".
- **Lead Generator (Leads pane) region select** trimmed from 8 operator-priority and diaspora optgroups to a neutral 4-option list (`United States (Nationwide)`, `Canada`, `United Kingdom`, `User-defined`).
- **Lead Generator target-profile placeholder** is now generic ("Describe your ideal customer, location, offer, company size, pain point, and urgency…") instead of the operator's healthcare/billing/NYC example.
- **AI Generate Geography select** simplified from 80+ operator-biased regions (NYC Metro, Manhattan, Bronx, Brooklyn, Queens, Staten Island, Long Island, Westchester, DMV, Spanish Caribbean, Mexico, Colombia, South Africa, etc.) to a neutral 5-option list.
- **AI Generate Industry Focus** expanded from 8 operator-biased industries to 43 broad industries.
- **AI Generate Assessment Webhook** label is now plain "Assessment Webhook" instead of "Assessment Webhook (PROD-01-v2)".
- **Dashboard Automation Status card** now shows an empty state instead of 5 PROD-XX rows marked ACTIVE.
- **Sysflow Active Webhooks card** now shows an empty state instead of PROD-XX rows with fake tokens (`ti5tlit9s9ir0sr1vha7vqjyemcuvlnq`, `jpu2xjxufd8x7yt3qnsk9ntxd0ns77jk`).
- **Sysflow Infrastructure card** now shows an empty state instead of `Airtable Base: appXXXXXXXXXXXXXXX`, `Notion Leads DB`, `Instantly Campaign`, `Gmail Connection: 8125092`.
- **Sysflow HTTP Standards card** now shows an empty state instead of hard-coded body-type rules.
- **AI Generate System Identifiers card** now shows an empty state instead of operator integration rows.
- **AI Generate Automation Path Confirmed card** now shows an empty state instead of the hardcoded `Airtable → Notion (PROD-02) → Instantly (PROD-03) → Reply / Booking (PROD-04 → PROD-05)` sequence.
- **Daily Operating Rhythm day options** are now plain `Day 1`–`Day 4` instead of operator-specific activity labels.
- **Daily Operating Rhythm Weekly Rhythm card** now shows an empty state instead of 5 hardcoded operator weekly tasks.
- **Daily Operating Rhythm Operator Escalation Rules card** renamed to "Escalation Rules" and now shows an empty state instead of 5 hardcoded operator rules.
- **Clinical config locations placeholder** is now a generic template instead of a Bronx, NY operator example.

## New policy module

`services/default-state-policy.js` provides:
- `isDemoMode(env)` — demo gate that is off by default.
- `assertNoOperatorSeedData(value)` — runtime guard that throws on forbidden seed terms.
- `sanitizeDefaultUserState(value)` — recursive scrubber.
- `FORBIDDEN_SEED_TERMS` — canonical exclusion list.
- `DEFAULT_EMPTY_STATES` — empty-state copy.
- `TOP_50_INDUSTRIES`, `SOCIAL_CONTENT_PLATFORMS`, `GENERIC_AD_TOPIC_CATEGORIES` — canonical lists.

UMD-style: tests load via `require()`, renderer loads via `<script src="services/default-state-policy.js">` in `<head>`. No change to `main.js`, `preload.js`, or any provider file.

## What did NOT change

- **Response Desk behavior preserved.** No edits to `services/response-desk.js`, `test/response-desk.test.js`, or the `#tab-reply` pane. Tests #16–#18 in the new suite verify Response Desk invariants (`human_approval_required: true`, `auto_send: false`, no Send Email surface) still hold.
- **SAM Opportunity Sprint behavior preserved.** No edits to `services/govcon/sam-sprint-entitlements.js`, `services/govcon/sam-opportunity-sprint.js`, `scripts/sam-opportunity-sprint.js`, or the SAM Sprint UI. Free=1 NAICS / paid=many entitlement verified by test #19. `SAM_GOV_API_KEY` remains environment-only (verified by test #20).
- **Phase 20G visual guards preserved.** `.btn-gold` remains cool gold (`--gold:#C9941A`). 900px / 899px responsive boundary preserved. Verified by tests #21–#22.
- **No watsonx / signing / release-evidence / Vercel / pricing / compliance-claims change.**
- **No `main.js`, `preload.js`, `chartnav-integration.js`, `services/govcon/sam-*`, `services/response-desk.js`, `scripts/**`, `reports/**`, or `.env`** touched.
- **No new product features added.** This is a cleanup.

## No claims added

SourceDeck must not make a watsonx-live claim, a signed/notarized claim, any compliance claim, guaranteed-outcome or unlimited-AI language, or auto-send/auto-submit copy. None were added.

## Tests

- `node test/default-state-policy.test.js` — 22/22 PASS.
- `npm test` — full suite green.
- `npm run release:evidence`
- `npm run troubleshooting:scan`
- `npm run govcon:smoke`
- `npm run phase13:rc-check`
- `npm run i18n:audit`
- `node scripts/release-check.js`

## Files changed

- `sourcedeck.html` — 13 surgical markup substitutions + 1 `<script src>` policy module load.
- `services/default-state-policy.js` (new).
- `test/default-state-policy.test.js` (new).
- `docs/audits/default-state-data-hygiene-audit.md` (new).
- `docs/release-notes/default-state-data-hygiene.md` (this file).
- `package.json` — appends the new test to the `npm test` chain.

## Stashes

Stashes were not modified. No stash applied or dropped.
