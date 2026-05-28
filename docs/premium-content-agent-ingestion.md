# Premium Content Agent — Ingestion

## Purpose

This document defines what the Premium Content Agent can ingest, how
the agent classifies what it finds, and the safety rules that apply
before any ingested evidence becomes a published post. The Premium
Content Agent is a **highest paid tier only** SourceDeck feature.

Where this document refers to a feature as **planned**, the
corresponding code does not yet exist in this repository.

## Supported input types

The agent accepts the following content sources from the user:

- PDF documents
- Microsoft Word documents (.docx)
- Markdown and plain-text files
- CSV files (e.g., service menus, price sheets, pipeline exports)
- Slide decks (.pptx and exported PDF decks)
- Capability statements
- Standard Operating Procedures (SOPs) and internal playbooks
- Product documentation
- Proposal documents (the user is expected to redact CUI/PII first)
- Public website URLs and landing pages
- Public documentation pages
- Changelogs and release notes
- README files
- API documentation
- Repository URLs on **GitHub**, **GitLab**, and **Bitbucket**

## Repository ingestion surface area (planned)

When the user links a public repository on GitHub, GitLab, or
Bitbucket — or, in the planned private-repo connector, authorizes a
private repo — the agent's planned analysis surface includes:

- README and top-level project description
- The `docs/` directory and any in-repo product copy
- CHANGELOG or release-notes files
- `package.json`, `pyproject.toml`, or other package metadata for
  product name, description, and dependency posture
- App routes / page titles / feature names that imply user-visible
  capabilities
- Marketing copy embedded in landing pages or `app/` routes
- Public API documentation
- Screenshots and visual assets in `docs/` or `public/`, when present
- Roadmap / issue exports, only when the user explicitly connects them
- Release notes and tagged releases

This ingestion is planned. The current repository ships the spec only.
The Premium Content Agent will not fabricate repository analysis
results; if a repo is not connected and analyzed, no repo-derived
claims are produced.

## Content mapping (evidence → post type)

| Evidence the agent finds                            | Recommended post type                          |
|-----------------------------------------------------|------------------------------------------------|
| README headline + benefit bullets                   | LinkedIn `text_authority`, Facebook `service_education` |
| Changelog / release notes                           | LinkedIn `product_feature_spotlight`, `build_in_public`  |
| Capability statement                                | LinkedIn `document_pdf_outline`, `govcon_authority`      |
| Service menu / pricing sheet                        | Facebook `service_education`, LinkedIn `service_explainer` |
| Website landing copy + CTA                          | LinkedIn `website_cta`, Facebook `website_cta`           |
| Pipeline-bottleneck observation                     | LinkedIn `pipeline_lesson`, `poll`                       |
| Operational SOP                                     | LinkedIn `operational_lesson`, Facebook `business_tip`   |
| Founder / owner narrative                           | LinkedIn `founder_note`, Facebook `owner_update`         |
| Customer problem → solution pattern in proposal     | LinkedIn `govcon_authority`, Facebook `customer_problem_solution` |
| API documentation                                   | LinkedIn `product_feature_spotlight`, `build_in_public` |

## watsonx role

watsonx (planned premium architecture) is the intended model provider
for the agent's analysis and drafting tasks:

- Summarize attached documents and linked URLs.
- Detect product features, benefits, and target users.
- Classify claims as **verified**, **inferred**, or **candidate**.
- Suggest content angles aligned with the user's goal.
- Produce post drafts at the requested length and tone.
- Flag unsupported claims and suggest a softer phrasing.
- Recommend hashtags from the schema in the spec module.
- Recommend call-to-action lines tied to the user's stated goal.

## Claim levels

Every claim the agent produces is labeled with one of:

- **verified** — the claim is directly supported by an attached
  document, linked page, or repository file the user owns.
- **inferred** — the claim is a reasonable interpretation of the
  evidence but is not stated directly; the user must confirm before
  publishing.
- **candidate** — the claim is plausible based on the user's industry
  and stated business posture, but no evidence in the corpus directly
  supports it; the user must edit or remove it before publishing.

Drafts with **inferred** or **candidate** claims are surfaced to the
user with each such claim flagged inline.

## Human approval required

The Premium Content Agent does not auto-post. Every draft must pass
through user approval before it can be scheduled or published. This
repository does not currently ship any publishing connector that would
contradict that policy; the approval gate is the only path.

## Security

- **No secrets**: tokens, API keys, environment variables, credential
  literals, and account IDs are stripped from ingested content before
  the agent reasons over it and are never included in a draft.
- **No private code**: even when a private repository is connected,
  source code is not published verbatim. Only summarized,
  user-approved derivative content (feature names, benefit phrasing)
  may appear in a draft.
- **No confidential proposal data**: proposal narrative is treated as
  capability evidence, not as quotable text; pricing, evaluation
  criteria, and customer-named sections are excluded from drafts
  unless the user explicitly opts in.
- **Token redaction**: any string that looks like a token, JWT, signed
  URL, or `Authorization` header value is redacted before drafting.
- **No PII by default**: customer names, employee names, contact
  details, and account numbers are stripped unless the user explicitly
  approves the named context for a specific draft.
- **GovCon sensitivity warning**: when ingested evidence includes
  set-aside posture, source-selection language, CUI markings, or
  contract-vehicle-sensitive content, the agent warns the user before
  generating any draft and requires explicit opt-in to continue.
