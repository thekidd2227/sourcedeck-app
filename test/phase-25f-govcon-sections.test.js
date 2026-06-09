'use strict';

/**
 * Phase 25F — GovCon Section Navigation
 *
 * Asserts a sticky in-pane section navigation pill bar exists at the
 * top of the GovCon pane and routes to each of the seven canonical
 * GovCon workspace sections via in-page anchors.
 *
 * The GovCon pane itself remains one scroll surface (Phase 24
 * invariants preserved). The pill bar is an information-architecture
 * aid: clicking a pill smooth-scrolls to the matching <section>.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('GovCon section nav bar is present at the top of the tab-govcon pane', () => {
  // The nav must live INSIDE the GovCon pane-body, immediately after
  // the setup-banner. Slice between the pane opening and the GovCon
  // Mode Indicator section to confirm.
  const paneStart = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
  assert.ok(paneStart !== -1, 'tab-govcon pane missing');
  const modeIndicatorStart = HTML.indexOf('id="gc-mode-indicator"', paneStart);
  assert.ok(modeIndicatorStart !== -1, 'gc-mode-indicator anchor missing');
  const slice = HTML.slice(paneStart, modeIndicatorStart);
  assert.match(slice, /<nav id="gc-section-nav"/);
  assert.match(slice, /data-phase-25f="govcon-section-nav"/);
  assert.match(slice, /position:sticky/);
});

test('GovCon section nav contains all 7 canonical section pills', () => {
  const REQUIRED_PILLS = [
    { label: 'Overview',                                   href: 'gc-capture-cc' },
    { label: 'Operating Rhythm',                           href: 'gc-operating-rhythm' },
    { label: 'Solicitation',                               href: 'gc-sol-workspace' },
    { label: 'Vendor &amp; Pricing',                       href: 'gc-vqr-pricing' },
    { label: 'Past Performance · Capability · Prime',      href: 'gc-pp-cs-pp' },
    { label: 'Submission Readiness',                       href: 'gc-sub-gate' },
    { label: 'Audit Log',                                  href: 'gc-audit-log' },
  ];
  for (const pill of REQUIRED_PILLS) {
    const escapedLabel = pill.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      HTML,
      new RegExp(`href="#${pill.href}"[^>]*onclick="gcScrollTo\\(event,'${pill.href}'\\)"[\\s\\S]{0,200}${escapedLabel}`),
      `section pill "${pill.label}" must anchor to #${pill.href}`
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
