# Phase 25H — Calendar ↔ GovCon Integration

**Date:** 2026-06-09
**Companion docs:** `docs/product/phase-25h-calendar-module-contract.md`, `docs/product/phase-25e2-proposal-workspace.md` (implied by Phase 25E.2).

---

## 1. Scope

Phase 25H connects the new Calendar module to the existing GovCon workspace (Phase 22–24) and the Phase 25E.2 Proposal Workspace via three link fields on every calendar event:

- `linkedSolicitationId` — free-text reference to a GovCon solicitation
- `linkedVendorId` — free-text reference to a vendor / subcontractor
- `linkedProposalSectionId` — dropdown of Phase 25E.2's 13 canonical proposal sections

Phase 25H ships the **schema + link fields + chip rendering**. Live cross-pane writeback (e.g., a GovCon Q&A deadline auto-creating a Calendar event) is reserved for a future phase.

## 2. Task types

Every calendar event carries a `taskType` so the buyer can categorize and filter. Phase 25H ships 11 task types covering the buyer-driven date-anchored work observed on Day 0:

| Task type | GovCon driver |
|---|---|
| `calendar-event` | Generic event (default). |
| `vendor-follow-up` | Buyer needs to chase a vendor for a quote / spec / clarification. |
| `quote-due` | Vendor is expected to return a priced quote by this date. |
| `appointment` | Scheduled meeting (internal, vendor, or partner). |
| `site-visit` | On-site walk-through. |
| `qa-deadline` | Solicitation Q&A submission deadline. |
| `proposal-deadline` | Final proposal submission deadline. |
| `internal-review` | Color review (pink / red / gold) or internal-review meeting. |
| `subcontractor-meeting` | Scheduled meeting with a sub or partner. |
| `proposal-section-work` | Block of focused drafting on a single Proposal Workspace section. |
| `other` | Buyer-defined. |

## 3. Status

Every event carries a `status` enum:

`scheduled` → `completed` (terminal)
`scheduled` → `missed` (terminal)
`scheduled` → `reschedule` (buyer updates date/time, status returns to `scheduled` on next save)
`scheduled` → `canceled` (terminal)

The Phase 25H Pilot Tracker integration (future-phase, see §6) can read the `missed` count as a Day 7 go/no-go signal.

## 4. Link fields

| Field | Type | UI |
|---|---|---|
| `linkedSolicitationId` | string | Free-text input on the event form. Renders as a blue chip on the event card. |
| `linkedVendorId` | string | Free-text input on the event form. Renders as a gold chip on the event card. |
| `linkedProposalSectionId` | enum (13 Phase 25E.2 sections + `''`) | Dropdown on the event form. Renders as a purple chip on the event card. |

The chips appear inline beneath the event title in every view (Today / Week / Month / List) so the buyer sees the GovCon context at a glance.

The 13 proposal-section options match Phase 25E.2 exactly:

```
table-of-contents
solicitation-summary
compliance-matrix
technical-approach
management-approach
staffing-key-personnel
past-performance
quality-control
risk-management
transition-mobilization
cost-price-volume
attachments-forms
final-internal-review
```

The sentinel `test/phase-25h-calendar-govcon-integration.test.js` asserts all 13 options ship on the dropdown.

## 5. Read-only posture

The integration is **read-only / link-only**. Phase 25H does **not**:

- Send a calendar invite to the linked vendor.
- Email the linked solicitation's CO/COR/KO.
- Upload the calendar event to SAM.gov / PIEE / eBuy / GSA.
- Auto-create a Calendar event when a GovCon section is updated.
- Auto-update a GovCon section when a Calendar event status changes.

The Phase 25A no-send / no-submit / no-upload posture extends verbatim. The Phase 25H sentinel asserts the pane contains no "Send Invite" / "Email Invite" / "Contact Vendor" / "Contact Agency" / "Upload to portal" controls.

## 6. Future-phase enhancements

| Enhancement | Status | Rationale |
|---|---|---|
| Auto-create a Calendar event when a GovCon deadline is set | Reserved for a future phase | Requires the GovCon pane to expose a writeback contract. Two-way sync increases the surface area materially; better to ship the link schema first, observe buyer usage, then design the writeback. |
| Pilot Tracker reads `missed` count as a Day 7 signal | Reserved | The Phase 25E.5 Pilot Tracker already counts open issues by severity; surfacing missed-deadline count is additive. Future phase. |
| Jump-to-section button on the event card | Reserved | When a `linkedProposalSectionId` is present, a "↗ Open in Proposal Workspace" button would route via `openTab('execution')` + `pwOpenSection(...)`. Phase 25H ships the data link; the jump UI is a small follow-up. |
| Solicitation ID becomes a real foreign key | Reserved | Currently free-text. When the GovCon Capture Command Center exposes a stable solicitation registry with IDs, the link field will become a dropdown. |

## 7. Sentinel coverage

`test/phase-25h-calendar-govcon-integration.test.js` asserts:

1. The event form surfaces `Linked solicitation ID`, `Linked vendor / sub`, and `Linked proposal section`.
2. The proposal-section dropdown ships all 13 Phase 25E.2 sections.
3. The form supports all 8 GovCon-flavored task types (`vendor-follow-up`, `quote-due`, `site-visit`, `qa-deadline`, `proposal-deadline`, `internal-review`, `subcontractor-meeting`, `proposal-section-work`).
4. The event card renders the three link chips (`linkedSolicitationId`, `linkedVendorId`, `linkedProposalSectionId`) when populated.
5. The pane contains no `Send Invite` / `Email Invite` / `Contact Vendor` / `Contact Agency` / `Upload to SAM/PIEE/eBuy/GSA` controls.
6. The five status keys (`scheduled`, `completed`, `missed`, `reschedule`, `canceled`) are defined in the status-pill palette.

---

## Signature

Phase 25H Calendar↔GovCon integration ships the schema + link fields + chip rendering + 8 GovCon-flavored task types. Live cross-pane sync is a future-phase enhancement. Phase 25A no-send/no-submit/no-upload posture extends verbatim.
