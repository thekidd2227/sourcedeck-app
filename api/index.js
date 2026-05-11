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

const settings        = require('../services/settings/targeting-profile');
const credSurface     = require('../services/settings/credentials');
const sam             = require('../services/sam');
const compliance      = require('../services/compliance');
const stakeholders    = require('../services/stakeholders');
const capture         = require('../services/capture');
const proposal        = require('../services/proposal');
const airtable        = require('../services/airtable');
const apollo          = require('../services/apollo');
const openaiProvider  = require('../services/ai/providers/openai');
const anthropicProvider = require('../services/ai/providers/anthropic');

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

  // Construct stateful service instances (bound to store/credentials).
  const targeting       = settings.createTargetingProfileService(store);
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
    govcon: {
      targeting: {
        get:    ()         => Promise.resolve(targeting.load()),
        save:   (patch)    => Promise.resolve(targeting.save(patch || {})),
        reset:  ()         => Promise.resolve(targeting.reset())
      },
      sam: {
        search: (filters)  => samSearch.search(filters || {})
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
        draftSections: (input) => Promise.resolve(proposal.draftSections(input || {}))
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
      }
    }
  });
}

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
