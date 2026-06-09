'use strict';

/**
 * Phase 25E.7 — Leads workspace nav consolidation
 *
 * Asserts:
 * - The pre-existing "Lead Generator" sidebar label is retired in
 *   favor of "Leads".
 * - The Create Lead and AI Lead Builder sidebar nav buttons are
 *   present in the DOM (Phase 23C invariant: every commercial nav
 *   button + pane stays) but hidden from the sidebar so the buyer
 *   has a single Leads entry point.
 * - Both hidden buttons carry the data-phase-25e7="folded-into-leads"
 *   marker so a future contributor can find them.
 * - The Leads pane surfaces in-pane buttons that open the Create
 *   Lead and AI Lead Builder workflows.
 * - The underlying tab-createlead and tab-aigenerate panes remain
 *   reachable in the DOM.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Leads nav button label flipped from "Lead Generator" to "Leads"', () => {
  const idx = HTML.indexOf('data-tab="leads"');
  assert.ok(idx !== -1, 'Leads nav button missing');
  // Slice just the button so the pane title cannot satisfy the match.
  const buttonClose = HTML.indexOf('</button>', idx);
  assert.ok(buttonClose !== -1, 'Leads nav button close tag missing');
  const button = HTML.slice(idx, buttonClose + 9);
  assert.match(button, />Leads<\/button>/);
  assert.doesNotMatch(
    button,
    />Lead Generator</,
    'pre-Phase-25E.7 "Lead Generator" label must be retired from the nav button'
  );
});

test('Leads pane title flipped from "Lead Generator" to "Leads"', () => {
  // Pre-Phase-25E.7 the pane carried "<span class=\"brief-head\">Lead Generator</span>".
  const paneStart = HTML.indexOf('<div class="tab-pane" id="tab-leads">');
  assert.ok(paneStart !== -1, 'tab-leads pane missing');
  const paneEnd = HTML.indexOf('<div class="tab-pane"', paneStart + 1);
  const pane = HTML.slice(paneStart, paneEnd === -1 ? HTML.length : paneEnd);
  assert.match(pane, /<span class="brief-head">Leads<\/span>/);
  assert.doesNotMatch(
    pane,
    /<span class="brief-head">Lead Generator<\/span>/,
    'pre-Phase-25E.7 "Lead Generator" pane title must be retired'
  );
});

test('Create Lead nav button is present but hidden (Phase 23C DOM invariant)', () => {
  // The button still exists - Phase 23C nav test asserts this.
  assert.match(HTML, /data-tab="createlead"/);
  // It is hidden from the buyer-facing sidebar.
  assert.match(
    HTML,
    /data-tab="createlead"[^>]*style="display:none"/,
    'Create Lead nav button must be hidden via inline display:none'
  );
  assert.match(
    HTML,
    /data-tab="createlead"[^>]*data-phase-25e7="folded-into-leads"/
  );
});

test('AI Lead Builder nav button is present but hidden (Phase 23C DOM invariant)', () => {
  assert.match(HTML, /data-tab="aigenerate"/);
  assert.match(
    HTML,
    /data-tab="aigenerate"[^>]*style="display:none"/,
    'AI Lead Builder nav button must be hidden via inline display:none'
  );
  assert.match(
    HTML,
    /data-tab="aigenerate"[^>]*data-phase-25e7="folded-into-leads"/
  );
});

test('Leads pane surfaces in-pane buttons that open Create Lead and Generate Leads (AI)', () => {
  const paneStart = HTML.indexOf('<div class="tab-pane" id="tab-leads">');
  const paneEnd = HTML.indexOf('<div class="tab-pane"', paneStart + 1);
  const pane = HTML.slice(paneStart, paneEnd === -1 ? HTML.length : paneEnd);
  // In-pane entry-point buttons that route to the underlying tabs.
  assert.match(pane, /onclick="openTab\('createlead'\)"/);
  assert.match(pane, /onclick="openTab\('aigenerate'\)"/);
  assert.match(pane, />\s*\+\s*Create Lead\s*</);
  assert.match(pane, />\s*🪄 Generate Leads \(AI\)\s*</);
});

test('underlying tab-createlead and tab-aigenerate panes remain in the DOM', () => {
  // Phase 23C invariant: every commercial tab-pane stays in the DOM.
  assert.match(HTML, /<div class="tab-pane" id="tab-createlead">/);
  assert.match(HTML, /<div class="tab-pane" id="tab-aigenerate">/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e-leads-workspace\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e-leads-workspace.test.js'
  );
});
