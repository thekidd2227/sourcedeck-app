'use strict';

const SERVICE_COMPANY_TEMPLATE = Object.freeze({
  templateId: 'service-company',
  vertical: 'service-company',
  label: 'Service Company Job Workflow',
  premium: false,
  stages: Object.freeze([
    'job_intake',
    'qualification',
    'estimate',
    'scheduling',
    'work_execution',
    'follow_up',
    'closeout'
  ]),
  initialTasks: Object.freeze([
    { actionType: 'qualify_job_request', title: 'Qualify job request' },
    { actionType: 'confirm_service_address', title: 'Confirm service address' },
    { actionType: 'prepare_estimate', title: 'Prepare estimate' }
  ]),
  allowedArtifactTypes: Object.freeze(['estimate', 'follow_up_plan'])
});

module.exports = SERVICE_COMPANY_TEMPLATE;
