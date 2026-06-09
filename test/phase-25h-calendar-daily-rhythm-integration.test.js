'use strict';

/**
 * Phase 25H — Calendar → Daily Rhythm integration
 *
 * Asserts the Today's Work Plan integration script block:
 * - Reads calendar events from window.__sdCalendar or the
 *   sd.calendar.v1 localStorage fallback.
 * - Filters to today's date and renders into the Daily Operating
 *   Rhythm pane's existing #do-checklist host.
 * - Shows a neutral empty state with a link to the Calendar tab
 *   when no events exist.
 * - Carries no founder/internal default tasks (Phase 25E.6
 *   invariant preserved).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

function getTodayWorkPlanBlock() {
  const startMarker = '/* Phase 25H — Today\'s Work Plan integration';
  const startIdx = HTML.indexOf(startMarker);
  assert.ok(startIdx !== -1, 'Phase 25H Today\'s Work Plan script block missing');
  const endIdx = HTML.indexOf('</script>', startIdx);
  return HTML.slice(startIdx, endIdx);
}

test('Today\'s Work Plan script block exists', () => {
  const block = getTodayWorkPlanBlock();
  assert.ok(block.length > 100);
});

test('Today\'s Work Plan reads from window.__sdCalendar with localStorage fallback', () => {
  const block = getTodayWorkPlanBlock();
  assert.match(block, /window\.__sdCalendar/);
  assert.match(block, /sd\.calendar\.v1/);
});

test('Today\'s Work Plan filters to today\'s date and writes into #do-checklist', () => {
  const block = getTodayWorkPlanBlock();
  assert.match(block, /todayIso\s*\(\)/);
  assert.match(block, /e\.date === iso/);
  assert.match(block, /getElementById\(\s*['"]do-checklist['"]\s*\)/);
});

test('empty state offers a one-click jump to the Calendar tab', () => {
  const block = getTodayWorkPlanBlock();
  assert.match(block, /data-phase-25h="today-work-plan-empty"/);
  // The link's onclick prevents default and routes via openTab.
  // It's emitted inside a template literal with single-quoted args
  // that need backslash-escaping in the source.
  assert.ok(
    /openTab\(\\?['"]calendar\\?['"]\)/.test(block) ||
    block.includes("openTab('calendar')") ||
    block.includes("openTab(\\'calendar\\')"),
    'empty state must route to the Calendar tab via openTab(...)'
  );
  assert.match(block, /No calendar events for today/);
});

test('Daily Ops pane retains its clean empty-state copy (Phase 25E.6 invariant)', () => {
  // Confirm Phase 25E.6 invariant is still in place. Phase 25H
  // augments the pane's runtime content but does not change the
  // pane's default static empty-state markup.
  const paneStart = HTML.indexOf('<div class="tab-pane" id="tab-dailyops">');
  const paneEnd   = HTML.indexOf('<div class="tab-pane"', paneStart + 1);
  const pane = HTML.slice(paneStart, paneEnd);
  assert.match(pane, /No operating rhythm yet/i);
  assert.match(pane, /No weekly rhythm yet/i);
  assert.match(pane, /No escalation rules configured/i);
});

test('Today\'s Work Plan ships zero founder/internal default tasks (Phase 25E.6 invariant)', () => {
  // The integration script must not introduce PROD-01..05 / Jean-Max
  // / Notion Sync / Reply Intel / Booking Brief / Gmail / Airtable
  // writeback default tasks.
  const block = getTodayWorkPlanBlock();
  const FORBIDDEN = [
    /PROD-?01/, /PROD-?02/, /PROD-?03/, /PROD-?04/, /PROD-?05/,
    /Notion Sync/i, /Reply Intel/i, /Booking Brief/i,
    /Gmail reply/i, /Airtable writeback/i, /Jean-?Max/i,
  ];
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(block, re, `forbidden default "${re.source}" must not appear`);
  }
});

test('Today\'s Work Plan respects no-send / no-submit / no-upload posture', () => {
  const block = getTodayWorkPlanBlock();
  assert.doesNotMatch(block, /\bfetch\s*\(/);
  assert.doesNotMatch(block, /XMLHttpRequest/);
  assert.doesNotMatch(block, /\boauth\b/i);
  // The Phase 25A posture must not be violated by the integration.
  assert.doesNotMatch(block, />\s*Send Email\s*</i);
  assert.doesNotMatch(block, />\s*Submit Bid\s*</i);
  assert.doesNotMatch(block, />\s*Submit Quote\s*</i);
});

test('window.calRenderTodayWorkPlan is exposed for re-render triggers', () => {
  // Other phases can call window.calRenderTodayWorkPlan() to refresh
  // the Daily Ops mirror after a calendar mutation.
  const block = getTodayWorkPlanBlock();
  assert.match(block, /window\.calRenderTodayWorkPlan\s*=\s*renderTodayWorkPlan/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25h-calendar-daily-rhythm-integration\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25h-calendar-daily-rhythm-integration.test.js'
  );
});
