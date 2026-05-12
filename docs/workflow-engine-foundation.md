# SourceDeck Workflow Engine Foundation

SourceDeck now has a **platform-neutral workflow foundation** under `services/workflow`. The engine is designed to run in Node without Electron, DOM APIs, browser storage, external network calls, or exposed renderer credentials. This gives the desktop app, future web backend, and test harness a shared operational core instead of hard-coding workflow logic in UI surfaces.

## Purpose

The workflow engine converts an intake payload into a structured operational workflow. It normalizes tenant, user, workspace, intake, and secret-reference entities; classifies the intake into a vertical template; creates initial tasks; creates human-review-required artifact drafts; scores workflow readiness; and emits redacted audit events.

This implementation is intentionally service-only. It **does not expose the non-GovCon verticals in the UI yet**. The goal is to create the backend foundation first so small business, property management, and service-company workflows can be productized without duplicating UI-only logic.

## Implemented Files

| Area | File | Role |
|---|---|---|
| Service exports | `services/workflow/index.js` | Public service surface for app and future backend use. |
| Entity normalization and classification | `services/workflow/intake.js` | Normalizes tenant/user/workspace/intake/secret refs and classifies intake into a vertical. |
| Workflow orchestration | `services/workflow/workflow.js` | Creates workflows from intake, selects templates, generates tasks, scores, and audits. |
| Tasks | `services/workflow/tasks.js` | Creates and updates plain JSON workflow tasks. |
| Artifacts | `services/workflow/artifacts.js` | Creates structured draft artifacts requiring human review. |
| Scoring | `services/workflow/scoring.js` | Produces deterministic readiness scoring without AI calls. |
| Audit events | `services/workflow/audit-events.js` | Creates audit events and redacts secrets, bearer tokens, emails, and phone numbers. |
| GovCon template | `services/workflow/templates/govcon.js` | Premium FAR-aware capture workflow foundation. |
| Future vertical template | `services/workflow/templates/property-management.js` | Property management maintenance/work-order routing foundation. |
| Future vertical template | `services/workflow/templates/service-company.js` | Service-company job/estimate/dispatch workflow foundation. |
| Future vertical template | `services/workflow/templates/small-business.js` | General SMB intake/owner/follow-up workflow foundation. |
| Tests | `test/workflow-engine.test.js` | Verifies classification, workflow creation, artifact review boundaries, audit redaction, template list, and API adapter exposure. |

## API Adapter Surface

The app adapter in `api/index.js` now exposes a `workflow` namespace:

| Method | Purpose |
|---|---|
| `workflow.classifyIntake(input)` | Classifies an intake payload into GovCon, property management, service-company, or small-business. |
| `workflow.createFromIntake(input)` | Creates a normalized workflow bundle from tenant/user/workspace/intake inputs. |
| `workflow.createTask(input)` | Creates a plain JSON task. |
| `workflow.updateTask(task, patch)` | Updates a plain JSON task. |
| `workflow.createArtifactDraft(input)` | Creates a structured artifact draft with mandatory human-review status. |
| `workflow.listTemplates()` | Lists available vertical templates without exposing implementation internals. |

## Security and Boundary Rules

The workflow service does not read credential values. Credential-bearing fields are treated as references only, and audit metadata is redacted before it leaves the service. Artifact generation currently creates structured placeholders only; it does not call AI providers, Apollo, Airtable, or external systems.

> The operational boundary is deliberate: workflow classification and task orchestration can run anywhere, while credentialed integrations must remain inside trusted service/provider wrappers.

## Current Non-Goals

The first implementation does not add new renderer UI, database persistence, multi-tenant authorization, or server-side queues. Those should be layered on after the core workflow model is stable and test-covered. The non-GovCon templates exist as backend foundations only until the product is ready to expose them through a packaged onboarding and pricing strategy.

## Validation

Run the dedicated workflow test with:

```bash
node test/workflow-engine.test.js
```

Run the complete repository test suite with:

```bash
npm test
```
