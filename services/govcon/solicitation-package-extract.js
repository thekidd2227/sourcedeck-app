'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { _extractZip } = require('./sam-package-download');

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

const TEXT_EXT = new Set(['.txt', '.csv', '.md', '.json', '.xml', '.html', '.htm', '.rtf']);
const ACCEPTED_UPLOAD_EXT = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip']);

function safeText(s) {
  return String(s == null ? '' : s).replace(/\0/g, '').slice(0, 500000);
}

function missingText(letter, label) {
  return `No Section ${letter} ${label || ''} extracted yet. Verify source package.`.replace(/\s+/g, ' ').trim();
}

function extOf(fileName) {
  return path.extname(String(fileName || '')).toLowerCase();
}

async function readTextFile(filePath) {
  const buf = await fsp.readFile(filePath);
  return safeText(buf.toString('utf8'));
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

async function extractFileText(file, tmpRoot) {
  const fileName = file.fileName || path.basename(file.localPath || '');
  const ext = extOf(fileName);
  if (TEXT_EXT.has(ext)) {
    return {
      fileName,
      localPath: file.localPath || '',
      source: file.source || 'package',
      status: 'extracted',
      extractionStatus: 'text',
      text: await readTextFile(file.localPath)
    };
  }
  if (ext === '.zip' && file.localPath && tmpRoot) {
    const outDir = path.join(tmpRoot, 'zip-' + sanitize(fileName));
    await fsp.mkdir(outDir, { recursive: true });
    const children = await _extractZip(file.localPath, outDir);
    const childTexts = [];
    for (const child of children) childTexts.push(await extractFileText(Object.assign({ source: 'zip-child' }, child), tmpRoot));
    return {
      fileName,
      localPath: file.localPath || '',
      source: file.source || 'package',
      status: 'extracted',
      extractionStatus: 'zip',
      text: childTexts.map(c => c.text).filter(Boolean).join('\n\n'),
      children: childTexts
    };
  }
  return {
    fileName,
    localPath: file.localPath || '',
    source: file.source || 'package',
    status: 'stored',
    extractionStatus: 'metadata-only',
    text: '',
    limitation: 'Stored, text extraction not available yet'
  };
}

function sanitize(s) {
  return String(s || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
}

function sectionRegex(letter) {
  return new RegExp('(?:^|\\n)\\s*(?:SECTION\\s+' + letter + '\\b|' + letter + '\\s*[\\.\\-]\\s+|PART\\s+[IVX]+[^\\n]*SECTION\\s+' + letter + '\\b)', 'i');
}

function classifySections(text) {
  const src = safeText(text || '');
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
  const sections = {};
  for (const [letter, part, partTitle, title] of SECTION_DEFS) {
    const textValue = byLetter[letter] || '';
    sections[letter] = {
      letter,
      part,
      partTitle,
      title,
      found: !!textValue,
      text: textValue || missingText(letter, title),
      source: textValue ? 'extracted package text' : 'missing-placeholder'
    };
  }
  return sections;
}

function findFirst(text, re) {
  const m = String(text || '').match(re);
  return m ? String(m[1] || m[0]).trim().slice(0, 300) : '';
}

function findLines(text, re, limit) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.filter(l => re.test(l)).slice(0, limit || 12);
}

function extractMetadata(text, manifest, files) {
  const src = String(text || '');
  return {
    title: manifest.title || findFirst(src, /^\s*(?:title|subject)\s*[:\-]\s*(.+)$/im),
    solicitationNumber: manifest.solicitationNumber || findFirst(src, /solicitation\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9._\-\/]+)/i),
    agency: manifest.agency || findFirst(src, /(?:agency|department)\s*[:\-]\s*([^\n]+)/i),
    noticeId: manifest.noticeId || '',
    setAside: findFirst(src, /(SDVOSB|Service-Disabled Veteran-Owned|WOSB|EDWOSB|HUBZone|8\(a\)|small business set-aside)/i),
    naics: findFirst(src, /\bNAICS(?:\s+Code)?\s*[:\-]?\s*(\d{6})\b/i),
    classificationCode: findFirst(src, /\b(?:PSC|Product Service Code|Classification Code)\s*[:\-]?\s*([A-Z0-9]{1,6})\b/i),
    responseDeadline: manifest.responseDeadline || findFirst(src, /(?:response|proposal|quote)\s+due\s*(?:date)?\s*[:\-]?\s*([^\n]+)/i),
    qaDeadline: findFirst(src, /(?:questions?|Q\s*&\s*A)\s+(?:are\s+)?due\s*[:\-]?\s*([^\n]+)/i),
    siteVisit: findFirst(src, /site\s+visit\s*[:\-]?\s*([^\n]+)/i),
    pointOfContact: findLines(src, /\b(?:point of contact|POC|contracting officer|contract specialist|COR)\b/i, 8),
    placeOfPerformance: findFirst(src, /place\s+of\s+performance\s*[:\-]\s*([^\n]+)/i),
    deliverables: findLines(src, /\b(deliverable|deliverables|shall deliver|monthly report|reporting)\b/i, 12),
    pricingClinTable: findLines(src, /\b(CLIN|SLIN|unit price|extended price|price schedule|pricing sheet)\b/i, 20),
    requiredForms: findLines(src, /\b(SF\s*33|SF\s*1449|SF[-\s]?\d+|representation|certification|Attachment|Exhibit|QASP|wage determination)\b/i, 20),
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
  function add(source, text, why) {
    if (!text || /No Section/.test(text)) return;
    rows.push({
      id: 'CM-' + String(rows.length + 1).padStart(3, '0'),
      source,
      requirement: text.slice(0, 500),
      owner: 'TBD',
      evidence: 'Verify against source package',
      risk: why || 'Review required',
      status: 'Draft - verify'
    });
  }
  for (const letter of ['L', 'M', 'C', 'F', 'H', 'I', 'J', 'K']) {
    const s = sections[letter];
    if (!s || !s.found) continue;
    const lines = s.text.split(/\r?\n/).map(l => l.trim()).filter(l => /\b(shall|must|required|submit|provide|include|demonstrate|evaluate|factor)\b/i.test(l)).slice(0, 8);
    for (const line of lines) add(`Section ${letter}`, line, letter === 'M' ? 'Evaluation alignment' : 'Compliance response');
  }
  for (const form of metadata.requiredForms || []) add('Required Forms', form, 'Missing form can make response noncompliant');
  return rows;
}

async function extractSolicitationPackage(input) {
  const manifest = await normalizeManifest(input);
  const files = await collectPackageFiles(manifest);
  const tmpRoot = manifest.packagePath ? path.join(manifest.packagePath, 'extracted') : '';
  const extractedFiles = [];
  for (const file of files) extractedFiles.push(await extractFileText(file, tmpRoot));
  const fullText = extractedFiles.map(f => f.text).filter(Boolean).join('\n\n');
  const sections = classifySections(fullText);
  const metadata = extractMetadata(fullText, manifest, extractedFiles);
  return {
    ok: true,
    realPackage: true,
    sample: false,
    noticeId: manifest.noticeId || '',
    solicitationNumber: manifest.solicitationNumber || '',
    packagePath: manifest.packagePath || '',
    extractedAt: new Date().toISOString(),
    files: extractedFiles,
    sections,
    parts: {
      'Part I': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k => sections[k]),
      'Part II': ['I'].map(k => sections[k]),
      'Part III': ['J'].map(k => sections[k]),
      'Part IV': ['K', 'L', 'M'].map(k => sections[k])
    },
    metadata,
    complianceMatrixStarter: complianceMatrixStarter(sections, metadata),
    warnings: extractedFiles.filter(f => f.extractionStatus === 'metadata-only').map(f => `${f.fileName}: Stored, text extraction not available yet`)
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
      means: s.found ? `This section tells you about ${title.toLowerCase()}.` : `This section was not found in the extracted package text.`,
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
  _missingText: missingText
};
