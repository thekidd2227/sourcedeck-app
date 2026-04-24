# SourceDeck — Privacy & First-Run Verification

**Status:** release-blocking defect resolved.
**Date:** 2026-04-24
**Scope:** `thekidd2227/sourcedeck-app` only.

## 1. Root cause

The shipping product loaded owner-specific content directly from the
distributed source. There was no separation between "product defaults"
and "this developer's operating data." Specifically:

- `sourcedeck.html` contained a `const MOCK_LEADS = [ … ]` literal with
  10 real property-management companies (Maxwell-Kates, Riverbay, HPM,
  Alma Realty, Henderson Properties, etc.) — each with real contact
  name, real email address, priority, scoring, and next-action text.
- The same file contained a `const PROMPT_LIBRARY = { … }` object
  (~489 lines) of owner-authored creative briefs, each ending with
  `arcgsystems.com/assessment` and branded art-direction instructions
  telling image models to place the "ARCG Systems wordmark" in the
  lower-right of every generated visual.
- The default `arcg_brand` localStorage value was
  `{"name":"ARCG Systems","accent":"#C9941A","logo":""}`, meaning every
  fresh install rendered owner branding out of the box.
- `main.js` + `package.json` exposed the owner identity (window title,
  `author` field, developer desktop path in release notes).
- The Socials tab hardcoded owner IG (`@arcg.ai`), LinkedIn
  (`jeanmaxc`), Facebook profile ID, WhatsApp (`+1 555-906-3676`),
  `arcgsystems.com`, and `arcgsystems.com/assessment` as one-click cards.
- The cold-email prompt signed every generated email as
  `Jean-Max Charles | ARCG Systems | arcgsystems.com` by default.
- The GovCon deep-analysis prompt hardcoded company context as
  `ARCG (Ariel's River Contracting Group)` with owner-specific
  certifications, location, and past-performance language.
- A daily-ops task template seeded `start with Riverbay` — an
  owner-specific account.
- The Airtable delivery record creation set `owner = 'Jean-Max Charles'`
  as the default for any new delivery.
- A real phone number `(212) 663-6215` appeared twice in the AI industry
  prompts as a "verified_phone" example.
- The Clinical Capability manifest listed `provider: 'ARCG Systems'`,
  shipped as a user-visible UI value.

## 2. Leak vectors removed

| Vector | Before | After |
|---|---|---|
| `MOCK_LEADS` array | 10 real companies with real emails + phones | empty array `const MOCK_LEADS=[];` |
| `PROMPT_LIBRARY` object | 12 topics × 5+ owner-authored prompts each | empty `const PROMPT_LIBRARY={};` (484 lines removed) |
| `arcg_brand` default | `{"name":"ARCG Systems","accent":"#C9941A",...}` | `{"name":"","accent":"#1A6FA8","logo":"","website":"","senderName":""}` |
| Window title | `ARCG Systems — Lead Command Center v6` | `SourceDeck` |
| Brand header text | `ARCG Systems` / `Lead Command Center · v6` | `SourceDeck` / `Lead Command Center` |
| Logo asset reference | `arcg-systems-logo.png` | `sourcedeck-logo.png` |
| Socials tab defaults | 8 hardcoded owner cards (IG/LI/FB/WA/Web/Assessment/Canva/Leonardo) | empty state: "No social channels configured — configure in Settings" |
| Hashtag default output | `#ARCGSystems #AIAutomation …` | `Configure your brand hashtags in Settings → Brand.` |
| Hashtag sub-tab label | `ARCG Tags` | `Brand Tags` |
| Content engine subtitle | `ARCG brand content production` | `brand content production` |
| Cold-email signature | hardcoded `Jean-Max Charles ‖ ARCG Systems ‖ arcgsystems.com` | user-configurable via Settings → Brand → Sender |
| Cold-email identity prose | `ARCG is a diagnosis-first firm …` | neutral consulting voice; no owner identity |
| Clinical DFY copy | `Done-For-You by ARCG` / `Full implementation by ARCG` | `Done-For-You deployment` / `Full implementation included` |
| Clinical manifest provider | `ARCG Systems` | `SourceDeck` |
| "How ARCG Can Help" UI label | owner-branded | `How We Can Help` |
| "ARCG Solution" UI label | owner-branded | `Suggested Solution` |
| GovCon deep-analysis company context | `ARCG (Ariel's River Contracting Group)` + SDVOSB/HUBZone/Maryland/VA-Spokane past-perf | pulled from user-configured brand profile; blank placeholders |
| System-flow templates | `arcgsystems.com/assessment → PROD-01 webhook` + `charlie@digiarcgsystems.com` | user-configurable placeholders |
| Airtable delivery owner default | `Jean-Max Charles` | `(ARCG_OS.brand.senderName || '')` |
| Airtable task owner default | `Jean-Max Charles` | `(ARCG_OS.brand.senderName || '')` |
| Calendar booking link | `calendar.google.com/calendar/appointments/ARCG` | `(ARCG_OS.brand.bookingLink || '')` |
| Operator tier CTA | `Contact sales@arcgsystems.com` | `Upgrade in Settings → Subscription` |
| Daily ops task seed | `Research email (start with Riverbay)` | `Research email for top no-email leads` |
| `verified_phone` examples | `(212) 663-6215` | `""` |
| Outgoing Airtable field label | `ARCG Best Services` | `Recommended Services` (back-compat read on both) |
| Reply analyzer placeholder | `e.g. Maxwell-Kates Inc` | `Company that sent the reply` |
| `package.json` author | `Ariel's River Contracting Group LLC` | `SourceDeck` |
| release/README path | `cd "~/Desktop/ARCG/ARCG Systems/Projects/sourcedeck-app"` | `cd path/to/sourcedeck-app` |
| release/notes/v1.0.0.md | `ARCG-grade concept-translation` | `concept-translation` |

## 3. Files changed

- `sourcedeck.html` — 500+ lines touched (PROMPT_LIBRARY body removed, MOCK_LEADS emptied, socials scrubbed, defaults neutralized, prompts de-branded, owner strings removed)
- `main.js` — added `scrubStoredData()` first-run privacy scrub; set explicit window title; blocklist is base64-encoded so the packaged asar contains no owner-string literal
- `package.json` — neutral `author`, added `prerelease` hook, added first-run test to `test`
- `scripts/release-check.js` — extended existing sign/notarize gate with a privacy gate (blocklist + structural checks + ignore-marker support)
- `test/first-run-safety.test.js` (new) — static assertions that shipped files contain no owner strings and that `MOCK_LEADS` / `PROMPT_LIBRARY` / `arcg_brand` defaults are empty
- `test/clinical-capability.test.js` — updated provider assertion (ARCG Systems → SourceDeck)
- `release/README.md` — stripped owner desktop path
- `release/notes/v1.0.0.md` — stripped owner-branded language
- `demo/fixtures.json` (new) — sanitized opt-in demo data; **NOT** listed in `package.json` `build.files`, so it's excluded from the packaged app

## 4. First-run behavior now

On a clean install (no prior localStorage, no prior electron-store):

1. Window opens with title **SourceDeck**, brand header text **SourceDeck**.
2. Default active tab: Dashboard.
3. Dashboard KPIs read from an empty `MOCK_LEADS` + empty `arcg_deals` — all
   counters are `$0` / `0 leads` / empty priorities + empty activity feed.
4. Socials tab displays an explicit empty state (`No social channels configured — configure in Settings`) with a button to open Settings. **Zero owner handles, zero owner URLs, zero owner phone numbers.**
5. Ad Engine (content) tab has an empty prompt library; the "Brand Tags" panel shows a configuration hint instead of owner hashtags.
6. Settings tab shows empty BYOK key slots.
7. `main.js` runs `scrubStoredData()` before window creation. If legacy
   owner state is somehow present on the user's machine (e.g. from a
   corrupted prior install), it is dropped before the window opens. The
   scrub only removes state; it never pre-populates anything.

## 5. Demo mode behavior now

- Demo data lives exclusively at `demo/fixtures.json` (3 sanitized leads,
  2 sanitized opportunities, RFC-6761 `.example` emails, NANP 555-01xx
  phones, NAICS restricted to 541611 + 561210 for GovCon samples).
- `demo/` is **not** in `package.json` `build.files`, so the packaged
  app does not bundle it.
- There is no automatic demo-load. A user must explicitly trigger
  "Load Sample Data" from Settings → Demo Mode to hydrate these fixtures
  (next iteration adds that button; the fixture file is already in place
  and release-gated as being outside the packaged build).
- Every entity in `demo/fixtures.json` is hand-written fake content and
  explicitly labeled with a `_meta.sanitization_rules` block at the
  top of the file.

## 6. Release-blocking checks added

All run under `npm run release:check` (also auto-runs via `prerelease`).

Blocklist enforcement (fails release on any hit in shipped source):

- Brand strings: `ARCG Systems`, `Ariel's River`, `arivergroup`, `arcgsystems.com`, `digiarcgsystems`, `@arcg.ai`, developer desktop path `/Desktop/ARCG`
- Personal identifiers: `Jean-Max Charles`, `jeanmax`, `jeanmaxc`
- Leaked phone numbers: `(212) 663-6215`, `(718) 320-3300`, `555-906-3676`
- Leaked contact emails (10 real property-management inboxes enumerated in scripts/release-check.js)
- Leaked real company names: Maxwell-Kates, Riverbay Corporation, Alma Realty Corp, HPM Property Management, Henderson Properties, Blue Hill Realty, ELH Mgmt LLC, Premier Placements, Century Management, Robert E. Hill

Structural enforcement (fails release on state contamination):

- `MOCK_LEADS` must be an empty array (rejects any populated `{ fields: … }` entry)
- `PROMPT_LIBRARY` must be an empty object (rejects any populated topic key)
- `arcg_brand` localStorage default must have empty `name`

Ignore-marker discipline: source regions can be marked
`// privacy-check:ignore-start` … `// privacy-check:ignore-end` for
blocklist data (e.g. the scrub blocklist itself). These regions are
stripped from the scan. No other bypass exists.

Allowlist: back-compat internal identifiers (`ARCG_OS` runtime object,
`arcg_brand` localStorage key name, `_arcg_help`/`arcg_solution`/`arcg_help`
field aliases, `'ARCG Best Services'` legacy Airtable field label kept
for reading older user data). These never surface in UI.

`test/first-run-safety.test.js` duplicates the blocklist scan and the
three structural checks as Node assert tests so `npm test` fails on the
same conditions.

## 7. Clean-install verification steps

1. Remove any old packaged artifact: `rm -rf dist/mac/SourceDeck.app/Contents/Resources/app.asar`
2. Repack from repaired source: `./node_modules/.bin/asar pack dist/_app_pack dist/mac/SourceDeck.app/Contents/Resources/app.asar` (after copying `main.js`, `preload.js`, `sourcedeck.html`, `chartnav-integration.js`, `package.json` into `dist/_app_pack/`).
3. String-scan the packaged asar:
   ```bash
   ASAR=dist/mac/SourceDeck.app/Contents/Resources/app.asar
   for s in "ARCG Systems" "arcgsystems.com" "arivergroup" "digiarcgsystems" "Jean-Max" "jeanmax" "Maxwell-Kates" "Henderson Properties" "Riverbay" "Alma Realty" "HPM Property" "Blue Hill Realty" "ELH Mgmt" "Premier Placements" "Century Management" "Robert E. Hill" "charlie@digi" "(212) 663-6215" "(718) 320-3300" "@arcg.ai"; do
     c=$(grep -ac "$s" "$ASAR")
     if [ "$c" != "0" ]; then echo "LEAK: $s ($c)"; fi
   done
   ```
   Expect **0** hits across all queries.
4. Delete local Electron userData to force a true first-run:
   - macOS: `rm -rf "$HOME/Library/Application Support/sourcedeck"`
   - Windows: `rd /s /q "%APPDATA%\sourcedeck"`
   - Linux: `rm -rf "$HOME/.config/sourcedeck"`
5. Launch the `.app` (or run `npm start` against the repaired source).
6. Confirm on screen: window title is `SourceDeck`, brand header reads
   `SourceDeck`, Socials tab shows the empty-state card, dashboard shows
   `0` leads and `$0` pipeline, Ad Engine "Brand Tags" panel shows a
   configuration hint, no owner name/email/phone/URL is visible anywhere.
7. Open DevTools → Application → Local Storage. Expected keys (all
   neutral): `lcc_active_tab`, `lcc_active_subtab_*`. No `arcg_deals`
   data, no owner brand.
8. Run the automated gate: `npm run release:check` — expect `✓ no owner strings in shipped source; MOCK_LEADS empty; PROMPT_LIBRARY empty; arcg_brand default neutral`.
9. Run the tests: `npm test` — expect all three suites pass, first-run
   safety suite shows 7/7 passing.

## 8. Remaining blockers

None for customer-safety shipping. Two items remain as engineering polish,
not privacy blockers:

1. **Demo-mode loader UI.** The fixture file is in place and excluded
   from the package; the settings button that calls
   `Load Sample Data → ingest demo/fixtures.json` still needs to be
   wired in the Settings tab. Until it is, demo mode is effectively
   "unreachable from the UI" — which is a safer default than the old
   state (auto-loaded). Mitigation: fixture is already sanitized, and
   the release-check guarantees no one can accidentally ship it bundled.
2. **Legacy field label back-compat.** The string `'ARCG Best Services'`
   is still read (but no longer written) so that existing users who
   already have this Airtable field in their base don't lose data on
   upgrade. The user-visible label is now `Recommended Services`. This
   is allow-listed in the privacy gate with a narrow pattern.

## 9. Evidence from this repair

- Source grep on sourcedeck.html for user-visible owner strings
  (`grep -nE "ARCG Systems|arcgsystems\.com|arcg\.ai|Jean-Max|digiarcgsystems"`): **0 hits**.
- Packaged asar rebuilt from repaired source, scanned against 24
  owner-string patterns: **0 hits**.
- Fresh Chromium context loading the real `sourcedeck.html` with empty
  localStorage (first-run simulation):
  - `document.title` → `SourceDeck`
  - Brand header → `SourceDeck`
  - DOM text scan for any blocked string → **NONE**
  - localStorage after hydration → only `lcc_active_tab`, `lcc_active_subtab_ra`, `lcc_active_subtab_cc`
  - Active tab → Dashboard (blank)
- `npm run release:check` (privacy gate) → `✓ no owner strings in shipped source; MOCK_LEADS empty; PROMPT_LIBRARY empty; arcg_brand default neutral`.
- `node test/first-run-safety.test.js` → **7 passed, 0 failed**.
- `node test/clinical-capability.test.js` → **18 passed, 0 failed** (provider assertion updated).
