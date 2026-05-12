'use strict';

const SMALL_BUSINESS_TEMPLATE = Object.freeze({
  templateId: 'small-business',
  vertical: 'small-business',
  label: 'Small Business Operations Workflow',
  premium: false,
  stages: Object.freeze([
    'request_intake',
    'qualification',
    'owner_assignment',
    'response_draft',
    'follow_up',
    'closeout'
  ]),
  initialTasks: Object.freeze([
    { actionType: 'qualify_request', title: 'Qualify request' },
    { actionType: 'assign_owner', title: 'Assign owner' },
    { actionType: 'draft_response', title: 'Draft response' }
  ]),
  allowedArtifactTypes: Object.freeze(['proposal_section', 'follow_up_plan'])
});

module.exports = SMALL_BUSINESS_TEMPLATE;
