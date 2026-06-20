'use strict';

// PR #152 runtime app-shell regression — Vendor Quote Room render sinks.
//
// Root cause (proven): PR #151 (commit 8ddf838) added the Vendor Quote Room
// renderers renderCoverage() / renderCandidates() (Phase 22D block). They
// painted persisted vendorQuoteWorkflow.v1 / solWorkspace.v1 state into
// body.innerHTML through the WEAK local safeText(), which strips only angle
// brackets and therefore still dumped SourceDeck app-shell/UI/CSS text
// (`.cmd-flow`, `.cmd-pill`, `.cc-lcc-grid`, nav labels, CSS rules) — none of
// which contain `<` or `>`. The Phase 25AL strong guard existed on window but
// the new PR #151 sinks bypassed it. PR #152 changed only package.json + tests
// and did NOT touch any runtime renderer.
//
// This test proves the Phase 25AM2 fix:
//   1. The shared render boundary window.sdRenderShield exists and returns the
//      canonical block message for app-shell text and clean text untouched.
//   2. renderCoverage / renderCandidates (via the real public entry points
//      gcVqrMapVendors / gcVqrReviewCandidates) never paint app-shell markers,
//      substitute the block message, and keep valid content.
//   3. The Quote Tracker / Vendor Comparison sinks are likewise shielded.
//   4. Load-time quarantine (gcVqrQuarantineState) removes contaminated text
//      fields but preserves valid metadata, vendor records, manual quotes,
//      pricing, credentials, saved pursuits, company profile, past performance.
//   5. No renderer throws.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'sourcedeck.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractScriptBlock(source, markerComment) {
  const idx = source.indexOf(markerComment);
  assert(idx >= 0, `marker comment not found: ${markerComment}`);
  const open = source.lastIndexOf('<script>', idx);
  const close = source.indexOf('</script>', idx);
  assert(open >= 0 && close > idx, `script block boundaries not found for: ${markerComment}`);
  return source.slice(open + '<script>'.length, close);
}

const BLOCK_22B = extractScriptBlock(html, 'Phase 22B — GovCon Capture Command Center renderer');
const BLOCK_22C = extractScriptBlock(html, 'Phase 22C — Solicitation Center + Compliance Matrix renderer');
const BLOCK_22D = extractScriptBlock(html, 'Phase 22D — Vendor Quote Room + Pricing Worksheet renderer.');

const APP_SHELL_MARKERS = [
  'SourceDeck GovCon Pipeline', 'Operating Hub Dashboard', 'GovCon Find Opportunities',
  'Solicitation Center', 'Response Desk', 'Revenue Path', 'Generated Leads',
  '.cmd-flow', '.cmd-pill', '.cc-lcc-grid'
];
const BLOCK_MSG = 'SourceDeck blocked application UI text from being rendered as solicitation or vendor content. Clear contaminated workspace data and re-import the solicitation.';

const APPSHELL = 'SourceDeck GovCon Pipeline Operating Hub Dashboard GovCon Find Opportunities '
  + 'Solicitation Center Response Desk Revenue Path Generated Leads '
  + '.cmd-flow{display:flex} .cmd-pill{border-radius:980px} .cc-lcc-grid{grid-template-columns:1fr}';

// Faithful stand-in for the shared app-shell detector.
function appShellDetector(text) {
  if (typeof text !== 'string' || !text) return false;
  const sample = text.slice(0, 65536);
  const strong = ['SourceDeck GovCon Pipeline', '.cc-ribbon', '.cmd-pill', '.cmd-flow', '.cc-lcc-grid', 'tab-govcon', 'tab-dashboard', 'SourceDeck does not auto-send', 'sourcedeck.html'];
  for (const m of strong) if (sample.indexOf(m) >= 0) return true;
  const weak = strong.concat(['Operating Hub Dashboard', 'GovCon Find Opportunities', 'Solicitation Center', 'Response Desk', 'Revenue Path', 'Generated Leads']);
  let hits = 0;
  for (const m of weak) { if (sample.indexOf(m) >= 0) { hits += 1; if (hits >= 2) return true; } }
  return false;
}

function makeElement(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', style: { setProperty() {}, display: '' },
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {}, addEventListener() {},
    scrollIntoView() {}, closest() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }
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
  window.prompt = () => '';
  const ctx = {
    window, document, localStorage, console,
    JSON, Date, Math, RegExp, Array, String, Number, Object, Boolean, parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => {}
  };
  vm.createContext(ctx);
  return { ctx, els, el, window, store };
}

function loadVqr(sandbox) {
  vm.runInContext(BLOCK_22D, sandbox.ctx, { filename: 'block-22D.js' });
}
function loadShield(sandbox) {
  vm.runInContext(BLOCK_22B, sandbox.ctx, { filename: 'block-22B.js' });
  vm.runInContext(BLOCK_22C, sandbox.ctx, { filename: 'block-22C.js' });
}

function assertNoAppShell(htmlOut, where) {
  for (const m of APP_SHELL_MARKERS) {
    assert(htmlOut.indexOf(m) < 0, `${where}: app-shell marker leaked into render output: ${m}`);
  }
}

let pass = 0;
function ok(msg) { pass += 1; console.log('  ✓ ' + msg); }

function run() {
  console.log('\n=== PR #152 runtime app-shell regression — Vendor Quote Room sinks ===\n');

  // ---- Static guarantees -----------------------------------------------
  assert(BLOCK_22D.includes('function cell(') && BLOCK_22D.includes('function shield('),
    'Phase 22D defines the cell()/shield() render boundary');
  assert(BLOCK_22D.includes("cell(r.task)") && BLOCK_22D.includes("cell(v.legalBusinessName)"),
    'renderCoverage/renderCandidates route fields through cell(), not raw safeText()');
  assert(!/body\.innerHTML = rows\.map\(function\(r\)\{ return '<tr><td>' \+ safeText\(r\.task\)/.test(BLOCK_22D),
    'the old safeText(r.task) coverage sink is gone');
  assert(BLOCK_22D.includes(BLOCK_MSG), 'Phase 22D embeds the canonical block message');
  assert(BLOCK_22C.includes('window.sdRenderShield'), 'Phase 22C exposes the shared sdRenderShield boundary');
  ok('source: VQR sinks use the shielded cell() boundary and embed the canonical message');

  // ---- 1. Shared boundary helper ---------------------------------------
  {
    const sb = makeSandbox();
    loadShield(sb);
    sb.window._w25LooksLikeBadSource = appShellDetector;
    assert.strictEqual(typeof sb.window.sdRenderShield, 'function', 'sdRenderShield exposed');
    assert.strictEqual(sb.window.sdRenderShield(APPSHELL, 'unit'), BLOCK_MSG, 'app-shell text -> block message');
    assert.strictEqual(sb.window.sdRenderShield('Provide janitorial services per PWS 3.1', 'unit'),
      'Provide janitorial services per PWS 3.1', 'clean text passes through untouched');
    ok('shared sdRenderShield blocks app-shell text and preserves clean text');
  }

  // ---- 2. renderCoverage via gcVqrMapVendors ---------------------------
  {
    const seed = {
      'sd.govcon.vendorQuoteWorkflow.v1': JSON.stringify({
        actionPlan: { requirements: [
          { task: APPSHELL, sourceCitation: 'PWS 3.1', requiredSubcontractorType: '.cmd-pill{display:none}', coverageStatus: 'unassigned', riskLevel: 'high', notes: 'Operating Hub Dashboard Revenue Path' },
          { task: 'Provide HVAC maintenance per PWS 3.4', sourceCitation: 'PWS 3.4', requiredSubcontractorType: 'HVAC', coverageStatus: 'covered', riskLevel: 'low', notes: 'clean note' }
        ] }
      })
    };
    const sb = makeSandbox(seed);
    loadVqr(sb); // local fallback path — no shared helper present
    assert.doesNotThrow(() => sb.window.gcVqrMapVendors(), 'gcVqrMapVendors does not throw');
    const out = sb.els['gc-vqr-scope-coverage'].innerHTML;
    assertNoAppShell(out, 'renderCoverage');
    assert(out.indexOf(BLOCK_MSG) >= 0, 'renderCoverage shows the block message for contaminated fields');
    assert(out.indexOf('Provide HVAC maintenance per PWS 3.4') >= 0, 'renderCoverage keeps the valid requirement');
    assert(out.indexOf('PWS 3.4') >= 0, 'renderCoverage keeps valid citations');
    ok('renderCoverage blocks app-shell, keeps valid requirements (local fallback path)');
  }

  // ---- 3. renderCandidates via gcVqrReviewCandidates -------------------
  {
    const seed = {
      'sd.govcon.vendorQuoteWorkflow.v1': JSON.stringify({
        vendors: [
          { legalBusinessName: APPSHELL, website: '.cc-lcc-grid{}', serviceLocation: 'Generated Leads', capabilities: ['SourceDeck GovCon Pipeline', 'janitorial'], certifications: [], licenses: [], contactName: 'Operating Hub Dashboard', email: 'x@y.z', qualificationStatus: 'unverified' },
          { legalBusinessName: 'Acme Cleaning LLC', website: 'https://acme.example', serviceLocation: 'Norfolk, VA', capabilities: ['janitorial', 'grounds'], certifications: ['ISO9001'], licenses: [], contactName: 'Jane Roe', email: 'jane@acme.example', qualificationStatus: 'verified' }
        ]
      })
    };
    const sb = makeSandbox(seed);
    loadVqr(sb);
    sb.window._w25LooksLikeBadSource = appShellDetector; // integration: shared detector present
    assert.doesNotThrow(() => sb.window.gcVqrReviewCandidates(), 'gcVqrReviewCandidates does not throw');
    const out = sb.els['gc-vqr-vendor-candidates'].innerHTML;
    assertNoAppShell(out, 'renderCandidates');
    assert(out.indexOf(BLOCK_MSG) >= 0, 'renderCandidates shows the block message for contaminated fields');
    assert(out.indexOf('Acme Cleaning LLC') >= 0, 'renderCandidates keeps the valid vendor');
    assert(out.indexOf('janitorial') >= 0, 'renderCandidates keeps valid capabilities');
    ok('renderCandidates blocks app-shell, keeps valid vendors/capabilities');
  }

  // ---- 4. Quote Tracker / Vendor Comparison sinks ----------------------
  {
    const seed = {
      'sd.govcon.vendorQuotes.v1': JSON.stringify([
        { category: APPSHELL, vendor: '.cmd-flow{}', contact: 'Revenue Path', status: 'received', amount: 1000, riskNotes: 'Operating Hub Dashboard' },
        { category: 'Janitorial', vendor: 'Acme Cleaning LLC', contact: 'Jane Roe', status: 'received', amount: 2000, riskNotes: 'on time' }
      ])
    };
    const sb = makeSandbox(seed);
    loadVqr(sb);
    assert.doesNotThrow(() => sb.window.gcVqrRender(), 'gcVqrRender does not throw');
    const tracker = sb.els['gc-vqr-tbody'].innerHTML;
    const compare = sb.els['gc-pr-quote-compare-tbody'].innerHTML;
    assertNoAppShell(tracker, 'quote tracker');
    assertNoAppShell(compare, 'vendor comparison');
    assert(tracker.indexOf(BLOCK_MSG) >= 0, 'quote tracker shows block message for contaminated rows');
    assert(tracker.indexOf('Acme Cleaning LLC') >= 0, 'quote tracker keeps the valid vendor');
    ok('Quote Tracker and Vendor Comparison sinks are shielded');
  }

  // ---- 5. Load-time quarantine -----------------------------------------
  {
    const PRESERVE = {
      'sd.govcon.savedPursuits.v1': JSON.stringify([{ id: 'opp-1', title: 'Base Janitorial' }]),
      'sd.govcon.credentials': JSON.stringify({ token: 'KEEP-ME' }),
      'sd.govcon.companyProfile.v1': JSON.stringify({ uei: 'ABC123', name: 'My Co' }),
      'sd.govcon.pastPerformance.v1': JSON.stringify([{ id: 'pp-1', title: 'Prior Work' }]),
      'sd.govcon.pricingWorksheet.v1': JSON.stringify({ labor: 100000, overhead: 0.3 })
    };
    const seed = Object.assign({}, PRESERVE, {
      'sd.govcon.vendorQuoteWorkflow.v1': JSON.stringify({
        actionPlan: { requirements: [
          { task: APPSHELL, sourceCitation: 'PWS 3.1', notes: 'clean note' },
          { task: 'Provide HVAC maintenance', sourceCitation: 'PWS 3.4' }
        ] },
        vendors: [{ legalBusinessName: APPSHELL, serviceLocation: 'Norfolk, VA', capabilities: ['SourceDeck GovCon Pipeline', 'hvac'] }],
        searchStrategy: { ok: true, queries: ['hvac norfolk va'] }
      })
    });
    const sb = makeSandbox(seed);
    loadVqr(sb);
    sb.window._w25LooksLikeBadSource = appShellDetector;
    let report;
    assert.doesNotThrow(() => { report = sb.window.gcVqrQuarantineState(); }, 'quarantine does not throw');

    const wf = JSON.parse(sb.store.get('sd.govcon.vendorQuoteWorkflow.v1'));
    assert.strictEqual(wf.actionPlan.requirements[0].task, '', 'contaminated task scrubbed');
    assert.strictEqual(wf.actionPlan.requirements[0].notes, 'clean note', 'clean sibling field preserved');
    assert.strictEqual(wf.actionPlan.requirements[1].task, 'Provide HVAC maintenance', 'valid requirement preserved');
    assert.strictEqual(wf.vendors[0].legalBusinessName, '', 'contaminated vendor name scrubbed');
    assert.strictEqual(wf.vendors[0].serviceLocation, 'Norfolk, VA', 'valid vendor metadata preserved');
    assert.deepStrictEqual(wf.vendors[0].capabilities, ['hvac'], 'contaminated capability removed, clean kept');
    assert.deepStrictEqual(wf.searchStrategy, { ok: true, queries: ['hvac norfolk va'] }, 'unrelated workflow metadata preserved');
    assert(wf.quarantine && wf.quarantine.reason === 'app_shell_text', 'quarantine flag recorded');
    assert(JSON.stringify(wf.quarantine).indexOf('SourceDeck GovCon Pipeline') < 0, 'raw blocked payload not retained in quarantine flag');

    for (const k of Object.keys(PRESERVE)) {
      assert.strictEqual(sb.store.get(k), PRESERVE[k], `protected key untouched: ${k}`);
    }
    ok('quarantine scrubs contaminated fields and preserves pursuits/credentials/profile/pricing/past-performance/vendor metadata');
  }

  // ---- 6. Valid-only state renders normally ----------------------------
  {
    const seed = {
      'sd.govcon.vendorQuoteWorkflow.v1': JSON.stringify({
        actionPlan: { requirements: [{ task: 'Provide janitorial services per PWS 3.1', sourceCitation: 'PWS 3.1', coverageStatus: 'unassigned', riskLevel: 'medium' }] },
        vendors: [{ legalBusinessName: 'Acme Cleaning LLC', serviceLocation: 'Norfolk, VA', capabilities: ['janitorial'], qualificationStatus: 'verified' }]
      })
    };
    const sb = makeSandbox(seed);
    loadVqr(sb);
    sb.window.gcVqrMapVendors();
    sb.window.gcVqrReviewCandidates();
    const cov = sb.els['gc-vqr-scope-coverage'].innerHTML;
    const cand = sb.els['gc-vqr-vendor-candidates'].innerHTML;
    assert(cov.indexOf('Provide janitorial services per PWS 3.1') >= 0, 'valid coverage renders');
    assert(cov.indexOf(BLOCK_MSG) < 0, 'no spurious block message on clean coverage');
    assert(cand.indexOf('Acme Cleaning LLC') >= 0, 'valid candidate renders');
    assert(cand.indexOf(BLOCK_MSG) < 0, 'no spurious block message on clean candidates');
    ok('valid Vendor Quote Room content renders normally with no false positives');
  }

  console.log(`\n  PASS — ${pass} checks\n`);
}

run();
