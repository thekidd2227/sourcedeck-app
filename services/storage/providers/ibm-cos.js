// services/storage/providers/ibm-cos.js
// IBM Cloud Object Storage adapter using S3-compatible HMAC creds.
//
// Signs requests with `aws4` (~30 KB) and dispatches via Node's built-in
// fetch. No AWS SDK dependency.
//
// Hard rules:
//   - never log access key / secret
//   - object keys are server-generated, never the user's filename
//   - errors return normalized shapes; raw HTTP body is truncated to 500 chars
//   - main-process only (creds must never reach the renderer)

'use strict';
const crypto = require('crypto');

let _aws4 = null;
function loadAws4() {
  if (_aws4) return _aws4;
  try { _aws4 = require('aws4'); return _aws4; }
  catch { throw new Error('storage.ibm_cos: aws4 package not installed. Run `npm i aws4`.'); }
}

function newKey() { return 'obj_' + crypto.randomBytes(16).toString('hex'); }

/** Strip "https://" prefix from endpoint to feed aws4's `host` field. */
function endpointHost(endpointUrl) {
  return String(endpointUrl || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function createIbmCosProvider(cfg, deps) {
  const fetchImpl = (deps && deps.fetch) || globalThis.fetch;

  if (!cfg || !cfg.endpoint || !cfg.bucket || !cfg.region || !cfg.accessKeyId || !cfg.secretAccessKey) {
    return {
      name:       'ibm-cos',
      configured: false,
      missing:    [
        !cfg || !cfg.endpoint        ? 'IBM_COS_ENDPOINT'           : null,
        !cfg || !cfg.bucket          ? 'IBM_COS_BUCKET'             : null,
        !cfg || !cfg.region          ? 'IBM_COS_REGION'             : null,
        !cfg || !cfg.accessKeyId     ? 'IBM_COS_ACCESS_KEY_ID'      : null,
        !cfg || !cfg.secretAccessKey ? 'IBM_COS_SECRET_ACCESS_KEY'  : null
      ].filter(Boolean),
      async put()         { return { ok: false, error: 'ibm_cos_not_configured' }; },
      async head()        { return { ok: false, error: 'ibm_cos_not_configured' }; },
      async remove()      { return { ok: false, error: 'ibm_cos_not_configured' }; },
      async healthCheck() { return { ok: false, provider: 'ibm-cos', reason: 'missing_config' }; }
    };
  }

  // aws4 expects an opts object that includes host, path, region, service, body, headers.
  const SERVICE = 's3';
  const host    = endpointHost(cfg.endpoint);
  const baseUrl = `https://${host}`;

  function sign(opts) {
    const aws4 = loadAws4();
    return aws4.sign(opts, { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey });
  }

  async function send(method, key, body, contentType, extraHeaders) {
    const safeKey = (key || '').replace(/^\/+/, '');
    if (!safeKey || safeKey.includes('..') || safeKey.includes('\0'))
      return { ok: false, error: 'invalid_key' };

    const headers = Object.assign({ host }, extraHeaders || {});
    if (body)        headers['content-length'] = Buffer.byteLength(body).toString();
    if (contentType) headers['content-type']   = contentType;

    const signed = sign({
      host, region: cfg.region, service: SERVICE,
      method,
      path:    `/${cfg.bucket}/${encodeURIComponent(safeKey)}`,
      body:    body || undefined,
      headers
    });

    let r;
    try {
      r = await fetchImpl(baseUrl + signed.path, {
        method,
        headers: signed.headers,
        body:    body || undefined
      });
    } catch {
      return { ok: false, error: 'network_error' };
    }

    if (!r.ok) {
      let detail = '';
      try { detail = (await r.text()).slice(0, 500); } catch (_) { /* ignore */ }
      return { ok: false, error: `ibm_cos_http_${r.status}`, status: r.status, detail };
    }

    return { ok: true, response: r };
  }

  return {
    name:       'ibm-cos',
    configured: true,
    missing:    [],

    /**
     * Upload a small object. `opts.buffer` (Buffer | string), optional
     * `opts.originalFilename` is stored only as object metadata, never
     * as the key. Returns normalized result without ever including
     * credentials.
     */
    async put(opts) {
      const buf = Buffer.isBuffer(opts && opts.buffer)
        ? opts.buffer
        : (typeof (opts && opts.buffer) === 'string' ? Buffer.from(opts.buffer, 'utf8') : null);
      if (!buf) return { ok: false, error: 'missing_buffer' };

      const key   = newKey();
      const ctype = (opts && opts.contentType) || 'application/octet-stream';
      const meta  = {};
      if (opts && opts.originalFilename) meta['x-amz-meta-original-filename'] = String(opts.originalFilename);
      if (opts && opts.tenantId)         meta['x-amz-meta-tenant-id']         = String(opts.tenantId);

      const send_ = await send('PUT', key, buf, ctype, meta);
      if (!send_.ok) return send_;

      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      return {
        ok:               true,
        provider:         'ibm-cos',
        bucket:           cfg.bucket,
        key,
        size:             buf.length,
        hash,
        contentType:      ctype,
        originalFilename: (opts && opts.originalFilename) || null,
        createdAt:        new Date().toISOString()
      };
    },

    /** HEAD object. Returns headers as an object, never echoes creds. */
    async head(key) {
      const r = await send('HEAD', key);
      if (!r.ok) return r;
      const headers = {};
      r.response.headers.forEach((v, k) => { headers[k] = v; });
      return { ok: true, provider: 'ibm-cos', bucket: cfg.bucket, key, headers };
    },

    async remove(key) {
      const r = await send('DELETE', key);
      if (!r.ok) return r;
      return { ok: true, provider: 'ibm-cos', bucket: cfg.bucket, key, deleted: true };
    },

    /** Cheap connectivity check: HEAD the bucket itself. */
    async healthCheck() {
      const r = await send('HEAD', '');
      // HEAD on bucket can return 200 or sometimes 403 with explicit auth ok.
      if (r.ok) return { ok: true, provider: 'ibm-cos', bucket: cfg.bucket };
      return { ok: false, provider: 'ibm-cos', reason: r.error || 'unknown' };
    }
  };
}

module.exports = { createIbmCosProvider, endpointHost };
