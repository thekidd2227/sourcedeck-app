// Phase 25M · SAM.gov key status
// ──────────────────────────────────────────────────────────────────────
// Asserts that the SAM.gov key save flow updates the visible status
// indicators optimistically (Setup wizard pill, Settings status, and
// the new GovCon Pipeline pill) and that the raw key is never written
// back to the DOM. Saving + verifying happens through the secure
// credential boundary (sd.credentials).

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25M · SAM.gov key status');

// ── Save path uses the secure credential boundary ────────────────────
assert(/await sd\.credentials\.set\(service, val\)/.test(html),
  'Save path goes through sd.credentials.set(service, val)');
assert(/if \(input\) input\.value = ''/.test(html),
  'Raw key is cleared from the input after save (no DOM retention)');

// ── Optimistic + verified status refresh after save ──────────────────
assert(html.includes('_gcWizSetStatusSaved(service)'),
  'Save path invokes _gcWizSetStatusSaved() immediately on successful save');
assert(/function _gcWizSetStatusSaved\(service\)/.test(html),
  '_gcWizSetStatusSaved() is defined');
assert(/setTimeout\(function\(\)\{ try \{ statusFn\(\); \} catch\(_\)\{\} \}, 250\)/.test(html),
  'A short verification re-poll is wired so stale snapshots are reconciled');

// ── Setup wizard SAM status pill flips to "saved" optimistically ─────
assert(/el\.textContent = 'SAM\.gov key saved'/.test(html),
  'Setup wizard SAM status surface flips to "SAM.gov key saved"');
assert(/el\.className = 'gcwiz-status saved'/.test(html),
  'Setup wizard SAM status surface flips its className to "saved"');

// ── Settings out-samkey-status mirrors the save ──────────────────────
assert(/settingsLabel\.textContent = 'SAM\.gov key: configured ✓'/.test(html),
  'Settings out-samkey-status surface mirrors the save');

// ── No raw key surfaces in the renderer markup ───────────────────────
// The s-samkey input is a password field that the renderer clears on
// save. We assert there is no visible "raw key" placeholder copy that
// could mislead the buyer into thinking the key is shown back.
assert(!html.includes('Your SAM.gov key is:'),
  'No copy that displays "Your SAM.gov key is: …"');
assert(!/value="sk-/.test(html), 'No literal API key value in markup');

// ── SAM search screen does not include an API key input ──────────────
const samPipelineStart = html.indexOf('id="gc-sam-pipeline"');
const samPipelineEnd = html.indexOf('</section>', samPipelineStart);
const pipeline = html.slice(samPipelineStart, samPipelineEnd > 0 ? samPipelineEnd : samPipelineStart + 10000);
assert(samPipelineStart > 0, 'GovCon Pipeline section exists');
assert(!/id="gc-sam-key-input"/.test(pipeline),
  'GovCon SAM search section does NOT include a raw API key input');
assert(!/type="password"[^>]*sam/i.test(pipeline),
  'GovCon SAM search section does NOT include any password-type SAM input');

// ── Presence-only status surface in GovCon pipeline ──────────────────
assert(/id="gc-sam-key-status"/.test(html),
  'GovCon Pipeline carries a presence-only SAM key status pill');
assert(/data-gc-sam-key-status="true"/.test(html),
  'SAM key status pill carries a stable data attribute');
assert(/id="gc-sam-key-missing-banner"/.test(html),
  'GovCon Pipeline carries a "key missing" guidance banner');

// ── Add-in-Setup-or-Settings guidance ────────────────────────────────
assert(/Add it in Setup or Settings/.test(html),
  'Key-missing banner directs the user to Setup or Settings');

console.log(process.exitCode ? 'Phase 25M · SAM.gov key status: FAILED' : 'Phase 25M · SAM.gov key status: OK');
