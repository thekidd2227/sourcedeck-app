# `/web/` — Web/PWA companion target (placeholder)

This directory is reserved for the SourceDeck web app. It is
**not built yet**. The first target is an installable tablet companion,
not an Electron rewrite. See `docs/architecture-web-first-roadmap.md`
and `docs/tablet-companion-plan.md` for the rollout plan.

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
- Download, preview, unzip, or deeply extract local solicitation packages.
  Those workflows remain in Electron; the PWA receives sanitized summaries,
  manifests, and operator-approved draft data through authenticated HTTP APIs.

## First tablet slice

The companion starts with saved pursuits, pipeline status, solicitation
summaries, deadlines, notes, vendor/partner coordination, and First Impression
drafts. Each screen calls an authenticated HTTP facade over `createAppApi`.
The browser client never imports `api/index.js` directly and never receives
backend credentials or host filesystem paths.

PWA caching is shell-only. Service workers may cache versioned static assets,
but must not cache solicitation source text, draft content, API responses, or
credential-bearing requests. Offline mutation queues are deferred until the
API has tenant-scoped revision IDs and conflict handling.

## Recommended stack (when we start)

- Vite + React + TypeScript (matches the team's existing comfort
  zone and avoids paid SaaS dependencies).
- The same Tailwind / design tokens used by the public site
  (`sourcedeck-site` repo) so the web app inherits the brand.
- The first authenticated tablet screen should be Saved Pursuits backed by
  `api.govcon.opportunities.list()`. Audit-log remains the boundary smoke test.
