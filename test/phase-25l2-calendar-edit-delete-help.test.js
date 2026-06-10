// Phase 25L-2 · Calendar event Edit/Delete + ICS help icon
// ──────────────────────────────────────────────────────────────────────
// Calendar event cards now expose inline View / Edit / Mark Complete /
// Reschedule / Delete controls plus a local-only footer note. The
// delete confirmation explicitly says SourceDeck-only and that
// external calendars are not changed. A "How do I get an .ics file?"
// help icon sits in the Calendar pane header and toggles a help panel
// covering Google, Apple/iCloud, Outlook, and Calendly export steps.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-2 · Calendar edit/delete + ICS help');

// ── Event card inline action surface ─────────────────────────────────
assert(html.includes('class="cal-event-card-actions"'),
  'Calendar event card surfaces an inline actions row');
const requiredCardActions = [
  { attr: 'data-cal-action="view"',       label: 'View'         },
  { attr: 'data-cal-action="edit"',       label: 'Edit'         },
  { attr: 'data-cal-action="complete"',   label: 'Mark Complete'},
  { attr: 'data-cal-action="reschedule"', label: 'Reschedule'   },
  { attr: 'data-cal-action="delete"',     label: 'Delete'       }
];
requiredCardActions.forEach(function(a){
  assert(html.includes(a.attr),
    'Calendar event card has a ' + a.label + ' action (' + a.attr + ')');
});

// ── Local-only delete confirmation copy ──────────────────────────────
assert(html.includes('Delete this SourceDeck calendar event?'),
  'Delete confirmation says "Delete this SourceDeck calendar event?"');
assert(html.includes('This removes it from SourceDeck only'),
  'Delete confirmation states removal is from SourceDeck only');
assert(html.includes('does not delete it from Google, iCloud, Outlook, or any external calendar'),
  'Delete confirmation states external calendars are not touched');

// ── Footer note on every event card ──────────────────────────────────
assert(html.includes('Local SourceDeck event only. Editing or deleting here does not change your external calendar.'),
  'Every event card carries the local-only footer note');

// ── Card-level handler bindings ──────────────────────────────────────
const requiredHandlers = ['calCardView','calCardEdit','calCardMarkComplete','calCardReschedule','calCardDelete'];
requiredHandlers.forEach(function(fn){
  assert(html.includes('function ' + fn + '('),
    fn + '() handler is defined');
});

// ── calDeleteEvent accepts skipConfirm ───────────────────────────────
assert(/window\.calDeleteEvent\s*=\s*function\(opts\)/.test(html),
  'window.calDeleteEvent accepts opts.skipConfirm so card handler can suppress duplicate confirm dialog');
assert(html.includes('if (!opts.skipConfirm'),
  'calDeleteEvent honors opts.skipConfirm');

// ── ICS help icon + panel ────────────────────────────────────────────
assert(html.includes('id="cal-ics-help-btn"'),
  'ICS help icon button exists in the Calendar pane header');
assert(html.includes('How do I get an .ics file?'),
  'Help icon label asks "How do I get an .ics file?"');
assert(html.includes('id="cal-ics-help-panel"'),
  'ICS help panel exists');
assert(html.includes('aria-controls="cal-ics-help-panel"'),
  'Help icon is wired to the help panel via aria-controls');
assert(html.includes('window.calToggleIcsHelp'),
  'calToggleIcsHelp() toggle function is exposed');

// ── Help panel content — required sections ───────────────────────────
const helpRequired = [
  'What is an ICS file?',
  'Can I import any calendar?',
  'Google Calendar',
  'Apple Calendar / iCloud',
  'Outlook',
  'Calendly',
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

// ── No affirmative live-sync / OAuth / password claim in the help slice ──
const sliceStart = html.indexOf('id="cal-ics-help-panel"');
const sliceEnd = html.indexOf('</div>', sliceStart + 6000);
const helpSlice = html.slice(sliceStart, sliceEnd > sliceStart ? sliceEnd : sliceStart + 6000);
const unsafeAffirmativePatterns = [
  { re: /[Ll]ive sync (enabled|active|on)\b/, label: 'Live sync enabled/active/on' },
  { re: /[Tt]wo-way sync (enabled|active|on)\b/, label: 'two-way sync enabled/active/on' },
  { re: /[Gg]oogle OAuth\s+(connected|configured|active)\b/, label: 'Google OAuth connected/configured/active' },
  { re: /iCloud password/i, label: 'iCloud password' },
  { re: /Gmail password/i, label: 'Gmail password' },
  { re: /Outlook password/i, label: 'Outlook password' }
];
unsafeAffirmativePatterns.forEach(function(p){
  assert(!p.re.test(helpSlice), 'ICS help panel does not claim "' + p.label + '"');
});

console.log(process.exitCode ? 'Phase 25L-2 · Calendar edit/delete + ICS help: FAILED' : 'Phase 25L-2 · Calendar edit/delete + ICS help: OK');
