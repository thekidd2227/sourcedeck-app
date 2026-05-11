// services/proposal/index.js
//
// Proposal drafting service surface.
//
// SCAFFOLD ONLY in this commit. The contract below is what callers
// (the /api adapter, a future web app, the Electron renderer) should
// rely on. The implementation is intentionally minimal -- it returns
// a normalized shape so UI work can proceed against a stable
// boundary while the real generator is built behind it.
//
// Eventual implementation will:
//   1. Accept the normalized opportunity record (services/sam shape).
//   2. Pull a compliance matrix (services/compliance).
//   3. Match past performance (services/capture).
//   4. Run an AI provider (services/ai) with the GovCon prompt
//      library to draft each Section L response section.
//   5. Return drafts tagged "AI draft, human review required" with
//      reviewer notes.
//
// Until that wiring lands, this returns a TODO scaffold so the UI
// can render the right structure deterministically.

'use strict';

const HUMAN_REVIEW_REQUIRED = 'AI draft. Human review required before submission. Verify Section L paragraph references against the live solicitation amendment.';

function draftSections(input) {
  input = input || {};
  const opportunity = input.opportunity || null;
  const matrix      = input.complianceMatrix || null;
  const sections    = Array.isArray(input.sections) && input.sections.length
    ? input.sections
    : ['Technical Approach', 'Past Performance', 'Management Plan', 'Price Narrative'];

  if (!opportunity) {
    return { ok: false, reason: 'no_opportunity' };
  }

  const drafts = sections.map(section => ({
    section,
    status: 'todo',
    text: `[Scaffold] Draft for "${section}" pending. Wire services/ai into services/proposal to generate.`,
    reviewerNotes: [
      'Verify staffing assumptions before submission.',
      'Confirm sub MOU is signed before referencing in self-performance attestation.',
      'Cross-check Section L paragraph references against the live solicitation amendment.'
    ],
    sourceMatrixRows: matrix && Array.isArray(matrix.rows)
      ? matrix.rows.filter(r => sectionMatch(r, section)).map(r => r.reqId)
      : []
  }));

  return Object.freeze({
    ok: true,
    opportunityId: opportunity.noticeId || opportunity.solicitationNumber || null,
    drafts,
    aiPolicy: HUMAN_REVIEW_REQUIRED,
    _scaffold: true
  });
}

function sectionMatch(row, sectionName) {
  if (!row || !sectionName) return false;
  const haystack = ((row.requirement || '') + ' ' + (row.sourceQuote || '')).toLowerCase();
  const s = sectionName.toLowerCase();
  if (s.includes('technical')   && /technical|approach|staffing/.test(haystack))     return true;
  if (s.includes('past')        && /past\s+performance|cpars|reference/.test(haystack)) return true;
  if (s.includes('management')  && /management|transition|org\s*chart/.test(haystack))  return true;
  if (s.includes('price') || s.includes('cost') ) return /price|cost/.test(haystack);
  return false;
}

module.exports = {
  draftSections,
  HUMAN_REVIEW_REQUIRED
};
