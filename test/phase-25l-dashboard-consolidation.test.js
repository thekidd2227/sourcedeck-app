// Phase 25L · Dashboard consolidation test
// ──────────────────────────────────────────────────────────────────────
// Dashboard is the operating hub. Today's Tasks, Overdue, Pipeline,
// Reports, and Deal Workspace are surfaced as launchpad cards inside
// Dashboard — they no longer occupy top-level sidebar real estate.
// Dashboard is a launchpad: counts + open-tab buttons only, not a
// mega-page rendering every module's full table.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L · Dashboard consolidation');

// ── Launchpad container ──────────────────────────────────────────────
assert(html.includes('id="dash-launchpad"'),
  'Dashboard exposes a dedicated launchpad container');
assert(html.includes('data-dash-launchpad="true"'),
  'Launchpad container is flagged for downstream tests / a11y');

// ── Consolidation cards (one per buyer job) ──────────────────────────
const cards = [
  { id: 'active-pursuits',     label: 'Active pursuits',       target: 'govcon' },
  { id: 'overdue-items',       label: 'Overdue items',         target: 'overdue' },
  { id: 'todays-tasks',        label: "Today's Tasks",         target: 'dailyops' },
  { id: 'pipeline-value',      label: 'Pipeline value',        target: 'pipeline' },
  { id: 'proposal-deadlines',  label: 'Proposal deadlines',    target: 'execution' },
  { id: 'vendor-followups',    label: 'Vendor follow-ups',     target: 'execution' },
  { id: 'calendar-events',     label: 'Calendar events',       target: 'calendar' },
  { id: 'open-risks',          label: 'Open risks',            target: 'reply' },
  { id: 'leads-summary',       label: 'Leads',                 target: 'leads' },
  { id: 'reports-summary',     label: 'Reports',               target: 'proof' }
];

cards.forEach(function(card){
  assert(html.includes('data-dash-card="' + card.id + '"'),
    'Dashboard card "' + card.id + '" present');
  assert(html.includes('>' + card.label),
    'Dashboard card "' + card.id + '" shows label "' + card.label + '"');
  const navRe = new RegExp("openTab\\('" + card.target + "'\\)");
  assert(navRe.test(html),
    'Dashboard card "' + card.id + '" routes to openTab(\'' + card.target + '\')');
});

// ── Renderer hook ────────────────────────────────────────────────────
assert(html.includes('function renderDashboardLaunchpad'),
  'renderDashboardLaunchpad() helper is defined');
assert(html.includes('renderDashboardLaunchpad({'),
  'renderDashboard() invokes renderDashboardLaunchpad()');

// ── Dashboard pane-title is "Dashboard", not "Command Dashboard" ─────
assert(html.includes('<div class="pane-title"><span class="brief-head">Dashboard</span></div>'),
  'Dashboard pane-title reads "Dashboard"');
assert(!html.includes('Command Dashboard'),
  '"Command Dashboard" legacy label removed');

// ── Dashboard sits ABOVE GovCon in source order ──────────────────────
const dashIdx = html.indexOf('id="nav-section-dashboard"');
const govconIdx = html.indexOf('id="nav-section-govcon-primary"');
assert(dashIdx > 0 && govconIdx > 0 && dashIdx < govconIdx,
  'Dashboard nav-section appears above GovCon in source order');

// ── Leads is below GovCon, above Calendar ────────────────────────────
const leadsIdx = html.indexOf('id="nav-section-leads"');
const calendarIdx = html.indexOf('id="nav-section-calendar"');
assert(govconIdx < leadsIdx && leadsIdx < calendarIdx,
  'Leads sits below GovCon and above Calendar');

console.log(process.exitCode ? 'Phase 25L · Dashboard consolidation: FAILED' : 'Phase 25L · Dashboard consolidation: OK');
