// services/govcon/sam-body-classifier.js
//
// Phase 25AH — shared HTTP-body classifier for SAM.gov responses. The
// same gate is used by the package downloader (sam-package-download.js)
// and the source-material fetcher (sam-source-fetch.js) so the two
// paths agree on what counts as a real attachment vs an HTML / app-shell
// / login / error response.
//
// classifyResponseBody(buffer | string, contentType) returns:
//   { ok: true }                              — body may be persisted / returned
//   { ok: false, reason: 'app_shell_html_response' }       — SourceDeck UI/CSS dump
//   { ok: false, reason: 'sam_login_html_response' }       — SAM.gov login / auth page
//   { ok: false, reason: 'non_attachment_html_response' }  — generic SAM error / 4xx / 5xx HTML
//   { ok: false, reason: 'unexpected_html_response' }      — any other HTML payload
//
// Genuine binary attachments (PDF / ZIP / DOCX / XLSX / legacy OLE) are
// preserved by magic-byte sniff regardless of the advertised
// content-type.

'use strict';

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

const NON_ATTACHMENT_HTML_RE = /(access denied|not authorized|unauthorized|forbidden|error\s*[45]\d\d|http\s*[45]\d\d|page not found|<title>[^<]*(?:error|forbidden|not found|access denied)[^<]*<\/title>)/i;

// SAM-specific login / auth markers. These are tighter than the generic
// non-attachment regex because a real solicitation HTML attachment (rare
// but valid) could contain the word "login" in body text. The SAM login
// page combines the hostname / heading / SAML hint markers.
const SAM_LOGIN_RE = /(sam\.gov.{0,80}(?:sign\s*in|log\s*in|logon)|sign\s*in to sam\.gov|log\s*in to sam\.gov|session (?:has )?(?:expired|timed out)|please (?:sign|log)\s*in|authentication required|saml\b.{0,40}login|<title>[^<]*(?:login|sign[\s-]?in|log[\s-]?on)[^<]*<\/title>)/i;

function toBuffer(input){
  if (Buffer.isBuffer(input)) return input;
  if (input == null) return Buffer.alloc(0);
  if (typeof input === 'string') return Buffer.from(input, 'utf8');
  try { return Buffer.from(input); } catch (_) { return Buffer.alloc(0); }
}

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

function classifyResponseBody(input, contentType) {
  const buf = toBuffer(input);
  if (hasBinaryAttachmentMagic(buf)) return { ok: true };

  const sample = buf.slice(0, 64 * 1024).toString('utf8');
  const head = sample.slice(0, 4096);

  // App shell: two distinct markers required so a solicitation that
  // happens to mention "SourceDeck" once doesn't get blocked.
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
    if (SAM_LOGIN_RE.test(sample)) return { ok: false, reason: 'sam_login_html_response' };
    if (NON_ATTACHMENT_HTML_RE.test(sample)) return { ok: false, reason: 'non_attachment_html_response' };
    return { ok: false, reason: 'unexpected_html_response' };
  }
  return { ok: true };
}

// Lightweight string-only variant for already-decoded responses (used
// by the source-material sanitizer that scans renderer-stored text).
// Returns the same shape as classifyResponseBody.
function classifyResponseText(text, contentType) {
  if (text == null || text === '') return { ok: true };
  return classifyResponseBody(String(text), contentType);
}

module.exports = {
  classifyResponseBody,
  classifyResponseText,
  APP_SHELL_MARKERS,
  _hasBinaryAttachmentMagic: hasBinaryAttachmentMagic
};
