# Evidence Index

Every source of evidence reviewed during this audit.

**Audit date:** 2026-05-29  
**Auditor:** SourceDeck Troubleshooting Agent (Claude)

---

## Git Commits Reviewed

### sourcedeck-app (`thekidd2227/sourcedeck-app`)

| Commit | Date | Type | Description |
|---|---|---|---|
| `aa1e523` | 2026-04-24 | Privacy fix | Scrub owner data from shipped app; add release-blocking gate; v1.1.0 |
| `7cb5144` | 2026-05-07 | Security fix | Redact third-party HTTP error bodies before exposing to renderer |
| `d42509a` | 2026-05-24 | UI fix | Correct save-status copy from sessionStorage to localStorage |
| `113c208` | ~2026-04 | Security refactor | Migrate Apollo enrichment to app boundary |
| `f8f86c8` | ~2026-04 | Security refactor | Migrate renderer Airtable calls to app boundary |
| `b2765c8` | ~2026-04 | Security refactor | Move credentialed APIs behind app boundary |
| `aaa7dcf` | ~2026-04 | Architecture | Prepare SourceDeck for web-first SaaS |
| `90cc04f` | ~2026-04 | GovCon hardening | Harden opportunity ingestion and capture workflow |
| `bea619d` | ~2026-04 | Auth | Bearer-mode auth proven + schema_version + release-prep hardening |
| `feb443d` | ~2026-04 | Integration | ChartNav live integration: e2e validation + token hardening |
| `499e9d3` | ~2026-04 | Security | Strip personal Airtable/Instantly/webhook/Notion IDs from shipped app |

### sourcedeck-site (`thekidd2227/sourcedeck-site`)

| Commit | Date | Type | Description |
|---|---|---|---|
| `bf3dc6f` | 2026-05-28 | Deployment fix | Set framework null + empty buildCommand to prevent npm build |
| `36d4539` | 2026-05-28 | Deployment fix | Correct vercel.json redirect source syntax for chartnavmd |
| `28346ee` | 2026-05-10 | Access control | Remove free demo, public download, and self-serve enablement |
| `c358a0f` | 2026-05-10 | Copy fix | Hide visible email addresses; relabel CTAs |
| `9c2749a` | 2026-05-10 | CI fix | Unquote test glob so CI shell expands it |
| `fcdd858` | 2026-05-10 | Privacy fix | Scrub PII and add automated privacy guardrails |
| `02d410e` | ~2026-05 | Enterprise pass | Privacy fixes, repositioning, /enterprise + /security |
| `2c10e78` | ~2026-05 | Routing fix | Add app downloads index and exclude auth callback from cache |
| `5bb1721` | 2026-04-15 | Integration fix | Clear Mac chip labels + correct Chatwoot website token |
| `f3f726c` | 2026-04-15 | Integration fix | Correct Chatwoot safe-guard so live token is not skipped |
| `e3b54c1` | ~2026-04 | Security | Strip personal IDs from customer-facing LCC files |
| `d03ca8c` | ~2026-04 | Cleanup | Strip remaining desktop/HTML-download surfaces |
| `65b2a8f` | ~2026-04 | Product | Remove desktop-app download option |
| `27d651a` | ~2026-04 | Deployment | Remove GitHub Pages CNAME — migrating to Vercel |

### ARCGSystems (`thekidd2227/ARCGSystems`)

| Commit | Date | Type | Description |
|---|---|---|---|
| `0591095` | 2026-05-29 | CI fix | Map CLAUDE_API_KEY secret to ANTHROPIC_API_KEY env |
| `2655b1b` | 2026-05-29 | API fix | Use Gemini generateContent flash-image model (Imagen 404s on API key) |
| `ea61c8f` | 2026-05-29 | API fix | Rank free-tier Gemini image models above paid Imagen |
| `92e536b` | 2026-05-29 | API fix | Auto-discover Gemini image model + Blob allowOverwrite |
| `cd5dcc2` | 2026-05-29 | API fix | Add request timeout to Gemini calls to prevent run stalls |
| `9572198` | 2026-05-29 | Workflow fix | Clear stale failed status so unscheduled posts retry cleanly |
| `18dd160` | 2026-05-29 | CI fix | Add contents:write permission for calendar commit-back |
| `80bf8f4` | 2026-05-29 | CI fix | Auto-commit calendar changes back to repo after workflow runs |
| `b4c5cec` | 2026-05-26 | Content fix | Set today's posts to evening times (past morning slots caused dueAt error) |
| `20da102` | 2026-05-26 | API fix | Skip past-dueAt posts instead of crashing + fix today's times |
| `40cae98` | ~2026-05 | Content fix | Convert Instagram reel/story formats to image post |
| `aed2797` | ~2026-05 | Content fix | Convert May LinkedIn/Facebook video+carousel to image format |
| `66e7b77` | ~2026-05 | Content fix | Remove Canva images with placeholder text and template artifacts |
| `14a194e` | ~2026-05 | Deployment fix | Remove vercel.json that overrode project-specific Vercel settings |
| `29248b8` | ~2026-05 | Build fix | Fix TypeScript project health |
| `1e764f1` | ~2026-05 | API fix | Add metadata.facebook.type for Facebook posts |

### arcg-lcc (`thekidd2227/arcg-lcc`)

| Commit | Date | Type | Description |
|---|---|---|---|
| `1e5bb6a` | ~2026-04 | Build fix | Move electron to dependencies (NODE_ENV=production compat) |
| `b10201f` | ~2026-04 | Build fix | Correct package.json with electron dep |
| `13d0ee6` | ~2026-04 | Build fix | Fix preload bridge for OS keychain |
| `d91aeb8` | ~2026-04 | Build fix | Use correct main.js with auto-updater |
| `b3d7533` | ~2026-04 | Build | Add preload security bridge |
| `57eef72` | ~2026-04 | Build | Add preload security bridge (retry) |

### sourcedeck (`thekidd2227/sourcedeck`)

| Commit | Date | Type | Description |
|---|---|---|---|
| `da079db` | ~2026-05 | i18n fix | Align language switcher with site.language spec |

---

## Branch Names Reviewed

- `claude/source-tech-troubleshooting-agent-9xwYO` (current, all repos)
- `main` (all repos)
- `feat/govcon-setup-wizard`, `feat/govcon-setup-wizard-rebased` (sourcedeck-app)
- `feat/govcon-capture-suite` (sourcedeck-app)
- `feature/sourcedeck-web-saas-pwa-commercial` (sourcedeck-app)
- `qa/govcon-outreach-os-release-hardening` (sourcedeck-app)
- `release/phase-13-operator-smoke-rc` (sourcedeck-app)
- `feat/govcon-operating-profile-wizard` (sourcedeck-app)
- `feat/multi-vertical-positioning`, `feat/nav`, `feat/i18n` (sourcedeck-site)
- `feature/arcg-content-command-center` (ARCGSystems)
- `revamp/copy-diet-70` (sourcedeck-site, evidence from COPY_CUT_REPORT.md)

---

## Documentation Files Inspected

### sourcedeck-app

| File | Contents |
|---|---|
| `release/notes/v1.0.0.md` | WITHDRAWN notice for privacy defect |
| `release/notes/v1.1.0.md` | Full changelog for privacy repair release |
| `docs/release/RELEASE_RUNBOOK_v1.1.0.md` | Step-by-step release process; gate commands |
| `docs/release/privacy-first-run-verification.md` | Root cause analysis + 30+ leak vectors |
| `docs/renderer-credential-migration.md` | Credential boundary migration status table |
| `docs/IBM_READINESS.md` | IBM watsonx readiness checklist |
| `docs/workspace-readiness-banners.md` | Readiness banner spec |
| `docs/audits/govcon-operating-profile-wizard-audit.md` | Pre-build audit; missing features documented |
| `docs/release-evidence/phase-13-operator-smoke/functional-smoke-output.txt` | 19/19 PASS smoke test |
| `docs/manual-qa/govcon-outreach-os-release-smoke.md` | 30-step operator QA checklist |
| `qa/live-smoke-output.json` | ChartNav live smoke test results (5 scenarios) |
| `qa/live-smoke-output-bearer.json` | Bearer-mode ChartNav smoke test results |
| `RELEASE.md` | Release process notes |
| `README.md` | Repo overview |

### sourcedeck-site

| File | Contents |
|---|---|
| `docs/IBM_WATSONX_STATUS.md` | Internal honesty doc: what can/cannot be claimed about watsonx |
| `docs/IBM_SUPPORT_TICKET_RUNTIME_ASSOCIATION.md` | IBM support ticket template for runtime context migration |
| `docs/QA_FIRST_RUN_PRIVACY.md` | Privacy QA checklist |
| `docs/QA_ENTERPRISE_READINESS.md` | Enterprise readiness checklist |
| `docs/credential-and-tenant-boundary.md` | Tenant isolation and credential boundary spec |
| `docs/AI_PROVIDER_STRATEGY.md` | AI provider fallback strategy |
| `docs/AI_CONTRACT.md` | AI request/response contract including AI_REQUEST_FAILED |
| `docs/GOVERNANCE.md` | Governance event types including FAILED states |
| `docs/chatwoot-setup.md` | Chatwoot widget setup documentation |
| `docs/chatwoot-canned-responses.json` | Pre-written support responses including unsigned app FAQ |
| `docs/sourcedeck-knowledge-base-audit.md` | Prior knowledge base audit |
| `docs/electron-deprecation-plan.md` | Desktop-to-PWA migration plan |
| `COPY_CUT_REPORT.md` | 70% copy reduction audit (resources page missed target) |
| `SECURITY.md` | Threat model, auth spec, tenant isolation |
| `CLAUDE.md` | Development guidance |

### ARCGSystems

| File | Contents |
|---|---|
| `src/components/chartnav/README.md` | ChartNav component docs including failure/retry handling |
| `src/components/chartnav/MAKE_SCENARIO.md` | Make.com workflow scenario including intentional failure test |
| `src/content/arcg/calendar.json` | Content calendar with theme `do-not-automate-broken-logic` |

---

## CI/CD Configs Inspected

| File | Repo | Purpose |
|---|---|---|
| `.github/workflows/build-release.yml` | sourcedeck-app | Electron build + release; privacy gate runs before platform builds |
| `.github/workflows/privacy-check.yml` | sourcedeck-site | Privacy + parity check on every PR and main push |
| `.github/workflows/build-release.yml` | arcg-lcc | Electron build + release |
| `.github/workflows/*.yml` | ARCGSystems | Content calendar automation; social scheduling |

---

## Package Scripts Inspected

### sourcedeck-app
```
test — 27 test files run in sequence
prerelease — node scripts/release-check.js
release:check — node scripts/release-check.js
govcon:smoke — node scripts/govcon-release-smoke.mjs
govcon:outreach-os:audit — node scripts/govcon-outreach-os-audit.mjs
phase13:rc-check — node scripts/phase-13-rc-check.mjs
i18n:audit — node scripts/audit-i18n.mjs
```

### sourcedeck-site
```
test — npm --prefix packages/core test && npm --prefix apps/web test && node --test test/*.test.mjs
build — npm --prefix apps/web run build
commercial:check — node scripts/commercial-release-check.mjs
server:test — npm --prefix server test
```

### sourcedeck-site/server
```
test — node --test test/*.test.js  (previously: 'test/*.test.js' with quotes — caused CI failure)
```

---

## Commands Run During This Audit

```bash
# Discovery
find /home/user -maxdepth 5 -iname "*sourcedeck*" -print
find /home/user -maxdepth 4 -type d -iname "arcg*" -print
ls -la /home/user/

# Git audit (all repos)
git log --all --oneline --max-count=300
git log --all --regexp-ignore-case --grep="fix|bug|error|broken|repair|fail|security|deploy|privacy|credential" --oneline
git branch -a
git remote -v
git status
git show <commit> --stat
git log --format="%B" -n 1 <commit>

# File structure inspection
ls -la /home/user/sourcedeck-site/
ls -la /home/user/sourcedeck-app/

# Grep searches
grep -RInE "TODO|FIXME|BUG|ERROR|FAILED|fail|broken|repair|hotfix|workaround|deprecated|unsafe|unverified" . --include="*.md" --include="*.json"
grep -RInE "TODO|FIXME|BUG|ERROR|FAILED|fail|broken" . (ARCGSystems — too large, result saved to file)

# Document reads
cat release/notes/v1.0.0.md
cat release/notes/v1.1.0.md
cat docs/release/RELEASE_RUNBOOK_v1.1.0.md
cat docs/release/privacy-first-run-verification.md
cat docs/renderer-credential-migration.md
cat docs/IBM_WATSONX_STATUS.md
cat docs/audits/govcon-operating-profile-wizard-audit.md
cat qa/live-smoke-output.json
cat sourcedeck-site/COPY_CUT_REPORT.md
cat sourcedeck-site/SECURITY.md
cat sourcedeck-site/vercel.json
cat sourcedeck-app/package.json
cat docs/release-evidence/phase-13-operator-smoke/functional-smoke-output.txt
cat docs/manual-qa/govcon-outreach-os-release-smoke.md
cat .github/workflows/privacy-check.yml
```

---

## Commands That Were Not Run (Would Require Dependencies / Build Environment)

```bash
npm run release:check          # sourcedeck-app — requires node_modules
npm test                       # sourcedeck-app — requires node_modules
npm test                       # sourcedeck-site/server — requires node_modules
npx tsc --noEmit               # ARCGSystems — requires node_modules
npm start                      # sourcedeck-app — requires Electron display
node scripts/verify-watsonx.mjs  # sourcedeck-site — requires IBM credentials
```

These commands were NOT run during this audit. All outputs referenced in this knowledge base come from git history and committed QA/release documents.
