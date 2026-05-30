# SourceDeck Repo Inventory

**Audit date:** 2026-05-29  
**Repos found at:** `/home/user/`

---

## Active Repos

### 1. sourcedeck-app
| Field | Value |
|---|---|
| Remote | `thekidd2227/sourcedeck-app` |
| Local path | `/home/user/sourcedeck-app` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | Electron (Node.js) |
| Package manager | npm |
| Deploy platform | GitHub Releases (electron-builder) |
| Purpose | Main SourceDeck desktop application. Electron shell wrapping `sourcedeck.html` Lead Command Center. All credentialed API calls routed through main-process IPC boundary. |
| Status | **ACTIVE — primary product** |
| Version | 1.1.0 |
| Known sub-surfaces | `sourcedeck.html` (LCC UI), `main.js` (main process + privacy scrub), `preload.js` (IPC bridge), `services/` (API adapters), `test/` (27 test files) |
| Notes | v1.0.0 WITHDRAWN due to privacy defect. v1.1.0 is current production release. |

---

### 2. sourcedeck-site
| Field | Value |
|---|---|
| Remote | `thekidd2227/sourcedeck-site` |
| Local path | `/home/user/sourcedeck-site` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | Static HTML + Node.js backend (`server/`) |
| Package manager | npm (server-side only; site itself is static) |
| Deploy platform | Vercel |
| Purpose | Public marketing site at sourcedeck.app. Includes `/command/`, `/portal/`, `/pricing/`, `/agents/`, `/settings/`, `/integrations/`, `/onboarding/`, `/activate/`, `/webhooks/`, `/enterprise/`, `/security/`, `/resources/`, `/federal/`, and many more routes. Also includes `server/` (Express API for privacy checks, Stripe webhooks, etc.). |
| Status | **ACTIVE — public-facing** |
| Notes | Static site — no npm build. vercel.json must declare `framework: null` and empty `buildCommand`. Many routes redirected from demo/download to request-access. CI privacy guardrail runs on every push to main. |

---

### 3. ARCGSystems
| Field | Value |
|---|---|
| Remote | `thekidd2227/ARCGSystems` |
| Local path | `/home/user/ARCGSystems` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | TypeScript / Node.js + Vercel / GitHub Actions |
| Package manager | npm |
| Deploy platform | Vercel (multiple projects connected); GitHub Actions (content calendar automation) |
| Purpose | ARCG Systems corporate site + GovCon marketing intelligence + content calendar automation system. Drives Buffer.com social scheduling via GitHub Actions. Image generation via OpenAI / Gemini / Claude. |
| Status | **ACTIVE — operational automation** |
| Notes | Caution: vercel.json at repo root applies to ALL connected Vercel projects (4 total). Removing vercel.json from this repo is critical to prevent overriding other project build settings. Calendar automation workflow runs on commit trigger + manual dispatch. |

---

### 4. arcg-lcc
| Field | Value |
|---|---|
| Remote | `thekidd2227/arcg-lcc` |
| Local path | `/home/user/arcg-lcc` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | Electron (Node.js) |
| Package manager | npm |
| Deploy platform | GitHub Actions (build + release) |
| Purpose | Electron wrapper for the ARCG Lead Command Center (LCC) HTML interface. Contains main.js, preload.js, package.json for Electron app. Earlier iteration of what became sourcedeck-app. |
| Status | **ACTIVE — but potentially superceded by sourcedeck-app** |
| Notes | Several "Fix" commits during initial Electron setup suggest rapid iteration. electron must be in `dependencies` not `devDependencies` for production builds. Relationship to sourcedeck-app is unclear — may serve a different audience or be the ARCG-branded version. |

---

### 5. sourcedeck
| Field | Value |
|---|---|
| Remote | `thekidd2227/sourcedeck` |
| Local path | `/home/user/sourcedeck` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | Static HTML (GitHub Pages / Vercel) |
| Package manager | npm (minimal) |
| Deploy platform | Vercel / GitHub Pages |
| Purpose | SourceDeck landing page and app demo at sourcedeck.app. Contains `/app/demo/` — clean LCC mirror with user-configurable keys, plus EN/ES i18n. |
| Status | **ACTIVE — landing/demo surface** |
| Notes | Smallest repo. GitHub Actions deploy workflow present. CNAME for sourcedeck.app. Contains i18n (EN/ES) with lang toggle, auto-detect, localStorage persistence. The `/app/demo/` path is a zero-pre-loaded-data LCC demo. |

---

### 6. arcg-live
| Field | Value |
|---|---|
| Remote | `thekidd2227/arcg-live` |
| Local path | `/home/user/arcg-live` |
| Active branch | `claude/source-tech-troubleshooting-agent-9xwYO` |
| Framework | Unknown (single commit) |
| Package manager | Unknown |
| Deploy platform | Unknown |
| Purpose | Unknown — only one commit: "Add ARCG watermark logo" |
| Status | **UNCLEAR / LIKELY STUB** |
| Notes | Only 1 commit in entire history. May be a new project stub or an abandoned initiative. Risk: low at current state but should be confirmed before additional development. |

---

## Summary Table

| Repo | Status | Framework | Deploy | Risk |
|---|---|---|---|---|
| sourcedeck-app | Active | Electron | GitHub Releases | HIGH (privacy defect history) |
| sourcedeck-site | Active | Static + Node | Vercel | MEDIUM (many PII fixes) |
| ARCGSystems | Active | TS/Node | Vercel + GH Actions | MEDIUM (vercel.json risk) |
| arcg-lcc | Active | Electron | GH Actions | MEDIUM (credential boundary) |
| sourcedeck | Active | Static | Vercel/GH Pages | LOW |
| arcg-live | Unclear | Unknown | Unknown | LOW (stub) |

---

## Repo Overlap / Confusion Risk

- `sourcedeck-app` and `arcg-lcc` both wrap the LCC HTML in Electron. Relationship not fully documented. Risk of divergence.
- `sourcedeck` and `sourcedeck-site` both serve parts of the sourcedeck.app domain. Route ownership must be explicit.
- `ARCGSystems` is connected to 4 Vercel projects — a single root-level vercel.json breaks all of them. This has already caused one production incident (SD-2026-033).
