# Premium Content Agent — Examples

> **All example outputs below are illustrative.** They are not real
> ingestion results from any user's repository, document, or pipeline.
> They demonstrate the format the agent produces when fully wired.
> The Premium Content Agent is a **highest paid tier only** SourceDeck
> feature; watsonx is the planned model provider.
>
> Required GovCon positioning line for examples: SourceDeck helps small
> businesses organize GovCon pursuit workflows, prepare review-ready
> outreach/content, and manage capture activity with human approval at
> every decision point.

---

## 1. LinkedIn text-only authority post from a GitHub README

- **Input source:** Public GitHub repository README for a fictional
  SourceDeck-adjacent OSS tool, "PipelineGate."
- **Extracted insight:** README headline says "stop chasing dead
  pipeline" and lists three feature bullets — deal-age decay scoring,
  CRM hygiene checks, and stale-deal alerts.
- **Recommended post type:** `text_authority`
- **Draft post:**

  Most pipelines do not die from bad deals. They die from old deals
  that nobody is willing to kill.

  Three signals we watch for:
  1. Deal age > 90 days with no buyer-side activity.
  2. CRM "Next Step" that is the same word for the third week.
  3. A close-date that has moved more than twice.

  Each one is a small embarrassment. Together, they are a forecast
  problem.

- **CTA:** "What's the rule on your team for killing a stale deal?
  I want to learn how others enforce it." *(comment-prompt CTA tied
  to the `authority` goal.)*
- **Hashtags:** `#SourceDeck #PipelineHygiene #RevenueOps #GTMOps
  #SalesLeadership #ForecastDiscipline #B2BSales #PipelineReview
  #DealDeskOps #OperationsLeaders`
- **Claim confidence:**
  - "Pipelines die from old deals" — **inferred** (from README tone).
  - "Three signals" — **verified** (README enumerates them).
  - "Forecast problem" — **inferred**.

---

## 2. LinkedIn poll from pipeline bottleneck data

- **Input source:** SourceDeck pipeline export showing 31 opportunities
  stuck in "Proposal Drafting" for >14 days.
- **Extracted insight:** The dominant stall is at proposal drafting.
- **Recommended post type:** `poll`
- **Draft post:**

  Where does your B2G / GovCon pipeline stall the most?

  - Capture / qualification
  - Proposal drafting
  - Pricing review
  - Submission readiness

  Curious which one quietly costs your team the most calendar weeks.

- **CTA:** Vote prompt is the CTA. *(poll format, `authority` + `trust`
  goal.)*
- **Hashtags:** `#SourceDeck #GovCon #GovernmentContracting
  #ProposalOperations #CaptureManagement #BidReadiness
  #OpportunityPipeline #SmallBusinessContractors #FederalContracting
  #OperationsLeaders`
- **Claim confidence:**
  - "Drafting is the stall" — **inferred** (from one user's pipeline,
    not generalizable).
  - Stall categories — **verified** (these are SourceDeck stages).

---

## 3. LinkedIn document / PDF outline from a capability statement

- **Input source:** User-uploaded capability statement PDF.
- **Extracted insight:** The statement lists 4 NAICS codes, a
  HUBZone designation, and 6 past-performance projects.
- **Recommended post type:** `document_pdf_outline`
- **Draft post (outline only — final carousel images approved by user
  before publish):**

  Slide 1 — "What our HUBZone team actually delivers"
  Slide 2 — Our 4 NAICS lanes + why each is a tight fit
  Slide 3 — Past performance #1: scope, agency, outcome
  Slide 4 — Past performance #2: scope, agency, outcome
  Slide 5 — Past performance #3: scope, agency, outcome
  Slide 6 — What we say no to (this is the trust slide)
  Slide 7 — How to start a conversation that respects your timeline

- **CTA:** "If your CO needs a clean capability statement on file,
  reply and I will send the current version."
- **Hashtags:** `#SourceDeck #GovCon #GovernmentContracting #HUBZone
  #CapabilityStatement #SmallBusinessContractors #FederalContracting
  #ProposalOperations #CaptureManagement #VeteranOwnedBusiness`
- **Claim confidence:**
  - NAICS lanes — **verified**.
  - HUBZone — **verified**.
  - Past performance summary — **verified** if the user has
    customer-disclosure approval; otherwise **inferred**.

---

## 4. Facebook service education post from uploaded service menu

- **Input source:** Uploaded service menu CSV.
- **Extracted insight:** Three top-purchased services and three
  newer services the user wants to grow.
- **Recommended post type:** `service_education`
- **Draft post:**

  Quick refresher on what we actually do for small business owners
  in town:

  - Bookkeeping cleanup before tax season
  - QuickBooks setup that doesn't fall apart in month two
  - Monthly close so you stop guessing at your numbers

  Newer services we are taking on: payroll setup, 1099 prep, and
  light financial-coaching sessions for owners who want to read their
  own P&L.

- **CTA:** "Message us with what you've been putting off — happy to
  point you in the right direction."
- **Hashtags:** `#SourceDeck #SmallBusiness #BusinessGrowth #Operations`
- **Claim confidence:** all **verified** (from the user's own menu).

---

## 5. Website CTA post from product landing page

- **Input source:** Public product landing page.
- **Extracted insight:** Landing page promises a 14-day pilot and
  lists three outcome bullets.
- **Recommended post type:** `website_cta` (LinkedIn variant)
- **Draft post:**

  Quick note for ops leaders evaluating SourceDeck:

  The 14-day pilot is the cleanest way to see whether we are right
  for your team. You get the pipeline-discipline pieces, the document
  workspace, and the vendor tracker — without rebuilding your CRM.

  If you would rather start with a guided walkthrough, the link below
  is the right starting point.

- **CTA:** "Walkthrough link in the first comment." *(traffic goal.)*
- **Hashtags:** `#SourceDeck #GovCon #OperationsLeaders
  #OpportunityPipeline #DocumentControl #VendorTracking
  #ComplianceTracking #BidReadiness #SmallBusinessContractors
  #FederalContracting`
- **Claim confidence:**
  - 14-day pilot — **verified** (on landing page).
  - "Cleanest way" — **inferred** (positioning).
  - Outcome bullets — **verified**.

---

## 6. Feature / benefit post from changelog

- **Input source:** Public CHANGELOG.md.
- **Extracted insight:** Latest release added vendor-tracking import
  and a new opportunity-stage filter.
- **Recommended post type:** `product_feature_spotlight`
- **Draft post:**

  Two changes that quietly remove friction in this release:

  1. Vendor import — drop in a CSV and your subcontractor bench is
     populated without retyping.
  2. Opportunity-stage filter — see every deal stuck in a stage you
     actually care about, not every stage.

  Neither is glamorous. Both save calendar time.

- **CTA:** "What is the most boring thing in your stack you wish
  someone would just fix? I read every reply."
- **Hashtags:** `#SourceDeck #OperationsLeaders #B2BSoftware
  #VendorTracking #OpportunityPipeline #SmallBusinessContractors
  #GovCon #ProductUpdate #GovernmentContracting #BidReadiness`
- **Claim confidence:** features **verified** (from changelog),
  framing **inferred**.

---

## 7. GovCon credibility post from proposal workflow

- **Input source:** Proposal workflow record (redacted by user).
- **Extracted insight:** The workflow record shows the team used a
  structured internal review checklist before proposal submission.
- **Recommended post type:** `govcon_authority`
- **Draft post:**

  SourceDeck helps small businesses organize GovCon pursuit workflows,
  prepare review-ready outreach/content, and manage capture activity
  with human approval at every decision point.

  That matters because proposal work is not just writing. It is
  deadlines, clarification windows, past performance, pricing inputs,
  subcontractor notes, and review gates that need one place to live.

  The tool prepares the draft trail. The operator still reviews,
  approves, and decides.

- **CTA:** "If your team is tightening capture discipline this quarter,
  this is the workflow layer worth reviewing."
- **Hashtags:** `#SourceDeck #GovCon #GovernmentContracting
  #ProposalOperations #CaptureManagement #ComplianceTracking
  #BidReadiness #FederalContracting #DocumentControl
  #SmallBusinessContractors`
- **Claim confidence:**
  - Required positioning sentence — **verified** (SourceDeck product
    positioning).
  - Workflow examples — **candidate** unless the user's opportunity
    record supports each workflow.
  - General framing — **inferred** and user-reviewed.

---

## 8. Diagnostic / POV post from operational bottleneck

- **Input source:** SourceDeck pipeline + vendor activity showing
  repeated 5-day delays in pricing review.
- **Extracted insight:** The bottleneck is pricing review, not
  drafting.
- **Recommended post type:** `pipeline_lesson` (LinkedIn)
- **Draft post:**

  A diagnostic note for capture leads.

  When your proposals slip, it is rarely the drafting. It is the
  pricing review.

  Drafting is loud, visible, and on the calendar. Pricing review
  hides inside two or three people's heads, gets bumped for client
  emergencies, and surfaces 72 hours before submission as a "quick
  sanity check."

  Two things help:
  1. Move pricing review off the proposal timeline and onto the
     capture timeline.
  2. Make the reviewer name the assumption they are protecting, not
     the number they are landing on.

- **CTA:** "What is the rule your team uses to stop pricing review
  from being the last thing that happens?"
- **Hashtags:** `#SourceDeck #GovCon #CaptureManagement
  #ProposalOperations #PricingReview #BidReadiness
  #GovernmentContracting #OperationsLeaders #FederalContracting
  #OpportunityPipeline`
- **Claim confidence:**
  - "Pricing review is the stall" — **inferred** (from the user's
    pipeline, not a general truth).
  - The two-step prescription — **candidate** (point-of-view from
    the agent; the user must edit it to match their actual practice
    before publishing).
