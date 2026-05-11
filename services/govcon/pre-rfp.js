// services/govcon/pre-rfp.js
//
// Pre-RFP intelligence lane.
//
// Sources Sought, RFI, Pre-Solicitation, and Special Notice records
// are NOT noise -- they're high-signal capture intel about an
// agency's planning. The legacy renderer rejected them with a blanket
// `isSolicitationOpportunity` filter; this module gives them their
// own evaluation path.
//
// Capture output for each pre-RFP record:
//   - response/no-response recommendation (with rationale)
//   - capability gaps observed against the targeting profile
//   - suggested teaming directions (sub-categories, not contacts)
//   - watchlist date (when to check back)
//   - questions to ask in a capability conversation -- NEVER drafted
//     to be sent to a contracting officer during a restricted window
//
// Pure data layer. Caller wires in the targeting profile.

'use strict';

const PRE_RFP_NOTICE_TYPES = new Set([
  'Sources Sought', 'Presolicitation', 'Pre-solicitation',
  'RFI', 'Special Notice'
]);

function isPreRfp(opp) {
  if (!opp) return false;
  if (opp.noticeGroup === 'pre_rfp_intel') return true;
  if (typeof opp.noticeType === 'string' && PRE_RFP_NOTICE_TYPES.has(opp.noticeType)) return true;
  return false;
}

function _normalize(arr) {
  return Array.isArray(arr) ? arr.map(s => String(s).toLowerCase()) : [];
}

function evaluatePreRfp(opp, profile) {
  if (!opp) return { ok: false, reason: 'no_opportunity' };
  if (!isPreRfp(opp)) return { ok: false, reason: 'not_pre_rfp' };
  profile = profile || {};

  const targetNaics    = _normalize(profile.naics);
  const targetSetAside = _normalize(profile.setAsides);
  const targetCerts    = _normalize(profile.certifications);
  const inclAgency     = _normalize(profile.agencies && profile.agencies.include);
  const exclAgency     = _normalize(profile.agencies && profile.agencies.exclude);

  const oppNaics    = String(opp.naics || '').toLowerCase();
  const oppSetAside = String(opp.setAside || '').toLowerCase();
  const oppAgency   = String(opp.agency || '').toLowerCase();

  const gaps = [];
  const reasons = [];
  let positiveSignals = 0;

  // NAICS check
  if (targetNaics.length) {
    if (oppNaics && targetNaics.includes(oppNaics)) {
      reasons.push('NAICS ' + oppNaics + ' matches your targeting profile.');
      positiveSignals += 2;
    } else {
      gaps.push('NAICS ' + (oppNaics || 'unspecified') + ' is outside your current targeting profile.');
    }
  }

  // Set-aside check
  if (oppSetAside) {
    if (targetSetAside.length === 0) {
      reasons.push('Set-aside is "' + opp.setAside + '"; profile is open to all set-asides.');
      positiveSignals += 1;
    } else if (targetSetAside.some(s => oppSetAside.includes(s))) {
      reasons.push('Set-aside "' + opp.setAside + '" matches an eligible certification in your profile.');
      positiveSignals += 2;
    } else {
      gaps.push('Set-aside "' + opp.setAside + '" does not match a certification in your profile (' + targetCerts.join(', ') + ').');
    }
  } else {
    reasons.push('No set-aside specified -- open to all eligible offerors.');
    positiveSignals += 1;
  }

  // Agency check
  if (exclAgency.length && inclMatch(oppAgency, exclAgency)) {
    return {
      ok: true,
      recommendation: 'no_response',
      rationale: 'Agency "' + opp.agency + '" is on your excluded-agencies list.',
      capabilityGaps: gaps,
      teamingDirections: [],
      questionsToAsk: [],
      watchlistDate: null,
      stakeholderSafetyNote: stakeholderSafetyNote()
    };
  }
  if (inclAgency.length && oppAgency && !inclMatch(oppAgency, inclAgency)) {
    gaps.push('Agency "' + opp.agency + '" is not in your include-list.');
  } else if (oppAgency) {
    reasons.push('Agency "' + opp.agency + '" is in your target list (or no include-filter set).');
    positiveSignals += 1;
  }

  // Pre-RFP-specific signals
  reasons.push('This is a ' + (opp.noticeType || 'pre-RFP') + ' notice. Responding establishes capability of record before the formal solicitation.');

  // Decision
  let recommendation;
  if (gaps.length === 0 && positiveSignals >= 2) {
    recommendation = 'respond';
  } else if (positiveSignals >= 2 && gaps.length <= 1) {
    recommendation = 'respond_with_caveats';
  } else if (positiveSignals === 0) {
    recommendation = 'no_response';
  } else {
    recommendation = 'consider_with_partner';
  }

  // Suggested teaming categories (NOT named contacts)
  const teamingDirections = [];
  if (gaps.some(g => /staffing|capacity/i.test(g))) {
    teamingDirections.push('Identify a sub-partner with documented capacity in this scope.');
  }
  if (oppSetAside && targetSetAside.length && !targetSetAside.some(s => oppSetAside.includes(s))) {
    teamingDirections.push('Consider a teaming arrangement with a holder of the required set-aside.');
  }
  if (recommendation === 'respond' || recommendation === 'respond_with_caveats') {
    teamingDirections.push('Surface 1-2 potential sub-partners during the response so the agency sees a credible team.');
  }

  // Questions a capability conversation could cover.
  // These are FOR PLANNING, not pre-written outreach to a CO during a
  // restricted communication window.
  const questionsToAsk = [
    'What is the agency\'s preferred contract type and ceiling for this scope?',
    'Are there incumbents whose performance has driven this requirement?',
    'What past-performance dimensions will the agency weight most heavily?',
    'Are there security, CUI, or CMMC posture requirements that are not in the synopsis?',
    'What is the agency\'s preferred way to receive capability statements during the pre-RFP window?'
  ];

  // Watchlist: next time to check back. Default 14 days for pre-RFP.
  const watchlistDays = 14;
  const watchlistDate = new Date(Date.now() + watchlistDays * 86400000).toISOString().slice(0, 10);

  return {
    ok: true,
    recommendation,
    rationale: reasons.join(' '),
    capabilityGaps: gaps,
    teamingDirections,
    questionsToAsk,
    watchlistDate,
    stakeholderSafetyNote: stakeholderSafetyNote()
  };
}

function inclMatch(hay, needles) {
  return needles.some(n => hay.includes(n));
}

function stakeholderSafetyNote() {
  return 'Reference intelligence only. Follow solicitation instructions and procurement communication windows. Do not contact the contracting officer outside permitted channels or during a restricted communication window. SourceDeck does not draft outreach to a CO/COR.';
}

module.exports = {
  evaluatePreRfp,
  isPreRfp,
  PRE_RFP_NOTICE_TYPES
};
