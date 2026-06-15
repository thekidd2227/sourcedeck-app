// Phase 25R · Saved NAICS profiles
// ──────────────────────────────────────────────────────────────────────
// Local-only profile CRUD. Each profile has id, name, codes[],
// descriptions[], isDefault, createdAt, updatedAt. Profiles are
// persisted via sd.storeSet ('govcon.naicsProfiles') with a
// localStorage fallback ('sd.govcon.naicsProfiles.v1') and feed the
// "Saved NAICS profile" selector on the Find Opportunities tab.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25R · Saved NAICS profiles');

// ── Saved NAICS profile selector on Find Opportunities ─────────────
assert(/id="gc-tab-f-naics-profile"/.test(html),
  'Saved NAICS profile selector #gc-tab-f-naics-profile is in Find Opportunities');
assert(/onchange="naicsApplyProfile\(this\.value\)"/.test(html),
  'Profile selector calls naicsApplyProfile() on change');

// ── Storage keys are explicit + local-only ──────────────────────────
assert(/STORE_KEY = 'sd\.govcon\.naicsProfiles\.v1'/.test(html),
  'localStorage fallback key is sd.govcon.naicsProfiles.v1');
assert(/BRIDGE_KEY = 'govcon\.naicsProfiles'/.test(html),
  'electron-store bridge key is govcon.naicsProfiles');

// ── Save / list / delete / set-default handlers ────────────────────
['naicsFinderSaveProfile','naicsListProfiles','naicsDeleteProfile','naicsSetDefault','naicsApplyProfile']
  .forEach(function(fn){
    assert(html.includes('window.' + fn + ' ='),
      'window.' + fn + ' is defined');
  });

// ── Sandbox: save a profile, retrieve it, apply it, set default ────
try {
  var iifeStart = html.indexOf('/* Phase 25R — NAICS Finder + Saved NAICS profiles.');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var store = {};
  var ls = {};
  var inputs = {};
  function fakeEl(){
    var el = { _value: '', value: '', _innerHTML: '', _options: [], _checked: false, parentElement: { querySelector: function(){ return null; } }, style: { display: '' } };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    Object.defineProperty(el, 'options', { get: function(){ return { length: el._options.length }; } });
    Object.defineProperty(el, 'checked', { get: function(){ return el._checked; }, set: function(v){ el._checked = v; } });
    return el;
  }
  function ge(id){
    if (!inputs[id]) inputs[id] = fakeEl();
    return inputs[id];
  }
  var sandbox = {
    document: {
      getElementById: ge,
      querySelector: function(sel){
        if (sel === '[data-naics-finder-selected-count="true"]') return { textContent: '' };
        return null;
      },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: {
      sd: {
        storeGet: function(k){ return Promise.resolve(store[k] || null); },
        storeSet: function(k, v){ store[k] = v; return Promise.resolve(); }
      },
      toast: function(){}
    },
    localStorage: {
      getItem: function(k){ return ls[k] || null; },
      setItem: function(k, v){ ls[k] = v; },
      removeItem: function(k){ delete ls[k]; }
    },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(iife, sandbox);

  return Promise.resolve().then(async function(){
    // Open the finder, select two codes, name + save the profile.
    sandbox.window.naicsFinderOpen();
    sandbox.window.naicsFinderToggle('561720', true);
    sandbox.window.naicsFinderToggle('561210', true);
    ge('naics-finder-profile-name')._value = 'Facilities';
    ge('naics-finder-default')._checked = true;
    await sandbox.window.naicsFinderSaveProfile();

    var profiles = sandbox.window.naicsListProfiles();
    assert(profiles.length === 1, 'One profile saved (got ' + profiles.length + ')');
    var p = profiles[0];
    assert(p.name === 'Facilities', 'Profile name is "Facilities"');
    assert(Array.isArray(p.codes) && p.codes.length === 2, 'Profile has 2 codes');
    assert(p.codes.indexOf('561720') >= 0 && p.codes.indexOf('561210') >= 0, 'Profile codes match selection');
    assert(p.isDefault === true, 'isDefault flag is true (set via checkbox)');
    assert(typeof p.id === 'string' && p.id.indexOf('naics-') === 0, 'Profile id is namespaced');
    assert(typeof p.createdAt === 'string' && typeof p.updatedAt === 'string', 'Profile has ISO timestamps');
    // Verify it was written to the electron-store bridge.
    var bridged = store['govcon.naicsProfiles'];
    assert(bridged && Array.isArray(bridged.profiles) && bridged.profiles.length === 1,
      'Profile persists to the electron-store bridge');
    // And to localStorage fallback.
    var ls_raw = ls['sd.govcon.naicsProfiles.v1'];
    assert(typeof ls_raw === 'string' && JSON.parse(ls_raw).profiles.length === 1,
      'Profile also persists to localStorage fallback');

    // Apply the profile to the NAICS field
    sandbox.window.naicsApplyProfile(p.id);
    var applied = ge('gc-tab-f-naics')._value;
    assert(/561720/.test(applied) && /561210/.test(applied),
      'naicsApplyProfile populates the NAICS field (got "' + applied + '")');

    // Save a second profile and set the first as default again
    sandbox.window.naicsFinderClearSelection();
    sandbox.window.naicsFinderToggle('238320', true);
    ge('naics-finder-profile-name')._value = 'Painting';
    ge('naics-finder-default')._checked = false;
    await sandbox.window.naicsFinderSaveProfile();
    profiles = sandbox.window.naicsListProfiles();
    assert(profiles.length === 2, '2 profiles after second save');

    // Set the second as default — only one default at a time
    await sandbox.window.naicsSetDefault(profiles[1].id);
    profiles = sandbox.window.naicsListProfiles();
    assert(profiles.filter(function(p){ return p.isDefault; }).length === 1,
      'Exactly one profile is marked default after naicsSetDefault');
    assert(profiles[1].isDefault === true,
      'Newly-defaulted profile carries isDefault=true');
    assert(profiles[0].isDefault === false,
      'Previous default profile is flipped to false');

    // Delete a profile
    await sandbox.window.naicsDeleteProfile(profiles[0].id);
    assert(sandbox.window.naicsListProfiles().length === 1, 'Profile deleted');

    console.log(process.exitCode ? 'Phase 25R · Saved NAICS profiles: FAILED' : 'Phase 25R · Saved NAICS profiles: OK');
    process.exit(process.exitCode ? 1 : 0);
  });
} catch (e) {
  assert(false, 'Sandbox simulation failed to bootstrap: ' + e.message);
  console.log('Phase 25R · Saved NAICS profiles: FAILED');
  process.exit(1);
}
