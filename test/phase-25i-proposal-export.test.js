'use strict';

/**
 * Phase 25I — Proposal Workspace export to Word + PDF
 *
 * Asserts the Phase 25E.2 Proposal Workspace gains two additional
 * local-only export options alongside the existing Markdown export:
 * - Word (.doc) — HTML wrapped with application/msword, zero-dep
 * - PDF — browser-mediated via window.open + print(), zero-dep
 * Both must:
 * - Carry "Internal Review Draft" label (not "Submit")
 * - Include the canonical Phase 25A disclaimer
 * - Be local-only (no fetch / no XHR)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Proposal Workspace exposes three export buttons (Markdown / Word / PDF)', () => {
  // Phase 25R — buttons relabeled "Export Proposal Draft (…)" (the
  // "Internal Review" wording was removed from operational UI); handlers unchanged.
  assert.match(HTML, /onclick="pwExportInternalReview\(\)"/);
  assert.match(HTML, />.*Export Proposal Draft \(Markdown\).*</);
  assert.match(HTML, /onclick="pwExportInternalReviewWord\(\)"/);
  assert.match(HTML, />.*Export Proposal Draft \(Word\).*</);
  assert.match(HTML, /onclick="pwExportInternalReviewPdf\(\)"/);
  assert.match(HTML, />.*Export Proposal Draft \(PDF\).*</);
});

test('Word export uses application/msword Blob (zero-dep) and ends with .doc', () => {
  const fn = HTML.match(/window\.pwExportInternalReviewWord\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(fn, 'pwExportInternalReviewWord not found');
  const src = fn[0];
  assert.match(src, /new Blob\(\s*\[\s*html\s*\]\s*,\s*\{\s*type:\s*['"]application\/msword['"]/);
  assert.match(src, /-INTERNAL-REVIEW-DRAFT\.doc/);
  // No network call.
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
});

test('PDF export opens a print window and triggers window.print() (zero-dep)', () => {
  const fn = HTML.match(/window\.pwExportInternalReviewPdf\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(fn, 'pwExportInternalReviewPdf not found');
  const src = fn[0];
  assert.match(src, /window\.open\(/);
  assert.match(src, /\.print\(\)/);
  // No network call.
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
  // The PDF path explicitly tells the user nothing is uploaded.
  assert.match(src, /Nothing is uploaded|Save as PDF/i);
});

test('Both new exports use "Proposal Draft" label, not "Submit"', () => {
  // Phase 25R — relabeled "Export Proposal Draft (…)" (the "Internal Review"
  // wording was removed from operational UI). Still never "Submit"/"Final"/"agency-ready".
  const button = HTML.match(/onclick="pwExportInternalReviewWord\(\)"[^>]*title="[^"]*"[^>]*>([^<]*)</);
  assert.ok(button);
  assert.match(button[1], /Proposal Draft \(Word\)/);
  const button2 = HTML.match(/onclick="pwExportInternalReviewPdf\(\)"[^>]*title="[^"]*"[^>]*>([^<]*)</);
  assert.ok(button2);
  assert.match(button2[1], /Proposal Draft \(PDF\)/);
  // No forbidden labels on the buttons.
  const buttonsBlock = HTML.match(/pwExportInternalReview[^"]*Markdown[\s\S]{0,800}/);
  assert.ok(buttonsBlock);
  assert.doesNotMatch(buttonsBlock[0], />\s*Submit\s*</i);
  assert.doesNotMatch(buttonsBlock[0], /agency-ready/i);
  assert.doesNotMatch(buttonsBlock[0], /Final Proposal/i);
});

test('Export HTML body includes the canonical Phase 25A disclaimer', () => {
  // The buildExportHtml() composes the Word/PDF body. The
  // disclaimer must reproduce the Phase 25A no-send/no-submit/
  // no-upload posture verbatim.
  // Use a markered slice that bounds the function body explicitly.
  const startIdx = HTML.indexOf('function buildExportHtml(){');
  assert.ok(startIdx !== -1, 'buildExportHtml not found');
  const endIdx = HTML.indexOf('window.pwExportInternalReviewWord', startIdx);
  const fn = [HTML.slice(startIdx, endIdx)];
  assert.ok(fn, 'buildExportHtml not found');
  const src = fn[0];
  assert.match(src, /Internal review only/i);
  assert.match(src, /not legal review/i);
  assert.match(src, /not compliance certification/i);
  assert.match(src, /SourceDeck does not send, submit, or upload/i);
  assert.match(src, /Verify against the current solicitation and acquisition\.gov FAR text/i);
});

test('Export HTML body shows section status badges and counts approved/finalized', () => {
  // Use a markered slice that bounds the function body explicitly.
  const startIdx = HTML.indexOf('function buildExportHtml(){');
  assert.ok(startIdx !== -1, 'buildExportHtml not found');
  const endIdx = HTML.indexOf('window.pwExportInternalReviewWord', startIdx);
  const fn = [HTML.slice(startIdx, endIdx)];
  const src = fn[0];
  assert.match(src, /class="status"/);
  assert.match(src, /Approved\/Finalized/);
});

test('Export HTML body covers all 13 Phase 25E.2 proposal sections', () => {
  const fn = HTML.match(/function gatherSections[\s\S]*?\n\s*\}/);
  assert.ok(fn, 'gatherSections not found');
  const src = fn[0];
  const REQUIRED = [
    'table-of-contents',
    'solicitation-summary',
    'compliance-matrix',
    'technical-approach',
    'management-approach',
    'staffing-key-personnel',
    'past-performance',
    'quality-control',
    'risk-management',
    'transition-mobilization',
    'cost-price-volume',
    'attachments-forms',
    'final-internal-review',
  ];
  for (const sec of REQUIRED) {
    assert.ok(src.includes(`'${sec}'`), `gatherSections must list ${sec}`);
  }
});

test('Export script block carries no fetch / XHR', () => {
  const startMarker = '/* Phase 25I — Proposal Workspace export (Word + PDF)';
  const startIdx = HTML.indexOf(startMarker);
  assert.ok(startIdx !== -1, 'Phase 25I export script block missing');
  const endIdx = HTML.indexOf('</script>', startIdx);
  let src = HTML.slice(startIdx, endIdx);
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25i-proposal-export\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25i-proposal-export.test.js'
  );
});
