'use strict';

// GovCon fast-cash decision engine.
//
// Evaluates opportunities under $250K (micro-purchase, simplified
// acquisition, small contracts) and returns one of six verdicts plus
// supporting scores.
//
// VERDICTS (immutable once set):
//   QUOTE_NOW             — ready to quote immediately
//   SOURCE_SUB_FIRST      — need sub/vendor cost before quoting
//   SAFE_OUTREACH_FIRST   — pre-solicitation outreach is appropriate
//   WATCH                 — monitor, do not act
//   KILL                  — permanent drop
//   MORE_RESEARCH_NEEDED  — cannot decide without more information
//
// HARD RULES:
//   - KILL stays KILL (no undo).
//   - Failed margin stress blocks QUOTE_NOW.
//   - LOW/UNKNOWN confidence cannot become verified.
//   - AI may organize and draft; AI must not decide.

const VERDICTS = Object.freeze({
  QUOTE_NOW:             'QUOTE_NOW',
  SOURCE_SUB_FIRST:      'SOURCE_SUB_FIRST',
  SAFE_OUTREACH_FIRST:   'SAFE_OUTREACH_FIRST',
  WATCH:                 'WATCH',
  KILL:                  'KILL',
  MORE_RESEARCH_NEEDED:  'MORE_RESEARCH_NEEDED'
});

const FAST_CASH_CEILING = 250000;
const MICRO_PURCHASE_CEILING = 10000;
const SIMPLIFIED_ACQUISITION_CEILING = 250000;

function classifyAcquisitionLane(value) {
  if (typeof value !== 'number' || value <= 0) return 'unknown';
  if (value <= MICRO_PURCHASE_CEILING) return 'micro_purchase';
  if (value <= SIMPLIFIED_ACQUISITION_CEILING) return 'simplified_acquisition';
  return 'full_competition';
}

// Margin stress check. Returns { ok, marginPct, reason }.
// Blocks QUOTE_NOW when sub cost is unknown or margin < 15%.
function checkMarginStress(opp) {
  opp = opp || {};
  const ceiling = typeof opp.ceiling === 'number' ? opp.ceiling : 0;
  const subCost = typeof opp.estimatedSubCost === 'number' ? opp.estimatedSubCost : null;

  if (ceiling <= 0) {
    return { ok: false, marginPct: null, reason: 'No ceiling value provided.' };
  }
  if (subCost === null || subCost < 0) {
    return { ok: false, marginPct: null, reason: 'Sub/vendor cost is unknown. Get at least two quotes before recommending QUOTE_NOW.' };
  }
  const margin = ceiling - subCost;
  const marginPct = Math.round((margin / ceiling) * 100);
  if (marginPct < 15) {
    return { ok: false, marginPct, reason: 'Margin ' + marginPct + '% is below 15% floor. Not viable as prime.' };
  }
  return { ok: true, marginPct, reason: null };
}

// Sub/vendor readiness score (0-100).
function scoreSubReadiness(sub) {
  sub = sub || {};
  let score = 0;
  if (sub.identified) score += 20;
  if (sub.w9)         score += 15;
  if (sub.coi)        score += 15;
  if (sub.license)    score += 10;
  if (sub.bonding)    score += 10;
  if (sub.quoteReceived) score += 20;
  if (sub.sameDayResponse) score += 10;
  return Math.min(100, score);
}

// Quote readiness score (0-100).
function scoreQuoteReadiness(opp) {
  opp = opp || {};
  let score = 0;
  if (opp.scopeClear)       score += 20;
  if (opp.ceilingKnown)     score += 15;
  if (opp.deadlineKnown)    score += 10;
  if (opp.naicsFit)         score += 10;
  if (opp.setAsideFit)      score += 10;
  if (opp.subReady)         score += 15;
  if (opp.pastPerfMatch)    score += 10;
  if (opp.marginOk)         score += 10;
  return Math.min(100, score);
}

// Evaluate a fast-cash opportunity and return a verdict + rationale.
function evaluate(opp, opts) {
  opp = opp || {};
  opts = opts || {};

  const ceiling = typeof opp.ceiling === 'number' ? opp.ceiling : 0;
  const lane = classifyAcquisitionLane(ceiling);
  const margin = checkMarginStress(opp);
  const subScore = scoreSubReadiness(opp.sub || {});
  const quoteScore = scoreQuoteReadiness({
    scopeClear:    !!opp.scopeClear,
    ceilingKnown:  ceiling > 0,
    deadlineKnown: !!opp.deadline,
    naicsFit:      !!opp.naicsFit,
    setAsideFit:   !!opp.setAsideFit,
    subReady:      subScore >= 60,
    pastPerfMatch: !!opp.pastPerfMatch,
    marginOk:      margin.ok
  });

  const reasons = [];
  let verdict;

  // Hard kills
  if (opp.killed) {
    return result(VERDICTS.KILL, 'Previously killed. KILL stays KILL.', lane, margin, subScore, quoteScore, []);
  }
  if (ceiling > FAST_CASH_CEILING && lane !== 'unknown') {
    return result(VERDICTS.KILL, 'Ceiling $' + ceiling.toLocaleString() + ' exceeds $250K fast-cash ceiling.',
      lane, margin, subScore, quoteScore, []);
  }

  // NAICS / set-aside exclusions
  if (opp.naicsExcluded) {
    reasons.push('NAICS is on the exclusion list.');
    return result(VERDICTS.KILL, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Outreach-appropriate pre-solicitation
  if (opp.preSolicitation && !opp.activeSolicitation) {
    reasons.push('Pre-solicitation notice. Outreach for capability introduction is appropriate.');
    return result(VERDICTS.SAFE_OUTREACH_FIRST, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Need more info
  if (lane === 'unknown' || (!opp.scopeClear && !opp.deadline)) {
    reasons.push('Insufficient data to evaluate. Research scope, ceiling, and deadline.');
    return result(VERDICTS.MORE_RESEARCH_NEEDED, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Sub sourcing needed
  if (opp.requiresSub && subScore < 40) {
    reasons.push('Subcontractor required but not yet sourced (readiness ' + subScore + '%).');
    if (!margin.ok && margin.reason && margin.reason.includes('unknown')) {
      reasons.push(margin.reason);
    }
    return result(VERDICTS.SOURCE_SUB_FIRST, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Margin stress blocks quoting
  if (!margin.ok) {
    reasons.push(margin.reason);
    if (subScore < 60) {
      return result(VERDICTS.SOURCE_SUB_FIRST, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
    }
    return result(VERDICTS.WATCH, 'Margin stress: ' + reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Ready to quote
  if (quoteScore >= 70) {
    reasons.push('Quote readiness ' + quoteScore + '%. Margin ' + margin.marginPct + '%. Sub readiness ' + subScore + '%.');
    return result(VERDICTS.QUOTE_NOW, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  // Watch
  if (quoteScore >= 40) {
    reasons.push('Partial readiness (' + quoteScore + '%). Monitor for missing inputs.');
    return result(VERDICTS.WATCH, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
  }

  reasons.push('Low readiness (' + quoteScore + '%). Gather more information before deciding.');
  return result(VERDICTS.MORE_RESEARCH_NEEDED, reasons.join(' '), lane, margin, subScore, quoteScore, reasons);
}

function result(verdict, rationale, lane, margin, subScore, quoteScore, reasons) {
  return Object.freeze({
    verdict,
    rationale: String(rationale),
    lane,
    margin: Object.freeze({ ok: margin.ok, marginPct: margin.marginPct, reason: margin.reason }),
    subReadiness: subScore,
    quoteReadiness: quoteScore,
    reasons: Object.freeze((reasons || []).slice()),
    evaluatedAt: new Date().toISOString(),
    humanReviewRequired: true
  });
}

module.exports = {
  VERDICTS,
  FAST_CASH_CEILING,
  MICRO_PURCHASE_CEILING,
  SIMPLIFIED_ACQUISITION_CEILING,
  classifyAcquisitionLane,
  checkMarginStress,
  scoreSubReadiness,
  scoreQuoteReadiness,
  evaluate
};
