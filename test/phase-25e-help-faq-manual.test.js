'use strict';

/**
 * Phase 25E.4 — In-App Help / FAQ + 4th-Grade User Manual
 *
 * Asserts:
 * - A Help / FAQ nav button and tab pane exist.
 * - The 4th-grade user manual exists on disk.
 * - The renderer ships 9 FAQ sections with ≥ 20 items per section
 *   (the buyer-facing Phase 25E.4 commitment).
 * - Each FAQ item has a question and an answer string.
 * - The Help / FAQ pane carries the search input and the rendered
 *   accordion container.
 * - The Help / FAQ tab is reachable from the always-on Help nav
 *   section (not hidden behind the Phase 25E.1 default-collapsed
 *   "Other business tools" toggle).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(REPO_ROOT, 'sourcedeck.html');
const MANUAL_PATH = path.join(
  REPO_ROOT,
  'docs',
  'manuals',
  'sourcedeck-user-manual-4th-grade.md'
);

const HTML = fs.readFileSync(HTML_PATH, 'utf8');

test('user manual exists at the canonical path', () => {
  assert.ok(
    fs.existsSync(MANUAL_PATH),
    'docs/manuals/sourcedeck-user-manual-4th-grade.md must exist'
  );
  const manual = fs.readFileSync(MANUAL_PATH, 'utf8');
  // The manual must explicitly call out its reading-level posture so a
  // future regression cannot silently swap it for a higher-grade rewrite.
  assert.match(manual, /4th-grade reading level/i);
  // And it must reproduce the Phase 25A no-send / no-submit posture.
  assert.match(manual, /SourceDeck does not send/);
  assert.match(manual, /SourceDeck does not submit/);
});

test('Help / FAQ nav button exists in the always-on Help nav section', () => {
  // Phase 25E.4: the Help nav section sits outside the Phase 25E.1
  // collapsible "Other business tools" container so it is reachable
  // on cold open without expanding the toggle. The nav-section block
  // contains nested <div> elements so we slice from the opening id
  // to the next nav-section / Phase 23C show-tools toggle boundary.
  const startIdx = HTML.indexOf('id="nav-section-help"');
  assert.ok(startIdx !== -1, 'nav-section-help block missing');
  // Bound the slice at the start of the next <div class="nav-section".
  const sliceFrom = startIdx;
  const next = HTML.indexOf('<div class="nav-section"', sliceFrom + 1);
  const sliceTo = next === -1 ? HTML.length : next;
  const block = HTML.slice(sliceFrom, sliceTo);
  assert.match(block, /data-tab="help"/);
  assert.match(block, /Help \/ FAQ/);
  // It must NOT carry the data-other-business-tools attribute that
  // would let the Phase 25E.1 toggle hide it.
  assert.doesNotMatch(block, /data-other-business-tools/);
});

test('Help / FAQ tab pane exists with the search input and accordion container', () => {
  const paneMatch = HTML.match(
    /<div class="tab-pane" id="tab-help"[\s\S]*?(?=<div class="tab-pane"|<!-- ═══════ CLINICAL)/
  );
  assert.ok(paneMatch, 'tab-help pane missing');
  const pane = paneMatch[0];
  assert.match(pane, /id="help-search"/);
  assert.match(pane, /id="help-faq-list"/);
  assert.match(pane, /id="help-faq-empty"/);
  assert.match(pane, /4th-grade reading level|fourth-grade reading level/i);
});

test('FAQ data ships 9 sections', () => {
  // Pull the data shape via node (the FAQ array is defined in a
  // window-scoped IIFE; we count via the section title regex).
  const sectionTitles = [
    'Command Center',
    'Leads',
    'GovCon',
    'Proposal Workspace',
    'Pipeline',
    'Pilot Tracker',
    'Reports / Audit Log',
    'Settings',
    'Help / FAQ'
  ];
  for (const title of sectionTitles) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    assert.match(
      HTML,
      new RegExp(`\\[\\s*['"]${escaped}['"]\\s*,\\s*\\[`),
      `FAQ data must include the "${title}" section`
    );
  }
});

test('each FAQ section ships ≥ 20 items', () => {
  // Extract the FAQ array as a literal by sandboxing the IIFE.
  // Easier: re-evaluate just the data slice via a `vm` context.
  const vm = require('node:vm');
  // Pull the FAQ literal out of the script. It is the first `var FAQ = […]`
  // sequence inside the Phase 25E.4 script block.
  const literalMatch = HTML.match(/var FAQ\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(literalMatch, 'FAQ array literal not found in renderer');
  const sandbox = { result: null };
  vm.runInNewContext('result = ' + literalMatch[1], sandbox);
  const FAQ = sandbox.result;
  assert.ok(Array.isArray(FAQ), 'FAQ literal did not eval to an array');
  assert.equal(FAQ.length, 9, 'FAQ must ship exactly 9 sections');
  let total = 0;
  for (const [sectionTitle, items] of FAQ) {
    assert.ok(Array.isArray(items), `${sectionTitle} items must be an array`);
    assert.ok(
      items.length >= 20,
      `${sectionTitle} must ship ≥ 20 FAQ items (has ${items.length})`
    );
    for (const item of items) {
      assert.ok(
        Array.isArray(item) && item.length === 2,
        `${sectionTitle} item must be [question, answer]`
      );
      assert.ok(
        typeof item[0] === 'string' && item[0].trim().length > 0,
        `${sectionTitle} question must be a non-empty string`
      );
      assert.ok(
        typeof item[1] === 'string' && item[1].trim().length > 0,
        `${sectionTitle} answer must be a non-empty string`
      );
    }
    total += items.length;
  }
  assert.ok(
    total >= 180,
    `total FAQ item count must be ≥ 180 (got ${total})`
  );
});

test('Help / FAQ exposes the public search API', () => {
  assert.match(HTML, /window\.hpFilterFaq\s*=/);
  // The data shape is exposed on window for verification tooling.
  assert.match(HTML, /window\.__sdHelpFaqData\s*=\s*FAQ/);
});

test('Help / FAQ pane includes the Phase 25A escalation posture', () => {
  const paneMatch = HTML.match(
    /<div class="tab-pane" id="tab-help"[\s\S]*?(?=<div class="tab-pane"|<!-- ═══════ CLINICAL)/
  );
  assert.ok(paneMatch, 'tab-help pane missing');
  const pane = paneMatch[0];
  assert.match(pane, /Tier 1/);
  assert.match(pane, /Tier 2/);
  // The renderer must NOT hardcode the operator's escalation email
  // (preserves the white-label first-run-safety invariant). The buyer
  // is directed to escalate via their operator instead.
  assert.match(pane, /operator can escalate to Tier 2/i);
  assert.doesNotMatch(pane, /@arivergroup/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e-help-faq-manual\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e-help-faq-manual.test.js'
  );
});
