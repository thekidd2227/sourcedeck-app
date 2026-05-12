'use strict';

const GOVCON_TEMPLATE = Object.freeze({
  templateId: 'govcon',
  vertical: 'govcon',
  label: 'GovCon Capture Workflow',
  premium: true,
  farAware: true,
  stages: Object.freeze([
    'opportunity_intake',
    'qualification',
    'source_deck',
    'compliance_matrix',
    'proposal_draft',
    'stakeholder_review',
    'capture_actions',
    'submitted_or_archived'
  ]),
  initialTasks: Object.freeze([
    { actionType: 'verify_solicitation_source', title: 'Verify solicitation source' },
    { actionType: 'confirm_naics_set_aside_fit', title: 'Confirm NAICS/set-aside fit' },
    { actionType: 'review_deadline', title: 'Review deadline' },
    { actionType: 'generate_compliance_matrix', title: 'Generate compliance matrix' },
    { actionType: 'assign_capture_owner', title: 'Assign capture owner' }
  ]),
  allowedArtifactTypes: Object.freeze([
    'capture_deck',
    'compliance_matrix',
    'proposal_section',
    'stakeholder_graph',
    'follow_up_plan'
  ]),
  guardrails: Object.freeze([
    'Keep stakeholder handling FAR-aware.',
    'Do not imply agency endorsement or privileged access.',
    'Human review is required before proposal or compliance use.'
  ])
});

module.exports = GOVCON_TEMPLATE;
