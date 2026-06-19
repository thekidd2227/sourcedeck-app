'use strict';

// Phase 25AN — local solicitation file utilities.
//
// These helpers were previously embedded in the (now retired) remote
// SAM.gov package downloader. They are pure, local, filesystem-only
// utilities with no network access and no dependency on the remote
// downloader. solicitation-package-extract.js consumes them so the
// extraction engine works on user-selected local files only.
//
// No remote fetching. No automatic Downloads-folder scanning. No HTML
// rendering. Every function operates on bytes/paths the caller already
// holds.

const fsp = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

// ── App-shell / non-attachment HTML markers (mirrors sam-body-classifier) ──
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

// ZIP safety caps (Phase 25AN Step 12).
const MAX_ZIP_ENTRIES = 512;
const MAX_ZIP_TOTAL_UNCOMPRESSED = 256 * 1024 * 1024; // 256 MB aggregate

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.xml': 'application/xml',
  '.json': 'application/json'
};

// ── File name / extension / path helpers ────────────────────────────────
function sanitizeFileName(name) {
  const base = String(name || 'attachment')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return base && base !== '.' && base !== '..' ? base : 'attachment';
}

function fileExtension(name) {
  return String(path.extname(String(name || ''))).toLowerCase();
}

function ensureInside(root, target) {
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('unsafe_package_path');
  return target;
}

// Validate that `filePath` resolves inside `allowedRoot` (after realpath when
// available). Returns the resolved absolute path or throws 'unsafe_path'.
async function validateFilePath(filePath, allowedRoot) {
  const raw = String(filePath || '');
  if (!raw) throw new Error('empty_path');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) throw new Error('url_not_a_file'); // refuse URL-shaped inputs
  let resolvedRoot;
  let resolvedTarget;
  try { resolvedRoot = await fsp.realpath(allowedRoot); }
  catch (_) { resolvedRoot = path.resolve(allowedRoot); }
  try { resolvedTarget = await fsp.realpath(raw); }
  catch (_) { resolvedTarget = path.resolve(raw); }
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (!resolvedTarget || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('unsafe_path');
  return resolvedTarget;
}

// ── Binary magic / content classification ───────────────────────────────
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

// Returns { ok:true } when the body may be persisted/extracted, or
// { ok:false, reason } when it is an HTML / app-shell / non-attachment page.
// Reasons: 'app_shell_html_response', 'non_attachment_html_response',
// 'unexpected_html_response'.
function classifyLocalFile(buffer, contentType) {
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

function detectMimeType(name, buffer) {
  const ext = fileExtension(name);
  if (MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  if (Buffer.isBuffer(buffer) && hasBinaryAttachmentMagic(buffer)) {
    if (buffer[0] === 0x25 && buffer[1] === 0x50) return 'application/pdf';
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) return 'application/zip';
  }
  return 'application/octet-stream';
}

// ── Local ZIP extraction (no traversal, capped) ─────────────────────────
// Reads a local .zip and writes its entries under outDir. Rejects path
// traversal, caps entry count and aggregate uncompressed size. Pure local
// filesystem — no network.
async function extractZipSafely(zipPath, outDir) {
  const buf = await fsp.readFile(zipPath);
  const extracted = [];
  let off = 0;
  let totalUncompressed = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    if (extracted.length >= MAX_ZIP_ENTRIES) break;
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
    if (name.includes('..') || path.isAbsolute(name) || name.includes('\0')) continue;
    let data = buf.slice(dataStart, dataEnd);
    if (method === 8) {
      try { data = zlib.inflateRawSync(data); }
      catch (_) { continue; }
    } else if (method !== 0) continue;
    if (data.length !== fileSize && fileSize !== 0) continue;
    totalUncompressed += data.length;
    if (totalUncompressed > MAX_ZIP_TOTAL_UNCOMPRESSED) break;
    let target;
    try { target = ensureInside(outDir, path.join(outDir, name)); }
    catch (_) { continue; }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, data);
    extracted.push({ fileName: name, localPath: target, sizeBytes: data.length });
  }
  return extracted;
}

module.exports = {
  // Spec (Phase 25AN Step 5) surface
  extractZipSafely,
  classifyLocalFile,
  validateFilePath,
  sanitizeFileName,
  fileExtension,
  detectMimeType,
  // Internal names consumed by solicitation-package-extract.js
  _extractZip: extractZipSafely,
  _classifyDownloadedBody: classifyLocalFile,
  ensureInside,
  hasBinaryAttachmentMagic,
  APP_SHELL_MARKERS,
  MAX_ZIP_ENTRIES,
  MAX_ZIP_TOTAL_UNCOMPRESSED
};
