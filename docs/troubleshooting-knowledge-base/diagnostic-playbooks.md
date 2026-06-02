# SourceDeck Diagnostic Playbooks

Reusable symptom-based repair guides. Each playbook maps to one or more events in the Error & Repair Ledger.

---

## Playbook 1: Vercel Build Failing on Static Site

**Related events:** SD-2026-008, SD-2026-009, SD-2026-033

### Symptoms
- Vercel deployment fails with `npm ERR! missing script: build` or similar
- Site builds fine locally but fails on Vercel
- One Vercel project's build settings affecting other projects in the same repo
- chartnavmd.com redirect not resolving

### Likely Causes
- `vercel.json` missing `"framework": null` causes Vercel to auto-detect a framework and run a build
- `vercel.json` missing empty `"buildCommand": ""` causes Vercel to try `npm run build`
- `vercel.json` at root of a multi-project repo overrides all connected Vercel projects
- Incorrect redirect `source` syntax in `vercel.json` for `has.host` conditional redirects

### Diagnostic Commands
```bash
# Check current vercel.json
cat vercel.json

# Verify the redirect syntax — source must use :path* wildcard correctly
# For has.host redirects, source should be "/:path*"

# If vercel.json exists in ARCGSystems repo:
ls ARCGSystems/vercel.json   # presence = potential override risk
```

### Files to Inspect
- `vercel.json` in the repo root
- Vercel dashboard → Project Settings → Build & Output Settings
- `.github/workflows/` for any Vercel deploy steps

### Repair Pattern

For a **pure static site** (sourcedeck-site):
```json
{
  "framework": null,
  "buildCommand": "",
  "outputDirectory": ".",
  "redirects": [...]
}
```

For a **conditional host redirect** (chartnavmd.com → arcgsystems.com):
```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "chartnavmd.com" }],
      "destination": "https://arcgsystems.com/chartnav",
      "permanent": false
    }
  ]
}
```

**NEVER** place a vercel.json in ARCGSystems repo root — it overrides all 4 connected projects.

### Validation Commands
```bash
# After fix, verify vercel.json is valid JSON
node -e "require('./vercel.json')" && echo "valid"

# Check that framework is null not absent
cat vercel.json | grep -E '"framework"|"buildCommand"'
```

### Escalation Rules
- If multiple Vercel projects show wrong content simultaneously → check for rogue vercel.json in shared repo
- If redirect loop occurs → check `permanent: true` vs `false`

### Agent Automation Rule
Daily: `grep -r '"framework"' */vercel.json` — alert if any static site repo missing `"framework": null`

---

## Playbook 2: Personal/Owner Data Shipped in Product

**Related events:** SD-2026-001, SD-2026-013, SD-2026-041

### Symptoms
- Release artifact contains developer name, email, phone number
- App renders owner company name/branding on fresh install
- Demo or download files contain real Airtable base IDs, table IDs, webhook URLs
- `npm run release:check` reports privacy gate failures
- CI privacy check fails on push to main

### Likely Causes
- Demo/dev data not stripped before packaging
- `.gitignore` not excluding operational data files
- Default values in HTML/JS literals hard-coded with owner-specific content
- `build.files` in `package.json` not excluding demo/fixture directories
- Customer-facing files copied from operational files without sanitization pass

### Diagnostic Commands
```bash
# Run release gate (sourcedeck-app)
npm run release:check

# Run privacy scanner (sourcedeck-site)
node scripts/check-private-data.js

# Manual grep for owner strings
grep -rn "ARCG Systems\|Ariel's River\|Jean-Max\|jeanmax\|arivergroup\|arcgsystems\|@arcg.ai" \
  --exclude-dir=node_modules --exclude-dir=.git .

# Check for real phone numbers
grep -rn "(212) 663-6215\|(718) 320-3300\|555-906-3676" \
  --exclude-dir=node_modules --exclude-dir=.git .

# Check MOCK_LEADS is empty
grep -n "MOCK_LEADS" sourcedeck.html | head -5

# Check PROMPT_LIBRARY is empty
grep -n "PROMPT_LIBRARY" sourcedeck.html | head -5
```

### Files to Inspect
- `sourcedeck.html` — MOCK_LEADS, PROMPT_LIBRARY, arcg_brand default, socials tab
- `main.js` — window title, package.json author field, scrubStoredData() function
- `app/demo/index.html` — Airtable IDs, webhook URLs
- `app/downloads/sourcedeck-lcc.html` — must be byte-for-byte identical to app/demo
- `scripts/release-check.js` — blocklist patterns
- `scripts/check-private-data.js` — PII scanner patterns

### Repair Pattern
1. Empty `const MOCK_LEADS = [];` and `const PROMPT_LIBRARY = {};` in sourcedeck.html
2. Set neutral brand default: `{"name":"","accent":"#1A6FA8","logo":"","website":"","senderName":""}`
3. Replace all real IDs in demo files with `appDEMO0000000000`, `tblXXXXXXXXXXXXXXX`, etc.
4. Add any new owner-specific patterns to the blocklist in `scripts/release-check.js`
5. Verify `demo/fixtures.json` is NOT in `package.json` `build.files`
6. Add `// privacy-check:ignore-start ... // privacy-check:ignore-end` only for blocklist definitions themselves

### Validation Commands
```bash
npm run release:check        # sourcedeck-app
node scripts/check-private-data.js   # sourcedeck-site
node scripts/check-demo-parity.js    # sourcedeck-site (demo == download mirror)
npm test                     # first-run-safety.test.js catches regressions
```

### Escalation Rules
- Any failure involving real email addresses or phone numbers → CRITICAL, do not push, notify immediately
- Any failure in a release artifact already pushed → revoke/supersede the release immediately

### Agent Automation Rule
Daily: run `node scripts/check-private-data.js` and `npm run release:check`. Block any PR that fails. Alert immediately on CRITICAL patterns (phone, email).

---

## Playbook 3: Renderer Credential Leak (API Keys in localStorage)

**Related events:** SD-2026-004, SD-2026-041

### Symptoms
- API keys visible in browser DevTools → Application → Local Storage
- `lcc_AT_PAT`, `lcc_OPENAI_KEY`, `lcc_CLAUDE_KEY`, `lcc_APOLLO_KEY` found in renderer storage
- Credential appears in a network request directly from the renderer (not from main process)
- Security audit finds Bearer header construction in sourcedeck.html

### Likely Causes
- API calls made directly from renderer instead of through IPC to main process
- Credentials stored with `localStorage.setItem` instead of `window.sd.credentials.set`

### Diagnostic Commands
```bash
# Check for remaining Bearer header builds in renderer
grep -n "'Bearer '\+" sourcedeck.html
grep -n "x-api-key" sourcedeck.html

# Count remaining credential storage in renderer
grep -cE "lcc_(AT_PAT|APOLLO_KEY|OPENAI_KEY|CLAUDE_KEY)" sourcedeck.html

# Check current migration status
grep -n "sdAirtableFetch\|window.sd.airtable\|window.sd.enrichment\|window.sd.ai" sourcedeck.html | wc -l
```

### Files to Inspect
- `sourcedeck.html` — all direct fetch calls to api.airtable.com, api.apollo.io, api.openai.com, api.anthropic.com
- `services/ai/` — should have all AI provider adapters
- `services/airtable/` — should handle all Airtable IPC
- `preload.js` — IPC bridge (window.sd surface)
- `main.js` — IPC handlers

### Repair Pattern
Migrate each direct renderer fetch to the `window.sd` IPC surface:

| Old (renderer) | New (via IPC) |
|---|---|
| `fetch('https://api.airtable.com/...', {headers:{Authorization:'Bearer '+AT_PAT}})` | `await window.sd.airtable.listRecords({baseId, tableRef, query})` |
| `fetch('https://api.openai.com/...', {headers:{Authorization:'Bearer '+OPENAI_KEY}})` | `await window.sd.ai.generate({provider:'openai', ...})` |
| `fetch('https://api.anthropic.com/...', {headers:{'x-api-key':CLAUDE_KEY}})` | `await window.sd.ai.generate({provider:'anthropic', ...})` |
| `localStorage.setItem('lcc_AT_PAT', value)` | `await window.sd.credentials.set('airtable', value)` |

### Validation Commands
```bash
# After migration, these should return 0
grep -c "'Bearer '\+" sourcedeck.html
grep -c "localStorage.*lcc_OPENAI_KEY\|localStorage.*lcc_CLAUDE_KEY" sourcedeck.html
```

### Escalation Rules
- Any credential found in a shipped artifact → CRITICAL
- Any credential in renderer that could be intercepted by malicious web content → HIGH

### Agent Automation Rule
Weekly: run grep checks above. Alert if count > 0 for any credential pattern in renderer.

---

## Playbook 4: CI Workflow Failure (GitHub Actions)

**Related events:** SD-2026-012, SD-2026-027, SD-2026-028, SD-2026-029

### Symptoms
- CI shows green but changes not persisted (calendar.json not committed back)
- Secret available in repo settings but not accessible in workflow
- Tests pass locally but fail in CI due to glob expansion
- Workflow can't push back to repo (permission denied)

### Likely Causes
- Secret name mismatch: `CLAUDE_API_KEY` vs `ANTHROPIC_API_KEY`
- Missing `contents: write` permission for commit-back steps
- Single-quoted test globs prevent shell expansion in CI runners
- Ephemeral runner doesn't persist file changes without explicit commit-back

### Diagnostic Commands
```bash
# Check all secret mappings in workflow YAML
grep -A3 "env:" .github/workflows/*.yml

# Check for missing permissions
grep -A10 "permissions:" .github/workflows/*.yml

# Check test script for quoted globs
cat package.json | grep '"test"'

# Check for commit-back step
grep -n "git commit\|git push" .github/workflows/*.yml
```

### Files to Inspect
- `.github/workflows/*.yml` — all workflow files
- `package.json` → scripts → test command
- Repository settings → Secrets and variables

### Repair Pattern

For **secret name mismatch**:
```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

For **missing permissions**:
```yaml
permissions:
  contents: write
```

For **glob expansion**:
```json
"test": "node --test test/*.test.js"  // unquoted glob, NOT 'test/*.test.js'
```

For **calendar commit-back**:
```yaml
- name: Commit calendar changes
  if: ${{ github.event.inputs.execute_confirm == 'true' }}
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add calendar.json
    git diff --cached --quiet || git commit -m "chore: persist calendar updates"
    git push
```

### Validation Commands
```bash
# After fix, check CI run logs for the failing step
# Locally test the workflow trigger condition
node --test test/*.test.js   # verify glob works locally
```

### Escalation Rules
- Commit-back silently failing = data loss risk; treat as HIGH
- Secret mismatch causing entire integration to skip = HIGH

### Agent Automation Rule
Weekly: verify each workflow's `env:` block maps all required secrets; alert on any `CLAUDE_API_KEY` without a corresponding `ANTHROPIC_API_KEY` mapping.

---

## Playbook 5: Buffer / Social Scheduling API Errors

**Related events:** SD-2026-030, SD-2026-031, SD-2026-035

### Symptoms
- Buffer API returns error for posts with `dueAt` in the past
- Buffer API returns validation error on Facebook posts
- Entire scheduling run fails/stops because one post is invalid
- Instagram reel or Facebook video format posts rejected

### Likely Causes
- Posts scheduled for morning times not updated when afternoon/evening arrives
- Missing required `metadata.facebook.type` field on Facebook posts
- Trying to schedule unsupported post formats (reel, story, carousel, video) without the required API setup
- Scheduler does not skip invalid posts — one failure blocks all subsequent

### Diagnostic Commands
```bash
# Check current calendar for past-due posts
node -e "
const c = require('./calendar.json');
const now = Date.now();
c.filter(p => new Date(p.dueAt) < now && p.status !== 'scheduled')
  .forEach(p => console.log(p.id, p.dueAt, p.status))
"

# Check for posts with missing facebook type
node -e "
const c = require('./calendar.json');
c.filter(p => p.platform === 'facebook' && !p.metadata?.facebook?.type)
  .forEach(p => console.log(p.id))
"
```

### Files to Inspect
- `calendar.json` — all post entries: dueAt, status, platform, mediaStatus
- Workflow YAML — scheduling step logic
- Buffer provider script

### Repair Pattern
1. For past-due posts: update `dueAt` to a future time before next run
2. Add graceful skip in scheduler: `if (new Date(post.dueAt) < Date.now()) { console.log('skip past-due:', post.id); continue; }`
3. Add `metadata.facebook.type` to all Facebook posts
4. Convert unsupported formats (reel/story/video/carousel) to standard image posts until API setup supports them

### Validation Commands
```bash
# Dry run scheduling without execute_confirm
# Check logs for "skip past-due" messages
# Verify no fatal errors on past-due posts
```

### Escalation Rules
- If duplicate posts appear in Buffer due to missing commit-back → manually delete duplicates in Buffer dashboard
- If live post went out with placeholder text → remove from Buffer immediately

### Agent Automation Rule
Before each scheduling run: validate all posts have future `dueAt` AND required format fields. Report count of invalid posts before attempting schedule.

---

## Playbook 6: Gemini / Image Generation API Failures

**Related events:** SD-2026-022, SD-2026-023, SD-2026-024, SD-2026-025, SD-2026-026

### Symptoms
- HTTP 404 on Imagen model calls
- HTTP 400 "only available on paid plans"
- CI workflow stalls — no output for extended period
- Posts stuck at `not_started` after resolving underlying API issue

### Likely Causes
- Imagen models require Vertex AI endpoint, not standard Gemini API
- Hardcoded model names not available on this account's tier
- No timeout on Gemini fetch calls → indefinite stall on hung request
- Stale `failed` mediaStatus and `mediaPromptHash` not cleared after fixing underlying issue

### Diagnostic Commands
```bash
# Discover available image models on this account
# Call ListModels and filter for image-capable models
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); JSON.parse(d).models.filter(m=>m.supportedGenerationMethods?.includes('generateContent')).forEach(m=>console.log(m.name))"

# Check which posts have stale failed status
cat calendar.json | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
JSON.parse(d).filter(p=>p.mediaStatus==='failed').forEach(p=>console.log(p.id,p.mediaStatus))
"
```

### Files to Inspect
- `src/providers/gemini.js` (or equivalent) — model selection, timeout, error handling
- `calendar.json` — mediaStatus fields
- GitHub Actions workflow — timeout settings

### Repair Pattern
1. Replace hardcoded Imagen model with auto-discovery:
   - Call ListModels; filter for `generateContent` support + image capability
   - Prefer free-tier (flash/pro image) over paid (Imagen) models
2. Add 90-second timeout to all Gemini fetch calls using AbortController
3. After resolving underlying API issue, clear stale `failed` status:
   ```js
   post.mediaStatus = null; post.mediaPromptHash = null;
   ```
4. Add `allowOverwrite: true` to Vercel Blob uploads to allow image regeneration

### Validation Commands
```bash
# Reset test posts and run single post dry-run to verify
# Check that model discovery returns at least one available model
# Verify 90s timeout in code: grep -n "AbortController\|fetchWithTimeout" providers/gemini.js
```

### Escalation Rules
- If all image providers fail → fall back to text-only posts; don't block entire calendar
- If model discovery returns empty list → alert immediately (API key may be revoked)

### Agent Automation Rule
Daily health check: verify Gemini API key returns at least one image-capable model. Alert if all image providers fail consecutively for 2+ runs.

---

## Playbook 7: Compliance / Marketing Claims Overclaim

**Related events:** SD-2026-019

### Symptoms
- Site copy claims "SOC 2 ready", "FedRAMP ready", "HIPAA compliant", "HITRUST certified"
- Site claims "Production IBM watsonx" without smoke test evidence
- "Powered by IBM watsonx" without verified live runtime

### Likely Causes
- Marketing copy written by someone without access to engineering verification status
- Copy not reviewed against `docs/IBM_WATSONX_STATUS.md` or equivalent
- No pre-publish review gate for compliance language

### Diagnostic Commands
```bash
# Scan for false certification claims
grep -rn "SOC 2\|FedRAMP\|HIPAA\|HITRUST\|ISO 27001\|CMMC" \
  --include="*.html" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.git . | \
  grep -v "requirement\|customer requirement\|compliance requirement\|manual-qa\|docs/"

# Scan for watsonx overclaims
grep -rn "Powered by IBM watsonx\|Production.*watsonx\|watsonx.*production" \
  --include="*.html" --exclude-dir=node_modules .
```

### Files to Inspect
- `docs/IBM_WATSONX_STATUS.md` — internal source of truth for watsonx claims
- All public-facing HTML pages (`index.html`, `/security/`, `/enterprise/`, `/agents/`)
- `SECURITY.md`

### Repair Pattern
- Replace "SOC 2 ready" → remove entirely or replace with "security-first design"
- Replace "Powered by IBM watsonx" → "AI features available where configured" (until smoke test green)
- Add review step: any new compliance/certification claim must be accompanied by evidence link
- Use `docs/IBM_WATSONX_STATUS.md` as the gating document for watsonx claims

### Validation Commands
```bash
node scripts/check-private-data.js   # catches some compliance claims
grep -rn "SOC 2\|FedRAMP\|HIPAA\|HITRUST" --include="*.html" . | grep -v docs/
```

### Escalation Rules
- Any live compliance claim discovered without certification evidence → CRITICAL; remove immediately
- watsonx "production" claim before smoke test green → HIGH

### Agent Automation Rule
Daily: grep all public HTML for certification keywords. Alert on any match outside of `docs/` and `/resources/` context-reference pages.

---

## Playbook 8: Electron App Build Failures

**Related events:** SD-2026-036, SD-2026-037, SD-2026-038, SD-2026-039

### Symptoms
- Electron app fails to start in production
- Auto-updater not functioning
- Keychain/credential storage not working
- `npm install` skips electron in production environment

### Likely Causes
- `electron` in devDependencies instead of dependencies
- Wrong main.js path in package.json
- preload.js IPC bridge not correctly exposing `window.sd` surface
- main.js missing IPC handlers or using wrong channel names

### Diagnostic Commands
```bash
# Check electron is in dependencies (not devDependencies)
cat package.json | node -e "const p=JSON.parse(require('fs').readFileSync('/dev/stdin'));console.log('deps:',Object.keys(p.dependencies||{})); console.log('devDeps:',Object.keys(p.devDependencies||{}))"

# Verify main entry point
cat package.json | grep '"main"'

# Check IPC handlers match preload bridge
grep -n "ipcMain.handle" main.js | head -20
grep -n "ipcRenderer.invoke" preload.js | head -20

# Test app startup
npm start 2>&1 | head -30
```

### Files to Inspect
- `package.json` — `dependencies`, `devDependencies`, `main` field, `build.files`
- `main.js` — IPC handlers, window creation, scrubStoredData()
- `preload.js` — contextBridge exposures, window.sd surface
- `build/` — icon assets for electron-builder

### Repair Pattern
1. Move `electron` from devDependencies to dependencies
2. Ensure `main.js` is the correct file with auto-updater
3. Verify preload.js contextBridge.exposeInMainWorld('sd', {...}) covers all IPC routes
4. Confirm build.files includes main.js, preload.js, sourcedeck.html (but NOT demo/, dist/)

### Validation Commands
```bash
npm start              # app should launch without console errors
npm run pack:mac       # build artifact without signing
```

### Escalation Rules
- Keychain bridge failure = credentials silently falling back to localStorage = HIGH security risk
- Auto-updater failure = users can't receive security fixes = HIGH

### Agent Automation Rule
On each release: verify `electron` is in `dependencies`; verify `build.files` excludes demo fixtures; run `npm run release:check`.

---

## Playbook 9: Chat Widget Not Loading

**Related events:** SD-2026-016, SD-2026-017

### Symptoms
- Chatwoot chat bubble not visible on site
- `window.$chatwoot` undefined in browser console
- Widget SDK loads but init silently fails

### Likely Causes
- Wrong Chatwoot website token (token doesn't match any inbox in account)
- Safe-guard condition inverted (blocking real tokens, allowing placeholder)

### Diagnostic Commands
```javascript
// In browser console on sourcedeck.app:
console.log(window.$chatwoot)         // should be defined
console.log(window.chatwootSettings)  // check websiteToken value

// In assets/chatwoot.js:
// Find the safe-guard condition — it should SKIP loading when token == placeholder value
// NOT when token == live value
```

### Files to Inspect
- `assets/chatwoot.js` — token value, safe-guard condition logic
- Chatwoot dashboard → Settings → Inboxes → copy Website Token

### Repair Pattern
1. Verify token in `assets/chatwoot.js` matches inbox in Chatwoot dashboard
2. Safe-guard pattern: `if (token === 'YOUR_TOKEN_HERE') { return; }` — skip on PLACEHOLDER, not on live token
3. Confirm `widget_color` and `website_url` match the inbox settings

### Validation Commands
```javascript
// After fix: load site in browser, open DevTools console
// Should see: "Chatwoot widget loaded" (or equivalent SDK init message)
// Should NOT see: any Chatwoot init errors
```

### Agent Automation Rule
Weekly: fetch sourcedeck.app, check that Chatwoot SDK loads and `$chatwoot` is defined. Alert on failure.

---

## Playbook 10: Route 404 / Missing Page

**Related events:** SD-2026-014

### Symptoms
- Specific URL returns 404 on production
- Directory exists in repo but no index.html
- Vercel shows 404 for a known route

### Likely Causes
- Directory created but index.html not added
- Page removed but sitemap.xml / internal links still reference it
- Vercel routing config missing catch-all or directory index rule

### Diagnostic Commands
```bash
# Check for directories without index.html
find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -exec sh -c 'test ! -f "$1/index.html" && echo "$1"' _ {} \;

# Check sitemap for dead routes
grep -oP '(?<=<loc>)[^<]+' sitemap.xml | while read url; do
  path="${url#https://sourcedeck.app}"
  [ -f ".${path}index.html" ] || echo "MISSING: $path"
done
```

### Repair Pattern
1. For missing directory index: add `index.html` (can be a redirect stub or full page)
2. For removed pages: remove from sitemap.xml and update all internal links
3. For Vercel routing: check `vercel.json` for explicit route mappings

### Agent Automation Rule
Daily: check each URL in sitemap.xml returns HTTP 200 or 301/302. Alert on any 404.

---

## Playbook: watsonx HTTP 403 (OPEN-002 / SD-2026-006)

### Symptom
- AI calls routed to watsonx return HTTP 403.
- The IBM error body contains
  `no_associated_service_instance_error` and a
  `project_id … is not associated with a WML instance` message.

### Safe Diagnostic Path (in-app)
1. Settings → IBM mode → **watsonx readiness** → "Run readiness check".
2. The panel returns a classified status from
   `services/ai/watsonx-readiness.js`:
   - `forbidden_403` (the OPEN-002 case),
   - or one of the other 8 stable codes.
3. The panel renders deterministic remediation steps without exposing
   any token, project id, space id, or trace id.

### Repair Pattern (operator action required)
- Verify the `WATSONX_API_KEY` belongs to the same IBM Cloud account
  as the `WATSONX_PROJECT_ID` (or `WATSONX_SPACE_ID`).
- Verify `WATSONX_URL` matches the region of your WML instance.
- Verify the IAM identity has the `watsonx.ai` role on that project.
- For the `cpdaas` vs `wx` runtime context case: file IBM support
  request per `docs/IBM_SUPPORT_TICKET_RUNTIME_ASSOCIATION.md`.

### Live Runtime Evidence Path (Phase 18A — in CLI)
The static readiness panel diagnoses an already-produced error. To prove a
real runtime request actually works, run the runtime probe from an
environment with valid IBM env:
1. `npm run watsonx:runtime-probe` — human-readable diagnosis.
2. `npm run watsonx:runtime-probe:evidence` — writes redacted evidence to
   `reports/watsonx-runtime/` (git-ignored).
3. `npm run watsonx:runtime-probe:strict` — exits `0` only when the
   outcome is `verified_ready`.
The probe attempts a real IAM exchange + minimal runtime request **only**
when required env is present, and classifies the result into the stable
states in `services/ai/watsonx-runtime-evidence.js`. A blocked outcome
prints exact IBM-side operator steps.

### Public-copy Gate
Do not claim watsonx is "fully operational" and do not claim watsonx is
live until a real runtime request succeeds with captured `verified_ready`
evidence. The KB E-007 / E-010 rules enforce this; the test suite blocks
misleading copy via `test/watsonx-runtime-context.test.js` and
`test/watsonx-runtime-evidence.test.js`.

### Agent Automation Rule
On every `npm test`: run `test/watsonx-runtime-context.test.js`,
`test/watsonx-runtime-evidence.test.js`, and `test/ibm-readiness.test.js`.
Finding **WX-006** is PASS only when the latest runtime evidence outcome is
`verified_ready`; otherwise MANUAL/WARN (never FAIL for absent IBM env).
Block release if any fail or if any public doc claims watsonx is fully
operational without paired evidence.

---

## Playbook: macOS signing/notarization readiness (E-009 / REL-020)

### Symptom
- `scripts/release-check.js` warns
  `codesign verify failed (artifact is unsigned or improperly signed)`
- Daily troubleshooting agent surfaces REL-020 as MANUAL.

### Safe Diagnostic Path
1. `npm run release:mac-signing-readiness` — expected
   `status: unsigned_dev_ok` and exit `0` in local dev.
2. From a configured signing environment, run
   `npm run release:mac-signing-readiness:strict` — must report
   `ready_to_sign` and exit `0`. Any other status with exit `1` is
   actionable per the printed remediation.

### Repair Pattern (operator only; no app code change)
- Provide `CSC_LINK` + `CSC_KEY_PASSWORD`.
- Provide either 3 `APPLE_*` env vars or 3 `APPLE_API_*` env vars for
  notarization.
- Flip `package.json` `build.mac.notarize` to `true` for the release
  build.

### Public-copy Gate
Do not change public copy from "SourceDeck is configured for macOS
signing" or similar tentative wording to a "live on signed/notarized"
claim until evidence (codesign verify + spctl + stapler) is captured.

### Agent Automation Rule
On every `npm test`: run
`test/macos-signing-readiness.test.js`. Block release if any fail or
if any public doc positively claims the app is signed/notarized
outside of negated/conditional language.

---

## Playbook: release evidence capture (E-010 / REL-030)

### Symptom
- An operator needs a single deterministic record of the local release
  state (git, package, asar, signing readiness, troubleshooting,
  release-check) before deciding whether SourceDeck is ready to publish.

### Safe Diagnostic Path
1. `npm run release:evidence` — writes
   `reports/release-evidence/latest-release-evidence.{md,json}` and a
   dated copy. Exits 0 in local dev. State reflects the local
   environment.
2. From a release environment, `npm run release:evidence:strict` —
   must exit 0 and state must be `packaged_signed_verified` before
   publishing.
3. The daily troubleshooting agent surfaces `REL-030` as PASS once at
   least one report is written; never FAIL by design.

### Repair Pattern
- For local dev: capture a report via `npm run release:evidence`.
- For a release: complete the steps in
  `docs/release/release-evidence.md` (signing env, notarize flag,
  build, verify, evidence strict).

### Public-copy Gate
Do not change public copy to claim a signed/notarized macOS release
until evidence shows `packaged_signed_verified` AND
`codesign --verify` PASS is captured.

### Agent Automation Rule
On every `npm test`: run
`test/release-evidence.test.js`. Block release if any fail.
