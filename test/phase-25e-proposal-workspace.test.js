'use strict';

/**
 * Phase 25E.2 — Proposal Workspace
 *
 * Asserts the Execution tab has been rebuilt as a section-by-section
 * Proposal Workspace with:
 * - 13 named sections (TOC, Solicitation Summary, Compliance Matrix,
 *   Technical Approach, Management Approach, Staffing, Past Performance,
 *   Quality Control, Risk Management, Transition, Cost/Price, Attachments,
 *   Final Internal Review)
 * - a 5-state per-section status machine (not-started, drafted, approved,
 *   needs-revision, finalized)
 * - per-section notes textarea (special instructions)
 * - per-section draft textarea
 * - explicit "Internal review only" disclaimer banner
 * - NO full-proposal one-click generation
 * - NO Send Email / Submit Bid / Submit Quote / portal-upload control
 * - electron-store persistence under the 'proposalWorkspace' namespace
 *   (with localStorage fallback for renderer-only test contexts).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Execution nav button label is "Proposal Workspace"', () => {
  // The data-tab id intentionally stays as "execution" to preserve the
  // existing openTab() wiring and prior-phase sentinel coverage. Only
  // the label flips so the buyer sees the new product framing.
  const navMatch = HTML.match(
    /<button[^>]*data-tab="execution"[^>]*>[\s\S]*?<\/button>/
  );
  assert.ok(navMatch, 'execution nav button missing');
  assert.match(navMatch[0], /Proposal Workspace/);
  assert.doesNotMatch(navMatch[0], />Execution</);
});

test('Phase 25R — redundant in-pane "Proposal Workspace" H1/subtitle removed; left-rail sub-tabs present', () => {
  // The sidebar already labels this Proposal Workspace; the in-page H1 +
  // "Section-by-section / Human approval gate" subtitle were removed.
  const pane = HTML.match(/<div class="tab-pane" id="tab-execution"[\s\S]*?id="pw-subtab-rail"/);
  assert.ok(pane, 'Proposal Workspace left-rail sub-tabs not found');
  assert.ok(!/<div class="pane-sub">Section-by-section internal review drafting/.test(HTML),
    '"Section-by-section …" subtitle must be removed');
  assert.ok(/data-pw-subtab="solicitation-intake"/.test(HTML), 'first sub-tab is Solicitation Intake');
  assert.ok(/window\.pwSubtab = function/.test(HTML), 'sub-tab panel switcher present');
});

test('pre-Phase-25E.2 locked Execution teaser is gone', () => {
  // The pre-Phase-25E.2 surface was a "🔒 Operator / Federal Tier"
  // upgrade teaser with an "Unlock Execution Suite →" CTA.
  assert.doesNotMatch(
    HTML,
    /Unlock Execution Suite/,
    'old "Unlock Execution Suite" CTA must be removed'
  );
  assert.doesNotMatch(
    HTML,
    /Subcontractor matching, execution timelines, and readiness assessment/,
    'old locked-teaser copy must be removed'
  );
});

test('Proposal Workspace renders all 13 required sections', () => {
  const REQUIRED = [
    'Table of Contents',
    'Solicitation Summary',
    'Compliance Matrix',
    'Technical Approach',
    'Management Approach',
    'Staffing / Key Personnel',
    'Past Performance',
    'Quality Control',
    'Risk Management',
    'Transition / Mobilization',
    'Cost / Price Volume',
    'Attachments / Forms',
    'Final Internal Review'
  ];
  // Each section title must appear in the SECTIONS definition table.
  for (const title of REQUIRED) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      HTML,
      new RegExp(`title:\\s*['\"]${escaped}['\"]`),
      `Proposal Workspace SECTIONS must include "${title}"`
    );
  }
});

test('Proposal Workspace defines the 5-state status machine', () => {
  const REQUIRED_STATES = [
    'not-started',
    'drafted',
    'approved',
    'needs-revision',
    'finalized'
  ];
  // The STATUS_LABEL map must include every required state.
  for (const state of REQUIRED_STATES) {
    assert.match(
      HTML,
      new RegExp(`['\"]${state}['\"]\\s*:`),
      `STATUS_LABEL must define "${state}"`
    );
  }
});

test('Proposal Workspace exposes the public state-machine APIs', () => {
  assert.match(HTML, /window\.pwOpenSection\s*=/);
  assert.match(HTML, /window\.pwSetStatus\s*=/);
  assert.match(HTML, /window\.pwRequestAiDraft\s*=/);
  assert.match(HTML, /window\.pwExportInternalReview\s*=/);
});

test('per-section notes and draft textareas are present', () => {
  assert.match(HTML, /id="pw-section-notes"/);
  assert.match(HTML, /id="pw-section-draft"/);
});

test('Phase 25R — pane-level "Internal review only" banner removed; disclaimer relocated to Settings/Legal + Help', () => {
  // The large in-pane disclaimer banner was removed from the operational
  // screen and consolidated into Settings → Legal and Help / FAQ. The
  // behavioral no-send / no-submit / no-upload guardrails remain.
  assert.ok(!/id="pw-disclaimer"/.test(HTML), 'pw-disclaimer banner must be removed from the pane');
  assert.ok(/id="settings-legal"[\s\S]{0,600}not legal review, not compliance certification/.test(HTML),
    'consolidated disclaimer present in Settings → Legal');
  assert.ok(/data-help-legal-disclaimer="true"/.test(HTML), 'consolidated disclaimer present in Help / FAQ');
  assert.ok(/does not send, submit, or upload/i.test(HTML),
    'no-send / no-submit / no-upload posture text preserved (relocated)');
});

test('no full-proposal one-click generation control is present', () => {
  // Forbidden control labels — every AI draft path must be section-scoped.
  assert.doesNotMatch(HTML, /Generate Full Proposal/i);
  assert.doesNotMatch(HTML, /Generate Entire Proposal/i);
  assert.doesNotMatch(HTML, /One-?Click Proposal/i);
  // The single-section AI button must explicitly say "this section".
  assert.match(HTML, /Request AI Draft \(this section\)/);
});

test('no Send Email / Submit Bid / Submit Quote / portal-upload control inside the Proposal Workspace pane', () => {
  const pane = HTML.match(
    /<div class="tab-pane" id="tab-execution"[\s\S]*?(?=<div class="tab-pane"|<\/div>\s*<!-- ═══════ REPORTS)/
  );
  assert.ok(pane, 'execution/Proposal Workspace pane not isolatable');
  const text = pane[0];
  assert.doesNotMatch(text, />\s*Send Email\s*</i);
  assert.doesNotMatch(text, />\s*Submit Bid\s*</i);
  assert.doesNotMatch(text, />\s*Submit Quote\s*</i);
  assert.doesNotMatch(text, /Export and submit/i);
  assert.doesNotMatch(text, /Upload to SAM/i);
  assert.doesNotMatch(text, /Upload to PIEE/i);
  assert.doesNotMatch(text, /Upload to eBuy/i);
});

test('Proposal Workspace uses electron-store namespace "proposalWorkspace"', () => {
  // The persistence layer routes through window.sd.storeGet/storeSet
  // with the 'proposalWorkspace' bridge key, matching the Phase 23A
  // clinical-pane pattern.
  assert.match(
    HTML,
    /BRIDGE_KEY\s*=\s*['"]proposalWorkspace['"]/,
    'BRIDGE_KEY must equal "proposalWorkspace"'
  );
  assert.match(
    HTML,
    /window\.sd\.storeGet\s*===\s*'function'[\s\S]*?window\.sd\.storeGet\(BRIDGE_KEY\)/,
    'storeGet must be invoked via the bridge key'
  );
});

test('localStorage fallback key is namespaced', () => {
  assert.match(
    HTML,
    /STORE_KEY\s*=\s*['"]sd\.proposalWorkspace\.v1['"]/,
    'localStorage fallback key must be sd.proposalWorkspace.v1'
  );
});

test('Export Internal Review surface produces a local markdown blob', () => {
  // The Phase 25E.2 export path is local Blob -> a[download]; no
  // network call, no fetch(), no fetch-shape submission anywhere in
  // the pwExportInternalReview function.
  const fn = HTML.match(/window\.pwExportInternalReview\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(fn, 'pwExportInternalReview function not found');
  assert.match(fn[0], /new Blob/);
  assert.match(fn[0], /createObjectURL/);
  assert.match(fn[0], /INTERNAL-REVIEW-DRAFT\.md/);
  assert.doesNotMatch(fn[0], /\bfetch\s*\(/);
  assert.doesNotMatch(fn[0], /XMLHttpRequest/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e-proposal-workspace\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e-proposal-workspace.test.js'
  );
});
