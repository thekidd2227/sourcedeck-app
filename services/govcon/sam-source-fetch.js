// services/govcon/sam-source-fetch.js
//
// Phase 25W — SAM.gov source-material fetch service (main-process only).
//
// Fetches a SAM.gov solicitation description link or resource/attachment
// URL through the credential boundary. The SAM.gov public API key lives in
// safeStorage and is appended ONLY here, inside the main process, only when
// the target host is api.sam.gov. The key is never returned to the renderer,
// never written to the returned object, and is redacted from any error text.
//
// Hard boundaries:
//   - No upload. GET only.
//   - Never returns a URL containing api_key (returns the key-free sourceUrlSafe).
//   - Never returns the keyed fetch URL or the key in errors.
//
// Tests inject `fetch` and `getApiKey` via deps so no network is hit.

'use strict';

const MAX_TEXT = 200000; // cap returned text so a huge attachment can't blow the IPC channel

// Remove any api_key (or apikey) query param from a URL string.
function stripApiKey(url) {
  if (!url) return '';
  let s = String(url);
  s = s.replace(/([?&])(api_key|apikey)=[^&#]*&?/gi, function (_m, sep) {
    return sep === '?' ? '?' : '&';
  });
  return s.replace(/[?&]$/, '');
}

// Redact any api_key value that might appear in free text (e.g. an error
// message that echoed the request URL).
function redact(s) {
  return String(s == null ? '' : s).replace(/((?:api_key|apikey)=)[^&#\s"']+/gi, '$1REDACTED');
}

function hostOf(url) {
  try { return new URL(url).host.toLowerCase(); } catch (e) { return ''; }
}

function isSamApiHost(host) {
  return host === 'api.sam.gov' || /\.api\.sam\.gov$/.test(host) || host === 'api.sam.gov.';
}

function createSamSourceFetchService(deps) {
  deps = deps || {};
  const fetchFn = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const getApiKey = deps.getApiKey || (async () => '');

  // payload: { url: string, kind?: 'description'|'resource' }
  async function fetchSource(payload) {
    payload = payload || {};
    const requested = String(payload.url || '').trim();
    if (!/^https?:\/\//i.test(requested)) {
      return { ok: false, reason: 'invalid_url' };
    }
    // Strip any api_key the renderer may have included — we add it ourselves
    // server-side. This guarantees the renderer can never inject a key URL.
    const safeUrl = stripApiKey(requested);
    const host = hostOf(safeUrl);
    if (!host) return { ok: false, reason: 'invalid_url' };

    let fetchUrl = safeUrl;
    const needsKey = isSamApiHost(host);
    if (needsKey) {
      let key = '';
      try { key = await getApiKey(); } catch (e) { key = ''; }
      if (!key) return { ok: false, reason: 'no_api_key', sourceUrlSafe: safeUrl };
      fetchUrl = safeUrl + (safeUrl.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + encodeURIComponent(key);
    }

    if (!fetchFn) return { ok: false, reason: 'no_fetch_available', sourceUrlSafe: safeUrl };

    let resp;
    try {
      resp = await fetchFn(fetchUrl, { method: 'GET' });
    } catch (e) {
      return { ok: false, reason: 'fetch_failed', error: redact(e && e.message), sourceUrlSafe: safeUrl };
    }

    const status = resp && typeof resp.status === 'number' ? resp.status : 0;
    let contentType = '';
    try { contentType = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || ''; } catch (e) {}

    if (!resp || !resp.ok) {
      return { ok: false, reason: 'http_error', status: status, sourceUrlSafe: safeUrl };
    }

    let text = '';
    try { text = await resp.text(); } catch (e) { text = ''; }
    text = redact(text);
    const truncated = text.length > MAX_TEXT;

    return {
      ok: true,
      status: status,
      contentType: contentType,
      text: text.slice(0, MAX_TEXT),
      truncated: truncated,
      sourceUrlSafe: safeUrl // never contains api_key
    };
  }

  return { fetchSource };
}

module.exports = {
  createSamSourceFetchService,
  // exported for unit tests
  _stripApiKey: stripApiKey,
  _redact: redact
};
