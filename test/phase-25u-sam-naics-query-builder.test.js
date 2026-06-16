// Phase 25U · SAM.gov NAICS query builder
// ──────────────────────────────────────────────────────────────────────
// Root cause for the user-visible defect ("SAM.gov returned 25 rows
// but none matched NAICS 541611 after exact filtering"): the IPC
// sanitizer in main.js expected `f.naics` as an array, but the
// renderer sends a string ("541611, 561720"). The string failed
// Array.isArray and the NAICS filter was dropped silently. SAM.gov
// then returned a generic top-of-feed search and the renderer's
// local backstop filtered all 25 to zero.
//
// Phase 25U makes the sanitizer accept BOTH shapes and forwards the
// resulting array to the SAM service, which already builds the
// SAM.gov `ncode` query param correctly.

const fs = require('fs');
const path = require('path');

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const samSrc  = fs.readFileSync(path.join(__dirname, '..', 'services', 'govcon', 'sam-search.js'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25U · SAM.gov NAICS query builder');

// ── Sanitizer accepts string AND array shapes ───────────────────────
assert(/function sanitizeSamFilters\(f\)/.test(mainSrc),
  'sanitizeSamFilters lives in main.js');
assert(/function coerceCodes\(raw\)/.test(mainSrc),
  'coerceCodes(raw) helper is defined inside the sanitizer');
assert(/typeof raw === 'string'/.test(mainSrc),
  'coerceCodes branches on string input (renderer sends a string)');
assert(/raw\.split\(\/\[,\\s;\]\+\/\)/.test(mainSrc),
  'coerceCodes splits comma/space/semicolon-delimited strings');
assert(/Array\.isArray\(raw\)/.test(mainSrc),
  'coerceCodes still accepts array input for the existing service callers');

// ── Sanitizer accepts the renderer's string set-aside ───────────────
assert(/function coerceSetAsides\(f\)/.test(mainSrc),
  'coerceSetAsides(f) handles both setAside (string) and setAsides (array)');
assert(/aliases = \{[\s\S]*'sdvosbc'/.test(mainSrc),
  'coerceSetAsides maps renderer set-aside codes to SAM.gov substrings');
assert(/setAsides: coerceSetAsides\(f\)/.test(mainSrc),
  'Sanitizer output uses coerceSetAsides to populate setAsides');

// ── Sanitizer maps dueWithinDays → responseFrom/responseTo ──────────
assert(/typeof f\.dueWithinDays === 'number'/.test(mainSrc),
  'Sanitizer reads dueWithinDays from the renderer payload');
assert(/responseFrom = todayIso/.test(mainSrc),
  'Sanitizer derives responseFrom from today when dueWithinDays is provided');
assert(/responseTo = future/.test(mainSrc),
  'Sanitizer derives responseTo from today + dueWithinDays');

// ── Sanitizer parses a 2-letter state out of placeOfPerformance ─────
assert(/typeof f\.placeOfPerformance === 'string'/.test(mainSrc),
  'Sanitizer reads placeOfPerformance free text from the renderer payload');
assert(/match\(\/\^\(\[A-Z\]\{2\}\)/.test(mainSrc),
  'Sanitizer extracts a 2-letter state code from placeOfPerformance');

// ── Sanitizer translates status → noticeTypes ───────────────────────
assert(/typeof f\.status === 'string'/.test(mainSrc),
  'Sanitizer reads status from the renderer payload');
assert(/awards:\s*s === 'awarded'/.test(mainSrc),
  "Sanitizer maps status='awarded' to noticeTypes.awards");

// ── Sanitizer raises maxPages when NAICS is set ─────────────────────
assert(/coerceCodes\(f\.naics\)\.length \? 5 : 1/.test(mainSrc),
  'Sanitizer defaults maxPages to 5 when NAICS is set (controlled pagination)');

// ── SAM service uses the correct ncode parameter ────────────────────
assert(/params\.set\('ncode', filters\.naics\.join\(','\)\)/.test(samSrc),
  "SAM service uses ?ncode= for NAICS filtering server-side (the SAM.gov contract)");

// ── No raw key leak from sanitizer or service ──────────────────────
assert(!/sanitizeSamFilters[\s\S]*api_key/.test(mainSrc),
  'Sanitizer never references api_key — the key is added inside the service');

// ── Functional sandbox: exercise the sanitizer end-to-end ───────────
const vm = require('vm');
function loadSanitizer(){
  const src = mainSrc;
  const start = src.indexOf('function sanitizeSamFilters');
  // The function ends at the matching brace; find via depth counter.
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++){
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}'){
      depth--;
      if (depth === 0){ end = i + 1; break; }
    }
  }
  const code = src.slice(start, end);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code + '; this.sanitizeSamFilters = sanitizeSamFilters;', sandbox);
  return sandbox.sanitizeSamFilters;
}

try {
  const sanitize = loadSanitizer();

  // Case 1 — renderer's actual shape (string NAICS).
  let out = sanitize({ naics: '541611, 561720', setAside: 'SDVOSBC', dueWithinDays: 30, status: 'active', placeOfPerformance: 'TX', limit: 25 });
  assert(Array.isArray(out.naics) && out.naics.length === 2,
    'String "541611, 561720" → array of 2 NAICS codes');
  assert(out.naics.indexOf('541611') >= 0 && out.naics.indexOf('561720') >= 0,
    'Parsed NAICS list contains both 541611 and 561720');
  assert(Array.isArray(out.setAsides) && out.setAsides.length > 0,
    'String setAside is coerced into the setAsides array');
  assert(out.setAsides.indexOf('sdvosb') >= 0 || out.setAsides.indexOf('service-disabled veteran') >= 0,
    'SDVOSBC dropdown code is aliased to "sdvosb"/"service-disabled veteran"');
  assert(typeof out.responseFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out.responseFrom),
    'responseFrom is derived from today (ISO date)');
  assert(typeof out.responseTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out.responseTo),
    'responseTo is derived from today + dueWithinDays');
  assert(out.state === 'TX',
    'placeOfPerformance "TX" parses as state TX');
  assert(out.noticeTypes && out.noticeTypes.active_solicitation === true,
    'status=active sets noticeTypes.active_solicitation');
  assert(out.maxPages === 5,
    'NAICS-bearing payload uses maxPages=5 (got ' + out.maxPages + ')');

  // Case 2 — empty NAICS.
  out = sanitize({});
  assert(Array.isArray(out.naics) && out.naics.length === 0,
    'Missing NAICS → empty array (broad search permitted)');
  assert(out.maxPages === 1,
    'Empty NAICS → maxPages=1 (no controlled pagination needed)');

  // Case 3 — array NAICS (legacy callers / scheduled searches).
  out = sanitize({ naics: ['541611', '541618', 'abc', '7'] });
  assert(out.naics.length === 2,
    'Array NAICS: invalid codes are dropped, valid codes retained (got ' + JSON.stringify(out.naics) + ')');
  assert(out.naics.indexOf('abc') < 0 && out.naics.indexOf('7') < 0,
    'Invalid NAICS codes (non-numeric, fewer than 2 digits) are dropped');

  // Case 4 — set-aside as code that's not in the alias table.
  out = sanitize({ setAside: 'customcode' });
  assert(out.setAsides[0] === 'customcode',
    'Unknown set-aside codes are pass-through lowercased');

  // Case 5 — status=awarded → noticeTypes.awards
  out = sanitize({ status: 'awarded' });
  assert(out.noticeTypes.awards === true,
    'status=awarded → noticeTypes.awards=true');

  // Case 6 — placeOfPerformance "Houston, TX" — extracts state.
  out = sanitize({ placeOfPerformance: 'TX, Houston' });
  assert(out.state === 'TX',
    'Leading 2-letter state in placeOfPerformance extracts cleanly');

  // Case 7 — Sanitizer never lets api_key leak into output.
  const json = JSON.stringify(sanitize({ naics: 'x', _api_key: 'SECRET' }));
  assert(!/api_key|secret/i.test(json),
    'Sanitizer output never carries api_key (or related secret) keys');
} catch (e) {
  assert(false, 'Sanitizer sandbox failed to bootstrap: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25U · NAICS query builder: FAILED' : 'Phase 25U · NAICS query builder: OK');
