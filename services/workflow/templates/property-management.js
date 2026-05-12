'use strict';

const PROPERTY_MANAGEMENT_TEMPLATE = Object.freeze({
  templateId: 'property-management',
  vertical: 'property-management',
  label: 'Property Management Operations Workflow',
  premium: false,
  stages: Object.freeze([
    'request_intake',
    'triage',
    'vendor_assignment',
    'quote_review',
    'work_order',
    'completion_check',
    'invoice_followup'
  ]),
  initialTasks: Object.freeze([
    { actionType: 'triage_maintenance_request', title: 'Triage maintenance request' },
    { actionType: 'confirm_property_unit', title: 'Confirm property/unit details' },
    { actionType: 'assign_vendor', title: 'Assign vendor' }
  ]),
  allowedArtifactTypes: Object.freeze(['work_order', 'follow_up_plan'])
});

module.exports = PROPERTY_MANAGEMENT_TEMPLATE;
