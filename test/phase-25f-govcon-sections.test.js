'use strict';

/**
 * Phase 25F — GovCon Section Navigation
 *
 * SUPERSEDED BY PHASE 25N — the Phase 25F scroll-pill "Jump to"
 * navigation was replaced with a real tab-page architecture in
 * Phase 25N. The pre-25N invariants below have been updated to
 * acknowledge the supersession:
 *
 *   - The pill <nav id="gc-section-nav"> is retired; the new
 *     <nav id="gc-tab-nav"> hosts real tab buttons.
 *   - The seven canonical section <section> elements still live in
 *     DOM (Phase 23C reachability invariant: never orphan a pane);
 *     they are routed to focused tab pages via data-gc-tab-page or
 *     to the hidden-internal buffer.
 *   - window.gcScrollTo() is preserved for legacy callers.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Phase 25N — GovCon tab nav supersedes the Phase 25F section-nav pill bar', () => {
  // The Phase 25F <nav id="gc-section-nav"> is retired; Phase 25N
  // ships <nav id="gc-tab-nav" data-phase-25n="govcon-tab-nav">
  // with real tab buttons. The nav must still live INSIDE the
  // GovCon pane, before any of the deprecated overview sections.
  const paneStart = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
  assert.ok(paneStart !== -1, 'tab-govcon pane missing');
  const modeIndicatorStart = HTML.indexOf('id="gc-mode-indicator"', paneStart);
  assert.ok(modeIndicatorStart !== -1, 'gc-mode-indicator anchor missing (must remain in DOM)');
  const slice = HTML.slice(paneStart, modeIndicatorStart);
  assert.match(slice, /<nav id="gc-tab-nav"/);
  assert.match(slice, /data-phase-25n="govcon-tab-nav"/);
  assert.match(slice, /role="tablist"/);
  assert.doesNotMatch(slice, /id="gc-section-nav"/,
    'Phase 25F id="gc-section-nav" should be replaced by Phase 25N id="gc-tab-nav"');
});

test('Phase 25N — required GovCon tab buttons map to the canonical sections', () => {
  // The canonical sections are preserved in DOM. The tab buttons that
  // route to them are renamed and re-shaped (real tab buttons, not
  // scroll-link pills).
  const REQUIRED_TAB_BUTTONS = [
    { label: 'Solicitation',         tab: 'solicitation' },
    // Phase 25V — Vendors + Pricing split into two focused tabs.
    { label: 'Vendors',              tab: 'vendors' },
    { label: 'Pricing',              tab: 'pricing' },
    { label: 'Past Performance',     tab: 'past-performance' },
    { label: 'Prime Partners',       tab: 'prime-partners' },
    { label: 'Submission Readiness', tab: 'submission-readiness' },
    { label: 'Audit Log',            tab: 'audit-log' },
  ];
  for (const t of REQUIRED_TAB_BUTTONS) {
    const escLabel = t.label.replace(/[.*+?^${}()|[\]\\+]/g, '\\$&');
    assert.match(
      HTML,
      new RegExp(`data-gc-tab="${t.tab}"[\\s\\S]{0,500}${escLabel}`),
      `Phase 25N tab button "${t.label}" must exist with data-gc-tab="${t.tab}"`
    );
  }
});

test('GovCon section nav pill targets exist as <section> elements in the pane', () => {
  // Every section pill must point at a section that actually exists.
  // Phase 24 sections must remain present for the IA to work.
  const REQUIRED_TARGETS = [
    'gc-capture-cc',
    'gc-operating-rhythm',
    'gc-sol-workspace',
    'gc-vqr-pricing',
    'gc-pp-cs-pp',
    'gc-sub-gate',
    'gc-audit-log',
  ];
  for (const id of REQUIRED_TARGETS) {
    assert.match(
      HTML,
      new RegExp(`<section id="${id}"|<div id="${id}"`),
      `section target "${id}" must exist in the GovCon pane`
    );
  }
});

test('gcScrollTo() smooth-scroll handler is defined globally', () => {
  // The handler must exist as window.gcScrollTo, accept (event, id),
  // and use scrollIntoView with the smooth-behavior option. No fetch,
  // no network call.
  assert.match(HTML, /window\.gcScrollTo\s*=\s*function\(\s*ev\s*,\s*targetId\s*\)/);
  assert.match(HTML, /scrollIntoView\(\s*\{\s*behavior:\s*['"]smooth['"]/);
  // Guard against any future re-implementation that introduces a
  // network call.
  const fn = HTML.match(/window\.gcScrollTo\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(fn, 'gcScrollTo function block not isolatable');
  assert.doesNotMatch(fn[0], /\bfetch\s*\(/);
  assert.doesNotMatch(fn[0], /XMLHttpRequest/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25f-govcon-sections\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25f-govcon-sections.test.js'
  );
});
