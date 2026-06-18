// Phase 25AJ — App-shell text rejection across all boundaries
// ──────────────────────────────────────────────────────────────────────
// Proves that SourceDeck app-shell / UI text (plain text, not just HTML)
// is rejected from:
//   1. sam-source-fetch (service-side)
//   2. sam-body-classifier shared classifier
//   3. localStorage source materials (boot sanitizer + runtime)
//   4. gcW25CollectSourceText (renderer collector)
//   5. Solicitation Center fallback extraction guard
//   6. First Impression context guard
// Also proves that valid plain solicitation text passes through.

const path = require('path');
const fs = require('fs');
const vm = require('vm');

const svc = require(path.join('..', 'services', 'govcon', 'sam-source-fetch.js'));
const classifier = require(path.join('..', 'services', 'govcon', 'sam-body-classifier.js'));

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (!c) { console.error('  \u2717 ' + m); failed++; process.exitCode = 1; }
  else { console.log('  \u2713 ' + m); passed++; }
}

console.log('\n=== Phase 25AJ \u2014 App-shell text rejection ===\n');

// ── 1. Shared classifier: looksLikeAppShellText ────────────────────

console.log('--- sam-body-classifier.looksLikeAppShellText ---');

assert(typeof classifier.looksLikeAppShellText === 'function',
  'looksLikeAppShellText is exported');

assert(typeof classifier.classifySourceText === 'function',
  'classifySourceText is exported');

assert(typeof classifier.APP_SHELL_TEXT_MARKERS === 'object',
  'APP_SHELL_TEXT_MARKERS is exported');

assert(typeof classifier.APP_SHELL_STRONG_TEXT_MARKERS === 'object',
  'APP_SHELL_STRONG_TEXT_MARKERS is exported');

// Valid solicitation text passes
assert(classifier.looksLikeAppShellText(
  'SOLICITATION SF1449. The Department of the Navy seeks janitorial services under NAICS 561720.'
) === false, 'Valid solicitation text passes');

// SourceDeck UI text with 2+ markers is rejected
assert(classifier.looksLikeAppShellText(
  'SourceDeck GovCon Pipeline\nOperating Hub Dashboard\nSolicitation Center\nRevenue Path'
) === true, 'Multi-marker SourceDeck UI text is rejected');

// Generic single marker is not enough (avoids false positives)
assert(classifier.looksLikeAppShellText(
  'The response must include a readiness assessment.'
) === false, 'Single generic label mention is not flagged');

assert(classifier.looksLikeAppShellText(
  'body { color: red } .cc-ribbon { display: block }'
) === true, 'Single highly specific CSS marker is rejected');

// CSS class dumps
assert(classifier.looksLikeAppShellText(
  'Some text with .cc-ribbon and .cmd-pill classes present'
) === true, 'CSS class dumps (.cc-ribbon + .cmd-pill) are rejected');

// Nav label runs
assert(classifier.looksLikeAppShellText(
  'Generated Leads\nSocial Access Points\nResponse Desk'
) === true, 'Nav label runs (Generated Leads + Social Access Points) are rejected');

// sourcedeck.html body text
assert(classifier.looksLikeAppShellText(
  'sourcedeck.html body text Proposal Workspace'
) === true, 'sourcedeck.html + Proposal Workspace is rejected');

// Edge cases
assert(classifier.looksLikeAppShellText('') === false, 'Empty string passes');
assert(classifier.looksLikeAppShellText(null) === false, 'null passes');
assert(classifier.looksLikeAppShellText(undefined) === false, 'undefined passes');

// classifySourceText wraps the check
var stv = classifier.classifySourceText('SourceDeck GovCon Pipeline\n.cmd-pill { color: red; }');
assert(stv.ok === false && stv.reason === 'app_shell_text',
  'classifySourceText returns app_shell_text for UI text');

stv = classifier.classifySourceText('SOLICITATION SF1449. Real text only.');
assert(stv.ok === true, 'classifySourceText passes valid text');

// ── 2. sam-source-fetch rejects app-shell text ─────────────────────

console.log('\n--- sam-source-fetch app-shell text rejection ---');

function makeMock(body, contentType) {
  var buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  return {
    ok: true, status: 200,
    headers: { get: function (k) { return k === 'content-type' ? (contentType || 'text/plain') : ''; } },
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    text: async () => buf.toString('utf8')
  };
}

(async function () {
  // App-shell text served as text/plain — use markers from the expanded
  // set that are NOT in the original APP_SHELL_MARKERS so the HTML-level
  // classifier passes but the text-level guard catches it.
  var fetcher = svc.createSamSourceFetchService({
    getApiKey: async () => 'K',
    fetch: async () => makeMock(
      'Operating Hub Dashboard\nRevenue Path\nGenerated Leads',
      'text/plain'
    )
  });
  var r = await fetcher.fetchSource({ url: 'https://api.sam.gov/x?noticeid=1' });
  assert(r.ok === false, 'App-shell text/plain → ok:false');
  assert(r.reason === 'app_shell_text',
    'Reason = app_shell_text (got ' + r.reason + ')');
  assert(r.text == null, 'No text field on rejection');

  // Valid solicitation text passes
  var fetcher2 = svc.createSamSourceFetchService({
    getApiKey: async () => 'K',
    fetch: async () => makeMock(
      'SOLICITATION SF1449. The Department of the Navy seeks janitorial services.',
      'text/plain'
    )
  });
  var r2 = await fetcher2.fetchSource({ url: 'https://api.sam.gov/x' });
  assert(r2.ok === true, 'Valid solicitation text → ok:true');
  assert(/SOLICITATION SF1449/.test(r2.text), 'Valid text is returned');

  // ── 3-6. Renderer-side tests via vm sandbox ────────────────────────

  console.log('\n--- Renderer-side guards (vm sandbox) ---');

  var html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

  // Extract the W25 IIFE
  var smKeyIdx = html.indexOf("var SM_KEY = 'sd.govcon.sourceMaterials.v1'");
  assert(smKeyIdx > 0, 'W25 SM_KEY anchor found');
  var iifeStart = html.lastIndexOf('(function(){', smKeyIdx);
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  // Verify the new markers and functions exist in the IIFE
  assert(/_w25AppShellTextMarkers/.test(iife),
    'Expanded _w25AppShellTextMarkers array is present');
  assert(/function _w25LooksLikeAppShellText/.test(iife),
    '_w25LooksLikeAppShellText function is defined');
  assert(/window\._w25LooksLikeBadSource = _w25LooksLikeBadSource/.test(iife),
    '_w25LooksLikeBadSource is exposed on window');
  assert(/window\.gcW25SaveSourceMaterials/.test(iife),
    'gcW25SaveSourceMaterials storage boundary is exposed');

  // Verify boot sanitizer exists
  assert(/function _bootSanitize/.test(iife),
    'Boot sanitizer _bootSanitize is defined');
  assert(/'boot_sanitized'/.test(iife),
    'Boot sanitizer uses boot_sanitized rejection reason');

  // Verify app_shell_text rejection reason in copy table
  assert(/app_shell_text:/.test(iife),
    'app_shell_text reason is in _w25RejectionCopy');

  // Run the IIFE in a sandbox
  var lsData = {};
  // Pre-seed localStorage with contaminated source material
  var contaminated = {
    'test-pursuit-1': {
      description: {
        text: 'SourceDeck GovCon Pipeline\nOperating Hub Dashboard\n.cmd-pill { color: gold }',
        fetchedAt: '2026-01-01',
        status: 'fetched'
      },
      resources: [
        { fileName: 'real.txt', text: 'SF1449 janitorial services contract.' },
        { fileName: 'bad.txt', text: 'Revenue Path\nGenerated Leads\nSocial Access Points\nResponse Desk' }
      ]
    },
    'test-pursuit-2': {
      description: { text: 'SOLICITATION SF1449. Real solicitation text.', fetchedAt: '2026-01-02', status: 'fetched' },
      resources: []
    }
  };
  lsData['sd.govcon.sourceMaterials.v1'] = JSON.stringify(contaminated);
  lsData['sd.govcon.activeSolicitation.v1'] = 'test-pursuit-1';
  lsData['sd.govcon.solWorkspace.v1'] = JSON.stringify({
    summary: 'Clean-looking summary',
    sections: { sectionL: ['Operating Hub Dashboard', 'Revenue Path'] },
    matrix: [{ requirement: 'Generated Leads and Social Access Points' }],
    solId: 'test-pursuit-1',
    real: true
  });

  var sandbox = {
    document: {
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      readyState: 'complete'
    },
    window: {
      sd: null, toast: function () {},
      CSS: { escape: function (s) { return s; } }
    },
    localStorage: {
      _data: Object.assign({}, lsData),
      getItem: function (k) { return this._data[k] || null; },
      setItem: function (k, v) { this._data[k] = v; },
      removeItem: function (k) { delete this._data[k]; }
    },
    setTimeout: function (fn) { try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);

  // Expose internal helpers for testing
  var expose = [
    'window._w25LooksLikeBadSource = _w25LooksLikeBadSource;',
    'window._w25LooksLikeAppShellText = _w25LooksLikeAppShellText;',
    'window._w25SanitizeSourceMaterials = _w25SanitizeSourceMaterials;',
    'window._w25AppShellTextMarkers = _w25AppShellTextMarkers;'
  ].join('\n');
  vm.runInContext(iife.replace(/\}\)\(\);?\s*$/, expose + '\n})();'), sandbox);

  // 3. Boot sanitizer cleaned contaminated localStorage
  var afterBoot = JSON.parse(sandbox.localStorage.getItem('sd.govcon.sourceMaterials.v1'));
  assert(afterBoot['test-pursuit-1'].description.text === '',
    'Boot sanitizer zeroed contaminated description text');
  assert(afterBoot['test-pursuit-1'].description.status === 'rejected',
    'Boot sanitizer marked description as rejected');
  assert(afterBoot['test-pursuit-1'].description.rejectionReason === 'boot_sanitized',
    'Boot sanitizer set rejectionReason = boot_sanitized');
  assert(afterBoot['test-pursuit-1'].resources[0].text === 'SF1449 janitorial services contract.',
    'Boot sanitizer preserved valid resource text');
  assert(afterBoot['test-pursuit-1'].resources[1].text === '',
    'Boot sanitizer zeroed contaminated resource text');
  assert(afterBoot['test-pursuit-1'].resources[1].rejectionReason === 'boot_sanitized',
    'Boot sanitizer set resource rejectionReason = boot_sanitized');
  assert(afterBoot['test-pursuit-2'].description.text === 'SOLICITATION SF1449. Real solicitation text.',
    'Boot sanitizer preserved valid pursuit description');
  var saveResult = sandbox.window.gcW25SaveSourceMaterials('save-boundary-test', {
    description: { text: '.cc-ribbon { display:block }', status: 'fetched' },
    resources: []
  });
  var afterBoundarySave = JSON.parse(sandbox.localStorage.getItem('sd.govcon.sourceMaterials.v1'));
  assert(saveResult.ok === true && afterBoundarySave['save-boundary-test'].description.text === '',
    'gcW25SaveSourceMaterials rejects app-shell text before persistence');
  var extractionAfterBoot = JSON.parse(sandbox.localStorage.getItem('sd.govcon.solWorkspace.v1'));
  assert(extractionAfterBoot.summary === null,
    'Boot sanitizer cleared contaminated extraction summary');
  assert(Object.keys(extractionAfterBoot.sections).length === 0,
    'Boot sanitizer cleared contaminated extraction sections');
  assert(Array.isArray(extractionAfterBoot.matrix) && extractionAfterBoot.matrix.length === 0,
    'Boot sanitizer cleared contaminated extraction matrix');
  assert(extractionAfterBoot.real === false,
    'Boot sanitizer marked contaminated extraction as non-real');

  // 4. gcW25CollectSourceText rejects app-shell text
  var collected = sandbox.window.gcW25CollectSourceText('test-pursuit-1');
  assert(collected === '' || !/SourceDeck GovCon Pipeline/.test(collected),
    'gcW25CollectSourceText does NOT return app-shell text (got ' + (collected || '').slice(0, 80) + ')');

  // Valid pursuit text passes through gcW25CollectSourceText
  var valid = sandbox.window.gcW25CollectSourceText('test-pursuit-2');
  assert(/SOLICITATION SF1449/.test(valid),
    'gcW25CollectSourceText returns valid solicitation text');

  // 5. _w25LooksLikeAppShellText catches all required markers
  var shellTest = sandbox.window._w25LooksLikeAppShellText;
  assert(shellTest('SourceDeck GovCon Pipeline\n.cc-ribbon { }') === true,
    'Catches SourceDeck GovCon Pipeline + .cc-ribbon');
  assert(shellTest('Operating Hub Dashboard\nReadiness check') === true,
    'Catches Operating Hub Dashboard + Readiness');
  assert(shellTest('Solicitation Center\nResponse Desk') === true,
    'Catches Solicitation Center + Response Desk');
  assert(shellTest('Revenue Path\nGenerated Leads') === true,
    'Catches Revenue Path + Generated Leads');
  assert(shellTest('Social Access Points\nsourcedeck.html body') === true,
    'Catches Social Access Points + sourcedeck.html');
  assert(shellTest('Proposal Workspace\ntab-govcon') === true,
    'Catches Proposal Workspace + tab-govcon');
  assert(shellTest('.cmd-pill { }\n.cmd-flow { }') === true,
    'Catches .cmd-pill + .cmd-flow');
  assert(shellTest('tab-dashboard\n.cc-lcc-grid') === true,
    'Catches tab-dashboard + .cc-lcc-grid');

  // Single generic marker: no false positive; strong marker: reject.
  assert(shellTest('The response must include a readiness assessment') === false,
    'Single generic label mention does not trigger');
  assert(shellTest('.cmd-pill { color: gold }') === true,
    'Single highly specific CSS marker triggers rejection');

  // 6. _w25LooksLikeBadSource extends the old behavior
  var bad = sandbox.window._w25LooksLikeBadSource;
  // Old HTML detection still works
  assert(bad('<!doctype html><html><body>hi</body></html>') === true,
    'Old HTML detection still works');
  // New text-level detection
  assert(bad('Operating Hub Dashboard\nSolicitation Center\nRevenue Path') === true,
    'New text-level detection catches UI text');
  // Valid text still passes
  assert(bad('SOLICITATION SF1449. The Department of the Navy seeks janitorial services.') === false,
    'Valid solicitation text still passes');

  // 7. Verify gcSolExtract has the guard
  var solExtractBody = html.slice(
    html.indexOf('window.gcSolExtract = async function'),
    html.indexOf('window.gcSolExtract = async function') + 3000
  );
  assert(/window\._w25LooksLikeBadSource/.test(solExtractBody),
    'gcSolExtract checks _w25LooksLikeBadSource before extraction');

  // 8. Verify First Impression collectSource guard
  var fiSection = html.slice(
    html.indexOf('function collectSource(id)'),
    html.indexOf('function collectSource(id)') + 1000
  );
  assert(/window\._w25LooksLikeBadSource/.test(fiSection),
    'First Impression collectSource checks _w25LooksLikeBadSource');
  assert(/window\.gcFiBuildContext = collectSource/.test(html),
    'gcFiBuildContext exposes the guarded First Impression context builder');

  // 9. Verify renderSourcePanel guards description display
  var renderBody = html.slice(
    html.indexOf('function renderSourcePanel(hostEl'),
    html.indexOf('function renderSourcePanel(hostEl') + 2000
  );
  assert(/_w25LooksLikeBadSource/.test(renderBody),
    'renderSourcePanel guards description text with _w25LooksLikeBadSource');

  // 10. Verify gcW25FetchDescription guards on success path
  var fetchDescBody = html.slice(
    html.indexOf('window.gcW25FetchDescription = async function'),
    html.indexOf('window.gcW25FetchDescription = async function') + 2000
  );
  assert(/_w25LooksLikeBadSource\(descText\)/.test(fetchDescBody),
    'gcW25FetchDescription rejects app-shell text on the success path');

  // 11. Verify gcW25ImportResource guards before storing text
  var importBody = html.slice(
    html.indexOf('window.gcW25ImportResource = async function'),
    html.indexOf('window.gcW25ImportResource = async function') + 2000
  );
  assert(/_w25LooksLikeBadSource\(rec\.text\)/.test(importBody),
    'gcW25ImportResource rejects app-shell text before storing');

  console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' \u2014 ' + passed + '/' + (passed + failed) + ' Phase 25AJ app-shell text rejection checks ===\n');
  process.exit(failed > 0 ? 1 : 0);
})().catch(function (err) {
  assert(false, 'Async test crashed: ' + err.message);
  console.log('\n=== FAIL \u2014 Phase 25AJ app-shell text rejection ===\n');
  process.exit(1);
});
