# SourceDeck Open Issues

Problems that are unresolved, partially fixed, unverified, or require ongoing monitoring.

**Last updated:** 2026-05-30 (Phase 16A — Daily Troubleshooting Agent landed; OPEN-002 state unchanged)

---

## ✅ RESOLVED — Phase 15A (2026-05-30)

### ~~OPEN-001: OpenAI and Claude Keys Still in localStorage (Renderer)~~
**Severity:** ~~CRITICAL~~ → **FIXED**  
**Related event:** SD-2026-041  
**Repo:** sourcedeck-app  
**Resolved by:** Phase 15A — `fix/credential-boundary-openai-claude` branch / PR #26

**Resolution summary:**  
Audit of current `main` confirmed the migration was already complete in prior commits. Phase 15A added formal audit documentation and a dedicated enforcement test suite.

**Confirmed state:**
- Zero direct fetch() calls to `api.openai.com` or `api.anthropic.com` from renderer
- Zero Bearer/x-api-key header builds in renderer
- Zero `localStorage.setItem` for `lcc_OPENAI_KEY` or `lcc_CLAUDE_KEY`
- `window.OPENAI_KEY` / `window.CLAUDE_KEY` are sentinel presence flags only (`'<openai_credential_present>'`), never raw key values
- All AI calls route through `window.sd.ai.generate()` → IPC → `services/ai/providers/openai.js` / `anthropic.js` → `credentials.get()` in main process only
- preload.js exposes `credentials.status/set/remove` only — no `credentials.get()` to renderer
- Legacy migration code reads old `lcc_*` localStorage entries, migrates to safeStorage, and removes them

**Test coverage added:**
- `test/credential-boundary-openai-claude.test.js` — 22/22 PASS
- `test/renderer-ai-migration.test.js` — 15/15 PASS (pre-existing)
- `test/credential-boundary.test.js` — 14/14 PASS (pre-existing)
- All wired into `npm test`

**Prevention rule:** No AI provider credential may be stored, read, or returned through renderer localStorage. Automated check: grep `sourcedeck.html` and `preload.js` for `lcc_OPENAI_KEY`, `lcc_CLAUDE_KEY`, direct `api.openai.com`/`api.anthropic.com` fetches, Bearer/x-api-key header builds — must return 0.

---

## OPEN — Requires Action

---

### OPEN-002: IBM watsonx Runtime Context Mismatch (HTTP 403)
**Severity:** HIGH  
**Status:** **PARTIALLY FIXED — safe diagnostic shipped; IBM-side account/IAM action still required for live readiness.**  
**Related event:** SD-2026-006  
**Repo:** sourcedeck-app

**Description:**  
IBM watsonx calls return HTTP 403 `no_associated_service_instance_error`. Existing runtimes are tagged `cpdaas` context; SourceDeck project is `wx` context. IBM's URL rewrite prevents association under either context. Code adapters are present and lint-clean; the issue is purely on IBM's platform side.

**Phase 15B repair (shipped):**
- `services/ai/watsonx-readiness.js` deterministically classifies failures
  into `ready` / `provider_disabled` / `missing_credentials` /
  `missing_project_id` / `missing_region_or_url` / `unauthorized_401` /
  `forbidden_403` / `network_error` / `unknown_error`.
- 403 bodies are redacted (project_id / space_id values + 32-char trace
  ids + sk- / sk-ant- / JWT / long-hex / Bearer shapes), but safe IBM
  diagnostic fragments such as `no_associated_service_instance_error`
  survive so operators can see the real cause.
- IPC `ai:watsonx-readiness` → `window.sd.ai.watsonxReadiness()`
  returns a presence/status/remediation report only — no secrets.
- Settings panel adds a **watsonx readiness** sub-panel with the safe
  remediation copy "IBM returned a permission/context error. Check IBM
  account, project ID, region, model access, and IAM permissions."
- 18/18 `test/watsonx-runtime-context.test.js` plus existing
  `test/ibm-readiness.test.js` 38/38 still pass.

**Still required (outside the app):**
- IBM support to migrate runtime `Runtime-wk` from `cpdaas` to `wx`
  context, or detach the prior project for re-association.
- Associate the migrated runtime with the SourceDeck project under
  `?context=wx`.
- Run a live readiness check from this app's settings panel; only when
  it reports `ready` may the public site update "watsonx" wording.

**Risk if the IBM-side step remains unresolved:**  
AI features that route to watsonx will still 403 in production, but the
app now surfaces a classified, redacted, actionable diagnostic instead
of failing silently. Public copy still **must not** claim watsonx is
fully operational until readiness reports `ready`.

**Automated check:** Agent rule E-007 (once runtime is associated); the
new `test/watsonx-runtime-context.test.js` plus the renderer/preload
boundary checks run on every `npm test`.

**Phase 16A reminder:** the daily troubleshooting agent's `WX-005` finding
is intentionally `status: manual` until a live readiness check from the
settings panel reports `ready`. Public copy must not be promoted to
"watsonx live" / "fully operational" before that.

---

### OPEN-003: Instagram Video/Reel and Facebook Video/Carousel Formats Not Supported
**Severity:** MEDIUM  
**Related event:** SD-2026-035  
**Repo:** ARCGSystems

**Description:**  
Buffer API rejects posts with format `reel`, `story`, `carousel`, or `video` because these require additional API setup:
- Video formats require upload to Buffer's video endpoint before scheduling
- Carousel requires product catalog setup
- Reels require Instagram-specific API configuration

Currently worked around by converting affected posts to standard image format.

**Risk if unresolved:**  
Cannot post video or carousel content through the automated pipeline. Limited social format diversity.

**What needs to happen:**
1. Implement Buffer video upload endpoint integration before scheduling video posts
2. Implement Buffer carousel endpoint for multi-image posts
3. Add format validation in scheduling pre-flight: reject unsupported formats before calling Buffer API

---

### OPEN-004: IBM watsonx Public Claims Not Fully Resolved
**Severity:** HIGH  
**Related event:** SD-2026-019  
**Repo:** sourcedeck-site

**Description:**  
`docs/IBM_WATSONX_STATUS.md` documents that live watsonx runtime is NOT verified. Public site has had compliance claim language removed, but:
- watsonx "configuration pending" status must remain until live smoke test passes (OPEN-002)
- Any future copy contributor may reintroduce overclaims without knowing the status

**Risk if unresolved:**  
Regulatory / FTC risk if false compliance claims appear on a public commercial site.

**What needs to happen:**
1. Resolve OPEN-002 (IBM runtime context fix)
2. Run live smoke test; capture green output
3. Only then update public copy to reflect live watsonx status
4. Add CI check that scans for forbidden watsonx/compliance phrases until evidence is captured

**Automated check:** Agent rule D-001, D-002

---

### OPEN-005: arcg-live Repo Purpose Undefined
**Severity:** LOW  
**Related event:** None (discovered in audit)  
**Repo:** arcg-live

**Description:**  
`arcg-live` repo contains only one commit: "Add ARCG watermark logo". No framework, no package.json found, no deployment configuration, no documentation. Purpose is unknown.

**Risk if unresolved:**  
Unknown code accumulating in a live repo on the same account as production repos. If it becomes active without documentation, confusion with other repos could cause misdirected deployments.

**What needs to happen:**
1. Confirm intended purpose of `arcg-live` repo
2. Either: add a README explaining its purpose, or archive/delete if it's a stub

---

### OPEN-006: Capability Statement Extraction Not Implemented
**Severity:** MEDIUM  
**Related event:** None (discovered in audit doc)  
**Repo:** sourcedeck-app

**Description:**  
`docs/audits/govcon-operating-profile-wizard-audit.md` explicitly documents: "Capability statement extraction — **Does not exist.** No upload/paste/extraction anywhere. Must be built."

The Operating Profile Wizard (Phase 14A) requires this feature. It was flagged as a TODO in the operating profile wizard audit.

**Risk if unresolved:**  
GovCon operators cannot extract UEI/CAGE/NAICS/PSC/certs from their capability statement. Wizard Step 2 is non-functional.

**What needs to happen:**
1. Build `services/govcon/capability-statement-extractor.js`
2. Add IPC: `govcon.profile.extractCapabilityStatement`
3. Wizard Step 2: paste text → extract candidates → user approves → fills form
4. No auto-save, no external upload; user approval required before any field is populated

---

### OPEN-007: Social/Creative Credential Onboarding Not in Wizard
**Severity:** MEDIUM  
**Related event:** None (discovered in audit doc)  
**Repo:** sourcedeck-app

**Description:**  
Per `docs/audits/govcon-operating-profile-wizard-audit.md`: "AI / imaging / social credential onboarding — **Not in the wizard.** AI keys (Claude/OpenAI/watsonx) live only in Settings → Brand. No Canva/imaging or social-platform credential onboarding exists."

**Risk if unresolved:**  
New users must discover Settings → Brand on their own to configure AI/creative tools. No guided onboarding for these integrations.

**What needs to happen:**
1. Extend `credentials.js` KNOWN_SERVICES with `canva, meta, instagram, facebook, tiktok, linkedin, google, x-twitter`
2. Add wizard steps for AI key, creative key, social handles (Steps 5–7 of 9-step wizard plan)

---

## MONITORING — Watch But Not Blocking

### MON-001: Multer 1.x Vulnerability in sourcedeck-site/server
**Severity:** MEDIUM  
**Source:** `server/package-lock.json` — `"deprecated": "Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version."`

Multer 1.x is deprecated and has known vulnerabilities. No active upload surface that uses Multer has been confirmed vulnerable in current code, but the package should be upgraded.

**Action:** Upgrade `multer` to 2.x in sourcedeck-site server dependencies.

---

### MON-002: Multiple Deprecated npm Packages in sourcedeck-app
**Severity:** LOW  
**Source:** `package-lock.json` — multiple deprecated packages including old versions of `glob`, deprecated memory-leak package (`inflight`), deprecated `util` shim

These are transitive dependencies of electron-builder and related packages. Not directly exploitable but represent supply-chain hygiene risk.

**Action:** Monitor for upstream fixes; upgrade electron-builder when available.

---

### MON-003: arcg-lcc vs sourcedeck-app — Unclear Relationship
**Severity:** MEDIUM  
**Source:** Both repos have Electron + LCC HTML setup

Two repos (`arcg-lcc` and `sourcedeck-app`) both appear to wrap an LCC HTML interface in Electron. If they diverge in capability or security posture without documentation, one may ship a less-secure or less-capable version.

**Action:** Document which repo is the canonical production Electron app; archive or redirect the other.

---

## Resolved — Keep for Reference

| Issue | Resolved By | Date |
|---|---|---|
| v1.0.0 privacy defect | v1.1.0 release, commit aa1e523 | 2026-04-24 |
| Vercel build triggering on static site | vercel.json framework:null, commit bf3dc6f | 2026-05-28 |
| Chatwoot token wrong | Correct token, commit 5bb1721 | 2026-04-15 |
| Free demo/download access | All routes to request-access, commit 28346ee | 2026-05-10 |
| Gemini 404 / 400 errors | Auto-discovery + model ranking, commits 2655b1b + ea61c8f | 2026-05-29 |
| CI calendar changes lost | Commit-back step, commit 80bf8f4 | 2026-05-29 |

---

### REL-020: macOS signing/notarization configured (manual, non-blocking in local dev)
**Severity:** MEDIUM
**Status:** **PARTIALLY FIXED — Phase 17A shipped deterministic readiness diagnostic; actual signing requires operator credentials.**
**Source:** Daily Troubleshooting Agent finding `REL-020`
**Repo:** sourcedeck-app

**Description:**
SourceDeck's macOS build is currently produced unsigned in local dev
because no Apple signing/notarization credentials are present in this
environment. `scripts/release-check.js` warns about this and the daily
troubleshooting agent surfaces it as `MANUAL`.

**Phase 17A repair (shipped):**
- `services/release/macos-signing-readiness.js` classifies readiness
  into 7 stable codes: `ready_to_sign` · `partial_signing` ·
  `blocked_notarize_off` · `blocked_missing_signing` ·
  `blocked_missing_entitlements` · `unsigned_dev_ok` · `unknown`.
- `scripts/macos-signing-readiness.js` CLI (`--json`, `--strict`).
- `npm run release:mac-signing-readiness` (dev, non-blocking),
  `release:mac-signing-readiness:json`,
  `release:mac-signing-readiness:strict` (public-release gate).
- `release-check.js` now points at the readiness script in its
  codesign-warn branch.
- REL-020 remediation in the agent now references both readiness
  commands.
- 19/19 `test/macos-signing-readiness.test.js` plus existing 95/95
  `troubleshooting-agent.test.js` still pass.

**Still required (operator only):**
- Provide `CSC_LINK` + `CSC_KEY_PASSWORD` (signing) AND either the 3
  `APPLE_*` env vars or the 3 `APPLE_API_*` env vars (notarization).
- Flip `package.json build.mac.notarize` to `true` for the release
  build.
- Run `npm run release:mac-signing-readiness:strict` from the signing
  environment and confirm `ready_to_sign`.
- Build (`npm run build:mac`), run `codesign --verify --deep --strict`,
  `spctl --assess`, and `xcrun stapler validate`, and capture output.

**Public-copy rule:** Do not claim the app is signed/notarized in any
public surface until a real signed run is captured as evidence.

**Automated check:** Agent rule E-009; `test/macos-signing-readiness.test.js`.
