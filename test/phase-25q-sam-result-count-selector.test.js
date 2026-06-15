// Phase 25Q · SAM.gov result-count selector
// ──────────────────────────────────────────────────────────────────────
// The user controls how many opportunities SAM.gov returns per search.
// Options are 25, 50, 75, 100. Default 25. The selected limit is
// passed to the IPC call; the renderer caps results at the selected
// count even if SAM.gov returns more. No auto-pagination.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25Q · SAM.gov result-count selector');

// ── Selector + label present ────────────────────────────────────────
assert(/id="gc-tab-sam-limit"/.test(html),
  'Result-count selector #gc-tab-sam-limit exists');
assert(/data-gc-sam-limit="true"/.test(html),
  'Selector carries the Phase 25Q data attribute');
assert(/for="gc-tab-sam-limit"[^>]*>Results/.test(html),
  '<label for="gc-tab-sam-limit"> reads "Results"');

// ── Exactly four options: 25 (selected), 50, 75, 100 ───────────────
const optionRe = /<option value="(\d+)"(?: selected)?>/g;
const matches = [];
let m;
while ((m = optionRe.exec(html)) !== null){
  // Only count options inside the limit selector.
  const ctx = html.slice(Math.max(0, m.index - 400), m.index);
  if (ctx.includes('id="gc-tab-sam-limit"')) matches.push(parseInt(m[1], 10));
}
assert(matches.length === 4, 'Selector has exactly 4 options (got ' + matches.length + ')');
[25, 50, 75, 100].forEach(function(v){
  assert(matches.indexOf(v) >= 0, 'Selector contains option value=' + v);
});
assert(/<option value="25" selected>/.test(html),
  'Default selected option is 25');

// ── No option above 100 in this selector ───────────────────────────
matches.forEach(function(v){ assert(v <= 100, 'Option value ' + v + ' ≤ 100'); });
// Anywhere a higher cap would be set must NOT appear in the limit context.
const above100 = /<option value="(125|150|200|500|1000)"/g;
let upper;
while ((upper = above100.exec(html)) !== null){
  const ctx = html.slice(Math.max(0, upper.index - 400), upper.index);
  assert(!ctx.includes('id="gc-tab-sam-limit"'),
    'No option above 100 inside the SAM result-count selector');
}

// ── Limit is read by _samLimit() and clamped at 100 ────────────────
assert(/function _samLimit\(\)/.test(html),
  '_samLimit() helper is defined');
assert(/if \(v > 100\) v = 100/.test(html),
  '_samLimit() clamps the value at 100');
assert(/parseInt\(sel\.value, 10\)/.test(html),
  '_samLimit() parses the selector value');

// ── Limit is passed into the IPC call ──────────────────────────────
// Phase 25Q passed { limit: limit } inline. Phase 25R upgraded the
// search to build a merged filters object first (filters.limit = limit)
// then passes the whole object. Either pattern proves the limit is
// part of the IPC payload.
assert(
  /window\.sd\.govcon\.samSearch\(\s*\{\s*limit:\s*limit\s*\}/.test(html) ||
  /filters\.limit\s*=\s*limit/.test(html),
  'gcTabSearchSam passes limit into sd.govcon.samSearch (inline {limit} or merged filters.limit)'
);

// ── Renderer caps results at limit even if the IPC over-returns ───
assert(/if \(res\.length > limit\) res = res\.slice\(0, limit\)/.test(html),
  'Renderer caps oversized result arrays at the selected limit');

// ── No auto-pagination ─────────────────────────────────────────────
assert(!/\bsamSearchPage\b/.test(html),
  'No samSearchPage helper that would auto-paginate');
assert(!/while\s*\(\s*more\s*\)/.test(html),
  'No while(more) auto-pagination loop');

// ── Status line announces the selected count ───────────────────────
assert(/Showing up to ' \+ limit \+ ' results/.test(html),
  'Status line announces "Showing up to {limit} results"');

console.log(process.exitCode ? 'Phase 25Q · SAM result-count selector: FAILED' : 'Phase 25Q · SAM result-count selector: OK');
