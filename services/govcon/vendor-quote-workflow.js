'use strict';

const crypto = require('crypto');

const COVERAGE = Object.freeze(['covered by prime', 'vendor required', 'partially covered', 'multiple vendors required', 'unresolved', 'not applicable']);
const CONTACT_STATUS = Object.freeze(['verified', 'likely', 'generic company contact', 'unverified', 'unavailable']);
const OUTREACH_STATUS = Object.freeze(['not drafted', 'draft ready', 'needs review', 'approved', 'scheduled', 'sent', 'delivery failed', 'responded', 'declined', 'follow-up due', 'quote requested', 'quote received']);

function clean(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 1000); }
function list(v) { return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean); }
function evidence(row, field) { return row && row.evidence && row.evidence[field] || null; }

function analyzeSubcontractingNeeds(input) {
  input = input || {};
  const matrix = list(input.complianceMatrix);
  const profileText = JSON.stringify(input.companyProfile || {}).toLowerCase();
  const rows = matrix.map((r, i) => {
    const text = clean(r.normalizedRequirement || r.requirement || r.requirementText || r.exactSourceText, 1200);
    const specialty = /licensed|certif|clearance|bond|insurance|speciali[sz]ed|equipment|vehicle|staff|personnel|mobiliz|local presence|within \d+ miles/i.test(text);
    const primeEvidence = text.split(/[^a-z0-9]+/i).filter(x => x.length > 5).some(k => profileText.includes(k.toLowerCase()));
    const coverageStatus = specialty ? (primeEvidence ? 'partially covered' : 'vendor required') : (primeEvidence ? 'covered by prime' : 'unresolved');
    const required = [];
    if (/license/i.test(text)) required.push('Applicable license');
    if (/certif/i.test(text)) required.push('Required certification');
    if (/clearance/i.test(text)) required.push('Required clearance');
    if (/bond/i.test(text)) required.push('Bonding capacity');
    if (/insurance/i.test(text)) required.push('Insurance / COI');
    return {
      id: clean(r.requirementId || r.id || 'REQ-' + String(i + 1).padStart(3, '0')),
      task: text,
      sourceCitation: clean(r.sourceDocument || r.sourceFile || r.sectionPageFile || r.source),
      exactSourceText: clean(r.exactSourceText || r.requirementText || text),
      requiredSubcontractorType: inferType(text),
      requiredCapability: inferCapabilities(text),
      suggestedNaics: clean(input.naics || input.metadata && input.metadata.naics),
      suggestedPsc: clean(input.psc || input.metadata && input.metadata.classificationCode),
      requiredCertificationsLicenses: required,
      locationRadius: clean(input.placeOfPerformance || input.metadata && input.metadata.placeOfPerformance) + ' / 50 miles',
      evaluationCriterion: clean(r.evaluationCriterion || ''),
      riskLevel: specialty ? 'high' : 'medium',
      evidenceRequired: clean(r.evidenceRequired || r.evidenceNeeded || 'Vendor capability evidence and written quote'),
      recommendedAllocation: coverageStatus === 'covered by prime' ? 'prime' : 'subcontractor',
      coverageStatus,
      assignedVendor: '', backupVendor: '', notes: ''
    };
  });
  return {
    ok: true,
    coverageStatuses: COVERAGE,
    requirements: rows,
    subcontractingPortions: {
      selfPerform: rows.filter(r => r.coverageStatus === 'covered by prime'),
      vendorRequired: rows.filter(r => r.coverageStatus === 'vendor required'),
      flexible: rows.filter(r => r.coverageStatus === 'partially covered'),
      unresolved: rows.filter(r => r.coverageStatus === 'unresolved')
    },
    vettingChecklist: buildVettingChecklist(rows)
  };
}

function inferType(t) {
  if (/hvac|plumb|electric|mechanical|construction/i.test(t)) return 'licensed trade contractor';
  if (/cyber|software|network|help.?desk|information technology/i.test(t)) return 'IT / cybersecurity services firm';
  if (/janitor|custod|clean/i.test(t)) return 'facilities services contractor';
  if (/staff|personnel|labor/i.test(t)) return 'staffing / workforce provider';
  return 'scope-qualified service subcontractor';
}
function inferCapabilities(t) {
  return clean(t.replace(/^(the )?contractor (shall|must|will)\s*/i, ''), 400) || 'Scope-specific delivery capability';
}
function buildVettingChecklist(rows) {
  const text = rows.map(r => r.task).join(' ');
  const items = ['Legal business name', 'UEI and CAGE when federal registration is required', 'SAM registration status', 'NAICS alignment', 'Relevant past performance and references', 'Geographic coverage', 'Staffing capacity and current workload', 'Mobilization time', 'Quality-control process', 'Quote validity and assumptions', 'Prime flow-down acceptance', 'Debarment/exclusion screening', 'Availability through performance period'];
  if (/license/i.test(text)) items.push('Applicable state/local licenses');
  if (/certif/i.test(text)) items.push('Required certifications');
  if (/insurance/i.test(text)) items.push('Insurance limits and COI');
  if (/bond/i.test(text)) items.push('Bonding capacity');
  if (/clearance/i.test(text)) items.push('Personnel/facility clearance evidence');
  if (/equipment|vehicle|tool/i.test(text)) items.push('Required equipment, vehicles and tools');
  if (/osha|safety/i.test(text)) items.push('Safety program and legally available OSHA history');
  return items;
}

function generateSearchStrategy(input) {
  input = input || {};
  const place = clean(input.placeOfPerformance || input.metadata && input.metadata.placeOfPerformance);
  if (!place) return { ok: false, reason: 'place_of_performance_required', requiresUserConfirmation: true, queries: [] };
  const cap = clean(input.capability || (list(input.requirements)[0] || {}).requiredCapability || 'required service');
  const naics = clean(input.naics || input.metadata && input.metadata.naics);
  const cert = clean(input.certification || 'licensed');
  const queries = [
    `"${cap}" AND "${place}" AND ${cert}`,
    `"${cap}" "${place}" government contractor`,
    `"${cap}" commercial service "${place}"`,
    `${naics ? '"' + naics + '" ' : ''}contractor within 50 miles of "${place}"`,
    `site:sam.gov entity "${cap}" "${place}"`,
    `site:sba.gov "${cap}" "${place}"`,
    `site:bbb.org "${cap}" "${place}"`,
    `site:chamberofcommerce.com "${cap}" "${place}"`,
    `site:linkedin.com/company "${cap}" "${place}"`,
    `"${cert}" AND contractor AND "${place}" -jobs -training`
  ];
  return { ok: true, radiusMiles: 50, queries, prioritizedBy: 'scope criticality and evaluation support' };
}

function compileAndRankVendors(input) {
  input = input || {};
  const tasks = list(input.requirements);
  const seen = new Map();
  for (const raw of list(input.providerResults)) {
    const name = clean(raw.legalBusinessName || raw.name);
    const website = clean(raw.website);
    if (!name || !website || !list(raw.sourceUrls).length) continue;
    const key = website.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    const row = normalizeVendor(raw, tasks);
    if (!seen.has(key)) seen.set(key, row);
    else seen.set(key, mergeVendor(seen.get(key), row));
  }
  const vendors = Array.from(seen.values()).map(scoreVendor).filter(v => v.distanceMiles == null || v.distanceMiles <= 50).sort((a, b) => b.score.total - a.score.total).slice(0, 8);
  return { ok: true, requestedCount: 8, foundCount: vendors.length, vendors, limitation: vendors.length < 8 ? `Only ${vendors.length} source-backed candidates were returned by configured providers; no records were invented.` : '' };
}
function normalizeVendor(v, tasks) {
  const email = clean(v.email);
  const status = CONTACT_STATUS.includes(v.contactStatus) ? v.contactStatus : (email ? 'unverified' : v.phone ? 'generic company contact' : 'unavailable');
  return {
    id: clean(v.id || crypto.createHash('sha256').update(clean(v.website || v.name)).digest('hex').slice(0, 12)),
    legalBusinessName: clean(v.legalBusinessName || v.name), website: clean(v.website), headquarters: clean(v.headquarters), serviceLocation: clean(v.serviceLocation || v.location), distanceMiles: Number.isFinite(Number(v.distanceMiles)) ? Number(v.distanceMiles) : null,
    serviceArea: clean(v.serviceArea), capabilities: list(v.capabilities).map(clean), mappedTaskIds: list(v.mappedTaskIds).length ? list(v.mappedTaskIds) : tasks.filter(t => list(v.capabilities).join(' ').toLowerCase().split(/\s+/).some(k => k.length > 5 && t.task.toLowerCase().includes(k))).map(t => t.id),
    naics: list(v.naics), licenses: list(v.licenses), certifications: list(v.certifications), uei: clean(v.uei), cage: clean(v.cage), yearsInBusiness: v.yearsInBusiness == null ? null : Number(v.yearsInBusiness), pastPerformanceEvidence: list(v.pastPerformanceEvidence),
    contactName: clean(v.contactName), contactTitle: clean(v.contactTitle), email, phone: clean(v.phone), contactSource: clean(v.contactSource), sourceUrls: list(v.sourceUrls), emailVerificationStatus: status, sourceLastChecked: clean(v.sourceLastChecked || new Date().toISOString().slice(0, 10)), confidence: clean(v.confidence || 'unverified'), unresolvedQuestions: list(v.unresolvedQuestions)
  };
}
function mergeVendor(a, b) { return Object.assign({}, a, b, { sourceUrls: Array.from(new Set(a.sourceUrls.concat(b.sourceUrls))), capabilities: Array.from(new Set(a.capabilities.concat(b.capabilities))), mappedTaskIds: Array.from(new Set(a.mappedTaskIds.concat(b.mappedTaskIds))) }); }
function scoreVendor(v) {
  const evidence = {};
  function points(key, value, reason) { evidence[key] = { value, reason }; return value; }
  const total = points('scopeMatch', Math.min(25, v.mappedTaskIds.length * 8), `${v.mappedTaskIds.length} mapped task(s)`) +
    points('geographicMatch', v.distanceMiles == null ? 0 : v.distanceMiles <= 50 ? 15 : 0, v.distanceMiles == null ? 'Distance unverified' : `${v.distanceMiles} miles`) +
    points('licensing', v.licenses.length ? 10 : 0, v.licenses.length ? 'License evidence supplied' : 'No verified license evidence') +
    points('certification', v.certifications.length ? 10 : 0, v.certifications.length ? 'Certification evidence supplied' : 'No verified certification evidence') +
    points('pastPerformance', v.pastPerformanceEvidence.length ? 15 : 0, v.pastPerformanceEvidence.length ? 'Public evidence supplied' : 'Not verified') +
    points('contactability', v.emailVerificationStatus === 'verified' ? 15 : v.email ? 7 : v.phone ? 4 : 0, v.emailVerificationStatus) +
    points('sourceQuality', Math.min(10, v.sourceUrls.length * 3), `${v.sourceUrls.length} source URL(s)`);
  return Object.assign({}, v, { score: { total, evidence }, status: 'candidate', qualificationStatus: 'unverified — confirm before outreach' });
}

function draftVendorEmails(input) {
  input = input || {};
  const sender = input.sender || {};
  const missing = ['fullName', 'title', 'businessName', 'businessEmail'].filter(k => !clean(sender[k]));
  if (missing.length) return { ok: false, reason: 'sender_identity_incomplete', missingFields: missing, drafts: [] };
  const deadline = clean(input.quoteDeadline);
  if (!deadline || (input.proposalDeadline && Date.parse(deadline) >= Date.parse(input.proposalDeadline))) return { ok: false, reason: 'valid_quote_deadline_required', drafts: [] };
  const place = clean(input.placeOfPerformance);
  const drafts = list(input.vendors).filter(v => v.email && v.emailVerificationStatus !== 'unavailable').map(v => {
    const capability = clean(v.capabilities[0] || input.generalService || 'scope-qualified services');
    const questions = criticalQuestions(v, input.requirements);
    const subject = `Request for Subcontractor Quote — ${clean(input.generalService || capability)} — ${place}`;
    const body = [`Hello ${v.contactName || v.legalBusinessName + ' team'},`, '', `${sender.businessName} is evaluating subcontractor support as the prospective prime contractor for ${clean(input.generalService || capability)} work in ${place}.`, `${v.legalBusinessName} appears relevant based on its publicly documented ${capability} capabilities.`, '', `Please confirm interest, capacity, and provide an itemized quote by ${deadline}. Include labor, materials, equipment, travel, assumptions, exclusions, mobilization, availability, and quote validity.`, 'Please also provide applicable licenses/certifications, insurance evidence, relevant past performance, and UEI/CAGE/SAM status where applicable.', '', 'Critical questions:', ...questions.map((q, i) => `${i + 1}. ${q}`), '', 'Reply with your quote and qualification documents, or let us know promptly if this opportunity is not a fit.', '', sender.fullName, sender.title, sender.businessName, sender.businessEmail, clean(sender.businessPhone)].filter(Boolean).join('\n');
    return { id: 'draft_' + crypto.createHash('sha256').update(v.id + subject + deadline).digest('hex').slice(0, 16), vendorId: v.id, to: [v.email], subject, body, followUpBody: `Hello ${v.contactName || v.legalBusinessName + ' team'},\n\nFollowing up on our subcontractor quote request for ${clean(input.generalService || capability)} work in ${place}. Please let us know whether you can respond by ${deadline}.\n\n${sender.fullName}\n${sender.businessName}`, questions, quoteDeadline: deadline, status: 'needs review', approved: false, sentAt: null };
  });
  return { ok: true, drafts, requiresApproval: true, followUpsScheduled: false };
}
function criticalQuestions(v, requirements) {
  const text = list(requirements).map(r => r.task || r.requirement || '').join(' ');
  const q = [];
  if (/license|certif|clearance/i.test(text)) q.push('Which required licenses, certifications, or clearances can you document for the personnel and location proposed?');
  if (/equipment|vehicle|material/i.test(text)) q.push('Can you supply the required equipment, vehicles, and materials without relying on unapproved lower-tier subcontractors?');
  if (/bond|insurance/i.test(text)) q.push('Can you meet the stated insurance and bonding requirements and provide current evidence?');
  q.push('What staffing capacity and mobilization lead time can you commit for the expected performance window?');
  q.push('What assumptions, exclusions, and dependencies should the prime account for in evaluating your quote?');
  q.push('Which comparable projects and references best demonstrate your ability to perform the mapped tasks?');
  return Array.from(new Set(q)).slice(0, 3);
}

async function sendApproved(input, provider) {
  input = input || {};
  const drafts = list(input.drafts);
  const approved = drafts.filter(d => d.approved === true && d.status === 'approved');
  const expected = `Send ${approved.length} approved vendor outreach emails`;
  if (!approved.length) return { ok: false, reason: 'no_approved_drafts', sent: [] };
  if (input.confirmation !== expected) return { ok: false, reason: 'final_confirmation_required', expectedConfirmation: expected, sent: [] };
  if (!provider || typeof provider.send !== 'function') return { ok: false, reason: 'configured_email_provider_required', sent: [] };
  const prior = new Set(list(input.sentDraftIds));
  const sent = []; let consecutiveFailures = 0;
  for (const draft of approved) {
    if (prior.has(draft.id)) { sent.push({ draftId: draft.id, status: 'duplicate_blocked' }); continue; }
    if (!Array.isArray(draft.to) || draft.to.length !== 1) { sent.push({ draftId: draft.id, status: 'delivery failed', reason: 'one_recipient_required' }); continue; }
    try {
      const result = await provider.send({ to: draft.to[0], subject: draft.subject, body: draft.body });
      sent.push({ draftId: draft.id, status: 'sent', providerMessageId: clean(result && result.messageId, 200) });
      prior.add(draft.id); consecutiveFailures = 0;
    } catch (_) {
      sent.push({ draftId: draft.id, status: 'delivery failed' }); consecutiveFailures += 1;
      if (consecutiveFailures >= 3) break;
    }
  }
  return { ok: true, sent, sentDraftIds: Array.from(prior) };
}

module.exports = { COVERAGE, CONTACT_STATUS, OUTREACH_STATUS, analyzeSubcontractingNeeds, generateSearchStrategy, compileAndRankVendors, draftVendorEmails, sendApproved };
