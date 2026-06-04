# Phase 22A — GovCon Feature Opportunity Map (25 Opportunities)

**Companion to:** `docs/product/phase-22a-govcon-product-market-fit-audit.md`
**Posture:** Research only. **No runtime files modified.** Each opportunity below is a *recommendation*, not a built feature.

---

## Counts (validated against the directive)

| Required category | Required count | Delivered | Item IDs |
|---|---|---|---|
| GovCon-only | ≥10 | 18 | F01, F02, F03, F04, F05, F06, F07, F08, F09, F10, F11, F12, F13, F14, F15, F16, F17, F18 |
| Solicitation-document-related | ≥5 | 7 | F02, F03, F04, F05, F06, F07, F12 |
| Subcontractor / vendor / prime | ≥5 | 6 | F08, F09, F10, F11, F13, F17 |
| Proposal-writing | ≥3 | 4 | F14, F15, F16, F19 |
| Pricing / quote | ≥2 | 2 | F20, F21 |
| Submission package | ≥2 | 2 | F22, F23 |
| Cross-cutting (operator / multi-client / rhythm) | n/a | 2 | F24, F25 |

**Note on overlap:** Items can satisfy multiple categories (e.g., F02 is both GovCon-only and solicitation-document-related). The counts above respect the original directive's category-level minimums; each item is listed once per category it satisfies.

---

## Legend

- **Service backend:** which `services/govcon/*.js` modules already exist to power the feature.
- **Buyer value tier:** **H** = revenue-justifying, **M** = renewal-supporting, **L** = nice-to-have.
- **Build cost:** **S** = small (UI assembly only), **M** = medium (UI + light service work), **L** = large (new service work needed).
- **Phase target:** the recommended next phase (22B–22F) where this opportunity belongs. *Some are deferred ("22G+") deliberately.*
- **Safety posture:** all items retain `human_approval_required: true`, `auto_send: false`, no autonomous submission. No item below depends on a compliance certification.

---

## F01 — GovCon-First Nav Mode

**Pain:** A GovCon buyer's first 60 seconds shows commercial-CRM tabs (Lead Generator, Email Tracker, Ad Engine, Socials, Clinical/EHR) ahead of GovCon-specific ones. Buyer recognition drops below the purchase-intent threshold before they reach Opportunities or GovCon.
**Recommendation:** Make "GovCon Mode" a first-class app setting (set during onboarding). In GovCon Mode, the primary nav re-orders to: **GovCon · Opportunities · Solicitation Workspace · Deadlines · Past Performance · Capability Statements · Teaming · Outreach · Response Desk · Reports · Daily Rhythm · Settings**. Hide Clinical/EHR, Ad Engine, Socials behind a "Show all" toggle.
**Service backend:** none needed.
**Buyer value:** H · **Cost:** S · **Phase:** 22B.

---

## F02 — Solicitation Workspace (Section L/M/B/C/H/K shred)

**Pain:** Compliance matrix errors are the most-named cause of lost SMB bids (APMP). Most SMBs build the matrix in Excel after the fact.
**Recommendation:** New tab. User drops a solicitation PDF/URL → parsed by `solicitation-analysis` → produces a Section-by-section shred for L (instructions), M (evaluation), B (price), C (statement of work), H (special clauses), K (reps & certs), plus J (attachments) and any IDIQ/BPA call-order references. Each row links to a requirement card with a state machine: Draft → Addressed → Reviewed → Approved.
**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`, `deadline-extraction.js`.
**Buyer value:** **H (the killer feature)** · **Cost:** M · **Phase:** 22C.

---

## F03 — Compliance Matrix Generator (bound to requirements, not free-text)

**Pain:** Lumping multiple requirements into one row (APMP top compliance error). Most SMBs build a matrix from a manual read of Section L only.
**Recommendation:** Auto-generate a one-row-per-requirement matrix from the shred. Each row carries: requirement ID, source section (L / M / B / C / H / K), verbatim text, proposal volume + page, status, owner, last reviewed. **Never auto-marks a row "compliant"; the human approves each row.**
**Service backend:** `compliance-matrix.js`, `solicitation-analysis.js`.
**Buyer value:** H · **Cost:** M · **Phase:** 22C.

---

## F04 — Section M Scoring Crosswalk

**Pain:** Proposal writers commonly hit Section L (instructions) but under-serve Section M (evaluation factors). Section M is where the score comes from.
**Recommendation:** Cross-walk every Section L requirement → its scoring weight in Section M → call out requirements that appear in M but not in L (these are the trap requirements). Output a "score-leverage" view: where to spend the most words.
**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`.
**Buyer value:** H · **Cost:** M · **Phase:** 22C.

---

## F05 — Deadline & Q&A Calendar

**Pain:** Q&A submission deadlines are the most-missed deadline in GovCon (per multiple SBA training documents). Q&A is the only legal pre-submission lever to clarify scope.
**Recommendation:** Unified calendar across all active pursuits. Surfaces: Q&A deadline, Q&A response posting date, proposal due, oral presentation date, evaluation period, contemplated award date. Email-the-day-of and email-2-days-before reminders (drafted only, never sent).
**Service backend:** `deadline-extraction.js`, `scheduled-sam-search.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22B.

---

## F06 — Pre-RFP Intel Card

**Pain:** The window between Sources Sought / RFI / Industry Day → RFP release is the highest-leverage capture window. Most SMBs do not exploit it.
**Recommendation:** Per-opportunity Pre-RFP Intel card: history of sources sought / RFI / industry day, contracting officer history, incumbent (if any), prior award history on the agency code + PSC, recommended Q&A questions to submit.
**Service backend:** `pre-rfp.js`, `incumbent-research.js`, `fed-agent.js`.
**Buyer value:** H · **Cost:** M · **Phase:** 22B.

---

## F07 — Clarification / Q&A Strategy Drafter

**Pain:** SMBs do not submit Q&A because they do not have a system. Strong primes use Q&A as a competitive lever.
**Recommendation:** Generates draft Q&A questions from the Compliance Matrix's "ambiguous" rows. **Drafts only — never submits.** Outputs a printable Q&A package the operator can paste into the agency portal manually.
**Service backend:** `clarification-strategy.js`, `compliance-matrix.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22C.

---

## F08 — Teaming Workspace (per-opportunity team-up sheet)

**Pain:** Teaming is run in spreadsheets. There is no single per-opportunity view of "who are we teaming with on this one?"
**Recommendation:** Per-opportunity Teaming Workspace synthesizing: prime-partner-finder candidates, subcontractor-bench candidates, middleman-fit signals (is this a pass-through, an SDVOSB set-aside, a small business prime carrying a large business sub?), stakeholder-graph (do we know anyone at the agency / primes already?).
**Service backend:** `prime-partner-finder.js`, `subcontractor-sourcing.js`, `subcontractor-bench.js`, `middleman-fit.js`, `stakeholder-graph.js`.
**Buyer value:** H · **Cost:** M · **Phase:** 22E.

---

## F09 — Prime Partner Match (per opportunity, with set-aside filter)

**Pain:** Sub-to-prime ladder is real but undertooled. Existing Prime Partners tab is generic.
**Recommendation:** Per-opportunity prime match: filter by set-aside (8(a) / SDVOSB / WOSB / HUBZone), NAICS, agency history, geographic proximity, prior teaming history. Output: ranked list with rationale ("matched on NAICS 541512, both 8(a), prior teaming on Award N00178-22-D-0001").
**Service backend:** `prime-partner-finder.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22E.

---

## F10 — Subcontractor Bench (vetted vendor library)

**Pain:** Primes need a bench of vetted subs. Most keep it in Excel.
**Recommendation:** Bench surface: per-vendor profile with NAICS, certifications, primary capabilities, past performance with us, current capacity flag, last touch date.
**Service backend:** `subcontractor-bench.js`, `subcontractor-sourcing.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22E.

---

## F11 — Vendor Capability Match (sub side, mirror of F09)

**Pain:** Vendors / niche specialists want to find primes who are bidding work that matches their capability.
**Recommendation:** Mirror of F09 from the sub's perspective: "show me primes who are bidding NAICS 541330 work with HUBZone set-aside requirements who don't yet have my capability on their team."
**Service backend:** `prime-partner-finder.js`, `subcontractor-sourcing.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22E.

---

## F12 — Limitation of Subcontracting Compliance Helper

**Pain:** Most SMB primes get tripped up by FAR 52.219-14 (limitations on subcontracting) — the percent-of-work-the-prime-self-performs constraint. Misstating it = non-responsive.
**Recommendation:** Per-opportunity helper that asks: set-aside type, NAICS, dollar split between prime and subs. Output: red/yellow/green compliance with FAR 52.219-14, with the explicit clause text and the rule applied. **Advisory only.**
**Service backend:** `compliance-matrix.js`, `email-compliance.js` (FAR clause vocabulary).
**Buyer value:** H · **Cost:** S · **Phase:** 22C.

---

## F13 — Stakeholder Graph (who do we know at this agency / prime?)

**Pain:** Capture managers re-learn agency relationships on every bid.
**Recommendation:** Visible stakeholder graph: contacts at the agency, contacts at incumbent / likely primes, prior conversations logged in Response Desk / Outreach, prior meetings logged in Daily Ops.
**Service backend:** `stakeholder-graph.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22E.

---

## F14 — Past Performance Library

**Pain:** PP citations get rewritten from scratch on every bid. Most SMB primes have the same 3–5 PPs and still re-format them.
**Recommendation:** PP Library tab: one card per project. Fields: customer, NAICS, PSC, period of performance, $ value, role (prime/sub), key personnel, scope summary, customer reference, "use this PP in proposals" flag. Reusable across bids.
**Service backend:** `past-performance.js`.
**Buyer value:** H · **Cost:** M · **Phase:** 22D.

---

## F15 — Past Performance Tailoring per Opportunity

**Pain:** Even with a PP library, the writeup needs to be tailored to the agency's evaluation factors.
**Recommendation:** Given an opportunity + selected PP citations, tailor each PP citation to the Section M evaluation language. Output: per-PP-per-opportunity draft text + delta from the canonical PP. **Human approves; never auto-submitted.**
**Service backend:** `past-performance.js`, `solicitation-analysis.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22D.

---

## F16 — Capability Statement Studio (per-opportunity)

**Pain:** Capability statements are built in PowerPoint and rarely tailored. A tailored cap statement converts higher.
**Recommendation:** Capability Statement Studio: master capability statement (built once via setup wizard), then per-opportunity tailoring (highlight matching NAICS, matching past performance, matching certifications). Export PDF.
**Service backend:** `capability-statement-extractor.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22D.

---

## F17 — Middleman-Fit Detector

**Pain:** Some "primes" are pass-throughs that add cost without value. Identifying them protects margin.
**Recommendation:** Surface the existing `middleman-fit.js` signal: when a prime team-up offer comes in, score it on pass-through risk (set-aside misalignment, no relevant past performance on the agency, no key personnel relevant). **Advisory.**
**Service backend:** `middleman-fit.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22E.

---

## F18 — Agency Targeting Insights

**Pain:** Targeting profiles (NAICS, PSC, agency, set-aside) are usually copy-pasted from one bid to the next.
**Recommendation:** Surface `targeting-profile.js` + `fed-agent.js` data: per-agency hit-rate, per-NAICS win-rate, per-PSC density. Inform pursuit decisions.
**Service backend:** `targeting-profile.js`, `fed-agent.js`, `naics-expansion.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22B.

---

## F19 — Proposal Volume Outline Drafter

**Pain:** Volume outlines are reverse-engineered from Section L every time.
**Recommendation:** Given the Section L shred, auto-draft a volume outline (Volume I Technical, Volume II Past Performance, Volume III Cost, etc.) with the section/page targets dictated by Section L. **Outline only — content is human-written.**
**Service backend:** `solicitation-analysis.js`, `compliance-matrix.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22C.

---

## F20 — Price-to-Win Advisory (NOT autonomous quoting)

**Pain:** Small SMB primes don't know what win-price looks like for their NAICS / agency / contract type.
**Recommendation:** Surface publicly available historical award data (USAspending.gov style data; not part of this PR) to advise: "median award for NAICS 541512 at this agency on this contract type in the last 24 months was $X with a Y% spread." **Advisory only; the operator sets the bid price.** Never auto-quotes, never auto-submits.
**Service backend:** new — would require additive `services/govcon/price-advisory.js`. *Phase 22E or 22G+.*
**Buyer value:** M · **Cost:** L · **Phase:** 22G+ (deferred — needs public-data integration scope).

---

## F21 — Subcontractor Rate / Burden Drafter (per-sub, advisory)

**Pain:** Primes need to draft a rate card per sub on every bid.
**Recommendation:** Given a sub from the Bench + an opportunity, draft a rate card (labor categories from the sub's profile, indirect rates from the prime's profile, fee position). **Draft only — operator reviews; never submitted.**
**Service backend:** would synthesize `subcontractor-bench.js` + `targeting-profile.js`. *Light service work.*
**Buyer value:** M · **Cost:** M · **Phase:** 22E.

---

## F22 — Submission Readiness Gate (the renewal feature)

**Pain:** Non-responsive rejections are the single biggest avoidable SMB loss. Causes: missing Section K reps signed; missing limitation-of-sub compliance statement; wrong file format/naming; missing volume; deadline crossed.
**Recommendation:** Pre-submission gate. Inputs: the compliance matrix state, the proposal volume files, the Section K reps signed flag, the deadline. Output: red / yellow / green readiness score + an explicit "not responsive yet because: [list]". **Never auto-submits. Never blocks the operator from submitting outside SourceDeck.**
**Service backend:** synthesizes `compliance-matrix.js`, `email-compliance.js`, `export.js`, `past-performance.js`.
**Buyer value:** **H (renewal-justifying)** · **Cost:** M · **Phase:** 22F.

---

## F23 — Submission Package Export Bundle

**Pain:** Buyers assemble the final submission package (volumes + reps + attachments) from scattered drives.
**Recommendation:** Export bundle: a ZIP / folder with the final volume PDFs, signed Section K, capability statement, past performance citations, and a `manifest.json` listing every file's role in the submission. **Bundle only — operator uploads it themselves.**
**Service backend:** `export.js`.
**Buyer value:** H · **Cost:** S · **Phase:** 22F.

---

## F24 — Multi-Client Workspace Switching (for the Operator / consultant persona)

**Pain:** BD-as-a-service operators run 3–8 client books. Each needs its own pursuit profile, PP library, capability statements, deadlines.
**Recommendation:** First-class client switcher in the header. Each client = its own pursuit profile + PP library + capability statements + deadlines + outreach log. Single sign-in.
**Service backend:** `govcon-pursuit-profile-store.js` already supports multiple profiles; needs renderer surface.
**Buyer value:** H (for the consultant persona) · **Cost:** M · **Phase:** 22E.

---

## F25 — Weekly Pursuit Rhythm (Daily Ops generalization)

**Pain:** Capture cadence is owner-dependent. New SMB capture managers don't know what "good rhythm" looks like.
**Recommendation:** Weekly rhythm tab: Monday = SAM Sprint + opportunity review, Tuesday = teaming outreach, Wednesday = compliance matrix review, Thursday = past performance drafting, Friday = Q&A submission deadline check. Tasks are pre-loaded; user accepts or skips.
**Service backend:** `workflow-automation.js`, `capture-os.js`.
**Buyer value:** M · **Cost:** S · **Phase:** 22B.

---

## Cross-cutting safety guarantees (applies to every item above)

| Guarantee | Mechanism |
|---|---|
| No auto-submit to SAM / PIEE / eBuy / GSA / agency portals | Renderer never calls those endpoints. Every "submit" action produces a downloadable artifact, not a network call. |
| No auto-send emails | `auto_send: false` everywhere. Response Desk safety invariants retained. |
| No live Gmail / live inbox claim | "Import is local/manual until inbox integration is connected" language retained. |
| No compliance certification claim | No FedRAMP / SOC 2 / CMMC / HITRUST / ISO 27001 wording added by any feature. |
| No guaranteed-outcome claim | No "guaranteed award" / "guaranteed revenue" / "unlimited AI" wording added. |
| Human approval required at every decision | Every output is advisory; every send / submit / quote is operator-initiated. |
| Default-state policy preserved | No new default-state data introduced; new surfaces respect `FORBIDDEN_SEED_TERMS`. |
| Renderer-boot fix preserved | No new top-level `const _api`; no malformed inline `toast(...)` patterns. |
| SAM Sprint entitlements preserved | Free=1 NAICS / paid=many retained. |

---

## Prioritization summary

| Phase | Items | Theme |
|---|---|---|
| 22B | F01, F05, F06, F18, F25 | GovCon-first nav + Daily Rhythm + Deadline Calendar + Pre-RFP Intel |
| 22C | F02, F03, F04, F07, F12, F19 | Solicitation Workspace + Compliance Matrix + FAR helpers |
| 22D | F14, F15, F16 | Past Performance Library + Capability Statement Studio |
| 22E | F08, F09, F10, F11, F13, F17, F21, F24 | Teaming Workspace + Multi-Client + Vendor advisory |
| 22F | F22, F23 | Submission Readiness Gate + Export Bundle |
| 22G+ | F20 | Price-to-Win Advisory (needs public-data integration) |

**Total: 25 opportunities, 5 build phases inside the audit window, 1 deferred.**
