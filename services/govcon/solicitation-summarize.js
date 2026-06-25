'use strict';

// Phase 25AS — authoritative, structured solicitation summary + section explain.
// This module is deterministic. It never calls an LLM and never mutates the
// extraction record supplied by the trusted app-API boundary.

const SCHEMA_VERSION = 2;
const STATUS = Object.freeze({
  EXTRACTED: 'extracted',
  NOT_FOUND: 'not_found',
  NOT_APPLICABLE: 'not_applicable',
  LOW_CONFIDENCE: 'low_confidence',
  EXTRACTION_FAILED: 'extraction_failed',
  PENDING_PROCESSING: 'pending_processing',
  CONFLICTING_INFORMATION: 'conflicting_information'
});

const AREA_DEFINITIONS = [
  { key: 'whats-being-bought', title: 'What the government is buying' },
  { key: 'who-is-buying', title: 'Who is buying it' },
  { key: 'key-dates', title: 'Key dates' },
  { key: 'eligibility-set-aside', title: 'Eligibility and set-aside' },
  { key: 'scope', title: 'Scope' },
  { key: 'place-of-performance', title: 'Place of performance' },
  { key: 'period-of-performance', title: 'Period of performance' },
  { key: 'contract-pricing-structure', title: 'Contract and pricing structure' },
  { key: 'submission-requirements', title: 'Submission requirements' },
  { key: 'evaluation-method', title: 'Evaluation method' },
  { key: 'mandatory-compliance', title: 'Mandatory compliance requirements' },
  { key: 'major-clauses', title: 'Major clauses' },
  { key: 'attachments', title: 'Attachments' },
  { key: 'risks-ambiguities', title: 'Risks and ambiguities' },
  { key: 'recommended-questions', title: 'Recommended bidder questions' },
  { key: 'bid-no-bid', title: 'Bid / no-bid considerations' },
  { key: 'immediate-actions', title: 'Immediate action checklist' }
];

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function firstNonEmpty() {
  for (const value of arguments) {
    const s = clean(value);
    if (s) return s;
  }
  return '';
}

function serializeContact(value) {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  const name = firstNonEmpty(value.name, value.fullName, value.contactName);
  const title = firstNonEmpty(value.title, value.role);
  const email = firstNonEmpty(value.email, value.emailAddress);
  const phone = firstNonEmpty(value.phone, value.phoneNumber, value.telephone);
  return [name, title, email, phone].filter(Boolean).join(' · ');
}

function serializePricingRow(value) {
  if (typeof value === 'string') return clean(value);
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(' | ');
  if (!value || typeof value !== 'object') return '';
  const clin = firstNonEmpty(value.clin, value.CLIN, value.lineItem, value.itemNumber);
  const desc = firstNonEmpty(value.description, value.itemDescription, value.scope, value.text);
  const qty = firstNonEmpty(value.quantity, value.qty);
  const unit = firstNonEmpty(value.unit, value.uom, value.unitOfMeasure);
  const price = firstNonEmpty(value.unitPrice, value.price, value.amount, value.total);
  const parts = [];
  if (clin) parts.push(`CLIN ${clin}`);
  if (desc) parts.push(desc);
  if (qty) parts.push(`Qty ${qty}`);
  if (unit) parts.push(unit);
  if (price) parts.push(`Price ${price}`);
  return parts.join(' · ');
}

function serializeComplianceRow(value) {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  const requirement = firstNonEmpty(
    value.requirementText,
    value.requirement,
    value.text,
    value.description,
    value.clause,
    value.item
  );
  if (!requirement) return '';
  const section = firstNonEmpty(value.section, value.sectionLetter, value.sourceSection);
  const mandatory = value.mandatory === true || /required|shall|must/i.test(requirement);
  const prefix = [section ? `Section ${section}` : '', mandatory ? 'Mandatory' : ''].filter(Boolean).join(' · ');
  return prefix ? `${prefix}: ${requirement}` : requirement;
}

function serializeAttachment(value) {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  const name = firstNonEmpty(value.fileName, value.originalFileName, value.name, value.title, value.text, value.label);
  const status = firstNonEmpty(value.extractionStatus, value.status);
  return name ? `${name}${status ? ` (${status})` : ''}` : '';
}

function serializeDeadline(value) {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  const label = firstNonEmpty(value.label, value.eventType, value.type, value.name);
  const date = firstNonEmpty(value.date, value.deadline, value.dueDate, value.value, value.text);
  return label && date ? `${label}: ${date}` : (date || label);
}

function serializeGeneric(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return clean(value);
  if (Array.isArray(value)) return value.map(serializeGeneric).filter(Boolean).join('\n');
  return firstNonEmpty(
    value.text,
    value.value,
    value.requirementText,
    value.requirement,
    value.description,
    value.title,
    value.name,
    value.fileName
  );
}

function serializeList(values, serializer, limit) {
  const input = Array.isArray(values) ? values : (values == null ? [] : [values]);
  const out = [];
  const seen = new Set();
  for (const item of input) {
    const text = clean((serializer || serializeGeneric)(item));
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (limit && out.length >= limit) break;
  }
  return out;
}

function collectSourceReferences(value, refs, visited) {
  if (value == null) return refs || new Map();
  refs = refs || new Map();
  visited = visited || new Set();
  if (typeof value !== 'object') return refs;
  if (visited.has(value)) return refs;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach(v => collectSourceReferences(v, refs, visited));
    return refs;
  }
  const sourceFile = firstNonEmpty(value.sourceFile, value.sourceDocument, value.fileName, value.originalFileName, value.safeStoredFileName);
  const sourceLocation = firstNonEmpty(value.sourceLocation, value.page, value.pageNumber, value.sectionHeading, value.location);
  const sourceDocumentId = firstNonEmpty(value.sourceDocumentId, value.internalStorageId);
  if (sourceFile || sourceDocumentId) {
    refs.set([sourceDocumentId, sourceFile, sourceLocation].join('|'), { sourceDocumentId, sourceFile, sourceLocation });
  }
  Object.values(value).forEach(v => collectSourceReferences(v, refs, visited));
  return refs;
}

function referencesFor() {
  const refs = new Map();
  for (const value of arguments) collectSourceReferences(value, refs);
  return Array.from(refs.values());
}

function makeArea(def, content, status, opts) {
  opts = opts || {};
  const refs = Array.isArray(opts.sourceReferences) ? opts.sourceReferences : [];
  return {
    key: def.key,
    title: def.title,
    content: clean(content),
    status: status || (clean(content) ? STATUS.EXTRACTED : STATUS.NOT_FOUND),
    note: clean(opts.note),
    sourceFields: Array.isArray(opts.sourceFields) ? opts.sourceFields.slice() : [],
    sourceFiles: Array.from(new Set(refs.map(r => r.sourceFile).filter(Boolean))),
    sourceReferences: refs
  };
}

function extractionProcessingStatus(record) {
  const inventory = Array.isArray(record && record.documentInventory) ? record.documentInventory : [];
  const importInfo = record && record.import || {};
  if (/pending/i.test(firstNonEmpty(importInfo.batchStatus, importInfo.status))) return STATUS.PENDING_PROCESSING;
  if (!inventory.length) return STATUS.EXTRACTED;
  const statuses = inventory.map(d => firstNonEmpty(d.extractionStatus, d.status).toLowerCase());
  if (statuses.some(s => /pending|processing/.test(s))) return STATUS.PENDING_PROCESSING;
  if (statuses.every(s => /failed|ocr_required|required_unavailable|unsupported|rejected|metadata-only/.test(s))) return STATUS.EXTRACTION_FAILED;
  if (statuses.some(s => /failed|ocr_required|required_unavailable|warning|partial|metadata-only/.test(s))) return STATUS.LOW_CONFIDENCE;
  return STATUS.EXTRACTED;
}

function validateBinding(record, opportunityId) {
  const requested = clean(opportunityId);
  if (!requested) return { ok: true, boundOpportunityId: '' };
  const bound = firstNonEmpty(record && record.import && record.import.opportunityId, record && record.opportunityId);
  if (!bound) return { ok: false, reason: 'unbound_extraction', requestedOpportunityId: requested };
  if (bound !== requested) return { ok: false, reason: 'opportunity_mismatch', requestedOpportunityId: requested, boundOpportunityId: bound };
  return { ok: true, boundOpportunityId: bound };
}

function sectionText(record, letter) {
  const section = record && record.sections && record.sections[letter];
  return section && section.found ? clean(section.text) : '';
}

function aliasText(record, field, serializer, limit) {
  return serializeList(record && record[field], serializer || serializeGeneric, limit).join('\n');
}

function buildAreas(record) {
  const md = record.metadata || {};
  const sections = record.sections || {};
  const scope = aliasText(record, 'pwsSowRequirements', serializeGeneric, 20) || sectionText(record, 'C');
  const instructions = sectionText(record, 'L') || aliasText(record, 'instructionsToOfferors', serializeGeneric, 24);
  const evaluation = sectionText(record, 'M') || aliasText(record, 'evaluationCriteria', serializeGeneric, 24);
  const deadlines = serializeList(record.deadlines, serializeDeadline, 20);
  const contacts = serializeList(md.pointOfContact, serializeContact, 12);
  const pricing = serializeList(md.pricingClinTable, serializePricingRow, 20);
  const compliance = serializeList(record.complianceMatrix, serializeComplianceRow, 24);
  const attachments = serializeList(record.requiredFormsAttachments, serializeAttachment, 30)
    .concat(serializeList(md.attachmentsIndex, serializeAttachment, 30));
  const risks = serializeList(record.risksDealKillers, serializeGeneric, 16)
    .concat(serializeList(md.ambiguityFlags, serializeGeneric, 12));
  const clauseRows = compliance.filter(x => /\b(?:FAR|DFARS|AFFARS|VAAR|DEAR)\b|\b52\.\d{3}-\d+\b|\b252\.\d{3}-\d+\b/i.test(x));
  const processing = extractionProcessingStatus(record);
  const processingNote = processing === STATUS.EXTRACTED ? '' : `Document processing status: ${processing}. Review document inventory and warnings before relying on extracted facts.`;

  const whatParts = [clean(md.title), scope].filter(Boolean);
  const whoParts = [clean(md.agency), clean(md.subAgency) && `Sub-agency: ${clean(md.subAgency)}`, clean(md.office) && `Office: ${clean(md.office)}`].filter(Boolean);
  if (contacts.length) whoParts.push(`Contacts:\n- ${contacts.join('\n- ')}`);
  const dateRows = [];
  if (clean(md.postedDate)) dateRows.push(`Posted / issued: ${clean(md.postedDate)}`);
  if (clean(md.qaDeadline)) dateRows.push(`Questions due: ${clean(md.qaDeadline)}`);
  if (clean(md.siteVisit)) dateRows.push(`Site visit: ${clean(md.siteVisit)}`);
  if (clean(md.responseDeadline)) dateRows.push(`Response due: ${clean(md.responseDeadline)}`);
  deadlines.forEach(d => { if (!dateRows.some(row => row.includes(d))) dateRows.push(d); });
  const eligibility = [];
  if (clean(md.setAside)) eligibility.push(`Set-aside: ${clean(md.setAside)}`);
  if (clean(md.naics)) eligibility.push(`NAICS: ${clean(md.naics)}`);
  if (clean(md.classificationCode)) eligibility.push(`PSC: ${clean(md.classificationCode)}`);
  const contract = [];
  if (clean(md.noticeType)) contract.push(`Notice type: ${clean(md.noticeType)}`);
  if (sectionText(record, 'B')) contract.push(sectionText(record, 'B'));
  if (pricing.length) contract.push(`Pricing / CLINs:\n- ${pricing.join('\n- ')}`);

  const questions = [];
  if (!clean(md.qaDeadline)) questions.push('Confirm the deadline for bidder questions.');
  if (!clean(md.siteVisit)) questions.push('Confirm whether a site visit is offered or required.');
  if (!clean(md.periodOfPerformance)) questions.push('Confirm the base period, option periods, and transition dates.');
  if (!pricing.length && !sectionText(record, 'B')) questions.push('Confirm the required pricing format and CLIN schedule.');
  if (!evaluation) questions.push('Confirm the evaluation factors and their relative importance.');
  if (!instructions) questions.push('Confirm submission method, format, page limits, and required volumes.');

  const bidNoBid = [];
  if (clean(md.setAside)) bidNoBid.push(`Eligibility: verify the bidder qualifies for ${clean(md.setAside)}.`);
  if (clean(md.naics)) bidNoBid.push(`Size standard: verify eligibility under NAICS ${clean(md.naics)}.`);
  if (clean(md.responseDeadline)) bidNoBid.push(`Capacity: confirm the team can submit by ${clean(md.responseDeadline)}.`);
  if (risks.length) bidNoBid.push(`Risk review: ${risks.length} risk or ambiguity signal(s) require operator review.`);
  if (processing !== STATUS.EXTRACTED) bidNoBid.push(`Extraction reliability: processing is ${processing}; do not make a final bid decision until source documents are reviewed.`);

  const actions = [];
  if (clean(md.responseDeadline)) actions.push(`Calendar the response deadline: ${clean(md.responseDeadline)}.`);
  if (clean(md.qaDeadline)) actions.push(`Calendar the questions deadline: ${clean(md.qaDeadline)}.`);
  if (clean(md.siteVisit)) actions.push(`Calendar the site visit: ${clean(md.siteVisit)}.`);
  if (attachments.length) actions.push(`Verify all ${attachments.length} detected forms and attachments.`);
  if (!instructions) actions.push('Locate and verify Section L or FAR 52.212-1 addendum.');
  if (!evaluation) actions.push('Locate and verify Section M or FAR 52.212-2 addendum.');
  if (processing !== STATUS.EXTRACTED) actions.push('Resolve failed, partial, or OCR-required document processing before proposal kickoff.');

  return [
    makeArea(AREA_DEFINITIONS[0], whatParts.join('\n\n'), whatParts.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.title', 'pwsSowRequirements', 'sections.C'], sourceReferences: referencesFor(record.pwsSowRequirements, sections.C), note: processingNote }),
    makeArea(AREA_DEFINITIONS[1], whoParts.join('\n'), whoParts.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.agency', 'metadata.subAgency', 'metadata.office', 'metadata.pointOfContact'], sourceReferences: referencesFor(md.pointOfContact) }),
    makeArea(AREA_DEFINITIONS[2], dateRows.join('\n'), dateRows.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.postedDate', 'metadata.qaDeadline', 'metadata.siteVisit', 'metadata.responseDeadline', 'deadlines'], sourceReferences: referencesFor(record.deadlines) }),
    makeArea(AREA_DEFINITIONS[3], eligibility.join('\n'), eligibility.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.setAside', 'metadata.naics', 'metadata.classificationCode'] }),
    makeArea(AREA_DEFINITIONS[4], scope, scope ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['pwsSowRequirements', 'sections.C'], sourceReferences: referencesFor(record.pwsSowRequirements, sections.C), note: processingNote }),
    makeArea(AREA_DEFINITIONS[5], clean(md.placeOfPerformance), clean(md.placeOfPerformance) ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.placeOfPerformance'] }),
    makeArea(AREA_DEFINITIONS[6], clean(md.periodOfPerformance), clean(md.periodOfPerformance) ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.periodOfPerformance', 'sections.F'], sourceReferences: referencesFor(sections.F) }),
    makeArea(AREA_DEFINITIONS[7], contract.join('\n\n'), contract.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.noticeType', 'metadata.pricingClinTable', 'sections.B'], sourceReferences: referencesFor(md.pricingClinTable, sections.B), note: processingNote }),
    makeArea(AREA_DEFINITIONS[8], instructions, instructions ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['sections.L', 'instructionsToOfferors'], sourceReferences: referencesFor(sections.L, record.instructionsToOfferors), note: processingNote }),
    makeArea(AREA_DEFINITIONS[9], evaluation, evaluation ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['sections.M', 'evaluationCriteria'], sourceReferences: referencesFor(sections.M, record.evaluationCriteria), note: processingNote }),
    makeArea(AREA_DEFINITIONS[10], compliance.length ? `- ${compliance.join('\n- ')}` : '', compliance.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['complianceMatrix', 'metadata.complianceRisks'], sourceReferences: referencesFor(record.complianceMatrix, md.complianceRisks), note: processingNote }),
    makeArea(AREA_DEFINITIONS[11], sectionText(record, 'I') || clauseRows.join('\n'), (sectionText(record, 'I') || clauseRows.length) ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['sections.I', 'complianceMatrix'], sourceReferences: referencesFor(sections.I, record.complianceMatrix) }),
    makeArea(AREA_DEFINITIONS[12], attachments.length ? `- ${Array.from(new Set(attachments)).join('\n- ')}` : '', attachments.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['requiredFormsAttachments', 'metadata.attachmentsIndex', 'documentInventory'], sourceReferences: referencesFor(record.requiredFormsAttachments, md.attachmentsIndex, record.documentInventory), note: processingNote }),
    makeArea(AREA_DEFINITIONS[13], risks.length ? `- ${Array.from(new Set(risks)).join('\n- ')}` : '', risks.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['risksDealKillers', 'metadata.ambiguityFlags', 'warnings'], sourceReferences: referencesFor(record.risksDealKillers, md.ambiguityFlags), note: processingNote }),
    makeArea(AREA_DEFINITIONS[14], questions.length ? `- ${questions.join('\n- ')}` : '', questions.length ? STATUS.EXTRACTED : STATUS.NOT_APPLICABLE, { sourceFields: ['metadata.qaDeadline', 'metadata.siteVisit', 'metadata.periodOfPerformance', 'sections.B', 'sections.L', 'sections.M'], note: 'System-generated analysis based only on missing or incomplete extracted fields. Verify against the source documents.' }),
    makeArea(AREA_DEFINITIONS[15], bidNoBid.length ? `- ${bidNoBid.join('\n- ')}` : '', bidNoBid.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.setAside', 'metadata.naics', 'metadata.responseDeadline', 'risksDealKillers', 'documentInventory'], note: 'System-generated analysis; not a substitute for an operator bid/no-bid decision.' }),
    makeArea(AREA_DEFINITIONS[16], actions.length ? `- ${actions.join('\n- ')}` : '', actions.length ? STATUS.EXTRACTED : STATUS.NOT_FOUND, { sourceFields: ['metadata.responseDeadline', 'metadata.qaDeadline', 'metadata.siteVisit', 'requiredFormsAttachments', 'sections.L', 'sections.M', 'documentInventory'], note: 'System-generated checklist. Verify and assign actions before execution.' })
  ];
}

function summarizeSolicitation(input) {
  input = input || {};
  const hasExplicitExtraction = Object.prototype.hasOwnProperty.call(input, 'extraction');
  const record = hasExplicitExtraction ? input.extraction : input;
  if (!record || typeof record !== 'object' || !Object.keys(record).length) {
    return Object.freeze({ ok: false, reason: 'no_extraction', schemaVersion: SCHEMA_VERSION, areas: [] });
  }
  const binding = validateBinding(record, input.opportunityId);
  if (!binding.ok) return Object.freeze(Object.assign({ ok: false, schemaVersion: SCHEMA_VERSION, areas: [] }, binding));
  const areas = buildAreas(record);
  const refs = referencesFor(record.metadata, record.sections, record.instructionsToOfferors, record.evaluationCriteria, record.pwsSowRequirements, record.requiredFormsAttachments, record.deadlines, record.risksDealKillers, record.complianceMatrix, record.documentInventory);
  return Object.freeze({
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    opportunityId: clean(input.opportunityId) || binding.boundOpportunityId || clean(record.import && record.import.opportunityId),
    processingStatus: extractionProcessingStatus(record),
    populatedAreas: areas.filter(a => a.status === STATUS.EXTRACTED).length,
    totalAreas: areas.length,
    sourceFiles: Array.from(new Set(refs.map(r => r.sourceFile).filter(Boolean))),
    sourceReferences: refs,
    facts: 'Facts come from the supplied normalized extraction record. System-generated analysis is labelled in each area note.',
    areas
  });
}

function explainSection(input) {
  input = input || {};
  const record = Object.prototype.hasOwnProperty.call(input, 'extraction') ? input.extraction : input;
  const key = clean(input.section || input.key).toUpperCase();
  if (!record || typeof record !== 'object' || !key) return Object.freeze({ ok: false, reason: 'no_section', schemaVersion: SCHEMA_VERSION });
  const binding = validateBinding(record, input.opportunityId);
  if (!binding.ok) return Object.freeze(Object.assign({ ok: false, schemaVersion: SCHEMA_VERSION, section: key }, binding));
  const sections = record.sections || {};
  if (sections[key] && sections[key].found && clean(sections[key].text)) {
    const s = sections[key];
    return Object.freeze({
      ok: true,
      schemaVersion: SCHEMA_VERSION,
      section: key,
      title: clean(s.title) || `Section ${key}`,
      explanation: clean(s.text),
      status: STATUS.EXTRACTED,
      sourceFile: clean(s.sourceFile),
      sourceLocation: clean(s.sourceLocation),
      sourceReferences: referencesFor(s),
      confidence: clean(s.confidence) || 'review_required',
      note: 'This is a plain-language display of extracted section content. The original section remains visible for source verification.'
    });
  }
  const aliasMap = {
    INSTRUCTIONS: ['instructionsToOfferors', serializeGeneric],
    EVALUATION: ['evaluationCriteria', serializeGeneric],
    PWS: ['pwsSowRequirements', serializeGeneric],
    SCOPE: ['pwsSowRequirements', serializeGeneric],
    FORMS: ['requiredFormsAttachments', serializeAttachment],
    DEADLINES: ['deadlines', serializeDeadline],
    RISKS: ['risksDealKillers', serializeGeneric],
    MATRIX: ['complianceMatrix', serializeComplianceRow]
  };
  const pair = aliasMap[key];
  if (pair) {
    const explanation = aliasText(record, pair[0], pair[1], 50);
    if (explanation) {
      return Object.freeze({
        ok: true,
        schemaVersion: SCHEMA_VERSION,
        section: key,
        title: pair[0],
        explanation,
        status: STATUS.EXTRACTED,
        sourceReferences: referencesFor(record[pair[0]]),
        confidence: 'review_required',
        note: 'Explanation derived from the normalized extraction field. The original extracted content remains visible.'
      });
    }
    return Object.freeze({ ok: true, schemaVersion: SCHEMA_VERSION, section: key, title: pair[0], explanation: '', status: STATUS.NOT_FOUND, note: `${key} content was not detected in the extracted package.` });
  }
  if (sections[key]) {
    return Object.freeze({ ok: true, schemaVersion: SCHEMA_VERSION, section: key, title: clean(sections[key].title), explanation: '', status: STATUS.NOT_FOUND, note: `Section ${key} was not detected in the extracted package.` });
  }
  return Object.freeze({ ok: false, reason: 'unknown_section', schemaVersion: SCHEMA_VERSION, section: key });
}

module.exports = {
  summarizeSolicitation,
  explainSection,
  AREA_DEFINITIONS,
  SCHEMA_VERSION,
  STATUS,
  _validateBinding: validateBinding,
  _serializeContact: serializeContact,
  _serializePricingRow: serializePricingRow,
  _serializeComplianceRow: serializeComplianceRow,
  _serializeAttachment: serializeAttachment,
  _extractionProcessingStatus: extractionProcessingStatus
};