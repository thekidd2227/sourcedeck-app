# Phase 25C — Secure Web App / PWA Delivery Contract

**Date:** 2026-06-09.
**Companion docs:** `docs/product/phase-25c-master-delivery-method.md`, `docs/product/phase-25c-desktop-delivery-boundary.md`.

The secure web app / PWA is the **default mass-delivery target** for SourceDeck per the Phase 25C master delivery method. This document defines the delivery-time expectations a future delivery sprint must implement and the boundaries that must hold from Day 1 of any future web/PWA delivery.

---

## 1. Delivery expectations

| Expectation | Description |
|---|---|
| **Hosted secure web app** | Approved buyer receives a URL to a tenant-scoped SourceDeck web app instance. The URL is not publicly indexable and is gated by authentication. |
| **PWA option** | The secure web app may be saved to Dock (macOS) / Home Screen (iOS/Android) via PWA install. PWA installation is a buyer convenience, not a separate distribution channel. |
| **Controlled access** | Every session is authenticated. No anonymous usage. No "guest mode." No public landing path that lets an unauthenticated visitor reach the SourceDeck product surfaces. |
| **Approved-only onboarding** | A buyer cannot self-provision a tenant. The buyer requests access; ARCG / operator manually qualifies; the operator manually creates the tenant and invites the buyer. |
| **No public self-serve signup** | A future phase may explicitly authorize a self-serve path. Until that phase, public self-serve signup is **forbidden**. |
| **No public anonymous usage** | Even the marketing site does not embed a "try the app right here" surface. Marketing site stays marketing; app stays gated. |

## 2. PWA specifics

If/when a future delivery phase enables PWA install:

- ✅ The PWA manifest must declare `display: standalone` (or `minimal-ui`).
- ✅ The PWA icon set must match the SourceDeck brand mark and wordmark currently approved.
- ✅ The PWA service worker may cache static assets and the offline-safe shell. It must **not** cache buyer data without explicit per-tenant configuration.
- ✅ PWA install prompts may be surfaced inside the gated app — never on the public marketing site.
- ❌ The PWA must **not** be installable from the public marketing site without authentication. (Authenticated `/app/install/` is fine; anonymous `/install/` is not.)
- ❌ The PWA must **not** advertise itself as a substitute for the (future) signed desktop installer. Two channels, two postures.

## 3. User onboarding

The web app onboarding mirrors the existing Phase 24K desktop Setup Wizard:

1. Welcome.
2. Company basics (legal name, DBA, UEI, CAGE).
3. Capability statement (paste / skip).
4. GovCon targeting profile (NAICS, PSC, set-asides, target agencies).
5. SAM.gov API key (enter / skip).
6. AI provider (optional).
7. Creative provider (optional).
8. Social / outreach (optional).
9. Safety & approval rules (verbatim Phase 25A statement).
10. Quick Setup Tour (15-feature tour).
11. Final Confirmation (5 boxes — including "I will clear demo / sample data before any real proposal use").

The web app must persist `setupComplete` in the buyer's authenticated tenant context, not in `localStorage`-only. A buyer should not lose setup state by clearing browser storage.

## 4. API key setup rules

The API key boundaries for the web app mirror the desktop boundaries (Phase 24L):

- ✅ **SAM.gov API key** — enter only in Setup Wizard Step 5 or Settings → API Keys.
- ❌ **SAM.gov API key** — must **not** be requested on SAM search / opportunity / workflow / export / demo / log surfaces.
- ✅ **AI provider keys** (OpenAI / Anthropic / IBM) — enter only in Setup Wizard Step 6 or Settings → API Keys.
- ✅ **Creative provider keys** (Stability / Replicate) — enter only in Setup Wizard Step 7 or Settings → API Keys.
- ✅ All keys persist via the buyer's authenticated tenant context, **not** plaintext `localStorage`.
- ❌ No key value is ever displayed back to the buyer in plaintext after save. (Mask, edit-by-replacement.)
- ❌ No key value is ever read or stored by the operator. (Operator may verbally confirm a key is set; never sees the value.)

## 5. No-public-anonymous-usage rule

- The marketing site (`sourcedeck.app`) may show product imagery, demo videos, and feature explanations.
- The marketing site may **not** embed the SourceDeck app itself in an `<iframe>` or otherwise expose the app's product surfaces to an unauthenticated visitor.
- Every product surface (Capture Command Center, Solicitation Workspace, Vendor Quote Room, etc.) lives behind authentication.

## 6. No-public-self-serve-signup rule

- A future phase may explicitly authorize a self-serve signup path. Until that phase, **public self-serve signup is forbidden**.
- Every onboarded buyer is the output of a manual qualification step. ARCG / operator approves; ARCG / operator creates tenant; ARCG / operator invites buyer.
- A future authorized self-serve path must include (at minimum):
  1. Email verification.
  2. Payment / invoice flow integration.
  3. Plan-cap enforcement.
  4. Tenant boundary enforcement.
  5. Onboarding wizard required at first login.
  6. Audit-log boundary on tenant creation.

## 7. Audit log + internal-review posture

The web app must preserve the Phase 24B Audit Log boundaries:

- Every credential save, every export, every solicitation analysis, every submission readiness run is logged in the buyer's tenant audit log.
- The audit log is visible to the buyer.
- The audit log is **not** visible to the operator without explicit buyer consent (per future tenant-boundary phase).
- The Internal Review Export remains a buyer-local artifact (or a tenant-scoped buyer download — never a portal upload, never an email send, never a SAM.gov push).

The Phase 25A no-send / no-submit / no-upload statement applies to the web app verbatim:

> SourceDeck prepares internal review materials. The user decides, approves, sends, uploads, and submits outside SourceDeck.

## 8. Future engineering requirements

A future web/PWA delivery sprint must capture (at minimum):

1. **Authentication.** Identity provider selection (Clerk / Auth0 / custom). Email verification. Optional SSO.
2. **Tenant boundary.** Per-tenant database isolation, per-tenant audit log, per-tenant credential vault.
3. **Backend hosting.** Hosting provider selection (Vercel, AWS, GCP, Azure). Region. Backup posture. Disaster recovery posture.
4. **Storage.** Per-tenant secret vault (e.g., Vault, AWS KMS) for API keys.
5. **Plan-cap enforcement.** Solo Capture / GovCon Operator / Operator Plus tier limits enforced server-side per `docs/product/pricing-source-of-truth.md`.
6. **Onboarding flow.** Identical step-count to the desktop Setup Wizard (Phase 24K).
7. **Support escalation.** Tier 1 (operator), Tier 2 (`info@arivergroup.com`). Same posture as Phase 25A.
8. **Data export.** Buyer-initiated full export of tenant data, in a documented format, for DPA compliance.
9. **Tenant deletion / data deletion.** Buyer-initiated deletion path; operator-initiated tenant offboarding path.
10. **Telemetry boundary.** Telemetry must be opt-in and tenant-scoped; never include credential values or buyer pursuit content.

These are future-phase requirements. This document fixes the contract; the implementation is out of scope for Phase 25C.

## 9. No-go reminders

The web app, like every SourceDeck surface, must not:

- ❌ Submit bids / quotes / proposals on the buyer's behalf.
- ❌ Send emails on the buyer's behalf.
- ❌ Upload to SAM.gov / PIEE / eBuy / GSA / agency portals.
- ❌ Claim FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 certification.
- ❌ Claim signed-and-notarized / Apple-notarized / production-signed status.
- ❌ Guarantee an award, contract, or revenue.
- ❌ Re-introduce deprecated $79 / $349 / $999 pricing in active UI.
- ❌ Expose a public download CTA, free demo CTA, try-now CTA, or any self-serve path.

---

## Signature

This contract governs every future SourceDeck secure web app / PWA delivery sprint. The contract is the canonical posture; the implementation is the future-phase work.
