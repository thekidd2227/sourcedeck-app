// Phase 25L-1 · Navigation cleanup test
// ──────────────────────────────────────────────────────────────────────
// Asserts the SourceDeck sidebar surfaces exactly 8 buyer-facing items
// in fixed order (Dashboard → GovCon → Leads → Calendar → Response
// Desk → Proposal Workspace → Settings → Help / FAQ) and that the
// legacy "Other business tools" cluster has been removed from active
// nav. Removed surfaces (Email Tracker, Pilot Tracker, Command,
// Command Center, Opportunities, Deal Workspace, Pipeline, Reports,
// Daily Ops, Overdue, Revenue, Ad Engine, Socials, Outreach, Prime
// Partners) must not appear in the active sidebar; their nav buttons
// live in a hidden reachability buffer so openTab() programmatic
// targets still resolve — Phase 23C reachability invariant: never
// orphan a pane.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-1 · Navigation cleanup');

// ── 8 sidebar surfaces, in order ─────────────────────────────────────
const sidebarStart = html.indexOf('<div class="sidebar">');
const sidebarRemovedBufferStart = html.indexOf('id="nav-section-removed-25l1"');
assert(sidebarStart > 0, 'sidebar container exists');
assert(sidebarRemovedBufferStart > sidebarStart, 'Phase 25L-1 reachability buffer exists after sidebar');

const sidebarVisibleSlice = html.slice(sidebarStart, sidebarRemovedBufferStart);

// Phase 25V — Proposal Workspace moved directly under GovCon.
const expectedOrder = [
  { label: 'Dashboard',          dataTab: 'dashboard' },
  { label: 'GovCon',             dataTab: 'govcon' },
  { label: 'Proposal Workspace', dataTab: 'execution' },
  { label: 'Leads',              dataTab: 'leads' },
  { label: 'Calendar',           dataTab: 'calendar' },
  { label: 'Response Desk',      dataTab: 'reply' },
  { label: 'Settings',           dataTab: 'settings' },
  { label: 'Help / FAQ',         dataTab: 'help' }
];

let lastIdx = -1;
expectedOrder.forEach(function(item, i){
  const escLabel = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('data-tab="' + item.dataTab + '"[\\s\\S]*?<\\/svg><\\/span>' + escLabel + '<\\/button>');
  const match = re.exec(sidebarVisibleSlice);
  assert(match, 'sidebar item #' + (i + 1) + ' (' + item.label + ') is present in active sidebar');
  if (match){
    assert(match.index > lastIdx, 'sidebar item #' + (i + 1) + ' (' + item.label + ') appears after #' + i + ' in source order');
    lastIdx = match.index;
  }
});

// ── Removed-from-active-nav surfaces must not appear in visible sidebar ──
// "Prime Partners" used to be in this removed-from-active-nav list under
// Phase 25L-1. The fix(nav) navigation-flatten work explicitly returns
// "Prime Partners" to the sidebar as a GovCon sub-item (one of the 10
// items the product spec requires under the GovCon nav-section), so it
// must NOT be in this removal list anymore. The other 13 items stay
// removed exactly as Phase 25L-1 intended.
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
  'Outreach'
];
removedItems.forEach(function(label){
  const inVisible = sidebarVisibleSlice.includes('>' + label + '<') || sidebarVisibleSlice.includes('>' + label + ' <span');
  assert(!inVisible, '"' + label + '" is NOT in active sidebar');
});

// ── Hidden reachability buffer preserves nav buttons (Phase 23C) ─────
assert(html.includes('data-phase-25l1="removed-from-active-nav"'),
  'Phase 25L-1 reachability buffer (removed-from-active-nav) exists');
assert(html.includes('data-phase-25l1-removed="true"'),
  'Removed nav buttons are flagged with data-phase-25l1-removed');

const removedDataTabs = ['outreach','primes','cmd','command','email','overdue','content','dailyops','socials','createlead','aigenerate','delivery','opportunities','dealwork','pipeline','proof','revenue'];
removedDataTabs.forEach(function(dt){
  const re = new RegExp('data-tab="' + dt + '"[^>]*data-phase-25l1-removed="true"');
  assert(re.test(html), 'removed nav button data-tab="' + dt + '" exists in hidden buffer');
});

// ── Brand sub-label / "GovCon Capture OS" → "GovCon" ─────────────────
assert(/id="brand-ver-el"[^>]*>GovCon</.test(html),
  'topbar brand-ver label is "GovCon"');
assert(!/<div class="nav-label">GovCon Capture OS<\/div>/.test(html),
  '"GovCon Capture OS" nav-label is retired');
assert(/<div class="nav-label">GovCon<\/div>/.test(html),
  '"GovCon" nav-label is present');

// ── Show All Tools toggle retired; gcToggleAllTools is a no-op stub ──
assert(!/id="gc-show-all-tools-btn"/.test(html),
  'Phase 23C Show All Tools toggle button retired');
assert(!/data-other-business-tools/.test(html),
  'data-other-business-tools markers retired');
assert(/window\.gcToggleAllTools\s*=\s*function/.test(html),
  'gcToggleAllTools no-op stub preserved for legacy callers');

// ── Every commercial pane preserved (Phase 23C reachability) ─────────
// PR #151 closeout: Phase 26C removed four orphaned tab-panes
// (`cmd`, `command`, `revenue`, `socials`) from the DOM. The remaining
// commercial surface is what this test now pins. Restoring them would
// regress Phase 26C, so the list is intentionally narrowed.
const commercialPanes = ['dashboard','leads','email','overdue','reply','content','dailyops','createlead','aigenerate','settings','delivery','opportunities','dealwork','pipeline','execution','proof','clinical'];
commercialPanes.forEach(function(p){
  assert(new RegExp('id="tab-' + p + '"').test(html),
    'commercial tab-pane preserved: tab-' + p);
});

// ── No-send / no-submit / no-upload safety preserved ─────────────────
assert(!/>\s*Send Email\s*</.test(html),
  'no Send Email button reintroduced');
assert(!/>\s*Submit Bid\s*</i.test(html),
  'no Submit Bid button reintroduced');
assert(!/>\s*Submit Quote\s*</i.test(html),
  'no Submit Quote button reintroduced');

console.log(process.exitCode ? 'Phase 25L-1 · Navigation cleanup: FAILED' : 'Phase 25L-1 · Navigation cleanup: OK');
