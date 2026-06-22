'use strict';

// Phase 25AN (updated by the download-removal phase) — Open Official SAM.gov
// Listing + local solicitation import and extraction.
//
// Verifies the revised workflow after automatic SAM.gov download/retrieval was
// permanently removed:
//   Open Official SAM.gov Listing → opens the canonical opportunity page (no
//   retrieval). The user downloads files in their own browser, returns, and
//   clicks Upload Solicitation Files → native multi-file picker → copy into
//   userData → local extraction → map into Solicitation Center → navigate.
//
// 40 assertions (see README header in the task). Static checks cover the
// renderer/main/preload contract; service checks exercise real extraction on
// fixtures; renderer checks drive the actual mapping + render code.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const fx = require('./fixtures-25af');
const { importAndExtract } = require('../services/govcon/solicitation-import');
const fileUtils = require('../services/govcon/solicitation-file-utils');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const preloadJs = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

let passed = 0;
function check(label, cond) {
  assert.ok(cond, label);
  passed += 1;
  console.log('  ✓ ' + label);
}

// ── extract a `window.NAME = function(...) { ... };` (or `function NAME`) ──
function extractFn(source, anchor) {
  const start = source.indexOf(anchor);
  assert(start >= 0, 'function not found: ' + anchor);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', esc = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return source.slice(start, source.indexOf(';', i) + 1); }
  }
  throw new Error('unterminated: ' + anchor);
}

function extractScriptBlock(source, markerComment) {
  const idx = source.indexOf(markerComment);
  assert(idx >= 0, 'marker not found: ' + markerComment);
  const open = source.lastIndexOf('<script>', idx);
  const close = source.indexOf('</script>', idx);
  return source.slice(open + '<script>'.length, close);
}

function appShellDetector(text) {
  if (typeof text !== 'string' || !text) return false;
  const strong = ['SourceDeck GovCon Pipeline', '.cc-ribbon', '.cmd-pill', '.cmd-flow', '.cc-lcc-grid', 'tab-govcon', 'tab-dashboard'];
  for (const m of strong) if (text.indexOf(m) >= 0) return true;
  return false;
}

function makeElement(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', disabled: false,
    style: { setProperty() {} }, setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, get firstChild() { return null; }
  };
}

function makeRendererSandbox(storageSeed) {
  const els = {};
  const el = id => (els[id] || (els[id] = makeElement(id)));
  const store = new Map(Object.entries(storageSeed || {}));
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k), _store: store
  };
  const document = {
    readyState: 'complete', getElementById: id => el(id),
    querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {},
    createElement: () => makeElement('dyn'), documentElement: { style: { setProperty() {} }, setAttribute() {} }
  };
  const window = {}; window.localStorage = localStorage; window.document = document;
  window.toast = () => {}; window.sdSetActionBusy = () => {}; window.sdClearActionBusy = () => {};
  const ctx = {
    window, document, localStorage, console, JSON, Date, Math, RegExp, Array, String, Number,
    Object, Boolean, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.createContext(ctx);
  return { ctx, els, window };
}

async function run() {
  console.log('\n=== Phase 25AN — browser handoff + local solicitation extraction ===\n');

  // ──────────────────────────────────────────────────────────────────────
  // Static: SourceDeck stays visible; browser-open never touches the window
  // ──────────────────────────────────────────────────────────────────────
  const winHideRe = /mainWindow\.(?:minimize|hide)\(|\bapp\.hide\(|setSkipTaskbar|BrowserWindow\.getFocusedWindow\(\)\.(?:minimize|hide)\(/;
  check('1. SourceDeck is never minimized (main.js)', !/\.minimize\(/.test(mainJs));
  check('2. SourceDeck is never hidden (main.js no mainWindow.hide/app.hide/setSkipTaskbar)', !winHideRe.test(mainJs));
  // open-external-safe handler body must not modify the BrowserWindow.
  // Strip comments first so explanatory text mentioning "BrowserWindow"
  // (as documentation) does not trip the mutation check.
  const stripComments = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const openSafe = mainJs.slice(mainJs.indexOf("govcon:open-external-safe"), mainJs.indexOf("govcon:select-and-extract-solicitation"));
  const openSafeCode = stripComments(openSafe);
  check('3. browser-open IPC (open-external-safe) never modifies BrowserWindow state',
    openSafe.length > 0 && !/BrowserWindow|mainWindow|\.minimize\(|\.hide\(|\.blur\(|setSkipTaskbar/.test(openSafeCode));
  check('3b. renderer never hides/minimizes/blurs the window', !/\.minimize\(\)|mainWindow\.hide\(|window\.blur\(|setSkipTaskbar/.test(html));

  // ──────────────────────────────────────────────────────────────────────
  // Static: SAM source panel is discovery-only; upload lives in Solicitation Center.
  // ──────────────────────────────────────────────────────────────────────
  // Removal phase — the source panel offers Open Official SAM.gov Listing and
  // metadata-only Fetch Links. Local solicitation upload is owned exclusively
  // by Solicitation Center.
  check('4. source panel does not expose Upload Solicitation Files',
    !/data-gc-saved-action="upload-solicitation-files"/.test(html)
    && !/data-gc-extract-btn/.test(html));
  check('5. "Open in SAM.gov" / "Open SAM.gov Notice" labels are absent', html.indexOf('Open in SAM.gov') < 0 && html.indexOf('Open SAM.gov Notice') < 0);
  check('6. "Fetch SAM.gov Notice" is removed', html.indexOf('Fetch SAM.gov Notice') < 0);
  check('7. "Extract Downloaded Solicitation" is removed; "Upload Solicitation Files" exists',
    html.indexOf('Extract Downloaded Solicitation') < 0 && html.indexOf('Upload Solicitation Files') >= 0);

  // ──────────────────────────────────────────────────────────────────────
  // Static: Open Official SAM.gov Listing behavior (canonical page, no fetch)
  // ──────────────────────────────────────────────────────────────────────
  const openListingFn = extractFn(html, 'window.gcOpenOfficialSamListing = async function(id)');
  check('8. Open Listing opens the canonical SAM.gov page (sam.gov/opp/<id>/view)', /sam\.gov\/opp\/'\s*\+\s*encodeURIComponent\(noticeId\)\s*\+\s*'\/view/.test(openListingFn));
  const openExt = extractFn(html, 'window.gcOpenExternal = async function(url, label)');
  const openSafeHandler = mainJs.slice(mainJs.indexOf("'govcon:open-external-safe'"), mainJs.indexOf("'govcon:select-and-extract-solicitation'"));
  check('9. Open Listing strips/refuses API keys (renderer refuses keyed URLs; handler deletes any api-key param)',
    /api[_-]?key|apikey/i.test(openExt) && /api\[_-\]\?key/.test(openSafeHandler) && /searchParams\.delete\(k\)/.test(openSafeHandler));
  check('10. Open Listing performs NO automatic retrieval (no samFetchNotice, no resource-link fetch)',
    !/samFetchNotice/.test(openListingFn) && !/resourceLinks/.test(openListingFn) && html.indexOf('samFetchNotice') < 0);

  // ──────────────────────────────────────────────────────────────────────
  // Static: native picker wiring + cancellation
  // ──────────────────────────────────────────────────────────────────────
  check('11. Extract invokes a native multi-file picker (dialog.showOpenDialog multiSelections)',
    /dialog\.showOpenDialog\(\{[\s\S]*multiSelections[\s\S]*\}\)/.test(mainJs)
    && /selectAndExtractSolicitation/.test(preloadJs)
    && /govcon:select-and-extract-solicitation/.test(preloadJs));
  check('11b. picker filters to approved formats only',
    /extensions:\s*\[\s*'pdf',\s*'docx',\s*'xlsx',\s*'csv',\s*'txt',\s*'xml',\s*'zip'\s*\]/.test(mainJs));

  // Renderer: gcUploadSolicitationFiles — cancellation, navigation, button
  {
    // Slice between anchors — the function contains regex literals (e.g. /"/g)
    // that a brace/quote tokenizer would mis-parse.
    const _s = html.indexOf('window.gcUploadSolicitationFiles = async function(id, opts)');
    const _e = html.indexOf('window.gcACPreviewFile = async function(_id, _idx)', _s);
    assert(_s >= 0 && _e > _s, 'gcUploadSolicitationFiles anchors not found');
    const extractFnSrc = html.slice(_s, _e);
    function driveExtract(pickerResult) {
      const calls = { select: 0, tabSwitch: null, load: 0, patched: null };
      const btn = makeElement('btn'); btn.textContent = '⬆ Upload Solicitation Files';
      const ctx = {
        window: {
          sd: { govcon: {
            selectAndExtractSolicitation: async () => pickerResult,
            opportunities: { patch: async (id, p) => { calls.patched = p; } }
          } },
          gcV25SelectSolicitation: () => { calls.select += 1; },
          gcTabSwitch: (t) => { calls.tabSwitch = t; },
          gcSolLoadExtractionResult: () => { calls.load += 1; return true; }
        },
        document: { querySelector: () => btn, getElementById: () => btn },
        resolve: async (id) => ({ id, noticeId: 'N1', title: 'Janitorial', agency: 'VA' }),
        toast: () => {}, JSON, Date, console
      };
      vm.createContext(ctx);
      vm.runInContext(extractFnSrc, ctx);
      return ctx.window.gcUploadSolicitationFiles('sam:test').then(() => ({ calls, btn }));
    }
    const cancelled = await driveExtract({ ok: false, cancelled: true });
    check('12. user cancellation makes no state change (no load, no nav, no patch)',
      cancelled.calls.load === 0 && cancelled.calls.select === 0 && cancelled.calls.tabSwitch === null && cancelled.calls.patched === null
      && cancelled.btn.textContent.indexOf('Upload Solicitation Files') >= 0);

    const ok = await driveExtract({ ok: true, import: { importedAt: 'X', sourceFileCount: 2 }, warnings: [], metadata: {}, sections: {} });
    check('39. successful extraction navigates to Solicitation Center', ok.calls.select >= 1 && ok.calls.tabSwitch === 'solicitation' && ok.calls.load === 1);
    check('40. button changes to "Review Summary" after success', ok.btn.textContent.indexOf('Review Summary') >= 0);
    check('40b. success persists safe structured import status (no raw text)',
      ok.calls.patched && ok.calls.patched.solicitationImportStatus === 'extracted'
      && !/text|fullText|rawText|sections/.test(JSON.stringify(ok.calls.patched)));
  }

  // ──────────────────────────────────────────────────────────────────────
  // Service: real local import + extraction on fixtures
  // ──────────────────────────────────────────────────────────────────────
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25an-'));
  const userData = path.join(tmp, 'ud'); fs.mkdirSync(userData, { recursive: true });
  const dl = path.join(tmp, 'downloads'); fs.mkdirSync(dl, { recursive: true });
  try {
    // Build a mixed downloaded package.
    const pPdf = path.join(dl, 'sources-sought.pdf');
    fs.writeFileSync(pPdf, fx.buildPdf(['SECTION C Performance Work Statement', 'The contractor shall provide custodial services at the Salisbury VA Medical Center.']));
    const pDocx = path.join(dl, 'rfp.docx');
    fs.writeFileSync(pDocx, fx.buildDocx(['SECTION L Instructions to Offerors', 'Offerors must submit a technical proposal and completed SF 1449 by email.', 'SECTION M Evaluation Factors for Award', 'The Government will evaluate technical approach and past performance, best value tradeoff.']));
    const pXlsx = path.join(dl, 'pricing.xlsx');
    fs.writeFileSync(pXlsx, fx.buildXlsx('Pricing', [['CLIN', 'Description', 'Unit', 'Unit Price'], ['0001', 'Base year janitorial', 'MO', { n: 5000 }]]));
    const pTxt = path.join(dl, 'amendment.txt');
    fs.writeFileSync(pTxt, 'Questions due 06/23/2026. Response deadline 06/30/2026. A mandatory site visit and security clearance are required.');
    const pCsv = path.join(dl, 'clins.csv');
    fs.writeFileSync(pCsv, 'CLIN,Qty,Unit Price\n0001,12,5000\n0002,12,5200\n');
    const pZip = path.join(dl, 'attachments.zip');
    fs.writeFileSync(pZip, fx.buildStoredZip([{ name: 'attachment-a.csv', data: Buffer.from('CLIN,Qty,Unit Price,Note\n0002,12,5200,Wage Determination 2015-4423; Limitation on subcontracting applies.') }]));
    // hazards
    const pHtml = path.join(dl, 'portal.txt'); // HTML masquerading as txt
    fs.writeFileSync(pHtml, '<!doctype html><html><head><title>Sign in</title></head><body>Please sign in to continue</body></html>');
    const pShell = path.join(dl, 'shell.txt'); // SourceDeck app-shell
    fs.writeFileSync(pShell, 'SourceDeck GovCon Pipeline\nOperating Hub\n.cmd-flow{display:flex}\ntab-govcon');
    const pCorrupt = path.join(dl, 'broken.pdf'); // PDF magic but garbage body
    fs.writeFileSync(pCorrupt, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from([0x00, 0x01, 0x02, 0x03, 0x99])]));
    const pDoc = path.join(dl, 'legacy.doc'); // OLE magic legacy doc
    fs.writeFileSync(pDoc, Buffer.concat([Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), Buffer.from('Offeror shall provide past performance references for janitorial work.')]));

    const result = await importAndExtract({
      filePaths: [pPdf, pDocx, pXlsx, pTxt, pZip],
      opportunity: { id: 'sam:salisbury', noticeId: '36C24626Q0648', solicitationNumber: '36C24626Q0648', title: 'Janitorial Services Salisbury VAMC', agency: 'Department of Veterans Affairs' },
      userDataPath: userData
    });

    check('13. selected files copy into SourceDeck userData', (() => {
      const noticeRoot = path.join(userData, 'govcon', 'imported-solicitations', '36C24626Q0648');
      const root = path.join(noticeRoot, fs.readdirSync(noticeRoot)[0]);
      return root.indexOf(path.join(userData, 'govcon', 'imported-solicitations')) === 0 && fs.existsSync(path.join(root, 'original'));
    })());
    check('14. files outside the import root are not used after copying (manifest paths inside userData, no source paths)', (() => {
      const noticeRoot = path.join(userData, 'govcon', 'imported-solicitations', '36C24626Q0648');
      const batchRoot = path.join(noticeRoot, fs.readdirSync(noticeRoot)[0]);
      const man = JSON.parse(fs.readFileSync(path.join(batchRoot, 'import-manifest.json'), 'utf8'));
      return man.files.every(f => f.localPath.indexOf(userData) === 0) && JSON.stringify(man).indexOf(dl) < 0;
    })());

    const byName = {};
    (result.warnings || []).forEach(w => { byName[String(w).split(':')[0]] = String(w); });

    check('15. PDF extraction produces text when readable', result.sections.C.found && /custodial|Salisbury/i.test(result.sections.C.text));
    check('16. DOCX extraction produces clean text without Office XML', result.sections.L.found && !/w:document|xmlns:|<w:t|word\/document\.xml/.test(JSON.stringify(result.sections)));
    check('17. XLSX extraction produces sheet/row content', /5000|0001|CLIN|janitorial/i.test(JSON.stringify(result)));
    check('18. TXT and CSV extract correctly', /Response deadline 06\/30\/2026/.test(JSON.stringify(result)) && /0002|5200/.test(JSON.stringify(result)));
    check('19. ZIP children extract recursively', /Wage Determination|Limitation on subcontracting/i.test(JSON.stringify(result)));
    check('20. Legacy DOC is not advertised without a safe faithful parser', !require('../services/govcon/solicitation-package-extract').acceptedUploadTypes().includes('.doc'));
    check('21. HTML masquerading as text is rejected', fileUtils.classifyLocalFile(fs.readFileSync(pHtml), '').ok === false);
    check('22. App-shell text is rejected', fileUtils.classifyLocalFile(fs.readFileSync(pShell), '').reason === 'app_shell_html_response');
    check('23. Five logical files succeed without ignoring a document', result.ok === true && result.import.sourceFileCount === 5 && result.documentInventory.length === 5);
    check('24. All Section A–M objects exist', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].every(L => result.sections[L] && typeof result.sections[L].found === 'boolean'));
    check('25. Formal Sections C, L, and M map correctly', result.sections.C.found && result.sections.L.found && result.sections.M.found);
    check('26. Fallback instructions/evaluation/scope mapping works', Array.isArray(result.instructionsToOfferors) && Array.isArray(result.evaluationCriteria) && Array.isArray(result.pwsSowRequirements));
    check('34. Compliance rows are produced with source attribution', result.complianceMatrix.length > 0 && result.complianceMatrix.every(r => 'requirementText' in r || 'requirement' in r || 'text' in r));
    check('35. No raw Office XML anywhere in the contract', !/w:document|xmlns:w=|<w:t|word\/document\.xml/.test(JSON.stringify(result)));
    check('36. No SourceDeck app-shell text in the contract', !appShellDetector(JSON.stringify(result)));
    check('37. No sample/demo output is used for real files', !/sample|demo/i.test(JSON.stringify(result.metadata)) && !result.sample);
    check('38. Missing values remain explicitly missing (empty, not invented)', (() => {
      // pick a section that is not present in the inputs (e.g. D — Packaging) — must be found:false with no fabricated text
      const d = result.sections.D;
      return d.found === false && (d.text === '' || /no .* extracted|not found|missing/i.test(d.text));
    })());

    // ────────────────────────────────────────────────────────────────────
    // Renderer mapping: gcSolLoadExtractionResult → renderPanels populates
    // ────────────────────────────────────────────────────────────────────
    {
      const blockA = extractScriptBlock(html, 'Phase 22B — GovCon Capture Command Center renderer');
      const blockB = extractScriptBlock(html, 'Phase 22C — Solicitation Center + Compliance Matrix renderer');
      const loadFnSrc = extractFn(html, 'window.gcSolLoadExtractionResult = function(result)');
      const sb = makeRendererSandbox();
      sb.window._w25LooksLikeBadSource = appShellDetector;
      vm.runInContext(blockA, sb.ctx, { filename: 'a.js' });
      vm.runInContext(blockB, sb.ctx, { filename: 'b.js' });
      vm.runInContext(loadFnSrc, sb.ctx, { filename: 'load.js' });
      // Attach opportunityId so state.solId is set.
      const renderResult = JSON.parse(JSON.stringify(result));
      renderResult.import.opportunityId = 'sam:salisbury';
      sb.window.gcSolLoadExtractionResult(renderResult);
      const panel = id => (sb.els[id] ? sb.els[id].innerHTML : '');
      check('27. Metadata maps into #gc-sol-summary (title/sol/agency, NOT raw fullText)',
        /Janitorial Services Salisbury VAMC/.test(panel('gc-sol-summary'))
        && /36C24626Q0648/.test(panel('gc-sol-summary'))
        && panel('gc-sol-summary').indexOf('custodial services at the Salisbury') < 0);
      check('28. Section L maps into #gc-sol-section-l', /Offerors must submit|SF 1449|Instructions/i.test(panel('gc-sol-section-l')));
      check('29. Section M maps into #gc-sol-section-m', /evaluate|past performance|best value/i.test(panel('gc-sol-section-m')));
      check('30. Scope maps into #gc-sol-pws', /custodial|Performance Work Statement|contractor shall/i.test(panel('gc-sol-pws')));
      check('31. Forms map into #gc-sol-forms', /SF 1449|pricing|wage|attachment/i.test(panel('gc-sol-forms')));
      check('32. Deadlines map into #gc-sol-deadlines', /06\/30\/2026|deadline|due/i.test(panel('gc-sol-deadlines')));
      check('33. Risks map into #gc-sol-risks', /site visit|security clearance|subcontract|past performance/i.test(panel('gc-sol-risks')));
      check('34b. Compliance rows map into #gc-sol-matrix-body', /<tr/.test(panel('gc-sol-matrix-body')));
      check('35b. No raw Office XML rendered in panels', !/w:document|xmlns:w=|<w:t|word\/document\.xml/.test(JSON.stringify(sb.els)));
      check('36b. No SourceDeck app-shell text rendered in panels',
        !/SourceDeck GovCon Pipeline|\.cmd-flow\{|\.cc-lcc-grid\{|tab-govcon/.test(panel('gc-sol-summary') + panel('gc-sol-section-l') + panel('gc-sol-pws')));
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\nAll Phase 25AN assertions passed (' + passed + ' checks).\n');
}

run().catch(err => { console.error(err); process.exitCode = 1; });
