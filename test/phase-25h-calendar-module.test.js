'use strict';

/**
 * Phase 25H — Calendar Module
 *
 * Asserts the standalone Calendar nav button + tab pane + view
 * controls + manual event form ship as one cohesive module.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

function extractPane() {
  const start = HTML.indexOf('<div class="tab-pane" id="tab-calendar">');
  assert.ok(start !== -1, 'tab-calendar pane missing');
  const after = HTML.indexOf('<!-- ═══════ CLINICAL', start);
  return HTML.slice(start, after === -1 ? HTML.length : after);
}

test('Calendar nav section is always-on (outside the Phase 25E.1 collapsible)', () => {
  const idx = HTML.indexOf('id="nav-section-calendar"');
  assert.ok(idx !== -1, 'nav-section-calendar missing');
  const next = HTML.indexOf('<div class="nav-section"', idx + 1);
  const block = HTML.slice(idx, next === -1 ? HTML.length : next);
  assert.match(block, /data-tab="calendar"/);
  assert.doesNotMatch(block, /data-other-business-tools/);
  assert.match(block, />Calendar</);
});

test('Calendar tab pane carries the local-only / no-OAuth disclaimer', () => {
  const pane = extractPane();
  assert.match(pane, /<span class="brief-head">Calendar<\/span>/);
  assert.match(pane, /Local-only calendar/i);
  assert.match(pane, /does not send calendar invites/i);
  assert.match(pane, /sync to Google \/ Outlook \/ iCloud/i);
});

test('Four view toggle buttons are present (Today / Week / Month / List)', () => {
  const pane = extractPane();
  for (const view of ['today', 'week', 'month', 'list']) {
    assert.match(
      pane,
      new RegExp(`data-cal-view="${view}"[^>]*onclick="calSetView\\('${view}'\\)"`)
    );
  }
});

test('Primary action buttons exist (Import .ics / Paste / Add Event / Clear Imported)', () => {
  const pane = extractPane();
  assert.match(pane, /Import \.ics File/);
  assert.match(pane, /Paste Calendar Text/);
  assert.match(pane, />\s*\+ Add Event\s*</);
  assert.match(pane, /Clear Imported/);
  // The .ics file picker must NOT trigger an upload — it's an
  // <input type="file"> read in-renderer via FileReader.
  assert.match(pane, /id="cal-ics-file" accept="\.ics,text\/calendar"/);
});

test('Manual event modal carries every required field', () => {
  const pane = extractPane();
  const REQUIRED_FIELDS = [
    'id="cal-f-title"',
    'id="cal-f-date"',
    'id="cal-f-start"',
    'id="cal-f-end"',
    'id="cal-f-allday"',
    'id="cal-f-location"',
    'id="cal-f-tasktype"',
    'id="cal-f-status"',
    'id="cal-f-link-sol"',
    'id="cal-f-link-vendor"',
    'id="cal-f-link-section"',
    'id="cal-f-notes"',
  ];
  for (const field of REQUIRED_FIELDS) {
    assert.ok(pane.includes(field), `manual event modal missing ${field}`);
  }
});

test('Event form ships all 11 task types', () => {
  const pane = extractPane();
  const TASK_TYPES = [
    'calendar-event',
    'vendor-follow-up',
    'quote-due',
    'appointment',
    'site-visit',
    'qa-deadline',
    'proposal-deadline',
    'internal-review',
    'subcontractor-meeting',
    'proposal-section-work',
    'other',
  ];
  for (const t of TASK_TYPES) {
    assert.match(pane, new RegExp(`<option value="${t}"`));
  }
});

test('Event form ships all 5 status values', () => {
  const pane = extractPane();
  for (const s of ['scheduled', 'completed', 'missed', 'reschedule', 'canceled']) {
    assert.match(pane, new RegExp(`<option value="${s}"`));
  }
});

test('Edit / Update / Delete / Reschedule / Mark Complete actions exist', () => {
  const pane = extractPane();
  assert.match(pane, /onclick="calSaveEventForm\(\)"/);
  assert.match(pane, /onclick="calMarkComplete\(\)"/);
  assert.match(pane, /onclick="calRescheduleEvent\(\)"/);
  assert.match(pane, /onclick="calDeleteEvent\(\)"/);
});

test('Calendar uses electron-store namespace "calendar" with localStorage fallback', () => {
  assert.match(HTML, /BRIDGE_KEY\s*=\s*['"]calendar['"]/);
  assert.match(HTML, /STORE_KEY\s*=\s*['"]sd\.calendar\.v1['"]/);
});

test('Public Calendar APIs are exposed', () => {
  const PUBLIC_FNS = [
    'window.calParseIcs',
    'window.calOpenIcsPicker',
    'window.calOnIcsFileChosen',
    'window.calOpenPasteModal',
    'window.calOpenEventModal',
    'window.calSaveEventForm',
    'window.calSetView',
    'window.calGotoToday',
    'window.calStepRange',
    'window.calRender',
  ];
  for (const fn of PUBLIC_FNS) {
    assert.match(HTML, new RegExp(fn.replace(/\./g, '\\.') + '\\s*='));
  }
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25h-calendar-module\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25h-calendar-module.test.js'
  );
});
