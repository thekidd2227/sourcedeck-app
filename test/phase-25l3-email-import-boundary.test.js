// Phase 25L-3 · Settings → Email Import boundary
// ──────────────────────────────────────────────────────────────────────
// Settings → Email Import card lands between Calendar Import and
// Automation Config. It is a placeholder for a future secure Gmail /
// Outlook OAuth integration. In the current build the integration is
// not active and Response Desk Import Email is manual paste / upload
// only. The copy explicitly disclaims password collection, OAuth in
// this phase, ICS → email inbox confusion, and any auto-scan or
// auto-send behavior.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-3 · Settings → Email Import boundary');

// ── Email Import section present ─────────────────────────────────────
assert(html.includes('data-settings-section="email-import"'),
  'Settings exposes an Email Import section');
assert(html.includes('id="settings-email-import-card"'),
  'Email Import card has stable id');

// ── Future secure OAuth wording ──────────────────────────────────────
assert(html.includes('Future secure Gmail/Outlook OAuth integration'),
  'Email Import section describes a future secure OAuth integration');
assert(/Not active in this build unless configured by the operator/.test(html),
  'Email Import section is explicitly inactive in this build');
assert(/paste replies manually in Response Desk/.test(html),
  'Email Import section steers to manual paste in current phase');

// ── Password posture ─────────────────────────────────────────────────
assert(/SourceDeck never requests Gmail, iCloud, or Outlook passwords/.test(html),
  'Email Import section explicitly disclaims Gmail / iCloud / Outlook password collection');

// ── ICS-vs-email separation reiterated here ──────────────────────────
assert(/Importing an \.ics calendar file does <strong>not<\/strong> give SourceDeck access to your email inbox/.test(html),
  'Email Import section reiterates ICS-vs-email inbox separation');
assert(/Calendar import and email import are separate/.test(html),
  'Email Import section says calendar import and email import are separate');

// ── No auto-scan / no auto-send claims ───────────────────────────────
assert(/SourceDeck does not auto-scan email/.test(html),
  'Email Import section explicitly disclaims auto-scan');
assert(/SourceDeck never sends email/.test(html),
  'Email Import section explicitly disclaims sending email');

// ── Not configured indicator ─────────────────────────────────────────
assert(html.includes('data-settings-email-import-state="true"'),
  'Email Import section carries a status indicator slot');
assert(html.includes('>Not configured<'),
  'Email Import section default state reads "Not configured"');

// ── Placement: Calendar Import < Email Import < Automation Config ────
const calImportIdx = html.indexOf('id="settings-calendar-import-card"');
const emailImportIdx = html.indexOf('id="settings-email-import-card"');
const automationIdx = html.indexOf('Automation Config');
assert(calImportIdx > 0 && emailImportIdx > calImportIdx,
  'Email Import section is placed after Calendar Import');
assert(automationIdx > emailImportIdx,
  'Email Import section is placed before Automation Config');

// ── No affirmative OAuth / password / live-sync claims globally ──────
const affirmativeForbidden = [
  { re: /\bGoogle OAuth (enabled|active|configured)\b/i, label: 'Google OAuth enabled/active/configured' },
  { re: /\bOutlook OAuth (enabled|active|configured)\b/i, label: 'Outlook OAuth enabled/active/configured' },
  { re: /\bGmail OAuth (enabled|active|configured)\b/i, label: 'Gmail OAuth enabled/active/configured' },
  // Allow negation forms like "does not auto-scan email" / "never
  // auto-scans email"; only block the affirmative claim where it
  // would imply SourceDeck performs the scan.
  { re: /(?<!not |never |Do not |Does not )\bauto[-\s]?scans email\b/i, label: 'auto-scan email (affirmative)' },
  { re: /\bsends email automatically\b/i, label: 'sends email automatically' }
];
affirmativeForbidden.forEach(function(f){
  assert(!f.re.test(html),
    'No affirmative "' + f.label + '" claim present in renderer');
});

console.log(process.exitCode ? 'Phase 25L-3 · Settings → Email Import boundary: FAILED' : 'Phase 25L-3 · Settings → Email Import boundary: OK');
