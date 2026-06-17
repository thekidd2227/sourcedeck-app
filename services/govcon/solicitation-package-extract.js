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
    return {
      fileName,
      localPath: file.localPath || '',
      source: file.source || 'package',
      status: 'extracted',
      extractionStatus: text ? 'docx-basic' : 'metadata-only',
      text,
      extractedFiles: children,
      limitation: text ? '' : 'Stored, text extraction not available yet for this file.'
    };
  }
  if (ext === '.xml' && /(^|\/|\\)word[\/\\](document|header\d*|footer\d*)\.xml$/i.test(fileName) && file.localPath) {
    const text = extractWordXmlText(await fsp.readFile(file.localPath, 'utf8'));
    return {
      fileName,
      localPath: file.localPath || '',
      source: file.source || 'package',
      status: 'extracted',
      extractionStatus: text ? 'docx-xml-basic' : 'metadata-only',
      text,
      limitation: text ? '' : 'Stored, text extraction not available yet for this file.'
    };
  }
  if (TEXT_EXT.has(ext)) {
    const raw = await readTextFile(file.localPath);
    return {
      fileName,
      localPath: file.localPath || '',
      source: file.source || 'package',
      status: 'extracted',
      extractionStatus: 'text',
      text: looksLikeRawMarkup(raw) ? cleanExtractedText(raw) : raw
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
      text: cleanExtractedText(childTexts.map(c => c.text).filter(Boolean).join('\n\n')),
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
    limitation: 'Stored, text extraction not available yet for this file.'
  };
}

function sanitize(s) {
  return String(s || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
}

function sectionRegex(letter) {
  return new RegExp('(?:^|\\n)\\s*(?:SECTION\\s+' + letter + '\\b|' + letter + '\\s*[\\.\\-]\\s+|PART\\s+[IVX]+[^\\n]*SECTION\\s+' + letter + '\\b)', 'i');
}

function classifySections(text) {
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
  const sections = {};
  for (const [letter, part, partTitle, title] of SECTION_DEFS) {
    const textValue = byLetter[letter] || '';
    sections[letter] = {
      letter,
      part,
      partTitle,
      title,
      found: !!textValue,
      text: textValue ? cleanExtractedText(textValue) : missingText(letter, title),
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

function formItemsFromText(text, files) {
  const lines = findLines(text, /\b(SF\s*33|SF\s*1449|SF\s*18|representation|certification|Attachment|Exhibit|QASP|wage determination|pricing sheet|amendment|technical exhibit)\b/i, 40);
  const fileItems = (files || []).map(f => {
    const name = cleanExtractedText(f.fileName || '');
    if (!name) return '';
    if (/\b(SF|QASP|wage|pricing|price|attachment|exhibit|amendment|PWS|SOW|determination|certification|representation)\b/i.test(name)) return name;
    return '';
  });
  return uniqueLines(lines.concat(fileItems), 40);
}

function extractMetadata(text, manifest, files) {
  const src = cleanExtractedText(text || '');
  const requiredForms = formItemsFromText(src, files);
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
  function add(source, text, fileName) {
    text = cleanExtractedText(text).replace(/\s+/g, ' ').trim();
    if (!text || /No Section/.test(text) || looksLikeRawMarkup(text) || text.length < 10) return;
    const key = `${source}|${text}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      id: 'CM-' + String(rows.length + 1).padStart(3, '0'),
      source,
      sectionPageFile: fileName || source,
      requirementText: text.slice(0, 700),
      requirement: text.slice(0, 700),
      mandatory: /\b(shall|must|required|mandatory|submit|provide|include)\b/i.test(text) ? 'Mandatory' : 'Optional / verify',
      proposalSection: proposalSection(source, text),
      owner: 'TBD - operator assigns',
      evidenceNeeded: evidenceNeeded(text),
      evidence: evidenceNeeded(text),
      status: 'Draft - not reviewed',
      risk: riskFlag(text),
      notes: 'Verify against source package.'
    });
  }
  for (const letter of ['L', 'M', 'C', 'F', 'H', 'I', 'J', 'K']) {
    const s = sections[letter];
    if (!s || !s.found) continue;
    const lines = uniqueLines(s.text.split(/\r?\n/).filter(l => /\b(shall|must|required|mandatory|submit|provide|include|demonstrate|evaluate|factor|attachment|form|deliver|perform)\b/i.test(l)), 10);
    for (const line of lines) add(`Section ${letter}`, line, s.source || `Section ${letter}`);
  }
  for (const form of metadata.requiredForms || []) add('Required Forms / Attachments', form, 'package manifest or extracted text');
  return rows;
}

async function extractSolicitationPackage(input) {
  const manifest = await normalizeManifest(input);
  const files = await collectPackageFiles(manifest);
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
      extractedFiles.push({
        fileName: file.fileName || path.basename(file.localPath || ''),
        localPath: file.localPath || '',
        source: file.source || 'package',
        status: 'failed',
        extractionStatus: 'failed',
        text: '',
        limitation: 'Extraction error — file skipped (' + (err && err.code ? err.code : 'error') + ')'
      });
    }
  }
  const fullText = cleanExtractedText(extractedFiles.map(f => f.text).filter(Boolean).join('\n\n'));
  const sections = classifySections(fullText);
  const anySectionFound = Object.values(sections).some(s => s && s.found);
  const metadata = extractMetadata(fullText, manifest, extractedFiles);
  const warnings = [];
  for (const f of extractedFiles) {
    if (f.extractionStatus === 'metadata-only') warnings.push(`${f.fileName}: Stored, text extraction not available yet for this file.`);
    else if (f.extractionStatus === 'failed')   warnings.push(`${f.fileName}: ${f.limitation || 'Extraction error — file skipped'}`);
  }
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
    sections,
    parts: {
      'Part I': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k => sections[k]),
      'Part II': ['I'].map(k => sections[k]),
      'Part III': ['J'].map(k => sections[k]),
      'Part IV': ['K', 'L', 'M'].map(k => sections[k])
    },
    metadata,
    complianceMatrixStarter: complianceMatrixStarter(sections, metadata),
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
  _missingText: missingText,
  _cleanExtractedText: cleanExtractedText,
  _extractWordXmlText: extractWordXmlText
};
