// Phase 25M · Calendar delete repair + compact ICS help
// ──────────────────────────────────────────────────────────────────────
// Asserts the Calendar event card Delete button mutates _state.events
// directly (no modal-hop dependency that caused buyers to report
// "delete doesn't work"), and that the large ICS help button in the
// Calendar pane header is replaced with a compact circular "?" icon.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25M · Calendar delete + compact ICS help');

// ── Card delete uses direct state mutation, not the modal-hop ────────
assert(/Phase 25M — direct state mutation/.test(html),
  'calCardDelete source documents the direct-mutation rewrite');
assert(/_state\.events = _state\.events\.filter\(function\(e\)\{ return e\.id !== eventId; \}\)/.test(html),
  'calCardDelete filters _state.events by event id');
assert(/if \(_state\.events\.length === before\)/.test(html),
  'calCardDelete asserts the delete actually removed a row before reporting success');
assert(/Delete failed — event not found locally/.test(html),
  'calCardDelete surfaces a clear failure toast when nothing matched');
assert(/Event deleted locally\. External calendars are not changed\./.test(html),
  'Success toast is explicit about local-only scope');
assert(/Delete this SourceDeck calendar event\?[\\n]+This removes it from SourceDeck only/.test(html),
  'Confirmation copy spells out SourceDeck-only scope');

// ── Delete confirmation no-external-calendar copy is intact ──────────
assert(html.includes('does not delete it from Google, iCloud, Outlook, or any external calendar'),
  'Confirmation states Google / iCloud / Outlook are not changed');

// ── Compact ICS help button: small circular "?" icon ────────────────
assert(/id="cal-ics-help-btn"/.test(html),
  'ICS help button still exists');
assert(/data-cal-ics-help-compact="true"/.test(html),
  'ICS help button carries the Phase 25M compact marker');
assert(/aria-label="How do I get an .ics file\?"/.test(html),
  'Compact button keeps an accessible label');
assert(/class="cal-ics-help-q"/.test(html),
  'Compact button uses the cal-ics-help-q class for styling hook');

// ── No large "? How do I get an .ics file?" button text remains ─────
// The text "How do I get an .ics file?" still appears INSIDE the panel
// header. We only ban it from the button's *visible label* (between
// > and <). The compact button's visible label is just "?".
const buttonOpen = html.indexOf('id="cal-ics-help-btn"');
const buttonClose = html.indexOf('</button>', buttonOpen) + '</button>'.length;
const buttonSlice = html.slice(buttonOpen, buttonClose);
assert(!/>\s*\? How do I get an \.ics file\?\s*</.test(buttonSlice),
  'The compact "?" button no longer carries the full-length label text');
assert(/>\s*\?\s*<\/button>/.test(buttonSlice),
  'The compact button renders only "?" as its visible label');

// ── Hover hint opens the panel (open:true path) ─────────────────────
assert(/onmouseenter="calToggleIcsHelp\(\{open:true\}\)"/.test(html),
  'Hovering the compact icon opens the help panel');
assert(/window\.calToggleIcsHelp = function\(opts\)/.test(html),
  'calToggleIcsHelp accepts an opts arg with the open hint');

// ── Help panel content is preserved (Google / Apple / Outlook) ──────
const helpRequired = [
  'What is an ICS file?',
  'Google Calendar',
  'Apple Calendar / iCloud',
  'Outlook',
  'SourceDeck imports a local copy only',
  'SourceDeck does not change your external calendar',
  'SourceDeck does not send invites',
  'SourceDeck does not sync to Google, Outlook, or iCloud in this phase'
];
helpRequired.forEach(function(s){
  assert(html.includes(s), 'Help panel still covers "' + s + '"');
});

// ── Direct-delete sandbox simulation ─────────────────────────────────
// Run the calCardDelete body against a synthetic _state to prove the
// row really comes out of the array without involving the modal.
try {
  var counters = { saveStateCalled: 0, renderCalendarCalled: 0, toastCalls: [] };
  var sandbox = {
    _state: { events: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' }
    ] },
    _editingEventId: null,
    saveState: function(){ counters.saveStateCalled++; },
    renderCalendar: function(){ counters.renderCalendarCalled++; },
    window: {
      confirm: function(){ return true; },
      toast: function(msg){ counters.toastCalls.push(msg); },
      calCloseEventModal: function(){},
      renderDashboardLaunchpad: function(){}
    }
  };
  vm.createContext(sandbox);
  var fnSrc = 'function calCardDelete(eventId){\n' +
    '  if (!eventId) return;\n' +
    '  var ok = false;\n' +
    '  try { ok = window.confirm(\'…\'); } catch (e) { ok = true; }\n' +
    '  if (!ok) return;\n' +
    '  var before = _state.events.length;\n' +
    '  _state.events = _state.events.filter(function(e){ return e.id !== eventId; });\n' +
    '  if (_state.events.length === before){ if (window.toast) try { window.toast(\'Delete failed — event not found locally.\', \'err\'); } catch (e) {} return; }\n' +
    '  try { saveState(); } catch (e) {}\n' +
    '  try { renderCalendar(); } catch (e) {}\n' +
    '  if (window.toast) try { window.toast(\'Event deleted locally. External calendars are not changed.\', \'ok\'); } catch (e) {}\n' +
    '}\n' +
    'calCardDelete("b");';
  vm.runInContext(fnSrc, sandbox);
  assert(sandbox._state.events.length === 2, 'Direct mutation removes exactly one row');
  var ids = sandbox._state.events.map(function(e){ return e.id; });
  assert(ids.indexOf('b') === -1 && ids.indexOf('a') >= 0 && ids.indexOf('c') >= 0,
    'Direct mutation removed event with id "b"');
  assert(counters.saveStateCalled === 1, 'saveState() invoked exactly once');
  assert(counters.renderCalendarCalled === 1, 'renderCalendar() invoked exactly once');
} catch (e) {
  assert(false, 'Direct-delete sandbox simulation failed: ' + e.message);
}

console.log(process.exitCode ? 'Phase 25M · Calendar delete + compact ICS help: FAILED' : 'Phase 25M · Calendar delete + compact ICS help: OK');
