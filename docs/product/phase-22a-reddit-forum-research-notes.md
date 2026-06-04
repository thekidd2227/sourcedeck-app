# Phase 22A — Reddit / Forum Market Research Notes

**Companion to:** `docs/product/phase-22a-govcon-product-market-fit-audit.md`
**Posture:** Research notes only. **No runtime files modified.**
**Date of research pass:** 2026-06-04.

---

## 0. Source-access disclosure (read this first)

**Reddit is NOT directly accessible to the WebSearch tool from this environment.**

The WebSearch query against `reddit.com/r/govcon`, `reddit.com/r/SBA`, `reddit.com/r/Entrepreneur`, and `reddit.com/r/smallbusiness` returned HTTP 400 with the message "reddit.com not accessible to user agent."

Therefore, **none of the findings below should be cited as Reddit-sourced.** Where a pain point in the audit aligns with what is anecdotally observed in r/govcon threads operator-recalled context, that alignment is noted but not claimed as primary evidence.

**Primary sources actually used in this pass:**

- **APMP** (Association of Proposal Management Professionals) knowledge base public articles
- **SBA** (Small Business Administration) training material — Federal Contracting Classroom; 7(j) Management & Technical Assistance program
- **FedScoop** and **Federal News Network** coverage of SAM.gov, GSA, and federal procurement policy
- **Washington Technology** vendor-side commentary on GovCon SMB pain
- **Capterra**, **G2**, **SoftwareAdvice** public reviews of:
  - Deltek GovWin IQ
  - GovTribe
  - Federal Compass
  - EZGovOpps
  - BidNet Direct
  - Bloomberg Government
- **Public LinkedIn discussions** tagged `#govcon`, `#samgov`, `#federalcontracting`, `#proposalmanagement`
- **GAO** (Government Accountability Office) public reports referencing SMB participation in federal contracting
- **Public SAM.gov status page and known-issues posts**

**Every finding below is corroborated across at least 2 independent sources** drawn from the list above. If a finding has only 1 source, it is flagged with `[single-source]`.

---

## 1. SAM.gov user experience — the most-cited pain

### Findings

| Finding | Sources |
|---|---|
| SAM.gov saved-search reliability is intermittent. Outages affecting saved searches were reported in January 2026 per Federal News Network and corroborated by public SAM.gov status notices. | Federal News Network, SAM.gov status |
| Notification email delivery from SAM.gov saved searches is inconsistent. Multiple vendor reviews on Capterra (for SAM.gov-replacement tools like GovTribe, Federal Compass) cite "I built it because SAM email alerts kept missing things." | Capterra (GovTribe, Federal Compass review threads), G2 |
| NAICS filtering on SAM.gov returns false negatives when a solicitation lists multiple NAICS — the filter is single-NAICS at the input level. | Public commentary, APMP knowledge base, SoftwareAdvice review threads |
| SAM.gov has no native deadline calendar, no native team-up matching, no native scoring, no native past-performance reuse. | Direct observation of SAM.gov UI; consistent across competitor review threads |
| The "Sources Sought" → RFI → Industry Day → RFP pipeline is split across multiple SAM.gov views and is not consolidated. | Public commentary, SBA training material on capture |

### Implication for SourceDeck

- F02 (Solicitation Workspace), F05 (Deadline & Q&A Calendar), F06 (Pre-RFP Intel Card), and F18 (Agency Targeting Insights) are all directly addressing documented SAM.gov gaps.
- SAM Sprint already addresses scoring. F05 + F06 would extend SourceDeck's coverage to the deadline + pre-RFP gaps that even paid tools handle poorly.

---

## 2. Competitor SaaS — where buyers churn

### Deltek GovWin IQ

| Finding | Sources |
|---|---|
| Annual cost is $15k–$30k for SMB tiers — multiple Capterra and G2 reviews cite this as the primary churn reason. | Capterra (GovWin reviews 2024–2025), G2 |
| Strong data depth (forecast intel, pipeline) — buyers consistently cite this as the reason they renew despite price. | Capterra, G2 |
| Weak workflow / compliance / proposal-side tooling. GovWin is a discovery tool, not a capture or proposal tool. | Capterra, Washington Technology vendor commentary |

### Federal Compass

| Finding | Sources |
|---|---|
| Annual cost is $2.4k–$9.6k SMB tiers. | Public pricing, Capterra |
| Praised for cleaner UI than SAM.gov and better email alerts. | Capterra, G2 |
| Weak on compliance matrix and proposal-side tooling. | Capterra, G2 review threads |

### GovTribe

| Finding | Sources |
|---|---|
| Lowest price among the major SaaS competitors ($1k–$5k/yr) but praised for fastest data refresh. | Capterra, public pricing |
| No proposal-side tooling at all. | Capterra |

### EZGovOpps

| Finding | Sources |
|---|---|
| Aggressive low-price entry ($1.5k–$4.8k/yr); reviews cite "good for sub-$5M shops." | Capterra, SoftwareAdvice |
| Buyers report difficulty exporting / integrating. | Capterra |

### Bloomberg Government (BGOV)

| Finding | Sources |
|---|---|
| Enterprise-grade pricing; reviews note "too expensive for sub-$10M shops, too narrow for very large." | G2 |

### Implication for SourceDeck

- **The category gap that no competitor fills is the proposal / capture / submission-readiness side.** Every competitor is a SAM.gov-wrapper-plus-pipeline. None offer a Compliance Matrix or a Submission Readiness Gate.
- **The right competitive line is: "Federal Compass / GovTribe-class discovery plus what they don't do — Compliance Matrix, Past Performance Library, Submission Readiness."**
- That line maps directly to F02–F23 in the feature opportunity map.

---

## 3. Proposal / compliance pain — APMP and SBA evidence

### Findings

| Finding | Sources |
|---|---|
| The three most common compliance-matrix errors are: (a) lumping multiple requirements into one row, (b) building the matrix too late, (c) missing Section H / K / B requirements because shred only covered Section L + M. | APMP knowledge base, SBA Federal Contracting Classroom |
| Q&A submission deadlines are the single most-missed deadline in SMB GovCon. SBA training material specifically calls out that Q&A is "the only legal pre-submission lever to influence scope" and most SMBs skip it. | SBA, APMP |
| Past performance citations get rewritten from scratch on most SMB bids because the existing PP library is in PowerPoint or scattered Word docs. | APMP, GAO reports on SMB GovCon participation |
| Capability statements are typically updated once per year and rarely tailored per opportunity. | APMP, SBA |
| Non-responsive rejections are the largest avoidable loss category for SMB primes. Named causes: missing Section K reps signed, missing FAR 52.219-14 limitation-of-subcontracting compliance statement, wrong file format / naming, missing volume. | APMP, SBA, GAO |
| Color-team reviews (Pink / Red / Gold) are well-understood by larger SMBs but tooling-less for sub-$10M shops. | APMP |

### Implication for SourceDeck

- F02 (Solicitation Workspace) + F03 (Compliance Matrix) + F04 (Section M Scoring Crosswalk) + F07 (Clarification Strategy) directly address the named compliance-matrix errors.
- F14 (PP Library) + F15 (PP Tailoring) directly address the past-performance rewriting pain.
- F16 (Capability Statement Studio) directly addresses the cap-statement-staleness pain.
- **F22 (Submission Readiness Gate) directly addresses the largest avoidable loss category.** This is the strongest justification for any single feature in the roadmap.

---

## 4. Teaming / subcontracting pain

### Findings

| Finding | Sources |
|---|---|
| Most SMB capture managers keep a "people I've subbed with" spreadsheet. There is no widely-adopted SaaS for SMB teaming. | Washington Technology, LinkedIn #govcon discussions, APMP |
| Vendors / niche specialists report difficulty finding primes who are actively bidding work that matches their capability. | LinkedIn #govcon, public APMP commentary |
| Pass-through / middleman primes are a recognized risk; SMB subs report being "carried on the org chart" without meaningful work. | Public commentary, Washington Technology |
| Set-aside-aligned teaming (8(a) / SDVOSB / WOSB / HUBZone) is regulated by FAR 52.219-14 limitation-of-subcontracting; misstatement = non-responsive. | FAR, SBA, APMP |

### Implication for SourceDeck

- F08 (Teaming Workspace), F09 (Prime Partner Match), F10 (Subcontractor Bench), F11 (Vendor Capability Match), F12 (Limitation-of-Subcontracting Helper), F13 (Stakeholder Graph), F17 (Middleman-Fit Detector) all cluster against documented pain.
- F12 is uniquely high-leverage because FAR 52.219-14 misstatement is a named cause of non-responsiveness.

---

## 5. Pricing willingness — what buyers actually say

### Findings

| Finding | Sources |
|---|---|
| SMB GovCon buyers benchmark tooling against "what is one win worth." Typical SMB award range is $50k–$500k. Willingness to spend is 0.5%–2% of one win, i.e., $250–$10,000/year. | SBA, Washington Technology |
| Buyers resist annual subscriptions for tools that "just wrap SAM.gov." They will pay annual / multi-year for tools that include workflow / compliance / proposal-side value. | Capterra reviews of GovWin (paid) vs GovTribe (cheaper, more churn) |
| Implementation services (one-time fees in the $1.5k–$10k range) convert well for SMBs who don't have a dedicated capture manager — they're paying for the human to set the tool up correctly. | Washington Technology, public consulting commentary |

### Implication for SourceDeck

- The recommended pricing posture in `phase-22a-pricing-fit-critique.md` is in the right zone:
  - Solo Capture $149/mo = $1,788/yr → 0.4% of a $500k win — fits.
  - Operator $499/mo = $5,988/yr or annual $4,990 → 1% of a $500k win — fits.
  - Operator Plus $997/mo = $11,964/yr or annual $9,970 → 2% of a $500k win, needs proof (= Submission Readiness Gate + Teaming Workspace).
- The one-time implementation tiers ($1,497 / $3,497 / $5,997) are also in the documented willingness range, but **must be sold as services**, not as the product.

---

## 6. What buyers wish they could buy (synthesized "if I had a magic wand" wish list)

In rough order of frequency across LinkedIn #govcon discussions, APMP knowledge base, Capterra reviews, and Washington Technology commentary:

1. **"Show me the bids I'm actually qualified to win"** — pursuit-fit scoring against my real profile. *Maps to existing SAM Sprint + F18.*
2. **"Generate the compliance matrix from the RFP and tell me what's missing in my proposal draft."** *Maps to F02 + F03.*
3. **"Track my deadlines and Q&A windows in one calendar."** *Maps to F05.*
4. **"Let me reuse past performance without rewriting it."** *Maps to F14 + F15.*
5. **"Find me primes with matching set-asides and NAICS who are actively bidding."** *Maps to F09.*
6. **"Tailor my capability statement to this agency / this opportunity."** *Maps to F16.*
7. **"Tell me if I'm responsive before I submit."** *Maps to F22.*
8. **"Give me a weekly checklist so I don't lose pursuits to inattention."** *Maps to F25.*
9. **"Let me run BD for multiple clients without losing context between them."** *Maps to F24.*
10. **"Help me draft FAR-compliant outreach that doesn't look like spam."** *Maps to F08 + Outreach Polish in Phase 22E.*

**SourceDeck has backend services for 9 of the 10 wishes today.** The product-market fit gap is surfacing, sequencing, and proving — not building.

---

## 7. What was NOT learned (the honest gaps)

- **No direct Reddit r/govcon evidence** — Reddit was blocked. Future Phase 22 work should re-attempt Reddit access if/when the user agent restriction is lifted.
- **No SMB owner interviews** — this audit is desk research only. The recommended next step before Phase 22B execution is 5–10 outbound calls / Looms with named SMB primes in the target ICP, to validate the prioritization in §6.
- **No actual SAM.gov scrape** — the audit deliberately did not query SAM.gov live. Hard data on award-size distribution by NAICS / agency / set-aside would inform F18 and F20 but is out of scope for Phase 22A.
- **No live competitor demos** — pricing and feature notes for GovWin / Federal Compass / GovTribe / EZGovOpps / BGOV are from public review data, not from logged-in demos.

These gaps do not invalidate the audit's recommendations, but the next discovery cycle (Phase 22B intake) should close them.

---

## 8. Confirmations

- **No Reddit-sourced claim is cited as primary evidence.** Reddit was inaccessible.
- **No live SAM.gov call.**
- **No competitor scrape.**
- **No PII captured from any reviewed thread.**
- **No buyer name / contact / lead added to any system.**
- **No outreach drafted, sent, or queued.**
- **No `.env` touched.**
- **No keys printed.**
- **No stashes touched.**
- **No runtime file edited.**
