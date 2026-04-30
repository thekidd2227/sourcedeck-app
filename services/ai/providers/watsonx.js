// services/ai/providers/watsonx.js
// Real IBM watsonx.ai provider for the Electron app. Main-process only.
//
// Uses Node's built-in fetch (Electron 29 ships Node 20). No SDK
// dependency. Caches the IAM bearer token in memory until ~60s before
// expiry. Never logs the API key, never exposes the bearer to the
// renderer, never echoes prompt or response body in errors.

'use strict';

let _tokenCache = { token: null, expiresAt: 0 };

async function getIamToken(apiKey, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const now = Date.now();
  if (_tokenCache.token && _tokenCache.expiresAt - 60_000 > now) return _tokenCache.token;

  const r = await fetchFn('https://iam.cloud.ibm.com/identity/token', {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body:    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey:     apiKey
    }).toString()
  });

  if (!r.ok) {
    // Don't include any apiKey material in the thrown error.
    const err = new Error(`watsonx_iam_failed_${r.status}`);
    err.code = 'iam_auth_failed';
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  _tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in * 1000) };
  return _tokenCache.token;
}

/** Test seam: lets unit tests reset the cached token between runs. */
function _resetTokenCache() { _tokenCache = { token: null, expiresAt: 0 }; }

function createWatsonxProvider(cfg, deps) {
  const fetchImpl = (deps && deps.fetch) || globalThis.fetch;

  if (!cfg || !cfg.apiKey || !(cfg.projectId || cfg.spaceId) || !cfg.url) {
    // Provider returns disabled state rather than throwing — caller's
    // responsibility to fall back to local provider.
    return {
      name:        'watsonx',
      modelId:     cfg && cfg.modelId,
      configured:  false,
      missing:     [
        !cfg || !cfg.apiKey                              ? 'WATSONX_API_KEY'                          : null,
        !cfg || !(cfg.projectId || cfg.spaceId)          ? 'WATSONX_PROJECT_ID (or WATSONX_SPACE_ID)' : null,
        !cfg || !cfg.url                                 ? 'WATSONX_URL'                              : null
      ].filter(Boolean),
      async generate() {
        return { ok: false, provider: 'watsonx', error: 'watsonx_not_configured' };
      },
      async healthCheck() { return { ok: false, provider: 'watsonx', reason: 'missing_config' }; }
    };
  }

  const baseUrl  = cfg.url.replace(/\/$/, '');
  const modelId  = cfg.modelId || 'ibm/granite-13b-chat-v2';

  async function generate(input) {
    const prompt = (input && (input.prompt || input.text)) || '';
    if (!prompt || typeof prompt !== 'string') {
      return { ok: false, provider: 'watsonx', error: 'empty_prompt' };
    }

    let token;
    try {
      token = await getIamToken(cfg.apiKey, fetchImpl);
    } catch (err) {
      return { ok: false, provider: 'watsonx', error: 'iam_auth_failed', status: err.status || null };
    }

    const url = `${baseUrl}/ml/v1/text/generation?version=2024-05-31`;
    const params = (input && input.parameters) || {};
    const reqBody = {
      model_id: modelId,
      input:    prompt,
      ...(cfg.projectId ? { project_id: cfg.projectId } : { space_id: cfg.spaceId }),
      parameters: {
        decoding_method:    params.decoding_method    || 'greedy',
        max_new_tokens:     params.max_new_tokens     || 600,
        repetition_penalty: params.repetition_penalty || 1.05
      }
    };

    let r;
    try {
      r = await fetchImpl(url, {
        method:  'POST',
        headers: {
          authorization:  `Bearer ${token}`,
          'content-type': 'application/json',
          accept:         'application/json'
        },
        body:    JSON.stringify(reqBody)
      });
    } catch (err) {
      // Network-class error. Don't echo any bearer or prompt content.
      return { ok: false, provider: 'watsonx', error: 'network_error' };
    }

    if (!r.ok) {
      // Read body but never persist or log it raw — return a normalized error.
      let bodyText = '';
      try { bodyText = (await r.text()).slice(0, 500); } catch (_) { /* ignore */ }
      return {
        ok:        false,
        provider:  'watsonx',
        error:     `watsonx_http_${r.status}`,
        status:    r.status,
        // include body summary for diagnostics; the audit layer redacts further.
        detail:    bodyText
      };
    }

    let j = null;
    try { j = await r.json(); }
    catch { return { ok: false, provider: 'watsonx', error: 'invalid_json' }; }

    const text       = j.results && j.results[0] && j.results[0].generated_text;
    const reqId      = j.results && j.results[0] && j.results[0].id;
    const inputToks  = j.results && j.results[0] && j.results[0].input_token_count;
    const outputToks = j.results && j.results[0] && j.results[0].generated_token_count;

    if (typeof text !== 'string' || !text.length) {
      return { ok: false, provider: 'watsonx', error: 'empty_response', request_id: reqId || null };
    }

    return {
      ok:         true,
      provider:   'watsonx',
      model_id:   modelId,
      request_id: reqId || null,
      text,
      raw: {
        usage: { inputTokens: inputToks ?? null, outputTokens: outputToks ?? null }
      }
    };
  }

  async function healthCheck() {
    try {
      await getIamToken(cfg.apiKey, fetchImpl);
      return { ok: true, provider: 'watsonx' };
    } catch (err) {
      return { ok: false, provider: 'watsonx', reason: err.code || 'unknown' };
    }
  }

  return {
    name: 'watsonx',
    modelId,
    configured: true,
    missing: [],
    generate,
    healthCheck
  };
}

module.exports = { createWatsonxProvider, getIamToken, _resetTokenCache };
