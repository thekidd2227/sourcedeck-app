'use strict';

// Phase 25AF — runtime-grade renderer binding test. It pulls the ACTUAL
// renderer functions (mapPackageExtraction / renderPanels / renderMatrix and
// their sanitizers) out of sourcedeck.html, runs them in a VM with a fake DOM,
// feeds a real extraction payload, and asserts source-backed content renders
// with no raw markup.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const extract = require('../services/govcon/solicitation-package-extract');
const fx = require('./fixtures-25af');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

// Extract a `function NAME(...) { ... }` definition by brace matching.
function fnSource(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(html);
  if (!m) throw new Error('function not found: ' + name);
  let i = html.indexOf('{', m.index);
  let depth = 0;
  for (let j = i; j < html.length; j += 1) {
    if (html[j] === '{') depth += 1;
    else if (html[j] === '}') { depth -= 1; if (depth === 0) return html.slice(m.index, j + 1); }
  }
  throw new Error('unbalanced braces for ' + name);
}

(async () => {
  // Fake DOM that records innerHTML per element id.
  const store = {};
  const elements = {};
  function fakeEl(id) {
    return {
      id,
      set innerHTML(v) { store[id] = v; },
      get innerHTML() { return store[id] || ''; }
    };
  }
  ['gc-sol-summary', 'gc-sol-section-l', 'gc-sol-section-m', 'gc-sol-pws', 'gc-sol-forms', 'gc-sol-deadlines', 'gc-sol-risks', 'gc-sol-matrix-body']
    .forEach(id => { elements[id] = fakeEl(id); });

  const sandbox = {
    document: { getElementById: (id) => elements[id] || null },
    console
  };
  vm.createContext(sandbox);
  const src = [
    'function safeText(s){ return String(s == null ? "" : s).replace(/[<>]/g, ""); }',
    'function $(id){ return document.getElementById(id); }',
    'function setHTML(id, h){ var el = $(id); if (el) el.innerHTML = h; }',
    fnSource('looksRawMarkup'),
    fnSource('cleanDisplayText'),
    fnSource('emptyDiv'),
    fnSource('listDiv'),
    fnSource('mapPackageExtraction'),
    fnSource('renderPanels'),
    fnSource('renderMatrix'),
    'this.mapPackageExtraction = mapPackageExtraction; this.renderPanels = renderPanels; this.renderMatrix = renderMatrix;'
  ].join('\n');
  vm.runInContext(src, sandbox);

  // Build a real extraction payload (includes a DOCX so raw Office XML is a real risk).
  const { manifest } = fx.buildPackage('renderer', [
    { name: 'rfp.docx', data: fx.buildDocx([
      'SECTION L Instructions to Offerors',
      'Offerors must submit a technical proposal and completed SF 1449.',
      'SECTION M Evaluation Factors for Award',
      'The Government will evaluate technical approach and past performance.',
      'SECTION C Performance Work Statement',
      'The contractor shall provide custodial services.'
    ]) },
    { name: 'pricing.xlsx', data: fx.buildXlsx('Pricing', [['CLIN', 'Price'], ['0001', { n: 5000 }]]) }
  ]);
  const ex = await extract.extractSolicitationPackage({ manifest });

  const mapped = sandbox.mapPackageExtraction(ex);
  const state = { summary: mapped.summary, sections: mapped, matrix: ex.complianceMatrixStarter };
  sandbox.renderPanels(state);
  sandbox.renderMatrix(state.matrix);

  // Panels show source-backed content.
  assert.ok(/Offerors must submit/i.test(store['gc-sol-section-l']), 'Section L panel shows instructions');
  assert.ok(/evaluate/i.test(store['gc-sol-section-m']), 'Section M panel shows evaluation');
  assert.ok(/custodial/i.test(store['gc-sol-pws']), 'PWS panel shows scope');
  assert.ok(/SF 1449|pricing\.xlsx/i.test(store['gc-sol-forms']), 'Required Forms panel shows form/attachment references');

  // Matrix renders real rows.
  assert.ok(/<tr/.test(store['gc-sol-matrix-body']) && /Offerors must submit|contractor shall/i.test(store['gc-sol-matrix-body']), 'matrix renders requirement rows');

  // No raw XML/markup leaks anywhere.
  const all = Object.values(store).join('\n');
  assert.ok(!/w:document|xmlns:|<w:t|word\/document\.xml/.test(all), 'no raw Office XML in rendered output');

  // Placeholders disappear where content exists.
  assert.ok(!/No Section L instructions extracted yet/.test(store['gc-sol-section-l']), 'L placeholder replaced by content');

  console.log('phase-25af-renderer-binding-extraction-payload: ok');
})().catch(err => { console.error(err); process.exit(1); });
