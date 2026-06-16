// Phase 25T · NAICS validation
// ──────────────────────────────────────────────────────────────────────
// Manually entered NAICS codes must be validated against the local
// NAICS library before the search runs. A verified code surfaces its
// description; an unverified code surfaces a "verify before relying
// on it" warning. Search is never blocked by validation — uncertainty
// is visible, not blocking.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25T · NAICS validation');

// ── DOM scaffolding ─────────────────────────────────────────────────
assert(/id="gc-tab-f-naics-validation"/.test(html),
  'NAICS validation chip container #gc-tab-f-naics-validation exists');
assert(/oninput="gcTabNaicsValidate\(\)"/.test(html),
  'NAICS input runs gcTabNaicsValidate on input events');
assert(/onblur="gcTabNaicsValidate\(\)"/.test(html),
  'NAICS input runs gcTabNaicsValidate on blur');

// ── Helpers + handlers defined ──────────────────────────────────────
assert(/window\.gcTabNaicsValidate\s*=/.test(html),
  'window.gcTabNaicsValidate is defined');
assert(/window\.naicsLookupCode\s*=/.test(html),
  'window.naicsLookupCode is exposed by the NAICS Finder IIFE');
assert(/window\.naicsRelatedCodes\s*=/.test(html),
  'window.naicsRelatedCodes is exposed by the NAICS Finder IIFE');

// ── No invented descriptions for unverified codes ───────────────────
// The warning copy must say "not found in local NAICS library; verify
// before relying on it." — no made-up description text.
assert(/not found in local NAICS library; verify before relying on it/.test(html),
  'Unverified NAICS shows "not found in local NAICS library; verify before relying on it"');

// ── No legal classification CLAIM (disclaimers are fine) ────────────
// Disclaimers like "SourceDeck does NOT do legal classification" are
// the opposite of a claim and are explicitly allowed. We only flag
// affirmative phrases like "guaranteed NAICS" or "officially classify".
assert(!/guaranteed NAICS|officially classif|provide.*official NAICS classification/i.test(html),
  'No affirmative legal/official NAICS classification claim');

// ── Sandbox: run the NAICS Finder IIFE and verify the lookup helper
//    returns verified=true for codes in the seeded CODES list and
//    verified=false for unknown codes. ───────────────────────────────
try {
  var iifeStart = html.indexOf('/* Phase 25R — NAICS Finder + Saved NAICS profiles.');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);

  var inputs = {};
  function fakeEl(){
    var el = { _value: '', value: '', _innerHTML: '', _options: [], _checked: false };
    Object.defineProperty(el, 'value', { get: function(){ return el._value; }, set: function(v){ el._value = v; } });
    Object.defineProperty(el, 'innerHTML', { get: function(){ return el._innerHTML; }, set: function(v){ el._innerHTML = v; } });
    Object.defineProperty(el, 'options', { get: function(){ return { length: el._options.length }; } });
    Object.defineProperty(el, 'checked', { get: function(){ return el._checked; }, set: function(v){ el._checked = v; } });
    el.parentElement = { querySelector: function(){ return null; } };
    el.style = { display: '' };
    return el;
  }
  function ge(id){ if (!inputs[id]) inputs[id] = fakeEl(); return inputs[id]; }
  var sandbox = {
    document: {
      getElementById: ge,
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
  vm.runInContext(iife, sandbox);

  // Verified code from CODES.
  var ok = sandbox.window.naicsLookupCode('541611');
  assert(ok && ok.verified === true,
    'Verified lookup: 541611.verified === true');
  assert(ok && /Administrative Management/.test(ok.label || ''),
    'Verified lookup: 541611 returns its real description (got "' + (ok && ok.label) + '")');
  assert(ok && ok.section === '54',
    'Verified lookup: 541611 returns section 54');

  // Verified code 541618 (the screenshot defect code) — should be
  // present in the local library and verified.
  var ok2 = sandbox.window.naicsLookupCode('541618');
  assert(ok2 && ok2.verified === true,
    'Verified lookup: 541618 is in the local library (verified=true)');
  assert(ok2 && /Management Consulting/.test(ok2.label || ''),
    '541618 label mentions Management Consulting (got "' + (ok2 && ok2.label) + '")');

  // Unverified: a code that is not in the local list.
  var bad = sandbox.window.naicsLookupCode('334519');
  assert(bad && bad.verified === false,
    'Unverified lookup: 334519.verified === false');
  assert(bad && !bad.label,
    'Unverified lookup: no invented description for 334519 (got "' + (bad && bad.label) + '")');

  // Whitespace handling.
  var trimmed = sandbox.window.naicsLookupCode('   541611   ');
  assert(trimmed && trimmed.verified === true,
    'Whitespace around input is trimmed before lookup');

  // Empty input.
  var empty = sandbox.window.naicsLookupCode('');
  assert(empty && empty.verified === false && empty.code === '',
    'Empty input returns { code:"", verified:false }');

  // Related codes from a real prefix.
  var rel = sandbox.window.naicsRelatedCodes('541618', 4);
  assert(Array.isArray(rel) && rel.length > 0,
    'naicsRelatedCodes("541618") returns at least one related code');
  assert(rel.every(function(r){ return r.code !== '541618'; }),
    'Related codes never include the input code itself');
  assert(rel.some(function(r){ return r.code === '541611' || r.code === '541330' || r.code === '541990'; }),
    'Related codes include a sibling from the 5416/541 prefix family');
} catch (e) {
  assert(false, 'NAICS Finder sandbox failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25T · NAICS validation: FAILED' : 'Phase 25T · NAICS validation: OK');
