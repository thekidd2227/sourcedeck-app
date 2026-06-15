// Phase 25R · NAICS Finder
// ──────────────────────────────────────────────────────────────────────
// The NAICS Finder modal (#naics-finder-modal) lets the user browse
// the 20 canonical NAICS 2022 sections, filter by code/description,
// multi-select codes, and apply or save the selection. No invented
// codes — only entries verified against the local NAICS reference
// ship in the seed list.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25R · NAICS Finder');

// ── Modal scaffolding ───────────────────────────────────────────────
assert(/id="naics-finder-modal"/.test(html),
  'NAICS Finder modal #naics-finder-modal exists');
assert(/data-naics-finder-modal="true"/.test(html),
  'Modal carries data-naics-finder-modal attribute');
assert(/role="dialog"/.test(html),
  'Modal declares ARIA role=dialog');
assert(/aria-label="NAICS Finder"/.test(html),
  'Modal has an accessible label');

// ── Required handlers ───────────────────────────────────────────────
const handlers = [
  'naicsFinderOpen',
  'naicsFinderClose',
  'naicsFinderRender',
  'naicsFinderToggle',
  'naicsFinderClearSelection',
  'naicsFinderApplySelection',
  'naicsFinderSaveProfile',
  'naicsApplyProfile',
  'naicsListProfiles',
  'naicsDeleteProfile',
  'naicsSetDefault'
];
handlers.forEach(function(fn){
  assert(html.includes('window.' + fn + ' ='),
    'window.' + fn + ' is defined');
});

// ── Modal search + section filter inputs ────────────────────────────
assert(/id="naics-finder-search"/.test(html),
  'Search input #naics-finder-search exists (filter by code or description)');
assert(/id="naics-finder-section"/.test(html),
  'Section filter dropdown #naics-finder-section exists');
assert(/id="naics-finder-list"/.test(html),
  'Results list container #naics-finder-list exists');
assert(/id="naics-finder-profile-name"/.test(html),
  'Profile name input #naics-finder-profile-name exists');
assert(/id="naics-finder-default"/.test(html),
  'Default-profile checkbox #naics-finder-default exists');

// ── 20 canonical NAICS sections seeded ──────────────────────────────
const requiredSections = ['11','21','22','23','31-33','42','44-45','48-49','51','52','53','54','55','56','61','62','71','72','81','92'];
requiredSections.forEach(function(s){
  const re = new RegExp("code:\\s*'" + s.replace('-','\\-') + "'");
  assert(re.test(html),
    'NAICS section ' + s + ' is present in SECTIONS table');
});

// ── Required SourceDeck-relevant six-digit codes (verified subset) ──
const requiredCodes = [
  '236220','238210','238220','238320',
  '561210','561710','561720','561730','561790',
  '541330','541611','541618','541990',
  '624230',
  '531311','531312'
];
requiredCodes.forEach(function(c){
  const re = new RegExp("code:\\s*'" + c + "'");
  assert(re.test(html),
    'NAICS code ' + c + ' is present in CODES table');
});

// ── No invented codes warning visible in the empty-results state ────
assert(/Add unlisted codes manually in the NAICS field/.test(html),
  'No-results state guides the user to add unlisted codes manually (no invented codes contract)');

// ── Sandbox simulation: run the IIFE and exercise the filter + selection
try {
  var iifeStart = html.indexOf('/* Phase 25R — NAICS Finder + Saved NAICS profiles.');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(id){
    var el = { _value: '', value: '', _innerHTML: '', _options: [], _checked: false };
    Object.defineProperty(el, 'value', {
      get: function(){ return el._value; },
      set: function(v){ el._value = v; }
    });
    Object.defineProperty(el, 'innerHTML', {
      get: function(){ return el._innerHTML; },
      set: function(v){ el._innerHTML = v; }
    });
    Object.defineProperty(el, 'options', {
      get: function(){ return { length: el._options.length }; }
    });
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
    window: {
      sd: null,
      toast: function(){}
    },
    localStorage: { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);

  // Open the finder and check the list got rendered.
  sandbox.window.naicsFinderOpen();
  // Ensure the search + list inputs are created via the lazy getElementById.
  sandbox.document.getElementById('naics-finder-search')._value = '561';
  sandbox.document.getElementById('naics-finder-list');
  sandbox.window.naicsFinderRender();
  var listHtml = inputs['naics-finder-list']._innerHTML;
  assert(/data-naics-finder-row="561720"/.test(listHtml),
    'Search for "561" surfaces 561720 (Janitorial Services) row');
  assert(/data-naics-finder-row="561210"/.test(listHtml),
    'Search for "561" surfaces 561210 (Facilities Support) row');
  // Toggle two codes on
  sandbox.window.naicsFinderToggle('561720', true);
  sandbox.window.naicsFinderToggle('561210', true);
  // Apply selection → NAICS field should now contain both
  sandbox.window.naicsFinderApplySelection();
  var applied = sandbox.document.getElementById('gc-tab-f-naics')._value;
  assert(/561720/.test(applied) && /561210/.test(applied),
    'Apply selection populates the NAICS search field with both codes (got "' + applied + '")');
} catch (e) {
  assert(false, 'NAICS Finder sandbox simulation crashed: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25R · NAICS Finder: FAILED' : 'Phase 25R · NAICS Finder: OK');
