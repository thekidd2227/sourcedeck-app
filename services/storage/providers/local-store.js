// services/storage/providers/local-store.js
// Default storage provider. Persists ONLY metadata (not file bodies)
// in electron-store under key `storage.local.objects`. Never trusts
// caller-supplied filenames as paths — uses a server-side generated key.

'use strict';
const crypto = require('crypto');

function newKey() { return 'obj_' + crypto.randomBytes(16).toString('hex'); }

function createLocalStore(store) {
  const KEY = 'storage.local.objects';

  function load() {
    if (!store) return [];
    return store.get(KEY, []) || [];
  }
  function save(items) {
    if (!store) return;
    store.set(KEY, items);
  }

  return {
    name: 'local',

    async put(opts) {
      const meta = {
        provider:        'local',
        bucket:          'electron-store',
        key:             newKey(),
        size:            opts && typeof opts.size === 'number' ? opts.size : null,
        hash:            (opts && opts.hash) || null,
        contentType:     (opts && opts.contentType) || null,
        originalFilename:(opts && opts.originalFilename) || null,
        createdAt:       new Date().toISOString()
      };
      const all = load();
      all.push(meta);
      // Keep recent N for safety on a single-user desktop store.
      while (all.length > 5_000) all.shift();
      save(all);
      return { ok: true, ...meta };
    },

    async list() { return load().slice(); },

    async remove(key) {
      const all = load();
      const next = all.filter(x => x.key !== key);
      save(next);
      return { ok: true, removed: all.length - next.length };
    },

    async healthCheck() { return { ok: true, provider: 'local' }; }
  };
}

module.exports = { createLocalStore };
