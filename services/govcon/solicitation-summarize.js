// services/govcon/solicitation-summarize.js
//
// Phase 25AR — Structured "Summarize Solicitation" breakdown.
//
// Reads a normalized extraction record (the output of
// services/govcon/solicitation-import.js#importAndExtract) and returns
// a deterministic 17-area operator-grade breakdown of the solicitation.
// No network call. No LLM. No state mutation. The renderer binds to the
// returned object directly so the breakdown is reproducible from the
// saved extraction record.
//
// Field-level status states are surfaced honestly: each area carries
// `status ∈ { extracted, not_found, not_applicable, low_confidence,
// extraction_failed }` plus the source-of-truth field names and
// participating source files that produced the content. Areas the
// extractor cannot speak to honestly are marked `not_found` with an
// explanatory note, never a blank string or null.
//
// AI-generated narrative is intentionally NOT mixed into facts. The
// `analysisNotes` array is the only place a downstream caller may add
// model-generated narrative; the facts panel must reference only
// source-quoted content.

'use strict';

const SCHEMA_VERSION = 1;

const AREA_DEFINITIONS = [
  { key: 'whats-being-bought',         title: 'What the government is buying' },
  { key: 'who-is-buying',               title: 'Who is buying it' },
  { key: 'key-dates',                   title: 'Key dates' },
  { key: 'eligibility-set-aside',       title: 'Eligibility and set-aside' },
  { key: 'scope',                       title: 'Scope' },
  { key: 'place-of-performance',        title: 'Place of performance' },
  { key: 'period-of-performance',       title: 'Period of performance' },
  { key: 'contract-pricing-structure',  title: 'Contract and pricing structure' },
  { key: 'submission-requirements',     title: 'Submission requirements' },
  { key: 'evaluation-method',           title: 'Evaluation method' },
  { key: 'mandatory-compliance',        title: 'Mandatory compliance requirements' },
  { key: 'major-clauses',               title: 'Major clauses' },
  { key: 'attachments',                 title: 'Attachments' },
  { key: 'risks-ambiguities',           title: 'Risks and ambiguities' },
  { key: 'recommended-questions',       title: 'Recommended bidder questions' },
  { key: 'bid-no-bid',                  title: 'Bid / no-bid considerations' },
  { key: 'immediate-actions',           title: 'Immediate action checklist' }
];

// Compact a section field down to a usable string for the summary.
// Accepts strings, objects with a .text, and arrays of either.
function flatten(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(v => flatten(v)).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.value === 'string') return value.value.trim();
    return '';
  }
  return String(value).trim();
}

function collectSourceFiles(value, acc) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(v => collectSourceFiles(v, acc));
    return;
  }
  if (typeof value === 'object' && value.sourceFile) acc.add(String(value.sourceFile));
}

function makeArea(definition, content, status, opts) {
  opts = opts || {};
  return {
    key:           definition.key,
    title:         definition.title,
    content:       content || '',
    status:        status || (content ? 'extracted' : 'not_found'),
    note:          opts.note || '',
    sourceFields:  Array.isArray(opts.sourceFields) ? opts.sourceFields.slice() : [],
    sourceFiles:   Array.isArray(opts.sourceFiles) ? opts.sourceFiles.slice() : []
  };
}

function uniqueFiles(record) {
  const acc = new Set();
  if (!record) return [];
  // metadata.attachmentsIndex carries reliable source file info.
  (record.metadata && record.metadata.attachmentsIndex || []).forEach(a => {
    if (a && a.fileName) acc.add(String(a.fileName));
  });
  // sections each carry sourceFile.
  Object.values(record.sections || {}).forEach(s => {
    if (s && s.sourceFile) acc.add(String(s.sourceFile));
  });
  // Aliases carry per-entry sourceFile.
  ['instructionsToOfferors', 'evaluationCriteria', 'pwsSowRequirements', 'requiredFormsAttachments', 'deadlines', 'risksDealKillers']
    .forEach(field => collectSourceFiles(record[field], acc));
  return Array.from(acc);
}

function pickWhatsBeingBought(record) {
  const def = AREA_DEFINITIONS[0];
  const metadata = record.metadata || {};
  const title = flatten(metadata.title);
  const scope = flatten(record.pwsSowRequirements) || flatten((record.sections || {}).C && (record.sections || {}).C.text);
  if (!title && !scope) {
    return makeArea(def, '', 'not_found', { note: 'Title and scope are missing from the extracted package.' });
  }
  const lines = [];
  if (title) lines.push(title);
  if (scope) lines.push(scope.split('\n').slice(0, 6).join('\n'));
  return makeArea(def, lines.join('\n\n'), 'extracted', {
    sourceFields: ['metadata.title', 'pwsSowRequirements', 'sections.C'],
    sourceFiles:  [].concat(record.pwsSowRequirements || []).filter(x => x && x.sourceFile).map(x => x.sourceFile)
  });
}

function pickWhoIsBuying(record) {
  const def = AREA_DEFINITIONS[1];
  const metadata = record.metadata || {};
  const agency   = flatten(metadata.agency);
  const sub      = flatten(metadata.subAgency);
  const office   = flatten(metadata.office);
  const contacts = (metadata.pointOfContact || []).map(flatten).filter(Boolean);
  const parts = [];
  if (agency) parts.push(agency);
  if (sub)    parts.push(`Sub-agency: ${sub}`);
  if (office) parts.push(`Office: ${office}`);
  if (contacts.length) parts.push('Contacts:\n  - ' + contacts.slice(0, 6).join('\n  - '));
  if (!parts.length) {
    return makeArea(def, '', 'not_found', { note: 'Buyer agency and contacts are missing from the extracted package.' });
  }
  return makeArea(def, parts.join('\n'), 'extracted', {
    sourceFields: ['metadata.agency', 'metadata.subAgency', 'metadata.office', 'metadata.pointOfContact']
  });
}

function pickKeyDates(record) {
  const def = AREA_DEFINITIONS[2];
  const metadata = record.metadata || {};
  const posted   = flatten(metadata.postedDate);
  const qa       = flatten(metadata.qaDeadline);
  const site     = flatten(metadata.siteVisit);
  const due      = flatten(metadata.responseDeadline);
  const explicit = (record.deadlines || []).map(flatten).filter(Boolean);
  const rows = [];
  if (posted) rows.push(`Posted / issued: ${posted}`);
  if (qa)     rows.push(`Questions due: ${qa}`);
  if (site)   rows.push(`Site visit: ${site}`);
  if (due)    rows.push(`Response due: ${due}`);
  // Add any extra distinct dates from the explicit deadlines list.
  for (const d of explicit) {
    if (!rows.some(r => r.includes(d))) rows.push(`Deadline: ${d}`);
  }
  if (!rows.length) {
    return makeArea(def, '', 'not_found', { note: 'No solicitation dates were extracted from the package.' });
  }
  const files = [];
  collectSourceFiles(record.deadlines, new Set(files));
  return makeArea(def, rows.join('\n'), 'extracted', {
    sourceFields: ['metadata.postedDate', 'metadata.responseDeadline', 'metadata.qaDeadline', 'metadata.siteVisit', 'deadlines']
  });
}

function pickEligibilitySetAside(record) {
  const def = AREA_DEFINITIONS[3];
  const metadata = record.metadata || {};
  const setAside = flatten(metadata.setAside);
  const naics    = flatten(metadata.naics);
  const psc      = flatten(metadata.classificationCode);
  const parts = [];
  if (setAside) parts.push(`Set-aside: ${setAside}`);
  if (naics)    parts.push(`NAICS: ${naics}`);
  if (psc)      parts.push(`PSC: ${psc}`);
  if (!parts.length) {
    return makeArea(def, '', 'not_found', { note: 'Set-aside and classification are missing from the extracted package.' });
  }
  return makeArea(def, parts.join('\n'), 'extracted', {
    sourceFields: ['metadata.setAside', 'metadata.naics', 'metadata.classificationCode']
  });
}

function pickScope(record) {
  const def = AREA_DEFINITIONS[4];
  const pws = flatten(record.pwsSowRequirements);
  const sC  = (record.sections || {}).C;
  const text = pws || flatten(sC && sC.text);
  if (!text) {
    return makeArea(def, '', 'not_found', { note: 'Scope / PWS / SOW content was not detected in the extracted package.' });
  }
  return makeArea(def, text.split('\n').slice(0, 12).join('\n'), 'extracted', {
    sourceFields: ['pwsSowRequirements', 'sections.C']
  });
}

function pickPlaceOfPerformance(record) {
  const def = AREA_DEFINITIONS[5];
  const value = flatten((record.metadata || {}).placeOfPerformance);
  if (!value) {
    return makeArea(def, '', 'not_found', { note: 'Place of performance was not extracted.' });
  }
  return makeArea(def, value, 'extracted', { sourceFields: ['metadata.placeOfPerformance'] });
}

function pickPeriodOfPerformance(record) {
  const def = AREA_DEFINITIONS[6];
  const value = flatten((record.metadata || {}).periodOfPerformance);
  if (!value) {
    return makeArea(def, '', 'not_found', { note: 'Period of performance was not extracted; check Section F or the cover sheet.' });
  }
  return makeArea(def, value, 'extracted', { sourceFields: ['metadata.periodOfPerformance'] });
}

function pickContractPricingStructure(record) {
  const def = AREA_DEFINITIONS[7];
  const metadata = record.metadata || {};
  const noticeType  = flatten(metadata.noticeType);
  const pricing     = (metadata.pricingClinTable || []).map(flatten).filter(Boolean);
  const sections = record.sections || {};
  const sB = sections.B && sections.B.found ? flatten(sections.B.text) : '';
  const parts = [];
  if (noticeType) parts.push(`Notice type: ${noticeType}`);
  if (sB)         parts.push(sB.split('\n').slice(0, 4).join('\n'));
  if (pricing.length) parts.push('Pricing table / CLINs:\n  - ' + pricing.slice(0, 10).join('\n  - '));
  if (!parts.length) {
    return makeArea(def, '', 'not_found', { note: 'Pricing / CLIN structure was not detected. The package may be commercial-items (FAR Part 12) and rely on Attachment 1 for pricing.' });
  }
  return makeArea(def, parts.join('\n'), 'extracted', {
    sourceFields: ['metadata.noticeType', 'metadata.pricingClinTable', 'sections.B']
  });
}

function pickSubmissionRequirements(record) {
  const def = AREA_DEFINITIONS[8];
  const sL = (record.sections || {}).L;
  const sLText = sL && sL.found ? flatten(sL.text) : '';
  const aliasText = flatten(record.instructionsToOfferors);
  const content = sLText || aliasText;
  if (!content) {
    return makeArea(def, '', 'not_found', { note: 'Section L / Instructions to Offerors was not detected. Check for FAR 52.212-1 addendum.' });
  }
  return makeArea(def, content.split('\n').slice(0, 16).join('\n'), 'extracted', {
    sourceFields: ['sections.L', 'instructionsToOfferors']
  });
}

function pickEvaluationMethod(record) {
  const def = AREA_DEFINITIONS[9];
  const sM = (record.sections || {}).M;
  const sMText = sM && sM.found ? flatten(sM.text) : '';
  const aliasText = flatten(record.evaluationCriteria);
  const content = sMText || aliasText;
  if (!content) {
    return makeArea(def, '', 'not_found', { note: 'Section M / Evaluation Factors was not detected. Check for FAR 52.212-2 addendum.' });
  }
  return makeArea(def, content.split('\n').slice(0, 16).join('\n'), 'extracted', {
    sourceFields: ['sections.M', 'evaluationCriteria']
  });
}

function pickMandatoryCompliance(record) {
  const def = AREA_DEFINITIONS[10];
  const matrix = Array.isArray(record.complianceMatrix) ? record.complianceMatrix : [];
  const risks  = (record.metadata || {}).complianceRisks || [];
  const lines = [];
  matrix.slice(0, 12).forEach(row => {
    if (row && row.text) lines.push(`- ${row.text}`);
    else if (typeof row === 'string') lines.push(`- ${row}`);
  });
  risks.slice(0, 6).forEach(r => { if (r && !lines.includes(`- ${r}`)) lines.push(`- ${flatten(r)}`); });
  if (!lines.length) {
    return makeArea(def, '', 'not_found', { note: 'Compliance matrix is empty for this package.' });
  }
  return makeArea(def, lines.join('\n'), 'extracted', {
    sourceFields: ['complianceMatrix', 'metadata.complianceRisks']
  });
}

function pickMajorClauses(record) {
  const def = AREA_DEFINITIONS[11];
  const sI = (record.sections || {}).I;
  const text = sI && sI.found ? flatten(sI.text) : '';
  if (!text) {
    return makeArea(def, '', 'not_found', { note: 'Section I / Contract Clauses block was not detected. Clauses may be incorporated by reference.' });
  }
  return makeArea(def, text.split('\n').slice(0, 16).join('\n'), 'extracted', {
    sourceFields: ['sections.I']
  });
}

function pickAttachments(record) {
  const def = AREA_DEFINITIONS[12];
  const forms = (record.requiredFormsAttachments || []).map(flatten).filter(Boolean);
  const idx = (record.metadata && record.metadata.attachmentsIndex) || [];
  const rows = [];
  forms.slice(0, 12).forEach(f => rows.push(`- ${f}`));
  idx.forEach(a => {
    if (!a || !a.fileName) return;
    const status = a.extractionStatus ? ` (${a.extractionStatus})` : '';
    const line = `- ${a.fileName}${status}`;
    if (!rows.includes(line)) rows.push(line);
  });
  if (!rows.length) {
    return makeArea(def, '', 'not_found', { note: 'No attachments were detected in this package.' });
  }
  return makeArea(def, rows.join('\n'), 'extracted', {
    sourceFields: ['requiredFormsAttachments', 'metadata.attachmentsIndex']
  });
}

function pickRisksAmbiguities(record) {
  const def = AREA_DEFINITIONS[13];
  const risks = (record.risksDealKillers || []).map(flatten).filter(Boolean);
  const ambiguities = (record.metadata && record.metadata.ambiguityFlags) || [];
  const lines = [];
  risks.slice(0, 8).forEach(r => lines.push(`- ${r}`));
  ambiguities.slice(0, 6).forEach(a => lines.push(`- Ambiguity: ${flatten(a)}`));
  if (!lines.length) {
    return makeArea(def, '', 'not_found', { note: 'No automated risks or ambiguities detected. Operator should still validate the source documents.' });
  }
  return makeArea(def, lines.join('\n'), 'extracted', {
    sourceFields: ['risksDealKillers', 'metadata.ambiguityFlags']
  });
}

function pickRecommendedQuestions(record) {
  const def = AREA_DEFINITIONS[14];
  // Deterministic question prompts derived from what the extractor MISSED.
  // We do NOT invent technical questions about the work — those need an
  // AI provider behind the credential boundary, which is intentionally
  // out of scope for the deterministic summarize action.
  const metadata = record.metadata || {};
  const sections = record.sections || {};
  const questions = [];
  if (!flatten(metadata.qaDeadline))        questions.push('When is the Q&A deadline? The extracted package does not state one.');
  if (!flatten(metadata.siteVisit))         questions.push('Is a site visit available, and if so, when?');
  if (!flatten(metadata.periodOfPerformance)) questions.push('What is the base period of performance and how many option periods are anticipated?');
  if (!sections.B || !sections.B.found)     questions.push('Is a pricing table (CLIN structure) or Attachment 1 / pricing sheet available?');
  if (!sections.M || !sections.M.found)     questions.push('Confirm evaluation factors and relative importance (FAR 15.304 / FAR 52.212-2 addendum).');
  if (!(record.complianceMatrix || []).length) questions.push('Confirm that all submission requirements have been captured for the compliance matrix.');
  if (!questions.length) {
    return makeArea(def, '', 'not_applicable', { note: 'No clarification questions were auto-generated — the extracted package appears complete.' });
  }
  return makeArea(def, questions.map(q => `- ${q}`).join('\n'), 'extracted', {
    sourceFields: ['metadata.qaDeadline', 'metadata.siteVisit', 'metadata.periodOfPerformance', 'sections.B', 'sections.M', 'complianceMatrix'],
    note: 'System-generated analysis based on gaps in the extracted package; verify against the source documents.'
  });
}

function pickBidNoBid(record) {
  const def = AREA_DEFINITIONS[15];
  const metadata = record.metadata || {};
  const considerations = [];
  const setAside = flatten(metadata.setAside);
  if (setAside) considerations.push(`- Eligibility match: solicitation is set aside as ${setAside}. Confirm the operating profile holds the corresponding certification.`);
  const naics = flatten(metadata.naics);
  if (naics)    considerations.push(`- NAICS / size standard fit: the package cites NAICS ${naics}. Confirm the operating profile is registered as eligible under SBA size standards.`);
  const due = flatten(metadata.responseDeadline);
  if (due)      considerations.push(`- Response timeline: response is due ${due}. Confirm capture / proposal capacity before commit.`);
  const risks = (record.risksDealKillers || []).length;
  if (risks)    considerations.push(`- Risk surface: ${risks} risks / deal-killer signal(s) were detected. Review before commit.`);
  if (!considerations.length) {
    return makeArea(def, '', 'not_found', { note: 'No deterministic bid/no-bid signals — eligibility, NAICS, deadline, and risks were not extracted.' });
  }
  return makeArea(def, considerations.join('\n'), 'extracted', {
    sourceFields: ['metadata.setAside', 'metadata.naics', 'metadata.responseDeadline', 'risksDealKillers'],
    note: 'System-generated analysis; not a substitute for an operator bid/no-bid decision.'
  });
}

function pickImmediateActions(record) {
  const def = AREA_DEFINITIONS[16];
  const metadata = record.metadata || {};
  const actions = [];
  const due = flatten(metadata.responseDeadline);
  if (due)                       actions.push(`- Calendar the response deadline: ${due}.`);
  if (flatten(metadata.qaDeadline)) actions.push(`- Calendar the questions deadline: ${flatten(metadata.qaDeadline)}.`);
  if (flatten(metadata.siteVisit))  actions.push(`- Schedule attendance at the site visit: ${flatten(metadata.siteVisit)}.`);
  const attachments = (record.requiredFormsAttachments || []).length;
  if (attachments) actions.push(`- Download and verify ${attachments} required form(s) / attachment(s) before proposal kickoff.`);
  const sM = (record.sections || {}).M;
  if (!sM || !sM.found) actions.push('- Locate Section M / FAR 52.212-2 addendum to confirm evaluation factors before pricing.');
  const sL = (record.sections || {}).L;
  if (!sL || !sL.found) actions.push('- Locate Section L / FAR 52.212-1 addendum to confirm submission instructions.');
  if (!actions.length) {
    return makeArea(def, '', 'not_found', { note: 'No immediate actions inferred from the extracted package.' });
  }
  return makeArea(def, actions.join('\n'), 'extracted', {
    sourceFields: ['metadata.responseDeadline', 'metadata.qaDeadline', 'metadata.siteVisit', 'requiredFormsAttachments', 'sections.L', 'sections.M'],
    note: 'System-generated checklist; operator should add capture / proposal tasks to the workspace.'
  });
}

function summarizeSolicitation(input) {
  input = input || {};
  // When called as summarizeSolicitation({ extraction: <record> }), use the
  // record verbatim. When called as summarizeSolicitation(<record>), accept
  // the input itself as the record. But: an explicitly-supplied null
  // extraction is a refusal signal, not "missing key" — honor it.
  const hasExplicitExtraction = Object.prototype.hasOwnProperty.call(input, 'extraction');
  const record = hasExplicitExtraction ? input.extraction : input;
  if (!record || typeof record !== 'object' || !Object.keys(record).length || (hasExplicitExtraction && record === null)) {
    return Object.freeze({
      ok: false,
      reason: 'no_extraction',
      schemaVersion: SCHEMA_VERSION,
      areas: []
    });
  }
  const areas = [
    pickWhatsBeingBought(record),
    pickWhoIsBuying(record),
    pickKeyDates(record),
    pickEligibilitySetAside(record),
    pickScope(record),
    pickPlaceOfPerformance(record),
    pickPeriodOfPerformance(record),
    pickContractPricingStructure(record),
    pickSubmissionRequirements(record),
    pickEvaluationMethod(record),
    pickMandatoryCompliance(record),
    pickMajorClauses(record),
    pickAttachments(record),
    pickRisksAmbiguities(record),
    pickRecommendedQuestions(record),
    pickBidNoBid(record),
    pickImmediateActions(record)
  ];
  const populated = areas.filter(a => a.status === 'extracted').length;
  return Object.freeze({
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    opportunityId: input.opportunityId || (record.import && record.import.opportunityId) || '',
    populatedAreas: populated,
    totalAreas:     areas.length,
    sourceFiles:    uniqueFiles(record),
    facts:          'Facts come from the persisted extraction record. System-generated analysis is labelled in the note field of each area.',
    areas:          areas
  });
}

// Per-section "Explain This Section" — deterministic plain-English
// breakdown of a single section letter or alias key. Reads the same
// persisted record. No LLM call.
function explainSection(input) {
  input = input || {};
  const record = input.extraction || input;
  const sectionKey = String(input.section || input.key || '').trim().toUpperCase();
  if (!record || !sectionKey) {
    return Object.freeze({ ok: false, reason: 'no_section', schemaVersion: SCHEMA_VERSION });
  }
  const sections = record.sections || {};
  // Letter-based explain (A–M).
  if (sections[sectionKey] && sections[sectionKey].found) {
    const s = sections[sectionKey];
    return Object.freeze({
      ok:            true,
      schemaVersion: SCHEMA_VERSION,
      section:       sectionKey,
      title:         s.title || '',
      explanation:   s.plainEnglishSummary || `This section contains the following extracted content:\n\n${flatten(s.text)}`,
      sourceFile:    s.sourceFile || '',
      confidence:    s.confidence || 'fallback',
      note:          'Plain-English explanation derived from the persisted extraction record. Verify against the source document before relying on it.'
    });
  }
  // Alias-key explain.
  const aliasMap = {
    INSTRUCTIONS: 'instructionsToOfferors',
    EVALUATION:   'evaluationCriteria',
    PWS:          'pwsSowRequirements',
    SCOPE:        'pwsSowRequirements',
    FORMS:        'requiredFormsAttachments',
    DEADLINES:    'deadlines',
    RISKS:        'risksDealKillers',
    MATRIX:       'complianceMatrix'
  };
  const aliasField = aliasMap[sectionKey];
  if (aliasField && record[aliasField]) {
    return Object.freeze({
      ok:            true,
      schemaVersion: SCHEMA_VERSION,
      section:       sectionKey,
      title:         aliasField,
      explanation:   flatten(record[aliasField]),
      confidence:    'alias',
      note:          'Plain-English explanation derived from the persisted alias field. Verify against the source document before relying on it.'
    });
  }
  // Not present — be honest.
  if (sections[sectionKey]) {
    return Object.freeze({
      ok:            true,
      schemaVersion: SCHEMA_VERSION,
      section:       sectionKey,
      title:         sections[sectionKey].title || '',
      explanation:   '',
      status:        'not_found',
      note:          `Section ${sectionKey} was not detected in the extracted package. There is nothing to explain. Check the source document.`
    });
  }
  return Object.freeze({
    ok:     false,
    reason: 'unknown_section',
    schemaVersion: SCHEMA_VERSION,
    section: sectionKey
  });
}

module.exports = {
  summarizeSolicitation,
  explainSection,
  AREA_DEFINITIONS,
  SCHEMA_VERSION
};
