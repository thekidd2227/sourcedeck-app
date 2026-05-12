'use strict';

const ALLOWED_ARTIFACT_TYPES = Object.freeze([
  'capture_deck',
  'compliance_matrix',
  'proposal_section',
  'stakeholder_graph',
  'work_order',
  'estimate',
  'follow_up_plan'
]);

function createArtifactDraft({ workflow, type, sourceRefs } = {}) {
  const workflowId = workflow && workflow.workflowId;
  const artifactType = _string(type);
  if (!ALLOWED_ARTIFACT_TYPES.includes(artifactType)) {
    throw new Error(`workflow artifact: unsupported artifact type ${artifactType || '<empty>'}`);
  }
  return {
    artifactId: _id('artifact'),
    workflowId: _string(workflowId),
    type: artifactType,
    sourceRefs: _array(sourceRefs).map(_normalizeSourceRef),
    reviewStatus: 'draft_requires_human_review',
    generatedBy: 'workflow_engine_placeholder',
    content: {
      title: _titleForType(artifactType),
      sections: [],
      note: 'Structured placeholder only. No AI generation was used. Human review is required before operational use.'
    },
    createdAt: new Date().toISOString()
  };
}

function _normalizeSourceRef(ref) {
  const src = ref && typeof ref === 'object' && !Array.isArray(ref) ? ref : { ref };
  return {
    type: _string(src.type || 'source'),
    ref: _string(src.ref || src.id || src.url || src.name),
    label: _string(src.label || src.name || src.title || src.ref || 'source')
  };
}

function _titleForType(type) {
  return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function _id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _array(value) {
  return Array.isArray(value) ? value : [];
}

function _string(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

module.exports = {
  ALLOWED_ARTIFACT_TYPES,
  createArtifactDraft
};
