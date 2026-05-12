'use strict';

const assert = require('assert');
const workflow = require('../services/workflow');
const credentials = require('../services/settings/credentials');
const { createAppApi } = require('../api');

console.log('\nworkflow-engine tests');

(function testGovConClassification() {
  const result = workflow.classifyIntake({
    source: 'manual',
    payload: {
      subject: 'SAM.gov RFP opportunity',
      body: 'Need capture review for NAICS 561210 set-aside with contracting officer deadline next week.'
    }
  });
  assert.strictEqual(result.vertical, 'govcon');
  assert.strictEqual(result.suggestedTemplate, 'govcon');
  assert.ok(result.confidence >= 0.6);
  assert.ok(result.reasons.some((reason) => /sam\.gov|naics|rfp/i.test(reason)));
})();

(function testWorkflowCreationProducesPlainJson() {
  const result = workflow.createWorkflowFromIntake({
    tenant: { tenantId: 'tenant_1', name: 'Test Tenant' },
    user: { userId: 'user_1', email: 'operator@example.com' },
    workspace: { workspaceId: 'workspace_1', name: 'Federal Capture' },
    intake: {
      intakeId: 'intake_1',
      payload: {
        description: 'RFP from SAM.gov for facilities support. FAR-aware stakeholder follow-up needed.',
        deadline: '2026-07-15'
      }
    },
    now: () => Date.parse('2026-05-12T12:00:00.000Z')
  });

  assert.strictEqual(result.workflow.intakeId, 'intake_1');
  assert.strictEqual(result.workflow.verticalTemplate, 'govcon');
  assert.strictEqual(result.template.premium, true);
  assert.ok(Array.isArray(result.tasks));
  assert.ok(result.tasks.length >= 4);
  assert.ok(result.tasks.every((task) => task.workflowId === result.workflow.workflowId));
  assert.strictEqual(result.auditEvent.action, 'workflow.created_from_intake');
  assert.doesNotThrow(() => JSON.stringify(result));
})();

(function testSmallBusinessDefault() {
  const result = workflow.createWorkflowFromIntake({
    tenant: { tenantId: 'tenant_2' },
    intake: { payload: { body: 'Client inquiry needs follow-up and owner assignment.' } }
  });
  assert.strictEqual(result.workflow.verticalTemplate, 'small-business');
})();

(function testArtifactDraftRequiresHumanReview() {
  const draft = workflow.createArtifactDraft({
    workflow: { workflowId: 'workflow_1' },
    type: 'compliance_matrix',
    sourceRefs: [{ type: 'document', ref: 'rfp.pdf', label: 'RFP' }]
  });
  assert.strictEqual(draft.workflowId, 'workflow_1');
  assert.strictEqual(draft.reviewStatus, 'draft_requires_human_review');
  assert.match(draft.content.note, /Human review is required/i);
})();

(function testAuditRedaction() {
  const event = workflow.createAuditEvent({
    tenantId: 'tenant_3',
    actor: 'operator',
    action: 'workflow.test',
    metadata: {
      apiKey: 'SECRET_SHOULD_NOT_SURFACE',
      note: 'Email boss@example.com and call 555-123-4567 with Bearer abcdef123456'
    }
  });
  const flat = JSON.stringify(event);
  assert.ok(!flat.includes('SECRET_SHOULD_NOT_SURFACE'));
  assert.ok(!flat.includes('boss@example.com'));
  assert.ok(!flat.includes('555-123-4567'));
  assert.ok(!flat.includes('abcdef123456'));
  assert.match(flat, /redacted/);
})();

(function testTemplateListHasFourVerticals() {
  const templates = workflow.listTemplates();
  const ids = templates.map((template) => template.templateId).sort();
  assert.deepStrictEqual(ids, ['govcon', 'property-management', 'service-company', 'small-business'].sort());
})();

(async function testApiAdapterExposure() {
  const api = createAppApi({
    store: { get: () => undefined, set: () => undefined },
    credentials: credentials.createMemoryCredentialStore()
  });
  assert.ok(api.workflow);
  assert.deepStrictEqual(
    Object.keys(api.workflow).sort(),
    ['classifyIntake', 'createArtifactDraft', 'createFromIntake', 'createTask', 'listTemplates', 'updateTask'].sort()
  );
  const classification = await api.workflow.classifyIntake({ payload: { body: 'tenant unit maintenance work order' } });
  assert.strictEqual(classification.vertical, 'property-management');
  const serialized = JSON.stringify(await api.workflow.createFromIntake({ intake: { payload: { body: 'lead follow-up needed' } } }));
  assert.ok(!/api[_-]?key|secret|token|password/i.test(serialized));
})().then(() => {
  console.log('workflow-engine tests passed');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
