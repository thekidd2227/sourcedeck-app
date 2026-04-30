// services/ai/providers/local.js
// Default offline AI provider. No network. Returns a deterministic
// canned response so the app remains functional without IBM creds.

'use strict';

function createLocalProvider() {
  return {
    name:    'local',
    modelId: 'local-deterministic-v1',

    /** @returns {{ok:true, provider, model_id, text, request_id, raw}} */
    async generate(input) {
      const prompt = (input && (input.prompt || input.text)) || '';
      const head = prompt.slice(0, 80).replace(/\s+/g, ' ').trim();
      return {
        ok:         true,
        provider:   'local',
        model_id:   'local-deterministic-v1',
        request_id: 'local-' + Date.now().toString(36),
        text:       `[local] ${head ? 'Echoing: ' + head : 'No prompt provided.'}`,
        raw:        { mode: 'offline', length: prompt.length }
      };
    },

    async healthCheck() { return { ok: true, provider: 'local' }; }
  };
}

module.exports = { createLocalProvider };
