# SourceDeck Premium Content Agent

A watsonx-powered AI content strategist that turns the user's own documents,
linked repositories, websites, product pages, and pipeline activity into
LinkedIn and Facebook posts that build authority, traffic, and sales
conversations.

## Tier

**Highest-tier only.** Premium Content Agent full access is available
only on Operator / Enterprise-level plans, subject to entitlement
configuration. It is not available on Free, Basic, Starter, Core, or
normal Pro tiers. Pro may include limited teaser templates only if an
upsell preview is explicitly approved later.

## Public Tier Mapping

Public website tier names map to internal policy tiers as follows:

| Public tier | Internal policy tier |
|-------------|----------------------|
| **Core** | `starter` |
| **Pro** | `pro` |
| **Operator** | `business` |
| **Enterprise** | `enterprise` |
| **Government** | `government` |

If final pricing later makes Enterprise the only highest commercial
tier, the full Premium Content Agent should be documented and wired to
Enterprise only.

## Core idea

Most small businesses and GovCon shops sit on a pile of credibility
material — capability statements, proposal narrative, product copy,
release notes, README files, customer-facing decks, service menus — that
never reaches LinkedIn or Facebook in a useful form. The Premium Content
Agent ingests that material, identifies what is genuinely true about the
business, and recommends post formats that match a goal the user states
up front (authority, leads, traffic, trust).

It is an explicit decision-support agent: it **drafts and recommends**,
the user **approves before publishing**. Nothing is auto-posted by this
feature in the current codebase.

## Required GovCon positioning

Use this as the base positioning sentence for GovCon content drafts and
marketing prompts:

> SourceDeck helps small businesses organize GovCon pursuit workflows,
> prepare review-ready outreach/content, and manage capture activity
> with human approval at every decision point.

The sentence may be shortened for platform length, but it must preserve
the same meaning: workflow organization, review-ready drafts, capture
activity management, and human approval at every decision point.

## Supported platforms

- **LinkedIn**
- **Facebook**

## Powered by watsonx (planned premium architecture)

watsonx is the planned model provider for the Premium Content Agent.
This repository does not yet contain a watsonx integration; watsonx is
referenced here as the intended premium architecture. The spec module
in `src/content/premiumContentAgent.ts` records this intent so the
implementation phase can wire it in without ambiguity.

Governed and audit-sensitive workflows remain watsonx-only. Optional
OpenAI, Anthropic, Google, or BYOK language applies only to low-risk
drafting workflows where the tier policy and tenant policy permit it.

## Context sources the agent can attach or connect

- Uploaded documents (PDF, Word, markdown, plain text)
- Uploaded decks and slide files
- Capability statements
- SOPs and internal playbooks
- Service menus / pricing sheets
- Product documentation
- Proposal documents (with user redaction)
- Release notes and changelogs
- README files
- API documentation
- Public website URLs and landing pages
- Linked repositories on GitHub, GitLab, and Bitbucket
  (public-URL ingestion in scope; private-repo connectors are planned)
- SourceDeck business profile, services, pipeline activity,
  opportunities, vendors, and proposal workflow records

## What the agent analyzes

- Feature names, product capabilities, and supported workflows
- Stated benefits and outcomes
- Differentiators and risk-reduction claims
- Customer types served
- GovCon set-asides, NAICS, and PSC alignment
- Operational lessons surfaced in pipeline activity
- Release-note signals (what's new, what's improved)
- Content the user has already published (to avoid repetition)

## What the agent generates

- GovCon post drafts that use the required positioning sentence as the
  base message, adapted only for platform length.
- LinkedIn text-only authority posts
- LinkedIn polls
- LinkedIn document / PDF outlines (carousel-style narrative)
- LinkedIn product-feature spotlights
- LinkedIn service explainers
- LinkedIn GovCon credibility posts
- LinkedIn pipeline-lesson posts
- LinkedIn website-CTA posts
- LinkedIn founder / owner notes
- LinkedIn operational-lesson posts
- LinkedIn build-in-public updates
- Facebook service-education posts
- Facebook community-trust posts
- Facebook owner update posts
- Facebook project update posts
- Facebook customer-problem / solution posts
- Facebook business-tip posts
- Facebook website-CTA posts
- Facebook soft-offer posts

## 75 / 25 content strategy

- **75%** feature, benefit, service, use-case, credibility, and
  website-traffic content. This is the working bias of the Premium
  Content Agent: most posts should make the business easier to buy.
- **25%** diagnostic, point-of-view, operational-leak, and bottleneck
  content. This is the credibility lever: it earns trust by naming
  problems the audience recognizes.

The agent enforces this ratio when it recommends a content calendar.

## Approval workflow

User approval is required before any post is scheduled or published.
The agent does not auto-post. The Premium Content Agent surface in this
repo is currently spec + documentation; no auto-publish code path
exists in this repository.

For GovCon content, the workflow language must keep the required
positioning intact: SourceDeck organizes pursuit workflows, prepares
review-ready outreach/content, and manages capture activity with human
approval at every decision point.

TikTok and YouTube live scheduling should not be claimed unless a
supported publishing connector is implemented. If those platforms are
referenced, describe them as content preparation or manual-post
fallback only.

## Safety rules

- Never publish secrets, tokens, or credentials of any kind.
- Never publish private repository code directly.
- Never publish confidential proposal material.
- Redact tokens, internal URLs, and account IDs before producing drafts.
- Do not publish PII without explicit user approval.
- Warn the user before producing posts that reference sensitive GovCon
  content (set-aside protests, source selection, CUI-adjacent details).
- Do not claim compliance, security certifications, or customer
  references that the user has not verified.
- Do not claim SourceDeck wins contracts, guarantees awards, guarantees
  revenue, guarantees compliance, or guarantees outreach success.
- Do not claim auto-send, auto-post, or autonomous GovCon
  decision-making.
- Mark every claim in a draft as **verified**, **inferred**, or
  **candidate** so the user can correct inference before publishing.

## GovCon post prompt rules

- Start from this base sentence when drafting GovCon posts:
  "SourceDeck helps small businesses organize GovCon pursuit workflows,
  prepare review-ready outreach/content, and manage capture activity
  with human approval at every decision point."
- Adapt for LinkedIn, Facebook, Instagram, TikTok, and Meta Business
  Suite length only when needed.
- Keep every output draft-only and review-ready.
- Do not imply SourceDeck makes final bid/no-bid, outreach, pricing,
  compliance, proposal, teaming, or award decisions.
- Do not claim SourceDeck wins work or guarantees any outcome.

## Example GovCon content prompts

- Draft a LinkedIn post using the required positioning sentence as the
  opening idea for small-business GovCon operators evaluating capture
  workflow discipline.
- Draft a Facebook post that explains how SourceDeck helps a contractor
  organize pursuit activity and prepare review-ready outreach/content,
  with human approval before any public post or outreach action.
- Draft a short Meta Business Suite caption that preserves the required
  positioning while trimming only for platform length.

## Premium gating rationale

The Premium Content Agent is gated to the highest paid tier because:

1. It consumes the user's most sensitive content sources (proposals,
   capability statements, code, internal docs) and therefore demands
   the strongest customer-trust posture SourceDeck offers.
2. watsonx-class analysis is the planned model provider, with cost,
   latency, and governance characteristics that justify a top-tier price.
3. It is a force-multiplier for the rest of the SourceDeck premium
   surface (GovCon pipeline, capture, vendor tracking, proposal
   operations) and is only useful once a customer is committed enough
   to load real evidence into the platform.
