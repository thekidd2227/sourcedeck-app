'use strict';

/**
 * Phase 25E.8 — Bundle contents hotfix sentinel
 *
 * Asserts the electron-builder package.json build.files array
 * includes every path that main.js / preload.js require()'s
 * directly and every static asset the renderer references by
 * relative path. The regression caught at Phase 25E.8 was:
 *
 *   main.js:18  → require('./api')
 *
 * resolves to ./api/index.js, which existed in the repo but
 * was excluded from the bundle because build.files did not
 * list api/. The previous Day 0 trial package worked only
 * because the operator's ./dist/mac/SourceDeck.app was built
 * BEFORE that require landed in main.js.
 *
 * The asar-side guard in scripts/release-check.js also pins
 * /api/index.js — these two assertions backstop each other so
 * the next contributor cannot drop either guard silently.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
);

test('package.json build.files includes api/**/*', () => {
  const files = pkg.build && pkg.build.files;
  assert.ok(Array.isArray(files), 'package.json build.files must be an array');
  assert.ok(
    files.includes('api/**/*'),
    'package.json build.files must include "api/**/*" so api/index.js ships in the asar'
  );
});

test('package.json build.files includes sourcedeck-mark.svg', () => {
  const files = pkg.build && pkg.build.files;
  assert.ok(
    files.includes('sourcedeck-mark.svg'),
    'package.json build.files must include "sourcedeck-mark.svg" — the Phase 25D approved brand mark referenced by sourcedeck.html:744'
  );
});

test('release-check.js REQUIRED_ASAR_FILES includes /api/index.js and /sourcedeck-mark.svg', () => {
  const releaseCheck = fs.readFileSync(
    path.join(REPO_ROOT, 'scripts', 'release-check.js'),
    'utf8'
  );
  // The asar verification gate must list api/index.js so a packaging
  // regression that strips api/ from build.files is caught before
  // shipping to a buyer's machine.
  assert.match(
    releaseCheck,
    /['"]\/api\/index\.js['"]/,
    'scripts/release-check.js REQUIRED_ASAR_FILES must include "/api/index.js"'
  );
  // And the approved brand mark must be in the bundle so the renderer
  // does not 404 the topbar logo at runtime.
  assert.match(
    releaseCheck,
    /['"]\/sourcedeck-mark\.svg['"]/,
    'scripts/release-check.js REQUIRED_ASAR_FILES must include "/sourcedeck-mark.svg"'
  );
});

test('api/index.js exists at the canonical path', () => {
  // Defense in depth: the require target itself must be present in
  // the repo, otherwise build.files cannot ship it.
  const apiPath = path.join(REPO_ROOT, 'api', 'index.js');
  assert.ok(
    fs.existsSync(apiPath),
    'api/index.js must exist - main.js requires it via require("./api")'
  );
});

test('main.js requires ./api so the bundle contract is exercised', () => {
  // If this regression check ever stops finding the require, then the
  // bundle contract on api/ may no longer be necessary - re-evaluate.
  const mainJs = fs.readFileSync(path.join(REPO_ROOT, 'main.js'), 'utf8');
  assert.match(
    mainJs,
    /require\(['"]\.\/api['"]\)/,
    'main.js must require("./api") for this hotfix to remain relevant'
  );
});

test('test is wired into npm test chain', () => {
  assert.ok(
    /test\/phase-25e8-bundle-contents\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e8-bundle-contents.test.js'
  );
});
