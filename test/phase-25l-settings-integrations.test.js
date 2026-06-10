// Phase 25L · Settings integrations test
// ──────────────────────────────────────────────────────────────────────
// Settings now hosts configuration-level controls that used to clutter
// operational pages:
//   - Calendar Import (right after API key info)
//   - Email Import (future secure Gmail/Outlook OAuth placeholder)
//   - Hunter.io API Key (optional contact enrichment, write-only)
//
// Calendar/email setup belongs here, NOT in Calendar or Response Desk
// operational surfaces. Hunter.io key is optional; SourceDeck never
// uses Hunter.io automatically and never prints/exports/logs the key.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L · Settings integrations');

// ── Calendar Import section ──────────────────────────────────────────
assert(html.includes('data-settings-section="calendar-import"'),
  'Settings exposes a Calendar Import section');
assert(html.includes('id="settings-calendar-import-card"'),
  'Calendar Import card has stable id');
assert(html.includes('Import .ics calendar files locally'),
  'Calendar Import copy clarifies local-only behavior');
assert(html.includes('SourceDeck does not use Google, Outlook, or iCloud OAuth in this phase'),
  'Calendar Import copy explicitly disclaims OAuth in this phase');

// ── Email Import placeholder ─────────────────────────────────────────
assert(html.includes('data-settings-section="email-import"'),
  'Settings exposes an Email Import section');
assert(html.includes('Future secure Gmail/Outlook OAuth integration'),
  'Email Import section describes future OAuth integration');
assert(html.includes('paste replies manually'),
  'Email Import section steers to manual paste in current phase');
assert(html.includes('Importing an .ics calendar file does <strong>not</strong> give SourceDeck access to your email inbox'),
  'Email Import section corrects the ICS-vs-email confusion');
assert(html.includes('SourceDeck never requests Gmail, iCloud, or Outlook passwords'),
  'Email Import section preserves no-password posture');

// ── Hunter.io API key field ──────────────────────────────────────────
assert(html.includes('id="s-hunter"'),
  'Hunter.io API key input is present');
assert(html.includes('Hunter.io API Key'),
  'Hunter.io API key label is present');
assert(html.includes('Hunter.io helps find public business email contacts'),
  'Hunter.io explanation text is present');
assert(html.includes('Add your Hunter.io API key only if you have a Hunter.io account'),
  'Hunter.io copy explicitly marks the key as opt-in');
assert(html.includes('SourceDeck uses it only when you click contact-enrichment actions'),
  'Hunter.io copy clarifies user-triggered usage');
assert(html.includes('Optional only'),
  'Hunter.io copy labels the field as optional');
assert(html.includes('SourceDeck does not print, export, or log this key'),
  'Hunter.io copy commits to never printing/exporting/logging the key');

// ── Hunter.io key persisted via secure credential adapter ────────────
assert(html.includes("HUNTER_API_KEY: document.getElementById('s-hunter')?.value?.trim()"),
  'saveSettings() collects HUNTER_API_KEY from the Hunter input');
assert(html.includes("window.sd.credentials.set('hunter-io'"),
  'saveSettings() persists Hunter.io key via the safe credential adapter');
assert(html.includes("s.present['hunter-io']"),
  'loadSettings() reads Hunter.io presence flag from the credential adapter');

// ── Calendar Import section appears AFTER API Keys card ──────────────
const apiKeysIdx = html.indexOf('>API Keys<');
const calImportIdx = html.indexOf('id="settings-calendar-import-card"');
assert(apiKeysIdx > 0 && calImportIdx > apiKeysIdx,
  'Calendar Import section is placed after the API Keys card');

// ── Email Import section appears after Calendar Import section ───────
const emailImportIdx = html.indexOf('id="settings-email-import-card"');
assert(emailImportIdx > calImportIdx,
  'Email Import section is placed after Calendar Import');

console.log(process.exitCode ? 'Phase 25L · Settings integrations: FAILED' : 'Phase 25L · Settings integrations: OK');
