'use strict';

/**
 * Phase 25D / Phase 25E.1 — SourceDeck Approved Logo Standardization
 *
 * Asserts the approved gold geometric SourceDeck mark
 * (sourcedeck-mark.svg, dark stone tile + four gold chevron quadrants
 * converging on a center void) is the canonical brand mark in the
 * Electron renderer. The old textual `S` icon fallback and the
 * deprecated sourcedeck-logo.png reference must not appear in active
 * renderer markup.
 *
 * This sentinel was added in Phase 25E.1 because Phase 25D shipped the
 * approved-mark replacement without a corresponding sentinel test;
 * Phase 25E.1 backfills the guard so the next contributor cannot
 * regress the renderer brand back to the old `S` fallback.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(REPO_ROOT, 'sourcedeck.html');
const APPROVED_MARK = path.join(REPO_ROOT, 'sourcedeck-mark.svg');

const HTML = fs.readFileSync(RENDERER, 'utf8');

test('approved sourcedeck-mark.svg asset is present at repo root', () => {
  assert.ok(
    fs.existsSync(APPROVED_MARK),
    'sourcedeck-mark.svg missing — the approved canonical brand mark must live at the repo root'
  );
  const svg = fs.readFileSync(APPROVED_MARK, 'utf8');
  assert.ok(
    /<svg\b/i.test(svg),
    'sourcedeck-mark.svg is not a valid SVG document'
  );
  assert.ok(
    /viewBox="0 0 200 200"/.test(svg),
    'sourcedeck-mark.svg must use the canonical 200x200 viewBox'
  );
  assert.ok(
    /id="sd-gold"/.test(svg),
    'sourcedeck-mark.svg must define the canonical sd-gold linearGradient'
  );
});

test('renderer references the approved sourcedeck-mark.svg', () => {
  assert.ok(
    /sourcedeck-mark\.svg/.test(HTML),
    'sourcedeck.html must reference sourcedeck-mark.svg (the approved brand mark)'
  );
});

test('renderer no longer references the deprecated sourcedeck-logo.png', () => {
  assert.ok(
    !/sourcedeck-logo\.png/.test(HTML),
    'sourcedeck.html must not reference sourcedeck-logo.png (deprecated Phase 25D)'
  );
});

test('renderer no longer carries the old textContent=S fallback', () => {
  assert.ok(
    !/textContent\s*=\s*['"]S['"]/.test(HTML),
    'sourcedeck.html must not carry the old textContent="S" onerror fallback (deprecated Phase 25D)'
  );
});

test('topbar logo-mark img src is the approved mark', () => {
  // Phase 25D + 25E.1: the topbar .logo-mark wrapper renders the
  // approved SVG mark, not the deprecated wordmark PNG.
  const logoMarkBlock = HTML.match(
    /<div class="logo-mark">\s*<img\s+src="([^"]+)"/
  );
  assert.ok(
    logoMarkBlock,
    'topbar .logo-mark img element not found in renderer'
  );
  assert.equal(
    logoMarkBlock[1],
    'sourcedeck-mark.svg',
    'topbar .logo-mark img src must be sourcedeck-mark.svg'
  );
});

test('logo-mark CSS uses object-fit:contain for the square approved mark', () => {
  // Pre-Phase-25D the CSS used object-fit:cover + object-position:17% center
  // to crop a horizontal wordmark PNG. The approved mark is square; cropping
  // would offset the rendered emblem. Phase 25D switched to contain.
  assert.ok(
    /\.logo-mark img\s*\{[^}]*object-fit\s*:\s*contain/.test(HTML),
    '.logo-mark img CSS must use object-fit:contain so the square approved mark renders correctly'
  );
  assert.ok(
    !/object-position\s*:\s*17%/.test(HTML),
    '.logo-mark img CSS must not carry the deprecated object-position:17% wordmark-crop offset'
  );
});

test('Phase 25D audit doc records the standardization', () => {
  const audit = path.join(
    REPO_ROOT,
    'docs',
    'audits',
    'phase-25d-app-logo-standardization.md'
  );
  assert.ok(
    fs.existsSync(audit),
    'docs/audits/phase-25d-app-logo-standardization.md must exist (Phase 25D audit)'
  );
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/sourcedeck-logo-standardization\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/sourcedeck-logo-standardization.test.js'
  );
});
