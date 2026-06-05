# Phase 23K — Operator Demo Clip Recording Package

**Date:** 2026-06-05
**Status:** Phase 23K implementation **BLOCKED** until these clips are recorded. Docs-only; no media committed, no website/runtime changes.
**Reviewed from:** `main` @ `609d4f2` (Phase 23K blocker docs merged via PR #79).
**Source plans:** `docs/demo/phase-23i-clean-govcon-demo-recording-review.md`, `docs/demo/phase-23j-website-demo-clip-integration-plan.md`, `docs/demo/phase-23k-blocker-resolution-plan.md`.

> **Why blocked:** the approved buyer-facing GovCon demo clips do not exist. 0 `.mp4`/`.webm`/`.mov` were found anywhere under `/Users/jean-maxcharles`; only 44 headless QA **screenshots** in `.qa/` (internal dry-run evidence, not website assets). This package is the actionable recording checklist to produce them correctly.

---

## 1. Purpose

- These clips are **sales / demo / onboarding assets only**.
- They are **not product features** and change no runtime behavior.
- They **do not submit bids, quotes, emails, or portal uploads**. SourceDeck prepares internal-review materials only.

## 2. Required disclaimer (verbatim, on-screen/caption near every clip)

> Demo uses sample data. SourceDeck does not submit bids, quotes, emails, or portal uploads. Exports are for internal review unless separately submitted by the user.

## 3. Required clip checklist (8 canonical clips, in recording order)

Record from a **clean `main` build** (GovCon Capture OS is the default tab). Click **Load Sample GovCon Demo Data** (`#gc-demo-load-btn`) before recording the data-dependent clips. Each clip: `.mp4` (H.264) + `.webm` (VP9) + `-poster.jpg` + `.vtt` captions; ≤15s; muted; no autoplay-with-sound.

### 00 — `sourcedeck-govcon-00-cold-open.mp4` · website-safe
- **Screen/path:** GovCon Capture OS default cold open (`tab-govcon`, brand sub-label "GovCon Capture OS", `#gc-mode-indicator`).
- **Action:** launch, hold the frame; slow pan from brand block to the sidebar.
- **Must be visible:** "GovCon Capture OS" label; GovCon Mode indicator.
- **Must NOT be visible:** Dashboard/Lead Generator as the first frame; any System Readiness/System Flow tab; any PROD-02..05 / 4595758.
- **Duration:** 6s. **Poster:** first clean frame. **Caption:** "GovCon Capture OS opens to your capture workflow — not a generic CRM."

### 01 — `sourcedeck-govcon-01-load-sample-data.mp4` · website-safe
- **Screen/path:** Phase 23A Demo Mode block at the top of the GovCon pane.
- **Action:** click **Load Sample GovCon Demo Data**; wait for re-render (~3s).
- **Must be visible:** sections populate; the 5 Last Updated chips stamp; demo-tagged rows.
- **Must NOT be visible:** real agency/vendor/solicitation data.
- **Duration:** 12–15s. **Poster:** populated board. **Caption:** "Load sample demo data — tagged as demo; real data replaces it."

### 02 — `sourcedeck-govcon-02-capture-command-center.mp4` · website-safe
- **Screen/path:** `#gc-capture-cc` (8 stat cards).
- **Action:** slow pan across the cards; hover the Last Updated chip.
- **Must be visible:** non-zero sample counts; "Add an opportunity manually (no live SAM call)" label.
- **Must NOT be visible:** any live-SAM-call wording; real data.
- **Duration:** 12s. **Poster:** full card grid. **Caption:** "Capture Command Center: pursuits, deadlines, approvals — at a glance."

### 03 — `sourcedeck-govcon-03-solicitation-workspace.mp4` · website-safe
- **Screen/path:** `#gc-sol-workspace` (intake + extracted sections).
- **Action:** scroll Section L / M / PWS lists; build Compliance Matrix.
- **Must be visible:** extracted-section rows defaulting to "Draft — Not Reviewed".
- **Must NOT be visible:** auto-marked "Reviewed" rows; real solicitation text.
- **Duration:** 12–15s. **Poster:** extracted lists. **Caption:** "Local deterministic extraction — Section L/M, PWS, forms, deadlines."

### 04 — `sourcedeck-govcon-04-compliance-matrix.mp4` · **sales-only** (dense table)
- **Screen/path:** Compliance Matrix inside `#gc-sol-workspace`.
- **Action:** scroll all 10 columns; click **Mark Requirement Reviewed** on one row → chip re-stamps.
- **Must be visible:** 10-column matrix; verb-driven mandatory/optional; manual Mark Reviewed.
- **Must NOT be visible:** any auto-mark.
- **Duration:** 15–20s (sales). **Poster:** matrix header. **Caption (sales):** "10-column compliance matrix, operator-assigned."

### 05 — `sourcedeck-govcon-05-vendor-pricing.mp4` · website-safe
- **Screen/path:** `#gc-vqr` (Vendor Quote Room) + `#gc-pricing` (Pricing Worksheet).
- **Action:** hover a vendor row ("Requested manually"); type into Labor/Materials/Profit % to recompute advisory price/margin; trigger the `<5%` warning.
- **Must be visible:** "Requested manually" status; advisory Estimated Price/Margin; warning banner.
- **Must NOT be visible:** any "quote sent"/outreach; real cost data.
- **Duration:** 15s. **Poster:** pricing panel. **Caption:** "Advisory pricing and manually-tracked vendor quotes. Nothing is submitted."

### 06 — `sourcedeck-govcon-06-submission-readiness.mp4` · website-safe
- **Screen/path:** `#gc-sub-gate` (Submission Readiness Gate).
- **Action:** scroll checklist; click **Build Package Preview**; scroll the preview.
- **Must be visible:** advisory readiness score; "Internal review preview only. SourceDeck does not submit, upload, email, or transmit this package."
- **Must NOT be visible:** any submit/upload/send action.
- **Duration:** 15–20s. **Poster:** readiness gate. **Caption:** "Advisory readiness gate. Human review required."

### 07 — `sourcedeck-govcon-07-internal-review-export.mp4` · website-safe · **proof shot**
- **Screen/path:** Submission Readiness Gate → **Export Internal Review Markdown** (`#gc-pkg-md-export-btn`); open the `.md`.
- **Action:** click export; show the downloaded `*-INTERNAL-REVIEW-DRAFT.md`; scroll the header.
- **Must be visible:** `INTERNAL REVIEW DRAFT — NOT SUBMITTED` header; **`SAMPLE DEMO DATA — Replace before proposal use`** banner; "does not submit, upload, email, or transmit"; `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`.
- **Must NOT be visible:** any positive "submitted/uploaded" copy; real data.
- **Duration:** 15–25s. **Poster:** Markdown header. **Caption:** "Export a local internal-review draft. Nothing is submitted."

**Do-not-use:** any frame showing System Readiness/System Flow, a Send Email/Submit Bid/Submit Quote control, PROD-02..05 / 4595758 / webhook tokens / fake Gmail/Airtable IDs, real agency/vendor/solicitation/PII data, or a Markdown export missing the SAMPLE DEMO DATA banner.

## 4. Forbidden content (must never appear in clips, captions, alt text, or copy)

Free demo · Try now · Download now · Launch app · Submit bid · Submit quote · Send email · SourceDeck submits proposals · SourceDeck files into SAM.gov · guaranteed award · guaranteed revenue · FedRAMP certified · SOC 2 certified · CMMC certified · HIPAA certified · HITRUST · ISO 27001 certified · signed and notarized · Apple notarized.

Allowed CTAs only: **Request access** (`/request-access/`), **Contact us**, **Schedule a walkthrough**, **Talk to ARCG Systems**.
Until the Phase 23E signing chain verifies the exact build, narrate the **unsigned-build caveat**: *"This is an unsigned development build for demo purposes."*

## 5. Recording environment rules

- Clean `main` branch only; fresh `localStorage` (clean profile).
- No `.env` displayed; no terminal secrets; no API keys.
- No real SAM search; no real vendor outreach; no real email sending; no real bid/quote/proposal submission.
- **Sample data only** (use Load Sample GovCon Demo Data); keep visible sample/demo labels.
- Do not show desktop notifications, browser saved passwords, real inboxes, or private files.
- Save assets to `.qa/phase-23k-…/` or `/tmp/` only — **never `git add` media**.

## 6. Approval gate (before Phase 23K website implementation)

1. All 8 clips exist locally (`.mp4` + `.webm` + `-poster.jpg` + `.vtt`).
2. Each clip reviewed against Phase 23J (website-safe vs sales-only honored).
3. Captions/transcripts exist for every clip.
4. Poster frames exist for every clip.
5. Unsafe-copy grep passes (the §4 list = zero positive hits).
6. Website repo identity re-confirmed (`origin` → `thekidd2227/sourcedeck-site`; live `sourcedeck.app`).
7. **No media committed to `sourcedeck-app`** unless explicitly approved.

Only after all 7 pass: create the Phase 23K implementation branch on `sourcedeck-site` (feature branch + draft PR; never push to `main`, which publishes via GitHub Pages). A draft placeholder website PR (`sourcedeck-site` #5) already exists and stays draft until real clips replace the placeholders.
