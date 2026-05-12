'use strict';

const intake = require('./intake');
const workflow = require('./workflow');
const tasks = require('./tasks');
const artifacts = require('./artifacts');
const scoring = require('./scoring');
const auditEvents = require('./audit-events');

module.exports = Object.freeze({
  ...intake,
  ...workflow,
  ...tasks,
  ...artifacts,
  ...scoring,
  ...auditEvents,
  templates: workflow.TEMPLATES
});
