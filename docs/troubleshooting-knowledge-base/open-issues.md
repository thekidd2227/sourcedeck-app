# SourceDeck Open Issues

Problems that are unresolved, partially fixed, unverified, or require ongoing monitoring.

**Last updated:** 2026-05-29

---

## OPEN — Requires Action

### OPEN-001: OpenAI and Claude Keys Still in localStorage (Renderer)
**Severity:** CRITICAL  
**Related event:** SD-2026-041  
**Repo:** sourcedeck-app

**Description:**  
Two API credentials remain stored in renderer-accessible `localStorage` and used via direct fetch calls from `sourcedeck.html`:
- `lcc_OPENAI_KEY` — 4 Bearer header builds in renderer
- `lcc_CLAUDE_KEY` — 2 `x-api-key` builds in renderer

Migration of SAM.gov, Airtable, and Apollo credentials to `safeStorage` via the `window.sd` IPC boundary is complete. OpenAI and Claude migration is the documented next step.

**Evidence:**  
`docs/renderer-credential-migration.md` — table row "OpenAI key: ⏳ Not migrated" and "Anthropic / Claude key: ⏳ Not migrated"

**Risk if unresolved:**  
Credentials accessible to any renderer-side code, including any future script injection. On a web deployment, this becomes a direct credential leak vector.

**What needs to happen:**
1. Migrate `fetch('https://api.openai.com/...', {headers:{Authorization:'Bearer '+OPENAI_KEY}})` → `await window.sd.ai.generate({provider:'openai', ...})`
2. Migrate `fetch('https://api.anthropic.com/...', {headers:{'x-api-key':CLAUDE_KEY}})` → `await window.sd.ai.generate({provider:'anthropic', ...})`
3. Remove `lcc_OPENAI_KEY` and `lcc_CLAUDE_KEY` from localStorage; migrate to `safeStorage` via `window.sd.credentials.set`
4. Update `test/renderer-ai-migration.test.js` to assert 0 remaining renderer-side credential patterns

**Automated check:** Agent rule A-004, A-005

---

### OPEN-002: IBM watsonx Runtime Context Mismatch (HTTP 403)
**Severity:** HIGH  
**Related event:** SD-2026-006  
**Repo:** sourcedeck-app

**Description:**  
IBM watsonx calls return HTTP 403 `no_associated_service_instance_error`. Existing runtimes are tagged `cpdaas` context; SourceDeck project is `wx` context. IBM's URL rewrite prevents association under either context. Code adapters are present and lint-clean; the issue is purely on IBM's platform side.

**Current state:**  
- IBM support ticket filed (see `docs/IBM_SUPPORT_TICKET_RUNTIME_ASSOCIATION.md`)
- Smoke test cannot pass until IBM migrates one runtime from `cpdaas` to `wx` context

**Risk if unresolved:**  
AI features that route to watsonx will fail silently or with 403 in production. Watsonx cannot be marketed as a live integration.

**What needs to happen:**
1. IBM support to migrate runtime `Runtime-wk` from `cpdaas` to `wx` context (or detach from prior project for re-association)
2. Associate migrated runtime with SourceDeck project under `?context=wx`
3. Run `node server/scripts/verify-watsonx.mjs` — capture green output as evidence
4. Update `/agents/`, `/security/`, homepage to say "live on watsonx" — ONLY after step 3

**Automated check:** Agent rule E-007 (once runtime is associated)

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
