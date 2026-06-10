// Phase 25L · Calendar event edit/delete controls + ICS help icon
// ──────────────────────────────────────────────────────────────────────
// Calendar event cards now expose inline Edit / Mark Complete /
// Reschedule / Delete controls plus a local-only footer note. A "How do
// I get an .ics file?" help icon sits above Import .ics File and toggles
// a help panel covering Google, Apple/iCloud, and Outlook export steps.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L · Calendar edit/delete + ICS help');

// ── Event card inline action surface ─────────────────────────────────
assert(html.includes('class="cal-event-card-actions"'),
  'Calendar event card surfaces an inline actions row');
assert(html.includes('data-cal-action="edit"'),
  'Calendar event card has an Edit action');
assert(html.includes('data-cal-action="delete"'),
  'Calendar event card has a Delete action');
assert(html.includes('data-cal-action="complete"'),
  'Calendar event card has a Mark Complete action');
assert(html.includes('data-cal-action="reschedule"'),
  'Calendar event card has a Reschedule action');

// ── Local-only delete confirmation copy ───────────────────────────────
assert(html.includes('Delete this SourceDeck calendar event?'),
  'Delete confirmation says "Delete this SourceDeck calendar event?"');
assert(html.includes('This removes it from SourceDeck only'),
  'Delete confirmation states removal is from SourceDeck only');
assert(html.includes('does not delete it from Google, iCloud, Outlook'),
  'Delete confirmation states external calendars are not touched');

// ── Footer note on every event card ───────────────────────────────────
assert(html.includes('Local SourceDeck event only. Editing or deleting here does not change your external calendar.'),
  'Every event card carries the local-only footer note');

// ── Card-level handler bindings ───────────────────────────────────────
assert(html.includes('function calCardDelete('),
  'calCardDelete() handler is defined');
assert(html.includes('function calCardMarkComplete('),
  'calCardMarkComplete() handler is defined');
assert(html.includes('function calCardReschedule('),
  'calCardReschedule() handler is defined');

// ── ICS help icon + panel ─────────────────────────────────────────────
assert(html.includes('id="cal-ics-help-btn"'),
  'ICS help icon button exists');
assert(html.includes('How do I get an .ics file?'),
  'Help icon label asks "How do I get an .ics file?"');
assert(html.includes('id="cal-ics-help-panel"'),
  'ICS help panel exists');
assert(html.includes('aria-controls="cal-ics-help-panel"'),
  'Help icon is wired to the help panel via aria-controls');
assert(html.includes('window.calToggleIcsHelp'),
  'calToggleIcsHelp() toggle function is exposed');

// ── Help panel content — required sections ────────────────────────────
const helpRequired = [
  'What is an ICS file?',
  'Can I import any calendar?',
  'Google Calendar',
  'Apple Calendar / iCloud',
  'Outlook',
  'SourceDeck imports a local copy only',
  'SourceDeck does not change your external calendar',
  'SourceDeck does not send invites',
  'SourceDeck does not sync to Google, Outlook, or iCloud in this phase',
  'export and import a new .ics file',
  'Importing an .ics file does <strong>not</strong> give SourceDeck access to your email inbox'
];
helpRequired.forEach(function(s){
  assert(html.includes(s), 'ICS help panel covers "' + s.replace(/<[^>]+>/g,'') + '"');
});

// ── No live-sync claim and no OAuth/password request in the help text ─
const sliceStart = html.indexOf('id="cal-ics-help-panel"');
const sliceEnd = html.indexOf('</div>', sliceStart + 6000);
const helpSlice = html.slice(sliceStart, sliceEnd > sliceStart ? sliceEnd : sliceStart + 6000);
// Allowed to *deny* live/two-way sync ("This is import, not live sync."),
// so we only block affirmative claims. Each pattern must be the leading
// or affirmative form: "Live sync enabled", "two-way sync", "Google OAuth"
// without "no" or "not".
const unsafeAffirmativePatterns = [
  { re: /[Ll]ive sync (enabled|active|on)/, label: 'Live sync enabled/active/on' },
  { re: /[Tt]wo-way sync (enabled|active|on)/, label: 'two-way sync enabled/active/on' },
  { re: /[Gg]oogle OAuth\s+(connected|configured|active)/, label: 'Google OAuth connected/configured/active' },
  { re: /iCloud password/i, label: 'iCloud password' },
  { re: /Gmail password/i, label: 'Gmail password' },
  { re: /Outlook password/i, label: 'Outlook password' }
];
unsafeAffirmativePatterns.forEach(function(p){
  assert(!p.re.test(helpSlice),
    'ICS help panel does not claim "' + p.label + '"');
});

console.log(process.exitCode ? 'Phase 25L · Calendar edit/delete + ICS help: FAILED' : 'Phase 25L · Calendar edit/delete + ICS help: OK');
