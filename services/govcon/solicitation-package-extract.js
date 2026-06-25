'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
// Phase 25AN — decoupled from the retired remote downloader. The ZIP and
// content-classification helpers now live in solicitation-file-utils.js, a
// pure local-filesystem utility module with no network access.
const { _extractZip, _classifyDownloadedBody } = require('./solicitation-file-utils');
const {
  MAX_SOLICITATION_DOCUMENTS,
  SUPPORTED_SOLICITATION_EXTENSIONS
} = require('./solicitation-constants');

const SECTION_DEFS = [
  ['A', 'Part I', 'The Schedule', 'Solicitation/Contract Form'],
  ['B', 'Part I', 'The Schedule', 'Supplies or Services and Prices/Costs'],
  ['C', 'Part I', 'The Schedule', 'Description/Specifications/SOW/PWS/SOO'],
  ['D', 'Part I', 'The Schedule', 'Packaging and Marking'],
  ['E', 'Part I', 'The Schedule', 'Inspection and Acceptance'],
  ['F', 'Part I', 'The Schedule', 'Deliveries or Performance'],
  ['G', 'Part I', 'The Schedule', 'Contract Administration Data'],
  ['H', 'Part I', 'The Schedule', 'Special Contract Requirements'],
  ['I', 'Part II', 'Contract Clauses', 'Contract Clauses'],
  ['J', 'Part III', 'List of Documents, Exhibits, and Attachments', 'List of Attachments'],
  ['K', 'Part IV', 'Representations and Instructions', 'Reps, Certs, Statements'],
  ['L', 'Part IV', 'Representations and Instructions', 'Instructions, Conditions, Notices to Offerors'],
  ['M', 'Part IV', 'Representations and Instructions', 'Evaluation Factors for Award']
];

// .html / .htm are intentionally NOT readable text here. SAM.gov / linked
// resources return portal, login, error, or app-shell HTML pages, and feeding
// those into the extracted solicitation text leaks UI/CSS/markup into the
// workspace. HTML is handled by a dedicated reject branch in extractFileText.
const TEXT_EXT = new Set(['.txt', '.csv', '.md', '.json', '.xml', '.rtf']);
const HTML_REJECT_LIMITATION = 'HTML / web page excluded from extraction — not a solicitation attachment (portal, login, error, or app-shell page).';
const ACCEPTED_UPLOAD_EXT = new Set(SUPPORTED_SOLICITATION_EXTENSIONS);

// Phase 25AF — extraction status vocabulary.
//   'text'          full readable text extracted
//   'partial'       some text extracted but the format is lossy (legacy DOC/XLS, image-light PDF)
//   'metadata-only' file stored but unreadable/unsupported/empty
//   'failed'        extraction threw — file skipped, package continues
const STORED_LIMITATION = 'Stored, text extraction not available yet for this file.';

function safeText(s) {
  return String(s == null ? '' : s).replace(/\0/g, '').slice(0, 500000);
}

function decodeXmlEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => {
      const cp = Number(n);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => {
      const cp = parseInt(n, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    });
}

function looksLikeRawMarkup(text) {
  const s = String(text || '').slice(0, 5000);
  return /<\?xml|<w:document|xmlns:|word\/document\.xml|<\/w:|<w:t\b|<pkg:package/i.test(s);
}

function cleanExtractedText(text) {
  let s = safeText(text);
  if (!s) return '';
  s = s.replace(/\0/g, ' ');
  s = s.replace(/<w:(?:p|br|tab)\b[^>]*>/gi, '\n');
  s = s.replace(/<\/w:p>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeXmlEntities(s);
  s = s.replace(/\bxmlns(?::\w+)?="[^"]*"/gi, ' ');
  s = s.replace(/\b(?:w|wpc|mc|o|r|m|v|wp14|wp|w10|w14|w15|wpg|wpi|wne|wps):[A-Za-z0-9_.+\s-]+/g, ' ');
  s = s.replace(/[{}]{2,}/g, ' ');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim().slice(0, 500000);
}

// Phase 25AF — plain (non-markup) normalizer for PDF/XLSX/legacy output. It
// never strips `w:`-style prefixes (those only matter for Office XML) so it is
// safe for arbitrary document text.
function normalizePlainText(s) {
  let t = safeText(s);
  if (!t) return '';
  t = t.replace(/\r\n?/g, '\n');
  t = t.replace(/[\f\v\u0000-\u0008\u000e-\u001f]/g, " ");
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/ *\n */g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim().slice(0, 500000);
}

function extractWordXmlText(xml) {
  const src = String(xml || '');
  const paragraphs = [];
  const paraRe = /<w:p\b[\s\S]*?<\/w:p>/gi;
  let m;
  while ((m = paraRe.exec(src))) {
    const parts = [];
    const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let t;
    while ((t = textRe.exec(m[0]))) parts.push(decodeXmlEntities(t[1]));
    const line = cleanExtractedText(parts.join(' '));
    if (line) paragraphs.push(line);
  }
  if (!paragraphs.length) {
    const parts = [];
    const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let t;
    while ((t = textRe.exec(src))) parts.push(decodeXmlEntities(t[1]));
    const fallback = cleanExtractedText(parts.join('\n'));
    if (fallback) paragraphs.push(fallback);
  }
  return paragraphs.join('\n');
}

// ---------------------------------------------------------------------------
// Phase 25AF — PDF text extraction (pure JS, build-safe, zlib only)
// ---------------------------------------------------------------------------

function decodePdfLiteralString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (c === '\\') {
      const n = raw[i + 1];
      if (n === 'n') { out += '\n'; i += 1; }
      else if (n === 'r') { out += '\r'; i += 1; }
      else if (n === 't') { out += '\t'; i += 1; }
      else if (n === 'b') { out += '\b'; i += 1; }
      else if (n === 'f') { out += '\f'; i += 1; }
      else if (n === '(') { out += '('; i += 1; }
      else if (n === ')') { out += ')'; i += 1; }
      else if (n === '\\') { out += '\\'; i += 1; }
      else if (n === '\n') { i += 1; }
      else if (n === '\r') { i += (raw[i + 2] === '\n') ? 2 : 1; }
      else if (n >= '0' && n <= '7') {
        let oct = n; i += 1;
        for (let k = 0; k < 2 && raw[i + 1] >= '0' && raw[i + 1] <= '7'; k += 1) { oct += raw[i + 1]; i += 1; }
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
      } else { out += n; i += 1; }
    } else {
      out += c;
    }
  }
  return out;
}

function decodePdfHexString(hex) {
  let h = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
  if (h.length % 2) h += '0';
  // UTF-16BE detection (BOM)
  if (/^feff/i.test(h)) {
    let s = '';
    for (let i = 4; i + 4 <= h.length; i += 4) s += String.fromCharCode(parseInt(h.substr(i, 4), 16));
    return s;
  }
  let s = '';
  for (let i = 0; i + 2 <= h.length; i += 2) s += String.fromCharCode(parseInt(h.substr(i, 2), 16));
  return s;
}

function pdfContentToText(content) {
  const out = [];
  let line = [];
  const flush = () => { const s = line.join(''); if (s.trim()) out.push(s.replace(/\s+/g, ' ').trim()); line = []; };
  let i = 0;
  const n = content.length;
  while (i < n) {
    const c = content[i];
    if (c === '(') {
      let depth = 1; let j = i + 1; let raw = '';
      while (j < n && depth > 0) {
        const cj = content[j];
        if (cj === '\\') { raw += cj + (content[j + 1] || ''); j += 2; continue; }
        if (cj === '(') depth += 1;
        else if (cj === ')') { depth -= 1; if (depth === 0) { j += 1; break; } }
        raw += cj; j += 1;
      }
      line.push(decodePdfLiteralString(raw));
      i = j; continue;
    }
    if (c === '<' && content[i + 1] !== '<') {
      let j = i + 1; let hex = '';
      while (j < n && content[j] !== '>') { hex += content[j]; j += 1; }
      j += 1;
      line.push(decodePdfHexString(hex));
      i = j; continue;
    }
    if (c === '-' || (c >= '0' && c <= '9') || c === '.') {
      let j = i; let num = '';
      while (j < n && /[-0-9.]/.test(content[j])) { num += content[j]; j += 1; }
      const v = parseFloat(num);
      if (Number.isFinite(v) && v <= -100) line.push(' ');
      i = j; continue;
    }
    if (c === 'T') {
      const two = content.substr(i, 2);
      if (two === 'Td' || two === 'TD' || two === 'T*' || two === 'Tm') { flush(); i += 2; continue; }
      i += 1; continue;
    }
    if (c === "'" || c === '"') { flush(); i += 1; continue; }
    i += 1;
  }
  flush();
  return out.join('\n');
}

function inflateMaybe(buf) {
  try { return zlib.inflateSync(buf); } catch (_) { /* try raw */ }
  try { return zlib.inflateRawSync(buf); } catch (_) { /* give up */ }
  return null;
}

function looksLikeUnreadableExtractionText(text) {
  const s = cleanExtractedText(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  const visible = s.replace(/\s/g, '');
  if (visible.length < 80) return false;
  const alpha = (visible.match(/[A-Za-z]/g) || []).length;
  const symbols = (visible.match(/[^A-Za-z0-9]/g) || []).length;
  const words = s.match(/\b[A-Za-z]{3,}\b/g) || [];
  const readableWords = words.filter(w => /[aeiouy]/i.test(w)).length;
  const commonGovWords = (s.match(/\b(the|and|for|with|shall|must|section|offeror|contract(?:or)?|solicitation|proposal|requirements?|services?|performance|government|agency|attachment|form|pricing|evaluation|deadline|submit|provide)\b/gi) || []).length;
  const hasSolicitationMarkers = /\b(SF\s*\d{1,4}|Section\s+[A-M]\b|CLIN|NAICS|solicitation|offeror|contractor|shall|required|attachment|proposal|evaluation|performance)\b/i.test(s);
  const symbolRatio = symbols / Math.max(visible.length, 1);
  const alphaRatio = alpha / Math.max(visible.length, 1);
  const readableRatio = readableWords / Math.max(words.length, 1);
  if (alphaRatio < 0.28 && symbolRatio > 0.32) return true;
  if (symbolRatio > 0.24 && visible.length >= 120 && commonGovWords < 2 && !hasSolicitationMarkers) return true;
  if (symbolRatio > 0.28 && words.length >= 8 && readableRatio < 0.35 && commonGovWords < 2) return true;
  return false;
}

function extractPdfText(buffer) {
  const warnings = [];
  const latin1 = buffer.toString('latin1');
  const pages = (latin1.match(/\/Type\s*\/Page(?![s])/g) || []).length || 0;
  const texts = [];
  const streamRe = /stream\r?\n/g;
  let m;
  while ((m = streamRe.exec(latin1))) {
    const dictStart = latin1.lastIndexOf('<<', m.index);
    const dict = dictStart >= 0 ? latin1.slice(dictStart, m.index) : '';
    const start = m.index + m[0].length;
    const endIdx = latin1.indexOf('endstream', start);
    if (endIdx < 0) continue;
    let end = endIdx;
    // trim a single trailing EOL that belongs to the stream wrapper
    if (latin1[end - 1] === '\n') end -= 1;
    if (latin1[end - 1] === '\r') end -= 1;
    const rawBuf = buffer.slice(start, end);
    let content;
    if (/\/FlateDecode/.test(dict)) {
      const inf = inflateMaybe(rawBuf);
      if (!inf) continue;
      content = inf.toString('latin1');
    } else if (/\/(LZWDecode|DCTDecode|CCITTFaxDecode|JPXDecode|JBIG2Decode|RunLengthDecode|ASCII85Decode|ASCIIHexDecode)/.test(dict)) {
      continue; // image or filter we do not decode
    } else {
      content = rawBuf.toString('latin1');
    }
    if (!/BT|Tj|TJ/.test(content)) continue;
    const t = pdfContentToText(content);
    if (t && t.trim()) texts.push(t);
  }
  let text = normalizePlainText(texts.join('\n'));
  if (text.trim() && looksLikeUnreadableExtractionText(text)) {
    warnings.push('Extracted PDF text appears encoded or unreadable. Convert/export the solicitation to searchable PDF, DOCX, or TXT and upload again.');
    text = '';
  }
  if (!text.trim() && !warnings.length) warnings.push('No extractable text found — the PDF may be scanned/image-only.');
  return { text, pages, warnings };
}

// ---------------------------------------------------------------------------
// Phase 25AF — XLSX workbook extraction (unzip + sheet XML, zlib only)
// ---------------------------------------------------------------------------

async function extractXlsxText(filePath, tmpRoot, fileName) {
  const outDir = path.join(tmpRoot, 'xlsx-' + sanitize(fileName));
  await fsp.mkdir(outDir, { recursive: true });
  const children = await _extractZip(filePath, outDir);
  const byName = {};
  for (const ch of children) byName[String(ch.fileName || '').replace(/\\/g, '/')] = ch;

  const shared = [];
  const ss = byName['xl/sharedStrings.xml'];
  if (ss && await fileExists(ss.localPath)) {
    const xml = await fsp.readFile(ss.localPath, 'utf8');
    const reSi = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = reSi.exec(xml))) {
      const parts = [];
      const reT = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let t;
      while ((t = reT.exec(m[1]))) parts.push(decodeXmlEntities(t[1]));
      shared.push(parts.join(''));
    }
  }

  const sheetNames = [];
  const wb = byName['xl/workbook.xml'];
  if (wb && await fileExists(wb.localPath)) {
    const xml = await fsp.readFile(wb.localPath, 'utf8');
    const reS = /<sheet\b[^>]*\bname="([^"]*)"/g;
    let m;
    while ((m = reS.exec(xml))) sheetNames.push(decodeXmlEntities(m[1]));
  }

  const sheetKeys = Object.keys(byName)
    .filter(k => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt((a.match(/sheet(\d+)\.xml/i) || [])[1] || '0', 10);
      const nb = parseInt((b.match(/sheet(\d+)\.xml/i) || [])[1] || '0', 10);
      return na - nb;
    });

  const sheets = [];
  const blocks = [];
  let idx = 0;
  for (const key of sheetKeys) {
    const ch = byName[key];
    idx += 1;
    if (!(ch && await fileExists(ch.localPath))) continue;
    const xml = await fsp.readFile(ch.localPath, 'utf8');
    const sheetName = sheetNames[idx - 1] || ('Sheet' + idx);
    const rowsText = [];
    const reRow = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
    let rm;
    while ((rm = reRow.exec(xml))) {
      const rnumMatch = /\br="(\d+)"/.exec(rm[1] || '');
      const rnum = rnumMatch ? rnumMatch[1] : String(rowsText.length + 1);
      const cells = [];
      const reC = /<c\b([^>\/]*)>([\s\S]*?)<\/c>/g;
      let cm;
      while ((cm = reC.exec(rm[2]))) {
        const attrs = cm[1] || '';
        const inner = cm[2] || '';
        const tMatch = /\bt="([^"]*)"/.exec(attrs);
        const type = tMatch ? tMatch[1] : '';
        const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
        const isMatch = /<is\b[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        let val = '';
        if (type === 's' && vMatch) val = shared[parseInt(vMatch[1], 10)] || '';
        else if (type === 'inlineStr' && isMatch) val = decodeXmlEntities(isMatch[1]);
        else if (vMatch) val = decodeXmlEntities(vMatch[1]);
        val = String(val).trim();
        if (val) cells.push(val);
      }
      if (cells.length) rowsText.push('Row ' + rnum + ': ' + cells.join(' | '));
    }
    if (rowsText.length) {
      sheets.push({ name: sheetName, rows: rowsText.length });
      blocks.push('[Sheet: ' + sheetName + ']\n' + rowsText.join('\n'));
    }
  }

  const text = normalizePlainText(blocks.join('\n\n'));
  return { text, sheets, warnings: text ? [] : ['No readable cells found in workbook.'] };
}

// Best-effort printable-string scan for legacy binary formats (XLS/DOC).
function extractPrintableStrings(buffer, minLen) {
  const s = buffer.toString('latin1');
  const re = new RegExp('[\\x20-\\x7e]{' + (minLen || 4) + ',}', 'g');
  const matches = s.match(re) || [];
  const seen = new Set();
  const out = [];
  for (const raw of matches) {
    const line = raw.replace(/\s+/g, ' ').trim();
    // skip noise (no letters, or looks like a font/table token)
    if (!/[A-Za-z]{3,}/.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function missingText(letter, label) {
  return `No Section ${letter} ${label || ''} extracted yet. Verify source package.`.replace(/\s+/g, ' ').trim();
}

function extOf(fileName) {
  return path.extname(String(fileName || '')).toLowerCase();
}

async function readTextFile(filePath) {
  const buf = await fsp.readFile(filePath);
  return cleanExtractedText(buf.toString('utf8'));
}

async function normalizeManifest(input) {
  input = input || {};
  if (input.manifest && typeof input.manifest === 'object') return input.manifest;
  if (Array.isArray(input.files)) return input;
  const manifestPath = input.manifestPath || (input.packagePath ? path.join(input.packagePath, 'package.json') : '');
  if (manifestPath) {
    const raw = await fsp.readFile(manifestPath, 'utf8');
    return JSON.parse(raw);
  }
  return input;
}

async function fileExists(p) {
  try { await fsp.access(p, fs.constants.R_OK); return true; } catch (_) { return false; }
}

async function collectPackageFiles(manifest) {
  const rows = [];
  for (const f of (manifest.files || [])) {
    if (f && f.localPath && await fileExists(f.localPath)) rows.push(Object.assign({ source: 'package' }, f));
    for (const ex of (f.extractedFiles || [])) {
      if (ex && ex.localPath && await fileExists(ex.localPath)) rows.push(Object.assign({ source: 'extracted', status: 'downloaded', mimeType: '', safeUrl: '', originalUrl: '' }, ex));
    }
  }
  return rows;
}

function fileResult(file, extra) {
  const fileName = file.fileName || path.basename(file.localPath || '');
  return Object.assign({
    fileName,
    localPath: file.localPath || '',
    extension: extOf(fileName),
    source: file.source || 'package',
    sourceType: file.source || 'package',
    status: 'extracted',
    extractionStatus: 'metadata-only',
    text: '',
    pages: 0,
    sheets: [],
    warnings: [],
    limitation: ''
  }, extra || {});
}

async function extractFileText(file, tmpRoot) {
  const fileName = file.fileName || path.basename(file.localPath || '');
  const ext = extOf(fileName);

  if (ext === '.docx' && file.localPath && tmpRoot) {
    const outDir = path.join(tmpRoot, 'docx-' + sanitize(fileName));
    await fsp.mkdir(outDir, { recursive: true });
    const children = await _extractZip(file.localPath, outDir);
    const textParts = [];
    for (const child of children) {
      const name = String(child.fileName || '').replace(/\\/g, '/');
      if (/^word\/(?:document|header\d*|footer\d*)\.xml$/i.test(name) && child.localPath && await fileExists(child.localPath)) {
        textParts.push(extractWordXmlText(await fsp.readFile(child.localPath, 'utf8')));
      }
    }
    const text = cleanExtractedText(textParts.filter(Boolean).join('\n\n'));
    return fileResult(file, {
      extractionStatus: text ? 'text' : 'metadata-only',
      text,
      extractedFiles: children,
      limitation: text ? '' : STORED_LIMITATION,
      warnings: text ? [] : [STORED_LIMITATION]
    });
  }

  if (ext === '.xml' && /(^|\/|\\)word[\/\\](document|header\d*|footer\d*)\.xml$/i.test(fileName) && file.localPath) {
    const text = extractWordXmlText(await fsp.readFile(file.localPath, 'utf8'));
    return fileResult(file, {
      extractionStatus: text ? 'text' : 'metadata-only',
      text,
      limitation: text ? '' : STORED_LIMITATION,
      warnings: text ? [] : [STORED_LIMITATION]
    });
  }

  if (ext === '.pdf' && file.localPath) {
    const buf = await fsp.readFile(file.localPath);
    const { text, pages, warnings } = extractPdfText(buf);
    const status = text ? (warnings.length ? 'partial' : 'text') : 'metadata-only';
    const scannedMessage = 'This PDF appears to be scanned and requires OCR.';
    return fileResult(file, {
      extractionStatus: status,
      text,
      pages,
      warnings: text ? warnings : [scannedMessage],
      limitation: text ? (warnings[0] || '') : scannedMessage
    });
  }

  if (ext === '.xml' && file.localPath) {
    const xml = await fsp.readFile(file.localPath, 'utf8');
    if (/<!DOCTYPE|<!ENTITY|SYSTEM\s+["']|PUBLIC\s+["']/i.test(xml)) {
      return fileResult(file, {
        status: 'rejected', extractionStatus: 'rejected', text: '',
        limitation: 'XML external entities, DTDs, remote schemas and stylesheets are disabled.',
        warnings: ['Unsafe XML rejected (XXE protection).']
      });
    }
    const text = cleanExtractedText(xml.replace(/<\?xml[^>]*\?>/gi, '').replace(/<\?xml-stylesheet[^>]*\?>/gi, ''));
    return fileResult(file, {
      extractionStatus: text ? 'text' : 'metadata-only', text,
      limitation: text ? '' : 'No readable XML data found.',
      warnings: text ? [] : ['No readable XML data found.']
    });
  }

  if (ext === '.xlsx' && file.localPath && tmpRoot) {
    const { text, sheets, warnings } = await extractXlsxText(file.localPath, tmpRoot, fileName);
    return fileResult(file, {
      extractionStatus: text ? 'text' : 'metadata-only',
      text,
      sheets,
      warnings: text ? warnings : [STORED_LIMITATION],
      limitation: text ? '' : STORED_LIMITATION
    });
  }

  if (ext === '.xls' && file.localPath) {
    const buf = await fsp.readFile(file.localPath);
    const lines = extractPrintableStrings(buf, 4);
    const text = normalizePlainText(lines.join('\n'));
    const limitation = 'Legacy .xls binary — best-effort text extraction only. Verify against the source workbook.';
    return fileResult(file, {
      extractionStatus: text ? 'partial' : 'metadata-only',
      text,
      warnings: text ? [limitation] : [STORED_LIMITATION],
      limitation: text ? limitation : STORED_LIMITATION
    });
  }

  if (ext === '.doc' && file.localPath) {
    const buf = await fsp.readFile(file.localPath);
    const lines = extractPrintableStrings(buf, 6).filter(l => /\s/.test(l));
    const text = normalizePlainText(lines.join('\n'));
    const limitation = 'Legacy .doc binary — best-effort text extraction only. Convert to .docx/PDF for full fidelity.';
    return fileResult(file, {
      extractionStatus: text ? 'partial' : 'metadata-only',
      text,
      warnings: text ? [limitation] : [STORED_LIMITATION],
      limitation: text ? limitation : STORED_LIMITATION
    });
  }

  if ((ext === '.html' || ext === '.htm') && file.localPath) {
    return fileResult(file, {
      status: 'rejected',
      extractionStatus: 'rejected',
      text: '',
      limitation: HTML_REJECT_LIMITATION,
      warnings: [HTML_REJECT_LIMITATION]
    });
  }

  if (TEXT_EXT.has(ext)) {
    const buf = await fsp.readFile(file.localPath);
    // App-shell / portal / login / error HTML can masquerade as a .txt or
    // other "text" file (e.g. a SAM link that redirected to the host app or
    // a portal page saved with a .txt name). Refuse to surface it as
    // extracted solicitation text.
    if (typeof _classifyDownloadedBody === 'function') {
      const verdict = _classifyDownloadedBody(buf, '');
      if (verdict && verdict.ok === false) {
        return fileResult(file, {
          status: 'rejected',
          extractionStatus: 'rejected',
          text: '',
          limitation: HTML_REJECT_LIMITATION,
          warnings: [HTML_REJECT_LIMITATION]
        });
      }
    }
    const raw = cleanExtractedText(buf.toString('utf8'));
    return fileResult(file, {
      extractionStatus: raw ? 'text' : 'metadata-only',
      text: looksLikeRawMarkup(raw) ? cleanExtractedText(raw) : raw,
      limitation: raw ? '' : STORED_LIMITATION,
      warnings: raw ? [] : [STORED_LIMITATION]
    });
  }

  if (ext === '.zip' && file.localPath && tmpRoot) {
    const outDir = path.join(tmpRoot, 'zip-' + sanitize(fileName));
    await fsp.mkdir(outDir, { recursive: true });
    const children = await _extractZip(file.localPath, outDir);
    const childTexts = [];
    for (const child of children) {
      try {
        childTexts.push(await extractFileText(Object.assign({ source: 'zip-child' }, child), tmpRoot));
      } catch (err) {
        childTexts.push(fileResult(Object.assign({ source: 'zip-child' }, child), {
          status: 'failed',
          extractionStatus: 'failed',
          limitation: 'Extraction error — corrupt zip child skipped (' + (err && err.code ? err.code : 'error') + ')',
          warnings: ['Corrupt zip child skipped']
        }));
      }
    }
    const text = cleanExtractedText(childTexts.map(c => c.text).filter(Boolean).join('\n\n'));
    const childWarnings = [];
    for (const c of childTexts) {
      if (c.extractionStatus === 'metadata-only' || c.extractionStatus === 'failed') {
        childWarnings.push(`${fileName} › ${c.fileName}: ${c.limitation || STORED_LIMITATION}`);
      }
    }
    return fileResult(file, {
      extractionStatus: text ? 'text' : 'metadata-only',
      text,
      children: childTexts,
      warnings: childWarnings,
      limitation: text ? '' : STORED_LIMITATION
    });
  }

  return fileResult(file, {
    status: 'stored',
    extractionStatus: 'metadata-only',
    text: '',
    limitation: STORED_LIMITATION,
    warnings: [STORED_LIMITATION]
  });
}

function sanitize(s) {
  return String(s || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
}

function sectionRegex(letter) {
  return new RegExp('(?:^|\\n)\\s*(?:SECTION\\s+' + letter + '\\b|' + letter + '\\s*[\\.\\-]\\s+|PART\\s+[IVX]+[^\\n]*SECTION\\s+' + letter + '\\b)', 'i');
}

// ---------------------------------------------------------------------------
// Phase 25AF — fallback (requirements-first) classifier
// ---------------------------------------------------------------------------

const FALLBACK_BUCKETS = {
  instructions: /\b(instructions? to offerors?|FAR\s*52\.212-1|52\.212-1|FAR\s*52\.215-1|52\.215-1|submission (?:instructions?|method)|proposal (?:shall|must|due|format)|offerors? (?:shall|must|are required to)|quoters? (?:shall|must)|page limit|page limitation|font size|margins?|how to submit|submit (?:your |the )?(?:proposal|quote|offer)|volumes?\b|due (?:date|no later than)|email (?:your |the )?(?:proposal|quote)|via (?:email|portal|sam\.gov|piee|ebuy))/i,
  evaluation: /\b(FAR\s*52\.212-2|52\.212-2|evaluation factors?|basis for award|best value|trade-?off|LPTA|lowest price technically acceptable|award will be made|will be evaluated|the government will evaluate|technical (?:capability|approach|merit) (?:is|will)|past performance (?:will be )?(?:considered|evaluated)|evaluation criteria)\b/i,
  scope: /\b(contractor shall|the contractor (?:shall|must|will|is required)|statement of work|performance work statement|performance requirements summary|\bPWS\b|\bSOW\b|\bSOO\b|statement of objectives|scope of work|period of performance|tasks?(?: include| shall)|services? (?:shall|include|to be performed)|provide all labor|deliverables?)\b/i,
  forms: /\b(FAR\s*52\.212-3|52\.212-3|SF\s*\d+|standard form \d+|representations? and certifications?|certification|attachment\b|exhibit\b|QASP|wage determination|pricing (?:sheet|schedule|template)|amendment \d+|fill in and return|complete and return)\b/i,
  deadlines: /\b(due (?:date|by|no later than)|deadline|closing date|response date|offers? due|proposals? due|quotes? due|questions? (?:are )?due|site visit|no later than \d|submit(?:ted)? by)\b/i,
  risks: /\b(shall|must|mandatory|is required|are required|site visit|security clearance|background check|insurance|bonding|bond required|past performance|page limit|limitation on subcontracting|key personnel|wage determination|invoic)\b/i
};

const FAR_FALLBACK_BLOCKS = [
  { bucket: 'instructions', section: 'L', heading: /^(?:addendum\s+to\s+)?(?:FAR\s*)?52\.212-1\b|^(?:addendum\s+to\s+)?(?:FAR\s*)?52\.215-1\b|^instructions?\s+to\s+(?:offerors?|quoters?)\b|^quote\s+submission\s+instructions?\b/i },
  { bucket: 'evaluation', section: 'M', heading: /^(?:addendum\s+to\s+)?(?:FAR\s*)?52\.212-2\b|^evaluation\s+(?:factors?|criteria)\b|^basis\s+for\s+award\b|^award\s+decision\b/i },
  { bucket: 'scope', section: 'C', heading: /^performance\s+requirements\s+summary\b|^performance\s+work\s+statement\b|^statement\s+of\s+work\b|^statement\s+of\s+objectives\b|^scope\s+of\s+work\b|^description\s*\/\s*specifications?\b|^services?\s+to\s+be\s+performed\b/i },
  { bucket: 'forms', section: 'J', heading: /^list\s+of\s+(?:attachments|documents|exhibits)\b|^(?:attachments?|exhibits?|appendix|appendices)\b|^required\s+forms?\b|^pricing\s+(?:sheet|schedule|template)\b|^wage\s+determination\b/i },
  { bucket: 'forms', section: 'K', heading: /^(?:FAR\s*)?52\.212-3\b|^offeror\s+representations?\s+and\s+certifications?\b|^representations?\s+and\s+certifications?\b/i },
  { bucket: 'risks', section: 'H', heading: /^special\s+(?:contract\s+)?requirements\b|^security\s+requirements\b|^insurance\s+requirements\b|^limitations?\s+on\s+subcontracting\b/i },
  { bucket: 'risks', section: 'I', heading: /^contract\s+clauses\b|^(?:FAR|DFARS)\s+clauses?\b|^(?:FAR|DFARS)\s+52\.\d{3}/i }
];

const FAR_BLOCK_STOP_RE = /^(?:SECTION\s+[A-M]\b|[A-M]\s*[.\-]\s+|PART\s+[IVX]+\b|(?:addendum\s+to\s+)?(?:FAR\s*)?52\.212-[1-5]\b|(?:addendum\s+to\s+)?(?:FAR\s*)?52\.215-1\b|performance\s+requirements\s+summary\b|performance\s+work\s+statement\b|statement\s+of\s+work\b|statement\s+of\s+objectives\b|scope\s+of\s+work\b|evaluation\s+(?:factors?|criteria)\b|basis\s+for\s+award\b|instructions?\s+to\s+(?:offerors?|quoters?)\b|list\s+of\s+(?:attachments|documents|exhibits)\b|attachments?\b|exhibits?\b|required\s+forms?\b|representations?\s+and\s+certifications?\b|contract\s+clauses\b|(?:FAR|DFARS)\s+clauses?\b|special\s+(?:contract\s+)?requirements\b)/i;

function pushFallbackItem(buckets, seen, key, item) {
  if (!buckets[key] || !item || !item.text) return;
  const clean = cleanExtractedText(item.text || '').trim();
  if (!clean || looksLikeRawMarkup(clean)) return;
  const dedupe = clean.toLowerCase();
  if (seen[key].has(dedupe)) return;
  seen[key].add(dedupe);
  buckets[key].push({
    text: clean.slice(0, 3000),
    sourceFile: item.sourceFile || '',
    sourceLocation: item.sourceLocation || ''
  });
}

function scanFarFallbackBlocks(sourceBlocks) {
  const buckets = { instructions: [], evaluation: [], scope: [], forms: [], deadlines: [], risks: [] };
  const sectionBlocks = {};
  const seen = { instructions: new Set(), evaluation: new Set(), scope: new Set(), forms: new Set(), deadlines: new Set(), risks: new Set() };

  for (const block of sourceBlocks || []) {
    const lines = cleanExtractedText(block.text || '').split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim());
    let location = block.location || block.fileName || '';
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const sheetHint = /^\[Sheet:\s*([^\]]+)\]/.exec(line);
      if (sheetHint) { location = (block.fileName || '') + ' › ' + sheetHint[1].trim(); continue; }
      if (line.length < 4 || looksLikeRawMarkup(line)) continue;
      const def = FAR_FALLBACK_BLOCKS.find(d => d.heading.test(line));
      if (!def) continue;

      const captured = [line];
      for (let j = i + 1; j < Math.min(lines.length, i + 35); j += 1) {
        const next = lines[j];
        if (!next) {
          if (captured.length > 1) break;
          continue;
        }
        if (looksLikeRawMarkup(next)) continue;
        if (FAR_BLOCK_STOP_RE.test(next)) break;
        captured.push(next);
        if (captured.join('\n').length >= 3000) break;
      }

      const text = captured.join('\n').trim();
      pushFallbackItem(buckets, seen, def.bucket, { text, sourceFile: block.fileName || '', sourceLocation: location });
      if (def.section && !sectionBlocks[def.section]) {
        sectionBlocks[def.section] = { text, sourceFile: block.fileName || '', sourceLocation: location, bucket: def.bucket };
      }
    }
  }

  return { buckets, sectionBlocks };
}

function scanFallbackBuckets(sourceBlocks) {
  const farBlocks = scanFarFallbackBlocks(sourceBlocks);
  const buckets = farBlocks.buckets;
  const seen = {
    instructions: new Set(buckets.instructions.map(it => String(it.text || '').toLowerCase())),
    evaluation: new Set(buckets.evaluation.map(it => String(it.text || '').toLowerCase())),
    scope: new Set(buckets.scope.map(it => String(it.text || '').toLowerCase())),
    forms: new Set(buckets.forms.map(it => String(it.text || '').toLowerCase())),
    deadlines: new Set(buckets.deadlines.map(it => String(it.text || '').toLowerCase())),
    risks: new Set(buckets.risks.map(it => String(it.text || '').toLowerCase()))
  };
  for (const block of sourceBlocks || []) {
    const lines = cleanExtractedText(block.text || '').split(/\r?\n/);
    let location = block.location || block.fileName || '';
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      // track sheet/page hints embedded in the text
      const sheetHint = /^\[Sheet:\s*([^\]]+)\]/.exec(line);
      if (sheetHint) { location = (block.fileName || '') + ' › ' + sheetHint[1].trim(); continue; }
      if (line.length < 8 || looksLikeRawMarkup(line)) continue;
      for (const key of Object.keys(FALLBACK_BUCKETS)) {
        if (!FALLBACK_BUCKETS[key].test(line)) continue;
        pushFallbackItem(buckets, seen, key, { text: line.slice(0, 600), sourceFile: block.fileName || '', sourceLocation: location });
        if (buckets[key].length >= 60) break;
      }
    }
  }
  buckets._sectionBlocks = farBlocks.sectionBlocks;
  return buckets;
}

function summarizeSection(letter, text) {
  const t = cleanExtractedText(text || '');
  if (!t) return '';
  const meaning = {
    A: 'This is the cover/contract form for the solicitation.',
    B: 'This lists the supplies/services and the prices or CLINs you must price.',
    C: 'This is the work itself (PWS/SOW/SOO) — what the contractor has to do.',
    D: 'This explains how to package and mark deliverables.',
    E: 'This explains how the government will inspect and accept the work.',
    F: 'This gives the delivery schedule and where/when work happens.',
    G: 'This covers contract administration (invoicing, points of contact).',
    H: 'This lists special requirements you must meet to be compliant.',
    I: 'This contains the FAR/agency clauses that apply to the contract.',
    J: 'This lists the attachments, exhibits, and forms included.',
    K: 'This is the reps & certs you fill in about your company.',
    L: 'This tells you exactly how to write and submit your proposal.',
    M: 'This tells you how the government will score and pick the winner.'
  }[letter] || 'This section contains solicitation requirements.';
  return meaning + ' Read the source text, confirm every requirement, and verify before you rely on it. Draft summary — not legal advice.';
}

const HIGH_VALUE_SUMMARY = new Set(['C', 'F', 'H', 'L', 'M']);

function classifySections(text, sourceBlocks) {
  const src = cleanExtractedText(text || '');
  const hits = [];
  for (const def of SECTION_DEFS) {
    const m = src.match(sectionRegex(def[0]));
    if (m) hits.push({ letter: def[0], index: m.index + (m[0].startsWith('\n') ? 1 : 0) });
  }
  hits.sort((a, b) => a.index - b.index);
  const byLetter = {};
  for (let i = 0; i < hits.length; i += 1) {
    const h = hits[i];
    const next = hits[i + 1] ? hits[i + 1].index : Math.min(src.length, h.index + 12000);
    byLetter[h.letter] = src.slice(h.index, next).trim();
  }

  // Pass 2 — requirements-first fallback for the high-value panels (C/L/M)
  // when the formal UCF headers are absent or weak.
  const blocks = (sourceBlocks && sourceBlocks.length) ? sourceBlocks : (src ? [{ fileName: '', location: '', text: src }] : []);
  const buckets = scanFallbackBuckets(blocks);
  const farSectionBlocks = buckets._sectionBlocks || {};
  const fallbackMap = { C: buckets.scope, L: buckets.instructions, M: buckets.evaluation };

  const sections = {};
  for (const [letter, part, partTitle, title] of SECTION_DEFS) {
    let textValue = byLetter[letter] || '';
    let source = textValue ? 'extracted package text' : 'missing-placeholder';
    let confidence = textValue ? 'high' : 'none';
    let sourceFile = '';
    let sourceLocation = '';

    if (!textValue && farSectionBlocks[letter] && farSectionBlocks[letter].text) {
      textValue = farSectionBlocks[letter].text;
      source = 'far-aware-fallback';
      confidence = 'fallback';
      sourceFile = farSectionBlocks[letter].sourceFile || '';
      sourceLocation = farSectionBlocks[letter].sourceLocation || '';
    } else if (!textValue && fallbackMap[letter] && fallbackMap[letter].length) {
      const items = fallbackMap[letter];
      textValue = items.map(it => it.text).join('\n');
      source = 'fallback-requirements';
      confidence = 'fallback';
      sourceFile = items[0].sourceFile || '';
      sourceLocation = items[0].sourceLocation || '';
    }

    const found = !!textValue;
    sections[letter] = {
      letter,
      part,
      partTitle,
      title,
      found,
      confidence,
      sourceFile,
      sourceLocation,
      text: found ? cleanExtractedText(textValue) : missingText(letter, title),
      source,
      plainEnglishSummary: (found && HIGH_VALUE_SUMMARY.has(letter)) ? summarizeSection(letter, textValue) : ''
    };
  }
  sections._fallbackBuckets = buckets;
  return sections;
}

function findFirst(text, re) {
  const m = String(text || '').match(re);
  return m ? String(m[1] || m[0]).trim().slice(0, 300) : '';
}

function findLines(text, re, limit) {
  const lines = cleanExtractedText(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.filter(l => re.test(l)).slice(0, limit || 12);
}

function uniqueLines(lines, limit) {
  const seen = new Set();
  const out = [];
  for (const line of lines || []) {
    const clean = cleanExtractedText(line).replace(/\s+/g, ' ').trim();
    if (!clean || looksLikeRawMarkup(clean) || clean.length < 6) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean.slice(0, 600));
    if (limit && out.length >= limit) break;
  }
  return out;
}

function expandFormCandidates(line) {
  const clean = cleanExtractedText(line).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const matches = [];
  // Phase 25AR — accept em-dash / en-dash / hyphen / colon between the
  // attachment label and its description so "Attachment 1 — Pricing Sheet"
  // matches as a single canonical row instead of being split into
  // "Attachment 1" + "Pricing Sheet". Same for Exhibit/Appendix.
  const SEP_TAIL = /(?:\s*[—–\-:]\s*[A-Za-z0-9][^\n]{0,80})?/.source;
  const patterns = [
    /\bSF\s*\d{1,4}[A-Z]?(?:\s+(?:cover page|required|signed|completed|form|certification|representation)){0,8}/gi,
    /\bDD\s*Form\s*\d{1,4}[A-Z]?(?:\s+(?:required|signed|completed|form)){0,8}/gi,
    /\bOF\s*\d{1,4}[A-Z]?(?:\s+(?:required|signed|completed|form)){0,8}/gi,
    /\bPast Performance Questionnaire(?:\s+required)?/gi,
    new RegExp(`\\bAttachment\\s+[A-Z0-9-]+${SEP_TAIL}(?:\\s+(?:Wage Determination|Pricing Sheet|QASP|PWS|SOW|required|mandatory)){0,8}`, 'gi'),
    new RegExp(`\\bExhibit\\s+[A-Z0-9-]+${SEP_TAIL}(?:\\s+(?:required|mandatory|pricing|technical|schedule)){0,8}`, 'gi'),
    new RegExp(`\\bAppendix\\s+[A-Z0-9-]+${SEP_TAIL}(?:\\s+(?:required|mandatory|pricing|technical|schedule)){0,8}`, 'gi'),
    /\b(?:QASP|wage determination|pricing sheet|price schedule|certification|representation|solicitation provisions?|contract clauses?)\b[^.;\n]{0,120}/gi
  ];
  for (const re of patterns) {
    const found = clean.match(re);
    if (found) matches.push(...found);
  }
  return matches.length ? matches : [clean];
}

// Phase 25AR — collapse redundant form entries that are strict substrings
// of a longer accepted entry. Without this, "Attachment 1 — Pricing Sheet"
// and "Pricing Sheet" both pass uniqueFormItems' lowercase-equality dedup
// and the renderer shows duplicate clutter on the forms panel.
function dropSubsumedFormItems(items) {
  const arr = Array.isArray(items) ? items.slice() : [];
  // Sort longest first so a long canonical entry "wins" over its substrings.
  arr.sort((a, b) => (b || '').length - (a || '').length);
  const out = [];
  for (const candidate of arr) {
    const lc = String(candidate || '').toLowerCase();
    if (!lc) continue;
    const subsumed = out.some(accepted => {
      const al = accepted.toLowerCase();
      // strict containment, not equality
      return al !== lc && al.includes(lc);
    });
    if (subsumed) continue;
    out.push(candidate);
  }
  return out;
}

function uniqueFormItems(lines, limit) {
  const seen = new Set();
  const out = [];
  for (const line of lines || []) {
    for (const candidate of expandFormCandidates(line)) {
      const clean = cleanExtractedText(candidate).replace(/\s+/g, ' ').trim();
      if (!clean || looksLikeRawMarkup(clean) || clean.length < 3 || clean.length > 220) continue;
      if (/^Section\s+J\b|This file contains structured document markup/i.test(clean)) continue;
      if (!/\b(SF\s*\d{1,4}[A-Z]?|DD\s*Form|OF\s*\d+|Attachment\s+[A-Z0-9]+|Exhibit\s+[A-Z0-9]+|Appendix\s+[A-Z0-9]+|QASP|wage determination|pricing sheet|price schedule|amendment|certification|representation|solicitation provisions?|contract clauses?)\b/i.test(clean)) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
      if (limit && out.length >= limit) return out;
    }
  }
  return out;
}

function formItemsFromText(text, files) {
  const lines = findLines(text, /\b(SF\s*33|SF\s*1449|SF\s*18|representation|certification|Attachment|Exhibit|QASP|wage determination|pricing sheet|amendment|technical exhibit)\b/i, 40);
  const fileItems = (files || []).map(f => {
    const name = cleanExtractedText(f.fileName || '');
    if (!name) return '';
    if (/\b(SF|QASP|wage|pricing|price|attachment|exhibit|amendment|PWS|SOW|determination|certification|representation)\b/i.test(name)) return name;
    return '';
  });
  // Phase 25AR — dropSubsumedFormItems collapses "Attachment 1" + "Pricing Sheet"
  // back into "Attachment 1 — Pricing Sheet" when both came from the same source line.
  return dropSubsumedFormItems(uniqueFormItems(lines.concat(fileItems), 40));
}

function extractSolicitationNumber(text) {
  // Phase 25AR — the legacy regex
  //   /solicitation\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9._\-\/]+)/i
  // matched the literal SF 1449 header "SOLICITATION/CONTRACT/ORDER FOR
  // COMMERCIAL ITEMS" before the actual RFQ number line and emitted
  // "/CONTRACT/ORDER" as the solnum. We try a short ordered list of
  // higher-precision patterns instead, and validate the candidate before
  // returning it.
  const src = String(text || '');
  const patterns = [
    // Explicit qualifier: "Solicitation No: X", "Solicitation Number: X"
    /\bSolicitation\s+(?:No\.?|Number|#)\s*[:\-]\s*([A-Z0-9][A-Z0-9._\-\/]+)/i,
    // RFQ/RFP/IFB/RFI/Sources Sought number
    /\b(?:RFQ|RFP|IFB|RFI|Sources?\s+Sought)\s+(?:No\.?|Number|#)\s*[:\-]\s*([A-Z0-9][A-Z0-9._\-\/]+)/i,
    // Notice ID / Notice Number (used by SAM.gov packages)
    /\bNotice\s+(?:ID|Number)\s*[:\-]\s*([A-Z0-9][A-Z0-9._\-\/]+)/i,
    // "Solicitation: X" with explicit colon or dash, no qualifier word — last resort
    /\bSolicitation\s*[:\-]\s*([A-Z0-9][A-Z0-9._\-\/]{3,})/i
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (!m) continue;
    const candidate = String(m[1] || '').trim().replace(/[.,;]+$/, '');
    if (!candidate) continue;
    // Reject UCF header tokens that previously slipped through.
    if (/^(?:CONTRACT|ORDER|FORM|SOLICITATION|AWARD|COMMERCIAL|ITEMS|NUMBER|NO)$/i.test(candidate)) continue;
    if (candidate.startsWith('/') || candidate.startsWith('-') || candidate.startsWith('.')) continue;
    // Must contain at least one digit and be at least 4 chars — common-shape guard.
    if (!/\d/.test(candidate)) continue;
    if (candidate.length < 4) continue;
    return candidate.slice(0, 80);
  }
  return '';
}

function extractMetadata(text, manifest, files) {
  const src = cleanExtractedText(text || '');
  const requiredForms = formItemsFromText(src, files);
  return {
    title: manifest.title || findFirst(src, /^\s*(?:title|subject)\s*[:\-]\s*(.+)$/im),
    solicitationNumber: manifest.solicitationNumber || extractSolicitationNumber(src),
    agency: manifest.agency || findFirst(src, /(?:agency|department)\s*[:\-]\s*([^\n]+)/i),
    noticeId: manifest.noticeId || '',
    setAside: findFirst(src, /(SDVOSB|Service-Disabled Veteran-Owned|WOSB|EDWOSB|HUBZone|8\(a\)|small business set-aside)/i),
    naics: findFirst(src, /\bNAICS(?:\s+Code)?\s*[:\-]?\s*(\d{6})\b/i),
    classificationCode: findFirst(src, /\b(?:PSC|Product Service Code|Classification Code)\s*[:\-]?\s*([A-Z0-9]{1,6})\b/i),
    responseDeadline: manifest.responseDeadline || findFirst(src, /(?:response|proposal|quote|offers?)\s+due\s*(?:date)?\s*[:\-]?\s*([^\n]+)/i),
    qaDeadline: findFirst(src, /(?:questions?|Q\s*&\s*A)\s+(?:are\s+)?due\s*[:\-]?\s*([^\n]+)/i),
    siteVisit: findFirst(src, /site\s+visit\s*[:\-]?\s*([^\n]+)/i),
    pointOfContact: findLines(src, /\b(?:point of contact|POC|contracting officer|contract specialist|COR)\b/i, 8),
    placeOfPerformance: findFirst(src, /place\s+of\s+performance\s*[:\-]\s*([^\n]+)/i),
    deliverables: findLines(src, /\b(deliverable|deliverables|shall deliver|monthly report|reporting)\b/i, 12),
    pricingClinTable: findLines(src, /\b(CLIN|SLIN|unit price|extended price|price schedule|pricing sheet|labor category|quantity|unit of measure)\b/i, 30),
    requiredForms,
    complianceRisks: findLines(src, /\b(shall|must|mandatory|required|bond|insurance|clearance|background check|site visit|past performance|limitation on subcontracting)\b/i, 20),
    ambiguityFlags: findLines(src, /\b(TBD|to be determined|unclear|not specified|reserved|see attachment|see addendum)\b/i, 12),
    subcontractorScope: findLines(src, /\b(subcontract|subcontractor|staffing|labor category|janitorial|custodial|cleaning|security|IT support)\b/i, 12),
    attachmentsIndex: (files || []).map(f => ({
      fileName: f.fileName,
      source: f.source,
      status: f.status || f.extractionStatus || '',
      extractionStatus: f.extractionStatus || '',
      limitation: f.limitation || ''
    }))
  };
}

function complianceMatrixStarter(sections, metadata) {
  const rows = [];
  const seen = new Set();
  function proposalSection(source, text) {
    if (/Section L/i.test(source)) return 'Proposal instructions / response outline';
    if (/Section M/i.test(source)) return 'Evaluation crosswalk';
    if (/Section C|PWS|SOW/i.test(source)) return 'Technical approach / PWS response';
    if (/Section F/i.test(source)) return 'Performance schedule';
    if (/Section H|Section I/i.test(source)) return 'Compliance narrative';
    if (/Section J|Required Forms|Attachment/i.test(source)) return 'Attachments / forms volume';
    if (/pricing|CLIN/i.test(text)) return 'Price volume';
    return 'TBD - operator assigns';
  }
  function evidenceNeeded(text) {
    if (/\b(SF\s*33|SF\s*1449|SF\s*18|form|certification|representation)\b/i.test(text)) return 'Completed/signed form or certification';
    if (/\bpast performance|similar experience\b/i.test(text)) return 'Past performance project evidence';
    if (/\bprice|pricing|CLIN|SLIN|unit price\b/i.test(text)) return 'Pricing sheet / CLIN support';
    if (/\bstaff|personnel|resume|labor category\b/i.test(text)) return 'Staffing plan or resumes';
    if (/\bdeliver|schedule|deadline|due\b/i.test(text)) return 'Delivery schedule / milestone plan';
    if (/\btechnical|approach|PWS|SOW|shall provide|shall perform\b/i.test(text)) return 'Technical approach narrative';
    if (/\binsurance|bond|clearance|security\b/i.test(text)) return 'Insurance/security/clearance evidence';
    return 'Source-backed response evidence';
  }
  function riskFlag(text) {
    if (/\bsite visit\b/i.test(text)) return 'Mandatory site visit risk';
    if (/\bpage limit|font|margin|format\b/i.test(text)) return 'Page limit/formatting risk';
    if (/\b(SF\s*33|SF\s*1449|SF\s*18|form|certification|representation)\b/i.test(text)) return 'Missing form can make response noncompliant';
    if (/\bpast performance\b/i.test(text)) return 'Past performance evidence required';
    if (/\bprice|pricing|CLIN|SLIN\b/i.test(text)) return 'Pricing/CLIN mismatch risk';
    if (/\bdeadline|due|submission method|email|portal\b/i.test(text)) return 'Deadline/submission method risk';
    if (/\binsurance|bond|clearance|security\b/i.test(text)) return 'Insurance/security/clearance risk';
    return 'Review required';
  }
  function add(source, text, fileName, sourceLocation, sourceSection) {
    text = cleanExtractedText(text).replace(/\s+/g, ' ').trim();
    if (!text || /No Section/.test(text) || looksLikeRawMarkup(text) || text.length < 10) return;
    if (/^Required Forms$/i.test(text)) return;
    const key = `${source}|${text}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const id = 'CM-' + String(rows.length + 1).padStart(3, '0');
    rows.push({
      id,
      requirementId: id,
      source,
      sourceSection: sourceSection || source,
      sectionPageFile: sourceLocation || fileName || source,
      sourceFile: fileName || '',
      sourceLocation: sourceLocation || '',
      requirementText: text.slice(0, 700),
      requirement: text.slice(0, 700),
      normalizedRequirement: text.slice(0, 700),
      exactSourceText: text.slice(0, 700),
      sourceDocument: fileName || '',
      pageNumber: '',
      worksheetCell: sourceLocation || '',
      paragraphHeading: sourceSection || source,
      amendmentNumber: '',
      extractionMethod: 'local deterministic parser',
      confidence: source.indexOf('inferred') >= 0 ? 'medium' : 'high',
      reviewerStatus: 'not_reviewed',
      mandatory: /\b(shall|must|required|mandatory|submit|provide|include)\b/i.test(text) ? 'Mandatory' : 'Optional / verify',
      mandatoryOptional: /\b(shall|must|required|mandatory|submit|provide|include)\b/i.test(text) ? 'Mandatory' : 'Optional',
      proposalSection: proposalSection(source, text),
      owner: 'TBD - operator assigns',
      evidenceNeeded: evidenceNeeded(text),
      evidence: evidenceNeeded(text),
      status: 'Draft - not reviewed',
      reviewStatus: 'not_reviewed',
      responseLocation: proposalSection(source, text),
      applicableClause: /\b(?:FAR|DFARS)\s+\d{2}\.\d+/i.test(text) ? (text.match(/\b(?:FAR|DFARS)\s+\d{2}\.\d+(?:-\d+)?/i) || [''])[0] : '',
      deadline: /\b(?:due|deadline|no later than)\b/i.test(text) ? text.slice(0, 300) : '',
      risk: riskFlag(text),
      riskFlag: riskFlag(text),
      notes: 'Verify against source package.'
    });
  }
  const reqRe = /\b(shall|must|required|mandatory|submit|provide|include|demonstrate|evaluate|factor|attachment|form|deliver|perform)\b/i;
  for (const letter of ['L', 'M', 'C', 'F', 'H', 'I', 'J', 'K']) {
    const s = sections[letter];
    if (!s || !s.found) continue;
    const lines = uniqueLines(s.text.split(/\r?\n/).filter(l => reqRe.test(l)), 12);
    for (const line of lines) add(`Section ${letter}`, line, s.sourceFile || `Section ${letter}`, s.sourceLocation || '', `Section ${letter}`);
  }
  // Fallback requirement items (only adds non-duplicate, mandatory-flavored lines).
  const buckets = sections._fallbackBuckets || {};
  const fbOrder = [['instructions', 'Section L (inferred)'], ['evaluation', 'Section M (inferred)'], ['scope', 'PWS / SOW (inferred)'], ['forms', 'Required Forms / Attachments'], ['risks', 'Risk / Deal-killer (inferred)']];
  for (const [bucket, label] of fbOrder) {
    for (const item of (buckets[bucket] || [])) {
      if (!reqRe.test(item.text)) continue;
      add(label, item.text, item.sourceFile, item.sourceLocation, label);
    }
  }
  for (const form of metadata.requiredForms || []) add('Required Forms / Attachments', form, 'package manifest or extracted text');
  return rows;
}

function buildSourceBlocks(extractedFiles) {
  const blocks = [];
  for (const f of extractedFiles || []) {
    if (Array.isArray(f.children) && f.children.length) {
      for (const c of f.children) {
        if (c.text) blocks.push({ fileName: `${f.fileName} › ${c.fileName}`, location: `${f.fileName} › ${c.fileName}`, text: c.text });
      }
      continue;
    }
    if (!f.text) continue;
    let location = f.fileName;
    if (f.pages) location = `${f.fileName} (${f.pages} page${f.pages === 1 ? '' : 's'})`;
    blocks.push({ fileName: f.fileName, location, text: f.text });
  }
  return blocks;
}

function buildAliases(sections, metadata, files) {
  const buckets = sections._fallbackBuckets || {};
  function fromSection(letter) {
    const s = sections[letter];
    if (s && s.found) return [{ text: cleanExtractedText(s.text), sourceFile: s.sourceFile || '', sourceLocation: s.sourceLocation || '' }];
    return [];
  }
  const requiredFormsAttachments = [];
  const seenForm = new Set();
  function pushForm(text, sourceFile) {
    const clean = cleanExtractedText(text || '').replace(/\s+/g, ' ').trim();
    if (!clean || clean.length > 220 || seenForm.has(clean.toLowerCase())) return;
    if (/^Section\s+J\b|This file contains structured document markup/i.test(clean)) return;
    if (!/\b(SF\s*\d{1,4}[A-Z]?|DD\s*Form|OF\s*\d+|Attachment\s+[A-Z0-9]+|Exhibit\s+[A-Z0-9]+|Appendix\s+[A-Z0-9]+|QASP|wage determination|pricing sheet|price schedule|amendment|certification|representation|solicitation provisions?|contract clauses?)\b/i.test(clean)) return;
    seenForm.add(clean.toLowerCase());
    requiredFormsAttachments.push({ text: clean, sourceFile: sourceFile || '' });
  }
  // Phase 25AP — never push the entire Section J body into the forms alias.
  // metadata.requiredForms and form fallback buckets provide compact, auditable
  // form/attachment names without dumping raw solicitation text into the panel.
  for (const form of metadata.requiredForms || []) pushForm(form, 'package manifest or extracted text');
  for (const item of (buckets.forms || [])) pushForm(item.text, item.sourceFile);
  for (const f of files || []) {
    if (/\b(SF|QASP|wage|pricing|price|attachment|exhibit|amendment|PWS|SOW|determination|certification|representation)\b/i.test(f.fileName || '')) pushForm(f.fileName, f.fileName);
  }
  return {
    instructionsToOfferors: (sections.L && sections.L.found) ? fromSection('L') : (buckets.instructions || []),
    evaluationCriteria: (sections.M && sections.M.found) ? fromSection('M') : (buckets.evaluation || []),
    pwsSowRequirements: (sections.C && sections.C.found) ? fromSection('C').concat(fromSection('F')) : (buckets.scope || []),
    requiredFormsAttachments,
    deadlines: [metadata.responseDeadline, metadata.qaDeadline, metadata.siteVisit].filter(Boolean).map(text => ({ text })).concat((buckets.deadlines || [])),
    risksDealKillers: (metadata.complianceRisks || []).map(text => ({ text })).concat((buckets.risks || []))
  };
}

async function extractSolicitationPackage(input) {
  const manifest = await normalizeManifest(input);
  const files = await collectPackageFiles(manifest);
  if (files.length > MAX_SOLICITATION_DOCUMENTS) {
    return { ok: false, status: 'failed', reason: 'document_limit_exceeded', files: [], warnings: [] };
  }
  if (!files.length) {
    return {
      ok: false,
      status: 'failed',
      reason: 'no_files',
      realPackage: true,
      sample: false,
      files: [],
      warnings: ['No package files were available to extract.']
    };
  }
  const tmpRoot = manifest.packagePath ? path.join(manifest.packagePath, 'extracted') : '';
  const extractedFiles = [];
  // Phase 25AC item 5 — file-aware extraction. Each file is wrapped in
  // its own try/catch so a corrupt/unreadable/unsupported file produces
  // a `status: 'failed'` row WITHOUT failing the whole package. Errors
  // are surfaced per-file in `warnings` so the renderer can show which
  // files were skipped and why.
  for (const file of files) {
    try {
      extractedFiles.push(await extractFileText(file, tmpRoot));
    } catch (err) {
      extractedFiles.push(fileResult(file, {
        status: 'failed',
        extractionStatus: 'failed',
        text: '',
        limitation: 'Extraction error — file skipped (' + (err && err.code ? err.code : 'error') + ')',
        warnings: ['Extraction error — file skipped']
      }));
    }
  }
  for (const f of extractedFiles) {
    if (f && f.text && looksLikeUnreadableExtractionText(f.text)) {
      const msg = 'Extracted text is unreadable/encoded and was excluded from solicitation analysis.';
      f.text = '';
      f.extractionStatus = f.extractionStatus === 'text' ? 'metadata-only' : f.extractionStatus;
      f.limitation = f.limitation || msg;
      f.warnings = Array.isArray(f.warnings) ? f.warnings.concat([msg]) : [msg];
    }
  }
  const fullText = cleanExtractedText(extractedFiles.map(f => f.text).filter(Boolean).join('\n\n'));
  const sourceBlocks = buildSourceBlocks(extractedFiles);
  const sections = classifySections(fullText, sourceBlocks);
  const anySectionFound = SECTION_DEFS.some(([letter]) => sections[letter] && sections[letter].found);
  const metadata = extractMetadata(fullText, manifest, extractedFiles);
  const aliases = buildAliases(sections, metadata, extractedFiles);
  const warnings = [];
  for (const f of extractedFiles) {
    if (f.extractionStatus === 'rejected') warnings.push(`${f.fileName}: ${f.limitation || HTML_REJECT_LIMITATION}`);
    else if (f.extractionStatus === 'metadata-only') warnings.push(`${f.fileName}: ${STORED_LIMITATION}`);
    else if (f.extractionStatus === 'failed') warnings.push(`${f.fileName}: ${f.limitation || 'Extraction error — file skipped'}`);
    else if (f.extractionStatus === 'partial' && f.limitation) warnings.push(`${f.fileName}: ${f.limitation}`);
    for (const w of (f.warnings || [])) {
      if (w && w !== STORED_LIMITATION && w !== f.limitation) warnings.push(`${f.fileName}: ${w}`);
    }
  }
  // strip internal scratch field before returning
  const cleanSections = {};
  for (const [letter] of SECTION_DEFS) cleanSections[letter] = sections[letter];
  return {
    ok: true,
    status: anySectionFound ? 'extracted' : 'extracted_with_missing_sections',
    realPackage: true,
    sample: false,
    noticeId: manifest.noticeId || '',
    solicitationNumber: manifest.solicitationNumber || '',
    packagePath: manifest.packagePath || '',
    extractedAt: new Date().toISOString(),
    files: extractedFiles,
    fullText,
    sourceBlocks,
    sections: cleanSections,
    parts: {
      'Part I': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k => cleanSections[k]),
      'Part II': ['I'].map(k => cleanSections[k]),
      'Part III': ['J'].map(k => cleanSections[k]),
      'Part IV': ['K', 'L', 'M'].map(k => cleanSections[k])
    },
    metadata,
    instructionsToOfferors: aliases.instructionsToOfferors,
    evaluationCriteria: aliases.evaluationCriteria,
    pwsSowRequirements: aliases.pwsSowRequirements,
    requiredFormsAttachments: aliases.requiredFormsAttachments,
    deadlines: aliases.deadlines,
    risksDealKillers: aliases.risksDealKillers,
    complianceMatrixStarter: complianceMatrixStarter(sections, metadata),
    complianceMatrix: complianceMatrixStarter(sections, metadata),
    warnings
  };
}

function plainEnglish(extraction) {
  const ex = extraction || {};
  const sections = ex.sections || {};
  const out = {};
  for (const [letter, part, partTitle, title] of SECTION_DEFS) {
    const s = sections[letter] || { found: false };
    out[letter] = {
      part,
      partTitle,
      title,
      found: !!s.found,
      means: s.found ? (s.plainEnglishSummary || `This section tells you about ${title.toLowerCase()}.`) : `This section was not found in the extracted package text.`,
      mustDo: s.found ? 'Read the source file, confirm each requirement, and map anything mandatory into the compliance matrix.' : missingText(letter, title),
      whyItMatters: s.found ? 'Missing or misunderstanding this section can lead to a weak or noncompliant response.' : 'A missing section may mean the attachment was unparsed, omitted, or named differently.',
      riskFlags: s.found ? simpleRiskFlags(s.text || '') : ['Missing section - verify source package']
    };
  }
  return {
    ok: true,
    readingLevel: 'plain-English',
    notLegalAdvice: true,
    verifyAgainstSource: true,
    sections: out
  };
}

function simpleRiskFlags(text) {
  const flags = [];
  if (/\bshall|must|required|mandatory\b/i.test(text)) flags.push('Mandatory instructions found');
  if (/\bsite visit|clearance|background check|insurance|bond\b/i.test(text)) flags.push('Operational or compliance risk found');
  if (/\bpast performance|similar experience\b/i.test(text)) flags.push('Past performance evidence may be required');
  return flags.length ? flags.slice(0, 4) : ['Review source language'];
}

function acceptedUploadTypes() {
  return Array.from(ACCEPTED_UPLOAD_EXT);
}

module.exports = {
  SECTION_DEFS,
  acceptedUploadTypes,
  extractSolicitationPackage,
  plainEnglish,
  _classifySections: classifySections,
  _extractMetadata: extractMetadata,
  _missingText: missingText,
  _cleanExtractedText: cleanExtractedText,
  _normalizePlainText: normalizePlainText,
  _extractWordXmlText: extractWordXmlText,
  _extractPdfText: extractPdfText,
  _extractXlsxText: extractXlsxText,
  _extractFileText: extractFileText,
  _buildSourceBlocks: buildSourceBlocks,
  _scanFallbackBuckets: scanFallbackBuckets,
  _complianceMatrixStarter: complianceMatrixStarter
};
