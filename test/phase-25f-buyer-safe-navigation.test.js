'use strict';

/**
 * Phase 25F — Buyer-Safe Navigation
 *
 * Asserts the sidebar/navigation surface remains safe on a clean
 * buyer cold-open:
 * - Clinical / EHR nav-capabilities section stays hidden (Phase 24E
 *   invariant: clinical mode is opt-in and never visible by default).
 * - Help / FAQ tab is always-on (Phase 25E.4 invariant).
 * - Approved gold mark (sourcedeck-mark.svg) is present (Phase 25D /
 *   25E.1 invariant).
 * - No old "S" textContent fallback (Phase 25D invariant).
 * - No public-download / free-demo / try-now / get-started-free CTA
 *   (Phase 25C invariant).
 * - No Send Email / Submit Bid / Submit Quote / portal-upload control
 *   anywhere in the renderer (Phase 25A invariant).
 *
 * This sentinel is the buyer-facing safety backstop. It overlaps with
 * existing tests on purpose - the Phase 25F regression surface is
 * exactly the place where buyer-facing safety must hold.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Clinical / EHR nav section stays hidden by default', () => {
  assert.match(
    HTML,
    /<div class="nav-section" id="nav-capabilities" style="display:none">/,
    'nav-capabilities must default to display:none'
  );
});

test('Help / FAQ nav button is always-on (Phase 25E.4 invariant)', () => {
  assert.match(HTML, /id="nav-section-help"/);
  const startIdx = HTML.indexOf('id="nav-section-help"');
  const next = HTML.indexOf('<div class="nav-section"', startIdx + 1);
  const block = HTML.slice(startIdx, next === -1 ? HTML.length : next);
  assert.doesNotMatch(block, /data-other-business-tools/);
  assert.match(block, /data-tab="help"/);
});

test('approved gold mark is present in the topbar (Phase 25D / 25E.1 invariant)', () => {
  assert.match(HTML, /sourcedeck-mark\.svg/);
  assert.doesNotMatch(HTML, /sourcedeck-logo\.png/);
  assert.doesNotMatch(HTML, /textContent\s*=\s*['"]S['"]/);
});

test('no public-download / free-demo / try-now / get-started-free CTA in active markup (Phase 25C invariant)', () => {
  const FORBIDDEN_CTAS = [
    /Free demo/i,
    /Download now/i,
    /Try now/i,
    /Start free/i,
    /Get started free/i,
    /Free download/i,
    /Public download/i,
    /Public self-serve/i,
  ];
  for (const re of FORBIDDEN_CTAS) {
    assert.doesNotMatch(
      HTML,
      re,
      `forbidden CTA "${re.source}" must not appear in the renderer`
    );
  }
});

test('no Send Email / Submit Bid / Submit Quote / portal-upload control (Phase 25A invariant)', () => {
  const FORBIDDEN_CONTROLS = [
    />\s*Send Email\s*</i,
    />\s*Submit Bid\s*</i,
    />\s*Submit Quote\s*</i,
    /Export and submit/i,
    /Upload to SAM/i,
    /Upload to PIEE/i,
    /Upload to eBuy/i,
    /Upload to GSA/i,
  ];
  for (const re of FORBIDDEN_CONTROLS) {
    assert.doesNotMatch(
      HTML,
      re,
      `forbidden control "${re.source}" must not appear in the renderer`
    );
  }
});

test('no signed/notarized/FedRAMP/SOC 2/CMMC/HIPAA/HITRUST/ISO/guaranteed claim (Phase 25A invariant)', () => {
  const FORBIDDEN_CLAIMS = [
    /\bsigned and notarized\b/i,
    /\bApple notarized\b/i,
    /\bproduction signed\b/i,
    /\bFedRAMP certified\b/i,
    /\bSOC\s?2 certified\b/i,
    /\bCMMC certified\b/i,
    /\bHIPAA certified\b/i,
    /\bHITRUST\b/i,
    /\bISO 27001 certified\b/i,
    /\bguaranteed award\b/i,
    /\bguaranteed revenue\b/i,
  ];
  for (const re of FORBIDDEN_CLAIMS) {
    assert.doesNotMatch(
      HTML,
      re,
      `forbidden claim "${re.source}" must not appear in the renderer`
    );
  }
});

test('no deprecated V2 pricing ($79 / $349 / $999) in active app UI', () => {
  const FORBIDDEN_PRICES = [
    /\$79\b/,
    /\$349\b/,
    /\$999\b/,
  ];
  for (const re of FORBIDDEN_PRICES) {
    assert.doesNotMatch(
      HTML,
      re,
      `deprecated V2 price "${re.source}" must not appear in the renderer`
    );
  }
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25f-buyer-safe-navigation\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25f-buyer-safe-navigation.test.js'
  );
});
