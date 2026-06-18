// Phase 25AH · Boot quarantine sanitizer + migration marker
// ──────────────────────────────────────────────────────────────────────
// Drives the on-boot _bootSanitize IIFE in a vm sandbox with poisoned
// localStorage pre-seeded, and asserts the gap-closure behavior:
//   - contaminated sd.govcon.sourceMaterials.v1 text is zeroed/rejected
//   - contaminated sd.govcon.solWorkspace.v1 extraction state is cleared
//   - contaminated sd.govcon.firstImpression.v1 drafts are dropped
//   - clean FI drafts and unrelated keys (API key/settings) are preserved
//   - the migration marker sd.govcon.sourceMaterialQuarantine.v1 is written
//   - exactly one non-blocking notice is shown

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AH · boot quarantine migration');

// Anchor to the W25 IIFE that owns SM_KEY + the boot sanitizer.
const smKeyIdx = html.indexOf("var SM_KEY = 'sd.govcon.sourceMaterials.v1'");
assert(smKeyIdx > 0, 'W25 SM_KEY anchor found');
const iifeStart = html.lastIndexOf('(function(){', smKeyIdx);
const iifeEnd = html.indexOf('</script>', iifeStart);
const iife = html.slice(iifeStart, iifeEnd);
assert(/_bootSanitize/.test(iife), 'Sliced IIFE contains the boot sanitizer');
assert(/sourceMaterialQuarantine\.v1/.test(iife), 'Boot sanitizer references the quarantine marker key');
assert(/firstImpression\.v1/.test(iife), 'Boot sanitizer references the First Impression key');

const TOXIC = '<html><body>SourceDeck GovCon Pipeline\n.cmd-flow{} .cmd-pill{} .cc-lcc-grid{} tab-govcon</body></html>';
const REAL = 'SOLICITATION SF1449. The Department seeks janitorial services. Section L instructions follow.';

const seed = {
  'sd.govcon.sourceMaterials.v1': JSON.stringify({
    'P1': {
      description: { text: TOXIC, status: 'imported', fetchedAt: '2026-01-01' },
      resources: [
        { fileName: 'real.txt', text: REAL, analysisStatus: 'imported' },
        { fileName: 'shell.html', text: TOXIC, analysisStatus: 'imported' }
      ]
    }
  }),
  'sd.govcon.solWorkspace.v1': JSON.stringify({ summary: TOXIC, sections: { sectionL: [TOXIC] }, matrix: [{ requirement: TOXIC }], real: true }),
  'sd.govcon.firstImpression.v1': JSON.stringify({
    'P1': { context: TOXIC, questions: ['q'] },
    'P2': { context: REAL, questions: ['legit'] }
  }),
  // Unrelated keys that MUST survive untouched.
  'sd.govcon.samApiKeyStatus.v1': JSON.stringify({ present: true }),
  'sd.settings.theme': 'vault'
};

const toasts = [];
const sandbox = {
  document: {
    getElementById: function(){ return null; },
    querySelector: function(){ return null; },
    querySelectorAll: function(){ return []; },
    addEventListener: function(){},
    readyState: 'complete'
  },
  window: { sd: null, toast: function(m, t){ toasts.push({ m: m, t: t }); } },
  localStorage: {
    _data: Object.assign({}, seed),
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem: function(k, v){ this._data[k] = String(v); },
    removeItem: function(k){ delete this._data[k]; }
  },
  setTimeout: function(fn){ try { fn(); } catch (e) {} },
  console: console
};
sandbox.window.toast = sandbox.window.toast; // keep reference
vm.createContext(sandbox);

// Run the IIFE — the boot sanitizer executes on load.
vm.runInContext(iife, sandbox);

const get = (k) => { try { return JSON.parse(sandbox.localStorage._data[k]); } catch (e) { return sandbox.localStorage._data[k]; } };

// ── Source materials ────────────────────────────────────────────────
const sm = get('sd.govcon.sourceMaterials.v1')['P1'];
assert(sm.description.text === '' && sm.description.status === 'rejected', 'toxic description text zeroed + rejected');
assert(sm.description.rejectionReason === 'boot_sanitized', 'description marked boot_sanitized');
assert(sm.resources[0].text === REAL, 'clean resource text preserved');
assert(sm.resources[1].text === '' && sm.resources[1].analysisStatus === 'rejected', 'toxic resource text zeroed + rejected');

// ── Solicitation workspace ──────────────────────────────────────────
const sol = get('sd.govcon.solWorkspace.v1');
assert(sol.summary === null && sol.real === false, 'contaminated solWorkspace summary cleared + real=false');
assert(JSON.stringify(sol.sections) === '{}' && Array.isArray(sol.matrix) && sol.matrix.length === 0, 'contaminated sections + matrix cleared');

// ── First Impression drafts ─────────────────────────────────────────
const fi = get('sd.govcon.firstImpression.v1');
assert(!('P1' in fi), 'contaminated First Impression draft (P1) dropped');
assert('P2' in fi && fi['P2'].questions[0] === 'legit', 'clean First Impression draft (P2) preserved');

// ── Migration marker + notice ───────────────────────────────────────
const marker = get('sd.govcon.sourceMaterialQuarantine.v1');
assert(marker && marker.v === 1 && typeof marker.at === 'string', 'quarantine migration marker written with timestamp');
assert(toasts.length === 1, 'exactly one notice shown (got ' + toasts.length + ')');
assert(/removed contaminated cached source text/i.test(toasts[0] && toasts[0].m || ''), 'notice copy matches spec');

// ── Unrelated keys preserved ────────────────────────────────────────
assert(get('sd.govcon.samApiKeyStatus.v1') && get('sd.govcon.samApiKeyStatus.v1').present === true, 'API-key status untouched');
assert(sandbox.localStorage._data['sd.settings.theme'] === 'vault', 'unrelated settings untouched');

// ── Idempotence: a clean second boot makes no change and no new notice ─
const data2 = Object.assign({}, sandbox.localStorage._data);
const toasts2 = [];
const sandbox2 = Object.assign({}, sandbox, {
  window: { sd: null, toast: function(m, t){ toasts2.push({ m: m, t: t }); } },
  localStorage: {
    _data: data2,
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem: function(k, v){ this._data[k] = String(v); },
    removeItem: function(k){ delete this._data[k]; }
  }
});
vm.createContext(sandbox2);
vm.runInContext(iife, sandbox2);
assert(toasts2.length === 0, 'second boot (already-clean) shows no new notice');

console.log(process.exitCode ? 'Phase 25AH · boot quarantine migration: FAILED' : 'Phase 25AH · boot quarantine migration: OK');
