// Phase 25S · SAM.gov result normalization
// ──────────────────────────────────────────────────────────────────────
// The defect: "Place of Performance" rendered as "[object Object]"
// because SAM.gov returns nested {city,state,zip,country} objects and
// the row template stringified the raw object. Same defect existed
// for agency. Phase 25S adds defensive normalizers so result rows,
// the View Details modal, and the upsert payload all flow through
// readable strings.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25S · SAM.gov result normalization');

// ── Helpers defined ─────────────────────────────────────────────────
assert(/function _samPopString\(pop\)/.test(html),
  '_samPopString(pop) helper is defined');
assert(/function _samAgencyString\(r\)/.test(html),
  '_samAgencyString(r) helper is defined');
assert(/function _samRowNaics\(r\)/.test(html),
  '_samRowNaics(r) helper is defined');
assert(/function _samRowSetAside\(r\)/.test(html),
  '_samRowSetAside(r) helper is defined');

// ── Row template uses the normalizers ───────────────────────────────
assert(/_esc\(_samRowNaics\(r\)/.test(html),
  'Row template escapes _samRowNaics(r) instead of r.naics directly');
assert(/_esc\(_samRowSetAside\(r\)/.test(html),
  'Row template escapes _samRowSetAside(r) instead of r.setAside directly');
assert(/var pop = _samPopString\(r\.placeOfPerformance\)/.test(html),
  'Row template normalizes placeOfPerformance via _samPopString');
assert(/var agency = _samAgencyString\(r\)/.test(html),
  'Row template normalizes agency via _samAgencyString');

// ── Upsert payload uses the normalizers ─────────────────────────────
assert(/placeOfPerformance: _samPopString\(r\.placeOfPerformance\)/.test(html),
  'Upsert payload stores placeOfPerformance as a normalized string');
assert(/sourceUrl: _samSafeUrl\(r\)/.test(html),
  'Upsert payload stores sourceUrl via _samSafeUrl');
assert(/agency: _samAgencyString\(r\)/.test(html),
  'Upsert payload stores agency as a normalized string');

// ── Sandbox: shake out the normalizers against realistic SAM shapes ─
try {
  var iifeStart = html.lastIndexOf('(function(){', html.indexOf('function _samPopString'));
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(id){
    var el = { _value: '', value: '', _innerHTML: '' };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    el.parentElement = { querySelector: function(){ return null; } };
    el.style = { display: '' };
    inputs[id] = el;
    return el;
  }
  var sandbox = {
    document: {
      getElementById: function(id){ return inputs[id] || fakeEl(id); },
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: { sd: null, toast: function(){} },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);

  var expose = "window._samPopString = _samPopString; "
             + "window._samAgencyString = _samAgencyString; "
             + "window._samRowNaics = _samRowNaics; "
             + "window._samRowSetAside = _samRowSetAside;";
  var spliced = iife.replace(/\}\)\(\);?\s*$/, expose + ' })();');
  vm.runInContext(spliced, sandbox);

  // ── Place of performance variants ────────────────────────────────
  var popString = sandbox.window._samPopString('San Antonio, TX');
  assert(popString === 'San Antonio, TX', 'String pop passes through');

  var popObj = sandbox.window._samPopString({
    city: { name: 'San Antonio' },
    state: { code: 'TX', name: 'Texas' },
    zip: '78201',
    country: { code: 'USA' }
  });
  assert(/San Antonio/.test(popObj) && /(TX|Texas)/.test(popObj) && /78201/.test(popObj),
    'Nested pop object renders city/state/zip (got "' + popObj + '")');
  assert(!/\[object Object\]/.test(popObj),
    'Nested pop object does not render as [object Object]');

  var popArr = sandbox.window._samPopString([
    { city: { name: 'Austin' }, state: { code: 'TX' } },
    { city: { name: 'Houston' }, state: { code: 'TX' } }
  ]);
  assert(/Austin/.test(popArr) && /Houston/.test(popArr),
    'Array of pop objects renders multiple locations (got "' + popArr + '")');
  assert(!/\[object Object\]/.test(popArr),
    'Array pop does not render as [object Object]');

  var popStreet = sandbox.window._samPopString({
    streetAddress: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'USA'
  });
  assert(/123 Main St/.test(popStreet) && /Austin, TX, 78701/.test(popStreet),
    'Flat pop with street renders street + city block (got "' + popStreet + '")');

  var popForeign = sandbox.window._samPopString({
    city: 'Berlin', state: 'BE', country: { code: 'DEU', name: 'Germany' }
  });
  assert(/Germany/.test(popForeign) || /DEU/.test(popForeign),
    'Foreign country surfaces in the rendered string');

  // ── Agency variants ──────────────────────────────────────────────
  assert(sandbox.window._samAgencyString({ agency: 'GSA' }) === 'GSA',
    'String agency passes through');
  assert(sandbox.window._samAgencyString({ agency: { name: 'GSA Region 7' } }) === 'GSA Region 7',
    'Nested agency.name resolves');
  assert(sandbox.window._samAgencyString({ fullParentPathName: 'GSA.PBS.R7' }) === 'GSA.PBS.R7',
    'fullParentPathName fallback resolves');
  assert(sandbox.window._samAgencyString({}) === '',
    'Empty row produces an empty agency string');

  // ── NAICS variants ───────────────────────────────────────────────
  assert(sandbox.window._samRowNaics({ naicsCode: '541611' }) === '541611',
    'naicsCode → 541611');
  assert(sandbox.window._samRowNaics({ naics: '541611' }) === '541611',
    'naics → 541611');
  assert(sandbox.window._samRowNaics({ naicsCodes: [{ code: '541611' }] }) === '541611',
    'naicsCodes[0].code → 541611');
  assert(sandbox.window._samRowNaics({}) === '',
    'Empty row → empty NAICS');

  // ── Set-aside variants ───────────────────────────────────────────
  assert(sandbox.window._samRowSetAside({
    typeOfSetAsideDescription: 'Service-Disabled Veteran-Owned Small Business'
  }) === 'Service-Disabled Veteran-Owned Small Business',
    'typeOfSetAsideDescription → resolves');
  assert(sandbox.window._samRowSetAside({ typeOfSetAside: 'SDVOSBC' }) === 'SDVOSBC',
    'typeOfSetAside → resolves');
  assert(sandbox.window._samRowSetAside({ setAside: { description: 'WOSB' } }) === 'WOSB',
    'Nested setAside.description → resolves');
  assert(sandbox.window._samRowSetAside({}) === '',
    'Empty row → empty set-aside');
} catch (e){
  assert(false, 'Sandbox simulation failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25S · SAM result normalization: FAILED' : 'Phase 25S · SAM result normalization: OK');
