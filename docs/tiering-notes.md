# Tiering Notes — Premium Content Agent

This repository does not currently ship a pricing or tier
configuration. Until it does, the following tier policy applies to
the Premium Content Agent and is the authoritative gating reference.

## Tier matrix

| Tier               | Premium Content Agent access                            |
|--------------------|---------------------------------------------------------|
| **Free**           | Not available. No Premium Content Agent.                |
| **Basic / Starter / Core** | Not available. No Premium Content Agent.        |
| **Pro**            | Full access is not included. Pro may include limited teaser templates only if an upsell preview is explicitly approved later. |
| **Operator / Enterprise** | Full Premium Content Agent access, subject to entitlement configuration: document upload, public repository / URL ingestion, future private repo connectors, watsonx-powered analysis as planned premium architecture, claim-confidence labeling, 75/25 content strategy, hashtag/schema support, and user-approval workflow. |
| **Government**     | Full access only if explicitly entitled; all governed and audit-sensitive workflows remain watsonx-only. |

## Public Tier Mapping

Public website tier names map to internal policy tiers as follows:

| Public tier | Internal policy tier |
|-------------|----------------------|
| **Core** | `starter` |
| **Pro** | `pro` |
| **Operator** | `business` |
| **Enterprise** | `enterprise` |
| **Government** | `government` |

Premium Content Agent full access is available only on
Operator / Enterprise-level plans, subject to entitlement configuration.
If final pricing later makes Enterprise the only highest commercial
tier, the full agent should be documented and wired to Enterprise only.
Core and Pro do not include the full agent.

## Rationale

The Premium Content Agent is reserved for the **highest paid tier**
because it (a) consumes the user's most sensitive content sources —
capability statements, proposal narrative, code, internal docs — and
therefore needs the strongest customer-trust posture SourceDeck
offers, (b) is intended to run on watsonx-class infrastructure whose
unit economics make a top-tier price the only sustainable home for
it, and (c) is a force-multiplier for the rest of the SourceDeck
premium capture surface (GovCon pipeline, capture, vendor tracking,
proposal operations) and is only useful once a customer has loaded
real business evidence into the platform.

Once a pricing config is added to this repository, the highest-tier
entry in that config is the only standard commercial tier the Premium
Content Agent should be wired to. It drafts and recommends content from
approved business evidence; the user reviews and approves before
anything is scheduled or published.
