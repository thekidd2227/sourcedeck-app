# Phase 25A — Combined Launch Readiness Sprint Audit

**Date:** 2026-06-08
**Branch:** `release/phase-25a-combined-launch-readiness`
**Base:** `main @ 5314111` (post-PR #96 — Phase 24M final RC decision).
**Posture:** Read-only audit + gate execution + website-side fix + final launch decision. **No app runtime change.** No new feature work.

## 1. Current main reconciliation

| Item | Value |
|---|---|
| App repo HEAD | `5314111` `docs(release): complete final RC hardening (#96)` |
| Site repo HEAD | `bf3dc6f` (pre-Phase-25A) → `7170c00` on new branch `fix/phase-25a-website-launch-alignment` |
| Working tree | clean |
| Stashes | none |

Phase 24 merge lineage (most recent first):

| PR | Commit | Phase | Status |
|---|---|---|---|
| #97 | `a70c014` | 24N-PREP | ✅ Merged — signed-build evidence gate prep |
| #96 | `5314111` | 24M | ✅ Merged — final RC hardening + decision |
| #95 | `5637bc3` | 24K | ✅ Merged — first-run setup wizard |
| #94 | `fa07b4b` | 24L-PREP | ✅ Merged — setup-wizard RC acceptance |
| #93 | `bfb2bc4` | 24I | ✅ Merged — SAM key Settings UX + Stakeholder Graph live wire-up |
| #92 | `7861152` | 24J-PREP | ✅ Merged — final RC evidence binder |
| #91 | `253b2a7` | 24C-2 | ✅ Merged — prompt-builder NAICS parameterization |
| #90 | `0e6a05d` | 24H-PREP | ✅ Merged — buyer demo refresh |
| #89 | `a4fc8b6` | 24E | ✅ Merged — Stakeholder Graph UI |
| #88 | `229c6b6` | 24F-PREP | ✅ Merged — RC packaging contract |
| #86 | `c69ddac` | 24D | ✅ Merged — PP Library + Cap Statement Studio |
| #85 | `7fc16dc` | 24C | ✅ Merged — outreach + NAICS dropdown fixes |
| #84 | `e098d6a` | 24B | ✅ Merged — GovCon core hardening |

No missing merge. No open blocking PR.

## 2. Test / gate results (app repo)

### Individual sentinel tests

| Test | Result |
|---|---|
| `setup-wizard-first-run` | ✅ PASS 35/35 |
| `govcon-final-runtime-polish` | ✅ PASS 23/23 |
| `govcon-setup-wizard` | ✅ PASS 12/12 |
| `govcon-operating-profile-wizard` | ✅ PASS 18/18 |
| `govcon-operating-profile-completeness` | ✅ PASS 21/21 |
| `govcon-prompt-naics-parameterization` | ✅ PASS 16/16 |
| `govcon-stakeholder-graph-ui` | ✅ PASS 25/25 |
| `govcon-past-performance-capability-ui` | ✅ PASS 15/15 |
| `govcon-core-hardening` | ✅ PASS 15/15 |
| `govcon-opportunity-outreach` | ✅ PASS 28/28 |
| `remove-system-readiness-tab` | ✅ PASS 9/9 |
| `renderer-boot` | ✅ PASS 7/7 |
| `response-desk` | ✅ PASS 24/24 |
| `response-desk-email-import` | ✅ PASS 20/20 |
| `default-state-policy` | ✅ PASS 22/22 |
| `sam-opportunity-sprint` | ✅ PASS 62/0 |
| `macos-signing-readiness` | ✅ PASS 19/19 |
| `signed-demo-build-readiness` | ✅ PASS 25/25 |
| `release-evidence` | ✅ PASS 20/20 |

### Full chain + release gates

| Command | Result |
|---|---|
| **`npm test`** (full chain) | ✅ **exit 0** |
| `npm run release:evidence` | ✅ `state: local_unsigned_dev`, `warnings: []`, `blockers: []` |
| `npm run troubleshooting:scan` | ✅ no fail/warn |
| `npm run govcon:smoke` | ✅ 47/47 PASS |
| `npm run phase13:rc-check` | ✅ 16/16 PASS |
| `npm run i18n:audit` | ✅ 31/31 PASS |
| `npm run release:mac-signing-readiness` | ✅ scan complete; **`notarize env: present=none; missing=APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID` / `notarize API env: present=none; missing=APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER`** — expected local-dev posture; Apple credentials absent (correct posture; **never** to be added to this repo) |
| `node scripts/release-check.js` | ✅ privacy gate clean; `macOS signing env: MISSING`, `macOS notarize env: MISSING` (expected local-dev posture) |

No RC blocker from any gate. All existing Phase 24-series invariants preserved.

## 3. Credential boundary scan

Verified in `sourcedeck.html`:

| Surface | SAM.gov API key request? | Confirmed |
|---|---|---|
| Setup Wizard Step 5 (Phase 24K) | ✅ Allowed | `id="gcwiz-sam"` + `gcWizSaveSam()` → `sd.credentials.set('sam-gov', …)` |
| Settings → API Keys → SAM.gov API Key (Phase 24I) | ✅ Allowed | `id="s-samkey"` + `saveSettings()` SAM branch → `sd.credentials.set('sam-gov', …)` |
| GovCon SAM search / SAM Sprint screen | ❌ Forbidden | `id="out-samkey"` — **0 hits in `sourcedeck.html`** (Phase 24I removal preserved) |

- No raw API key value is hardcoded, printed, exposed, or constructed inline.
- No `.env` is referenced as a user-facing instruction.
- Credential prompts are grouped in Setup Wizard + Settings only.
- All credential saves use `window.sd.credentials.set('<service>', …)` IPC bridge.

## 4. No-send / no-submit / no-upload safety scan

Runtime grep yielded 3 hits, all in negative-assertion contexts (Phase 24K Quick Setup Tour copy + 2 comments confirming `auto_send: false` + `no Send Email surface`). **0 positive claims active in buyer-facing runtime.**

No positive Send Email / Submit Bid / Submit Quote / Export-and-submit / portal-upload claim. No improper CO/COR outreach copy. No FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized / production-signed claim. No guaranteed-award / guaranteed-revenue / unlimited-AI claim. No System Readiness / `sysflow` resurrection. **0 deprecated $79 / $349 / $999 hits in `sourcedeck.html`.**

## 5. Signed build / installer evidence classification

Per `docs/audits/phase-24n-signed-build-readiness-audit.md` and the gate results above:

- ❌ Developer ID Application signing identity: **MISSING** (`macOS signing env: MISSING`)
- ❌ Apple notarize credentials: **MISSING** (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` absent)
- ❌ Apple notarize API credentials: **MISSING** (`APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` absent)
- ❌ Notarization accepted: **NO**
- ❌ Stapling verified: **NO**
- ❌ Gatekeeper assessment passes: **NO** (not executed; no signed artifact present)
- ❌ Artifact checksum captured: **NO** (`no packaged artifact present (dist/mac/SourceDeck.app)`)

**Classification: UNSIGNED LIMITED PILOT READY.**

Per the strict Phase 24N rule: **public signed release remains NO-GO until signing/notarization evidence proves readiness.** The unsigned dev-build posture is correct and expected for a limited paid pilot; it is **never** a license to claim "signed and notarized" / "Apple notarized" / "production signed".

## 6. Website alignment audit

Website repo located at `/home/user/sourcedeck-site`. Sync to `main @ bf3dc6f`. Created branch `fix/phase-25a-website-launch-alignment`.

### Issues found

| File | Issue | Fixed |
|---|---|---|
| `pricing/index.html` | Subscription tiers showed deprecated V2: Solo $79/mo, Team $349/mo, Enterprise from $999/mo. Implementation tiers showed Core $997, Growth $2,497, White-Glove $4,997. | ✅ Updated to V3: Solo Capture $149/mo · GovCon Operator $499/mo or $4,990/yr · Operator Plus $997/mo or $9,970/yr · Enterprise custom. Implementation: Self-Install $1,497 · Guided $3,497 · DFY $5,997. Meta description updated. |
| `invoice/index.html` | Pro card showed $349/seat/month; Operator/Enterprise card showed "From $999/seat/month". | ✅ Updated to V3 amounts ($499/mo or $4,990/yr; $997/mo or $9,970/yr or Enterprise custom). |
| `assets/sd-i18n-dict.js` | English + Spanish strings carried V2 pricing copy. | ✅ Updated all 3 affected strings (subscription summary, full pricing meta description, "From $999" → "From $997"). |
| `CLAUDE.md` rule 3 | Said live tiers were Core $79 / Pro $349 / Operator $999 — directly conflicting with Phase 22A-P V3 source-of-truth. | ✅ Rewritten to V3 canonical with explicit reference to `sourcedeck-app/docs/product/pricing-source-of-truth.md` and a V2 deprecation note. |

### Verification

- `grep '\$79\|\$349\|\$999'` across active site copy → **0 hits in user-facing files**; 1 hit in `CLAUDE.md` as an explicit V2 deprecation reference (allowed).
- `pricing/index.html` parses (4 inline scripts; 17 KB; V3 amounts present).
- No HTTP route added or removed.
- No `assets/sd-config.js` Stripe Price ID change (operator must create V3 Stripe products before swap; current `/pricing/` CTAs route to `/request-access/`, `/quote/operator/`, `/quote/pro/` and do not trigger direct Stripe checkout, so display-price update does not break checkout).
- V1 legacy Price IDs ($49/$149/mo) remain grandfathered server-side; not re-exposed in UI.

### Site PR

Opened against `thekidd2227/sourcedeck-site` `main`: **fix(pricing): align site to V3 source-of-truth (Phase 25A)** — draft PR awaiting merge with the app-side PR.

**No deploy performed. No publish. No download CTA added. GitHub Pages will not redeploy until that PR merges to main.**

## 7. Final launch status

See `docs/product/phase-25a-limited-paid-pilot-launch-plan.md` for the strict decision and bounding conditions.

## 8. Confirmations

- ✅ `.env` not touched (verified in both repos).
- ✅ Stashes untouched (both repos).
- ✅ No public deploy. No publish.
- ✅ No build / sign / notarization claim beyond evidence.
- ✅ No videos / screenshots / `.qa/` committed.
- ✅ `docs/product/pricing-source-of-truth.md` (app repo) not modified.
- ✅ No signed/notarized / Apple-notarized / production-signed claim made.
- ✅ No present-tense watsonx-live claim made.
- ✅ No public download CTA added.
- ✅ All Phase 24-series surfaces (B / C / C-2 / D / E / F / H / I / J / K / L / M / N) preserved.

## 9. Hand-off

Companion docs in this PR:

- `docs/product/phase-25a-limited-paid-pilot-launch-plan.md` — pilot launch plan + final decision.
- `docs/product/phase-25a-operator-launch-runbook.md` — operator runbook for pilot kickoff.
- `docs/product/phase-25a-website-alignment-audit.md` — full website audit results + companion site PR link.
- `docs/product/phase-25a-signed-build-evidence-result.md` — signed build / notarization evidence summary.
- `docs/release-notes/phase-25a-combined-launch-readiness.md` — release note.
