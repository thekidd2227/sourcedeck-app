# SourceDeck Workspace Readiness Banners

Workspace readiness banners help a user understand why SourceDeck is not
ready to generate, approve, schedule, or send campaign content yet. The
banner should solve setup confusion without pretending the product has
verified more than it actually knows.

This repository currently defines the product/spec surface. It does not
ship a live dashboard, integration health service, or backend readiness
endpoint.

## Executive conclusion

Build workspace readiness banners as the first UX improvement because
they reduce the most expensive early friction: users landing in an empty
or partially configured workspace and not knowing what to fix next.

The banner should not be a generic alert. It should be an operator-facing
setup control that says:

- what is missing
- why it matters
- what action fixes it
- whether the issue blocks content, scheduling, or approval
- whether the status is based on real data or demo/sample state

## User problem solved

Users may see empty dashboards, disabled content actions, weak AI
outputs, or incomplete campaign states without understanding the root
cause. That creates support burden, abandoned onboarding, and unsafe
expectations around AI-generated content.

The readiness banner converts hidden setup requirements into visible,
actionable next steps.

## Proposed UI behavior

Show the banner at the top of high-value work surfaces:

- Dashboard
- Campaign workspace
- Premium Content Agent surface
- Settings / integrations

The banner should:

- appear when any required or recommended setup item is actionable
- group issues by severity: critical, warning, info
- show no more than the most important 3 items by default
- include a "Show all setup items" expansion when more issues exist
- allow session dismissal for non-critical items
- reappear when a new critical issue appears
- hide when all required checks are ready

Recommended banner copy pattern:

```text
Workspace setup needs attention
3 items are limiting campaign readiness.

[Complete profile] [Add API key] [Connect platform]
```

Each row should use direct language:

```text
AI key not connected
Drafting and review features cannot run until an approved provider key is added.
```

Avoid overclaiming language:

- Do not say "safe to send" from this banner alone.
- Do not say "fully operational" unless every required backend check exists.
- Do not say "compliant" unless a separate compliance workflow supports it.

## Readiness checks

| Check | User problem solved | UI behavior | Data dependency | Tier impact | Overclaiming risk | Can implement now? |
|---|---|---|---|---|---|---|
| Workspace profile | SourceDeck lacks business context. | Critical row if workspace name, business type, audience, or offer is missing. | Workspace profile state. | All tiers. | Low. | Yes if profile state exists. |
| API key | User does not know why AI features are unavailable. | Critical row with plain-language setup CTA. | API key saved/validated status. | All tiers can see state; provider availability may be tiered. | Medium. Security copy must match backend reality. | Requires backend validation for real status. |
| Platform connections | User cannot tell why scheduling or readiness is blocked. | Warning row for missing, expired, or degraded social connection. | Provider auth, scopes, token expiry, sync health. | All tiers can see readiness; scheduling may be gated. | Medium. Need real timestamp for "last checked." | Requires integration health checks. |
| Brand profile | AI content may sound generic or make weak claims. | Info row linking to brand voice and claim boundaries. | Brand profile fields. | Basic profile all tiers; advanced claim rules premium. | High. Brand setup does not guarantee safe content. | Yes if brand state exists. |
| Approval owner | Drafts can stall without a clear approver. | Warning row when no approval owner is set. | Approval workflow settings. | Single approver all tiers; multi-reviewer premium. | Low. | Yes if owner field exists. |
| Content sources | AI has no evidence to draft from. | Info row prompting uploads, URLs, or demo mode. | Source library / approved evidence records. | Basic sources all tiers; repo ingestion premium. | High. Sources improve confidence but do not guarantee accuracy. | Requires backend source state. |
| Campaign goal | Campaign work lacks a clear objective. | Info row with inline selector on campaign screens. | Campaign settings. | All tiers; premium can use goal for recommendations. | Medium. Goal selection does not guarantee performance. | Yes if campaign state exists. |
| Demo mode | User may confuse sample data with real readiness. | Persistent demo banner across relevant screens. | Demo mode flag. | All tiers and sales demos. | High. Every sample metric must be labeled. | Yes if demo flag exists. |

## Severity model

Critical:

- blocks core setup
- prevents AI drafting or review
- creates a misleading workspace state if hidden

Warning:

- does not block all work
- may block scheduling, approvals, or platform readiness
- should remain visible until resolved or session-dismissed

Info:

- improves quality or confidence
- should not feel like an error
- can be collapsed after the user understands it

## Tier impact

Workspace readiness should be shown across product tiers because it
protects activation. The banner may mention locked premium capabilities
only when that information helps the user understand a missing setup
item.

Recommended tier behavior:

- Core and entry tiers: show basic setup readiness and locked previews for premium
  checks.
- Pro: show campaign readiness, basic source status, and setup blockers.
- Operator/Enterprise: show premium readiness checks, approval workflow
  status, source quality status, and advanced integration health.

Do not use readiness banners as aggressive upgrade ads. The banner should
primarily help the user complete setup.

## Data and integration dependencies

Frontend-only or existing state:

- workspace profile completeness
- campaign goal selected
- brand profile exists
- approval owner assigned
- demo mode active

Backend status endpoint needed:

- API key stored
- API key validation result
- content source count and approval status

Integration health checks needed:

- provider connected
- token expired
- permission scopes missing
- last sync failed
- last checked timestamp

Suggested backend response shape:

```json
{
  "workspaceId": "workspace_123",
  "checkedAt": "2026-05-26T12:00:00Z",
  "items": [
    {
      "id": "api-key",
      "status": "missing",
      "severity": "critical",
      "source": "backend",
      "actionTarget": "/settings/integrations/ai"
    }
  ]
}
```

## Files likely to change in a UI implementation

Likely frontend files:

- `src/content/workspaceReadinessBanner.ts`
- `src/components/workspace/WorkspaceReadinessBanner.tsx`
- `src/components/workspace/WorkspaceReadinessItem.tsx`
- `src/lib/workspaceReadiness.ts`
- `src/pages/dashboard/*` or `src/app/dashboard/*`
- `src/pages/campaigns/*` or `src/app/campaigns/*`
- `src/pages/settings/integrations/*` or `src/app/settings/integrations/*`

Likely backend files, once a backend exists:

- `api/workspace/readiness`
- `api/integrations/health`
- `services/workspaceReadiness`
- `services/integrationHealth`
- `models/workspace`
- `models/integrationConnection`

## Implementation recommendation

Build this in two passes.

Pass 1: frontend/spec quick win

- define readiness item taxonomy
- render static/read-only banner from existing local state
- support severity sorting and session dismissal
- label demo data clearly

Pass 2: backend-backed readiness

- add readiness endpoint
- add API key validation state
- add platform health checks
- add source approval status
- add last-checked timestamps

## Do not build yet

Do not build a broad "workspace is safe to send" badge from this banner.
That belongs to a separate safe-to-send campaign checklist with content,
platform, approval, link, and claim-confidence checks.

Do not build exact revenue or performance claims into readiness banners.
Missing setup can block activation, but it should not be translated into
lost revenue unless SourceDeck has reliable attribution data.
