'use strict';

/**
 * Phase 25H — ICS Import
 *
 * Asserts the local ICS parser:
 * - Exists at window.calParseIcs
 * - Handles SUMMARY, DTSTART, DTEND, DESCRIPTION, LOCATION, UID
 * - Handles folded lines (RFC 5545 §3.1)
 * - Handles DATE (YYYYMMDD) and DATE-TIME (YYYYMMDDTHHMMSS[Z])
 * - Handles RRULE by annotating description (no full expansion)
 * - Dedupes by (UID + date) on import
 * - Does NOT issue fetch() / XMLHttpRequest in the parser path
 * - Does NOT prompt for Google / Outlook / iCloud credentials
 * - Does NOT implement OAuth
 *
 * The test extracts the IIFE source from sourcedeck.html and
 * evaluates the parser in a Node vm sandbox so we exercise the
 * real implementation, not a mock.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

/* Load the calendar IIFE script block + register window globals. */
function loadCalendarParser() {
  // The Phase 25H Calendar script block opens with the comment
  // "Phase 25H — SourceDeck Calendar Module" and closes at the next
  // `</script>` tag.
  const startMarker = '/* Phase 25H — SourceDeck Calendar Module';
  const startIdx = HTML.indexOf(startMarker);
  assert.ok(startIdx !== -1, 'Phase 25H calendar script block not found');
  const endIdx = HTML.indexOf('</script>', startIdx);
  assert.ok(endIdx !== -1, 'Phase 25H calendar script close tag not found');
  const src = HTML.slice(startIdx, endIdx);

  // Minimal renderer-shaped sandbox.
  const sandbox = {
    window: {},
    document: {
      readyState: 'loading',
      addEventListener: () => {},
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ click: () => {} }),
    },
    localStorage: {
      _: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._, k) ? this._[k] : null; },
      setItem(k, v) { this._[k] = String(v); },
      removeItem(k) { delete this._[k]; },
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    JSON: JSON,
    Math: Math,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    URL: URL,
    Blob: undefined,
    FileReader: undefined,
    console: { log: () => {}, error: () => {} },
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window;
}

test('window.calParseIcs is registered as a function', () => {
  const w = loadCalendarParser();
  assert.equal(typeof w.calParseIcs, 'function');
});

test('parser handles SUMMARY / DTSTART / DTEND / DESCRIPTION / LOCATION / UID', () => {
  const w = loadCalendarParser();
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:event-1@sourcedeck',
    'SUMMARY:Site visit at vendor warehouse',
    'DTSTART:20260612T090000Z',
    'DTEND:20260612T103000Z',
    'LOCATION:1200 W Main St\\, Suite 4',
    'DESCRIPTION:Walk-through with logistics POC.\\nBring hard hats.',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  const out = w.calParseIcs(ics);
  assert.equal(out.length, 1);
  const e = out[0];
  assert.equal(e.uid, 'event-1@sourcedeck');
  assert.equal(e.title, 'Site visit at vendor warehouse');
  assert.equal(e.date, '2026-06-12');
  assert.equal(e.start, '09:00');
  assert.equal(e.end, '10:30');
  assert.equal(e.allDay, false);
  assert.equal(e.location, '1200 W Main St, Suite 4');
  assert.match(e.description, /Walk-through/);
  assert.match(e.description, /Bring hard hats/);
});

test('parser handles DATE-only events as all-day', () => {
  const w = loadCalendarParser();
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:allday-1',
    'SUMMARY:Proposal deadline',
    'DTSTART;VALUE=DATE:20260620',
    'DTEND;VALUE=DATE:20260621',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const out = w.calParseIcs(ics);
  assert.equal(out.length, 1);
  assert.equal(out[0].date, '2026-06-20');
  assert.equal(out[0].allDay, true);
});

test('parser unfolds RFC 5545 line continuations', () => {
  const w = loadCalendarParser();
  // SUMMARY split across 3 lines via " " continuation marker.
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:folded-1',
    'SUMMARY:This is a very long sum',
    ' mary that wraps across',
    '\tmultiple lines',
    'DTSTART:20260701T140000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const out = w.calParseIcs(ics);
  assert.equal(out.length, 1);
  assert.equal(
    out[0].title,
    'This is a very long summary that wraps acrossmultiple lines'
  );
});

test('parser annotates RRULE events (no full expansion)', () => {
  const w = loadCalendarParser();
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:weekly-1',
    'SUMMARY:Weekly stand-up',
    'DTSTART:20260601T100000Z',
    'DTEND:20260601T103000Z',
    'RRULE:FREQ=WEEKLY;BYDAY=MO',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const out = w.calParseIcs(ics);
  assert.equal(out.length, 1);
  assert.match(out[0].description, /Recurring event imported/);
  assert.match(out[0].description, /RRULE=FREQ=WEEKLY;BYDAY=MO/);
});

test('parser tolerates non-ICS text by returning an empty array', () => {
  const w = loadCalendarParser();
  const a = w.calParseIcs('Just some random text');
  const b = w.calParseIcs('');
  assert.ok(Array.isArray(a) && a.length === 0);
  assert.ok(Array.isArray(b) && b.length === 0);
});

test('the Phase 25H Calendar script block contains no actual fetch / XHR / OAuth API request', () => {
  // The contract: no network code path under any branch. Mentions of
  // "fetch()" / "OAuth" in the boundary docstring are intentional —
  // they document what the phase does NOT do. The assertion strips
  // comments first, then targets active call sites.
  const startMarker = '/* Phase 25H — SourceDeck Calendar Module';
  const startIdx = HTML.indexOf(startMarker);
  const endIdx = HTML.indexOf('</script>', startIdx);
  let src = HTML.slice(startIdx, endIdx);
  // Strip /* ... */ comments and // line comments so the regex
  // checks only executable source.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
  assert.doesNotMatch(src, /client_secret/);
  assert.doesNotMatch(src, /refresh_token/);
  assert.doesNotMatch(src, /googleapis\.com/);
  assert.doesNotMatch(src, /graph\.microsoft\.com/);
  assert.doesNotMatch(src, /caldav\.icloud/);
  assert.doesNotMatch(src, /https?:\/\/[^\s'"]*oauth/i);
});

test('the Phase 25H pane contains no Google / Outlook / iCloud login prompt or OAuth button', () => {
  // The pane must not contain any login form / OAuth button. The
  // disclaimer mentions "OAuth-based providers are deferred" - that
  // explicit negative reference is allowed because it documents
  // the boundary. The assertion targets affirmative login surfaces.
  const paneStart = HTML.indexOf('<div class="tab-pane" id="tab-calendar">');
  const paneEnd = HTML.indexOf('<!-- ═══════ CLINICAL', paneStart);
  const pane = HTML.slice(paneStart, paneEnd);
  assert.doesNotMatch(pane, /Connect Google/i);
  assert.doesNotMatch(pane, /Sign in with Google/i);
  assert.doesNotMatch(pane, /Connect Microsoft/i);
  assert.doesNotMatch(pane, /Sign in with Microsoft/i);
  assert.doesNotMatch(pane, /Connect iCloud/i);
  assert.doesNotMatch(pane, /iCloud credentials/i);
  assert.doesNotMatch(pane, />\s*OAuth\s*</i); // visible OAuth button
  assert.doesNotMatch(pane, /onclick="[^"]*[oO]auth/);
  assert.doesNotMatch(pane, /Authorize with/i);
});

test('calAddOrUpdateImportedEvent dedupes by (UID + date)', () => {
  const w = loadCalendarParser();
  assert.equal(typeof w.calAddOrUpdateImportedEvent, 'function');
  const result1 = w.calAddOrUpdateImportedEvent({
    uid: 'evt-1', title: 'First', date: '2026-06-20', start: '09:00', end: '10:00',
    allDay: false, location: '', description: '',
  });
  const result2 = w.calAddOrUpdateImportedEvent({
    uid: 'evt-1', title: 'First (updated)', date: '2026-06-20', start: '09:30', end: '10:30',
    allDay: false, location: '', description: '',
  });
  const result3 = w.calAddOrUpdateImportedEvent({
    uid: 'evt-2', title: 'Other', date: '2026-06-21', start: '14:00', end: '15:00',
    allDay: false, location: '', description: '',
  });
  assert.equal(result1.status, 'created');
  assert.equal(result2.status, 'updated');
  assert.equal(result3.status, 'created');
  assert.equal(result2.event.title, 'First (updated)');
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25h-ics-import\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25h-ics-import.test.js'
  );
});
