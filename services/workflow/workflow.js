'use strict';

const { normalizeTenant, normalizeUser, normalizeWorkspace, normalizeIntake, classifyIntake } = require('./intake');
const { createInitialTasks } = require('./tasks');
const { scoreIntake } = require('./scoring');
const { createAuditEvent } = require('./audit-events');
const govcon = require('./templates/govcon');
const propertyManagement = require('./templates/property-management');
const serviceCompany = require('./templates/service-company');
const smallBusiness = require('./templates/small-business');

const TEMPLATES = Object.freeze({
  govcon,
  'property-management': propertyManagement,
  'service-company': serviceCompany,
  'small-business': smallBusiness
});

function listTemplates() {
  return Object.values(TEMPLATES).map((template) => ({
    templateId: template.templateId,
    vertical: template.vertical,
    label: template.label,
    premium: !!template.premium,
    stages: Array.from(template.stages || []),
    allowedArtifactTypes: Array.from(template.allowedArtifactTypes || [])
  }));
}

function getTemplate(templateId) {
  const id = String(templateId || '').trim().toLowerCase();
  return TEMPLATES[id] || null;
}

function normalizeWorkflow(input) {
  const src = _asObject(input);
  return _stripUndefined({
    workflowId: _string(src.workflowId || src.id || _id('workflow')),
    intakeId: _string(src.intakeId),
    verticalTemplate: _string(src.verticalTemplate || src.templateId),
    stage: _string(src.stage || 'intake'),
    score: typeof src.score === 'number' ? src.score : Number(src.score || 0),
    ownerUserId: _string(src.ownerUserId),
    status: _string(src.status || 'open')
  });
}

function createWorkflowFromIntake({ tenant, user, workspace, intake, now } = {}) {
  const normalizedTenant = normalizeTenant(tenant || {});
  const normalizedUser = normalizeUser(user || {});
  const normalizedWorkspace = normalizeWorkspace(Object.assign({}, workspace || {}, {
    tenantId: (workspace && workspace.tenantId) || normalizedTenant.tenantId
  }));
  const normalizedIntake = normalizeIntake(Object.assign({}, intake || {}, {
    workspaceId: (intake && intake.workspaceId) || normalizedWorkspace.workspaceId
  }));
  const classification = classifyIntake(normalizedIntake);
  const template = getTemplate(classification.suggestedTemplate) || smallBusiness;
  const scoring = scoreIntake({ classification, intake: normalizedIntake, template });
  const stage = (template.stages && template.stages[0]) || 'intake';
  const workflow = normalizeWorkflow({
    workflowId: _id('workflow'),
    intakeId: normalizedIntake.intakeId,
    verticalTemplate: template.templateId,
    stage,
    score: scoring.score,
    ownerUserId: normalizedUser.userId || 'unassigned',
    status: 'open'
  });
  const tasks = createInitialTasks({
    workflow,
    template,
    ownerUserId: normalizedUser.userId,
    now
  });
  const auditEvent = createAuditEvent({
    tenantId: normalizedTenant.tenantId,
    actor: normalizedUser.userId || 'system',
    action: 'workflow.created_from_intake',
    objectRef: workflow.workflowId,
    metadata: {
      intakeId: normalizedIntake.intakeId,
      workspaceId: normalizedWorkspace.workspaceId,
      vertical: classification.vertical,
      templateId: template.templateId,
      score: scoring.score,
      reasons: classification.reasons
    }
  });

  return {
    tenant: normalizedTenant,
    user: normalizedUser,
    workspace: normalizedWorkspace,
    intake: normalizedIntake,
    classification,
    template: {
      templateId: template.templateId,
      vertical: template.vertical,
      label: template.label,
      premium: !!template.premium,
      farAware: !!template.farAware,
      stages: Array.from(template.stages || [])
    },
    workflow,
    tasks,
    auditEvent,
    scoring
  };
}

function _id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function _string(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function _stripUndefined(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'undefined') continue;
    if (typeof value === 'string' && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

module.exports = {
  TEMPLATES,
  listTemplates,
  getTemplate,
  normalizeWorkflow,
  createWorkflowFromIntake
};
