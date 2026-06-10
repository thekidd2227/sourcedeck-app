// Phase 25L-2 · Settings → Calendar Import section
// ──────────────────────────────────────────────────────────────────────
// Calendar import setup belongs in Settings (right after the API Keys
// card) so the operational Calendar page stays focused on browsing /
// editing events. The Calendar Import card delegates back to the
// Calendar pane's existing handlers (calOpenIcsPicker / calOpenPasteModal
// / calToggleIcsHelp). No OAuth, no passwords, no live sync.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-2 · Settings → Calendar Import');

// ── Calendar Import section is present ───────────────────────────────
assert(html.includes('data-settings-section="calendar-import"'),
  'Settings exposes a Calendar Import section');
assert(html.includes('id="settings-calendar-import-card"'),
  'Calendar Import card has stable id');

// ── Copy clarifies local-only behavior and no OAuth ──────────────────
assert(html.includes('Import .ics calendar files locally'),
  'Calendar Import copy clarifies local-only behavior');
assert(html.includes('SourceDeck does not use Google, Outlook, or iCloud OAuth in this phase'),
  'Calendar Import copy explicitly disclaims OAuth in this phase');
assert(html.includes('SourceDeck never requests Gmail, iCloud, or Outlook passwords'),
  'Calendar Import copy explicitly disclaims password collection');

// ── Three primary actions (Import / Paste / Help) wired ──────────────
const requiredActions = [
  { attr: 'data-settings-action="open-ics-picker"', handler: "openTab('calendar'); calOpenIcsPicker();" },
  { attr: 'data-settings-action="open-ics-paste"',  handler: "openTab('calendar'); calOpenPasteModal();" },
  { attr: 'data-settings-action="open-ics-help"',   handler: "openTab('calendar'); calToggleIcsHelp();" }
];
requiredActions.forEach(function(a){
  assert(html.includes(a.attr),
    'Calendar Import card has action ' + a.attr);
  assert(html.includes(a.handler),
    'Calendar Import action "' + a.attr + '" delegates to "' + a.handler + '"');
});

// ── Section is placed AFTER the API Keys card ────────────────────────
const apiKeysIdx = html.indexOf('>API Keys<');
const calImportIdx = html.indexOf('id="settings-calendar-import-card"');
assert(apiKeysIdx > 0 && calImportIdx > apiKeysIdx,
  'Calendar Import section is placed after the API Keys card');

// ── Section is placed BEFORE the Automation Config card ──────────────
const automationIdx = html.indexOf('Automation Config');
assert(automationIdx > calImportIdx,
  'Calendar Import section is placed before the Automation Config card');

// ── ICS-vs-email separation is reiterated here ───────────────────────
assert(/Importing an \.ics file does <strong>not<\/strong> give SourceDeck access to your email inbox/.test(html),
  'Calendar Import section reiterates the ICS-vs-email-inbox separation');

console.log(process.exitCode ? 'Phase 25L-2 · Settings → Calendar Import: FAILED' : 'Phase 25L-2 · Settings → Calendar Import: OK');
