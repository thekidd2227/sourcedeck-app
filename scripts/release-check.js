#!/usr/bin/env node
// Honest pre-release gate for SourceDeck.
// - Refuses to publish if a packaged artifact already exists but doesn't
//   contain the load-bearing files we expect.
// - Refuses to claim a signed/notarized build when the credentials that
//   would have produced one are missing from the environment.
// - Reports — does not pretend.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const REQUIRED_ASAR_FILES = [
  '/main.js',
  '/preload.js',
  '/sourcedeck.html',
  '/chartnav-integration.js',
];

function info(msg)  { console.log('[release-check] ' + msg); }
function warn(msg)  { console.log('[release-check] WARN: ' + msg); }
function fail(msg)  { console.error('[release-check] FAIL: ' + msg); process.exit(1); }

// 1. Required env for a real signed/notarized macOS release.
//    electron-builder reads CSC_LINK + CSC_KEY_PASSWORD for signing,
//    and APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID for
//    notarization (plus we must flip "notarize": true in package.json).
const macSign = {
  csc_link: !!process.env.CSC_LINK,
  csc_key_password: !!process.env.CSC_KEY_PASSWORD,
};
const macNotarize = {
  apple_id: !!process.env.APPLE_ID,
  apple_password: !!process.env.APPLE_APP_SPECIFIC_PASSWORD,
  apple_team_id: !!process.env.APPLE_TEAM_ID,
};

info('macOS signing env  : ' +
  (Object.values(macSign).every(Boolean) ? 'present' : 'MISSING'));
info('macOS notarize env : ' +
  (Object.values(macNotarize).every(Boolean) ? 'present' : 'MISSING'));

// 2. If a packaged .app already exists, verify its asar contents.
const appPath = path.join(REPO, 'dist', 'mac', 'SourceDeck.app');
const asarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');
if (fs.existsSync(asarPath)) {
  info('found packaged asar at ' + path.relative(REPO, asarPath));
  let listing;
  try {
    listing = execSync(
      path.join(REPO, 'node_modules/.bin/asar') + ' list ' + JSON.stringify(asarPath),
      { encoding: 'utf-8' }
    );
  } catch (e) {
    fail('asar list failed: ' + e.message);
  }
  const entries = new Set(listing.split('\n'));
  const missing = REQUIRED_ASAR_FILES.filter(f => !entries.has(f));
  if (missing.length) fail('packaged asar is missing required files: ' + missing.join(', '));
  info('asar contains all required files: ' + REQUIRED_ASAR_FILES.join(', '));

  // 3. Codesign verification (best-effort; absence is honestly reported).
  try {
    const out = execSync('codesign --verify --deep --strict --verbose=2 ' + JSON.stringify(appPath), {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe']
    });
    info('codesign verify: PASS');
    info(out.trim());
  } catch (e) {
    warn('codesign verify failed (artifact is unsigned or improperly signed)');
    warn((e.stderr || e.message || '').toString().trim());
  }
} else {
  info('no packaged artifact present (' + path.relative(REPO, appPath) + ')');
  info('run `npm run pack:mac` (unsigned dev pack) or `npm run build:mac` (full build) first');
}

// 4. Refuse to claim a publishable release when credentials are absent.
const wantPublish = (process.argv.indexOf('--publish') >= 0);
if (wantPublish) {
  const haveAll =
    Object.values(macSign).every(Boolean) &&
    Object.values(macNotarize).every(Boolean);
  if (!haveAll) {
    fail('refusing to publish: missing signing/notarization env. ' +
         'Set CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID ' +
         'and flip "notarize": true in package.json before publishing.');
  }
  info('all signing + notarization env present — safe to publish.');
}
