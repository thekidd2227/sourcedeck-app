# Final Commercial Smoke Checklist

This document is the operator-facing pre-demo and demo-day checklist for SourceDeck.
It is intentionally prescriptive: every gate below must be observed in order, and
no step may be improvised live in front of a buyer.

## 1. Purpose

The purpose of this checklist is to give the operator a single, copy-pasteable
sequence of verification steps to run before any commercial demo, pilot kickoff,
or buyer-facing screen share. It encodes:

- The exact commands that must pass before the demo starts.
- The exact claims the operator MAY make about SourceDeck.
- The exact claims that are forbidden until the underlying evidence ships.
- The human-approval invariant that governs every outbound surface.

If any gate in this document fails, the demo does not proceed in its planned form.
The operator falls back to the documented talk track in Section 16 and reschedules
the live walk-through. There is no "we'll wing it" path here.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically. This
invariant is restated in every relevant section below because it is the single
most important commercial guardrail in the product.

## 2. Pre-demo environment checklist

Run through this list on the exact machine that will be screen-shared. Do not
assume a previously-clean machine is still clean.

- [ ] `main` branch is checked out and up to date with `origin/main`.
- [ ] `git status --short` shows no uncommitted edits and no untracked files in
  tracked directories.
- [ ] Node version matches the version pinned in the repo's tooling files
  (verify with `node -v` and compare against the project's documented version).
- [ ] No `.env`, `.env.local`, `.env.production`, or any credential file is open
  in any editor window that could be alt-tabbed or accidentally shown.
- [ ] No terminal scroll-back contains pasted credential values, tokens, or keys.
  Clear scroll-back before the demo if in doubt.
- [ ] No real provider keys are present on the demo machine unless the demo
  explicitly covers a configured-provider flow. The default demo posture is
  "no real keys, SAFE-AI fallback language on screen."
- [ ] Screen-share preview confirms no password manager, no Slack DMs, no email
  notifications, and no secret-bearing browser tabs are visible.
- [ ] Notifications (system, Slack, mail, calendar) are silenced or set to Do Not
  Disturb.

If any item above fails, fix it before continuing. Do not start Section 3 until
the environment is clean.

## 3. Required commands before demo

Run these EXACTLY in this order. Do not reorder, do not skip, do not run them in
parallel. After each command, confirm the expected pass signal before moving on.
If any command fails, stop the demo prep immediately, run the troubleshooting
scan, capture the report, and do not improvise. Reschedule if needed.

1. `git checkout main && git pull origin main`
   - Expected pass signal: working tree on `main`, fast-forward or
     "Already up to date." message, no merge conflicts.
   - On failure: stop. Do not force-pull. Resolve via the documented branch
     hygiene process. Do not improvise. Reschedule if needed.

2. `git status --short`
   - Expected pass signal: empty output (no modified, no untracked).
   - On failure: stop. Determine whether stray files contain secrets or
     experimental code. Do not stash blindly. Run the troubleshooting scan.
     Do not improvise.

3. `npm test`
   - Expected pass signal: all suites pass, non-zero exit code is absent, no
     red output at end of run.
   - On failure: stop. Capture the failing test name and output. Run the
     troubleshooting scan. Do not improvise live; reschedule if needed.

4. `npm run release:evidence`
   - Expected pass signal: command exits zero and produces the local evidence
     artifact with state `packaged_unsigned` (or `local_unsigned_dev` if no
     dist artifact is produced on this machine).
   - On failure: stop. Capture the report. Run the troubleshooting scan. Do
     not improvise the release story; fall back to the talk track in
     Section 16.

5. `npm run troubleshooting:scan`
   - Expected pass signal: human-readable scan output with no critical or
     high-severity FAIL entries; PASS / WARN / MANUAL items are documented.
   - On failure: stop. Critical or high failures abort the demo. Capture the
     scan output and follow the troubleshooting knowledge base.

6. `npm run troubleshooting:scan:json`
   - Expected pass signal: JSON output is well-formed and matches the
     human-readable scan from step 5.
   - On failure: stop. Treat as a tooling regression. Do not improvise.

7. `npm run troubleshooting:email-dry-run`
   - Expected pass signal: dry-run completes, no real email is sent, the
     rendered preview matches expectations.
   - On failure: stop. Do not flip the dry-run off to "see what happens."
     Run the troubleshooting scan and escalate.

8. `npm run govcon:smoke`
   - Expected pass signal: GovCon smoke routine completes without error and
     emits the documented end-of-run summary.
   - On failure: stop. Do not demo the GovCon pipeline. Reschedule if the
     GovCon flow is the demo's headline.

9. `npm run govcon:outreach-os:audit`
   - Expected pass signal: audit completes, all human-approval gates are
     reported present, no outbound action is reported as automatic.
   - On failure: stop. The outreach gate failure is a blocker. Do not demo
     outreach until resolved.

10. `npm run phase13:rc-check`
    - Expected pass signal: release-candidate check exits zero and reports
      the expected phase markers.
    - On failure: stop. Capture the report. Do not improvise the readiness
      narrative.

11. `npm run i18n:audit`
    - Expected pass signal: i18n audit reports no missing required keys for
      shipped locales.
    - On failure: stop if the demo involves localized surfaces; otherwise
      capture the report and note the gap in the post-demo follow-up.

12. `node scripts/release-check.js`
    - Expected pass signal: release-check exits zero and reports the
      expected state for this build. If `release:evidence:strict` is part of
      the chain and it correctly blocks public release until signing-ready,
      that is the documented and intended behavior, not a failure of the
      demo.
    - On failure (other than the documented strict-block behavior): stop.
      Capture the report. Run the troubleshooting scan. Do not improvise.

Universal rule for this section: if anything fails, stop the demo, run the
troubleshooting scan, capture the output, and do not improvise.

## 4. Safe demo claims

The operator MAY say the following on a live demo. These are all consistent with
the shipping product and documented evidence.

- SourceDeck organizes the GovCon pipeline (opportunities, partners, content,
  outreach) inside a single operator surface.
- SourceDeck captures and stores the company capability statement and reuses
  it across downstream surfaces.
- SourceDeck drafts outreach for human approval. The operator reviews and
  approves every message before anything is sent.
- SourceDeck surfaces SAM.gov and opportunity context for the operator to
  triage; intake is operator-driven.
- SourceDeck runs a troubleshooting scan on demand and emits PASS / WARN /
  MANUAL / FAIL signals the operator can act on.
- SourceDeck captures release evidence locally and reports the current
  packaging state of the build.
- SourceDeck enforces documented human-approval gates across outreach,
  proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending.
- SourceDeck enforces a credential boundary: provider keys live in the main
  process and are never exposed to the renderer or to a screen share.

## 5. Forbidden claims

The following claims are forbidden on every demo, in every pitch deck, and in
every written buyer communication, until and unless the underlying evidence
ships and is independently verified. Read each one as "do not say":

- Do not say "FedRAMP."
- Do not say "SOC 2" or "SOC2."
- Do not say "CMMC."
- Do not say "HIPAA."
- Do not say "HITRUST."
- Do not say "ISO 27001."
- Do not say "government compliant."
- Do not say "government compliance."
- Do not say "guaranteed contract."
- Do not say "guaranteed award."
- Do not say "guaranteed revenue."
- Do not say "unlimited AI."
- Do not say "watsonx live."
- Do not say "IBM watsonx live."
- Do not say "IBM watsonx included" as a present-tense capability of the
  shipping product.
- Do not say "SourceDeck is signed."
- Do not say "SourceDeck is notarized."
- Do not say "signed and notarized."
- Do not say "auto-send."
- Do not say "auto-submit."
- Do not say "submits proposals automatically."

If a buyer asks about any of these directly, the operator answers honestly using
the talk track in Sections 11, 12, and 14, and the failure-handling guidance in
Section 16.

## 6. First-run operator setup

When a new operator launches SourceDeck for the first time, the flow is:

1. First-launch screen explains the credential boundary in plain language: keys
   live in the main process, never in the renderer, never in a screen share.
2. The GovCon operating profile wizard collects identity, NAICS, capability
   statement, certifications, and contact preferences. The wizard saves to a
   profile file owned by the main process.
3. The wizard prompts for AI provider configuration. The default is
   customer-provided AI keys. Keys are pasted into a main-process credential
   prompt; they are not echoed into the renderer, not written to logs, and not
   shown on a screen share.
4. The operator confirms the profile, reloads the app, and verifies the profile
   surfaces correctly in the GovCon home view.

Operator hygiene rule: never paste keys into a renderer field, a chat window,
a screen share, a terminal that is currently being shared, or a document that
is open in a shared editor. The credential boundary depends on the operator
respecting it.

## 7. GovCon profile setup smoke

Happy path:

- [ ] Launch the GovCon operating profile wizard from the first-run flow.
- [ ] Fill identity, NAICS codes, capability statement, certifications, and
  contact preferences with demo-safe values.
- [ ] Save and confirm the success state.
- [ ] Reload the app and confirm the saved profile loads in the home view.

Failure handling:

- [ ] Attempt to save with a required field missing. Confirm the wizard blocks
  save and surfaces a clear error.
- [ ] Attempt to load a malformed profile file. Confirm the app surfaces a
  clear error and does not silently overwrite the malformed file.

If either failure-handling case does not behave as documented, stop. Do not
demo profile setup until the regression is captured and resolved.

## 8. SAM.gov / opportunity workflow smoke

- [ ] Use a fixture opportunity (not a live scrape) to walk through intake.
- [ ] Confirm the opportunity surfaces in the operator view with the expected
  fields (title, agency, NAICS, due date, summary).
- [ ] Walk the operator through triage: review, annotate, route to the next
  stage.
- [ ] Before any outbound action, show the human-approval gate explicitly.
  Click into the approval surface, point at the "review and approve" control,
  and explain that nothing is sent automatically.

Do not run a live SAM.gov scrape during a demo. Live external calls during a
demo introduce network risk and rate-limit risk that have nothing to do with
the value being demonstrated.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

## 9. Prime partner finder smoke

- [ ] Open the prime partner finder surface.
- [ ] Run a fixture-backed find or filter query (NAICS, set-aside, geography).
- [ ] Open a partner record and walk the operator through the partner profile.
- [ ] Explicitly clarify on screen that nothing is sent to the partner
  automatically. Any outbound contact requires the operator to review and
  approve a drafted message in the outreach surface.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

## 10. Premium content agent smoke

- [ ] Open the premium content agent.
- [ ] Generate a sample piece (capability blurb, partner outreach draft, or
  proposal section).
- [ ] If no provider key is configured on this machine, the agent returns the
  SAFE-AI fallback language documented in Section 11. Read that fallback aloud
  on the demo; do not improvise an alternative.
- [ ] Show the human-approval gate before publish. Click into the approval
  surface and confirm the operator must review, edit, and approve the content
  before it is published or sent.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

## 11. AI provider readiness smoke

Use the SAFE-AI verbatim language when describing AI provisioning to any buyer.
Read it as written:

"Standard plans use customer-provided AI keys. Premium and enterprise
deployments may include SourceDeck-managed IBM watsonx configuration or
customer-provided AI credentials depending on workflow risk, usage volume, and
deployment requirements. Usage limits, overages, or enterprise deployment
terms may apply."

Smoke steps:

- [ ] Open the AI provider readiness surface.
- [ ] Confirm the surface reports the current provider configuration state
  honestly (configured, not configured, or fallback).
- [ ] If no provider is configured, confirm the SAFE-AI fallback language
  appears in the user-facing copy.
- [ ] Explain to the buyer that standard plans default to customer-provided
  keys and that premium and enterprise deployments may include SourceDeck-
  managed IBM watsonx configuration or customer-provided AI credentials,
  depending on workflow risk, usage volume, and deployment requirements.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

## 12. watsonx status handling

On a demo, the operator describes watsonx using only the fields the readiness
diagnostic emits: `status` and `statusReason`. Read those values aloud and stop.

Do not claim watsonx is live unless the watsonx-readiness diagnostic reports
`verified_ready` AND Phase 18A has merged evidence. Until both conditions hold,
the truthful posture is "watsonx integration is in progress; current diagnostic
reports `status` = X with `statusReason` = Y."

The forbidden claims list in Section 5 includes "watsonx live," "IBM watsonx
live," and "IBM watsonx included" as a present-tense capability of the shipping
product. Those remain forbidden until the diagnostic and Phase 18A evidence
support them.

## 13. Troubleshooting scan smoke

Run `npm run troubleshooting:scan` and read the result categories exactly as
the agent emits them:

- `PASS`: the check passed. Move on.
- `WARN`: the check found a non-blocking concern. Capture it for follow-up.
  Do not pretend it is a PASS on the demo.
- `MANUAL`: the check requires human review. Note that the operator will
  follow up after the demo. Do not skip it silently.
- `FAIL`: the check failed. If the severity is critical or high, the demo is
  aborted. Capture the report, follow the troubleshooting knowledge base, and
  do not improvise.

Run `npm run troubleshooting:scan:json` immediately after the human-readable
run to confirm both representations agree.

## 14. Release evidence smoke

Run `npm run release:evidence`. The local state on the demo machine is
expected to be one of:

- `packaged_unsigned`: a local dist artifact was produced and is unsigned.
- `local_unsigned_dev`: no dist artifact was produced; the local build is
  unsigned dev only.

Explain to the buyer, in plain language, that `release:evidence:strict`
correctly blocks public release until the build is signing-ready. This is by
design. It is not a bug, it is not a regression, and it is not a reason to
ship around the gate. The strict gate exists so that the public release never
goes out unsigned.

Do not say "SourceDeck is signed," "SourceDeck is notarized," or "signed and
notarized" until real Apple signing credentials are in place and a notarized
artifact has been produced and verified. Those strings are forbidden until
then (see Section 5).

## 15. Human approval gates smoke

Walk the operator through the documented human-approval gates and confirm each
one is present in the UI:

- [ ] Outreach: drafted message requires explicit approval before send.
- [ ] Proposal: drafted proposal requires explicit approval before send or
  publish.
- [ ] Pricing: pricing decisions require explicit approval before they are
  shared externally.
- [ ] Compliance: compliance posture changes require explicit approval.
- [ ] Bid / no-bid: bid decisions require explicit approval.
- [ ] Teaming: teaming arrangements require explicit approval.
- [ ] Publishing: any content publish requires explicit approval.
- [ ] Sending: any outbound send requires explicit approval.

Human approval remains required for outreach, proposal, pricing, compliance,
bid/no-bid, teaming, publishing, and sending. Nothing is sent automatically.

If any gate is missing in the UI, stop. Do not demo that surface. Capture the
gap in the troubleshooting report and escalate.

## 16. Failure handling

If any required gate in Sections 3, 7-15 fails:

- Capture the full report (human-readable plus JSON where applicable).
- Do not improvise the demo. The buyer's trust depends on the operator
  saying only what is true today.
- Do not paste raw environment files, raw scan output containing paths, or
  any artifact that might contain credential values into a chat window or
  screen share.
- Escalate per the troubleshooting knowledge base. Reschedule the demo if the
  failure blocks the headline flow.
- Fall back to the documented talk track: explain that SourceDeck enforces a
  strict pre-demo gate, that the gate just caught something, and that the
  team will rerun the demo once the gate is green. Buyers respect a team
  that respects its own guardrails.

## 17. Final go / no-go checklist

Tick through this list immediately before screen share. If any item is not
checked, the demo does not start.

- [ ] `main` is checked out, clean, and up to date.
- [ ] `git status --short` is empty.
- [ ] `npm test` is green.
- [ ] `npm run release:evidence` produced the expected local state
  (`packaged_unsigned` or `local_unsigned_dev`).
- [ ] `npm run troubleshooting:scan` shows no critical or high FAIL entries.
- [ ] `npm run troubleshooting:scan:json` agrees with the human-readable scan.
- [ ] `npm run troubleshooting:email-dry-run` completed cleanly with no real
  send.
- [ ] `npm run govcon:smoke` completed cleanly.
- [ ] `npm run govcon:outreach-os:audit` reports all human-approval gates
  present.
- [ ] `npm run phase13:rc-check` is green.
- [ ] `npm run i18n:audit` is green for the locales in scope.
- [ ] `node scripts/release-check.js` is green (or correctly blocked by the
  documented strict-release behavior).
- [ ] No real provider keys are present on the demo machine, unless the demo
  explicitly covers a configured-provider flow.
- [ ] No forbidden claim from Section 5 is rehearsed in the talk track.
- [ ] The SAFE-AI verbatim language from Section 11 is ready to read aloud.
- [ ] The human-approval invariant is ready to state on every outreach,
  proposal, pricing, compliance, bid/no-bid, teaming, publishing, and sending
  surface.
- [ ] The fallback talk track from Section 16 is ready in case any gate flips
  mid-demo.
- [ ] The next step (pilot scope, follow-up call, written summary) is
  prepared and ready to propose at the end of the demo.
