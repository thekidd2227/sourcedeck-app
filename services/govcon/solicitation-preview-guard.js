'use strict';

/**
 * Phase 25AG — Solicitation package preview safety guard.
 *
 * Single source of truth for the safety rules the right-side file viewer
 * relies on. main.js (govcon:preview-package-file) wires these helpers so
 * the preview pipeline can never:
 *   - read a file outside the canonical solicitations package root,
 *   - escape that root through a symlink (realpath enforced),
 *   - return a remote / file:// URL,
 *   - dump a multi-megabyte blob into the renderer (size capped + truncated),
 *   - surface the SourceDeck app shell (HTML/CSS) as if it were an attachment.
 *
 * The module is intentionally dependency-free and pure so the Phase 25AG
 * tests can exercise every rule directly without Electron.
 */

const path = require('path');

// Hard cap on the amount of text ever returned to / rendered by the viewer.
// Anything larger is truncated; the original stays openable via Open Local File.
const PREVIEW_TEXT_LIMIT_BYTES = 250 * 1024; // 250 KB

// Files larger than this are never read into memory at all — fallback only.
const MAX_READ_BYTES = 8 * 1024 * 1024; // 8 MB

// File extensions surfaced as escaped text.
const TEXT_EXT = ['.txt', '.csv', '.json', '.xml', '.html', '.htm', '.md', '.rtf', '.log'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
const PDF_EXT = ['.pdf'];
const OFFICE_EXT = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
const ZIP_EXT = ['.zip'];

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
};

// Strong markers that identify the SourceDeck application shell. A genuine
// solicitation attachment never contains these. If preview text matches any
// marker the content is blocked rather than rendered, so a stray app-shell
// snapshot can never freeze or impersonate an attachment.
const APP_SHELL_MARKERS = [
  'SourceDeck GovCon Pipeline',
  'Operating Hub',
  'GovCon Find Opportunities',
  '.cmd-flow',
  '.cmd-pill',
  'cc-lcc-grid',
  'sourcedeck.html',
  'tab-govcon',
  'tab-dashboard',
  'SourceDeck does not auto-send'
];

function solicitationsRoot(userDataPath) {
  return path.join(String(userDataPath || ''), 'govcon', 'solicitations');
}

// Detect a request that must be refused before any filesystem access.
// Returns null when the raw input is acceptable for resolution, otherwise a
// rejection reason string.
function rejectionReasonForRawInput(filePath) {
  const raw = String(filePath || '');
  if (!raw) return 'no_file_path';
  // Remote URLs and file:// URLs are never package files.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return 'remote_url';
  if (/^file:/i.test(raw)) return 'file_url';
  return null;
}

// Containment check on the lexical (resolved-but-not-realpath) path. Used as a
// first gate; realpath containment is enforced separately once the file is
// known to exist on disk.
function assertSafePreviewRequest(input) {
  input = input || {};
  const root = String(input.root || '');
  const reason = rejectionReasonForRawInput(input.filePath);
  if (reason) return { ok: false, reason };
  if (!root) return { ok: false, reason: 'no_root' };

  const target = path.resolve(String(input.filePath));
  const rel = path.relative(root, target);
  if (!target || rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, reason: 'outside_package_root' };
  }
  return { ok: true, target, extension: path.extname(target).toLowerCase() };
}

// Enforce containment after realpath resolution so a symlink inside the
// package root cannot point at an app-shell / repo file. Both arguments must
// already be realpath-resolved by the caller.
function isRealpathInsideRoot(realRoot, realTarget) {
  if (!realRoot || !realTarget) return false;
  const root = String(realRoot);
  const target = String(realTarget);
  const rel = path.relative(root, target);
  if (rel === '') return true; // target === root (a dir; caller still checks isFile)
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function classifyPreviewKind(extension) {
  const ext = String(extension || '').toLowerCase();
  if (TEXT_EXT.indexOf(ext) >= 0) return 'text';
  if (IMAGE_EXT.indexOf(ext) >= 0) return 'image';
  if (PDF_EXT.indexOf(ext) >= 0) return 'pdf';
  if (OFFICE_EXT.indexOf(ext) >= 0) return 'office-fallback';
  if (ZIP_EXT.indexOf(ext) >= 0) return 'zip-list';
  return 'unsupported';
}

function imageMimeForExt(extension) {
  return IMAGE_MIME[String(extension || '').toLowerCase()] || 'application/octet-stream';
}

// Truncate text to the rendered preview cap. Operates on byte length so the
// cap is honoured for multi-byte content too.
function truncateText(text) {
  const str = String(text == null ? '' : text);
  const bytes = Buffer.byteLength(str, 'utf8');
  if (bytes <= PREVIEW_TEXT_LIMIT_BYTES) {
    return { text: str, truncated: false };
  }
  // Slice on the byte buffer, then back to a clean UTF-8 string.
  const sliced = Buffer.from(str, 'utf8').slice(0, PREVIEW_TEXT_LIMIT_BYTES).toString('utf8');
  return { text: sliced, truncated: true };
}

function containsAppShell(text) {
  const str = String(text == null ? '' : text);
  if (!str) return false;
  for (let i = 0; i < APP_SHELL_MARKERS.length; i++) {
    const marker = APP_SHELL_MARKERS[i];
    if (str.indexOf(marker) >= 0) return true;
    // A dotted CSS marker (.cmd-flow) also matches the HTML class form
    // (class="cmd-flow") — strip the leading dot and match the bare token.
    if (marker.charAt(0) === '.' && str.indexOf(marker.slice(1)) >= 0) return true;
  }
  return false;
}

const APP_SHELL_BLOCK_MESSAGE =
  'Preview blocked because the selected content appears to be the SourceDeck app shell, not a solicitation attachment.';

const OUTSIDE_ROOT_MESSAGE =
  'Preview blocked: file is outside SourceDeck solicitation package storage.';

const TRUNCATED_MESSAGE =
  'Preview truncated for performance. Open Local File to view the full document.';

module.exports = {
  PREVIEW_TEXT_LIMIT_BYTES,
  MAX_READ_BYTES,
  TEXT_EXT,
  IMAGE_EXT,
  PDF_EXT,
  OFFICE_EXT,
  ZIP_EXT,
  APP_SHELL_MARKERS,
  APP_SHELL_BLOCK_MESSAGE,
  OUTSIDE_ROOT_MESSAGE,
  TRUNCATED_MESSAGE,
  solicitationsRoot,
  rejectionReasonForRawInput,
  assertSafePreviewRequest,
  isRealpathInsideRoot,
  classifyPreviewKind,
  imageMimeForExt,
  truncateText,
  containsAppShell,
  // Phase 25AG mission alias — same detector under the documented name.
  looksLikeSourceDeckAppShellPreview: containsAppShell
};
