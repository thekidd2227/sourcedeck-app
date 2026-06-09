'use strict';

/**
 * Phase 25I — FAR Compliance Review Upload
 *
 * Asserts the upload/paste review path:
 * - Accepts PDF / DOCX / TXT / MD / image file types
 * - Provides a paste-text fallback when no local parser exists
 * - Warns the user before sending content to their AI provider
 * - Carries the mandatory advisory phrasing ("appears aligned" /
 *   "potential issue" / "requires review" / "verify against FAR
 *   and solicitation")
 * - Never claims "certified compliant" / "legally sufficient" /
 *   "FAR certified"
 * - Never uploads files to any government site or external store
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Upload review surface exists with file input + paste fallback', () => {
  assert.match(HTML, /id="far-upload-file"/);
  assert.match(HTML, /accept="\.pdf,\.docx,\.txt,\.md,\.png,\.jpg,\.jpeg,\.webp,text\/plain,text\/markdown"/);
  assert.match(HTML, /id="far-upload-paste"/);
  assert.match(HTML, /id="far-upload-review-type"/);
  assert.match(HTML, /id="far-upload-result-panel"/);
  assert.match(HTML, /id="far-upload-result"/);
});

test('Review type selector ships all 6 canonical types', () => {
  const REQUIRED = [
    'far-alignment',
    'solicitation-instruction',
    'clause-risk',
    'proposal-section',
    'vendor-subcontractor-agreement',
    'pricing-cost-volume',
  ];
  for (const v of REQUIRED) {
    assert.match(HTML, new RegExp(`<option value="${v}"`));
  }
});

test('AI provider warning fires before sending content', () => {
  // The warning must appear within the upload panel.
  const start = HTML.indexOf('data-section="govcon-far-upload-review"');
  const next  = HTML.indexOf('data-section="govcon-far-saved-notes"', start);
  const panel = HTML.slice(start, next);
  assert.match(
    panel,
    /This may send the selected content to your configured AI provider\. Do not upload secrets unless approved\./
  );
  assert.match(panel, /No file is sent to any government site or external storage/);
});

test('Upload review prompt builder enforces advisory phrasing', () => {
  const builder = HTML.match(/window\.farBuildReviewPrompt\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(builder, 'farBuildReviewPrompt not found');
  const src = builder[0];
  // The prompt forbids three certification claims on one line.
  assert.match(src, /Do NOT say/i);
  assert.match(src, /certified compliant/i);
  assert.match(src, /legally sufficient/i);
  assert.match(src, /FAR certified/i);
  assert.match(src, /appears aligned/i);
  assert.match(src, /potential issue/i);
  assert.match(src, /requires review/i);
  assert.match(src, /verify against FAR and solicitation/i);
  assert.match(src, /Do not provide legal advice/i);
});

test('Upload review output includes 5 mandatory sections', () => {
  const builder = HTML.match(/window\.farBuildReviewPrompt\s*=\s*function[\s\S]*?\n\s*\};/);
  const src = builder[0];
  assert.match(src, /Likely FAR topics/i);
  assert.match(src, /Possible issues/i);
  assert.match(src, /Uncertainty.*needs human review/i);
  assert.match(src, /Recommended next steps/i);
  assert.match(src, /Advisory only\. Not a compliance certification/i);
});

test('Upload review handler routes ONLY through window.sd.ai bridge (no direct fetch)', () => {
  const startIdx = HTML.indexOf('/* Phase 25I — FAR Reference (acquisition.gov-grounded)');
  const endIdx = HTML.indexOf('</script>', startIdx);
  let src = HTML.slice(startIdx, endIdx);
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
  // The bridge call is the only AI route.
  assert.match(src, /window\.sd\.ai\.complete/);
});

test('Upload review never declares the renderer-side file uploaded to a government site', () => {
  const startIdx = HTML.indexOf('<section id="gc-far-reference"');
  const endIdx = HTML.indexOf('</section>', startIdx);
  const sec = HTML.slice(startIdx, endIdx);
  // Forbidden upload claims for the upload-review surface.
  assert.doesNotMatch(sec, /uploaded to SAM\.gov/i);
  assert.doesNotMatch(sec, /uploaded to PIEE/i);
  assert.doesNotMatch(sec, /uploaded to eBuy/i);
  assert.doesNotMatch(sec, /uploaded to GSA/i);
  assert.doesNotMatch(sec, /uploaded to acquisition\.gov/i);
  assert.doesNotMatch(sec, /\bagency-ready\b/i);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25i-far-upload-review\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25i-far-upload-review.test.js'
  );
});
