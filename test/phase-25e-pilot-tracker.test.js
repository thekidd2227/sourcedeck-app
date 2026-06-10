'use strict';

/**
 * Phase 25E.5 — Client Delivery → Pilot Tracker rename + rebuild
 *
 * Asserts:
 * - Nav button label flipped from "Client Delivery" to "Pilot Tracker".
 *   (data-tab="delivery" id is intentionally preserved so the existing
 *   openTab() wiring keeps working.)
 * - Nav section label flipped from "Other business tools · Client"
 *   to "Other business tools · Pilot".
 * - Pane title is "Pilot Tracker" (was "Client Delivery OS").
 * - Pane content surfaces the Phase 25B 7-day trial framework:
 *   trial-day selector (Day 0–Day 7), setup-wizard state, open-issues
 *   counters by severity, go/no-go decision, next-action note.
 * - No active references to the pre-Phase-25E client-services workflow
 *   ("Diagnostic Queue", "Findings Board", "Blueprint Pipeline",
 *   "Implementation Board", "Risk Radar", "Expansion Readiness",
 *   "Stage History") remain inside the rebuilt pane.
 * - Phase 25B framework path is referenced (`docs/trial/`).
 * - electron-store namespace is "pilotTracker"; localStorage fallback
 *   is "sd.pilotTracker.v1".
 * - No Send Email / Submit Bid / Submit Quote / portal-upload control
 *   inside the pane.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

function extractDeliveryPane() {
  const start = HTML.indexOf('<div class="tab-pane" id="tab-delivery">');
  assert.ok(start !== -1, 'tab-delivery pane not found');
  // The next tab-pane block begins the boundary.
  const after = HTML.indexOf('<div class="tab-pane"', start + 1);
  return HTML.slice(start, after === -1 ? HTML.length : after);
}

test('nav button label is "Pilot Tracker"', () => {
  // Slice to a small bounded window around the button.
  const idx = HTML.indexOf('data-tab="delivery"');
  assert.ok(idx !== -1, 'delivery nav button missing');
  const slice = HTML.slice(idx, idx + 600);
  assert.match(slice, /Pilot Tracker/);
  assert.doesNotMatch(
    slice,
    />\s*Client Delivery\s*</,
    'old "Client Delivery" label must be gone'
  );
});

// Phase 25L-1 superseded the Phase 25E "Other business tools · Pilot"
// sidebar label. Pilot Tracker is removed from active sidebar nav; its
// nav button now lives in the Phase 25L-1 hidden reachability buffer
// (#nav-section-removed-25l1) so openTab('delivery') still resolves
// and the pane itself remains in DOM.
test('Phase 25L-1 retired the "Other business tools · Pilot" sidebar cluster', () => {
  assert.doesNotMatch(HTML, /Other business tools · Pilot/,
    '"Other business tools · Pilot" sidebar label should be retired by Phase 25L-1');
  assert.match(HTML, /data-tab="delivery"[^>]*data-phase-25l1-removed="true"/,
    'Pilot Tracker nav button must be preserved in the Phase 25L-1 reachability buffer');
  assert.match(HTML, /id="tab-delivery"/,
    'Pilot Tracker pane must remain in DOM');
  assert.doesNotMatch(
    HTML,
    /<div class="nav-label">Other business tools · Client<\/div>/,
    'pre-Phase-25E.5 "Other business tools · Client" label must be retired'
  );
});

test('pane title is "Pilot Tracker"', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /<span class="brief-head">Pilot Tracker<\/span>/);
  assert.doesNotMatch(
    pane,
    /Client Delivery OS/,
    'pre-Phase-25E.5 "Client Delivery OS" title must be removed'
  );
});

test('pane surfaces the trial-day selector for Day 0 through Day 7', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /id="pt-day-select"/);
  for (let d = 0; d <= 7; d++) {
    assert.match(
      pane,
      new RegExp(`<option value="${d}"`),
      `pt-day-select must include Day ${d}`
    );
  }
});

test('pane surfaces the four severity issue counters', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /id="pt-issues-critical"/);
  assert.match(pane, /id="pt-issues-high"/);
  assert.match(pane, /id="pt-issues-medium"/);
  assert.match(pane, /id="pt-issues-low"/);
});

test('pane surfaces the go/no-go decision selector with the canonical three options', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /id="pt-gng-select"/);
  assert.match(pane, /READY to seek first pilot buyer/);
  assert.match(pane, /NEEDS FIXES before buyer outreach/);
  assert.match(pane, /STOP PILOT — do not show buyers/);
});

test('pane surfaces the next-action note + setup-state KPIs', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /id="pt-next-action"/);
  assert.match(pane, /id="pt-setup-state"/);
  assert.match(pane, /id="pt-setup-detail"/);
  assert.match(pane, /id="pt-trial-day"/);
  assert.match(pane, /id="pt-issue-count"/);
  assert.match(pane, /id="pt-gng-score"/);
});

test('pane references the Phase 25B trial framework path', () => {
  const pane = extractDeliveryPane();
  assert.match(pane, /docs\/trial\//);
});

test('pre-Phase-25E.5 client-services workflow copy is gone from the pane', () => {
  const pane = extractDeliveryPane();
  const RETIRED = [
    'Delivery Health Dashboard',
    'Diagnostic Queue',
    'Findings Board',
    'Blueprint Pipeline',
    'Implementation Board',
    'Risk Radar',
    'Expansion Readiness',
    'Stage History',
    'newDiagnostic',
    'refreshDelivery'
  ];
  for (const phrase of RETIRED) {
    assert.doesNotMatch(
      pane,
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `Pilot Tracker pane must not surface retired client-services phrase "${phrase}"`
    );
  }
});

test('Pilot Tracker uses electron-store namespace "pilotTracker"', () => {
  assert.match(
    HTML,
    /BRIDGE_KEY\s*=\s*['"]pilotTracker['"]/,
    'BRIDGE_KEY must equal "pilotTracker"'
  );
  assert.match(
    HTML,
    /STORE_KEY\s*=\s*['"]sd\.pilotTracker\.v1['"]/,
    'localStorage fallback key must be sd.pilotTracker.v1'
  );
});

test('Pilot Tracker reads Phase 24K Setup Wizard completion flag (read-only)', () => {
  assert.match(
    HTML,
    /localStorage\.getItem\(['"]sd\.govcon\.setupComplete['"]\)/,
    'Pilot Tracker must surface the Phase 24K setupComplete flag'
  );
});

test('no Send Email / Submit Bid / Submit Quote / portal-upload control in the pane', () => {
  const pane = extractDeliveryPane();
  assert.doesNotMatch(pane, />\s*Send Email\s*</i);
  assert.doesNotMatch(pane, />\s*Submit Bid\s*</i);
  assert.doesNotMatch(pane, />\s*Submit Quote\s*</i);
  assert.doesNotMatch(pane, /Export and submit/i);
  assert.doesNotMatch(pane, /Upload to SAM/i);
  assert.doesNotMatch(pane, /Upload to PIEE/i);
  assert.doesNotMatch(pane, /Upload to eBuy/i);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e-pilot-tracker\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e-pilot-tracker.test.js'
  );
});
