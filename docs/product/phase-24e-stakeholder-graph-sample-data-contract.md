# Phase 24E — Stakeholder Graph Sample Data Contract

**Date:** 2026-06-08
**Branch:** `docs/phase-24e-stakeholder-graph-contract`
**Companion:** `docs/product/phase-24e-stakeholder-graph-implementation-contract.md`.
**Posture:** Docs-only sample-data specification. **No runtime, no test, no service.** The Phase 24E runtime PR uses this spec when populating the panel's default-state demo content.

---

## 1. Hard rules for all sample data

Every sample stakeholder row shipped by the Phase 24E PR MUST satisfy ALL of the following:

| Rule | Enforcement |
|---|---|
| Visible `SAMPLE` chip on the row | Phase 22B pattern (warn-color `IBM Plex Mono` 8.5 px chip). |
| `data-or-source="sample"` (or equivalent) on the row | Mirrors Phase 22B Operating Rhythm rows so the test contract can scan for the marker. |
| **No real private person names.** Role-only labels or clearly fictional placeholder names. | E.g., "Contracting officer (CO)" — not a real person's name. |
| **No real personal emails or phone numbers.** Use `example.gov` / `example.com` if a contact field is needed for layout demonstration. | No `@gmail.com`, `@yahoo.com`, no real `.gov` email of a real person. |
| **No secret / private agency data.** Generic, FOIA-safe placeholder data only. | No real solicitation numbers from non-public sources. |
| **No fake relationship claims.** Sample text must not imply that SourceDeck has a real relationship with any government official, agency, or vendor. | E.g., never "SourceDeck's contact at GSA." |
| **No fake award claims.** Sample text must not imply that any sample agency has awarded a contract to anyone. | E.g., never "Won 3 contracts at this office." |
| **No improper influence language.** None of the 12 forbidden phrases (see implementation contract §D). | Test contract regression-guards. |
| Generic organization names unless a clearly public example | E.g., "Sample Agency · IT services Office" rather than naming a real DoD program office. Real-public-record agencies (GSA, VA) are acceptable when the row's narrative is neutral. |
| Banner above sample rows that says "SAMPLE DEMO DATA — Replace before proposal use." | Mirror Phase 23A demo banner pattern. |

---

## 2. Sample stakeholder records

The Phase 24E PR ships the following **six** sample stakeholder rows in the panel's default state, one per category the contract calls for. Each row uses **only** the fields documented in the implementation contract §B.1.

> **Note:** the `posture` and `postureLabel` values below are verbatim from the backend `POSTURE_LABELS` map. The implementation contract requires the renderer to read these from `graph.postureLabels[node.posture]` at runtime — the Phase 24E PR may inline them in sample fixtures for the default empty state, but the live `gcRenderStakeholderGraph(graph)` path MUST read from the IPC return value.

### 2.1 Contracting office role (backend category: `contracting_office`)

```yaml
displayName: "Contracting officer (CO)"
organization: "Sample Agency · Contracting Office"
type: "contracting_office"
relationshipContext: "Linked to Sample RFP A (sample-only; replace before proposal use)"
allowedEngagementPosture: "restricted"
postureLabel: "Restricted. Communications are limited to the official mechanism named in the solicitation."
prohibitedActionWarning: "Restricted communication window — use the agency's official Q&A mechanism only. No direct outreach."
evidenceSourceNote: "SAMPLE — operator must verify against the live SAM.gov posting."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

### 2.2 Program office role (backend category: `program_office`)

```yaml
displayName: "Program / mission office"
organization: "Sample Agency · Program Office"
type: "program_office"
relationshipContext: "Approachable through industry days and agency capability briefings — sample only."
allowedEngagementPosture: "research_target"
postureLabel: "Research target. Approachable through public-record channels and industry days only."
prohibitedActionWarning: "Do not pitch during the restricted communication window. Engagement only via published forums."
evidenceSourceNote: "SAMPLE — operator must verify the agency's published forum guidance."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

### 2.3 Small Business Office role (backend category: `program_office` with SBS-flavored role string)

```yaml
displayName: "Small Business Specialist (SBS)"
organization: "Sample Agency · SBS Office"
type: "program_office"
relationshipContext: "Pre-RFP capability outreach generally appropriate at this office."
allowedEngagementPosture: "outreach_candidate"
postureLabel: "Outreach candidate. Standard pre-RFP teaming/capability outreach."
prohibitedActionWarning: "Confirm any agency-specific guidance before reaching out. Never solicit non-public source-selection information."
evidenceSourceNote: "SAMPLE — operator must verify the agency's SBS office contact via the agency's small-business page."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

### 2.4 Prime contractor role (backend category: `partner_prime_or_sub`)

```yaml
displayName: "Potential teaming partner (prime)"
organization: "Sample Prime Co. (sample only)"
type: "partner_prime_or_sub"
relationshipContext: "Candidate prime partner for SDVOSB or 8(a) team-up on Sample RFP A."
allowedEngagementPosture: "outreach_candidate"
postureLabel: "Outreach candidate. Standard pre-RFP teaming/capability outreach."
prohibitedActionWarning: "Mutual NDA standard before sharing capability details. No source-selection or pricing information exchanged."
evidenceSourceNote: "SAMPLE — replace with a vetted candidate from your past-performance library or subcontractor bench."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

### 2.5 Vendor / subcontractor role (backend category: `partner_prime_or_sub`)

```yaml
displayName: "Potential subcontractor / vendor"
organization: "Sample Vendor Co. (sample only)"
type: "partner_prime_or_sub"
relationshipContext: "Candidate vendor for cabling / IT installation scope on Sample RFP A."
allowedEngagementPosture: "outreach_candidate"
postureLabel: "Outreach candidate. Standard pre-RFP teaming/capability outreach."
prohibitedActionWarning: "Mutual NDA standard before sharing capability details. Verify FAR 52.219-14 limitation-of-subcontracting compliance before signing."
evidenceSourceNote: "SAMPLE — replace with a vendor from your subcontractor bench."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

### 2.6 Internal capture owner role (SYNTHETIC; renderer-only category: `internal_owner`)

```yaml
displayName: "Internal capture owner"
organization: "Your team (you)"
type: "internal_owner"          # SYNTHETIC — not one of the 5 backend categories
relationshipContext: "Local capture-team owner for this pursuit. Local note only."
allowedEngagementPosture: "internal"
postureLabel: "Internal capture planning only."
prohibitedActionWarning: "Local note; never transmitted by SourceDeck."
evidenceSourceNote: "SAMPLE — replace with the operator-team owner from your pursuit profile."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
synthetic: true                 # REQUIRED marker so tests / future backend calls never receive this
```

---

## 3. Optional sample row: industry-day respondent

If the Phase 24E PR also ships a sample for the `industry_day` backend category, this is the canonical shape. It is **optional** in the default state but is the right pattern when the operator selects a Sources Sought / pre-RFP opportunity.

```yaml
displayName: "Industry-day / Sources-Sought respondents"
organization: "Other respondents (public list if agency publishes one) — sample only"
type: "industry_day"
relationshipContext: "Engagement appropriate when the agency publishes a respondents list and/or hosts an industry day."
allowedEngagementPosture: "engagement_candidate"
postureLabel: "Engagement candidate IF allowed by the solicitation and agency."
prohibitedActionWarning: "Never solicit non-public information from respondents. Honor agency-published participation rules."
evidenceSourceNote: "SAMPLE — operator must verify the agency's published respondents list."
lastUpdated: "Last updated: Not yet"
sampleDemoLabel: "SAMPLE"
```

---

## 4. Forbidden in any sample row

The Phase 24E test contract regression-guards each of these. None of the following may appear in any sample row's text:

| Forbidden phrase | Why |
|---|---|
| Any real person's name | Privacy + procurement integrity. |
| Any real email address with `.gov` or non-`example.com` domain | Same. |
| Any real phone number | Same. |
| "Contact CO" / "Email COR" / "Send to contracting officer" | Implies outreach permission against backend `restricted` posture. |
| "Influence buyer" / "Lobby this office" / "Backchannel" / "Circumvent competition" | Procurement-integrity violation framing. |
| "Submit to agency" / "Agency submission complete" / "Portal upload" (positive claim) | Implies SourceDeck submits or uploads. |
| "Guaranteed award" / "Guaranteed revenue" | No outcome guarantee is claimed anywhere. |
| "Preferred relationship" / "Insider track" | Pre-decisional bias framing. |
| FedRAMP / SOC 2 / CMMC / HIPAA / HITRUST / ISO 27001 / signed-and-notarized / Apple-notarized | Unsupported compliance claim. |
| `$79` / `$349` / `$999` | Deprecated pricing. |

---

## 5. Banner above sample rows

The Phase 24E PR ships this banner verbatim immediately above the sample stakeholder rows:

> **SAMPLE DEMO DATA — Replace before proposal use.** The rows below are operator-loaded SAMPLE / DEMO ONLY data. No row reflects a real agency contact, real procurement relationship, real award, or real submission status. SourceDeck does not contact government officials, submit materials, upload to portals, or guarantee procurement outcomes.

---

## 6. Audit-log emission expectation

When the operator triggers a stakeholder graph render (initial load, refresh, or opportunity switch), the Phase 24E PR SHOULD emit a single audit-log event via the existing audit IPC bridge (already wired in Phase 24B):

```js
// pseudocode
window.sd.audit?.add?.({
  eventType: 'STAKEHOLDER_GRAPH_VIEWED',
  status: 'ok',
  metadata: { opportunityId: graph.opportunityId, nodeCount: graph.nodes.length, inRestrictedWindow: graph.inRestrictedWindow }
});
```

**No PII** in audit metadata. **No node labels** (which could carry operator-entered names) in audit metadata. The audit-log service already redacts forbidden keys (`apiKey`, `authorization`, `token`, `bearer`, `secret`, `password`, etc.) — see `services/audit/audit-log.js#FORBIDDEN_KEYS`.

---

## 7. Sample data file location

The Phase 24E PR may inline these six sample records directly in the renderer's HTML (same pattern as Phase 22B Operating Rhythm panels) OR keep them in a separate `<script>` block constant for testability. **No `services/**` sample-data file is required** — the implementation contract is renderer-only.
