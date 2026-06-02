# SourceDeck v1 — Buyer Handoff

A plain-language guide for a buyer evaluating SourceDeck in a controlled
demo. SourceDeck is RC-ready for a controlled buyer demo.

## What SourceDeck does

SourceDeck is an AI-assisted desktop workspace that helps a team organize
lead generation and government-contracting (GovCon) pursuit work. It helps
you capture opportunities, organize a pipeline, draft outreach and
proposal material, and keep pursuit information in one place. AI-assisted
outputs are **drafts** for a human to review.

## Who it is for

Small-to-midsize teams pursuing commercial leads and/or government
contracts who want help organizing pursuit work and preparing drafts —
with a human reviewer in control of every external action.

## What it helps organize

- Opportunity capture and a pursuit pipeline.
- Draft outreach and draft proposal/capability material.
- GovCon pursuit context (deadlines, solicitation notes, teaming notes).
- Pricing/positioning **drafts** for human decision.

## What it does not do

- It does not send outreach automatically. There is no auto-send.
- It does not submit proposals automatically. There is no auto-submit.
- It does not make bid/no-bid, teaming, pricing, or compliance decisions
  for you — those require human approval.
- It does not guarantee contracts, awards, or revenue.
- It does not provide a compliance certification and is not a substitute
  for legal, contracting, or security review.

## AI provider options

- **Standard plans use customer-provided AI keys** (bring-your-own-key /
  BYOK). You supply your own AI provider credentials.
- **Premium and enterprise deployments may include SourceDeck-managed IBM
  watsonx configuration or customer-provided AI credentials depending on
  workflow risk, usage volume, and deployment requirements.** Managed IBM
  watsonx is scoped per deployment and is enabled only after a runtime
  readiness check passes for that environment.
- Usage limits, overages, or enterprise deployment terms may apply. AI
  usage is not unlimited.

## Human approval model

Human approval is required before sending, publishing, proposal use,
pricing decisions, compliance decisions, teaming decisions, or bid/no-bid
decisions. SourceDeck prepares drafts; a person reviews and approves
before anything external happens.

## Known limitations

See `sourceDeck-v1-known-limitations-for-buyers.md`. In brief: the public
macOS app is not yet signed/notarized; managed IBM watsonx requires a
verified runtime readiness check before it is described as live for an
environment; AI may require BYOK or a premium configuration; there is no
autonomous sending/submission; and there are no guaranteed
awards/revenue/compliance outcomes.

## Support contact path

For evaluation support during a controlled demo, route questions through
your SourceDeck demo operator. Operators follow the internal support
handoff (`sourceDeck-v1-internal-support-handoff.md`) and can run the
built-in diagnostics to confirm readiness and surface any issues.
