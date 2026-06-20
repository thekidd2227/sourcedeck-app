// Phase 25M · Proposal Workspace solicitation selector
// ──────────────────────────────────────────────────────────────────────
// Asserts Proposal Workspace exposes a solicitation selector with
// package/upload intake routes (SAM.gov imported/downloaded packages and
// manually uploaded files), an Upload / Extract / Clear action row, and that
// Extract Key Details renders 6 FAR-aligned sections each with Draft
// / Approve / Needs revision / Retry with notes controls.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25M · Proposal Workspace solicitation selector');

// ── Solicitation intake card present ─────────────────────────────────
assert(/id="pw-solicitation-intake"/.test(html),
  'Proposal Workspace exposes a Solicitation Intake card');
assert(/data-pw-solicitation-intake="true"/.test(html),
  'Intake card carries the Phase 25M data attribute');

// ── Selector + per-record metadata surface ───────────────────────────
assert(/id="pw-sol-selector"/.test(html),
  'Solicitation selector dropdown is present');
assert(/data-pw-sol-selector="true"/.test(html),
  'Selector carries a stable data attribute');
assert(/id="pw-sol-current-source"/.test(html),
  'Current-source label is present');
assert(/id="pw-sol-current-status"/.test(html),
  'Current-status label is present');

// ── Required action buttons + handlers ──────────────────────────────
const requiredActions = [
  { id: 'pw-sol-upload-btn',  attr: 'data-pw-sol-action="upload"',  handler: 'pwSolOpenFilePicker' },
  { id: 'pw-sol-extract-btn', attr: 'data-pw-sol-action="extract"', handler: 'pwSolExtractKeyDetails' },
  { id: 'pw-sol-clear-btn',   attr: 'data-pw-sol-action="clear"',   handler: 'pwSolClearSelected' }
];
requiredActions.forEach(function(a){
  assert(html.includes('id="' + a.id + '"'),
    'Button ' + a.id + ' is present');
  assert(html.includes(a.attr),
    'Button ' + a.id + ' carries ' + a.attr);
  assert(html.includes('window.' + a.handler + ' ='),
    'Handler window.' + a.handler + ' is defined');
});
assert(!/id="pw-sol-paste-btn"/.test(html),
  'Paste button is removed from runtime intake');
assert(html.includes('window.pwSolTogglePasteArea ='),
  'Deprecated paste handler remains for compatibility');

// ── Canonical native picker replaces renderer FileReader input ──────
assert(!/id="pw-sol-file"/.test(html), 'Duplicate renderer-only file input is removed');
assert(/selectAndExtractSolicitation/.test(html), 'Proposal Workspace uses the canonical main-process importer');
assert(/Select up to 5 solicitation documents per upload\./.test(html), 'Five-document limit is visible');

// ── Paste textarea removed ───────────────────────────────────────────
assert(!/id="pw-sol-paste-text"/.test(html),
  'Paste textarea is removed from runtime intake');

// ── Empty-state copy ─────────────────────────────────────────────────
assert(/No solicitation selected\. Search SAM\.gov, download a package, or upload a solicitation to begin\./.test(html),
  'Empty state copy matches the Phase 25M spec');

// ── 6 FAR-aligned categories registered in the renderer ─────────────
const required = [
  { id: 'metadata-summary',      title: 'Solicitation Metadata & Summary'      },
  { id: 'scope-of-work',         title: 'Scope of Work'                         },
  { id: 'place-of-performance',  title: 'Place of Performance'                  },
  { id: 'subcontractor-prep',    title: 'Subcontractor ID & Proposal Prep'      },
  { id: 'compliance-submission', title: 'Compliance & Submission Requirements'  },
  { id: 'site-visit-logistics',  title: 'Site Visit Details & Logistics'        }
];
required.forEach(function(c){
  const idRe = new RegExp("id:\\s*'" + c.id + "'");
  assert(idRe.test(html), 'CATEGORIES entry id="' + c.id + '"');
  assert(html.includes(c.title), 'Category title "' + c.title + '" appears');
});

// ── Per-section actions: Draft / Approve / Needs revision / Retry ───
const sectionActions = ['draft','approve','needs-revision','retry-with-notes'];
sectionActions.forEach(function(a){
  const re = new RegExp('data-pw-sol-section-action="' + a + '"');
  assert(re.test(html),
    'Per-section action "' + a + '" wired');
});
assert(html.includes('window.pwSolSectionAction ='),
  'window.pwSolSectionAction handler is defined');

// ── Source comment / placement ───────────────────────────────────────
assert(/Phase 25M — Solicitation Intake/.test(html),
  'Phase 25M comment is present at the intake card');

// ── Dashboard "Start a pursuit" card routes here ─────────────────────
assert(/data-dash-card="start-pursuit"/.test(html),
  'Dashboard "Start a pursuit" card exists');
const startActions = ['search-sam','upload-solicitation','download-package'];
startActions.forEach(function(a){
  const re = new RegExp('data-dash-start-action="' + a + '"');
  assert(re.test(html),
    'Dashboard Start a pursuit action "' + a + '" wired');
});

console.log(process.exitCode ? 'Phase 25M · Proposal Workspace solicitation selector: FAILED' : 'Phase 25M · Proposal Workspace solicitation selector: OK');
