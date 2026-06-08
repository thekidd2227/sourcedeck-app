/**
 * Phase 24B — GovCon core hardening regression test.
 *
 * Asserts:
 *   - Renderer no longer hardcodes a single operator's APPROVED_NAICS
 *     list. APPROVED_NAICS is initialized empty and populated from the
 *     targeting profile via window.sd.govcon.getTargeting().
 *   - The legacy hardcoded NAICS literals are gone from sourcedeck.html.
 *   - The targeting-profile loader (gcLoadTargetingNaics) is wired and
 *     called on DOMContentLoaded.
 *   - SAM URL builders (runGovconSync, runGovconSyncWide) refresh the
 *     cache and short-circuit with a "configure NAICS in Settings"
 *     toast when the profile is empty.
 *   - The Audit Log panel (#gc-audit-log) exists inside the GovCon
 *     Operating Rhythm grid and calls the audit IPC bridge (not
 *     localStorage, not fetch).
 *   - The audit log copy never claims auto-export / auto-upload / auto-
 *     transmit; it explicitly states events are local-only.
 *   - Renderer continues to never embed Bearer / Authorization
 *     literals (regression guard on credential boundary).
 *   - Existing renderer-boot inline-script parse guard still holds.
 *   - The Phase 22B Operating Rhythm parent + its other four panels
 *     remain intact.
 *
 * Static + VM-based; never executes app/renderer code or touches the
 * network.
 *
 * Run:  node test/govcon-core-hardening.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const PRELOAD = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 24B — GovCon core hardening ===\n');

// 1. Renderer no longer hardcodes one operator's NAICS list literal.
test('renderer no longer hardcodes APPROVED_NAICS literal array', () => {
  // The legacy list contained these 10 codes; none of them should appear
  // as adjacent literals in the renderer's APPROVED_NAICS bootstrap.
  const legacy = [
    "'531311','531312','561210','561720','238220'",
    "'238210','561320','561311','541611','541614'"
  ];
  for (const slug of legacy) {
    assert.ok(!HTML.includes(slug),
      'legacy hardcoded NAICS literal still present: ' + slug);
  }
  // The variable must be declared with `let` (mutable) and initialized
  // empty so the targeting-profile loader can populate it.
  assert.ok(/let\s+APPROVED_NAICS\s*=\s*\[\s*\]/.test(HTML),
    'APPROVED_NAICS must be declared `let APPROVED_NAICS = []` (empty default)');
});

// 2. Renderer carries a targeting-profile loader that reads via IPC.
test('renderer exposes gcLoadTargetingNaics() reading via sd.govcon.getTargeting', () => {
  assert.ok(/async\s+function\s+gcLoadTargetingNaics\s*\(/.test(HTML),
    'gcLoadTargetingNaics async function missing');
  assert.ok(/window\.sd\.govcon\.getTargeting/.test(HTML),
    'gcLoadTargetingNaics must call window.sd.govcon.getTargeting');
  // The loader must run on DOMContentLoaded so APPROVED_NAICS is
  // populated as early as the bridge is ready.
  assert.ok(/DOMContentLoaded[^}]*gcLoadTargetingNaics/.test(HTML),
    'DOMContentLoaded must invoke gcLoadTargetingNaics');
  assert.ok(/window\.gcLoadTargetingNaics\s*=\s*gcLoadTargetingNaics/.test(HTML),
    'gcLoadTargetingNaics must be exposed on window');
});

// 3. SAM URL builders refresh the profile cache and prompt when empty.
test('runGovconSync browser fallback refreshes profile + guards empty NAICS', () => {
  const m = HTML.match(/function\s+runGovconSync\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'runGovconSync function not found');
  const fn = m[0];
  assert.ok(/await\s+gcLoadTargetingNaics\s*\(/.test(fn),
    'runGovconSync browser fallback must await gcLoadTargetingNaics()');
  assert.ok(/Configure your NAICS in Settings/i.test(fn),
    'runGovconSync must prompt the operator to configure NAICS when empty');
});

test('runGovconSyncWide refreshes profile + guards empty NAICS', () => {
  const m = HTML.match(/async\s+function\s+runGovconSyncWide\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'runGovconSyncWide async function not found');
  const fn = m[0];
  assert.ok(/await\s+gcLoadTargetingNaics\s*\(/.test(fn),
    'runGovconSyncWide must await gcLoadTargetingNaics()');
  assert.ok(/Configure your NAICS in Settings/i.test(fn),
    'runGovconSyncWide must prompt the operator to configure NAICS when empty');
});

test('runGovconSyncSingle no longer falls back to a hardcoded NAICS code', () => {
  const m = HTML.match(/function\s+runGovconSyncSingle\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'runGovconSyncSingle function not found');
  const fn = m[0];
  // The legacy hard fallback `code = naics.trim() || '541611'` must be gone.
  assert.ok(!/\|\|\s*['"]541611['"]/.test(fn),
    'runGovconSyncSingle must not fall back to literal NAICS 541611');
  // Replacement validation: short-circuit on empty input.
  assert.ok(/Enter a NAICS code/i.test(fn) || /4[–-]6 digits/i.test(fn),
    'runGovconSyncSingle must surface a clear "enter a NAICS" guard');
});

// 4. Audit Log panel exists inside Operating Rhythm and uses the IPC bridge.
test('Audit Log panel #gc-audit-log exists inside the Operating Rhythm grid', () => {
  const orStart = HTML.indexOf('id="gc-operating-rhythm"');
  const auditIdx = HTML.indexOf('id="gc-audit-log"');
  assert.ok(orStart > 0, '#gc-operating-rhythm parent missing');
  assert.ok(auditIdx > 0, '#gc-audit-log panel missing');
  assert.ok(auditIdx > orStart,
    '#gc-audit-log must appear inside #gc-operating-rhythm');
  // Refresh button + list mount point.
  assert.ok(/id="gc-audit-refresh-btn"/.test(HTML), 'Refresh button missing');
  assert.ok(/onclick="gcAuditRefresh\(\)"/.test(HTML),
    'Refresh button must invoke gcAuditRefresh()');
  assert.ok(/id="gc-audit-list"/.test(HTML), 'audit list mount point missing');
});

test('gcAuditRefresh() calls the audit IPC bridge, not localStorage / fetch', () => {
  const m = HTML.match(/async\s+function\s+gcAuditRefresh\s*\(\s*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'gcAuditRefresh function not found');
  const fn = m[0];
  assert.ok(/window\.sd\.auditList\s*\(/.test(fn),
    'gcAuditRefresh must call window.sd.auditList()');
  assert.ok(!/fetch\s*\(/.test(fn),
    'gcAuditRefresh must not call fetch() directly');
  assert.ok(!/localStorage/.test(fn),
    'gcAuditRefresh must not read localStorage for audit events');
});

test('Audit Log panel copy never claims auto-export / auto-upload / auto-transmit', () => {
  const start = HTML.indexOf('id="gc-audit-log"');
  assert.ok(start > 0, '#gc-audit-log not found');
  const end = HTML.indexOf('</div>', start + 3000); // generous window
  const panel = HTML.slice(start, end > 0 ? end + 6 : start + 3000);
  // Forbid bare positive claims.
  for (const re of [
    /\bauto[-\s]?export\b/i,
    /\bauto[-\s]?upload\b/i,
    /\bauto[-\s]?transmit\b/i,
    /\buploaded to (any )?(portal|SAM|PIEE|eBuy|GSA)/i
  ]) {
    if (re.test(panel)) {
      const lines = panel.split(/\r?\n/);
      const hit = lines.find(l => re.test(l)) || '';
      const guard = /\b(?:do(?:es)?\s*not|never|no |without|cannot)\b/i.test(hit);
      assert.ok(guard,
        'Audit Log panel contains unguarded positive claim matching ' + re + ': ' + hit.trim());
    }
  }
  // Must explicitly state local-only and never-uploaded.
  assert.ok(/local(-|\s)?only|persisted locally only|never[^.]*uploaded/i.test(panel),
    'Audit Log panel must explicitly state events are local-only and not uploaded');
});

// 5. Credential boundary regression guard: no actual Authorization
//    HEADER construction in the renderer; preload still pure IPC.
//    We deliberately match construction patterns, not the bare word
//    "bearer" which can legitimately appear in settings UI placeholder
//    copy ("bearer token or admin email") or in negative-assertion
//    comments ("never builds Bearer headers"). The construction
//    patterns are what would actually leak a credential.
test('renderer must not construct an Authorization: Bearer header', () => {
  // "Bearer " followed by a template/concat expression is the smoking
  // gun for actual header construction.
  assert.ok(!/['"`]Bearer\s+\$\{/.test(HTML),
    'renderer constructs a template-literal Bearer header');
  assert.ok(!/['"]Bearer\s+['"]\s*\+/.test(HTML),
    'renderer concatenates a Bearer header literal with a key');
  // Authorization assignment as an object key with a Bearer value.
  assert.ok(!/Authorization['"`]\s*:\s*['"`]Bearer\s/.test(HTML),
    'renderer sets Authorization: "Bearer ..." inline');
});

test('preload still pure IPC bridge', () => {
  assert.ok(!/(^|\W)fetch\s*\(/.test(PRELOAD),
    'preload must not call fetch');
  assert.ok(!/['"]Bearer\s/i.test(PRELOAD),
    'preload must not embed a Bearer literal');
  assert.ok(/ipcRenderer\.invoke/.test(PRELOAD),
    'preload should use ipcRenderer.invoke');
});

// 6. Existing Operating Rhythm parent + four other panels remain intact.
test('Operating Rhythm parent + four prior panels remain intact', () => {
  assert.ok(/id="gc-operating-rhythm"/.test(HTML),       'parent missing');
  assert.ok(/id="gc-daily-rhythm"/.test(HTML),           'daily-rhythm panel missing');
  assert.ok(/id="gc-deadline-calendar"/.test(HTML),      'deadline-calendar panel missing');
  assert.ok(/id="gc-prerfp-intel"/.test(HTML),           'prerfp-intel panel missing');
  assert.ok(/id="gc-agency-targeting"/.test(HTML),       'agency-targeting panel missing');
});

// 7. Renderer-boot guard: every inline <script> still parses.
test('every inline <script> block still parses (renderer-boot guard)', () => {
  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 8, 'expected ≥8 inline scripts; found ' + scripts.length);
  const failures = [];
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `sourcedeck.html:inline-${i + 1}.js` }); }
    catch (e) { failures.push(`inline-${i + 1}: ${e.message}`); }
  });
  assert.strictEqual(failures.length, 0,
    'unparseable inline scripts:\n' + failures.join('\n'));
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 24B govcon-core-hardening checks ===\n`);
process.exit(failed ? 1 : 0);
