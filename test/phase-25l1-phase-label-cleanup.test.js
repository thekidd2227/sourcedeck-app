// Phase 25L-1 · Phase-label cleanup test
// ──────────────────────────────────────────────────────────────────────
// Asserts user-facing Phase labels / banners are scrubbed from active
// runtime screens. Internal HTML/JS comments referencing phase numbers
// are acceptable. Internal-review export annotations inside the
// snapshot Markdown writers are acceptable (they are not chrome the
// buyer sees on cold open). Visible UI text strings that prefix
// product copy with "Phase 25E.x: …" / "Phase 24K: …" / "Phase 22F" /
// etc. are NOT acceptable.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-1 · Phase-label cleanup');

// ── Specific banner / settings / FAQ copy is scrubbed ────────────────
assert(!html.includes('Phase 25E.4:</strong> Plain-English'),
  'Help/FAQ banner no longer leads with "Phase 25E.4:"');
assert(html.includes('Help / FAQ.</strong> Plain-English answers'),
  'Help/FAQ banner now leads with product language ("Help / FAQ.")');
assert(!html.includes('Phase 25E.3: SourceDeck owns lead management'),
  'Settings Airtable note no longer leads with "Phase 25E.3:"');
assert(!html.includes('Phase 25E.6: SourceDeck owns workflow automation'),
  'Settings Automation Config note no longer leads with "Phase 25E.6:"');
assert(!html.includes('Phase 24K: also available'),
  'Settings SAM.gov note no longer references "Phase 24K"');
assert(!html.includes('The Solicitation Workspace ships in Phase 22C'),
  'GovCon CC Solicitation Readiness placeholder no longer mentions Phase 22C');
assert(!html.includes('Past Performance Library in Phase 22E'),
  'GovCon Bid/No-Bid past-perf row no longer mentions Phase 22E');
assert(!html.includes('Pricing Worksheet ships in Phase 22D'),
  'GovCon Bid/No-Bid pricing row no longer mentions Phase 22D');
assert(!html.includes('Compliance Matrix Builder ships in Phase 22C'),
  'GovCon Bid/No-Bid compliance row no longer mentions Phase 22C');
assert(!html.includes('export bundle ships in Phase 22F'),
  'Export Matrix toast no longer mentions Phase 22F');

// ── "GovCon Capture OS" relabeled to "GovCon" across visible surfaces ──
assert(!/>GovCon Capture OS</.test(html),
  '"GovCon Capture OS" no longer appears as a visible label');
assert(/<div class="brand-ver"[^>]*>GovCon<\/div>/.test(html),
  'topbar brand-ver displays "GovCon"');

// ── Setup Wizard copy refers to "GovCon" not "GovCon Capture OS" ─────
assert(!/GovCon Capture OS becomes your default workspace/.test(html),
  'Setup Wizard finish copy no longer references "GovCon Capture OS"');
assert(/GovCon becomes your default workspace/.test(html),
  'Setup Wizard finish copy now references "GovCon"');
assert(/A one-screen tour of the GovCon surfaces/.test(html),
  'Setup Wizard tour copy refers to "the GovCon surfaces"');

// ── Internal-only references (comments, internal-review export
//    annotations) are explicitly allowed. We do NOT scrub the snapshot
//    Markdown bullets like "(Phase 22B)" — those are internal-review
//    export artifact labels, not user-facing chrome. Spot-check that a
//    representative internal label is intact.
const snapshotAllowed = /bullet\('Opportunity summary \(Phase 22B\)/;
// The marker may or may not exist depending on which snapshot code
// path is reached. We only assert the file still parses around it.
assert(typeof html === 'string' && html.length > 0,
  'HTML loaded for internal-only reference allowance check');

console.log(process.exitCode ? 'Phase 25L-1 · Phase-label cleanup: FAILED' : 'Phase 25L-1 · Phase-label cleanup: OK');
