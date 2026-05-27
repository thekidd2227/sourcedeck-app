'use strict';

// GovCon outreach-window engine.
//
// Classifies the communication posture for an opportunity into one of
// six windows. The classification drives whether SourceDeck will
// generate outreach drafts or block them.
//
// WINDOWS:
//   GREEN_GENERAL_CAPABILITY_INTRO — no active solicitation; general outreach OK
//   GREEN_PRE_SOLICITATION         — sources sought / RFI; capability response OK
//   GREEN_POST_AWARD               — awarded; debrief / next-opportunity OK
//   YELLOW_PUBLIC_QA_ONLY          — active solicitation; official Q&A only
//   RED_RESTRICTED                 — restricted communication; no outreach, no drafts
//   UNKNOWN_RESEARCH_FIRST         — cannot determine; research before contact
//
// HARD RULES:
//   - RED_RESTRICTED blocks ALL draft generation for outreach messages.
//   - YELLOW_PUBLIC_QA_ONLY allows only official Q&A channel drafts.
//   - Active solicitation + COR/program-office contact = RED_RESTRICTED.
//   - Requests for source-selection info, incumbent pricing, nonpublic
//     evaluation preferences, inside guidance, or tailored bid advice
//     are always blocked.

const WINDOWS = Object.freeze({
  GREEN_GENERAL_CAPABILITY_INTRO: 'GREEN_GENERAL_CAPABILITY_INTRO',
  GREEN_PRE_SOLICITATION:         'GREEN_PRE_SOLICITATION',
  GREEN_POST_AWARD:               'GREEN_POST_AWARD',
  YELLOW_PUBLIC_QA_ONLY:          'YELLOW_PUBLIC_QA_ONLY',
  RED_RESTRICTED:                 'RED_RESTRICTED',
  UNKNOWN_RESEARCH_FIRST:         'UNKNOWN_RESEARCH_FIRST'
});

const BLOCKED_INTENT_PATTERNS = [
  /source.selection/i,
  /incumbent.*(pric|bid|cost|rate)/i,
  /nonpublic.eval/i,
  /inside.guidance/i,
  /tailored.*(bid|advice)/i,
  /evaluation.prefer/i,
  /who.is.the.incumbent/i,
  /what.did.they.bid/i,
  /what.are.they.paying/i,
  /off.the.record/i,
  /between.us/i,
  /unofficial/i
];

function isBlockedIntent(text) {
  if (!text || typeof text !== 'string') return false;
  return BLOCKED_INTENT_PATTERNS.some(p => p.test(text));
}

// Classify the outreach window for an opportunity.
function classify(opp) {
  opp = opp || {};

  // Cannot determine
  if (!opp.noticeType && !opp.status && !opp.activeSolicitation && !opp.awarded) {
    return windowResult(WINDOWS.UNKNOWN_RESEARCH_FIRST,
      'Cannot determine solicitation status. Research before any contact.',
      { draftsAllowed: false, qaOnly: false });
  }

  // Post-award
  if (opp.awarded || opp.status === 'awarded') {
    return windowResult(WINDOWS.GREEN_POST_AWARD,
      'Contract awarded. Debrief requests and next-opportunity outreach are appropriate.',
      { draftsAllowed: true, qaOnly: false });
  }

  // Active solicitation
  if (opp.activeSolicitation || opp.status === 'active' || opp.noticeType === 'solicitation') {
    // Is there a restricted communication period?
    if (opp.restrictedComm !== false) {
      return windowResult(WINDOWS.RED_RESTRICTED,
        'Active solicitation with restricted communication. Use the official Q&A mechanism only. No outreach drafts.',
        { draftsAllowed: false, qaOnly: true });
    }
    return windowResult(WINDOWS.YELLOW_PUBLIC_QA_ONLY,
      'Active solicitation. Communicate only through the official Q&A mechanism named in the solicitation.',
      { draftsAllowed: false, qaOnly: true });
  }

  // Pre-solicitation (Sources Sought, RFI, Pre-Solicitation notice, Special Notice)
  const preRfpTypes = ['sources_sought', 'rfi', 'pre_solicitation', 'special_notice',
    'presolicitation', 'sources sought', 'request for information'];
  if (preRfpTypes.includes(String(opp.noticeType || '').toLowerCase())) {
    return windowResult(WINDOWS.GREEN_PRE_SOLICITATION,
      'Pre-solicitation notice. Capability responses and general outreach are appropriate within agency guidelines.',
      { draftsAllowed: true, qaOnly: false });
  }

  // No active solicitation detected
  if (opp.status === 'planning' || opp.status === 'forecast' || !opp.activeSolicitation) {
    return windowResult(WINDOWS.GREEN_GENERAL_CAPABILITY_INTRO,
      'No active solicitation. General capability introductions and industry-day participation are appropriate.',
      { draftsAllowed: true, qaOnly: false });
  }

  return windowResult(WINDOWS.UNKNOWN_RESEARCH_FIRST,
    'Could not classify the outreach window. Research the solicitation status before any contact.',
    { draftsAllowed: false, qaOnly: false });
}

// Guard: can a draft be generated for this opportunity + intent?
function guardDraft(opp, draftIntent) {
  const window = classify(opp);

  // Blocked intent always fails regardless of window
  if (isBlockedIntent(draftIntent)) {
    return {
      allowed: false,
      window: window.window,
      reason: 'Blocked: the message requests source-selection information, incumbent pricing, '
            + 'nonpublic evaluation preferences, or inside guidance. These are prohibited '
            + 'regardless of the solicitation phase.'
    };
  }

  // COR/program-office contact during active solicitation = RED
  if (draftIntent && typeof draftIntent === 'string') {
    const contactsCor = /\b(COR|contracting.officer|program.office|CO)\b/i.test(draftIntent);
    if (contactsCor && (window.window === WINDOWS.RED_RESTRICTED || window.window === WINDOWS.YELLOW_PUBLIC_QA_ONLY)) {
      return {
        allowed: false,
        window: window.window,
        reason: 'Blocked: direct contact with COR/CO/program office during active solicitation. '
              + 'Use the official Q&A mechanism named in the solicitation.'
      };
    }
  }

  if (!window.draftsAllowed) {
    return {
      allowed: false,
      window: window.window,
      reason: window.rationale
    };
  }

  return {
    allowed: true,
    window: window.window,
    reason: null
  };
}

function windowResult(window, rationale, flags) {
  return Object.freeze({
    window,
    rationale: String(rationale),
    draftsAllowed: !!flags.draftsAllowed,
    qaOnly: !!flags.qaOnly,
    classifiedAt: new Date().toISOString()
  });
}

module.exports = {
  WINDOWS,
  BLOCKED_INTENT_PATTERNS,
  isBlockedIntent,
  classify,
  guardDraft
};
