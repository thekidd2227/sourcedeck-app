'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');

const PACKAGE_SCHEMA_VERSION = 1;
const MAX_FILE_BYTES = 80 * 1024 * 1024;

function stripApiKey(url) {
  if (!url) return '';
  let s = String(url);
  s = s.replace(/([?&])(api_key|apikey)=[^&#]*&?/gi, (_m, sep) => sep === '?' ? '?' : '&');
  return s.replace(/[?&]$/, '');
}

function redact(s) {
  return String(s == null ? '' : s).replace(/((?:api_key|apikey)=)[^&#\s"']+/gi, '$1REDACTED');
}

// ---------------------------------------------------------------------------
// Response content validation.
//
// SAM.gov and linked resources sometimes answer a "download" request with an
// HTML page instead of the actual attachment: a portal/notice page, a login
// or session-expired redirect, a 4xx/5xx error page, or — worst case — the
// SourceDeck app shell itself (when a request bounced back to the host app
// index). Persisting those bodies leaked UI/CSS/app text into the right-side
// viewer and the solicitation workspace.
//
// classifyDownloadedBody is the gate: it runs before any body is written to
// disk, included in a ZIP entry, or recorded as a downloaded attachment. It
// preserves genuine binary attachments (PDF/ZIP/Office/legacy OLE) by magic
// bytes regardless of the advertised content-type, and rejects HTML / app
// shell / login / error responses with a stable, safe reason code.
const APP_SHELL_MARKERS = [
  'SourceDeck GovCon Pipeline',
  'GovCon Find Opportunities',
  'Operating Hub',
  '.cmd-flow',
  '.cmd-pill',
  '.cc-lcc-grid',
  'tab-govcon',
  'tab-dashboard',
  'SourceDeck does not auto-send'
];

const NON_ATTACHMENT_HTML_RE = /(sign in|log in|logon|please (?:sign|log) in|authentication required|session (?:has )?(?:expired|timed out)|access denied|not authorized|unauthorized|forbidden|error\s*[45]\d\d|http\s*[45]\d\d|page not found|<title>[^<]*(?:login|sign[\s-]?in|log[\s-]?on|error|forbidden|not found|access denied)[^<]*<\/title>)/i;

function hasBinaryAttachmentMagic(buf) {
  if (!buf || buf.length < 4) return false;
  // %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true;
  // ZIP / DOCX / XLSX / PPTX  (PK\x03\x04, PK\x05\x06, PK\x07\x08)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return true;
  // Legacy OLE compound (.doc / .xls): D0 CF 11 E0
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return true;
  return false;
}

// Returns { ok:true } when the body may be persisted, or
// { ok:false, reason } when it is an HTML / app-shell / non-attachment page.
// Reasons: 'app_shell_html_response', 'non_attachment_html_response',
// 'unexpected_html_response'.
function classifyDownloadedBody(buffer, contentType) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  // Genuine binary attachments win outright — their magic bytes are
  // unambiguous and can never be confused with an HTML page.
  if (hasBinaryAttachmentMagic(buf)) return { ok: true };

  const sample = buf.slice(0, 64 * 1024).toString('utf8');
  const head = sample.slice(0, 4096);

  // App shell: SourceDeck's own UI/CSS text. Two distinct markers avoids
  // false positives on a solicitation that merely mentions "SourceDeck".
  let shellHits = 0;
  for (let i = 0; i < APP_SHELL_MARKERS.length; i += 1) {
    if (sample.indexOf(APP_SHELL_MARKERS[i]) >= 0) {
      shellHits += 1;
      if (shellHits >= 2) return { ok: false, reason: 'app_shell_html_response' };
    }
  }

  const ct = String(contentType || '').toLowerCase();
  const htmlContentType = /text\/html|application\/xhtml\+xml/.test(ct);
  // Sniff for a real HTML document. We deliberately do NOT treat a lone
  // `<?xml` / element tag as HTML — valid .xml attachments (and Office
  // document XML) must pass through untouched.
  const looksLikeHtml =
    /<!doctype\s+html/i.test(head) ||
    /<html[\s>]/i.test(head) ||
    (/<head[\s>]/i.test(sample) && /<body[\s>]/i.test(sample)) ||
    (/<meta\b[^>]*\b(?:charset|http-equiv)/i.test(head) && /<\/html\s*>/i.test(sample));

  if (htmlContentType || looksLikeHtml) {
    if (NON_ATTACHMENT_HTML_RE.test(sample)) return { ok: false, reason: 'non_attachment_html_response' };
    return { ok: false, reason: 'unexpected_html_response' };
  }
  return { ok: true };
}

function safeSegment(s) {
  return String(s || 'unknown')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'unknown';
}

function ensureInside(root, target) {
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('unsafe_package_path');
  return target;
}

function hostOf(url) {
  try { return new URL(url).host.toLowerCase(); } catch (_) { return ''; }
}

function isSamApiHost(host) {
  return host === 'api.sam.gov' || host === 'api.sam.gov.' || /\.api\.sam\.gov$/.test(host);
}

function urlToFileName(url, fallback) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent((u.pathname.split('/').filter(Boolean).pop() || '').trim());
    return sanitizeFileName(last || fallback || 'attachment');
  } catch (_) {
    return sanitizeFileName(fallback || 'attachment');
  }
}

function sanitizeFileName(name) {
  const base = String(name || 'attachment')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return base && base !== '.' && base !== '..' ? base : 'attachment';
}

function dedupeFileName(name, used) {
  let clean = sanitizeFileName(name);
  const ext = path.extname(clean);
  const stem = ext ? clean.slice(0, -ext.length) : clean;
  let candidate = clean;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem || 'attachment'}-${n}${ext}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function collectResourceLinks(opportunity) {
  const raw = [];
  const src = opportunity || {};
  if (Array.isArray(src.resourceLinks)) raw.push(...src.resourceLinks);
  if (Array.isArray(src.resources)) raw.push(...src.resources);
  if (src.resourceLink) raw.push(src.resourceLink);
  const links = [];
  const seen = new Set();
  for (const item of raw) {
    let u = '';
    if (typeof item === 'string') u = item;
    else if (item && typeof item === 'object') u = item.href || item.url || item.link || item.uri || '';
    u = stripApiKey(u).trim();
    if (!/^https?:\/\//i.test(u)) continue;
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(u);
  }
  return links;
}

async function responseBuffer(resp) {
  if (!resp) return Buffer.alloc(0);
  if (typeof resp.arrayBuffer === 'function') return Buffer.from(await resp.arrayBuffer());
  if (typeof resp.buffer === 'function') return await resp.buffer();
  if (typeof resp.text === 'function') return Buffer.from(await resp.text(), 'utf8');
  return Buffer.alloc(0);
}

function header(resp, name) {
  try { return (resp.headers && resp.headers.get && resp.headers.get(name)) || ''; } catch (_) { return ''; }
}

function fileNameFromDisposition(disposition) {
  const s = String(disposition || '');
  const utf = s.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) return sanitizeFileName(decodeURIComponent(utf[1]));
  const plain = s.match(/filename="?([^";]+)"?/i);
  return plain ? sanitizeFileName(plain[1]) : '';
}

async function fetchWithKey(fetchFn, getApiKey, safeUrl) {
  const host = hostOf(safeUrl);
  let fetchUrl = safeUrl;
  if (isSamApiHost(host)) {
    let key = '';
    try { key = await getApiKey(); } catch (_) { key = ''; }
    if (!key) return { ok: false, reason: 'no_api_key', sourceUrlSafe: safeUrl };
    fetchUrl = safeUrl + (safeUrl.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(key);
  }
  try {
    const resp = await fetchFn(fetchUrl, { method: 'GET' });
    const status = resp && typeof resp.status === 'number' ? resp.status : 0;
    const contentType = header(resp, 'content-type');
    const disposition = header(resp, 'content-disposition');
    if (!resp || !resp.ok) return { ok: false, reason: 'http_error', status, sourceUrlSafe: safeUrl };
    const buffer = await responseBuffer(resp);
    if (buffer.length > MAX_FILE_BYTES) return { ok: false, reason: 'file_too_large', sourceUrlSafe: safeUrl };
    // Gate the body before any caller can write it to an attachment, add it
    // to a ZIP entry, or save it as the description. HTML / app-shell / login
    // / error pages are rejected here so they never reach disk.
    const verdict = classifyDownloadedBody(buffer, contentType);
    if (!verdict.ok) return { ok: false, reason: verdict.reason, status, contentType, sourceUrlSafe: safeUrl };
    return { ok: true, status, contentType, disposition, buffer, sourceUrlSafe: safeUrl };
  } catch (e) {
    return { ok: false, reason: 'fetch_failed', errorSafe: redact(e && e.message), sourceUrlSafe: safeUrl };
  }
}

function isZipFile(fileName, mimeType, buffer) {
  return /\.zip$/i.test(fileName || '') || /zip/i.test(mimeType || '') || (buffer && buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b);
}

function dosDateTime(date) {
  const d = date || new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, day };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function createZip(zipPath, entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const stamp = dosDateTime(new Date());
  for (const entry of entries) {
    const name = String(entry.name || '').replace(/^\/+/, '');
    if (!name) continue;
    const data = Buffer.isBuffer(entry.data) ? entry.data : await fsp.readFile(entry.path);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralStart = offset;
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  await fsp.writeFile(zipPath, Buffer.concat([...locals, centralBuf, end]));
}

async function extractZip(zipPath, outDir) {
  const buf = await fsp.readFile(zipPath);
  const extracted = [];
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8);
    const compressedSize = buf.readUInt32LE(off + 18);
    const fileSize = buf.readUInt32LE(off + 22);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
    const dataStart = off + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    off = dataEnd;
    if (!name || name.endsWith('/')) continue;
    if (name.includes('..') || path.isAbsolute(name)) continue;
    let data = buf.slice(dataStart, dataEnd);
    if (method === 8) data = zlib.inflateRawSync(data);
    else if (method !== 0) continue;
    if (data.length !== fileSize && fileSize !== 0) continue;
    const target = ensureInside(outDir, path.join(outDir, name));
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, data);
    extracted.push({ fileName: name, localPath: target, sizeBytes: data.length });
  }
  return extracted;
}

function safeSummary(manifest) {
  return {
    ok: true,
    schemaVersion: manifest.schemaVersion,
    noticeId: manifest.noticeId,
    solicitationNumber: manifest.solicitationNumber,
    title: manifest.title,
    agency: manifest.agency,
    downloadedAt: manifest.downloadedAt,
    resourceCount: manifest.resourceCount,
    downloadedCount: manifest.downloadedCount,
    failedCount: manifest.failedCount,
    descriptionFetched: manifest.descriptionFetched,
    localZipPath: manifest.localZipPath,
    packagePath: manifest.packagePath,
    files: (manifest.files || []).map(f => ({
      id: f.id,
      safeUrl: f.safeUrl,
      fileName: f.fileName,
      localPath: f.localPath,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      status: f.status,
      errorSafe: f.errorSafe || '',
      extractedFiles: f.extractedFiles || []
    }))
  };
}

function createSamPackageDownloadService(deps) {
  deps = deps || {};
  const fetchFn = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const getApiKey = deps.getApiKey || (async () => '');
  const userDataPath = deps.userDataPath;
  const now = deps.now || (() => Date.now());

  if (!userDataPath) throw new Error('sam-package-download: userDataPath is required');

  async function downloadPackage(opportunity) {
    if (!fetchFn) return { ok: false, reason: 'no_fetch_available' };
    const o = opportunity || {};
    const noticeId = safeSegment(o.noticeId || o.id || o.solicitationNumber || 'unknown-notice');
    const root = path.join(userDataPath, 'govcon', 'solicitations', noticeId);
    const attachmentsDir = path.join(root, 'attachments');
    const extractedDir = path.join(root, 'extracted');
    const sourceDir = path.join(root, 'source');
    await fsp.mkdir(attachmentsDir, { recursive: true });
    await fsp.mkdir(extractedDir, { recursive: true });
    await fsp.mkdir(sourceDir, { recursive: true });

    const resourceLinks = collectResourceLinks(o);
    const files = [];
    const zipEntries = [];
    const used = new Set();
    let descriptionFetched = false;

    const descriptionLink = stripApiKey(o.descriptionLink || o.description || '');
    if (/^https?:\/\//i.test(descriptionLink)) {
      const res = await fetchWithKey(fetchFn, getApiKey, descriptionLink);
      if (res.ok) {
        const text = res.buffer.toString('utf8');
        const localPath = path.join(sourceDir, 'description.txt');
        await fsp.writeFile(localPath, text);
        descriptionFetched = true;
        files.push({
          id: 'description',
          originalUrl: res.sourceUrlSafe,
          safeUrl: res.sourceUrlSafe,
          fileName: 'description.txt',
          localPath,
          mimeType: res.contentType || 'text/plain',
          sizeBytes: Buffer.byteLength(text),
          status: 'downloaded',
          errorSafe: ''
        });
        zipEntries.push({ name: 'source/description.txt', path: localPath });
      } else {
        files.push({
          id: 'description',
          originalUrl: descriptionLink,
          safeUrl: descriptionLink,
          fileName: 'description.txt',
          localPath: '',
          mimeType: '',
          sizeBytes: 0,
          status: 'failed',
          errorSafe: redact(res.errorSafe || res.reason || 'description_fetch_failed')
        });
      }
    }

    for (let i = 0; i < resourceLinks.length; i += 1) {
      const safeUrl = resourceLinks[i];
      const res = await fetchWithKey(fetchFn, getApiKey, safeUrl);
      const id = `resource-${i + 1}`;
      if (!res.ok) {
        files.push({
          id,
          originalUrl: safeUrl,
          safeUrl,
          fileName: urlToFileName(safeUrl, `attachment-${i + 1}`),
          localPath: '',
          mimeType: '',
          sizeBytes: 0,
          status: 'failed',
          errorSafe: redact(res.errorSafe || res.reason || 'download_failed')
        });
        continue;
      }
      const suggested = fileNameFromDisposition(res.disposition) || urlToFileName(safeUrl, `attachment-${i + 1}`);
      const fileName = dedupeFileName(suggested, used);
      const localPath = path.join(attachmentsDir, fileName);
      await fsp.writeFile(localPath, res.buffer);
      const rec = {
        id,
        originalUrl: res.sourceUrlSafe,
        safeUrl: res.sourceUrlSafe,
        fileName,
        localPath,
        mimeType: res.contentType || '',
        sizeBytes: res.buffer.length,
        status: 'downloaded',
        errorSafe: ''
      };
      zipEntries.push({ name: `attachments/${fileName}`, path: localPath });
      if (isZipFile(fileName, res.contentType, res.buffer)) {
        try {
          const extracted = await extractZip(localPath, extractedDir);
          rec.extractedFiles = extracted.map(x => ({
            fileName: x.fileName,
            localPath: x.localPath,
            sizeBytes: x.sizeBytes
          }));
          for (const ex of extracted) zipEntries.push({ name: `extracted/${ex.fileName}`, path: ex.localPath });
        } catch (e) {
          rec.extractionErrorSafe = redact(e && e.message);
        }
      }
      files.push(rec);
    }

    const localZipPath = path.join(root, 'sourcedeck-package.zip');
    if (zipEntries.length) await createZip(localZipPath, zipEntries);

    const downloadedCount = files.filter(f => f.status === 'downloaded').length;
    const failedCount = files.filter(f => f.status === 'failed').length;
    const manifest = {
      schemaVersion: PACKAGE_SCHEMA_VERSION,
      noticeId: String(o.noticeId || o.id || ''),
      solicitationNumber: String(o.solicitationNumber || ''),
      title: String(o.title || ''),
      agency: String(o.agency || o.department || ''),
      downloadedAt: new Date(now()).toISOString(),
      resourceCount: resourceLinks.length,
      downloadedCount,
      failedCount,
      descriptionFetched,
      localZipPath: zipEntries.length ? localZipPath : '',
      packagePath: root,
      files
    };
    const manifestPath = path.join(root, 'package.json');
    await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return safeSummary(Object.assign({}, manifest, { manifestPath }));
  }

  return { downloadPackage, packageRoot: path.join(userDataPath, 'govcon', 'solicitations') };
}

module.exports = {
  createSamPackageDownloadService,
  _stripApiKey: stripApiKey,
  _redact: redact,
  _collectResourceLinks: collectResourceLinks,
  _classifyDownloadedBody: classifyDownloadedBody,
  _hasBinaryAttachmentMagic: hasBinaryAttachmentMagic,
  _createZip: createZip,
  _extractZip: extractZip,
  _crc32: crc32
};
