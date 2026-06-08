'use strict';

const { guardDraft } = require('./outreach-window');

const FORBIDDEN_WORDS = ['landscape', 'delve', 'testament', 'in conclusion', 'realm', 'tapestry', 'leverage', 'game-changer'];

function draftOfficialEmail(input) {
  input = input || {};
  const opportunity = input.opportunity || {};
  const contact = input.contact || {};
  const purpose = String(input.purpose || 'clarification').slice(0, 80);
  const nowMs = (typeof input.nowMs === 'number' && isFinite(input.nowMs)) ? input.nowMs : Date.now();
  const gate = guardDraft(opportunity, purpose);
  if ((!gate.allowed && gate.window === 'RED_RESTRICTED') || activeSolicitation(opportunity, nowMs)) {
    return {
      ok: false,
      blocked: true,
      reason: 'red_restricted_blocks_direct_outreach',
      officialQAndADraft: officialQaDraft(opportunity, purpose),
      requiresApproval: true,
      logEntry: logEntry(opportunity, contact, 'blocked_official_q_and_a_only')
    };
  }
  const body = [
    `Subject: ${val(opportunity.solicitationNumber)} - ${purpose}`,
    '',
    `Hello ${contact.role || 'Procurement Team'},`,
    '',
    `We are reviewing ${val(opportunity.title)} (${val(opportunity.solicitationNumber)}).`,
    `Please confirm the item below through the official solicitation route:`,
    '',
    String(input.question || 'Please confirm the applicable instruction for this requirement.'),
    '',
    'Thank you,',
    val(input.companyName || input.companyProfile?.name || 'SourceDeck user')
  ].join('\n');
  return {
    ok: true,
    blocked: false,
    draft: scrubForbidden(body),
    contactRole: contact.role || 'official_poc',
    requiresApproval: true,
    sendingEnabled: false,
    logEntry: logEntry(opportunity, contact, 'draft_created')
  };
}

// `nowMs` is the injectable comparison clock — callers running with a
// frozen test now (or against historical fixtures) must pass it so a
// deadline placed N days "in the future" relative to the agent's now
// isn't mis-classified as past when wall-clock has drifted. Defaults to
// the real Date.now() when omitted.
function activeSolicitation(opportunity, nowMs) {
  const kind = String(opportunity.noticeGroup || opportunity.noticeType || '').toLowerCase();
  const due = Date.parse(opportunity.responseDeadline || opportunity.responseDeadLine || '');
  const cmp = (typeof nowMs === 'number' && isFinite(nowMs)) ? nowMs : Date.now();
  return /solicitation|rfp|rfq|combined/.test(kind) && (!Number.isFinite(due) || due > cmp);
}

function officialQaDraft(opportunity, purpose) {
  return scrubForbidden([
    'Official Q&A / Clarification Draft',
    `Solicitation: ${val(opportunity.title)} (${val(opportunity.solicitationNumber)})`,
    `Topic: ${purpose}`,
    'Question: Please confirm the requirement cited by the offeror. No direct outreach is authorized outside the official Q&A or named POC route.'
  ].join('\n'));
}

function scrubForbidden(text) {
  let out = String(text || '');
  for (const w of FORBIDDEN_WORDS) out = out.replace(new RegExp(escapeRe(w), 'ig'), '');
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

function logEntry(opportunity, contact, status) {
  return {
    id: `comm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status,
    solicitationNumber: opportunity.solicitationNumber || null,
    title: opportunity.title || null,
    officialContactRole: contact.role || contact.type || 'official_poc',
    approvedByUser: false
  };
}

function val(v) { return v == null || v === '' ? 'Unknown' : String(v); }
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = { draftOfficialEmail, FORBIDDEN_WORDS, scrubForbidden };
