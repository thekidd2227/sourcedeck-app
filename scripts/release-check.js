#!/usr/bin/env node
// Honest pre-release gate for SourceDeck.
// - Refuses to publish if a packaged artifact already exists but doesn't
//   contain the load-bearing files we expect.
// - Refuses to claim a signed/notarized build when the credentials that
//   would have produced one are missing from the environment.
// - Refuses to publish if owner-identifying strings or populated seed
//   arrays remain in any shipped file (the privacy gate).
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

// ── PRIVACY GATE ─────────────────────────────────────────────────────
// Scans every file listed under package.json `build.files` for owner-
// identifying strings and for populated seed arrays. Any hit blocks
// publish. Internal back-compat identifiers (ARCG_OS, arcg_brand key,
// _arcg_help) are explicitly allow-listed.
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const SHIPPED_FILES = (pkg.build && pkg.build.files) || [];

const PRIVACY_BLOCKLIST = [
  { pattern: /ARCG\s+Systems/g,            reason: 'Owner brand: "ARCG Systems"' },
  { pattern: /Ariel's?\s+River/g,          reason: 'Owner company: Ariel\'s River' },
  { pattern: /arivergroup/gi,              reason: 'Owner domain: arivergroup' },
  { pattern: /arcgsystems\.com/gi,         reason: 'Owner website: arcgsystems.com' },
  { pattern: /digiarcgsystems/gi,          reason: 'Owner domain: digiarcgsystems' },
  { pattern: /@arcg\.ai/gi,                reason: 'Owner social handle: @arcg.ai' },
  { pattern: /Jean-Max\s+Charles/g,        reason: 'Owner name: Jean-Max Charles' },
  { pattern: /\bjeanmax\b/gi,              reason: 'Owner handle: jeanmax' },
  { pattern: /jeanmaxc/g,                  reason: 'Owner LinkedIn: jeanmaxc' },
  { pattern: /\(212\)\s*663-6215/g,        reason: 'Leaked real phone: (212) 663-6215' },
  { pattern: /\(718\)\s*320-3300/g,        reason: 'Leaked real phone: (718) 320-3300' },
  { pattern: /555-?906-?3676/g,            reason: 'Owner WhatsApp number' },
  { pattern: /charlie@digiarcgsystems\.com/g, reason: 'Owner delivery inbox' },
  { pattern: /khackett@robertehill\.com/g, reason: 'Leaked real contact' },
  { pattern: /amarks@maxwellkates\.com/g,  reason: 'Leaked real contact' },
  { pattern: /askai@harlempm\.com/g,       reason: 'Leaked real contact' },
  { pattern: /fvillalta@almarealty\.com/g, reason: 'Leaked real contact' },
  { pattern: /info@apartmentstaffing\.com/g, reason: 'Leaked real contact' },
  { pattern: /info@centuryny\.com/g,       reason: 'Leaked real contact' },
  { pattern: /denise@elhmgmt\.com/g,       reason: 'Leaked real contact' },
  { pattern: /office@bluehillrealty\.com/g,reason: 'Leaked real contact' },
  { pattern: /info@hendersonproperties\.com/g, reason: 'Leaked real contact' },
  { pattern: /Maxwell-Kates\s+Inc/g,       reason: 'Leaked real company' },
  { pattern: /Riverbay\s+Corporation/g,    reason: 'Leaked real company' },
  { pattern: /Alma\s+Realty\s+Corp/g,      reason: 'Leaked real company' },
  { pattern: /HPM\s+Property\s+Management/g, reason: 'Leaked real company' },
  { pattern: /Henderson\s+Properties/g,    reason: 'Leaked real company' },
  { pattern: /Blue\s+Hill\s+Realty/g,      reason: 'Leaked real company' },
  { pattern: /ELH\s+Mgmt\s+LLC/g,          reason: 'Leaked real company' },
  { pattern: /Premier\s+Placements/g,      reason: 'Leaked real company' },
  { pattern: /Century\s+Management/g,      reason: 'Leaked real company' },
  { pattern: /Robert\s+E\.\s+Hill/g,       reason: 'Leaked real company' },
  { pattern: /\/Desktop\/ARCG/gi,          reason: 'Developer desktop path' },
];

const PRIVACY_ALLOWLIST = [
  // Back-compat internal identifiers that never surface in UI.
  { file: 'sourcedeck.html', pattern: /\bARCG_OS\b/g },
  { file: 'sourcedeck.html', pattern: /arcg_brand/g },
  { file: 'sourcedeck.html', pattern: /_arcg_help/g },
  { file: 'sourcedeck.html', pattern: /\barcg_help\b/g },
  { file: 'sourcedeck.html', pattern: /\barcg_solution\b/g },
  { file: 'sourcedeck.html', pattern: /'ARCG\s+Best\s+Services'/g },
  { file: 'sourcedeck.html', pattern: /f\['ARCG Best Services'\]/g },
];

function _stripAllowed(fileBase, text) {
  let t = text;
  // Strip any region between `// privacy-check:ignore-start` and
  // `// privacy-check:ignore-end` — these are explicit, auditable exemptions
  // (e.g. the scrub blocklist in main.js, which stores the blocked strings
  // AS DATA so we can remove them from stored state).
  t = t.replace(/\/\/\s*privacy-check:ignore-start[\s\S]*?\/\/\s*privacy-check:ignore-end/g, '');
  for (const a of PRIVACY_ALLOWLIST) if (a.file === fileBase) t = t.replace(a.pattern, '');
  return t;
}

function _scanShippedFile(relPath) {
  const abs = path.join(REPO, relPath);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isDirectory()) {
    const out = [];
    for (const e of fs.readdirSync(abs)) out.push(..._scanShippedFile(path.join(relPath, e)));
    return out;
  }
  const text = fs.readFileSync(abs, 'utf8');
  const scanned = _stripAllowed(path.basename(relPath), text);
  const hits = [];
  for (const b of PRIVACY_BLOCKLIST) {
    const matches = [...scanned.matchAll(b.pattern)];
    for (const m of matches) {
      const lineNo = scanned.slice(0, m.index).split('\n').length;
      hits.push({ file: relPath, line: lineNo, match: m[0], reason: b.reason });
    }
  }
  return hits;
}

function _runStructuralChecks() {
  const problems = [];
  const htmlPath = path.join(REPO, 'sourcedeck.html');
  if (!fs.existsSync(htmlPath)) return problems;
  const src = fs.readFileSync(htmlPath, 'utf8');

  const mMocks = src.match(/const\s+MOCK_LEADS\s*=\s*\[([\s\S]*?)\];/m);
  if (!mMocks) problems.push({ label: 'MOCK_LEADS missing', detail: 'declaration not found' });
  else if (/\{[\s\S]*?fields[\s\S]*?\}/.test(mMocks[1].trim())) {
    problems.push({ label: 'MOCK_LEADS must ship empty', detail: 'populated lead entries present' });
  }

  const mLib = src.match(/const\s+PROMPT_LIBRARY\s*=\s*\{([\s\S]*?)\};/m);
  if (!mLib) problems.push({ label: 'PROMPT_LIBRARY missing', detail: 'declaration not found' });
  else if (/"[A-Za-z ]+":\s*\{/.test(mLib[1].trim())) {
    problems.push({ label: 'PROMPT_LIBRARY must ship empty', detail: 'populated topic entries present' });
  }

  const mBrand = src.match(/localStorage\.getItem\('arcg_brand'\)\s*\|\|\s*'([^']+)'/);
  if (mBrand) {
    try {
      const obj = JSON.parse(mBrand[1]);
      if ((obj.name || '').trim() !== '') {
        problems.push({ label: 'arcg_brand default must be neutral', detail: 'non-empty default name: ' + JSON.stringify(obj.name) });
      }
    } catch (e) {
      problems.push({ label: 'arcg_brand default invalid JSON', detail: e.message });
    }
  }
  return problems;
}

info('privacy gate: scanning shipped files: ' + JSON.stringify(SHIPPED_FILES));
const privacyHits = [];
for (const f of SHIPPED_FILES) privacyHits.push(..._scanShippedFile(f));
const structural = _runStructuralChecks();
if (privacyHits.length > 0) {
  console.error('\n[release-check] ✗ PRIVACY GATE BLOCKED — owner-identifying strings in shipped source:');
  for (const h of privacyHits) console.error(`  ${h.file}:${h.line}   ${h.reason}   →   ${h.match}`);
}
if (structural.length > 0) {
  console.error('\n[release-check] ✗ PRIVACY GATE BLOCKED — structural failures:');
  for (const s of structural) console.error(`  ${s.label}   →   ${s.detail}`);
}
if (privacyHits.length > 0 || structural.length > 0) {
  fail('privacy gate failed — fix above before publishing. See docs/release/privacy-first-run-verification.md');
}
info('privacy gate: ✓ no owner strings in shipped source; MOCK_LEADS empty; PROMPT_LIBRARY empty; arcg_brand default neutral.');

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
