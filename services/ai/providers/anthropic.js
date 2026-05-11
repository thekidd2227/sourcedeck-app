// services/ai/providers/anthropic.js
//
// Anthropic Claude provider for the SourceDeck main-process / API tier.
//
// Mirrors the openai.js shape. Pulls the API key from the
// CredentialStore at call time. Renderer never sees the key.

'use strict';

const HUMAN_REVIEW_REQUIRED = 'AI draft. Human review required before submission.';

function createAnthropicProvider(deps) {
  deps = deps || {};
  const credentials = deps.credentials;
  if (!credentials || typeof credentials.get !== 'function') {
    throw new Error('anthropic: deps.credentials with get() is required');
  }
  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  const modelId = deps.modelId || 'claude-sonnet-4-20250514';
  const audit   = deps.audit || null;

  function _audit(eventType, status, metadata) {
    if (!audit || typeof audit.append !== 'function') return;
    try {
      audit.append({
        type: eventType, provider: 'anthropic', modelId,
        status, metadata: metadata || {}
      });
    } catch (_) {}
  }

  return Object.freeze({
    name: 'anthropic',
    modelId,
    configured: true, // determined per-call

    async generate(input) {
      input = input || {};
      const sysPrompt   = String(input.systemPrompt || '').slice(0, 8000);
      const userMessage = String(input.userMessage || input.prompt || '').slice(0, 16000);
      const maxTokens   = Math.max(64, Math.min(4096, (input.maxTokens || 800) | 0));
      if (!fetchFn) return { ok: false, provider: 'anthropic', error: 'no_fetch_available' };
      const apiKey = await credentials.get('anthropic');
      if (!apiKey) {
        _audit('AI_REQUEST_FAILED', 'denied', { reason: 'no_credential' });
        return { ok: false, provider: 'anthropic', error: 'no_credential' };
      }
      _audit('AI_REQUEST_CREATED', 'pending', { surface: input.surface || 'generic' });
      let resp;
      try {
        resp = await fetchFn('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type':       'application/json',
            'x-api-key':          apiKey,
            'anthropic-version':  '2023-06-01'
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            system: sysPrompt || 'You are SourceDeck, a GovCon capture assistant. Always end output with: \"AI draft. Human review required.\"',
            messages: [{ role: 'user', content: userMessage }]
          })
        });
      } catch (e) {
        _audit('AI_REQUEST_FAILED', 'error', { reason: 'fetch_failed' });
        return { ok: false, provider: 'anthropic', error: 'fetch_failed', detail: e.message };
      }
      if (!resp.ok) {
        _audit('AI_REQUEST_FAILED', 'error', { status: resp.status });
        return { ok: false, provider: 'anthropic', error: 'http_' + resp.status };
      }
      let body = null;
      try { body = await resp.json(); } catch (_) {
        return { ok: false, provider: 'anthropic', error: 'invalid_json' };
      }
      const text = (body && Array.isArray(body.content)
        ? body.content.filter(c => c.type === 'text').map(c => c.text || '').join('')
        : '');
      _audit('AI_RESPONSE_RECEIVED', 'ok', { textLength: text.length, usage: body && body.usage || null });
      return {
        ok: true,
        provider: 'anthropic',
        model_id: modelId,
        text,
        aiPolicy: HUMAN_REVIEW_REQUIRED,
        raw: body
      };
    }
  });
}

module.exports = { createAnthropicProvider, HUMAN_REVIEW_REQUIRED };
