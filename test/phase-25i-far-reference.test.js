'use strict';

/**
 * Phase 25I — FAR Reference (GovCon section)
 *
 * Asserts the new FAR Reference section inside the GovCon pane:
 * - Lives as a <section id="gc-far-reference"> inside tab-govcon
 * - Is reachable via the Phase 25F section pill bar
 * - Carries acquisition.gov as the source of truth
 * - Carries the canonical "not legal advice" + "no certified
 *   compliance" disclaimer
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('FAR Reference tab is reachable from the Phase 25N GovCon tab nav', () => {
  // Phase 25N replaced the Phase 25F "Jump to" scroll-pill nav with
  // real tab-pages; FAR Reference is now a tab button that routes to
  // the gc-far-reference panel via gcTabSwitch('far-reference').
  assert.match(HTML, /data-gc-tab="far-reference"[^>]*onclick="gcTabSwitch\('far-reference'\)"/);
  assert.match(HTML, />\s*FAR Reference\s*</);
  // The interactive FAR panel carries the matching tab-page attribute
  // so the FAR Reference tab actually renders it (not a static stub).
  assert.match(HTML, /<section id="gc-far-reference"[^>]*data-gc-tab-page="far-reference"/);
});

test('FAR Reference section lives inside the GovCon pane', () => {
  const paneStart = HTML.indexOf('<div class="tab-pane active" id="tab-govcon">');
  const paneEnd   = HTML.indexOf('<div class="tab-pane"', paneStart + 1);
  const pane = HTML.slice(paneStart, paneEnd);
  assert.match(pane, /<section id="gc-far-reference"[^>]*data-section="govcon-far-reference"/);
});

test('FAR Reference references acquisition.gov as source of truth', () => {
  const sec = extractFarSection();
  assert.match(sec, /acquisition\.gov/i);
  assert.match(sec, /Source of truth: acquisition\.gov/);
});

test('Open FAR + Regulations Search buttons exist', () => {
  const sec = extractFarSection();
  assert.match(sec, /Open FAR on Acquisition\.gov/);
  assert.match(sec, /Regulations Search/);
  assert.match(sec, /onclick="farOpenAcquisitionGov\(\)"/);
  assert.match(sec, /onclick="farOpenRegulationsSearch\(\)"/);
});

test('Internal-review / not-legal-advice disclaimer is present (verbatim Phase 25I mission language)', () => {
  const sec = extractFarSection();
  // The canonical safety language from the mission.
  assert.match(
    sec,
    /SourceDeck provides internal review support only\. This is not legal advice\. Verify against the current solicitation and acquisition\.gov FAR text before relying on it\./
  );
});

test('FAR Reference contains all 4 required panels', () => {
  const sec = extractFarSection();
  assert.match(sec, /data-section="govcon-far-browse"/);
  assert.match(sec, /data-section="govcon-far-ai-faq"/);
  assert.match(sec, /data-section="govcon-far-upload-review"/);
  assert.match(sec, /data-section="govcon-far-saved-notes"/);
});

test('FAR Reference forbids "FAR certified" / "legally sufficient" / "guaranteed compliant" claims', () => {
  const sec = extractFarSection();
  assert.doesNotMatch(sec, /\bFAR certified\b/i);
  assert.doesNotMatch(sec, /\blegally sufficient\b/i);
  assert.doesNotMatch(sec, /\bguaranteed compliant\b/i);
  assert.doesNotMatch(sec, /\bcertified compliant\b/i);
});

test('FAR Reference forbids legal-advice / certified-compliance claims everywhere in renderer', () => {
  // Cross-pane safety: even outside the FAR Reference section, no
  // active surface may claim legal advice or certified compliance.
  assert.doesNotMatch(HTML, /\blegal advice provided\b/i);
  assert.doesNotMatch(HTML, /\bofficial FAR certification\b/i);
  assert.doesNotMatch(HTML, /\bdefinitively FAR compliant\b/i);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25i-far-reference\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25i-far-reference.test.js'
  );
});

function extractFarSection() {
  const start = HTML.indexOf('<section id="gc-far-reference"');
  assert.ok(start !== -1, 'gc-far-reference section missing');
  // The section closes with </section>. Find matching close.
  const end = HTML.indexOf('</section>', start);
  return HTML.slice(start, end);
}
