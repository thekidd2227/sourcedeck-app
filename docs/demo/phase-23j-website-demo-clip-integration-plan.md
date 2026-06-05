# Phase 23J — Website GovCon Demo Clip Integration Plan

**Date:** 2026-06-04
**Status:** PLAN ONLY — no media, no website changes, no runtime changes in this phase.
**Source of approved clips:** `docs/demo/phase-23i-clean-govcon-demo-recording-review.md` (PR #76, merged on `main` @ `fd8146a`). 17/17 shots reviewed APPROVED FOR WEBSITE CANDIDATE at the DOM/payload level; final assets require operator-recorded video on a clean profile.
**Build status:** unsigned development build — the Phase 23E `signed-demo-build.yml` chain has NOT verified this artifact, so the **unsigned-build caveat is REQUIRED** wherever build provenance could be implied.

> This phase plans *how* approved GovCon Capture OS demo clips would be integrated into the website. It does not produce, commit, or publish any media, and does not touch the website repo. Implementation is gated on a future, separate website PR after the assets are recorded (Phase 23J-impl).

---

## 1. Approved clip inventory (from Phase 23I / PR #76)

All 17 shots were reviewed buyer-safe (no Send Email / Submit Bid / Submit Quote, no System Readiness / System Flow, no PROD-02..05 / 4595758 / tokens / fake IDs, no signed/notarized claim, no real agency/vendor/solicitation data). Source shots (Phase 23F shot list):

| # | Shot | Website candidate? | Sales-only? | Rationale |
|---|---|---|---|---|
| 00 | Cold open — GovCon default | ✅ | — | Clean brand frame; strong hero candidate |
| 01 | GovCon Capture OS sidebar + Mode indicator | ✅ | — | Establishes "GovCon is primary" |
| 02 | Load Sample GovCon Demo Data | ✅ | — | Shows demo-data posture explicitly |
| 03 | Capture Command Center | ✅ | — | High-signal "day starts here" panel |
| 04 | Solicitation Workspace | ✅ | — | Extraction story |
| 05 | Compliance Matrix | ⚠ | ✅ | Dense table — sales walkthrough reads better than a short web clip |
| 06 | Vendor Quote Room | ✅ | — | "Requested manually" safety posture visible |
| 07 | Pricing Worksheet | ⚠ | ✅ | Numeric/advisory; sales context avoids "pricing tool" misread |
| 08 | Past Performance Library | ✅ | — | Operator-typed records |
| 09 | Capability Statement Studio | ✅ | — | "Drafts only — does not send" footer in frame |
| 10 | Prime Partner Finder | ✅ | — | "contacted manually" posture |
| 11 | Submission Readiness Gate | ✅ | — | The final-control story |
| 12 | Last Updated chips | ✅ | — | Local-timestamp integrity story (post-23H fix) |
| 13 | Internal Review Markdown export | ✅ | — | **SAMPLE DEMO DATA + INTERNAL REVIEW DRAFT — NOT SUBMITTED** in frame |
| 14 | No-submit safety language | ✅ | — | The safety-boundary proof shot |
| 15 | Show All Tools toggle | ⚠ | ✅ | Mechanical UI detail; sales-only |
| 16 | Close / CTA | ✅ | — | Brand close; pairs with request-access CTA |

### Website candidates (short-form, ≤15s each)
Shots **00, 01, 02, 03, 04, 06, 08, 09, 10, 11, 12, 13, 14, 16**.

### Sales-walkthrough-only candidates
Shots **05 (Compliance Matrix), 07 (Pricing Worksheet), 15 (Show All Tools)** — too dense / too mechanical for short web clips; keep for live/long-form sales walkthroughs.

> Every "website candidate" above is candidate-only until the operator records the actual video on a clean profile and a final operator sign-off passes the QA checklist (§9) and hard-stop list (§10).

---

## 2. Clip naming convention

```
sourcedeck-govcon-<NN>-<slug>-<variant>.<ext>
```
- `NN` = two-digit shot index (`00`–`16`).
- `slug` = kebab-case shot name (e.g., `cold-open-govcon-default`, `submission-readiness-gate`, `internal-review-markdown-export`).
- `variant` = `web` (short, muted, looped-safe) or `sales` (long-form walkthrough segment).
- `ext` = `mp4` (H.264, web) and a `webm` (VP9) sibling for broad support; `poster.jpg`/`poster.webp` for the still frame.

Example: `sourcedeck-govcon-13-internal-review-markdown-export-web.mp4` (+ `.webm`, + `-poster.jpg`).

### Canonical website clip set (8 consolidated cuts)

For the public website, the 17 source shots are consolidated into **8 canonical
website clips** with fixed, predictable filenames (each ships with a `.webm`
sibling and a `-poster.jpg`):

| File | Consolidates source shots | Screen shown |
|---|---|---|
| `sourcedeck-govcon-00-cold-open.mp4` | 00, 01 | GovCon Capture OS cold open + sidebar/Mode indicator |
| `sourcedeck-govcon-01-load-sample-data.mp4` | 02 | Load Sample GovCon Demo Data (demo-tagged) |
| `sourcedeck-govcon-02-capture-command-center.mp4` | 03 | Capture Command Center |
| `sourcedeck-govcon-03-solicitation-workspace.mp4` | 04, 05 | Solicitation Workspace + Compliance Matrix |
| `sourcedeck-govcon-04-compliance-matrix.mp4` | 05 | Compliance Matrix detail (sales-leaning) |
| `sourcedeck-govcon-05-vendor-pricing.mp4` | 06, 07 | Vendor Quote Room + Pricing Worksheet |
| `sourcedeck-govcon-06-submission-readiness.mp4` | 11, 12, 14 | Submission Readiness Gate + Last Updated chips + no-submit language |
| `sourcedeck-govcon-07-internal-review-export.mp4` | 13 | Internal Review Markdown export (SAMPLE DEMO DATA + INTERNAL REVIEW DRAFT — NOT SUBMITTED) |

These 8 names are the canonical website-asset filenames. The longer
`<NN>-<slug>-<variant>` form above remains the naming for the raw per-shot
working cuts.

Source/working files stay in `.qa/phase-23j-…/` or `/tmp/` only — never committed to this repo.

---

## 3. Required clip captions

Each website clip ships with a short on-page caption (visible text near the clip, NOT burned-in unless also captioned for a11y):

- 00: "GovCon Capture OS opens to your capture workflow — not a generic CRM."
- 02: "Load sample demo data — tagged as demo; real data replaces it."
- 03: "Capture Command Center: pursuits, deadlines, approvals — at a glance."
- 11: "Submission Readiness Gate — advisory score and checklist. Human review required."
- 13: "Export an internal review draft locally. Nothing is submitted."
- 14: "SourceDeck prepares review materials. It does not submit, upload, email, or transmit."
- (others: one-line, outcome-focused, no claims of submission/automation).

Captions must never claim submission, sending, guaranteed awards, or signed/notarized status.

---

## 4. Required accessibility text

- **`<track kind="captions">`** WebVTT subtitles for every clip with narration.
- **Descriptive `aria-label`** on each `<video>` summarizing the on-screen action (e.g., "Video: GovCon Capture OS Submission Readiness Gate showing an advisory readiness checklist").
- **Transcript** link/expandable for each narrated clip.
- **Poster frame** with meaningful `alt` text.
- Controls keyboard-operable; focus-visible; no content conveyed by color alone.

---

## 5. Required no-submit / no-send disclaimer near clips

A persistent disclaimer must appear adjacent to any GovCon clip block:

> **SourceDeck prepares internal review materials only.** It does not submit, upload, email, or transmit bids, quotes, or government responses. No portal upload. No SAM / PIEE / eBuy / GSA interaction. No email transmission. Final submission requires human review and action outside SourceDeck.

This mirrors the in-app Markdown export boundary and must not be omitted, collapsed-by-default behind interaction, or visually de-emphasized below legibility.

### Required website copy near every clip (verbatim)

These four lines must appear, legibly, near any GovCon clip block:

- "Demo uses sample data."
- "SourceDeck does not submit bids, quotes, emails, or portal uploads."
- "All exports are for internal review unless separately submitted by the user."
- "Local development builds may show unsigned-artifact warnings unless release evidence verifies signing/notarization."

---

## 6. Required unsigned-build caveat (until Phase 23E verifies the build)

Wherever a clip could imply a shipping/installed product, include:

> *Demonstration recorded on an unsigned development build. Signing and notarization are not claimed.*

Remove this caveat ONLY after the Phase 23E `signed-demo-build.yml` verification chain has verified the exact recorded build. Until then, no "signed and notarized" / "Apple notarized" / "production signed" language anywhere near the clips.

---

## 7. Website placement plan (proposed; not implemented)

| Placement | Clip(s) | Notes |
|---|---|---|
| Homepage hero / near-hero | Short loop of **00 → 03** (muted, ≤8s) | No autoplay-with-sound; poster frame first; "request access" CTA, not "try now" |
| GovCon workflow section | **04, 06, 08, 09, 10** as a short reel or tabbed clips | Each with its caption + the §5 disclaimer in the section |
| Submission Readiness section | **11, 13, 14** | Lead with the safety-boundary proof (14) + the local Markdown export (13) |
| Buyer-demo page / modal | Full short-form sequence **00,01,02,03,04,06,08,09,10,11,12,13,14,16** | Gated behind a request-access/contact step is acceptable; not behind a "free download" |

The hero clip must be muted, must not autoplay with sound, and must degrade to a poster image if media fails to load (no layout shift).

---

## 8. Website repo target (inspect before implementation — DO NOT edit now)

- The website is a **separate repo** (likely `sourcedeck-site` / the SourceDeck web/marketing repo). It is **not** this Electron app repo and is **out of scope** for this docs-only phase.
- Before any implementation: clone/inspect the website repo, confirm its framework, asset pipeline, video hosting (self-hosted vs CDN), CSP, and CTA conventions.
- No website production files are touched in Phase 23J (plan). Implementation is a future, separate website PR (Phase 23J-impl) gated on §9 + §10.

---

## 9. Integration rules

- **No autoplay with sound.** Hero may autoplay **muted + loop**; all other clips are click-to-play.
- **No fake live agency/vendor/solicitation data** — sample demo data only, visibly tagged.
- **No "free demo / download now / try now" CTA.**
- **CTA must be request access / contact** → `info@arivergroup.com` (or the approved contact route). No self-serve "start free" path.
- **No submission / email / portal-upload claims** in copy, captions, alt text, or burned-in text.
- **No signed/notarized claim** unless Phase 23E verified the exact build.
- No `Send Email`, `Submit Bid`, or `Submit Quote` UI may appear in any frame.
- No Response Desk send action and no SAM Sprint auto-send may appear; the SAM Sprint plan-limit copy (Free = 1 NAICS) must read accurately if shown.

---

## 10. QA checklist before any website PR

- [ ] Responsive: desktop / tablet / mobile — no overflow, no clipped captions.
- [ ] Video file sizes optimized (target hero ≤ ~2 MB, section clips ≤ ~5 MB; H.264 mp4 + VP9 webm).
- [ ] Poster frames present and meaningful for every clip.
- [ ] Captions / subtitles (WebVTT) present and synced for narrated clips.
- [ ] Keyboard accessibility: play/pause/seek reachable; focus-visible.
- [ ] No layout shift (reserved aspect-ratio box; poster before load).
- [ ] No privacy/secret leakage in any frame (no keys, tokens, real PII, real agency/vendor names, real solicitation content).
- [ ] No unsupported claims (no submission/automation/guaranteed-award/signed-notarized language).
- [ ] §5 no-submit disclaimer present and legible near every GovCon clip block.
- [ ] §6 unsigned-build caveat present (until Phase 23E verifies the build).
- [ ] CTA is request-access/contact — not free/download/try.

---

## 11. Hard-stop list (block the website PR if ANY is present)

1. Any real solicitation / vendor / agency data shown.
2. A `Send Email`, `Submit Bid`, or `Submit Quote` control visible in any frame.
3. A System Readiness / System Flow tab or pane visible (removed in PR #58 — must never reappear).
4. Any `PROD-02..05` / `4595758` / webhook token / fake Gmail/Airtable ID visible.
5. A signed/notarized / FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / "watsonx live" claim without verifying evidence.
6. "Free demo / download / try now" language.
7. Anything implying SourceDeck submits, uploads, emails, or transmits bids/quotes/government responses.
8. Markdown export frame missing the SAMPLE DEMO DATA banner or the INTERNAL REVIEW DRAFT — NOT SUBMITTED header/footer.

---

## 12. Next recommended phase

**Phase 23J-impl — website demo clip implementation** (separate website repo PR), preceded by **Phase 23K — operator manual video capture** (clips to `.qa/` or `/tmp/` only, unsigned-build caveat narrated). Optionally **Phase 23E signed-build verification** first, to lift the unsigned-build caveat.
