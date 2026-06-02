# SourceDeck v1 — Known Limitations (for Buyers)

An honest, buyer-facing summary of what SourceDeck v1 does **not** do yet
during the controlled-demo phase. Sharing these up front is part of the
launch discipline.

## 1. The public macOS app is not yet signed/notarized

The local macOS build is unsigned for the controlled demo.
SourceDeck must not be described as "signed and notarized."
A public signed macOS release is a separate, later step that requires real
Apple signing/notarization credentials and a passing strict readiness check.

## 2. watsonx must be verified before any live claim

Managed IBM watsonx is readiness-gated. SourceDeck must not claim watsonx
is live for an environment unless a runtime probe has captured
`verified_ready` evidence for that environment. Until then the honest
status is `not_configured` or `blocked_by_ibm_config`.

## 3. AI may require BYOK or a premium configuration

Standard plans use customer-provided AI keys (BYOK). Premium and
enterprise deployments may include SourceDeck-managed IBM watsonx
configuration or customer-provided AI credentials depending on workflow
risk, usage volume, and deployment requirements. AI usage is not
unlimited; usage limits, overages, or enterprise deployment terms may
apply.

## 4. No autonomous sending or submission

SourceDeck prepares drafts. It does not auto-send and does not auto-submit.
It does not send outreach automatically and does not submit proposals
automatically.

## 5. No Guarantee of Awards, Revenue, or Compliance

SourceDeck does not guarantee contracts, awards, or revenue.
It does not provide and must not claim any HIPAA / FedRAMP / SOC 2 / CMMC / HITRUST / ISO / government-compliance certification.
It is not a substitute for legal, contracting, or security review.

## 6. Human approval remains required

A human reviewer must approve before sending, publishing, proposal use,
pricing decisions, compliance decisions, teaming decisions, or bid/no-bid
decisions. AI-assisted outputs are drafts for human review.

## 7. Release-candidate software

SourceDeck v1 is release-candidate software for a controlled buyer demo.
New feature work is frozen after the RC lock; only critical fixes, claim
cleanup, documentation correction, evidence updates, and release-blocker
remediation are in scope.
