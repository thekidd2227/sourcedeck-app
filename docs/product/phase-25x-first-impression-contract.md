# Phase 25X — Make the Right First Impression Contract

## Placement
A focused page **under Proposal Workspace** (`#tab-execution` → card
`#pw-first-impression`), alongside Solicitation Intake, Proposal Sections,
Capability Statement Studio, and Internal Review Export. **Not** a sidebar
item. Shortcuts ("✦ Make First Impression") open it with a solicitation
loaded from:
- a Saved Pursuits Source Materials panel (`gcFiOpenFor(id)`), and
- the Solicitation Workspace intake row (selected solicitation).

## Source selection
1. Saved SAM.gov pursuit (selector `#gc-fi-sol-select`).
2. Pasted solicitation text (`#gc-fi-text`).
3. Fetched SAM.gov description / imported resource text (Phase 25W,
   `gcW25CollectSourceText`).
With no source text: "Fetch/import solicitation source material or paste
solicitation text before generating questions."

## Solicitation timer
Saving a pursuit stores `responseDeadline`, `questionDeadline`,
`siteVisitDeadline`, `userAddedQuestionDeadline`, `savedAt`, `lastRefreshedAt`.
The First Impression page shows advisory timers ("Questions due in X",
"Proposal due in X"), the timezone if stated (else "timezone not stated"), and
"Deadline not found — add manually" when missing. Deadlines are editable and
advisory until verified — SourceDeck never guesses a deadline.

## Clarification questions
"Generate 3 Clarification Questions" produces exactly three questions from the
selected source text, each tied to ambiguity / missing info / risk / SOW gap /
compliance / deadline / deliverable / evaluation factor / submission
requirement, with: question, why it matters, cited source section (or "source
section not identified" — citations are never fabricated), and risk level
(Low/Medium/High). Generation is local/deterministic; "Copy AI Prompt" lets a
user run it through a configured provider.

## COR email
"Draft COR Email" builds a concise email that introduces the configured
company as a prospective bidder, includes the 3 questions, references the
solicitation number/title and place of performance, and notes deadline
awareness. It does not overclaim qualifications, does not claim award
entitlement, and is never sent. Company fields are prefilled from
**Settings → Company Profile** (`sd.govcon.profile.get()`) when available;
otherwise editable placeholders are shown. ARCG appears only as placeholder
demo text — never a hardcoded value.

## Output controls
Clarification Questions + COR Email Draft panels with Copy Questions, Copy
Email, Save Draft Locally, Mark Reviewed, Reset Draft. No Send button. No
auto-email. No outreach queue.

## Safety
Small footer only: "Draft only. SourceDeck does not send email. Verify
solicitation communication rules before contacting the COR." No heavy
"Human Review Required" panel.
