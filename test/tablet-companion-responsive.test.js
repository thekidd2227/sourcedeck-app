/**
 * Tablet companion responsive contract.
 * Static CI guard for the viewport-specific CSS and web/Electron boundary.
 * Runtime viewport verification is performed separately in the browser QA
 * pass; these assertions prevent the critical tablet rules from regressing.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'sourcedeck.html'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs', 'tablet-companion-plan.md'), 'utf8');
const webReadme = fs.readFileSync(path.join(root, 'web', 'README.md'), 'utf8');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ✓ ' + name);
}

console.log('\n=== Tablet companion responsive contract ===\n');

test('renderer keeps a device-width viewport with safe scaling', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width,[^"]*viewport-fit=cover">/);
});

test('tablet coarse-pointer range is explicitly scoped to 600–1180px', () => {
  assert.match(html, /@media \(hover:none\) and \(pointer:coarse\) and \(min-width:600px\) and \(max-width:1180px\)/);
});

test('tablet interactive controls have a 44px minimum target', () => {
  assert.match(html, /button,.btn,.nav-btn,.nav-btn-sub,.sub-tab,.mode-btn,\[role="button"\],details>summary\{\s*min-height:44px/);
});

test('tablet form controls prevent iPad focus zoom', () => {
  assert.match(html, /input,select,textarea,.input,.select,.textarea\{font-size:16px!important;min-height:44px\}/);
});

test('wide solicitation and vendor tables use contained touch scrolling', () => {
  assert.match(html, /\.tbl-wrap,.gc-vqr-table-wrap,.gc-sol-matrix\{[\s\S]*?overscroll-behavior-inline:contain/);
});

test('collapsed tablet navigation includes touch-safe sub-navigation pills', () => {
  assert.match(html, /@media\(max-width:899px\)\{[\s\S]*?\.sidebar \.nav-btn-sub\{[\s\S]*?min-height:44px!important/);
});

test('portrait grids collapse for capture and vendor coordination', () => {
  assert.match(html, /@media\(max-width:768px\)\{[\s\S]*?\.gc-cc-grid,.gc-or-grid,.gc-vqr-grid,[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important/);
});

test('First Impression stays in the content column after nav collapse', () => {
  assert.match(html, /#pw-first-impression\{grid-column:1\/-1!important\}/);
});

test('plan prioritizes the required tablet workflows', () => {
  for (const term of ['Saved pursuits', 'Pipeline', 'Solicitation', 'Deadlines', 'Notes', 'Vendors/partners', 'First Impression']) {
    assert.ok(plan.includes(term), 'missing workflow: ' + term);
  }
});

test('plan keeps local package handling and heavy extraction in Electron', () => {
  assert.match(plan, /Download, preview, unzip, and extract packages/);
  assert.match(plan, /OCR, DOCX\/PDF parsing, compliance-matrix generation/);
  assert.match(plan, /Do not proxy\s+`govcon\.packages\.downloadSolicitationPackage`/);
});

test('PWA path uses createAppApi and forbids sensitive browser caching', () => {
  assert.ok(plan.includes('createAppApi({ store, credentials, audit, fetchFn, now })'));
  assert.match(webReadme, /must not cache solicitation source text, draft content, API responses/);
});

console.log('\n=== PASS — ' + passed + '/' + passed + ' tablet companion checks ===\n');
