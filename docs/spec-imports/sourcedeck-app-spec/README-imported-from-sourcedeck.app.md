# sourcedeck.app

Product surface for premium SourceDeck features. This repository
currently defines the **SourceDeck Premium Content Agent** — a
highest-tier, watsonx-powered (planned) AI content strategist for
LinkedIn and Facebook.

## Docs

- [docs/premium-content-agent.md](docs/premium-content-agent.md)
- [docs/premium-content-agent-ingestion.md](docs/premium-content-agent-ingestion.md)
- [docs/premium-content-agent-prompt-strategy.md](docs/premium-content-agent-prompt-strategy.md)
- [docs/examples/premium-content-agent-examples.md](docs/examples/premium-content-agent-examples.md)
- [docs/workspace-readiness-banners.md](docs/workspace-readiness-banners.md)
- [docs/tiering-notes.md](docs/tiering-notes.md)

## Audit

```
npm run content-agent:audit
```

Runs the structural audit defined in
[`scripts/audit-premium-content-agent.mjs`](scripts/audit-premium-content-agent.mjs).
Exits non-zero on any violation.

## Status of integrations

- **watsonx** — planned premium architecture. No watsonx integration
  ships in this repository today.
- **Repository ingestion (GitHub / GitLab / Bitbucket)** — public-URL
  ingestion is in scope; private-repo connectors are planned and
  require auth. No live ingestion exists in this repository today.
- **Auto-posting** — not supported. The agent drafts and recommends;
  the user approves before publishing.
- **Workspace readiness banners** — defined as a product/spec surface in
  `src/content/workspaceReadinessBanner.ts`. No live dashboard,
  integration health service, or backend readiness endpoint ships in
  this repository today.
