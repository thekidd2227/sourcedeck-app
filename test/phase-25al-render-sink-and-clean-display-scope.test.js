'use strict';

// Phase 25AL — block the app-shell dump render sink + fix cleanDisplayText scope.
//
// Proves:
//   1. Injecting a contaminated state.summary and calling gcSolRender() no
//      longer paints SourceDeck app-shell text into #gc-sol-summary.
//   2. .cmd-flow / .cmd-pill / .cc-lcc-grid / "SourceDeck GovCon Pipeline" are
//      blocked from every Solicitation Center panel (summary, sections, matrix).
//   3. Valid solicitation text still renders verbatim.
//   4. cleanDisplayText is reachable by the Phase 22C renderer (no ReferenceError).
//   5. gcABExtractPackageToCenter / gcSolExtract / gcSolExplainPlainEnglish no
//      longer throw "ReferenceError: cleanDisplayText is not defined".
//   6. The render guard still blocks via the local fallback when the shared
//      detector (window._w25LooksLikeBadSource) is not yet exposed.
//   7. Source-cache-clear wiring remains intact.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'sourcedeck.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Pull the full text of the <script> block that contains a marker comment.
function extractScriptBlock(source, markerComment) {
  const idx = source.indexOf(markerComment);
  assert(idx >= 0, `marker comment not found: ${markerComment}`);
  const open = source.lastIndexOf('<script>', idx);
  const close = source.indexOf('</script>', idx);
  assert(open >= 0 && close > idx, `script block boundaries not found for: ${markerComment}`);
  return source.slice(open + '<script>'.length, close);
}

const BLOCK_A = extractScriptBlock(html, 'Phase 22B — GovCon Capture Command Center renderer');
const BLOCK_B = extractScriptBlock(html, 'Phase 22C — Solicitation Center + Compliance Matrix renderer');

const APP_SHELL_MARKERS = [
  'SourceDeck GovCon Pipeline', 'Operating Hub Dashboard', 'GovCon Find Opportunities',
  '.cmd-flow', '.cmd-pill', '.cc-lcc-grid', 'Revenue Path', 'Generated Leads'
];
const BLOCK_MSG = 'SourceDeck blocked app UI text from being rendered as solicitation content. Clear source cache and re-upload the solicitation files.';

// A faithful stand-in for the shared app-shell detector (mirrors the production
// _w25StrongAppShellTextMarkers / _w25AppShellTextMarkers logic).
function appShellDetector(text) {
  if (typeof text !== 'string' || !text) return false;
  const sample = text.slice(0, 65536);
  const strong = ['SourceDeck GovCon Pipeline', '.cc-ribbon', '.cmd-pill', '.cmd-flow', '.cc-lcc-grid', 'tab-govcon', 'tab-dashboard', 'SourceDeck does not auto-send', 'sourcedeck.html'];
  for (const m of strong) if (sample.indexOf(m) >= 0) return true;
  const weak = strong.concat(['Operating Hub Dashboard', 'GovCon Find Opportunities', 'Readiness', 'Proposal Workspace', 'Solicitation Center', 'Response Desk', 'Revenue Path', 'Generated Leads', 'Social Access Points']);
  let hits = 0;
  for (const m of weak) { if (sample.indexOf(m) >= 0) { hits += 1; if (hits >= 2) return true; } }
  return false;
}

function makeElement(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} },
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    get firstChild() { return null; }
  };
}

function makeSandbox(storageSeed) {
  const els = {};
  const el = id => (els[id] || (els[id] = makeElement(id)));
  const store = new Map(Object.entries(storageSeed || {}));
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    _store: store
  };
  const document = {
    readyState: 'complete',
    getElementById: id => el(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => makeElement('dynamic'),
    documentElement: { style: { setProperty() {} }, setAttribute() {} }
  };
  const window = {};
  window.localStorage = localStorage;
  window.document = document;
  window.toast = () => {};
  window.sdSetActionBusy = () => {};
  window.sdClearActionBusy = () => {};
  const ctx = {
    window, document, localStorage, console,
    JSON, Date, Math, RegExp, Array, String, Number, Object, Boolean, parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.createContext(ctx);
  return { ctx, els, el, window, store };
}

function loadRenderers(sandbox) {
  // Run Phase 22B first (exposes window.sdCleanDisplayText), then Phase 22C.
  vm.runInContext(BLOCK_A, sandbox.ctx, { filename: 'block-22B.js' });
  vm.runInContext(BLOCK_B, sandbox.ctx, { filename: 'block-22C.js' });
}

function run() {
  console.log('\n=== Phase 25AL — render sink guard + cleanDisplayText scope ===\n');

  // ---- Static guarantees in source -------------------------------------
  assert(html.includes('window.sdCleanDisplayText = cleanDisplayText'),
    'cleanDisplayText is exposed on window (shared display helper)');
  assert(BLOCK_B.includes('function cleanDisplayText(s)'),
    'Phase 22C block binds a local cleanDisplayText reference');
  assert(BLOCK_B.includes('_sal25SafeText') && BLOCK_B.includes('_sal25SafeList'),
    'Phase 22C renderPanels uses the render-time app-shell guards');
  assert(BLOCK_B.includes("safeText(_safeSummary)"),
    'gc-sol-summary is rendered through the guarded summary value, not raw state.summary');
  console.log('  ✓ source exposes shared cleanDisplayText and guards the render sink');

  // ---- Scope fix: load both IIFEs, no ReferenceError -------------------
  const sb = makeSandbox();
  loadRenderers(sb);
  assert.strictEqual(typeof sb.window.sdCleanDisplayText, 'function', 'window.sdCleanDisplayText defined by Phase 22B');
  assert.strictEqual(typeof sb.window.gcSolRender, 'function', 'window.gcSolRender defined by Phase 22C');
  assert.strictEqual(typeof sb.window.sdSolRenderGuard, 'function', 'render guard exposed for diagnostics/reuse');
  console.log('  ✓ Phase 22B + Phase 22C load together; cleanDisplayText reachable (no ReferenceError)');

  // ---- The proven dump: contaminated state.summary --------------------
  const APPSHELL = 'SourceDeck GovCon Pipeline Operating Hub Dashboard GovCon Find Opportunities '
    + 'Saved Pursuits Solicitation Center Response Desk Revenue Path Generated Leads '
    + '.cmd-flow{display:flex} .cmd-pill{border-radius:980px} .cc-lcc-grid{grid-template-columns:1fr}';
  const contaminatedState = {
    summary: APPSHELL,
    sections: {
      sectionL: [APPSHELL], sectionM: ['.cc-lcc-grid{grid-template-columns:1fr} tab-govcon'],
      pws: [], forms: [], deadlines: [], risks: []
    },
    matrix: [{ id: 'R-001', source: 'Section L', requirementText: APPSHELL, mandatory: 'Yes' }],
    solId: 'sam:contaminated', real: true
  };

  const dump = makeSandbox({ 'sd.govcon.solWorkspace.v1': JSON.stringify(contaminatedState) });
  dump.window._w25LooksLikeBadSource = appShellDetector;
  loadRenderers(dump);
  assert.doesNotThrow(() => dump.window.gcSolRender(), 'gcSolRender must never throw on contaminated state');

  const summaryHTML = dump.els['gc-sol-summary'].innerHTML;
  for (const m of APP_SHELL_MARKERS) {
    assert(summaryHTML.indexOf(m) < 0, `#gc-sol-summary must NOT contain app-shell marker: ${m}`);
  }
  assert(summaryHTML.indexOf(BLOCK_MSG) >= 0, '#gc-sol-summary shows the safe block message');
  console.log('  ✓ contaminated state.summary is blocked from #gc-sol-summary (dump sink closed)');

  const sectionLHTML = dump.els['gc-sol-section-l'].innerHTML;
  const sectionMHTML = dump.els['gc-sol-section-m'].innerHTML;
  const matrixHTML = dump.els['gc-sol-matrix-body'].innerHTML;
  for (const m of ['.cmd-flow', '.cmd-pill', '.cc-lcc-grid', 'SourceDeck GovCon Pipeline']) {
    assert(sectionLHTML.indexOf(m) < 0, `#gc-sol-section-l must NOT contain ${m}`);
    assert(sectionMHTML.indexOf(m) < 0, `#gc-sol-section-m must NOT contain ${m}`);
    assert(matrixHTML.indexOf(m) < 0, `#gc-sol-matrix-body must NOT contain ${m}`);
  }
  console.log('  ✓ section + matrix panels block .cmd-flow/.cmd-pill/.cc-lcc-grid/nav text');

  // Diagnostic recorded with context/markers/length only — never raw payload.
  const diag = dump.window.sdSolRenderBlockDiagnostics;
  assert(Array.isArray(diag) && diag.length >= 1, 'a lightweight diagnostic is recorded');
  for (const d of diag) {
    assert(typeof d.context === 'string' && Array.isArray(d.markers) && typeof d.length === 'number',
      'diagnostic carries context/markers/length');
    const serialized = JSON.stringify(d);
    assert(serialized.indexOf('.cmd-flow{display:flex}') < 0, 'diagnostic does NOT store the raw blocked payload');
  }
  console.log('  ✓ block diagnostic records context/markers/length only (no raw payload)');

  // ---- Valid solicitation text still renders --------------------------
  const validSummary = 'Janitorial services for the Salisbury VA Medical Center (VAMC). NAICS 561720. SDVOSB set-aside.';
  const valid = makeSandbox({
    'sd.govcon.solWorkspace.v1': JSON.stringify({
      summary: validSummary,
      sections: { sectionL: ['Offeror shall submit a technical quote.'], sectionM: [], pws: [], forms: [], deadlines: [], risks: [] },
      matrix: [], solId: 'sam:valid', real: true
    })
  });
  valid.window._w25LooksLikeBadSource = appShellDetector;
  loadRenderers(valid);
  valid.window.gcSolRender();
  const validHTML = valid.els['gc-sol-summary'].innerHTML;
  assert(validHTML.indexOf('Janitorial services for the Salisbury VA Medical Center') >= 0,
    'valid solicitation summary renders verbatim');
  assert(validHTML.indexOf(BLOCK_MSG) < 0, 'valid summary is NOT blocked');
  assert(valid.els['gc-sol-section-l'].innerHTML.indexOf('Offeror shall submit a technical quote') >= 0,
    'valid section text renders verbatim');
  console.log('  ✓ valid solicitation text still renders (no false positives)');

  // ---- Fallback detector blocks when shared detector absent -----------
  const fallback = makeSandbox({ 'sd.govcon.solWorkspace.v1': JSON.stringify(contaminatedState) });
  // intentionally do NOT set window._w25LooksLikeBadSource
  loadRenderers(fallback);
  assert.doesNotThrow(() => fallback.window.gcSolRender());
  const fbHTML = fallback.els['gc-sol-summary'].innerHTML;
  assert(fbHTML.indexOf('.cmd-flow') < 0 && fbHTML.indexOf('SourceDeck GovCon Pipeline') < 0,
    'fallback markers block app-shell text even without the shared detector');
  assert(fbHTML.indexOf(BLOCK_MSG) >= 0, 'fallback path shows the block message');
  console.log('  ✓ local fallback markers block the dump when shared detector is unavailable');

  // ---- gcSolExplainPlainEnglish reaches cleanDisplayText, no throw ----
  const explain = makeSandbox({ 'sd.govcon.solWorkspace.v1': JSON.stringify({ summary: 'x', sections: {}, matrix: [], packageExtraction: { fullText: 'real solicitation', sections: {}, metadata: {} }, solId: 's', real: true }) });
  explain.window._w25LooksLikeBadSource = appShellDetector;
  explain.window.sd = { govcon: { explainSolicitationPackage: async () => ({ sections: { L: { means: 'Read the instructions.', mustDo: 'Submit a technical quote.' } } }) } };
  loadRenderers(explain);
  let explainThrew = null;
  return Promise.resolve()
    .then(() => explain.window.gcSolExplainPlainEnglish())
    .catch(err => { explainThrew = err; })
    .then(() => {
      assert(!(explainThrew && /cleanDisplayText is not defined/.test(String(explainThrew))),
        'gcSolExplainPlainEnglish must not throw ReferenceError for cleanDisplayText');
      const exHTML = explain.els['gc-sol-summary'].innerHTML;
      assert(exHTML.indexOf('Plain-English package explanation') >= 0, 'explain path renders its summary');
      console.log('  ✓ gcSolExplainPlainEnglish reaches cleanDisplayText and renders (no ReferenceError)');

      // ---- Phase 25AM/25AN — the old download→extract path is retired -----
      // gcABExtractPackageToCenter was the highest-risk contamination path
      // (read on-disk downloaded file → contaminate state.summary → render).
      // Phase 25AM retired it to a no-op; Phase 25AN replaces it with the
      // user-selected local import path (gcExtractDownloadedSolicitation).
      // Confirm the retired path is a clean no-op that renders nothing.
      const extract = makeSandbox({});
      extract.window._w25LooksLikeBadSource = appShellDetector;
      loadRenderers(extract);
      let extractThrew = null;
      return Promise.resolve()
        .then(() => extract.window.gcABExtractPackageToCenter('sam:valid'))
        .then(ret => {
          assert(ret === null, 'retired gcABExtractPackageToCenter returns null (no download-based extraction)');
        })
        .catch(err => { extractThrew = err; })
        .then(() => {
          assert(!(extractThrew && /cleanDisplayText is not defined/.test(String(extractThrew))),
            'retired gcABExtractPackageToCenter must not throw ReferenceError for cleanDisplayText');
          assert(!extractThrew, `gcABExtractPackageToCenter threw unexpectedly: ${extractThrew}`);
          console.log('  ✓ retired download→extract path is a clean no-op (contamination path closed)');

          // ---- Render-sink guard + state key remain intact ---------------
          assert(html.includes('window.sdClearSourceCache = function()'), 'sdClearSourceCache still present');
          assert(html.includes("'sd.govcon.solWorkspace.v1'"), 'solWorkspace state key still in use');
          console.log('  ✓ render-sink guard + Solicitation Center state key intact');

          console.log('\nAll Phase 25AL assertions passed.\n');
        });
    });
}

run().catch(error => { console.error(error); process.exitCode = 1; });
