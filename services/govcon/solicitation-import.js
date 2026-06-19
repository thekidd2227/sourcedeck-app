'use strict';

// Phase 25AN — local solicitation import + extraction orchestrator.
//
// This is an UPLOAD/IMPORT-ONLY service. It never reaches the network, never
// scans the Downloads folder, never fetches remote attachments. The renderer
// presents a native multi-file picker; the chosen file paths are handed here.
// We validate every file, copy the accepted ones into SourceDeck-controlled
// userData, run local extraction against the copies, and return a sanitized
// normalized contract for the Solicitation Center.
//
// Flow: select (renderer) → validate → copy into userData → extract locally →
// normalize → populate Solicitation Center.

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const fileUtils = require('./solicitation-file-utils');
const { extractSolicitationPackage, acceptedUploadTypes, SECTION_DEFS } = require('./solicitation-package-extract');

const MAX_FILE_BYTES = 64 * 1024 * 1024; // 64 MB per-file hard cap
const ACCEPTED = new Set(acceptedUploadTypes());

function safeSegment(s) {
  return String(s || 'notice')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'notice';
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function emptySection(letter) {
  const def = SECTION_DEFS.find(d => d[0] === letter) || [letter, '', '', ''];
  return {
    letter, part: def[1], partTitle: def[2], title: def[3],
    found: false, confidence: 'none', source: '', sourceFile: '', sourceLocation: '',
    text: '', plainEnglishSummary: ''
  };
}

// Normalize an extractor result (ex) into the Phase 25AN contract.
function buildContract(ex, opportunity, importInfo) {
  ex = ex || {};
  const opp = opportunity || {};
  const sections = {};
  for (const [letter] of SECTION_DEFS) {
    const s = (ex.sections && ex.sections[letter]) ? ex.sections[letter] : null;
    sections[letter] = s ? {
      letter: s.letter, part: s.part, partTitle: s.partTitle, title: s.title,
      found: !!s.found, confidence: s.confidence || 'none', source: s.source || '',
      sourceFile: s.sourceFile || '', sourceLocation: s.sourceLocation || '',
      text: s.text || '', plainEnglishSummary: s.plainEnglishSummary || ''
    } : emptySection(letter);
  }
  const md = ex.metadata || {};
  const metadata = {
    title: md.title || opp.title || '',
    solicitationNumber: md.solicitationNumber || opp.solicitationNumber || '',
    noticeId: md.noticeId || opp.noticeId || '',
    noticeType: md.noticeType || opp.noticeType || '',
    agency: md.agency || opp.agency || '',
    subAgency: md.subAgency || opp.subAgency || '',
    office: md.office || opp.office || '',
    naics: md.naics || opp.naics || '',
    classificationCode: md.classificationCode || opp.classificationCode || '',
    setAside: md.setAside || opp.setAside || '',
    postedDate: md.postedDate || opp.postedDate || '',
    responseDeadline: md.responseDeadline || opp.responseDeadline || '',
    qaDeadline: md.qaDeadline || '',
    siteVisit: md.siteVisit || '',
    placeOfPerformance: md.placeOfPerformance || opp.placeOfPerformance || '',
    periodOfPerformance: md.periodOfPerformance || '',
    pointOfContact: md.pointOfContact || opp.pointOfContact || [],
    deliverables: md.deliverables || [],
    pricingClinTable: md.pricingClinTable || [],
    requiredForms: md.requiredForms || [],
    attachmentsIndex: md.attachmentsIndex || [],
    complianceRisks: md.complianceRisks || [],
    ambiguityFlags: md.ambiguityFlags || [],
    subcontractorScope: md.subcontractorScope || ''
  };
  return {
    ok: true,
    import: importInfo,
    metadata,
    sections,
    instructionsToOfferors: ex.instructionsToOfferors || [],
    evaluationCriteria: ex.evaluationCriteria || [],
    pwsSowRequirements: ex.pwsSowRequirements || [],
    requiredFormsAttachments: ex.requiredFormsAttachments || [],
    deadlines: ex.deadlines || [],
    risksDealKillers: ex.risksDealKillers || [],
    complianceMatrix: ex.complianceMatrixStarter || [],
    sourceBlocks: ex.sourceBlocks || [],
    warnings: ex.warnings || []
  };
}

// Validate + copy one selected file into the import root. Returns
// { accepted, manifestRow, warning }.
async function ingestFile(filePath, originalDir, usedNames) {
  const fileName = path.basename(String(filePath || ''));
  const ext = fileUtils.fileExtension(fileName);
  if (!ACCEPTED.has(ext)) {
    return { accepted: false, warning: { fileName, code: 'rejected_unsupported_type' } };
  }
  let stat;
  try { stat = await fsp.stat(filePath); }
  catch (_) { return { accepted: false, warning: { fileName, code: 'rejected_unreadable' } }; }
  if (!stat.isFile()) {
    return { accepted: false, warning: { fileName, code: 'rejected_not_a_file' } };
  }
  if (stat.size > MAX_FILE_BYTES) {
    return { accepted: false, warning: { fileName, code: 'rejected_too_large' } };
  }
  let buffer;
  try { buffer = await fsp.readFile(filePath); }
  catch (_) { return { accepted: false, warning: { fileName, code: 'rejected_read_failed' } }; }
  // Content safety: reject HTML masquerading as text, SAM login/portal pages,
  // and SourceDeck app-shell text. Binary attachments pass via magic bytes.
  const verdict = fileUtils.classifyLocalFile(buffer, '');
  if (!verdict.ok) {
    return { accepted: false, warning: { fileName, code: 'rejected_' + (verdict.reason || 'invalid_content') } };
  }
  // Copy into SourceDeck-controlled storage with a sanitized, de-duped name.
  let safeName = fileUtils.sanitizeFileName(fileName);
  const base = safeName.slice(0, safeName.length - path.extname(safeName).length) || 'attachment';
  let candidate = safeName; let n = 2;
  while (usedNames.has(candidate.toLowerCase())) { candidate = base + '-' + n + ext; n += 1; }
  usedNames.add(candidate.toLowerCase());
  const dest = path.join(originalDir, candidate);
  await fsp.writeFile(dest, buffer);
  return {
    accepted: true,
    buffer,
    manifestRow: { fileName: candidate, localPath: dest, sizeBytes: stat.size },
    record: {
      fileName: candidate,
      extension: ext,
      localPath: dest,
      size: stat.size,
      hash: sha256(buffer),
      mimeType: fileUtils.detectMimeType(candidate, buffer)
    }
  };
}

// Public: import user-selected files and extract them locally.
//   payload: { filePaths: [...], opportunity: {...}, userDataPath, timestamp }
// Returns the normalized contract, or { ok:false, reason, warnings }.
async function importAndExtract(payload) {
  payload = payload || {};
  const filePaths = Array.isArray(payload.filePaths) ? payload.filePaths : [];
  const opportunity = payload.opportunity || {};
  const userDataPath = payload.userDataPath;
  if (!userDataPath) return { ok: false, reason: 'no_user_data_path', warnings: [] };
  if (!filePaths.length) return { ok: false, reason: 'no_files_selected', warnings: [] };

  const ts = String(payload.timestamp || new Date().toISOString().replace(/[:.]/g, '-'));
  const noticeSeg = safeSegment(opportunity.noticeId || opportunity.solicitationNumber || opportunity.id || 'notice');
  const root = path.join(userDataPath, 'govcon', 'imported-solicitations', noticeSeg, ts);
  const originalDir = path.join(root, 'original');
  const extractedDir = path.join(root, 'extracted');
  await fsp.mkdir(originalDir, { recursive: true });
  await fsp.mkdir(extractedDir, { recursive: true });

  const usedNames = new Set();
  const manifestRows = [];
  const fileRecords = [];
  const warnings = [];
  for (const fp of filePaths) {
    let res;
    try { res = await ingestFile(fp, originalDir, usedNames); }
    catch (err) { warnings.push({ fileName: path.basename(String(fp || '')), code: 'rejected_import_error' }); continue; }
    if (res.accepted) { manifestRows.push(res.manifestRow); fileRecords.push(res.record); }
    else warnings.push(res.warning);
  }

  if (!manifestRows.length) {
    return { ok: false, reason: 'no_valid_files', warnings, importedFileCount: 0 };
  }

  // Run local extraction against the copied files only. packagePath = root so
  // the extractor writes its scratch ZIP/DOCX output under root/extracted.
  const manifest = { files: manifestRows, packagePath: root };
  let ex;
  try { ex = await extractSolicitationPackage({ manifest }); }
  catch (err) { return { ok: false, reason: 'extraction_failed', warnings, importedFileCount: manifestRows.length }; }

  const exFiles = (ex && ex.files) || [];
  const successfulFileCount = exFiles.filter(f => f && (f.extractionStatus === 'text')).length;
  const partialFileCount = exFiles.filter(f => f && f.extractionStatus === 'partial').length;
  const failedFileCount = exFiles.filter(f => f && (f.extractionStatus === 'failed' || f.extractionStatus === 'rejected')).length;

  const importedAt = new Date().toISOString();
  const importInfo = {
    noticeId: opportunity.noticeId || (ex.metadata && ex.metadata.noticeId) || '',
    opportunityId: opportunity.id || opportunity.opportunityId || '',
    importedAt,
    sourceFileCount: manifestRows.length,
    successfulFileCount,
    partialFileCount,
    failedFileCount
  };

  const contract = buildContract(ex, opportunity, importInfo);
  contract.warnings = (contract.warnings || []).concat(warnings.map(w => w.fileName + ': ' + w.code));

  // Write a SAFE import manifest (names/paths inside userData, sizes, hashes,
  // statuses, warning codes only — never API keys, remote URLs, credentials,
  // external pre-copy paths, or app-shell content).
  const safeManifest = {
    noticeId: importInfo.noticeId,
    opportunityId: importInfo.opportunityId,
    importedAt,
    sourceFileCount: manifestRows.length,
    files: fileRecords.map(r => ({
      fileName: r.fileName,
      extension: r.extension,
      localPath: r.localPath,
      size: r.size,
      hash: r.hash,
      importedAt
    })),
    extractionStatus: ex.status || 'extracted',
    warnings: warnings.map(w => w.fileName + ': ' + w.code)
  };
  try { await fsp.writeFile(path.join(root, 'import-manifest.json'), JSON.stringify(safeManifest, null, 2)); }
  catch (_) { /* manifest write is best-effort; extraction already succeeded */ }

  contract.import.rootPath = root;
  return contract;
}

module.exports = {
  importAndExtract,
  buildContract,
  MAX_FILE_BYTES,
  _ingestFile: ingestFile,
  _safeSegment: safeSegment
};
