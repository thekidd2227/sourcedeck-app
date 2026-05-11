// services/settings/credentials.js
//
// Credential abstraction for SourceDeck.
//
// PROBLEM IT SOLVES
// Today's renderer reads API credentials directly from localStorage
// (lcc_AT_PAT, lcc_APOLLO_KEY, lcc_OPENAI_KEY, lcc_CLAUDE_KEY) and
// builds Bearer headers in browser code. That's unsafe for a
// web-first product and harder to evolve into a real backend vault.
//
// WHAT THIS PROVIDES
// A platform-neutral credential adapter with one shape -- a
// CredentialStore -- and a set of named adapters that can be plugged
// in based on environment:
//
//   - SafeStorageAdapter (Electron main process, uses safeStorage +
//     electron-store -- the existing pattern in main.js)
//   - MemoryAdapter (tests, dev sandbox)
//   - VaultAdapter (placeholder; future server-side vault)
//
// The renderer / web app should NEVER construct one of these
// directly. They should call an IPC / API surface that the
// main-process or backend implements using one of these adapters.
//
// SUPPORTED SERVICE NAMES (canonical)
// SourceDeck stores credentials under stable lowercase service IDs:
//
//   - 'sam-gov'      SAM.gov Opportunities API key
//   - 'airtable'     Airtable Personal Access Token
//   - 'apollo'       Apollo enrichment API key
//   - 'openai'       OpenAI API key (legacy renderer path)
//   - 'anthropic'    Anthropic / Claude API key (legacy renderer path)
//   - 'watsonx'      IBM watsonx API key (already main-process only)
//   - 'ibm-cos'      IBM Cloud Object Storage HMAC pair
//
// SECURITY GUARANTEES
//   - get() returns the raw string only inside the trust boundary
//     that owns the adapter (main process or backend).
//   - status() returns a presence-only summary safe for UI display.
//   - Adapters never echo a value into logs or audit metadata.

'use strict';

const KNOWN_SERVICES = Object.freeze([
  'sam-gov', 'airtable', 'apollo', 'openai', 'anthropic',
  'watsonx', 'ibm-cos'
]);

function _validate(serviceName) {
  if (typeof serviceName !== 'string' || !serviceName.trim()) {
    throw new TypeError('credentials: serviceName must be a non-empty string');
  }
  // Allow caller to use any serviceName, but log known ones distinctly
  // so audit trails can flag unknown / typo'd names later.
  return serviceName.trim().toLowerCase();
}

// ── In-memory adapter (tests / dev sandbox) ─────────────────────────
function createMemoryCredentialStore() {
  const m = new Map();
  return Object.freeze({
    name: 'memory',
    async get(serviceName) {
      return m.has(_validate(serviceName)) ? m.get(_validate(serviceName)) : null;
    },
    async set(serviceName, value) {
      if (typeof value !== 'string' || !value.length) {
        return { ok: false, error: 'empty_value' };
      }
      m.set(_validate(serviceName), value);
      return { ok: true };
    },
    async remove(serviceName) {
      m.delete(_validate(serviceName));
      return { ok: true };
    },
    async status() {
      const present = {};
      for (const k of m.keys()) present[k] = true;
      return { adapter: 'memory', knownServices: KNOWN_SERVICES, present };
    }
  });
}

// ── Electron safeStorage + electron-store adapter ───────────────────
//
// Mirrors the pattern used by main.js for the existing 'keys.{service}'
// store path. The adapter is created in the main process; renderers
// must reach it via IPC.
//
// Inputs:
//   deps.store        electron-store instance (or any get/set/delete shim)
//   deps.safeStorage  Electron safeStorage object (or null in dev)
function createSafeStorageCredentialStore(deps) {
  deps = deps || {};
  const store = deps.store;
  const safeStorage = deps.safeStorage || null;
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('credentials: createSafeStorageCredentialStore requires deps.store with get/set');
  }
  const KEY = (s) => `keys.${_validate(s)}`;

  function _encryptionAvailable() {
    try { return !!(safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()); }
    catch (_) { return false; }
  }

  return Object.freeze({
    name: 'safeStorage',
    async get(serviceName) {
      const v = store.get(KEY(serviceName));
      if (!v) return null;
      if (_encryptionAvailable()) {
        try { return safeStorage.decryptString(Buffer.from(v, 'base64')); }
        catch (_) { return null; }
      }
      return v;
    },
    async set(serviceName, value) {
      if (typeof value !== 'string' || !value.length) {
        return { ok: false, error: 'empty_value' };
      }
      try {
        if (_encryptionAvailable()) {
          const encrypted = safeStorage.encryptString(value);
          store.set(KEY(serviceName), encrypted.toString('base64'));
        } else {
          store.set(KEY(serviceName), value);
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'set_failed' };
      }
    },
    async remove(serviceName) {
      try {
        if (typeof store.delete === 'function') store.delete(KEY(serviceName));
        else store.set(KEY(serviceName), null);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'remove_failed' };
      }
    },
    async status() {
      const present = {};
      for (const s of KNOWN_SERVICES) {
        const v = store.get(KEY(s));
        present[s] = !!v;
      }
      return {
        adapter: 'safeStorage',
        knownServices: KNOWN_SERVICES,
        present,
        encryptionAvailable: _encryptionAvailable()
      };
    }
  });
}

// ── Vault adapter placeholder ───────────────────────────────────────
//
// When SourceDeck grows a real backend, swap this in. The interface
// is identical: get/set/remove/status. The adapter lives in the
// API/backend tier; UI never imports it directly.
function createVaultCredentialStore(_deps) {
  return Object.freeze({
    name: 'vault',
    async get()    { return null; },
    async set()    { return { ok: false, error: 'vault_adapter_not_implemented' }; },
    async remove() { return { ok: false, error: 'vault_adapter_not_implemented' }; },
    async status() {
      return { adapter: 'vault', knownServices: KNOWN_SERVICES, present: {}, note: 'placeholder; implement against your backend vault' };
    }
  });
}

// ── Renderer-safe presence summary helper ───────────────────────────
//
// Wraps a CredentialStore and returns a summary that is SAFE TO RETURN
// to the renderer / web client (no values, only presence + adapter
// name + known service catalog).
async function summarizePresence(store) {
  const s = await store.status();
  const present = s.present || {};
  return Object.freeze({
    adapter: s.adapter || 'unknown',
    encryptionAvailable: !!s.encryptionAvailable,
    knownServices: s.knownServices || KNOWN_SERVICES,
    present: Object.fromEntries(Object.entries(present).map(([k, v]) => [k, !!v]))
  });
}

module.exports = {
  KNOWN_SERVICES,
  createMemoryCredentialStore,
  createSafeStorageCredentialStore,
  createVaultCredentialStore,
  summarizePresence
};
