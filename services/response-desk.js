// services/response-desk.js
//
// Response Desk — deterministic, offline inbound-reply triage.
//
// PURPOSE
// Replaces the previous Reply Analyzer "paste box" with operational
// classification, scoring, recommended-action routing, draft-only
// response options, and pipeline/task recommendations. Every output
// is reviewable by a human and never auto-sent.
//
// PRINCIPLES
//   - Pure functions. No I/O. No live API calls.
//   - Deterministic rules over a 11-category taxonomy.
//   - Every draft is review-only. human_approval_required: true.
//   - Sanitizer scrubs guaranteed-outcome / unsupported-claim phrases.
//   - Unsubscribe + procurement-restricted suppress normal sales drafts.
//
// USAGE
//   const rd = require('./services/response-desk');
//   const out = rd.runResponseDesk({ company, contact, replyText,
//                                    contextNotes, offerDiscussed,
//                                    currentStage, dealValue, userGoal,
//                                    crmRecordId });
//
//   out.human_approval_required === true
//   out.auto_send === false

'use strict';

const CATEGORIES = Object.freeze([
  'hot_buying_signal',
  'pricing_request',
  'meeting_request',
  'objection',
  'need_more_info',
  'referral_or_wrong_contact',
  'not_now_nurture',
  'unsubscribe_or_do_not_contact',
  'procurement_restricted',
  'spam_or_irrelevant',
  'human_review_required'
]);

// ── Detection patterns (intentionally tight; biased toward human review) ──
const PATTERNS = Object.freeze({
  unsubscribe_or_do_not_contact: [
    /\bunsubscribe\b/i, /\bremove me\b/i, /\bdo not contact\b/i,
    /\bstop emailing\b/i, /\bopt out\b/i, /\btake me off\b/i,
    /\bnever email me\b/i
  ],
  procurement_restricted: [
    /\bgo through procurement\b/i, /\bcontracting officer\b/i,
    /\bofficial (channels?|solicitation)\b/i, /\bRFP only\b/i,
    /\bmust go through\b/i, /\bnot allowed to discuss\b/i,
    /\bunsolicited (proposals?|contact)\b/i
  ],
  meeting_request: [
    /\bschedule (a )?(call|meeting|demo|conversation)\b/i,
    /\blet'?s (jump on|set up|book|do) (a )?(call|meeting)\b/i,
    /\bcalendly\b/i, /\bwhen are you (free|available)\b/i,
    /\bavailable (this|next) week\b/i, /\bget on (a |the )?call\b/i,
    /\bcan we (talk|meet|hop on)\b/i
  ],
  pricing_request: [
    /\bhow much (does|is|would|will)\b/i, /\bwhat does (it|this) cost\b/i,
    /\bpricing (info|details|sheet|page)\b/i, /\bsend (me )?(the |a )?(quote|estimate)\b/i,
    /\bbudget for\b/i, /\brate card\b/i, /\bcost breakdown\b/i
  ],
  hot_buying_signal: [
    /\bready to (move forward|proceed|start|sign|go)\b/i,
    /\bwhat'?s? the next step\b/i, /\blet'?s go ahead\b/i,
    /\blet'?s do this\b/i, /\bcount us in\b/i,
    /\bwhere do (i|we) sign\b/i, /\bsend (the )?contract\b/i,
    /\bwhen can we start\b/i
  ],
  objection: [
    /\bnot a (good )?(fit|match)\b/i, /\btoo (expensive|costly|pricey)\b/i,
    /\bdon'?t (think|need|see (the (value|fit)))\b/i,
    /\bhave (concerns?|reservations?)\b/i, /\bnot interested\b/i,
    /\bwe'?ll pass\b/i, /\bgoing with (a )?competitor\b/i
  ],
  need_more_info: [
    /\bcan you (send|share|explain|tell me more|elaborate)\b/i,
    /\bmore (info|information|details)\b/i,
    /\bquestions? (about|on)\b/i, /\bclarify\b/i,
    /\bhow does (this|it) work\b/i, /\bwhat (about|happens if|do you mean by)\b/i
  ],
  referral_or_wrong_contact: [
    /\bwrong person\b/i, /\btalk to .* instead\b/i,
    /\b(contact|reach out to) .* instead\b/i, /\bforwarded (to|this)\b/i,
    /\bnot the right (person|contact)\b/i, /\bcopying .* who handles\b/i,
    /\bplease loop in\b/i
  ],
  not_now_nurture: [
    /\bnot (right )?now\b/i, /\bcheck back\b/i,
    /\bnext (quarter|year|month|fiscal)\b/i, /\bmaybe later\b/i,
    /\bbusy (right now|at the moment)\b/i, /\bcircle back\b/i,
    /\brevisit in\b/i, /\btoo soon\b/i
  ],
  spam_or_irrelevant: [
    /\bcasino\b/i, /\bbitcoin (mining|wallet|trading)\b/i,
    /\binvest in (our|the) (token|crypto)\b/i, /\bnigeri[ae]n prince\b/i,
    /\b(you )?won (the )?lottery\b/i, /\bSEO (services|backlinks)\b/i,
    /\bcheap (followers|likes|domains?)\b/i
  ]
});

// ── Blocked phrases — never appear in a draft / summary output ──
const BLOCKED_PHRASES = Object.freeze([
  /\bguaranteed (results|ROI|award|revenue|outcomes?|response rate)\b/i,
  /\bwe guarantee\b/i, /\bguaranteed savings\b/i,
  /\bunlimited AI\b/i, /\bauto-?send\b/i, /\bauto-?submit\b/i,
  /\bsend email automatically\b/i, /\bsubmit (the )?quote (for|to)\b/i,
  /\bSOC ?2 certified\b/i, /\bFedRAMP authorized\b/i,
  /\bCMMC certified\b/i, /\bHIPAA certified\b/i,
  /\bHITRUST certified\b/i, /\bISO ?27001 certified\b/i,
  /\bwatsonx live\b/i, /\bsigned and notarized\b/i,
  /\bgovernment compliant\b/i
]);

// Categories where normal sales drafts must be suppressed.
const SUPPRESS_SALES_DRAFTS = new Set([
  'unsubscribe_or_do_not_contact',
  'procurement_restricted',
  'spam_or_irrelevant'
]);

function classifyResponse(input) {
  const text = String((input && input.replyText) || '').trim();
  if (!text) {
    return { category: 'human_review_required', confidence: 'low', signals: ['empty_text'] };
  }

  const signals = [];
  const matches = {};
  for (const [cat, regexes] of Object.entries(PATTERNS)) {
    for (const re of regexes) {
      if (re.test(text)) {
        matches[cat] = (matches[cat] || 0) + 1;
        signals.push(cat);
        break;
      }
    }
  }

  // Resolve overlaps by priority: safety/compliance categories first,
  // then commercial signals, then nurture, then fallback.
  const PRIORITY = [
    'unsubscribe_or_do_not_contact',
    'procurement_restricted',
    'spam_or_irrelevant',
    'meeting_request',
    'hot_buying_signal',
    'pricing_request',
    'objection',
    'need_more_info',
    'referral_or_wrong_contact',
    'not_now_nurture'
  ];
  for (const cat of PRIORITY) {
    if (matches[cat]) {
      const confidence = matches[cat] >= 2 ? 'high' : 'medium';
      return { category: cat, confidence, signals: Array.from(new Set(signals)) };
    }
  }
  return { category: 'human_review_required', confidence: 'low', signals: [] };
}

function scoreResponse(input, classification) {
  const cls = classification || classifyResponse(input);
  const cat = cls.category;
  let urgency = 50, revenue = 40, risk = 'low';

  switch (cat) {
    case 'hot_buying_signal':            urgency = 95; revenue = 90; break;
    case 'meeting_request':              urgency = 85; revenue = 75; break;
    case 'pricing_request':              urgency = 75; revenue = 80; break;
    case 'need_more_info':               urgency = 60; revenue = 55; break;
    case 'objection':                    urgency = 50; revenue = 40; break;
    case 'referral_or_wrong_contact':    urgency = 55; revenue = 45; risk = 'medium'; break;
    case 'not_now_nurture':              urgency = 25; revenue = 30; break;
    case 'unsubscribe_or_do_not_contact':urgency = 100; revenue = 0; risk = 'high'; break;
    case 'procurement_restricted':       urgency = 65; revenue = 50; risk = 'high'; break;
    case 'spam_or_irrelevant':           urgency = 10; revenue = 0; break;
    case 'human_review_required':        urgency = 50; revenue = 40; risk = 'medium'; break;
  }

  // Boost revenue with deal value, but never on suppression categories.
  const dealValue = Number(input && input.dealValue);
  if (Number.isFinite(dealValue) && dealValue > 0 && !SUPPRESS_SALES_DRAFTS.has(cat)) {
    revenue = Math.min(100, revenue + Math.min(15, Math.floor(dealValue / 50000)));
  }

  return { urgency_score: urgency, revenue_score: revenue, risk_level: risk };
}

function recommendResponseAction(classification) {
  const cat = (classification && classification.category) || 'human_review_required';
  const map = {
    hot_buying_signal:            { recommended_action: 'Reply with meeting confirmation and proposed times — for human approval', next_due: '24h' },
    meeting_request:              { recommended_action: 'Reply with calendar availability — for human approval', next_due: '24h' },
    pricing_request:              { recommended_action: 'Reply with pricing/scope summary — for human approval', next_due: '48h' },
    need_more_info:               { recommended_action: 'Reply with concise information requested — for human approval', next_due: '48h' },
    objection:                    { recommended_action: 'Reply with consultative re-frame — for human approval', next_due: '48h' },
    referral_or_wrong_contact:    { recommended_action: 'Thank for referral; redirect to recommended contact — for human approval', next_due: '48h' },
    not_now_nurture:              { recommended_action: 'Add to nurture cadence; no immediate reply', next_due: '30d' },
    unsubscribe_or_do_not_contact:{ recommended_action: 'Suppress further outreach; mark do-not-contact in CRM', next_due: 'immediate' },
    procurement_restricted:       { recommended_action: 'Halt direct outreach; route through procurement / official channels only', next_due: 'immediate' },
    spam_or_irrelevant:           { recommended_action: 'No reply; log and ignore', next_due: 'none' },
    human_review_required:        { recommended_action: 'Operator review required before any reply', next_due: 'review' }
  };
  return map[cat] || map.human_review_required;
}

function buildResponseDraftOptions(input, classification) {
  const cat = (classification && classification.category) || 'human_review_required';
  const company = String((input && input.company) || '').slice(0, 80) || 'your team';
  const contact = String((input && input.contact) || '').slice(0, 80);
  const offer = String((input && input.offerDiscussed) || 'the offer we discussed').slice(0, 200);

  if (cat === 'unsubscribe_or_do_not_contact') {
    return {
      direct_close: '', consultative: '', short_executive: '',
      notice: 'Sales drafts suppressed — recipient requested do-not-contact.'
    };
  }
  if (cat === 'procurement_restricted') {
    return {
      direct_close: '', consultative: '', short_executive: '',
      notice: 'Direct sales drafts suppressed — recipient is procurement-restricted. Route through official channels.'
    };
  }
  if (cat === 'spam_or_irrelevant') {
    return {
      direct_close: '', consultative: '', short_executive: '',
      notice: 'No drafts generated for spam/irrelevant replies.'
    };
  }
  if (cat === 'human_review_required') {
    return {
      direct_close: '', consultative: '', short_executive: '',
      notice: 'Operator review required before drafting a reply.'
    };
  }

  const opener = contact ? `Hi ${contact},` : 'Hi,';
  const direct_close = `${opener} Thanks for the quick reply. Confirming next steps on ${offer} for ${company}. Reply with a preferred 30-minute slot tomorrow or Thursday and I'll send the calendar invite. — Sent for your review; not auto-sent.`;
  const consultative = `${opener} Appreciate the reply. Before we proceed, two clarifying questions: (1) what does success look like for ${company} on ${offer} over the next 90 days? (2) who else needs to evaluate it? Happy to tailor next steps around your answers. — Sent for your review; not auto-sent.`;
  const short_executive = `${opener} Quick decision frame for ${company}: (a) keep current path, (b) pilot ${offer} on one workstream, (c) full engagement. Reply with a, b, or c and I'll route the next step. — Sent for your review; not auto-sent.`;

  return { direct_close, consultative, short_executive };
}

function buildPipelineRecommendations(input, classification) {
  const cat = (classification && classification.category) || 'human_review_required';
  const stage = String((input && input.currentStage) || '').slice(0, 60);

  const stageMap = {
    hot_buying_signal:            'Proposal / Negotiation',
    meeting_request:              'Discovery scheduled',
    pricing_request:              'Proposal / Pricing',
    need_more_info:               'Qualified — information exchange',
    objection:                    'Re-qualification',
    referral_or_wrong_contact:    'Re-route to new contact',
    not_now_nurture:              'Nurture',
    unsubscribe_or_do_not_contact:'Closed — do not contact',
    procurement_restricted:       'On hold — procurement channel only',
    spam_or_irrelevant:           'Discard',
    human_review_required:        'Operator review'
  };
  const taskMap = {
    hot_buying_signal:            'Draft proposal review invite (human approval required)',
    meeting_request:              'Draft calendar availability (human approval required)',
    pricing_request:              'Prepare pricing/scope summary (human approval required)',
    need_more_info:               'Draft answer to information request (human approval required)',
    objection:                    'Draft consultative re-frame (human approval required)',
    referral_or_wrong_contact:    'Update CRM contact + draft re-route note (human approval required)',
    not_now_nurture:              'Schedule follow-up in 30 days',
    unsubscribe_or_do_not_contact:'Mark do-not-contact in CRM',
    procurement_restricted:       'Flag account for procurement channel routing',
    spam_or_irrelevant:           'No task',
    human_review_required:        'Operator review the inbound reply'
  };

  const suffix = stage ? ` (current stage: ${stage} — advisory only)` : ' (advisory only)';
  return {
    pipeline_stage_recommendation: (stageMap[cat] || stageMap.human_review_required) + suffix,
    task_recommendation: taskMap[cat] || taskMap.human_review_required
  };
}

function sanitizeResponseDeskOutput(output) {
  if (!output || typeof output !== 'object') return output;
  const out = JSON.parse(JSON.stringify(output));

  const scrub = (s) => {
    if (typeof s !== 'string') return s;
    let t = s;
    for (const re of BLOCKED_PHRASES) t = t.replace(re, '[redacted]');
    return t;
  };
  const scrubObj = (o) => {
    if (!o || typeof o !== 'object') return o;
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string') o[k] = scrub(o[k]);
      else if (o[k] && typeof o[k] === 'object') scrubObj(o[k]);
    }
    return o;
  };

  scrubObj(out);

  // Hard invariants — never weaken.
  out.human_approval_required = true;
  out.auto_send = false;
  if (!Array.isArray(out.safety_flags)) out.safety_flags = [];

  return out;
}

function runResponseDesk(input) {
  const classification = classifyResponse(input);
  const scores = scoreResponse(input, classification);
  const action = recommendResponseAction(classification);
  const drafts = buildResponseDraftOptions(input, classification);
  const pipeline = buildPipelineRecommendations(input, classification);

  const safety_flags = [];
  if (classification.category === 'unsubscribe_or_do_not_contact') safety_flags.push('do_not_contact');
  if (classification.category === 'procurement_restricted') safety_flags.push('procurement_restricted');
  if (classification.category === 'spam_or_irrelevant') safety_flags.push('low_priority');
  if (classification.category === 'human_review_required') safety_flags.push('operator_review_required');
  if (scores.risk_level === 'high') safety_flags.push('high_risk');

  const replyText = String((input && input.replyText) || '');
  const summary = replyText
    ? (replyText.length > 280 ? replyText.slice(0, 280) + '…' : replyText)
    : '';

  const raw = {
    summary,
    intent: classification.category,
    classification_confidence: classification.confidence,
    classification_signals: classification.signals,
    urgency_score: scores.urgency_score,
    revenue_score: scores.revenue_score,
    risk_level: scores.risk_level,
    recommended_action: action.recommended_action,
    next_due: action.next_due,
    pipeline_stage_recommendation: pipeline.pipeline_stage_recommendation,
    task_recommendation: pipeline.task_recommendation,
    response_options: drafts,
    safety_flags,
    human_approval_required: true,
    auto_send: false,
    audit_note: 'Draft only — not sent. All outbound responses require explicit human approval.'
  };
  return sanitizeResponseDeskOutput(raw);
}

// UMD-style exports: works as a CommonJS module in Node (for tests) and
// attaches to `window.SDResponseDesk` when loaded via a renderer
// <script src="services/response-desk.js"> include. No require() calls,
// no Node-only APIs above, so the file is safe in either context.
const _api = {
  CATEGORIES,
  BLOCKED_PHRASES,
  classifyResponse,
  scoreResponse,
  recommendResponseAction,
  buildResponseDraftOptions,
  buildPipelineRecommendations,
  sanitizeResponseDeskOutput,
  runResponseDesk
};
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
if (typeof window !== 'undefined') window.SDResponseDesk = _api;
