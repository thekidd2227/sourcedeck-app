// Phase 25M · Dashboard + GovCon UX cleanup
// ──────────────────────────────────────────────────────────────────────
// Asserts Dashboard surfaces a "Start a pursuit" intake card alongside
// the existing launchpad cards (concise · counts + actions only · no
// full module tables rendered here), and that the GovCon pane's
// section-pill navigation gains a Pipeline pill that anchors the
// Phase 25M GovCon Pipeline section. Also enforces the no-affirmative-
// submission / no-legal-advice / no-Phase-label safety surface.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25M · Dashboard + GovCon UX cleanup');

// ── Dashboard "Start a pursuit" card ─────────────────────────────────
assert(/data-dash-card="start-pursuit"/.test(html),
  'Dashboard exposes a "Start a pursuit" intake card');
assert(/data-dash-start-action="search-sam"/.test(html),
  'Start-a-pursuit card has Search SAM.gov action');
assert(/data-dash-start-action="upload-solicitation"/.test(html),
  'Start-a-pursuit card has Upload Solicitation action');
assert(/data-dash-start-action="paste-solicitation"/.test(html),
  'Start-a-pursuit card has Paste Solicitation Text action');

// ── Dashboard pane-title remains concise ("Dashboard") ──────────────
assert(/<div class="pane-title"><span class="brief-head">Dashboard<\/span><\/div>/.test(html),
  'Dashboard pane-title is "Dashboard"');

// ── Dashboard does NOT render full module tables by default ─────────
const dashStart = html.indexOf('id="tab-dashboard"');
const dashEnd = html.indexOf('<!-- ═══════ LEADS', dashStart);
const dash = html.slice(dashStart, dashEnd > 0 ? dashEnd : dashStart + 30000);
// The launchpad cards each render one count + one button. No <table> with full module rows should live inside the launchpad card itself.
const launchpadStart = dash.indexOf('id="dash-launchpad"');
const launchpadEnd = dash.indexOf('</div>\n        </div>\n\n        <!-- KPI ROW', launchpadStart);
const launchpad = dash.slice(launchpadStart, launchpadEnd > 0 ? launchpadEnd : launchpadStart + 8000);
assert(!/<table\b/.test(launchpad),
  'Dashboard launchpad does not render any full <table> by default');

// ── GovCon tab nav surfaces the SAM pipeline landing (Phase 25N) ────
// Phase 25N replaced the Phase 25F "Jump to" section-pill nav with
// real tab-pages; the pipeline now lives on the Find Opportunities tab.
assert(/data-gc-tab="find-opportunities"/.test(html),
  'GovCon tab nav includes the Find Opportunities (SAM pipeline) tab');
assert(/id="gc-tab-nav"/.test(html),
  'GovCon tab nav is preserved');

// ── GovCon label is "GovCon" (Phase 25L-1 invariant preserved) ──────
assert(/<div class="nav-label">GovCon<\/div>/.test(html),
  'Sidebar "GovCon" label preserved');
assert(/<div class="brand-ver"[^>]*>GovCon<\/div>/.test(html),
  'Topbar brand-ver "GovCon" preserved');
assert(!/>GovCon Capture OS</.test(html),
  '"GovCon Capture OS" is not present as visible label');

// ── No visible Phase labels in scrubbed surfaces (Phase 25L-1 carry-over) ──
const visiblePhaseRe = /Phase 25E\.4:<\/strong> Plain-English/;
assert(!visiblePhaseRe.test(html),
  'Help/FAQ banner stays scrubbed of "Phase 25E.4:" prefix');

// ── No-send / no-submit / no-upload safety surface ──────────────────
// Strip HTML and JS comments first so that negation phrases inside
// boundary-documentation comments ("No Send Email / Submit Bid / …")
// do not register as affirmative claims.
const stripped = html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const forbidden = [
  { re: />\s*Submit Bid\s*</, label: 'Submit Bid button' },
  { re: />\s*Submit Quote\s*</, label: 'Submit Quote button' },
  { re: />\s*Send Email\s*</, label: 'Send Email button' },
  { re: /\bupload to SAM\b/i, label: 'upload to SAM' },
  { re: /\bupload to PIEE\b/i, label: 'upload to PIEE' },
  { re: /\bupload to eBuy\b/i, label: 'upload to eBuy' },
  { re: /\bupload to acquisition\.gov\b/i, label: 'upload to acquisition.gov' },
  { re: /\bauto[-\s]?contact vendors\b/i, label: 'auto-contact vendors' },
  { re: /\bauto[-\s]?contact agencies\b/i, label: 'auto-contact agencies' },
  { re: /\blive calendar sync (?:enabled|active|on)\b/i, label: 'live calendar sync (affirmative)' },
  { re: /\bGmail password\b/i, label: 'Gmail password' },
  { re: /\biCloud password\b/i, label: 'iCloud password' },
  { re: /\bOutlook password\b/i, label: 'Outlook password' },
  { re: /\bcertified compliant\b/i, label: 'certified compliant' },
  { re: /\blegally sufficient\b/i, label: 'legally sufficient' },
  { re: /\bprovides legal advice\b/i, label: 'provides legal advice' }
];
forbidden.forEach(function(f){
  assert(!f.re.test(stripped), 'No affirmative "' + f.label + '" claim present');
});

console.log(process.exitCode ? 'Phase 25M · Dashboard + GovCon UX cleanup: FAILED' : 'Phase 25M · Dashboard + GovCon UX cleanup: OK');
