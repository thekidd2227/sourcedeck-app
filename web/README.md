# `/web/` — Web app target (placeholder)

This directory is reserved for the SourceDeck web app. It is
**not built yet**. See `docs/architecture-web-first-roadmap.md` for
the rollout plan.

## Contract with the rest of the repo

The web app will consume the same `/api/createAppApi` adapter that
the Electron renderer (eventually) uses. It must never:

- Build Bearer headers for Airtable / Apollo / SAM.gov / OpenAI /
  Anthropic. Those calls happen behind the API.
- Store API keys in `localStorage` / `sessionStorage` / `IndexedDB`.
  Credentials live in the backend vault (`VaultAdapter` in
  `services/settings/credentials.js`).
- Reach DOM patterns that aren't browser-safe (no `node:fs`, no
  `electron`, no `safeStorage` direct).

## Recommended stack (when we start)

- Vite + React + TypeScript (matches the team's existing comfort
  zone and avoids paid SaaS dependencies).
- The same Tailwind / design tokens used by the public site
  (`sourcedeck-site` repo) so the web app inherits the brand.
- The audit-log UI panel is a good first screen — it consumes
  `api.audit.list()` and validates the boundary end-to-end.
