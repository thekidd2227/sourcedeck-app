// Phase 25N · GovCon Overview removed from active runtime
// ──────────────────────────────────────────────────────────────────────
// The pre-25N GovCon pane rendered an Overview that scrolled through
// the Mode indicator, Demo Controls, Capture Command Center, and
// Operating Rhythm blocks all at once. Phase 25N retires that
// experience: every section that fed the Overview now carries
// data-gc-tab-page="hidden-internal" and a default inline
// style="display:none". The IDs stay in the DOM so existing tests
// that grep for structural anchors (Phase 23B/23A/22B/22B) continue
// to pass.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25N · GovCon Overview removed from active runtime');

// ── No "Overview" tab button in the new nav ─────────────────────────
assert(!/data-gc-tab="overview"/i.test(html),
  'No tab with data-gc-tab="overview" exists in the new tab nav');
const tabNavStart = html.indexOf('id="gc-tab-nav"');
const tabNavEnd = html.indexOf('</nav>', tabNavStart);
const tabNav = html.slice(tabNavStart, tabNavEnd);
assert(!/>Overview</i.test(tabNav),
  'The tab navigation does not contain a visible "Overview" button label');

// ── Default-tab cold-open is NOT Overview ───────────────────────────
assert(/DEFAULT_TAB\s*=\s*'find-opportunities'/.test(html),
  'JS default tab is find-opportunities, not overview');
assert(/<button type="button" class="gc-tab-btn active"[^>]*aria-selected="true"[^>]*data-gc-tab="find-opportunities"/.test(html),
  'The active-on-cold-open tab button is find-opportunities');

// ── Overview-y sections are routed to hidden-internal ───────────────
const overviewSections = [
  'gc-mode-indicator',
  'gc-demo-mode',
  'gc-capture-cc',
  'gc-operating-rhythm'
];
overviewSections.forEach(function(id){
  // Section must still exist in DOM (Phase 23C reachability invariant).
  assert(new RegExp('id="' + id + '"').test(html),
    'Section #' + id + ' is preserved in DOM');
  // Section must be tagged hidden-internal AND start hidden via inline style.
  const sectionMatch = html.match(new RegExp('<section[^>]*id="' + id + '"[^>]*>'));
  assert(sectionMatch && /data-gc-tab-page="hidden-internal"/.test(sectionMatch[0]),
    '#' + id + ' carries data-gc-tab-page="hidden-internal"');
  assert(sectionMatch && /style="display:none/.test(sectionMatch[0]),
    '#' + id + ' starts with inline style="display:none"');
});

// ── The "Jump to" scroll-pill bar (Phase 25F) is retired ────────────
assert(!/data-phase-25f="govcon-section-nav"/.test(html),
  'Phase 25F "Jump to" scroll-pill nav is replaced (data-phase-25f marker gone)');
assert(!/>Operating Rhythm<\/a>/.test(html),
  'No "Operating Rhythm" jump-link remains in the tab bar');
assert(!/<a href="#gc-capture-cc"[^>]*>Overview<\/a>/.test(html),
  'No "Overview" anchor link remains in the tab bar');

// ── The Phase 25M GovCon Pipeline (PR #115) is NOT required on this
// branch — Phase 25N branches from main without #115 and provides
// its own Find Opportunities surface instead.
assert(/id="gc-tab-find-opportunities"/.test(html),
  'Find Opportunities tab page is present (Phase 25N replacement for both Overview and the Phase 25M Pipeline mini-section)');

// ── Legacy KPI strip + opportunity table are routed to hidden-internal
const kpiSection = html.indexOf('id="gc-kpis"');
assert(kpiSection > 0, 'Legacy KPI strip #gc-kpis exists in DOM');
const beforeKpi = html.slice(Math.max(0, kpiSection - 600), kpiSection);
assert(/data-gc-tab-page="hidden-internal"/.test(beforeKpi),
  'Legacy KPI strip and opportunity table are wrapped in a hidden-internal container');

console.log(process.exitCode ? 'Phase 25N · GovCon Overview removed: FAILED' : 'Phase 25N · GovCon Overview removed: OK');
