// Phase 25L.2 · Proposal Workspace · solicitation upload + extraction
// ──────────────────────────────────────────────────────────────────────
// Asserts the Proposal Workspace ships a Solicitation Intake panel that
// accepts an .pdf / .docx / .txt / .md upload or pasted raw text, runs
// a local heuristic extractor, and renders 5 FAR-aligned category
// cards (Metadata & Summary, Place of Performance, Subcontractor ID &
// Proposal Prep, Compliance & Submission Requirements, Site Visit
// Details & Logistics). Each category card opens a section workspace
// with notes, draft, Approve / Needs revision / Retry with notes /
// Finalize / Reset controls.
//
// Boundaries: local only, FAR references advisory, no portal upload,
// no email send, no full-proposal one-click generation.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.error('  ✗ ' + name + ': ' + e.message); }
}

console.log('Phase 25L.2 · Proposal Workspace · solicitation upload + extraction');

// ── Solicitation intake panel ────────────────────────────────────────
test('Solicitation Intake panel exists in Proposal Workspace', () => {
  if (!/id="pw-solicitation-intake"/.test(HTML))
    throw new Error('Solicitation Intake card missing');
  if (!/data-pw-solicitation-intake="true"/.test(HTML))
    throw new Error('Solicitation Intake card not marked with data attribute');
});

test('Upload Solicitation / RFQ / RFP button present', () => {
  if (!/Upload Solicitation \/ RFQ \/ RFP/.test(HTML))
    throw new Error('Upload Solicitation / RFQ / RFP button label missing');
  if (!/onclick="pwSolOpenFilePicker\(\)"/.test(HTML))
    throw new Error('pwSolOpenFilePicker handler not wired');
});

test('Paste Solicitation Text button present', () => {
  if (!/Paste Solicitation Text/.test(HTML))
    throw new Error('Paste Solicitation Text button label missing');
  if (!/onclick="pwSolTogglePasteArea\(\)"/.test(HTML))
    throw new Error('pwSolTogglePasteArea handler not wired');
  if (!/id="pw-sol-paste-text"/.test(HTML))
    throw new Error('Paste textarea missing');
});

test('Extract Key Details button present', () => {
  if (!/Extract Key Details/.test(HTML))
    throw new Error('Extract Key Details button label missing');
  if (!/onclick="pwSolExtractKeyDetails\(\)"/.test(HTML))
    throw new Error('pwSolExtractKeyDetails handler not wired');
});

test('Clear Uploaded Solicitation button present', () => {
  if (!/Clear Uploaded Solicitation/.test(HTML))
    throw new Error('Clear Uploaded Solicitation button label missing');
  if (!/onclick="pwSolClearUploaded\(\)"/.test(HTML))
    throw new Error('pwSolClearUploaded handler not wired');
});

test('Linked pursuit / GovCon record id input present', () => {
  if (!/id="pw-sol-link-pursuit"/.test(HTML))
    throw new Error('Linked pursuit input missing');
});

test('Accepted file types include pdf, docx, txt, md', () => {
  const m = HTML.match(/id="pw-sol-file"[^>]*accept="([^"]+)"/);
  if (!m) throw new Error('File input or accept attribute missing');
  const accept = m[1].toLowerCase();
  for (const ext of ['.pdf','.docx','.txt','.md']){
    if (!accept.includes(ext)) throw new Error('accept missing ' + ext);
  }
});

// ── Safety / boundary copy on intake panel ───────────────────────────
test('Intake panel carries "local only · no government upload" copy', () => {
  if (!/no government upload, no portal submission, no email send/i.test(HTML))
    throw new Error('No-upload / no-submit copy missing from intake panel');
});

test('Intake panel warns about CUI / PHI / source-selection material', () => {
  if (!/classified, CUI, PHI, or sensitive source-selection material/i.test(HTML))
    throw new Error('CUI / PHI / sensitive-material warning missing');
});

// ── Extraction display container ─────────────────────────────────────
test('Extracted Key Details display container exists', () => {
  if (!/id="pw-solicitation-extraction"/.test(HTML))
    throw new Error('Extraction display container missing');
  if (!/data-pw-extraction-display="true"/.test(HTML))
    throw new Error('Extraction display data attribute missing');
  if (!/id="pw-extraction-cards"/.test(HTML))
    throw new Error('Extraction cards grid missing');
  if (!/id="pw-extraction-ambiguity"/.test(HTML))
    throw new Error('Ambiguity / high-risk flag block missing');
});

// ── 5 FAR-aligned categories defined in JS ───────────────────────────
test('5 FAR-aligned categories are registered in the renderer', () => {
  const required = [
    { id: 'metadata-summary',       title: 'Solicitation Metadata & Summary'      },
    { id: 'place-of-performance',   title: 'Place of Performance'                  },
    { id: 'subcontractor-id-prep',  title: 'Subcontractor ID & Proposal Prep'      },
    { id: 'compliance-submission',  title: 'Compliance & Submission Requirements'  },
    { id: 'site-visit-logistics',   title: 'Site Visit Details & Logistics'        }
  ];
  for (const c of required){
    const idRe = new RegExp("id:\\s*'" + c.id + "'");
    if (!idRe.test(HTML)) throw new Error('CATEGORIES entry missing id="' + c.id + '"');
    if (!HTML.includes(c.title)) throw new Error('Category title missing: ' + c.title);
  }
});

// ── FAR references advisory only (no certified-compliance claim) ─────
test('FAR references are advisory only — explicit "guidance only" / "advisory" copy', () => {
  if (!/FAR\s+(?:references|Part\s+15|Part\s+12|Subpart\s+19\.7)/i.test(HTML))
    throw new Error('FAR reference text missing from extraction module');
  // Either form is acceptable:
  //   "SourceDeck advisory only — does not claim legal advice or compliance certification"
  //   "SourceDeck does not provide legal advice and does not claim compliance certification"
  if (!/does not claim legal advice or compliance certification/i.test(HTML) &&
      !/does not provide legal advice and does not claim compliance certification/i.test(HTML)) {
    throw new Error('No-legal-advice / no-cert-compliance disclaimer missing from extraction surface');
  }
});

// ── Section workspace controls ───────────────────────────────────────
test('Per-category section workspace exposes Draft / Approve / Needs revision / Retry / Finalize / Reset', () => {
  const actions = [
    'data-pw-sol-action="draft-this-section"',
    'data-pw-sol-action="mark-drafted"',
    'data-pw-sol-action="approve"',
    'data-pw-sol-action="needs-revision"',
    'data-pw-sol-action="retry-with-notes"',
    'data-pw-sol-action="finalize"',
    'data-pw-sol-action="reset-section"'
  ];
  for (const tag of actions){
    if (!HTML.includes(tag)) throw new Error('Editor action missing: ' + tag);
  }
});

test('"Draft this section" button label present', () => {
  if (!/Draft this section/.test(HTML))
    throw new Error('"Draft this section" button label missing');
});

test('Section workspace exposes notes + draft textareas', () => {
  if (!/id="pw-sol-notes"/.test(HTML))
    throw new Error('Per-category notes textarea missing');
  if (!/id="pw-sol-draft"/.test(HTML))
    throw new Error('Per-category draft textarea missing');
});

// ── Public window-level handlers ─────────────────────────────────────
test('Public Phase 25L.2 handlers are defined on window', () => {
  const required = [
    'window.pwSolOpenFilePicker',
    'window.pwSolOnFileChosen',
    'window.pwSolTogglePasteArea',
    'window.pwSolExtractKeyDetails',
    'window.pwSolClearUploaded',
    'window.pwSolOpenCategory',
    'window.pwSolSetStatus',
    'window.pwSolDraftCategory',
    'window.pwSolRetryWithNotes'
  ];
  for (const fn of required){
    if (!HTML.includes(fn + ' = function')) throw new Error(fn + '() not defined');
  }
});

// ── Heuristic extractor: end-to-end sandbox test ─────────────────────
test('extractKeyDetails() heuristic produces 5 categories from a sample solicitation', () => {
  // Pull the Phase 25L.2 IIFE block and run extractKeyDetails() in a vm
  // sandbox so we can assert behavior end-to-end.
  const startMarker = '/* Phase 25L.2 — Proposal Workspace · Solicitation Intake + Extraction.';
  const startIdx = HTML.indexOf(startMarker);
  if (startIdx < 0) throw new Error('Phase 25L.2 script block not found');
  const endIdx = HTML.indexOf('</script>', startIdx);
  if (endIdx < 0) throw new Error('Phase 25L.2 script block end not found');
  let block = HTML.slice(startIdx, endIdx);

  // Capture extractKeyDetails by appending an export line inside the IIFE.
  // Replace the closing `})();` of the IIFE with a context-bound export.
  block = block.replace(/\}\)\(\);\s*$/m,
    '__exports__.extractKeyDetails = extractKeyDetails; __exports__.CATEGORIES = CATEGORIES;\n})();');

  const sandbox = {
    window: {},
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      readyState: 'complete',
      createElement: () => ({ style: {}, setAttribute: () => {}, click: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} }
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout: (fn) => { try { fn(); } catch (_) {} },
    console: console,
    __exports__: {}
  };
  vm.createContext(sandbox);
  try {
    vm.runInContext(block, sandbox);
  } catch (e) {
    throw new Error('Phase 25L.2 script failed to execute: ' + e.message);
  }

  const fn = sandbox.__exports__.extractKeyDetails;
  if (typeof fn !== 'function') throw new Error('extractKeyDetails not exported from sandbox');

  const sample = [
    'TITLE: Janitorial Services Recompete',
    'AGENCY: Department of Veterans Affairs',
    'Solicitation Number: VA-25-RFP-00177',
    '',
    'This requirement is for daily janitorial services at the VA San Diego healthcare campus.',
    'Place of Performance: 3350 La Jolla Village Dr, San Diego, CA 92161.',
    '',
    'Main Tasks:',
    'Daily cleaning of patient care areas',
    'Weekly floor stripping and refinishing',
    'Monthly window cleaning',
    '',
    'Objectives:',
    'Maintain Joint Commission environmental cleanliness standards',
    'Reduce HAI risk through verified disinfection protocols',
    '',
    'Deliverables:',
    'Daily QC log',
    'Weekly performance scorecard',
    '',
    'Subcontracting Opportunity: Small business participation goal of 30%.',
    'Required Qualifications: ISSA C.I.M.S. certification preferred.',
    '',
    'Evaluation Criteria:',
    'Technical approach, past performance, price.',
    '',
    'Submission Deadlines: Proposals due 2026-07-15 at 14:00 PT.',
    'Q&A Deadline: 2026-06-30 17:00 PT.',
    'Formatting: 12-pt Times New Roman, 1-inch margins, 30-page limit.',
    '',
    'Mandatory Attachments:',
    'SF 1449',
    'Past Performance Information Form',
    '',
    'Point of Contact: Maria Santos, Contracting Officer, maria.santos@va.gov.',
    '',
    'Site Visit Date: 2026-06-22, 10:00 PT, 90 minutes.',
    'RSVP: Email by 2026-06-19.',
    'Site Visit POC: Tom Lee, tom.lee@va.gov.',
    'Security: Government-issued ID required; sign-in mandatory.',
    'Attendance: Mandatory for offer eligibility.'
  ].join('\n');

  const result = fn(sample);
  if (!result || !result.extracted) throw new Error('extractor returned no result');
  const got = result.extracted;
  if (!got['metadata-summary'])      throw new Error('metadata-summary category missing');
  if (!got['place-of-performance'])  throw new Error('place-of-performance category missing');
  if (!got['subcontractor-id-prep']) throw new Error('subcontractor-id-prep category missing');
  if (!got['compliance-submission']) throw new Error('compliance-submission category missing');
  if (!got['site-visit-logistics'])  throw new Error('site-visit-logistics category missing');

  const md = got['metadata-summary'];
  if (!/Janitorial Services Recompete|TITLE/i.test(md.title || ''))
    throw new Error('metadata-summary.title did not extract solicitation title: ' + JSON.stringify(md.title));
  if (!/Veterans Affairs/i.test(md.agency || ''))
    throw new Error('metadata-summary.agency did not extract issuing agency: ' + JSON.stringify(md.agency));
  if (!/VA-25-RFP-00177/.test(md.solicitationNumber || ''))
    throw new Error('metadata-summary.solicitationNumber did not extract sol number: ' + JSON.stringify(md.solicitationNumber));
  if (!md.summary) throw new Error('metadata-summary.summary missing');
  if (!Array.isArray(md.mainTasks) || md.mainTasks.length < 1)
    throw new Error('metadata-summary.mainTasks empty');
  if (!Array.isArray(md.objectives) || md.objectives.length < 1)
    throw new Error('metadata-summary.objectives empty');
  if (!Array.isArray(md.deliverables) || md.deliverables.length < 1)
    throw new Error('metadata-summary.deliverables empty');

  const pop = got['place-of-performance'];
  if (!/San Diego/i.test(pop.primaryAddress || ''))
    throw new Error('place-of-performance.primaryAddress did not extract address');

  const sub = got['subcontractor-id-prep'];
  if (!Array.isArray(sub.subcontractingOpportunities) || sub.subcontractingOpportunities.length < 1)
    throw new Error('subcontractor-id-prep.subcontractingOpportunities empty');

  const comp = got['compliance-submission'];
  if (!Array.isArray(comp.submissionDeadlines) || comp.submissionDeadlines.length < 1)
    throw new Error('compliance-submission.submissionDeadlines empty');
  if (!Array.isArray(comp.pointsOfContact) || comp.pointsOfContact.length < 1)
    throw new Error('compliance-submission.pointsOfContact empty');

  const sv = got['site-visit-logistics'];
  if (!Array.isArray(sv.siteVisitDates) || sv.siteVisitDates.length < 1)
    throw new Error('site-visit-logistics.siteVisitDates empty');

  if (!Array.isArray(result.ambiguities))
    throw new Error('result.ambiguities must be an array');
});

// ── No-send / no-submit / no-upload posture on Phase 25L.2 surfaces ──
test('Phase 25L.2 surfaces preserve no-send / no-submit / no-upload boundary', () => {
  const startMarker = '/* Phase 25L.2 — Proposal Workspace · Solicitation Intake + Extraction.';
  const startIdx = HTML.indexOf(startMarker);
  const endIdx = HTML.indexOf('</script>', startIdx);
  const block = HTML.slice(startIdx, endIdx);
  // Phase 25L.2 surfaces must NEVER carry affirmative submission /
  // legal-advice / certified-compliance claims. Negations like
  // "does not submit" or "does not claim legal advice" are explicitly
  // allowed and are the whole point of the boundary.
  const forbiddenAffirmative = [
    { re: /(?<!not )\bSend Email\b/i,             label: 'Send Email button' },
    { re: /(?<!not )\bSubmit Bid\b/i,             label: 'Submit Bid button' },
    { re: /(?<!not )\bSubmit Quote\b/i,           label: 'Submit Quote button' },
    { re: /(?<!not )\bSubmit Proposal\b/i,        label: 'Submit Proposal button' },
    { re: /(?<!not )\bupload to SAM\b/i,          label: 'upload to SAM' },
    { re: /(?<!not )\bupload to PIEE\b/i,         label: 'upload to PIEE' },
    { re: /(?<!not )\bupload to eBuy\b/i,         label: 'upload to eBuy' },
    { re: /(?<!not )\bupload to acquisition\.gov\b/i, label: 'upload to acquisition.gov' },
    { re: /(?<!not |never |Single section only — SourceDeck )generates? (?:a )?(?:full|complete) proposal\b/i, label: 'full-proposal generation claim' },
    { re: /one[-\s]?click (?:complete )?proposal generated\b/i, label: 'one-click proposal generated' },
    { re: /is signed and notarized/i,             label: 'signed-and-notarized claim' },
    { re: /\bSOC ?2 certified\b/i,                label: 'SOC 2 certified claim' },
    { re: /\bFedRAMP authorized\b/i,              label: 'FedRAMP authorized claim' },
    { re: /\bcertified compliant\b/i,             label: 'certified-compliant claim' },
    { re: /\blegally sufficient\b/i,              label: 'legally-sufficient claim' },
    { re: /\bprovides legal advice\b/i,           label: 'provides-legal-advice claim' }
  ];
  for (const f of forbiddenAffirmative){
    if (f.re.test(block)) throw new Error('Forbidden affirmative phrase present in Phase 25L.2 block: ' + f.label);
  }
});

console.log(failed
  ? 'Phase 25L.2 · Proposal Workspace · solicitation upload + extraction: FAILED'
  : 'Phase 25L.2 · Proposal Workspace · solicitation upload + extraction: OK');
process.exit(failed ? 1 : 0);
