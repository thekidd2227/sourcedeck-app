# Premium Content Agent — Prompt Strategy

## Goal

Define the structured conversation the Premium Content Agent runs with
the user, what it does with the answers, and how it routes evidence
into drafts. This is a **highest paid tier only** SourceDeck feature.

## Onboarding questions the agent must ask

The agent opens every new content session by collecting:

1. **What business are you trying to grow?**
   The agent uses this to set tone, audience, and the 75/25 ratio bias.
2. **What service or product do you want to promote in this session?**
   The agent uses this to weight feature/benefit content toward the
   stated offering.
3. **Do you want to attach documents or links?**
   The agent waits for upload or skips to next question.
4. **Do you want to connect a GitHub, GitLab, or Bitbucket repository?**
   The agent records the URL(s) and, for the planned private-repo
   connector, prompts for authorization.
5. **Who is the audience?**
   Federal buyers, small-business operators, partners, internal team,
   or a specific persona the user describes.
6. **What is the goal of this content?**
   Pick from: **website traffic**, **authority**, **leads**, or
   **trust**. The agent uses this to choose post formats and CTAs.
7. **Which platform — LinkedIn, Facebook, or both?**
   The agent uses this to apply platform-specific guidance and
   hashtag count.
8. **Preferred format — text-only, poll, checklist, document outline,
   or media-supported?**

## What the agent does next

Once the answers are collected, the agent executes the following
sequence:

1. **Analyze attached docs, repositories, and linked URLs.**
   Pull text, extract titles and headings, isolate feature names,
   benefit statements, and use cases. Repository analysis (planned)
   covers README, `docs/`, changelog, package metadata, app routes,
   product copy, and API docs.
2. **Identify features and benefits.**
   Build a working list of features (what it does) and benefits
   (why the user cares).
3. **Suggest content angles.**
   Recommend 3–6 angles per session, each with a one-line rationale
   tying the angle to the user's stated goal and audience.
4. **Draft posts.**
   Produce drafts in the user's chosen platform and format. The
   75/25 ratio is enforced across the working session: 75% feature /
   benefit / service / use-case / credibility / traffic content,
   25% diagnostic / point-of-view / operational-leak content.
5. **Assign hashtags.**
   Use the hashtag schema in `src/content/premiumContentAgent.ts`:
   10–12 hashtags for LinkedIn, 3–6 for Facebook. Blocked hashtags
   never appear in drafts.
6. **Suggest a CTA.**
   Choose a CTA tied to the stated goal — website traffic posts get
   a link CTA, authority posts get a comment-prompt CTA, trust posts
   get a soft-conversation CTA, lead posts get a DM / form CTA.
7. **Mark claim confidence.**
   Every claim in every draft is annotated **verified**, **inferred**,
   or **candidate**. Drafts with **inferred** or **candidate** claims
   require user edit before approval.
8. **Require user approval before scheduling or posting.**
   The agent never schedules or publishes on its own. The repository
   does not currently include any publishing connector code.

## Operating principles

- **Do not fabricate.** If the corpus does not support a claim, the
  agent either omits it or surfaces it as **candidate** with a clear
  warning.
- **Do not flatter.** Drafts should sound like the business, not like
  generic LinkedIn motivation content.
- **Respect platform shape.** LinkedIn drafts are longer, support
  document outlines and polls, and use a denser hashtag set. Facebook
  drafts are shorter, conversational, and use a tighter hashtag set.
- **Respect safety rules.** No secrets, no private code, no
  confidential proposal data, no PII without explicit user approval,
  and a GovCon sensitivity warning before producing posts that touch
  set-aside or source-selection material.
