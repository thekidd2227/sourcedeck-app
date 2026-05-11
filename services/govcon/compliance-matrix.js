// services/govcon/compliance-matrix.js
//
// Compliance-matrix starter generator.
//
// Accepts solicitation text (already-extracted PDF text or pasted RFP
// body) and produces a compliance-matrix starter row per detected
// requirement. The matrix is intentionally a STARTER -- a human
// proposal lead reviews and edits before submission. See AI-output
// policy on /methodology/ in the sourcedeck-site repo.
//
// Pure text-in / data-out. No network. No PDF parsing here -- a caller
// runs PDF -> text first (any pdf-extract impl) and passes the text in.
//
// Output row shape:
//   {
//     reqId, sourceSection, requirement, sectionM, owner, evidence,
//     dueOrInstruction, riskLevel, sourceQuote, confidence
//   }
//
// Heuristic-only. Works on synthetic text in tests. A future watsonx
// pass through services/ai can refine these rows; this module gives
// the deterministic baseline.

'use strict';

const SECTION_L_RE = /(?:^|\n)\s*(L\.\s*\d+(?:\.\d+)*)\s*(.+?)(?=\n\s*[LM]\.|\n\s*Section\s+[LM]|\n\n|$)/gms;
const SECTION_M_RE = /(?:^|\n)\s*(M\.\s*\d+(?:\.\d+)*)\s*(.+?)(?=\n\s*[LM]\.|\n\s*Section\s+[LM]|\n\n|$)/gms;
const REQ_VERBS = /\b(shall|must|will\s+provide|is\s+required|are\s+required|provide|submit|describe|address|demonstrate|include|ensure)\b/i;

const RISK_KEYWORDS = [
  { re: /\bsecurity\s+clearance\b/i,                        risk: 'high',   tag: 'clearance' },
  { re: /\bcui\b|\bcontrolled\s+unclassified\b/i,           risk: 'high',   tag: 'cui' },
  { re: /\bcmmc\b/i,                                         risk: 'high',   tag: 'cmmc' },
  { re: /\bsection\s*889\b|\bcovered\s+telecom/i,           risk: 'medium', tag: 'section_889' },
  { re: /\bfar\s*52\.219-14\b|\bself[-\s]?performance\b/i,  risk: 'medium', tag: 'self_performance' },
  { re: /\bpast\s+performance\b/i,                          risk: 'medium', tag: 'past_performance' },
  { re: /\bcost\s+narrative\b|\bprice\s+workbook\b/i,       risk: 'medium', tag: 'price' },
  { re: /\bbond(ing)?\b|\bsurety\b/i,                       risk: 'medium', tag: 'bonding' },
  { re: /\bdcaa\b/i,                                         risk: 'medium', tag: 'dcaa' },
  { re: /\bset[-\s]?aside\b/i,                              risk: 'low',    tag: 'set_aside' },
  { re: /\bsdvosb\b|\b8\(a\)\b|\bwosb\b|\bhubzone\b/i,      risk: 'low',    tag: 'set_aside_specific' }
];

const OWNER_HEURISTICS = [
  { re: /\btechnical\s+approach|management\s+plan|staffing/i, owner: 'Capture lead' },
  { re: /\bpast\s+performance|cpars|references?/i,            owner: 'Proposal lead' },
  { re: /\bcost\b|\bprice\b|\bpricing\b|\bworkbook\b/i,       owner: 'Finance' },
  { re: /\b889\b|\bclearance\b|\bcmmc\b|\bcui\b|\brep(s)?\s+(?:and|&)\s+certs?/i, owner: 'Compliance' },
  { re: /\bsdvosb\b|\b8\(a\)\b|\bwosb\b|\bhubzone\b|\bself[-\s]?performance\b/i,  owner: 'Compliance' },
  { re: /\bteaming|subcontract(or|ing)\b/i,                                       owner: 'BD lead' }
];

const EVIDENCE_HEURISTICS = [
  { re: /\bresume(s)?\b/i,                                 evidence: 'Key personnel resumes' },
  { re: /\bpast\s+performance\b/i,                         evidence: '3 CPARS records + customer POC permission' },
  { re: /\borg(anization)?(al)?\s+chart\b/i,               evidence: 'Org chart' },
  { re: /\btransition\s+plan\b/i,                          evidence: '30/60/90 transition plan' },
  { re: /\bcost\s+narrative\b|\bprice\s+workbook\b/i,      evidence: 'Cost narrative + B&P workbook' },
  { re: /\b889\b|\bcovered\s+telecom\b/i,                  evidence: 'Section 889 representation' },
  { re: /\bcmmc\b/i,                                       evidence: 'CMMC self-assessment posture' },
  { re: /\bsdvosb\b|\bself[-\s]?performance\b/i,           evidence: 'SDVOSB self-performance attestation + sub MOU' }
];

function pickOne(heuristics, text, defaultValue) {
  for (const h of heuristics) {
    if (h.re.test(text)) return h[Object.keys(h).find(k => k !== 're')];
  }
  return defaultValue;
}

function classifyRisk(text) {
  for (const r of RISK_KEYWORDS) {
    if (r.re.test(text)) return { riskLevel: r.risk, riskTag: r.tag };
  }
  return { riskLevel: 'low', riskTag: 'general' };
}

function shorten(s, n) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function findFirstSentenceWith(text, re) {
  if (!text) return null;
  const sentences = String(text).split(/(?<=[.?!])\s+/);
  for (const s of sentences) {
    if (re.test(s)) return s.trim();
  }
  return null;
}

function extractSectionMap(text, re) {
  const out = {};
  if (!text) return out;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const id = m[1].replace(/\s+/g, '');
    out[id] = (m[2] || '').trim();
  }
  return out;
}

// Build a Section L → Section M map by paragraph index. Section L
// requires a thing; the corresponding Section M paragraph evaluates
// it. We pair them by ordinal when L.x and M.x both exist.
function pairLandM(lMap, mMap) {
  const pairs = [];
  const lKeys = Object.keys(lMap).sort();
  for (const lKey of lKeys) {
    const idx = lKey.replace(/^L\./, '');
    const mKey = 'M.' + idx;
    pairs.push({ lKey, mKey: mMap[mKey] ? mKey : null, lText: lMap[lKey], mText: mMap[mKey] || null });
  }
  return pairs;
}

function buildRowFromPair(pair, idx) {
  const { lKey, mKey, lText, mText } = pair;
  const requirement = shorten(findFirstSentenceWith(lText, REQ_VERBS) || lText, 200);
  const owner    = pickOne(OWNER_HEURISTICS, lText + ' ' + (mText || ''), 'Capture lead');
  const evidence = pickOne(EVIDENCE_HEURISTICS, lText + ' ' + (mText || ''), 'TBD by capture lead');
  const { riskLevel, riskTag } = classifyRisk(lText + ' ' + (mText || ''));
  const dueOrInstruction = (() => {
    const m = (lText || '').match(/\b(page\s+limit|font\s+size|due|deadline|submit\s+via)\b[^.]*/i);
    return m ? shorten(m[0], 140) : null;
  })();
  return {
    reqId: 'REQ-' + String(idx + 1).padStart(3, '0'),
    sourceSection: lKey,
    requirement,
    sectionM: mKey,
    owner,
    evidence,
    dueOrInstruction,
    riskLevel,
    riskTag,
    sourceQuote: shorten(lText, 280),
    confidence: requirement ? 0.6 : 0.4
  };
}

function generateComplianceMatrix(text, opts) {
  opts = opts || {};
  if (!text || typeof text !== 'string') {
    return { ok: false, reason: 'no_text', rows: [] };
  }
  const lMap = extractSectionMap(text, SECTION_L_RE);
  const mMap = extractSectionMap(text, SECTION_M_RE);

  let rows;
  if (Object.keys(lMap).length) {
    const pairs = pairLandM(lMap, mMap);
    rows = pairs.map((p, i) => buildRowFromPair(p, i));
  } else {
    // Fallback: one row per "shall|must" sentence in the body, capped.
    const sentences = String(text).split(/(?<=[.?!])\s+/);
    const reqSentences = sentences.filter(s => REQ_VERBS.test(s)).slice(0, 24);
    rows = reqSentences.map((s, i) => buildRowFromPair({
      lKey: 'L.UNK.' + (i + 1),
      mKey: null,
      lText: s,
      mText: null
    }, i));
  }
  return {
    ok: true,
    rows,
    aiPolicy: 'AI draft. Human review required before submission. Verify Section L paragraph references against the live solicitation amendment.',
    counts: {
      total: rows.length,
      high:   rows.filter(r => r.riskLevel === 'high').length,
      medium: rows.filter(r => r.riskLevel === 'medium').length,
      low:    rows.filter(r => r.riskLevel === 'low').length
    }
  };
}

module.exports = {
  generateComplianceMatrix,
  // exported for unit-test introspection
  classifyRisk,
  extractSectionMap,
  SECTION_L_RE,
  SECTION_M_RE
};
