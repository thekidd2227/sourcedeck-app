# Phase 23K — Website Demo Clip Integration: Blocker Resolution Plan

**Date:** 2026-06-04
**Status:** **BLOCKED, not failed** — implementation cannot begin until the operator-recorded clips exist. Docs-only; no app/website/runtime/media changes.
**Source plan:** `docs/demo/phase-23j-website-demo-clip-integration-plan.md` (merged via PR #77 + #78 on `main` @ `f10164c`).

> This document records exactly what blocks Phase 23K website implementation and what must be true before a website implementation branch is created. It does **not** implement clips, edit the website, or commit media.

---

## 1. Blocker summary

| # | Blocker | Status | Detail |
|---|---|---|---|
| 1 | Operator-recorded GovCon demo clips do not exist | **ACTIVE** | 0 `.mp4`/`.webm`/`.mov`/`.m4v` found anywhere under `/Users/jean-maxcharles`; only 44 headless QA **screenshots** (not buyer-facing clips). |
| 2 | Website repo identity / remote correctness | **RESOLVED (clarified)** | `/Users/jean-maxcharles/sourcedeck-site` `origin` → `github.com/thekidd2227/sourcedeck-site.git` (correct; `gh` resolves to `thekidd2227/sourcedeck-site`; `CLAUDE.md` = the live `sourcedeck.app` site; 87 files reference "SourceDeck", 1 references "ChartNav"). A **stray secondary `chartnav` remote** (`thekidd2227/Chartnav.git`) also exists — harmless leftover; `origin` is correct. Optional cleanup: `git remote remove chartnav` (not done here; remotes are not touched). |

**Net:** Phase 23K is blocked solely on **#1 — missing operator-recorded clips.** The website repo is the correct SourceDeck site.

---

## 2. Approved clip set (from Phase 23J)

Phase 23I reviewed 17/17 shots as website candidates; Phase 23J consolidates them into **8 canonical website clips**. None are recorded yet.

| # | Canonical name (record as `.mp4` + `.webm` + `-poster.jpg` + `.vtt`) | Screen / message |
|---|---|---|
| 00 | `sourcedeck-govcon-00-cold-open` | GovCon Capture OS cold open — capture workflow, not a generic CRM |
| 01 | `sourcedeck-govcon-01-load-sample-data` | Load Sample GovCon Demo Data — sections populate, tagged as demo |
| 02 | `sourcedeck-govcon-02-capture-command-center` | Capture Command Center — pursuits, deadlines, approvals |
| 03 | `sourcedeck-govcon-03-solicitation-workspace` | Solicitation Workspace — Section L/M, PWS, forms, deadlines |
| 04 | `sourcedeck-govcon-04-compliance-matrix` | Compliance Matrix — 10 columns, verb-driven mandatory/optional |
| 05 | `sourcedeck-govcon-05-vendor-pricing` | Vendor Quote Room + Pricing Worksheet — "requested manually", advisory pricing |
| 06 | `sourcedeck-govcon-06-submission-readiness` | Submission Readiness Gate — advisory score; human review required |
| 07 | `sourcedeck-govcon-07-internal-review-export` | Internal Review Markdown export — "Internal Review Draft — Not Submitted" + SAMPLE DEMO DATA banner |

**Recommended order:** 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07.
**Do-not-use clips:** none approved-then-rejected; but **do not** ship any frame showing System Readiness/System Flow, a Send Email/Submit Bid/Submit Quote control, real agency/vendor/solicitation data, or a Markdown export missing the SAMPLE DEMO DATA banner.
**Sales-only (not short web clips):** the dense Compliance Matrix detail (04) and the Show-All-Tools mechanical toggle are better for live walkthroughs than short web loops (web cut optional).

---

## 3. Operator recording checklist (do before implementation)

1. Launch the **current `main`** build (`24684eb`/`f10164c` lineage) on a **clean profile** (fresh `localStorage`).
2. Narrate the **unsigned-build caveat** verbatim: *"This is an unsigned development build for demo purposes."* (Phase 23E signing chain has **not** verified this build.)
3. Record each of the 8 clips above, ≤15s each, **sample data only** (use Load Sample GovCon Demo Data; never real solicitation/vendor/agency data).
4. Capture the cold-open frame promptly (the `vendor-pricing` Last Updated chip can show a timestamp at cold open due to a boot-ordering race — non-blocking, but record cleanly).
5. Export web-safe, size-budgeted assets: `.mp4` (H.264) + `.webm` (VP9) + `-poster.jpg` + `.vtt` captions, per clip.
6. Save to `.qa/phase-23k-…/` or `/tmp/` only — **never `git add` media** into either repo.
7. Re-run the readiness gate; only then create the Phase 23K-B/implementation branch.

## 4. File naming convention (from Phase 23J)

`sourcedeck-govcon-<NN>-<slug>.<ext>` with `NN` = `00`–`07`, `<slug>` per §2, plus a `-poster.jpg` and a `.vtt` sibling. Both `.mp4` and `.webm` are required for each clip.

## 5. Required captions / transcripts

Each clip ships WebVTT captions (`<track kind="captions">`), a descriptive `aria-label`, a transcript, and a poster frame with meaningful `alt`. No autoplay with sound; muted hero only; `preload="none"`; reduced-motion safe; keyboard-operable controls.

## 6. Required disclaimer (verbatim, near every clip block)

> Demo uses sample data. SourceDeck does not submit bids, quotes, emails, or portal uploads. Exports are for internal review unless separately submitted by the user.

## 7. Correct CTA posture (allowed)

- "Request access" (→ the site's `/request-access/` route)
- "Contact us"
- "Schedule a walkthrough"

## 8. Forbidden copy (never allow on the website)

Free demo · Try now · Download now · Launch app · Submit bid · Submit quote · Send email · SourceDeck submits proposals · guaranteed award · guaranteed revenue · FedRAMP certified · SOC 2 certified · CMMC certified · signed and notarized · Apple notarized.

## 9. Required next action before implementation

1. **Record/export** the 8 approved clips (per §3–§5).
2. **Verify the website repo** is the correct SourceDeck site (`origin` → `thekidd2227/sourcedeck-site`; live `sourcedeck.app`) — confirmed; optionally remove the stray `chartnav` remote.
3. **Only then** create the Phase 23K implementation branch on `sourcedeck-site` (feature branch + draft PR; never push to `main`, which publishes via GitHub Pages).

> Note: a **draft placeholder** website PR (`sourcedeck-site` PR #5, branch `feat/phase-23k-govcon-demo-clips`) already exists with poster-placeholder slots and the required disclaimer; it must remain a draft until the real clips replace the placeholders. Separately, the website repo's privacy CI has pre-existing PII violations on `main` that should be triaged before any merge.
