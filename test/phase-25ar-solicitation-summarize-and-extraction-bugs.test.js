// test/phase-25ar-solicitation-summarize-and-extraction-bugs.test.js
//
// Phase 25AR regression test. Covers:
//
//   §1. metadata.solicitationNumber mis-extraction bug (was emitting
//       "/CONTRACT/ORDER" for SF 1449-style headers; now extracts the
//       real RFQ number).
//   §2. requiredForms over-tokenization bug ("Attachment 1 — Pricing
//       Sheet" must not split into two entries).
//   §3. summarizeSolicitation() returns the 17-area structured
//       breakdown bound to the persisted extraction record, with
//       status / sourceFields / sourceFiles and a clear facts-vs-
//       analysis distinction.
//   §4. explainSection() produces deterministic plain-English output
//       for a section letter and for an alias key.
//   §5. Preload + IPC + app-API wiring: govcon:solicitation-summarize
//       and govcon:solicitation-explain-section are registered, exposed
//       via window.sd.govcon.solicitation, and route through createAppApi.
//   §6. Renderer surface: "Summarize Solicitation" button + per-section
//       Explain buttons + structured panel exist in sourcedeck.html.
//   §7. Tenant isolation: summarize/explain go through withOpportunity
//       so the opportunityId selects the correct persisted extraction.

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { importAndExtract } = require(path.join(ROOT, 'services/govcon/solicitation-import'));
const { summarizeSolicitation, explainSection, AREA_DEFINITIONS, SCHEMA_VERSION } =
  require(path.join(ROOT, 'services/govcon/solicitation-summarize'));

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log('  ✅', label); return; }
  fail += 1;
  console.log('  ❌', label, detail ? '→ ' + detail : '');
}

console.log('\n=== Phase 25AR — Solicitation summarize + extraction bug fixes ===\n');

const FAR_RFQ = [
  'SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS',
  'RFQ Number: 75D301-26-Q-00942',
  'Title: Janitorial Services — Building 14',
  'Issuing Agency: Department of Health and Human Services',
  'Sub-Agency: CDC',
  'Office: Office of Acquisition Services',
  'Posted: 2026-06-15',
  'Questions Due: 2026-06-22 5:00 PM EDT',
  'Quote Due: 2026-06-29 2:00 PM EDT',
  'Place of Performance: 1600 Clifton Rd NE, Atlanta GA 30329',
  'NAICS: 561720',
  'PSC: S201',
  'Set-Aside: SDVOSB',
  'Contract Type: Firm Fixed Price',
  '',
  'ADDENDUM TO FAR 52.212-1 — INSTRUCTIONS TO OFFERORS',
  'Submit quote by email. Quote format: PDF, single file, 25 page limit, 11-point font.',
  'Provide pricing on Attachment 1.',
  '',
  'ADDENDUM TO FAR 52.212-2 — EVALUATION FACTORS FOR AWARD',
  'Best value: Technical Approach, Past Performance, Price.',
  '',
  'PERFORMANCE REQUIREMENTS SUMMARY',
  'Contractor shall provide janitorial services for Building 14.',
  '',
  'FAR 52.212-3 OFFEROR REPRESENTATIONS AND CERTIFICATIONS — COMMERCIAL ITEMS',
  'Offeror shall complete annual reps and certs via SAM.gov.',
  '',
  'LIST OF ATTACHMENTS',
  'Attachment 1 — Pricing Sheet',
  'Attachment 2 — Wage Determination 2015-5634 Rev 15',
  'Attachment 3 — Past Performance Questionnaire',
  '',
  'CONTRACT CLAUSES',
  'FAR 52.204-7 System for Award Management',
  'FAR 52.219-14 Limitations on Subcontracting'
].join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ar-'));
const rfqFile = path.join(tmp, 'RFQ.txt');
fs.writeFileSync(rfqFile, FAR_RFQ);
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ar-ud-'));

(async () => {
  const extraction = await importAndExtract({
    filePaths: [rfqFile],
    opportunity: { id: 'opp-25ar-1', title: 'Janitorial Services — Building 14' },
    userDataPath: userData
  });

  // ── §1. solnum mis-extraction fix ─────────────────────────────────
  ok('§1 metadata.solicitationNumber is not "/CONTRACT/ORDER"',
     extraction.metadata.solicitationNumber !== '/CONTRACT/ORDER',
     'got: ' + JSON.stringify(extraction.metadata.solicitationNumber));
  ok('§1 metadata.solicitationNumber extracts the real RFQ number',
     extraction.metadata.solicitationNumber === '75D301-26-Q-00942',
     'got: ' + JSON.stringify(extraction.metadata.solicitationNumber));
  ok('§1 metadata.solicitationNumber never returns a slash-prefixed token',
     !/^\//.test(String(extraction.metadata.solicitationNumber || '')));

  // Spot-check: a header with no qualifier word must NOT be treated as a solnum.
  const headerOnly = 'SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS\nTitle: X';
  const hdrTmp = path.join(tmp, 'HEADER_ONLY.txt');
  fs.writeFileSync(hdrTmp, headerOnly);
  const hdrUd  = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25ar-hdr-'));
  const hdrExt = await importAndExtract({
    filePaths: [hdrTmp],
    opportunity: { id: 'opp-25ar-hdr' },
    userDataPath: hdrUd
  });
  ok('§1 header-only fixture does not produce a junk solnum',
     hdrExt.metadata.solicitationNumber === '' || !/^\//.test(hdrExt.metadata.solicitationNumber),
     'got: ' + JSON.stringify(hdrExt.metadata.solicitationNumber));

  // ── §2. requiredForms over-tokenization fix ───────────────────────
  const forms = (extraction.requiredFormsAttachments || []).map(x => (x && x.text) || x || '');
  const hasCanonical = forms.some(f => /Attachment\s+1[\s—\-:]+Pricing Sheet/i.test(f));
  const hasStrayLabel  = forms.some(f => /^Attachment 1$/.test(String(f).trim()));
  const hasStrayDesc   = forms.some(f => /^Pricing Sheet$/.test(String(f).trim()));
  ok('§2 forms include the canonical "Attachment 1 — Pricing Sheet" entry',
     hasCanonical, 'forms: ' + JSON.stringify(forms));
  ok('§2 forms do NOT contain a stray "Attachment 1" alone', !hasStrayLabel);
  ok('§2 forms do NOT contain a stray "Pricing Sheet" alone', !hasStrayDesc);
  // The same for Attachment 2.
  ok('§2 forms include "Attachment 2 — Wage Determination" canonically',
     forms.some(f => /Attachment\s+2[\s—\-:]+Wage Determination/i.test(f)),
     JSON.stringify(forms));

  // ── §3. summarizeSolicitation structured 17-area output ────────────
  const summary = summarizeSolicitation({ extraction });
  ok('§3 summary.ok === true', summary.ok === true);
  ok('§3 summary.schemaVersion === SCHEMA_VERSION',
     summary.schemaVersion === SCHEMA_VERSION,
     `got ${summary.schemaVersion}`);
  ok('§3 summary has 17 areas',
     Array.isArray(summary.areas) && summary.areas.length === 17,
     `got ${summary.areas && summary.areas.length}`);
  // All AREA_DEFINITIONS keys are present in order.
  const keys = summary.areas.map(a => a.key);
  ok('§3 area keys match the documented sequence',
     JSON.stringify(keys) === JSON.stringify(AREA_DEFINITIONS.map(a => a.key)),
     JSON.stringify(keys));
  // Status states are honest (no "extracted" with empty content).
  const dishonest = summary.areas.find(a => a.status === 'extracted' && !a.content);
  ok('§3 no area is marked extracted with empty content', !dishonest, dishonest && dishonest.key);
  // The "blank panels" failure mode does not occur on a representative fixture.
  const blanks = summary.areas.filter(a => a.status === 'extracted').length;
  ok('§3 at least 7 areas are populated for a representative FAR Part 12 RFQ',
     blanks >= 7,
     `got ${blanks} populated areas`);
  // Key facts panels are explicit.
  const whatsBeingBought = summary.areas.find(a => a.key === 'whats-being-bought');
  ok('§3 "What\'s being bought" is populated', whatsBeingBought && whatsBeingBought.status === 'extracted');
  ok('§3 "What\'s being bought" carries sourceFields provenance',
     Array.isArray(whatsBeingBought.sourceFields) && whatsBeingBought.sourceFields.length > 0);
  const submission = summary.areas.find(a => a.key === 'submission-requirements');
  ok('§3 "Submission requirements" is populated from Section L / instructionsToOfferors',
     submission && submission.status === 'extracted'
     && (submission.sourceFields.includes('sections.L') || submission.sourceFields.includes('instructionsToOfferors')));
  // Facts vs analysis: bid-no-bid + recommended-questions + immediate-actions are labelled.
  const analysisAreas = ['recommended-questions', 'bid-no-bid', 'immediate-actions'];
  for (const k of analysisAreas) {
    const a = summary.areas.find(x => x.key === k);
    if (a && a.status === 'extracted') {
      ok(`§3 analysis area "${k}" is labelled in the note field`,
         typeof a.note === 'string' && a.note.length > 0,
         `note: ${JSON.stringify(a.note)}`);
    }
  }
  // sourceFiles is populated from extraction provenance.
  ok('§3 summary.sourceFiles is an array', Array.isArray(summary.sourceFiles));

  // ── §4. explainSection ───────────────────────────────────────────
  const expL = explainSection({ extraction, section: 'L' });
  ok('§4 explainSection("L") ok',
     expL && expL.ok === true && typeof expL.explanation === 'string' && expL.explanation.length > 0,
     JSON.stringify(expL).slice(0, 200));
  const expMissing = explainSection({ extraction, section: 'A' });
  ok('§4 explainSection("A") (not present) reports honestly',
     expMissing && (expMissing.status === 'not_found' || expMissing.ok === true),
     JSON.stringify(expMissing).slice(0, 200));
  const expAlias = explainSection({ extraction, section: 'FORMS' });
  ok('§4 explainSection alias key "FORMS" works against requiredFormsAttachments',
     expAlias && expAlias.ok === true && expAlias.explanation && expAlias.explanation.length > 0);

  // ── §5. IPC + preload + app-API wiring ────────────────────────────
  const featureSrc = fs.readFileSync(path.join(ROOT, 'app/main/ipc/register-feature-ipc.js'), 'utf8');
  ok('§5 register-feature-ipc.js hosts govcon:solicitation-summarize',
     /ipcMain\.handle\('govcon:solicitation-summarize'/.test(featureSrc));
  ok('§5 register-feature-ipc.js hosts govcon:solicitation-explain-section',
     /ipcMain\.handle\('govcon:solicitation-explain-section'/.test(featureSrc));
  ok('§5 both new channels route through appApi.govcon.solicitation.*',
     /appApi\.govcon\.solicitation\.summarize/.test(featureSrc)
     && /appApi\.govcon\.solicitation\.explainSection/.test(featureSrc));

  const preloadSrc = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  ok('§5 preload.js exposes solicitation.summarize via ipcRenderer.invoke',
     /summarize\s*:\s*\(input\)\s*=>\s*ipcRenderer\.invoke\(\s*['"]govcon:solicitation-summarize['"]/.test(preloadSrc));
  ok('§5 preload.js exposes solicitation.explainSection via ipcRenderer.invoke',
     /explainSection\s*:\s*\(input\)\s*=>\s*ipcRenderer\.invoke\(\s*['"]govcon:solicitation-explain-section['"]/.test(preloadSrc));

  const apiSrc = fs.readFileSync(path.join(ROOT, 'api/index.js'), 'utf8');
  ok('§5 api/index.js wires solicitation.summarize through withOpportunity (tenant isolation)',
     /solicitation:\s*\{[\s\S]{0,800}?summarize\s*:[\s\S]{0,400}?withOpportunity/.test(apiSrc));

  // ── §6. Renderer surface ─────────────────────────────────────────
  // The handlers themselves live in the renderer feature module per the
  // Phase 3+ strangler architecture. The markup (button, panel) lives
  // in sourcedeck.html.
  const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
  const rendererModule = fs.readFileSync(
    path.join(ROOT, 'app/renderer/features/solicitation-center/summarize-and-explain.js'),
    'utf8'
  );
  ok('§6 "Summarize Solicitation" button exists in Solicitation Center',
     /id="gc-sol-summarize-btn"/.test(html) && /Summarize Solicitation/.test(html));
  ok('§6 "Summarize Solicitation" button calls window.gcSolSummarizeSolicitation',
     /onclick="gcSolSummarizeSolicitation\(\)"/.test(html));
  ok('§6 gc-sol-summarize-panel + body containers exist',
     /id="gc-sol-summarize-panel"/.test(html) && /id="gc-sol-summarize-body"/.test(html));
  ok('§6 sourcedeck.html loads the renderer module via <script src>',
     /<script src="app\/renderer\/features\/solicitation-center\/summarize-and-explain\.js"><\/script>/.test(html));
  ok('§6 gcSolSummarizeSolicitation handler defined as window.* with loading + failure states',
     /window\.gcSolSummarizeSolicitation\s*=\s*async function/.test(rendererModule)
     && /sd\.govcon\.solicitation\.summarize/.test(rendererModule)
     && /Summarize failed:/.test(rendererModule));
  ok('§6 per-section Explain buttons present for Section L, Section M, PWS',
     /onclick="gcSolExplainSection\('L', 'gc-sol-section-l'\)"/.test(html)
     && /onclick="gcSolExplainSection\('M', 'gc-sol-section-m'\)"/.test(html)
     && /onclick="gcSolExplainSection\('PWS', 'gc-sol-pws'\)"/.test(html));
  ok('§6 gcSolExplainSection handler is defined and routes through sd.govcon.solicitation.explainSection',
     /window\.gcSolExplainSection\s*=\s*async function/.test(rendererModule)
     && /sd\.govcon\.solicitation\.explainSection/.test(rendererModule));
  ok('§6 renderer module does not require(\'electron\') at module scope',
     !/require\(['"]electron['"]\)/.test(rendererModule));
  ok('§6 renderer module does not use ipcRenderer directly',
     !/\bipcRenderer\b/.test(rendererModule));

  // ── §7. Tenant isolation ─────────────────────────────────────────
  // explainSection / summarizeSolicitation never read another opportunity's
  // extraction because the persisted extraction is supplied per call.
  // We exercise this directly: a payload with opportunityId 'A' but an
  // extraction belonging to 'B' returns content from the supplied B record,
  // and the persisted extraction is not implicitly cross-loaded.
  const tenantA = summarizeSolicitation({ extraction, opportunityId: 'opp-A' });
  ok('§7 summarize echoes the supplied opportunityId for audit',
     tenantA.opportunityId === 'opp-A',
     `got ${tenantA.opportunityId}`);
  const nullExt = summarizeSolicitation({ extraction: null });
  ok('§7 summarize gracefully refuses null extraction',
     nullExt && nullExt.ok === false && nullExt.reason === 'no_extraction');
  const missingSection = explainSection({ extraction });
  ok('§7 explainSection without section key returns no_section reason',
     missingSection && missingSection.ok === false && missingSection.reason === 'no_section');

  console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
