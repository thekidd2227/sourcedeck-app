// services/security/upload-validation.js
// Pure file-validation utilities. No fs / no Electron deps so they're
// safe to call from anywhere. Caller passes either a Buffer or a
// { name, size, mimeType, buffer? } descriptor.

'use strict';
const path   = require('path');
const crypto = require('crypto');

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const DEFAULT_MIME_ALLOWLIST = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp'
];

const DEFAULT_EXT_ALLOWLIST = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
  '.png', '.jpg', '.jpeg', '.webp'
];

const EXT_BY_MIME = {
  'application/pdf':                                                          '.pdf',
  'application/msword':                                                       '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':        '.xlsx',
  'application/vnd.ms-excel':                                                 '.xls',
  'text/plain':                                                               '.txt',
  'text/csv':                                                                 '.csv',
  'image/png':                                                                '.png',
  'image/jpeg':                                                               '.jpg',
  'image/webp':                                                               '.webp'
};

/** Strip path components, preserve extension; never empty. */
function normalizeFilename(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return 'upload.bin';
  // Block traversal early.
  if (raw.includes('\0')) return 'upload.bin';
  // Take the basename only.
  let base = path.basename(raw);
  // Replace anything that isn't safe.
  base = base.replace(/[^A-Za-z0-9._\- ]+/g, '_').trim();
  // Collapse multiple dots-in-a-row.
  base = base.replace(/\.{2,}/g, '.');
  // No leading dot.
  if (base.startsWith('.')) base = 'file' + base;
  if (!base) base = 'upload.bin';
  return base;
}

function hashSha256(input) {
  if (!input) return null;
  const h = crypto.createHash('sha256');
  if (Buffer.isBuffer(input)) h.update(input);
  else if (typeof input === 'string') h.update(input, 'utf8');
  else return null;
  return h.digest('hex');
}

/**
 * Validate a file descriptor.
 * @returns {{ok:true, normalized:string, hash?:string} | {ok:false, code:string, detail?:string}}
 */
function validateUpload(descriptor, opts) {
  const o = opts || {};
  const maxBytes      = o.maxBytes      || DEFAULT_MAX_BYTES;
  const mimeAllowlist = (o.mimeAllowlist || DEFAULT_MIME_ALLOWLIST).map(s => s.toLowerCase());
  const extAllowlist  = (o.extAllowlist  || DEFAULT_EXT_ALLOWLIST).map(s => s.toLowerCase());

  const raw = descriptor || {};
  const rawName = raw.name || raw.filename || raw.originalname || '';
  if (!rawName)                       return { ok: false, code: 'missing_filename' };
  if (rawName.includes('\0'))         return { ok: false, code: 'invalid_filename', detail: 'null byte' };
  if (rawName.includes('..'))         return { ok: false, code: 'path_traversal' };
  if (rawName.includes('/') || rawName.includes('\\'))
                                      return { ok: false, code: 'path_traversal' };

  const normalized = normalizeFilename(rawName);
  if (!normalized || normalized === '.bin' || normalized === 'upload.bin' && rawName.length > 4) {
    // we accept normalize-fallback only when the raw name was completely empty/dot
    if (!rawName.trim() || /^\.+$/.test(rawName.trim()))
      return { ok: false, code: 'empty_filename' };
  }

  const ext = path.extname(normalized).toLowerCase();
  if (ext && !extAllowlist.includes(ext))   return { ok: false, code: 'extension_not_allowed', detail: ext };

  const mime = String(raw.mimeType || raw.mimetype || '').toLowerCase();
  if (mime && !mimeAllowlist.includes(mime)) return { ok: false, code: 'mime_not_allowed', detail: mime };
  if (mime && ext && EXT_BY_MIME[mime] && EXT_BY_MIME[mime] !== ext)
                                             return { ok: false, code: 'extension_mime_mismatch', detail: `${ext} vs ${mime}` };

  const size = typeof raw.size === 'number' ? raw.size
             : Buffer.isBuffer(raw.buffer) ? raw.buffer.length
             : 0;
  if (size > maxBytes)                       return { ok: false, code: 'too_large', detail: `${size} > ${maxBytes}` };

  const hash = Buffer.isBuffer(raw.buffer) ? hashSha256(raw.buffer) : null;
  return { ok: true, normalized, ext, mime: mime || null, size, hash };
}

module.exports = {
  validateUpload, normalizeFilename, hashSha256,
  DEFAULT_MAX_BYTES, DEFAULT_MIME_ALLOWLIST, DEFAULT_EXT_ALLOWLIST, EXT_BY_MIME
};
