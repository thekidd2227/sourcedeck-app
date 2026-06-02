# SourceDeck v1.0 Commercial Readiness Audit

> Read-only audit. This document is the entry point for a small set of
> follow-on artifacts (buyer demo script, operator runbook, commercial smoke
> checklist, buyer one-pager, commercial-readiness release note). It does not
> modify any code, configuration, or product surface.

## Purpose

This audit answers a single question: **is SourceDeck v1.0 commercially
demonstrable today, and what must still be produced before a buyer-facing
demo?** It inventories the documentation, capability surface, and gating
checks that currently exist on `main @ cf224a3`, then names exactly what is
missing, what must not be claimed, and which blockers remain open.

The audit is scoped to commercial readiness — the ability to walk a buyer
through SourceDeck safely, truthfully, and reproducibly. It is not a
security certification, not a compliance attestation, and not a release
sign-off.

Human approval remains required for outreach, proposal, pricing,
compliance, bid/no-bid, teaming, publishing, and sending. Nothing is sent
automatically.

## Methodology

This audit is a **read-only inspection**. No source file, configuration
file, or shipped artifact was modified during its production. Specifically,
the following were read for grounding and not edited:

- `docs/` tree (all subdirectories enumerated in the next section)
- `README.md`
- `package.json`
- `sourcedeck.html`

The audit also references the following **baseline gates**, all of which
currently pass on `main @ cf224a3`:

- `npm test`
- `release:evidence`
- `troubleshooting:scan`
- `troubleshooting:email-dry-run`
- `govcon:smoke`
- `govcon:outreach-os:audit`
- `phase13:rc-check`
- `i18n:audit`
- `release-check`

These gates establish the verified baseline against which "commercially
demonstrable today" is evaluated. The strict variants of these gates
(notably `release:evidence:strict`) intentionally block until the open
items in the *Current remaining blockers* section are resolved; that block
is treated as correct by-design behavior, not as a defect.

## What docs already exist

The following documentation is already in-tree and forms the substrate for
the commercial-readiness narrative. Each is described in one sentence.

- `docs/IBM_READINESS.md` — Tracks the IBM watsonx integration readiness
  posture and the verification steps that gate `verified_ready` status.
- `docs/premium-content-agent.md` — Describes the Premium Content Agent's
  scope, human-approval gates, and operator-facing controls.
- `docs/premium-content-agent-ingestion.md` — Documents the ingestion path
  that feeds the Premium Content Agent and the source-of-truth boundaries.
- `docs/premium-content-agent-prompt-strategy.md` — Specifies the prompt
  strategy, guardrails, and refusal patterns used by the Premium Content
  Agent.
- `docs/sam-opportunity-outreach-agent.md` — Describes the SAM opportunity
  intake and outreach drafting agent, including the human-approval gate
  before any external send.
- `docs/workflow-engine-foundation.md` — Establishes the platform-neutral
  workflow engine that orchestrates multi-step operator flows.
- `docs/architecture-web-first-roadmap.md` — Lays out the web-first
  architectural direction and the migration boundaries between renderer
  and the app boundary.
- `docs/workspace-readiness-banners.md` — Defines the workspace readiness
  banners that surface configuration status to the operator.
- `docs/tiering-notes.md` — Captures internal notes on plan tiering and
  what is gated to standard vs. premium vs. enterprise.
- `docs/renderer-credential-migration.md` — Documents the migration of
  credentialed API access out of the renderer and behind the app boundary.
- `docs/pricing/sourceDeck-pricing-revaluation-2026.md` — Captures the
  2026 pricing revaluation rationale and assumptions.
- `docs/pricing/sourceDeck-pricing-packaging.md` — Describes the current
  pricing packaging structure across plans.
- `docs/release/macos-signing-and-notarization.md` — Specifies the macOS
  signing and notarization procedure and the credentials it requires.
- `docs/release/release-evidence.md` — Documents the release-evidence
  capture mechanism and what each evidence artifact attests to.
- `docs/release-evidence/phase-13-operator-smoke/README.md` — Provides the
  Phase 13 operator smoke evidence bundle's contents and how it was
  produced.
- `docs/troubleshooting-knowledge-base/` — A tree of operator-facing
  troubleshooting articles used by the troubleshooting scan and KB
  surface.
- `docs/audits/macos-signing-release-readiness-audit.md` — Prior audit of
  macOS signing release readiness that this commercial-readiness audit
  builds on.
- `docs/release-notes/release-artifact-evidence-capture.md` — Release note
  describing the evidence capture mechanism shipped to support release
  attestations.

## What is buyer-ready today

The following capabilities can be demonstrated to a buyer today using the
in-tree build at `main @ cf224a3`:

- **First-run wizard** — guided setup that captures operator context.
- **GovCon operating profile capture** — structured intake of the
  operator's GovCon posture (NAICS, set-asides, certifications, past
  performance).
- **Outreach drafts (human-approval-gated)** — AI-assisted outreach
  drafting where the operator reviews and approves every send. Nothing
  goes out automatically.
- **Opportunity intake** — ingestion of SAM-style opportunity records
  from fixtures or live inputs into the operator's workspace.
- **Prime partner finder** — discovery surface for prime/sub partnering.
- **Premium Content Agent (gated)** — long-form content generation that
  requires explicit operator invocation and approval; outputs are drafts,
  not publications.
- **Troubleshooting scan** — `troubleshooting:scan` produces an operator-
  readable diagnostic of the local workspace state.
- **Release-evidence capture** — `release:evidence` produces the
  attestation bundle for a given build.
- **macOS signing-readiness diagnostic** — a read-only check that reports
  whether signing/notarization credentials are configured; it does not
  itself sign or notarize.

Wherever outreach, proposals, pricing, or sends are involved in any of
the above, **human approval is required**. Nothing is sent automatically.

Standard plans use customer-provided AI keys. Premium and enterprise
deployments may include SourceDeck-managed IBM watsonx configuration or
customer-provided AI credentials depending on workflow risk, usage
volume, and deployment requirements. Usage limits, overages, or
enterprise deployment terms may apply.

## What is missing

The following artifacts do not yet exist in-tree. This audit is the
entry point for producing them:

- **Single buyer demo script** — a linear, time-boxed narrative that walks
  a buyer through the SAFE demo flows listed below, in order, with explicit
  "do not claim" callouts inline.
- **Operator demo runbook** — the operator-facing companion to the buyer
  demo script, including environment setup, fixture selection, and a
  pre-flight checklist.
- **Final commercial smoke checklist** — a single-page checklist the
  operator runs immediately before a buyer demo to confirm the workspace
  is in a known-good state.
- **One-page buyer overview** — a concise written summary suitable for
  leave-behind use after a demo, written under the same forbidden-claims
  constraints as this audit.
- **Commercial-readiness release note** — a release-note entry that
  records the v1.0 commercial-readiness posture, including the open
  blockers and the SAFE/REQUIRES-PROVIDER demo split.

Each of these is a writing task, not a code task. None of them require
changes to the shipping product.

## What must NOT be claimed

The following claims must not appear as positive assertions in any
buyer-facing artifact, demo script, slide, email, or verbal narrative.
They may appear only in negated, "do not claim", or "requires verified
evidence" contexts.

- **"FedRAMP"** — Do not claim. SourceDeck holds no FedRAMP authorization.
- **"SOC 2" / "SOC2"** — Do not claim. SourceDeck holds no SOC 2 report.
- **"CMMC"** — Do not claim. SourceDeck holds no CMMC certification.
- **"HIPAA"** — Do not claim. SourceDeck is not represented as HIPAA-ready.
- **"HITRUST"** — Do not claim. SourceDeck holds no HITRUST certification.
- **"ISO 27001"** — Do not claim. SourceDeck holds no ISO 27001
  certification.
- **"government compliant" / "government compliance"** — Do not claim.
  Compliance posture is governed by the buyer's own ATO/assessment
  process, not by SourceDeck's marketing.
- **"guaranteed contract" / "guaranteed award" / "guaranteed revenue"** —
  Do not claim. SourceDeck assists operators; it does not award contracts.
- **"unlimited AI"** — Do not claim. Usage limits, overages, and
  deployment terms may apply.
- **"watsonx live" / "IBM watsonx live" / "IBM watsonx included"** (as a
  present-tense capability of the shipping product) — Do not claim. The
  IBM watsonx runtime is pending Phase 18A verification; see the
  *Current remaining blockers* section.
- **"SourceDeck is signed" / "SourceDeck is notarized" / "signed and
  notarized"** — Do not claim. Apple signing/notarization is pending real
  credentials; the local macOS artifact is unsigned dev only.
- **"auto-send" / "auto-submit" / "submits proposals automatically"** —
  Do not claim. Human approval is required for outreach, proposal,
  pricing, compliance, bid/no-bid, teaming, publishing, and sending.
  Nothing is sent automatically.

## Current remaining blockers

These are the known open items as of `main @ cf224a3`. They do not block
the SAFE demo flows below, but they do constrain what can be claimed and
which flows require a configured provider.

- **IBM watsonx runtime pending Phase 18A verification.** The watsonx-
  readiness diagnostic must show `not_configured` (or the status it
  returns) until `verified_ready` evidence exists. Until then, do not
  describe watsonx as a live shipping capability.
- **Apple signing/notarization pending real credentials.** The local
  macOS artifact is unsigned dev only. Do not represent the build as
  signed or notarized.
- **`release:evidence:strict` expected to block until signing-ready.**
  This is by design: the strict gate exists precisely to refuse a
  release-evidence bundle that lacks signed/notarized inputs. Its block
  status is not a defect.

## Demo flows SAFE today (no provider required)

The following flows can be demonstrated without configuring an LLM
provider, without watsonx, and without signed artifacts. They exercise
SourceDeck's local operator surface using fixtures and existing
diagnostics.

- **First-run wizard walk-through** — show the operator onboarding from a
  clean workspace.
- **GovCon operating profile capture** — fill the operating profile and
  show how downstream surfaces use it.
- **Opportunity intake from a fixture/sample** — load a sample opportunity
  and show the intake and workspace surfacing.
- **Prime partner finder UX** — walk the partner finder surface against
  the local dataset.
- **`troubleshooting:scan` output** — run the scan and read the
  operator-facing report.
- **`release:evidence` output** — run the evidence capture and walk the
  resulting bundle.
- **Signing-readiness output** — run the macOS signing-readiness
  diagnostic and read its status.
- **KB / playbooks tour** — walk the troubleshooting knowledge base and
  any in-tree playbooks.

Wherever outreach, proposals, pricing, or sends appear in these flows,
the demo must show the human-approval step explicitly. Nothing is sent
automatically.

## Demo flows that MUST be labeled "requires configured provider"

The following flows must be explicitly framed as **requires configured
provider** before they are demonstrated. They are not part of the SAFE
baseline.

- **Premium content generation** — any flow that calls a live LLM to
  produce content.
- **AI-assisted outreach drafting** — any flow that calls a live LLM to
  draft outreach. Human approval is still required before any send.
- **AI-assisted opportunity analysis** — any flow that calls a live LLM
  to analyze opportunity content.
- **watsonx-backed flows** — any flow that depends on the IBM watsonx
  runtime. Unless Phase 18A reports `verified_ready`, these must be
  framed as not yet live in the shipping product.
- **Signed-installer demo** — any demo that purports to install or run a
  signed/notarized SourceDeck artifact. Until Apple credentials are real,
  this is not available.

Standard plans use customer-provided AI keys. Premium and enterprise
deployments may include SourceDeck-managed IBM watsonx configuration or
customer-provided AI credentials depending on workflow risk, usage
volume, and deployment requirements. Usage limits, overages, or
enterprise deployment terms may apply.

Human approval remains required for outreach, proposal, pricing,
compliance, bid/no-bid, teaming, publishing, and sending. Nothing is
sent automatically.

## References

The following files were reviewed for this audit. No edits were made to
any of them.

- `README.md`
- `package.json`
- `sourcedeck.html`
- `docs/IBM_READINESS.md`
- `docs/premium-content-agent.md`
- `docs/premium-content-agent-ingestion.md`
- `docs/premium-content-agent-prompt-strategy.md`
- `docs/sam-opportunity-outreach-agent.md`
- `docs/workflow-engine-foundation.md`
- `docs/architecture-web-first-roadmap.md`
- `docs/workspace-readiness-banners.md`
- `docs/tiering-notes.md`
- `docs/renderer-credential-migration.md`
- `docs/pricing/sourceDeck-pricing-revaluation-2026.md`
- `docs/pricing/sourceDeck-pricing-packaging.md`
- `docs/release/macos-signing-and-notarization.md`
- `docs/release/release-evidence.md`
- `docs/release-evidence/phase-13-operator-smoke/README.md`
- `docs/troubleshooting-knowledge-base/`
- `docs/audits/macos-signing-release-readiness-audit.md`
- `docs/release-notes/release-artifact-evidence-capture.md`
