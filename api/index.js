// api/index.js
//
// SourceDeck app-API adapter.
//
// PURPOSE
// Single boundary that UI clients (Electron renderer today, web app
// tomorrow, future mobile/CLI) call. The adapter wires together the
// platform-neutral services in /services/* and exposes them as a
// stable, testable API.
//
// SHAPE
//   const api = createAppApi({
//     store,         // electron-store-compatible OR backend store shim
//     credentials,   // CredentialStore from services/settings/credentials
//     audit,         // AuditLog from services/audit/audit-log
//     fetchFn,       // fetch-compatible function (defaults to global)
//     now            // () => epochMs (defaults to Date.now)
//   });
//
//   await api.govcon.targeting.get();
//   await api.govcon.targeting.save({ naics: ['541512'] });
//   await api.govcon.sam.search({ naics: ['541512'] });
//   await api.govcon.compliance.matrix({ text: '<solicitation text>' });
//   await api.govcon.preRfp.evaluate({ opp });
//   await api.govcon.pastPerformance.list();
//   await api.govcon.stakeholders.forOpp({ opp });
//   await api.govcon.proposal.draftSections({ opportunity, complianceMatrix });
//   await api.audit.list({ limit: 200 });
//   await api.credentials.status();
//
// IMPORTANT BOUNDARIES
//   - This module never imports Electron. The adapter is usable from
//     a Node API server.
//   - The adapter never returns a raw API key to the caller. Status
//     calls return presence-only summaries.
//   - All sensitive external calls (SAM.gov, Airtable, Apollo, AI
//     providers) go through the adapter so credentials stay inside
//     the trust boundary that owns the credentials store.

'use strict';

const os = require('os');
const path = require('path');
const settings        = require('../services/settings/targeting-profile');
const credSurface     = require('../services/settings/credentials');
const operatingProfile = require('../services/settings/govcon-operating-profile');
const capabilityExtractor = require('../services/govcon/capability-statement-extractor');
const premiumContent = require('../services/govcon/premium-content-agent');
const watsonxReadiness = require('../services/ai/watsonx-readiness');
const sam             = require('../services/sam');
// Local upload/import + extraction only (no remote downloading or retrieval).
const solicitationImport = require('../services/govcon/solicitation-import');
const vendorQuoteWorkflow = require('../services/govcon/vendor-quote-workflow');
const compliance      = require('../services/compliance');
const stakeholders    = require('../services/stakeholders');
const capture         = require('../services/capture');
const proposal        = require('../services/proposal');
const airtable        = require('../services/airtable');
const apollo          = require('../services/apollo');
const openaiProvider  = require('../services/ai/providers/openai');
const anthropicProvider = require('../services/ai/providers/anthropic');
const workflowSvc    = require('../services/workflow');
const deadlines      = require('../services/govcon/deadline-extraction');
const subSourcing    = require('../services/govcon/subcontractor-sourcing');
const primeFinder    = require('../services/govcon/prime-partner-finder');
const incumbentSvc   = require('../services/govcon/incumbent-research');
const solicitationSvc = require('../services/govcon/solicitation-analysis');
const clarificationSvc = require('../services/govcon/clarification-strategy');
const emailCompliance = require('../services/govcon/email-compliance');
const exportSvc      = require('../services/govcon/export');
const opportunityRecords = require('../services/govcon/opportunity-records');
const scheduledSam   = require('../services/govcon/scheduled-sam-search');
const opportunityOutreach = require('../services/govcon/opportunity-outreach');
const govconIndexSvc = require('../services/govcon/govcon-index');

function createAppApi(opts) {
  opts = opts || {};
  if (!opts.store) {
    throw new Error('app-api: opts.store is required (electron-store or compatible)');
  }
  if (!opts.credentials) {
    throw new Error('app-api: opts.credentials is required (CredentialStore from services/settings/credentials)');
  }
  const store       = opts.store;
  const credentials = opts.credentials;
  const audit       = opts.audit || nullAudit();
  const fetchFn     = opts.fetchFn || (typeof fetch === 'function' ? fetch : null);
  const now         = opts.now || (() => Date.now());
  const userDataPath = opts.userDataPath || path.join(os.tmpdir(), 'sourcedeck-userData-test');

  // Construct stateful service instances (bound to store/credentials).
  const targeting       = settings.createTargetingProfileService(store);
  const opProfile       = operatingProfile.createOperatingProfileService({ store, credentials, targetingProfile: targeting });
  const pastPerformance = capture.createPastPerformanceService(store);
  const samSearch       = sam.createSamSearchService({
    fetch: fetchFn,
    getApiKey: async () => credentials.get('sam-gov'),
    now
  });
  const airtableSvc     = airtable.createAirtableService({ credentials, fetchFn, audit });
  const apolloSvc       = apollo.createApolloService({ credentials, fetchFn, audit });
  const openaiSvc       = openaiProvider.createOpenaiProvider({ credentials, fetchFn, audit });
  const anthropicSvc    = anthropicProvider.createAnthropicProvider({ credentials, fetchFn, audit });
  const opportunities   = opportunityRecords.createOpportunityRecordService(store, now);
  const scheduledSearches = scheduledSam.createScheduledSamSearchService({
    store,
    samSearch,
    opportunityRecords: opportunities,
    now
  });
  const govconIndex = govconIndexSvc.createGovconIndexService({
    store,
    samSearch,
    userDataPath,
    now
  });
  const outreach = opportunityOutreach.createOpportunityOutreachService({
    samSearch,
    opportunities,
    store,
    targetingProfile: targeting,
    now
  });

  return Object.freeze({
    audit: {
      list:    (limitOpts) => Promise.resolve(_listAudit(audit, store, limitOpts)),
      summary: ()          => Promise.resolve(audit.summary ? audit.summary() : null),
      append:  (event)     => Promise.resolve(audit.append ? audit.append(event) : null)
    },
    credentials: {
      status: ()           => credSurface.summarizePresence(credentials),
      // NOTE: deliberate omission of get(). Callers that need a value
      // must use credentials.get() inside the trust boundary.
      set:    (s, v)       => credentials.set(s, v),
      remove: (s)          => credentials.remove(s)
    },
    workflow: {
      classifyIntake:      (input) => Promise.resolve(workflowSvc.classifyIntake(input || {})),
      createFromIntake:    (input) => Promise.resolve(workflowSvc.createWorkflowFromIntake(input || {})),
      createTask:          (input) => Promise.resolve(workflowSvc.createTask(input || {})),
      updateTask:          (task, patch) => Promise.resolve(workflowSvc.updateTask(task || {}, patch || {})),
      createArtifactDraft: (input) => Promise.resolve(workflowSvc.createArtifactDraft(input || {})),
      listTemplates:       () => Promise.resolve(workflowSvc.listTemplates())
    },
    govcon: {
      targeting: {
        get:    ()         => Promise.resolve(targeting.load()),
        save:   (patch)    => Promise.resolve(targeting.save(patch || {})),
        reset:  ()         => Promise.resolve(targeting.reset())
      },
      profile: {
        get:    ()         => opProfile.get(),
        save:   (patch)    => opProfile.save(patch || {}),
        reset:  ()         => Promise.resolve(opProfile.reset()),
        completeness: ()   => opProfile.completeness(),
        // Deterministic, offline capability-statement extraction. Returns
        // candidate fields only; the renderer presents them for explicit
        // user approval before any save. No external upload.
        extractCapabilityStatement: (input) =>
          Promise.resolve(capabilityExtractor.extractCapabilityStatementFields((input && input.text) || ''))
      },
      content: {
        // Draft-only premium content using the operating profile as
        // context. Never auto-posts; never publishes to any platform.
        generate: async (request) => {
          const profile = await opProfile.get();
          return premiumContent.generatePremiumContent(profile, request || {});
        }
      },
      sam: {
        search: (filters)  => samSearch.search(filters || {})
        // Automatic SAM.gov notice/attachment-link retrieval is permanently
        // removed. SourceDeck never retrieves notice metadata, attachment
        // links, or resource URLs. The renderer opens only the canonical
        // opportunity page and imports files via the manual upload picker.
      },
      // Phase 25AN — local solicitation import + extraction. The renderer
      // collects user-selected local file paths (via the native picker in
      // main.js) and hands them here. This validates, copies into userData,
      // extracts locally, and returns the normalized contract. No network,
      // no Downloads-folder scanning, no remote attachment fetching.
      solicitationImport: {
        import: (payload) => solicitationImport.importAndExtract(payload || {}),
        limits: Object.freeze({
          maxDocuments: solicitationImport.MAX_SOLICITATION_DOCUMENTS,
          message: solicitationImport.SOLICITATION_LIMIT_MESSAGE
        })
      },
      vendorQuoteWorkflow: {
        analyze: (payload) => Promise.resolve(vendorQuoteWorkflow.analyzeSubcontractingNeeds(payload || {})),
        searchStrategy: (payload) => Promise.resolve(vendorQuoteWorkflow.generateSearchStrategy(payload || {})),
        rankCandidates: (payload) => Promise.resolve(vendorQuoteWorkflow.compileAndRankVendors(payload || {})),
        draftOutreach: (payload) => Promise.resolve(vendorQuoteWorkflow.draftVendorEmails(payload || {})),
        sendApproved: (payload) => {
          if (!opts.vendorOutreachTestMode) return Promise.resolve({ ok: false, reason: 'configured_email_provider_required', sent: [] });
          const mockProvider = { send: async message => ({ messageId: 'mock-' + require('crypto').createHash('sha256').update(JSON.stringify(message)).digest('hex').slice(0, 16) }) };
          return vendorQuoteWorkflow.sendApproved(payload || {}, mockProvider);
        }
      },
      index: {
        status:   () => Promise.resolve(govconIndex.status()),
        settings: {
          get:  () => Promise.resolve(govconIndex.getSettings()),
          save: (patch) => Promise.resolve(govconIndex.saveSettings(patch || {}))
        },
        search:   (filters) => Promise.resolve(govconIndex.search(filters || {})),
        runNow:   (input) => govconIndex.runNow(input || {}),
        clear:    () => Promise.resolve(govconIndex.clear()),
        shouldRunOnStart: () => Promise.resolve(govconIndex.shouldRunOnStart())
      },
      // The packages.* surface and the automatic notice/attachment-link
      // retrieval are permanently removed. SourceDeck never downloads, fetches,
      // or retrieves SAM.gov package bytes, notice metadata, or attachment /
      // resource links. Solicitation Center / Extract Requirements / Compliance
      // Matrix remain available — they consume files only through the manual
      // Upload Solicitation Files path.
      opportunities: {
        list:      ()      => Promise.resolve(opportunities.list()),
        get:       (id)    => Promise.resolve(opportunities.get(id)),
        upsert:    (opp)   => Promise.resolve(opportunities.upsert(opp || {})),
        patch:     (id, p) => Promise.resolve(opportunities.patch(id, p || {})),
        favorite:  (id, v) => Promise.resolve(opportunities.favorite(id, v)),
        favorites: ()      => Promise.resolve(opportunities.favorites()),
        remove:    (id)    => Promise.resolve(opportunities.remove(id))
      },
      deadlines: {
        extract: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = deadlines.extractDeadlines(payload || {}, { now: new Date(now()) });
          if (record && result.ok) opportunities.patch(record.id, {
            deadlineEvents: mergeByKey(record.deadlineEvents, result.events, eventKey),
            reminders: mergeByKey(record.reminders, result.reminders, reminderKey)
          });
          return result;
        })),
        approve: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const approved = deadlines.approveEvents(payload.events || [], payload.approvedIds || [], { now: new Date(now()) });
          if (record) opportunities.patch(record.id, {
            deadlineEvents: mergeByKey(record.deadlineEvents, approved.events, eventKey),
            reminders: mergeByKey(record.reminders, approved.reminders, reminderKey)
          });
          return approved;
        }))
      },
      subcontractors: {
        source: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = subSourcing.sourceSubcontractors(payload || {});
          if (record) opportunities.patch(record.id, { subcontractorSourcingRuns: [result] });
          return result;
        }))
      },
      incumbent: {
        research: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = incumbentSvc.researchIncumbent(payload || {});
          if (record) opportunities.patch(record.id, { incumbentResearch: result });
          return result;
        }))
      },
      solicitation: {
        analyze: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = solicitationSvc.analyzeSolicitation(payload || {});
          if (record) opportunities.patch(record.id, { solicitationAnalysis: result });
          return result;
        }))
      },
      clarifications: {
        generate: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = clarificationSvc.generateClarificationQuestions(payload || {});
          if (record) opportunities.patch(record.id, { clarificationQuestions: result.questions || [] });
          return result;
        })),
        relationshipStrategy: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = clarificationSvc.buildRelationshipStrategy(payload || {});
          if (record) opportunities.patch(record.id, { relationshipStrategy: result });
          return result;
        }))
      },
      communications: {
        draftEmail: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = emailCompliance.draftOfficialEmail(payload || {});
          if (record && result.logEntry) opportunities.patch(record.id, { communicationsLog: [result.logEntry] });
          return result;
        }))
      },
      exports: {
        create: (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = exportSvc.createExport(payload || {});
          if (record) opportunities.patch(record.id, { exports: [result] });
          return result;
        }))
      },
      scheduledSearches: {
        list:    ()      => Promise.resolve(scheduledSearches.list()),
        save:    (input) => Promise.resolve(scheduledSearches.save(input || {})),
        run:     (id)    => scheduledSearches.run(id),
        history: ()      => Promise.resolve(scheduledSearches.history())
      },
      // SAM.gov Opportunity -> Outreach Agent. Draft-only; the SAM key
      // stays inside this trust boundary (samSearch pulls it via
      // credentials.get); the renderer only sends a scan config and
      // receives normalized opportunity + draft/status results.
      outreach: {
        scan:          (config) => outreach.scan(config || {}),
        generateDraft: (input)  => outreach.generateDraft(input || {}),
        setStatus:     (input)  => Promise.resolve(outreach.setStatus(input || {})),
        export:        (input)  => Promise.resolve(exportSvc.createExport(input || {}))
      },
      compliance: {
        matrix: (payload)  => Promise.resolve(compliance.generateComplianceMatrix(
          (payload && payload.text) || '', (payload && payload.opts) || {}))
      },
      preRfp: {
        evaluate: (payload) => Promise.resolve(capture.evaluatePreRfp(
          payload && payload.opp, (payload && payload.profile) || targeting.load()))
      },
      pastPerformance: {
        list:    ()        => Promise.resolve(pastPerformance.list()),
        save:    (proj)    => Promise.resolve(pastPerformance.save(proj)),
        remove:  (id)      => Promise.resolve(pastPerformance.remove(id)),
        match:   (opp)     => Promise.resolve(pastPerformance.match(opp))
      },
      stakeholders: {
        forOpp:  (payload) => Promise.resolve(stakeholders.buildStakeholderGraph(
          payload && payload.opp, (payload && payload.extras) || {}))
      },
      proposal: {
        draftSections: (input) => Promise.resolve(proposal.draftSections(input || {})),
        workspace:     (input) => Promise.resolve(withOpportunity(opportunities, input, (payload, record) => {
          const result = proposal.createProposalWorkspace(payload || {});
          if (record && result.ok) opportunities.patch(record.id, { proposalWorkspace: result });
          return result;
        })),
        costVolume:    (input) => Promise.resolve(proposal.draftCostVolume(input || {}))
      },
      primes: {
        find:     (input) => Promise.resolve(primeFinder.findPrimePartners(input || {})),
        findLive: async (input) => {
          input = input || {};
          const liveResult = await primeFinder.fetchPrimesFromUSAspending(
            input.naics || [], input.filters || {}, fetchFn
          );
          if (!liveResult.ok || !liveResult.primes.length) {
            return primeFinder.findPrimePartners(input);
          }
          const profile = Object.assign({ naics: input.naics || [] }, input.profile || {});
          const scored = liveResult.primes
            .map(p => primeFinder.scorePrime(p, profile))
            .sort((a, b) => b.partnershipFitScore - a.partnershipFitScore)
            .slice(0, 100);
          return { ok: true, sourceMode: 'live', results: scored, safetyNote: primeFinder.NO_AUTO_SEND_NOTE };
        },
        draft:    (input) => Promise.resolve(primeFinder.generateOutreachDraft(
          (input || {}).prime || {}, (input || {}).profile || {}
        )),
        memo:     (input) => Promise.resolve(primeFinder.generateCapabilityMatchMemo(
          (input || {}).prime || {}, (input || {}).profile || {}
        ))
      }
    },

    // External-API surfaces. Renderer/web client never holds the
    // credential; the adapter pulls it from the credentials store.
    airtable: {
      listRecords:  (i) => airtableSvc.listRecords(i  || {}),
      createRecord: (i) => airtableSvc.createRecord(i || {}),
      updateRecord: (i) => airtableSvc.updateRecord(i || {}),
      deleteRecord: (i) => airtableSvc.deleteRecord(i || {})
    },
    enrichment: {
      enrichOrganization:  (i) => apolloSvc.enrichOrganization(i  || {}),
      searchPeople:        (i) => apolloSvc.searchPeople(i        || {}),
      searchOrganizations: (i) => apolloSvc.searchOrganizations(i || {}),
      // Richer business-only org search used by the renderer's
      // company-discovery workflow. Returns org-level public
      // attributes; personal contact PII is stripped.
      searchCompanies:     (i) => apolloSvc.searchCompanies(i     || {}),
      safetyNote: apolloSvc.SAFETY_NOTE
    },
    ai: {
      // Generic generate. Caller picks provider; defaults to openai
      // when an OpenAI key is present, else anthropic, else error.
      async generate(input) {
        input = input || {};
        const requested = (input.provider || '').toLowerCase();
        const tryOrder = requested
          ? [requested]
          : ['openai', 'anthropic'];
        let lastErr = null;
        for (const p of tryOrder) {
          const svc = p === 'openai' ? openaiSvc
                    : p === 'anthropic' ? anthropicSvc
                    : null;
          if (!svc) continue;
          const r = await svc.generate(input);
          if (r.ok) return r;
          lastErr = r;
          if (r.error !== 'no_credential') break; // real failure -> stop
        }
        return lastErr || { ok: false, error: 'no_provider_configured' };
      },
      async draftProposalSection(input) {
        input = input || {};
        const sys = 'You are SourceDeck, a GovCon proposal-drafting assistant. '
                  + 'Return a concise, source-backed draft section. '
                  + 'Always end with: "AI draft. Human review required."';
        const user = `Section: ${String(input.section || 'Technical Approach')}\n\n`
                   + `Opportunity context: ${JSON.stringify(input.opportunity || {}).slice(0, 4000)}\n\n`
                   + (input.guidance ? 'Guidance: ' + String(input.guidance).slice(0, 2000) + '\n\n' : '')
                   + 'Draft the section now.';
        return this.generate({ ...input, systemPrompt: sys, userMessage: user, surface: 'proposal_draft' });
      },
      async summarizeOpportunity(input) {
        input = input || {};
        const sys = 'You are SourceDeck. Summarize the opportunity in 5 lines: scope, '
                  + 'evaluation factors, set-aside, deadline, decision notes. '
                  + 'Always end with: "AI draft. Human review required."';
        const user = JSON.stringify(input.opportunity || {}).slice(0, 6000);
        return this.generate({ ...input, systemPrompt: sys, userMessage: user, surface: 'opportunity_summary' });
      },
      // Renderer-safe watsonx readiness diagnostic. Returns presence/
      // classification/remediation only — never tokens, account IDs,
      // project IDs values, or trace IDs.
      async watsonxReadiness(lastError) {
        const cfg = require('../services/config').watsonxStatus();
        let credStatus = null;
        try { credStatus = await credentials.status(); } catch (_) {}
        return watsonxReadiness.buildWatsonxReadinessReport(cfg, credStatus, lastError || null);
      }
    }
  });
}

function withOpportunity(opportunities, input, fn) {
  const payload = input || {};
  const opp = payload.opportunity || payload.opp || null;
  const id = payload.opportunityId || payload.id || (opp && (opp.id || opp.noticeId || opp.solicitationNumber));
  let record = id ? opportunities.get(id) : null;
  if (!record && opp) record = opportunities.upsert(opp);
  return fn(payload, record);
}

function mergeByKey(current, next, keyFn) {
  const out = Array.isArray(current) ? current.slice() : [];
  const seen = new Set(out.map(keyFn));
  for (const item of Array.isArray(next) ? next : []) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function eventKey(e) { return [e.solicitationNumber, e.date, e.eventType].join('|'); }
function reminderKey(r) { return [r.eventId, r.remindAt, r.offsetHours].join('|'); }

function _listAudit(audit, store, opts) {
  opts = opts || {};
  const limit = Math.min(typeof opts.limit === 'number' ? opts.limit : 200, 500);
  const events = audit && typeof audit.list === 'function'
    ? audit.list()
    : (store && typeof store.get === 'function' ? (store.get('audit.events') || []) : []);
  return events.slice(-limit).reverse();
}

function nullAudit() {
  return { append: () => null, list: () => [], summary: () => ({ count: 0, cap: 0, last: null }) };
}

module.exports = { createAppApi };
