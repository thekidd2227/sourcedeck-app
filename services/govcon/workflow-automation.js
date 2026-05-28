// services/govcon/workflow-automation.js
//
// Layer 3: GovCon workflow automation for reusable add-on packaging.

'use strict';

const PIPELINE_STAGES = Object.freeze(['Research', 'Sub Sourcing', 'Pricing', 'Quote Draft', 'Bid Draft', 'Submitted', 'No-Bid', 'Killed']);

function createGovconWorkflowService(store, nowFn) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('govcon-workflow: store must implement get(key) and set(key, value)');
  }
  const now = nowFn || (() => Date.now());
  const ANALYSIS_KEY = 'govcon.middlemanAnalyses';
  const TASK_KEY = 'govcon.workflowTasks';
  const STAGE_KEY = 'govcon.pipelineStages';

  function saveAnalysis(opportunityId, analysis) {
    const rows = safeArray(store.get(ANALYSIS_KEY));
    const rec = {
      id: 'mfa_' + now().toString(36),
      opportunityId: String(opportunityId || analysis && analysis.opportunityId || ''),
      analysis,
      savedAt: new Date(now()).toISOString()
    };
    store.set(ANALYSIS_KEY, rows.concat(rec));
    return rec;
  }
  function moveStage(opportunityId, stage) {
    stage = PIPELINE_STAGES.includes(stage) ? stage : 'Research';
    const map = safeObject(store.get(STAGE_KEY));
    map[String(opportunityId || '')] = { stage, updatedAt: new Date(now()).toISOString() };
    store.set(STAGE_KEY, map);
    return map[String(opportunityId || '')];
  }
  function createTasks(opportunityId, analysis, opts) {
    opts = opts || {};
    const start = new Date(now());
    const templates = [
      ['verify_solicitation_facts', 'Verify solicitation facts', 1],
      ['contact_official_poc', 'Contact official POC only through allowed channels', 1],
      ['identify_subcontractors', 'Identify 3-5 qualified subcontractors', 2],
      ['request_sub_quotes', 'Request sub quotes', 3],
      ['verify_docs', 'Verify insurance/license/bonding', 4],
      ['prepare_quote_packet', 'Prepare quote packet', 5],
      ['review_compliance', 'Review compliance risks', 5],
      ['final_bid_no_bid', 'Final bid/no-bid decision', 6]
    ];
    const rows = safeArray(store.get(TASK_KEY));
    const tasks = templates.map(([type, title, offset]) => ({
      id: 'task_' + now().toString(36) + '_' + type,
      opportunityId: String(opportunityId || ''),
      type,
      title,
      dueDate: addDays(start, offset).toISOString().slice(0, 10),
      status: 'open',
      sourceDecision: analysis && analysis.decision || '',
      createdAt: new Date(now()).toISOString()
    }));
    store.set(TASK_KEY, rows.concat(tasks));
    return tasks;
  }
  function storeChecklist(opportunityId, analysis) {
    const missingData = (analysis && analysis.missingData) || [];
    const complianceWarnings = (analysis && analysis.warnings) || [];
    const profitAssumptions = (analysis && analysis.profitStressTest) || {};
    const key = 'govcon.workflowChecklists.' + String(opportunityId || '');
    const record = { missingData, complianceWarnings, profitAssumptions, updatedAt: new Date(now()).toISOString() };
    store.set(key, record);
    return record;
  }
  function automate(input) {
    input = input && typeof input === 'object' ? input : {};
    const opportunityId = input.opportunityId || input.noticeId || input.solicitationNumber || 'unknown';
    const analysisRecord = input.analysis ? saveAnalysis(opportunityId, input.analysis) : null;
    const stage = input.stage || stageFromDecision(input.analysis && input.analysis.decision);
    const stageRecord = moveStage(opportunityId, stage);
    const tasks = createTasks(opportunityId, input.analysis || {}, input);
    const checklist = storeChecklist(opportunityId, input.analysis || {});
    return { ok: true, opportunityId, analysisRecord, stageRecord, tasks, checklist };
  }

  return { saveAnalysis, moveStage, createTasks, storeChecklist, automate };
}

function stageFromDecision(decision) {
  if (!decision) return 'Research';
  if (decision === 'KILL') return 'Killed';
  if (decision === 'MORE_RESEARCH_NEEDED') return 'Research';
  if (decision === 'RISKY_FIT') return 'No-Bid';
  return 'Sub Sourcing';
}
function addDays(d, days) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function safeArray(v) { return Array.isArray(v) ? v : []; }
function safeObject(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

module.exports = {
  PIPELINE_STAGES,
  createGovconWorkflowService,
  stageFromDecision
};
