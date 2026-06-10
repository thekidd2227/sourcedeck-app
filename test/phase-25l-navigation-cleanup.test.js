// Phase 25L · Navigation cleanup test
// ──────────────────────────────────────────────────────────────────────
// Asserts that the SourceDeck sidebar surfaces exactly 8 buyer-facing
// items (Dashboard, GovCon, Leads, Calendar, Response Desk, Proposal
// Workspace, Settings, Help / FAQ) in that order, and that the legacy
// "Other business tools" cluster has been removed from active nav.
// Removed surfaces (Email Tracker, Pilot Tracker, Command, Command
// Center, Opportunities, Deal Workspace, Pipeline, Reports, Daily Ops,
// Overdue, Revenue, Ad Engine, Socials, Outreach, Prime Partners) must
// not appear in the active sidebar; their nav buttons live in a hidden
// reachability buffer so openTab() programmatic targets still resolve
// (Phase 23C invariant: never orphan a pane).

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(condition, message) {
  if (!condition) {
    console.error('  ✗ ' + message);
    process.exitCode = 1;
  } else {
    console.log('  ✓ ' + message);
  }
}

console.log('Phase 25L · Navigation cleanup');

// ── 8 sidebar surfaces, in order ──────────────────────────────────────
const sidebarStart = html.indexOf('<div class="sidebar">');
const sidebarRemovedBufferStart = html.indexOf('id="nav-section-removed-25l"');
const sidebarVisibleSlice = html.slice(sidebarStart, sidebarRemovedBufferStart);

const expectedOrder = [
  { label: 'Dashboard',          dataTab: 'dashboard' },
  { label: 'GovCon',             dataTab: 'govcon' },
  { label: 'Leads',              dataTab: 'leads' },
  { label: 'Calendar',           dataTab: 'calendar' },
  { label: 'Response Desk',      dataTab: 'reply' },
  { label: 'Proposal Workspace', dataTab: 'execution' },
  { label: 'Settings',           dataTab: 'settings' },
  { label: 'Help / FAQ',         dataTab: 'help' }
];

let lastIdx = -1;
expectedOrder.forEach(function(item, i){
  // Match the active-sidebar nav button: <button ... data-tab="X">...<svg>...</svg></span>LABEL</button>
  // Allow arbitrary span/svg content between the data-tab attribute and the label text.
  const escLabel = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('data-tab="' + item.dataTab + '"[\\s\\S]*?<\\/svg><\\/span>' + escLabel + '<\\/button>');
  const match = re.exec(sidebarVisibleSlice);
  assert(match, 'sidebar item #' + (i + 1) + ' (' + item.label + ') is present in active sidebar');
  if (match) {
    assert(match.index > lastIdx, 'sidebar item #' + (i + 1) + ' (' + item.label + ') appears after #' + i + ' in source order');
    lastIdx = match.index;
  }
});

// ── Removed-from-active-nav surfaces must not appear in visible sidebar ──
const removedItems = [
  'Email Tracker',
  'Pilot Tracker',
  'Command Center',
  'Opportunities',
  'Deal Workspace',
  'Pipeline',
  'Reports',
  'Daily Ops',
  'Overdue',
  'Revenue',
  'Ad Engine',
  'Socials',
  'Outreach',
  'Prime Partners'
];

removedItems.forEach(function(label){
  const inVisible = sidebarVisibleSlice.includes('>' + label + '<') || sidebarVisibleSlice.includes('>' + label + ' <span');
  assert(!inVisible, '"' + label + '" is NOT in active sidebar');
});

// ── Hidden reachability buffer preserves nav buttons (Phase 23C) ──────
assert(html.includes('data-phase-25l="removed-from-active-nav"'),
  'Phase 25L reachability buffer (removed-from-active-nav) exists');
assert(html.includes('data-phase-25l-removed="true"'),
  'Removed nav buttons are flagged with data-phase-25l-removed');

const removedDataTabs = ['outreach','primes','cmd','command','email','overdue','content','dailyops','socials','createlead','aigenerate','delivery','opportunities','dealwork','pipeline','proof','revenue'];
removedDataTabs.forEach(function(dt){
  const re = new RegExp('data-tab="' + dt + '"[^>]*data-phase-25l-removed="true"');
  assert(re.test(html), 'removed nav button data-tab="' + dt + '" exists in hidden buffer');
});

// ── GovCon label is "GovCon", not "GovCon Capture OS", in active UI ──
const visibleGovconCaptureOs = /<[^>]*>GovCon Capture OS<\/[^>]*>/g;
let m;
let visibleCount = 0;
while ((m = visibleGovconCaptureOs.exec(html)) !== null) {
  visibleCount++;
}
assert(visibleCount === 0, '"GovCon Capture OS" no longer appears as visible label (renamed to "GovCon")');

// ── Brand version label in topbar is "GovCon" ─────────────────────────
assert(/id="brand-ver-el"[^>]*>GovCon</.test(html),
  'topbar brand-ver label is "GovCon"');

// ── No visible Phase labels in scrubbed surfaces ──────────────────────
// Specific banner / settings / FAQ surfaces should not display Phase X
// prefixes any longer.
assert(!html.includes('Phase 25E.4:</strong> Plain-English'),
  'Help/FAQ banner no longer leads with "Phase 25E.4:"');
assert(!html.includes('Phase 25E.3: SourceDeck owns lead management'),
  'Settings Airtable note no longer leads with "Phase 25E.3:"');
assert(!html.includes('Phase 25E.6: SourceDeck owns workflow automation'),
  'Settings Automation Config note no longer leads with "Phase 25E.6:"');

console.log(process.exitCode ? 'Phase 25L · Navigation cleanup: FAILED' : 'Phase 25L · Navigation cleanup: OK');
