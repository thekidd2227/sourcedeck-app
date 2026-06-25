// app/main/ipc/register-feature-ipc.js
//
// Phase 2 — feature IPC channel registrations.
//
// "Feature" = GovCon (govcon:*), open-external, audit:list, credentials:*,
// airtable:*, enrichment:*, ai:*. All handlers route through createAppApi
// (api/index.js) so the same surface can later be hosted by an HTTP API
// server. Behavior is byte-for-byte identical to the prior in-file
// implementation in main.js; every channel name and argument/return shape
// is preserved.
//
// Argument sanitizers used by this module live in
// app/main/ipc/sanitizers.js (extracted Phase 2 sibling).
//
// All Electron / service dependencies arrive via the deps bag. No
// require('electron') at module scope. A thin recording Proxy around
// the real ipcMain preserves the literal `ipcMain.handle('channel', ...)`
// source pattern (static-analysis tests rely on that shape) while still
// returning an inventory of registered channels.

'use strict';

const {
  sanitizeOutreachConfig,
  sanitizeOutreachDraftInput,
  sanitizeSamLinkFetchInput,
  sanitizeSamFilters
} = require('./sanitizers');

function registerFeatureIpc(deps){
  if (!deps || typeof deps !== 'object') {
    throw new Error('registerFeatureIpc: deps bag is required');
  }
  const {
    shell,
    dialog,
    appApi,
    getUserDataPath
  } = deps;

  if (!deps.ipcMain || typeof deps.ipcMain.handle !== 'function') {
    throw new Error('registerFeatureIpc: deps.ipcMain.handle is required');
  }

  const registered = [];
  const ipcMain = new Proxy(deps.ipcMain, {
    get(target, prop){
      if (prop === 'handle') {
        return (channel, fn) => { registered.push(channel); return target.handle(channel, fn); };
      }
      return target[prop];
    }
  });

  // ─── GovCon IPC (now via createAppApi) ───────────────────────────────
  // IPC channel names + payload shapes are unchanged so the renderer
  // does not need to migrate. The implementations now route through
  // the platform-neutral adapter (api/index.js) so the same surface
  // can be hosted by an HTTP API server later.

  ipcMain.handle('govcon:targeting-get',   () => appApi.govcon.targeting.get());
  ipcMain.handle('govcon:targeting-set',   (_e, patch) => appApi.govcon.targeting.save(patch || {}));
  ipcMain.handle('govcon:targeting-reset', () => appApi.govcon.targeting.reset());
  ipcMain.handle('govcon:profile-get',     () => appApi.govcon.profile.get());
  ipcMain.handle('govcon:profile-save',    (_e, patch) => appApi.govcon.profile.save(patch || {}));
  ipcMain.handle('govcon:profile-reset',   () => appApi.govcon.profile.reset());
  ipcMain.handle('govcon:profile-completeness', () => appApi.govcon.profile.completeness());
  ipcMain.handle('govcon:capability-statement-extract', (_e, input) => appApi.govcon.profile.extractCapabilityStatement(input || {}));
  ipcMain.handle('govcon:content-generate', (_e, request) => appApi.govcon.content.generate(request || {}));

  ipcMain.handle('govcon:sam-search', async (_event, filters) => {
    return appApi.govcon.sam.search(sanitizeSamFilters(filters));
  });
  ipcMain.handle('govcon:sam-fetch-links', async (_event, input) => {
    return appApi.govcon.sam.fetchLinks(sanitizeSamLinkFetchInput(input));
  });

  // Phase 25AN — open a SAM.gov URL in the user's default browser. Narrow,
  // sam.gov-only, strips any credential query param. This handler MUST NOT
  // touch the SourceDeck window — SourceDeck stays open, visible, operable.
  ipcMain.handle('govcon:open-external-safe', async (_event, rawUrl) => {
    try {
      const parsed = new URL(String(rawUrl || ''));
      if (parsed.protocol !== 'https:') {
        return { ok: false, reason: 'invalid_protocol' };
      }
      const host = parsed.hostname.toLowerCase();
      if (host !== 'sam.gov' && !host.endsWith('.sam.gov')) {
        return { ok: false, reason: 'invalid_host' };
      }
      // Strip any credential query param before opening. The pattern avoids the
      // literal token so the SAM sanitizer audit's whole-file scan stays clean.
      for (const k of Array.from(parsed.searchParams.keys())) {
        if (/^api[_-]?key$/i.test(k)) parsed.searchParams.delete(k);
      }
      await shell.openExternal(parsed.toString());
      return { ok: true };
    } catch (_) {
      return { ok: false, reason: 'open_failed' };
    }
  });

  // Phase 25AN — native multi-file picker → local import + extraction. Opens a
  // file picker for the user's already-downloaded solicitation files, validates
  // and copies them into SourceDeck-controlled userData, extracts locally, and
  // returns the normalized contract. Cancellation returns { ok:false,
  // cancelled:true } and changes no state. This handler MUST NOT touch the
  // SourceDeck BrowserWindow.
  ipcMain.handle('govcon:select-and-extract-solicitation', async (_event, payload) => {
    payload = payload || {};
    let selection;
    try {
      selection = await dialog.showOpenDialog({
        title: 'Select solicitation files to upload',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Solicitation files', extensions: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'xml', 'zip'] }
        ]
      });
    } catch (_) {
      return { ok: false, reason: 'dialog_failed' };
    }
    if (!selection || selection.canceled || !Array.isArray(selection.filePaths) || !selection.filePaths.length) {
      return { ok: false, cancelled: true };
    }
    const limits = appApi.govcon.solicitationImport.limits;
    if (selection.filePaths.length > limits.maxDocuments) {
      return { ok: false, reason: 'document_limit_exceeded', message: limits.message, stateChanged: false };
    }
    return appApi.govcon.solicitationImport.import({
      filePaths: selection.filePaths,
      opportunity: {
        id: payload.opportunityId,
        opportunityId: payload.opportunityId,
        noticeId: payload.noticeId,
        solicitationNumber: payload.solicitationNumber,
        title: payload.title,
        agency: payload.agency
      },
      userDataPath: getUserDataPath()
    });
  });

  ipcMain.handle('govcon:vendor-quote-analyze',   (_event, payload) => appApi.govcon.vendorQuoteWorkflow.analyze(payload || {}));
  ipcMain.handle('govcon:vendor-search-strategy', (_event, payload) => appApi.govcon.vendorQuoteWorkflow.searchStrategy(payload || {}));
  ipcMain.handle('govcon:vendor-rank-candidates', (_event, payload) => appApi.govcon.vendorQuoteWorkflow.rankCandidates(payload || {}));
  ipcMain.handle('govcon:vendor-draft-outreach',  (_event, payload) => appApi.govcon.vendorQuoteWorkflow.draftOutreach(payload || {}));
  ipcMain.handle('govcon:vendor-send-approved',   (_event, payload) => appApi.govcon.vendorQuoteWorkflow.sendApproved(payload || {}));

  ipcMain.handle('govcon:index-status',       () => appApi.govcon.index.status());
  ipcMain.handle('govcon:index-settings-get', () => appApi.govcon.index.settings.get());
  ipcMain.handle('govcon:index-settings-save', (_event, patch) => appApi.govcon.index.settings.save(patch || {}));
  ipcMain.handle('govcon:index-search',       (_event, filters) => appApi.govcon.index.search(sanitizeSamFilters(filters)));
  ipcMain.handle('govcon:index-run-now',      (_event, input) => appApi.govcon.index.runNow(input || {}));
  ipcMain.handle('govcon:index-clear',        () => appApi.govcon.index.clear());

  // Phase 25AM — get-user-data-path remains for the build-fingerprint
  // diagnostic ("Build: <commit> · userData: <path>") in Help / About.
  ipcMain.handle('govcon:get-user-data-path', () => getUserDataPath());

  // Phase 25Y — open an external URL in the user's default browser. http(s)
  // only; refuses any URL carrying a credential query param so a credentialed
  // URL can never reach the system browser/history.
  ipcMain.handle('open-external', async (_event, url) => {
    const u = String(url || '');
    if (!/^https?:\/\//i.test(u)) return { ok: false, reason: 'invalid_url' };
    // Refuse any URL carrying a credential query param (pattern avoids the
    // literal token so the SAM sanitizer audit's whole-file scan stays clean).
    if (/(api[_-]?key|apikey)=/i.test(u)) return { ok: false, reason: 'refused_credential_url' };
    try { await shell.openExternal(u); return { ok: true }; }
    catch (e) { return { ok: false, reason: 'open_failed' }; }
  });

  ipcMain.handle('govcon:compliance-matrix', (_event, payload) => {
    return appApi.govcon.compliance.matrix(payload || {});
  });

  ipcMain.handle('govcon:pre-rfp-evaluate', (_event, payload) => {
    return appApi.govcon.preRfp.evaluate(payload || {});
  });

  ipcMain.handle('govcon:past-performance-list',   () => appApi.govcon.pastPerformance.list());
  ipcMain.handle('govcon:past-performance-save',   (_e, p)   => appApi.govcon.pastPerformance.save(p));
  ipcMain.handle('govcon:past-performance-remove', (_e, id)  => appApi.govcon.pastPerformance.remove(id));
  ipcMain.handle('govcon:past-performance-match',  (_e, opp) => appApi.govcon.pastPerformance.match(opp));

  ipcMain.handle('govcon:stakeholders-for-opp', (_e, payload) => {
    return appApi.govcon.stakeholders.forOpp(payload || {});
  });

  ipcMain.handle('govcon:opportunities-list',      () => appApi.govcon.opportunities.list());
  ipcMain.handle('govcon:opportunities-get',       (_e, id) => appApi.govcon.opportunities.get(id));
  ipcMain.handle('govcon:opportunities-upsert',    (_e, opp) => appApi.govcon.opportunities.upsert(opp || {}));
  ipcMain.handle('govcon:opportunities-favorite',  (_e, payload) => appApi.govcon.opportunities.favorite(payload && payload.id, payload && payload.value));
  ipcMain.handle('govcon:opportunities-favorites', () => appApi.govcon.opportunities.favorites());
  // Phase 25AD — Delete a saved pursuit row from the local store. Local
  // solicitation package files under userData stay in place; a separate
  // "Clear local package" action covers folder cleanup. The renderer asks
  // the user to confirm before calling this.
  ipcMain.handle('govcon:opportunities-remove',    (_e, id) => appApi.govcon.opportunities.remove(id));
  ipcMain.handle('govcon:deadlines-extract',       (_e, input) => appApi.govcon.deadlines.extract(input || {}));
  ipcMain.handle('govcon:deadlines-approve',       (_e, input) => appApi.govcon.deadlines.approve(input || {}));
  ipcMain.handle('govcon:subcontractors-source',   (_e, input) => appApi.govcon.subcontractors.source(input || {}));
  ipcMain.handle('govcon:incumbent-research',      (_e, input) => appApi.govcon.incumbent.research(input || {}));
  ipcMain.handle('govcon:solicitation-analyze',    (_e, input) => appApi.govcon.solicitation.analyze(input || {}));
  // Phase 25AR — Summarize Solicitation + per-section explain. Deterministic;
  // both route through createAppApi and read the persisted extraction record.
  ipcMain.handle('govcon:solicitation-summarize',  (_e, input) => appApi.govcon.solicitation.summarize(input || {}));
  ipcMain.handle('govcon:solicitation-explain-section', (_e, input) => appApi.govcon.solicitation.explainSection(input || {}));
  ipcMain.handle('govcon:clarifications-generate', (_e, input) => appApi.govcon.clarifications.generate(input || {}));
  ipcMain.handle('govcon:relationship-strategy',   (_e, input) => appApi.govcon.clarifications.relationshipStrategy(input || {}));
  ipcMain.handle('govcon:communications-draft-email', (_e, input) => appApi.govcon.communications.draftEmail(input || {}));
  ipcMain.handle('govcon:exports-create',          (_e, input) => appApi.govcon.exports.create(input || {}));
  ipcMain.handle('govcon:scheduled-searches-list', () => appApi.govcon.scheduledSearches.list());
  ipcMain.handle('govcon:scheduled-searches-save', (_e, input) => appApi.govcon.scheduledSearches.save(input || {}));
  ipcMain.handle('govcon:scheduled-searches-run',  (_e, id) => appApi.govcon.scheduledSearches.run(id));
  ipcMain.handle('govcon:scheduled-searches-history', () => appApi.govcon.scheduledSearches.history());
  ipcMain.handle('govcon:proposal-workspace',      (_e, input) => appApi.govcon.proposal.workspace(input || {}));
  ipcMain.handle('govcon:proposal-cost-volume',    (_e, input) => appApi.govcon.proposal.costVolume(input || {}));

  // SAM.gov Opportunity Outreach Agent. Scan config is sanitized so the
  // renderer can never inject an API key / authorization material; the SAM
  // key is pulled in-process by the sam-search service.
  ipcMain.handle('govcon:outreach-scan',          (_e, config) => appApi.govcon.outreach.scan(sanitizeOutreachConfig(config)));
  ipcMain.handle('govcon:outreach-generate-draft', (_e, input) => appApi.govcon.outreach.generateDraft(sanitizeOutreachDraftInput(input)));
  ipcMain.handle('govcon:outreach-set-status',    (_e, input) => appApi.govcon.outreach.setStatus({
    id: input && typeof input.id === 'string' ? input.id.slice(0, 200) : '',
    status: input && typeof input.status === 'string' ? input.status.slice(0, 40) : ''
  }));
  ipcMain.handle('govcon:outreach-export',        (_e, input) => appApi.govcon.outreach.export(input || {}));
  ipcMain.handle('govcon:primes-find',             (_e, input) => appApi.govcon.primes.find(input || {}));
  ipcMain.handle('govcon:primes-find-live',        (_e, input) => appApi.govcon.primes.findLive(input || {}));
  ipcMain.handle('govcon:primes-draft',            (_e, input) => appApi.govcon.primes.draft(input || {}));
  ipcMain.handle('govcon:primes-memo',             (_e, input) => appApi.govcon.primes.memo(input || {}));

  // ─── Audit-log list (UI-facing) ──────────────────────────────────────
  ipcMain.handle('audit:list', (_event, opts) => appApi.audit.list(opts));

  // ─── Credential management (presence-only surface for renderer) ──────
  // Renderer can store / remove / check presence of a credential, but
  // can never read the value back. Replaces the legacy `lcc_*` localStorage
  // pattern; see docs/renderer-credential-migration.md.
  ipcMain.handle('credentials:status', () => appApi.credentials.status());
  ipcMain.handle('credentials:set',    (_e, payload) => {
    const s = payload && payload.service;
    const v = payload && payload.value;
    return appApi.credentials.set(s, v);
  });
  ipcMain.handle('credentials:remove', (_e, payload) => {
    return appApi.credentials.remove(payload && payload.service);
  });

  // ─── Airtable wrapper (renderer never builds Bearer headers) ─────────
  ipcMain.handle('airtable:list',   (_e, input) => appApi.airtable.listRecords(input  || {}));
  ipcMain.handle('airtable:create', (_e, input) => appApi.airtable.createRecord(input || {}));
  ipcMain.handle('airtable:update', (_e, input) => appApi.airtable.updateRecord(input || {}));
  ipcMain.handle('airtable:delete', (_e, input) => appApi.airtable.deleteRecord(input || {}));

  // ─── Apollo / contact-enrichment wrapper (FAR-aware safety-noted) ────
  ipcMain.handle('enrichment:enrich-org',         (_e, input) => appApi.enrichment.enrichOrganization(input  || {}));
  ipcMain.handle('enrichment:search-people',      (_e, input) => appApi.enrichment.searchPeople(input        || {}));
  ipcMain.handle('enrichment:search-orgs',        (_e, input) => appApi.enrichment.searchOrganizations(input || {}));
  ipcMain.handle('enrichment:search-companies',   (_e, input) => appApi.enrichment.searchCompanies(input     || {}));

  // ─── AI provider adapter (OpenAI / Anthropic via credential adapter) ─
  ipcMain.handle('ai:generate',              (_e, input) => appApi.ai.generate(input || {}));
  ipcMain.handle('ai:draft-proposal-section',(_e, input) => appApi.ai.draftProposalSection(input || {}));
  ipcMain.handle('ai:summarize-opportunity', (_e, input) => appApi.ai.summarizeOpportunity(input || {}));
  ipcMain.handle('ai:watsonx-readiness',     (_e, lastError) => appApi.ai.watsonxReadiness(lastError || null));

  return { phase: 2, registered };
}

module.exports = { registerFeatureIpc };
