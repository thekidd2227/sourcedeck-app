const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sd', {
  // ── Existing secure-key + store (unchanged) ────────────────────────
  storeKey:    (service, key)  => ipcRenderer.invoke('store-key',  service, key),
  getKey:      (service)       => ipcRenderer.invoke('get-key',    service),
  deleteKey:   (service)       => ipcRenderer.invoke('delete-key', service),
  storeGet:    (key)           => ipcRenderer.invoke('store-get',  key),
  storeSet:    (key, value)    => ipcRenderer.invoke('store-set',  key, value),

  // ── IBM-readiness layer (additive, status only — never raw secrets) ──
  aiProviderStatus:      ()                 => ipcRenderer.invoke('ai-provider-status'),
  storageProviderStatus: ()                 => ipcRenderer.invoke('storage-provider-status'),
  aiGenerate:            (input)            => ipcRenderer.invoke('ai-generate', input),
  storageTestPut:        (text)             => ipcRenderer.invoke('storage-test-put', text),
  validateUpload:        (descriptor)       => ipcRenderer.invoke('validate-upload', descriptor),
  contextGet:            ()                 => ipcRenderer.invoke('context-get'),
  contextSet:            (patch)            => ipcRenderer.invoke('context-set', patch),
  guardSensitiveAction:  (name, opts)       => ipcRenderer.invoke('guard-sensitive-action', name, opts),
  auditSummary:          ()                 => ipcRenderer.invoke('audit-summary'),
  auditList:             (opts)             => ipcRenderer.invoke('audit:list', opts),

  // ── GovCon namespace (additive — main-process holds all credentials) ──
  // Renderer never builds Bearer headers for SAM.gov; the SAM key lives
  // in safeStorage and never leaves the main process. Pre-existing
  // Airtable / Apollo / OpenAI / Claude code paths in the renderer
  // remain functional but are scheduled to migrate to this surface --
  // see services/govcon/* for the model and tests/govcon/ for shape.
  govcon: {
    getTargeting:        ()         => ipcRenderer.invoke('govcon:targeting-get'),
    saveTargeting:       (patch)    => ipcRenderer.invoke('govcon:targeting-set', patch),
    resetTargeting:      ()         => ipcRenderer.invoke('govcon:targeting-reset'),
    samSearch:           (filters)  => ipcRenderer.invoke('govcon:sam-search', filters),
    complianceMatrix:    (payload)  => ipcRenderer.invoke('govcon:compliance-matrix', payload),
    evaluatePreRfp:      (payload)  => ipcRenderer.invoke('govcon:pre-rfp-evaluate', payload),
    pastPerformance: {
      list:    ()        => ipcRenderer.invoke('govcon:past-performance-list'),
      save:    (project) => ipcRenderer.invoke('govcon:past-performance-save', project),
      remove:  (id)      => ipcRenderer.invoke('govcon:past-performance-remove', id),
      match:   (opp)     => ipcRenderer.invoke('govcon:past-performance-match', opp)
    },
    stakeholders:        (payload)  => ipcRenderer.invoke('govcon:stakeholders-for-opp', payload),
    opportunities: {
      list:      ()           => ipcRenderer.invoke('govcon:opportunities-list'),
      get:       (id)         => ipcRenderer.invoke('govcon:opportunities-get', id),
      upsert:    (opp)        => ipcRenderer.invoke('govcon:opportunities-upsert', opp),
      favorite:  (id, value)  => ipcRenderer.invoke('govcon:opportunities-favorite', { id, value }),
      favorites: ()           => ipcRenderer.invoke('govcon:opportunities-favorites')
    },
    deadlines: {
      extract:   (input)      => ipcRenderer.invoke('govcon:deadlines-extract', input),
      approve:   (input)      => ipcRenderer.invoke('govcon:deadlines-approve', input)
    },
    subcontractors: {
      source:    (input)      => ipcRenderer.invoke('govcon:subcontractors-source', input)
    },
    incumbent: {
      research:  (input)      => ipcRenderer.invoke('govcon:incumbent-research', input)
    },
    solicitation: {
      analyze:   (input)      => ipcRenderer.invoke('govcon:solicitation-analyze', input)
    },
    clarifications: {
      generate:  (input)      => ipcRenderer.invoke('govcon:clarifications-generate', input),
      relationshipStrategy: (input) => ipcRenderer.invoke('govcon:relationship-strategy', input)
    },
    communications: {
      draftEmail: (input)     => ipcRenderer.invoke('govcon:communications-draft-email', input)
    },
    exports: {
      create:    (input)      => ipcRenderer.invoke('govcon:exports-create', input)
    },
    scheduledSearches: {
      list:      ()           => ipcRenderer.invoke('govcon:scheduled-searches-list'),
      save:      (input)      => ipcRenderer.invoke('govcon:scheduled-searches-save', input),
      run:       (id)         => ipcRenderer.invoke('govcon:scheduled-searches-run', id),
      history:   ()           => ipcRenderer.invoke('govcon:scheduled-searches-history')
    },
    proposal: {
      workspace:  (input)     => ipcRenderer.invoke('govcon:proposal-workspace', input),
      costVolume: (input)     => ipcRenderer.invoke('govcon:proposal-cost-volume', input)
    },
    // SAM.gov Opportunity Outreach Agent (draft-only; key stays main-side).
    outreach: {
      scan:          (config) => ipcRenderer.invoke('govcon:outreach-scan', config),
      generateDraft: (input)  => ipcRenderer.invoke('govcon:outreach-generate-draft', input),
      setStatus:     (input)  => ipcRenderer.invoke('govcon:outreach-set-status', input),
      export:        (input)  => ipcRenderer.invoke('govcon:outreach-export', input)
    },
    primes: {
      find:     (input)  => ipcRenderer.invoke('govcon:primes-find',      input),
      findLive: (input)  => ipcRenderer.invoke('govcon:primes-find-live', input),
      draft:    (input)  => ipcRenderer.invoke('govcon:primes-draft',     input),
      memo:     (input)  => ipcRenderer.invoke('govcon:primes-memo',      input)
    }
  },

  // ── Credential management (presence-only — never returns secrets) ─
  // status() returns { adapter, encryptionAvailable, knownServices,
  //                    present:{ <service>: bool } }
  // set/remove return { ok:true|false, error? }
  credentials: {
    status: ()           => ipcRenderer.invoke('credentials:status'),
    set:    (service, value) => ipcRenderer.invoke('credentials:set',    { service, value }),
    remove: (service)        => ipcRenderer.invoke('credentials:remove', { service })
  },

  // ── Airtable (Authorization header is built outside renderer) ─────
  airtable: {
    listRecords:  (input) => ipcRenderer.invoke('airtable:list',   input),
    createRecord: (input) => ipcRenderer.invoke('airtable:create', input),
    updateRecord: (input) => ipcRenderer.invoke('airtable:update', input),
    deleteRecord: (input) => ipcRenderer.invoke('airtable:delete', input)
  },

  // ── Contact enrichment (Apollo today; FAR-aware safety-noted) ─────
  enrichment: {
    enrichOrganization:  (input) => ipcRenderer.invoke('enrichment:enrich-org',      input),
    searchPeople:        (input) => ipcRenderer.invoke('enrichment:search-people',   input),
    searchOrganizations: (input) => ipcRenderer.invoke('enrichment:search-orgs',     input),
    searchCompanies:     (input) => ipcRenderer.invoke('enrichment:search-companies', input)
  },

  // ── AI generation (OpenAI / Anthropic / watsonx via main process) ─
  ai: {
    generate:              (input) => ipcRenderer.invoke('ai:generate',                 input),
    draftProposalSection:  (input) => ipcRenderer.invoke('ai:draft-proposal-section',   input),
    summarizeOpportunity:  (input) => ipcRenderer.invoke('ai:summarize-opportunity',    input)
  },

  version: '1.1.0',
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback)
});
