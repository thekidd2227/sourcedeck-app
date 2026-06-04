# SourceDeck

Desktop operating system for GovCon capture, lead management, and pipeline execution.

Built for ARCG Systems first; designed for commercial licensing later.

## Current Status

| Area | State |
|---|---|
| Electron shell + auto-updater | Shipping (v1.1.0) |
| GovCon capture workflow | Active — SAM.gov search, compliance matrix, past-performance library, stakeholder graph, deal workspace |
| Fast-cash decision engine | Active — QUOTE_NOW / SOURCE_SUB_FIRST / SAFE_OUTREACH_FIRST / WATCH / KILL / MORE_RESEARCH_NEEDED |
| Outreach-window gate | Active — GREEN / YELLOW / RED_RESTRICTED classification, blocks draft generation when restricted |
| Credential boundary | In progress — Airtable, Apollo, SAM.gov migrated to safeStorage; OpenAI/Anthropic renderer-side migration pending |
| AI providers | OpenAI, Anthropic, IBM watsonx (config-pending), local fallback |
| Workflow engine | Foundation — intake classification, task creation, artifact drafts, four vertical templates |
| Self-serve subscription | Not implemented — operator provisioned only |
| Export | Not yet — planned markdown export for decision records, outreach logs, quote packets |

## Developer Setup

```bash
npm install
npm start          # Electron dev mode
npm test           # 127+ tests (govcon-core, credential-boundary, architecture, etc.)
npm run build:mac  # macOS DMG + ZIP
npm run build:win  # Windows NSIS installer
npm run release:check  # Pre-release privacy + parity gate
```

## Architecture

- **Electron 29** with `contextIsolation: true`, `nodeIntegration: false`
- **Single-file HTML** interface (`sourcedeck.html`) — acknowledged tech debt; web-first migration planned
- **Main-process service layer** (`services/`) owns all external API calls; renderer never builds auth headers for migrated services
- **App-API adapter** (`api/index.js`) — platform-neutral boundary usable from Electron IPC or a future HTTP server
- **electron-store + safeStorage** for encrypted credential persistence (OS keychain where available)
- **electron-updater** for automatic updates via GitHub Releases

## Tabs

| Tab | Purpose |
|---|---|
| Command Center | Operational inbox: overdue follow-ups, blocked approvals, failed automations |
| Dashboard | Pipeline stats, KPIs, quick actions |
| Lead Generator | AI-powered multi-source lead discovery |
| Revenue | Deal value tracking and revenue map |
| Email Tracker | Outreach and reply monitoring |
| Overdue | Action items past due date |
| Response Desk | Inbound reply triage, intent scoring, draft-only responses, and pipeline/task recommendations |
| Ad Engine | Content and ad creation |
| Daily Ops | Daily operations brief |
| Socials | Social media content |
| System Flow | System architecture visualization |
| Create Lead | Manual lead entry |
| AI Generate | AI-powered content generation |
| Settings | BYOK API key management with encrypted storage |
| Client Delivery | Active client delivery tracking |
| GovCon | SAM.gov opportunity search and capture |
| Command | Operational command dashboard |
| Opportunities | Opportunity pipeline |
| Deal Workspace | Bid/no-bid evaluation with PURSUE / CONDITIONAL / KILL verdicts |
| Pipeline | Stage-based deal tracking |
| Execution | Execution tracking |
| Reports | Proof-of-performance and analytics |
| Clinical / EHR | Optional healthcare capability mode |

## GovCon Fast-Cash Workflow

Target: micro-purchases, simplified acquisitions, and small contracts under $250K ceiling.

### Decision verdicts
- **QUOTE_NOW** — opportunity is ready to quote immediately
- **SOURCE_SUB_FIRST** — need subcontractor/vendor before quoting
- **SAFE_OUTREACH_FIRST** — pre-solicitation relationship-building is appropriate
- **WATCH** — monitor but do not act yet
- **KILL** — permanent drop (irreversible)
- **MORE_RESEARCH_NEEDED** — cannot decide without more information

### Outreach-window classifications
- **GREEN_GENERAL_CAPABILITY_INTRO** — no active solicitation; general outreach OK
- **GREEN_PRE_SOLICITATION** — sources sought / RFI window; capability response OK
- **GREEN_POST_AWARD** — awarded; debrief / next-opportunity outreach OK
- **YELLOW_PUBLIC_QA_ONLY** — active solicitation; use official Q&A only
- **RED_RESTRICTED** — restricted communication window; no outreach, no draft generation
- **UNKNOWN_RESEARCH_FIRST** — cannot determine; research before any contact

### Hard rules
- KILL stays KILL
- RED_RESTRICTED blocks outreach draft generation
- Failed margin stress blocks quote recommendation
- LOW/UNKNOWN confidence cannot become verified fact
- AI may explain, draft, organize; AI must not decide
- No side-channel COR/program-office outreach during active solicitation
- Official POC/Q&A route only during active solicitation

## Security Model

- **Renderer never sees API keys** for migrated services (Airtable, Apollo, SAM.gov)
- **safeStorage** encrypts credentials at rest using OS keychain
- **Presence-only API** — renderer can check if a credential exists but cannot read its value
- **Privacy scrub** runs at every boot; blocks owner-identifying strings from persisting
- **Release gate** (`scripts/release-check.js`) blocks publish if privacy violations detected
- **FAR-aware stakeholder graph** enforces restricted posture for contracting officers

## Known Limitations

- **Renderer credential migration incomplete** — OpenAI and Anthropic keys are still read from localStorage in ~10 renderer call sites. The main-process `sd.ai.generate()` path exists and works; migration is tracked in `docs/renderer-credential-migration.md`.
- **Single-file HTML monolith** — `sourcedeck.html` is ~8900 lines. Web-first decomposition is planned.
- **No self-serve subscription** — operator provisioned only. Do not add fake checkout flows.
- **macOS notarization disabled** — unsigned builds only for now.
- **Airtable field IDs are hardcoded** — each operator must configure their own base.
- **SAM.gov proxy fallback** — GovCon tab falls back to localhost proxy when IPC path is unavailable.

## License

Proprietary. All rights reserved.
