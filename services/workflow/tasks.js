'use strict';

function createTask(input) {
  const src = _asObject(input);
  return _stripUndefined({
    taskId: _string(src.taskId || _id('task')),
    workflowId: _string(src.workflowId),
    assignee: _string(src.assignee || src.ownerUserId || 'unassigned'),
    dueAt: _iso(src.dueAt || _defaultDueAt()),
    actionType: _string(src.actionType || 'manual_review'),
    status: _string(src.status || 'open'),
    title: _string(src.title || src.actionType || 'Manual review')
  });
}

function updateTask(task, patch) {
  const current = createTask(task || {});
  const next = Object.assign({}, current, _asObject(patch));
  return createTask(next);
}

function createInitialTasks({ workflow, template, ownerUserId, now } = {}) {
  const taskSpecs = Array.isArray(template && template.initialTasks) ? template.initialTasks : [];
  const baseTime = typeof now === 'function' ? now() : Date.now();
  return taskSpecs.map((spec, idx) => createTask({
    taskId: _id(`task_${idx + 1}`),
    workflowId: workflow && workflow.workflowId,
    assignee: idx === taskSpecs.length - 1 ? (ownerUserId || 'unassigned') : 'unassigned',
    dueAt: new Date(baseTime + (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
    actionType: spec.actionType,
    status: 'open',
    title: spec.title
  }));
}

function _defaultDueAt() {
  return Date.now() + 24 * 60 * 60 * 1000;
}

function _id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _iso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
  createTask,
  updateTask,
  createInitialTasks,
  _internal: { _id }
};
