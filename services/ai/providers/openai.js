// services/ai/providers/openai.js
//
// OpenAI provider for the SourceDeck main-process / API tier.
//
// Pulls the API key from the CredentialStore at call time. Renderer
// never sees the key. Returns a normalized AI-result shape that
// matches the watsonx + local providers.
//
// Pure data layer; no DOM, no Electron import.

'use strict';

const HUMAN_REVIEW_REQUIRED = 'AI draft. Human review required before submission.';

function createOpenaiProvider(deps) {
  deps = deps || {};
  const credentials = deps.credentials;
  if (!credentials || typeof credentials.get !== 'function') {
    throw new Error('openai: deps.credentials with get() is required');
  }
  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  const modelId = deps.modelId || 'gpt-4o-mini';
  const audit   = deps.audit || null;

  function _audit(eventType, status, metadata) {
    if (!audit || typeof audit.append !== 'function') return;
    try {
      audit.append({
        type: eventType, provider: 'openai', modelId,
        status, metadata: metadata || {}
      });
    } catch (_) {}
  }

  return Object.freeze({
    name: 'openai',
    modelId,
    configured: true, // determined per-call (key may not be present yet)

    async generate(input) {
      input = input || {};
      const sysPrompt   = String(input.systemPrompt || '').slice(0, 8000);
      const userMessage = String(input.userMessage || input.prompt || '').slice(0, 16000);
      const maxTokens   = Math.max(64, Math.min(4096, (input.maxTokens || 800) | 0));
      if (!fetchFn) {
        return { ok: false, provider: 'openai', error: 'no_fetch_available' };
      }
      const apiKey = await credentials.get('openai');
      if (!apiKey) {
        _audit('AI_REQUEST_FAILED', 'denied', { reason: 'no_credential' });
        return { ok: false, provider: 'openai', error: 'no_credential' };
      }
      _audit('AI_REQUEST_CREATED', 'pending', { surface: input.surface || 'generic' });
      let resp;
      try {
        resp = await fetchFn('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            messages: [
              { role: 'system', content: sysPrompt || 'You are SourceDeck, a GovCon capture assistant. Always end output with: \"AI draft. Human review required.\"' },
              { role: 'user',   content: userMessage }
            ]
          })
        });
      } catch (e) {
        _audit('AI_REQUEST_FAILED', 'error', { reason: 'fetch_failed' });
        return { ok: false, provider: 'openai', error: 'fetch_failed', detail: e.message };
      }
      if (!resp.ok) {
        _audit('AI_REQUEST_FAILED', 'error', { status: resp.status });
        return { ok: false, provider: 'openai', error: 'http_' + resp.status };
      }
      let body = null;
      try { body = await resp.json(); } catch (_) {
        return { ok: false, provider: 'openai', error: 'invalid_json' };
      }
      const text = (body && body.choices && body.choices[0]
        && body.choices[0].message && body.choices[0].message.content) || '';
      _audit('AI_RESPONSE_RECEIVED', 'ok', { textLength: text.length, usage: body && body.usage || null });
      return {
        ok: true,
        provider: 'openai',
        model_id: modelId,
        text,
        aiPolicy: HUMAN_REVIEW_REQUIRED,
        raw: body
      };
    }
  });
}

module.exports = { createOpenaiProvider, HUMAN_REVIEW_REQUIRED };
