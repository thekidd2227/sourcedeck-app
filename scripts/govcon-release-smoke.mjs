#!/usr/bin/env node
/**
 * GovCon release smoke — static checks (no Electron launch).
 *
 * Verifies the GovCon Capture Suite + First-Time Setup Wizard are wired
 * and that the credential boundary and procurement-integrity guardrails
 * are present in source. This is a fast pre-release gate; the full UI
 * behavior still requires the manual checklist in
 * docs/manual-qa/govcon-release-smoke.md.
 *
 * Exits non-zero on any failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

function read(p) {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; }
}
function has(p) { try { return fs.existsSync(path.join(ROOT, p)); } catch { return false; } }
function check(name, cond) { cond ? ok(name) : bad(name); }

console.log('── GovCon release smoke (static) ──');

const preload   = read('preload.js') || '';
const mainjs    = read('main.js') || '';
const featureIpc = read('app/main/ipc/register-feature-ipc.js') || '';
const apijs     = read('api/index.js') || '';
const html      = read('sourcedeck.html') || '';
const exportSvc = read('services/govcon/export.js') || '';
const outreach  = read('services/govcon/outreach-window.js') || '';
const fastcash  = read('services/govcon/fast-cash.js') || '';

// ── 1. Required GovCon preload methods exist ───────────────────────────
console.log('\n[preload surface]');
for (const m of [
  'govcon:', 'opportunities-', 'deadlines-extract', 'subcontractors-source',
  'incumbent-research', 'solicitation-analyze', 'clarifications-generate',
  'proposal-workspace', 'exports-create'
]) check('preload references ' + m, preload.includes(m));
check('preload exposes credentials.status/set/remove',
  /credentials:\s*\{[\s\S]*status[\s\S]*set[\s\S]*remove/.test(preload));

// ── 2. Required IPC handlers exist (composition root + feature IPC) ───
console.log('\n[ipc handlers]');
check('main.js delegates IPC registration through the composition root',
  /registerFeatureIpc/.test(read('app/main/bootstrap.js') || '') && !/ipcMain\.handle\(/.test(mainjs));
for (const h of [
  'govcon:sam-search', 'govcon:opportunities-favorite', 'govcon:deadlines-extract',
  'govcon:subcontractors-source', 'govcon:incumbent-research',
  'govcon:solicitation-analyze', 'govcon:clarifications-generate',
  'govcon:proposal-workspace', 'govcon:exports-create',
  'credentials:status', 'credentials:set', 'credentials:remove'
]) check('feature IPC handles ' + h, featureIpc.includes("'" + h + "'") || featureIpc.includes('"' + h + '"'));

// ── 3. api.govcon / app-api methods exist ─────────────────────────────
console.log('\n[app-api surface]');
check('app-api builds credentials surface', /credentials\s*:/.test(apijs));
check('app-api reads SAM key inside main process (credentials.get(\'sam-gov\'))',
  /credentials\.get\(\s*['"]sam-gov['"]\s*\)/.test(apijs));

// ── 4. Credential boundary: no raw auth headers in renderer/preload ───
console.log('\n[credential boundary]');
// preload must not build Bearer/x-api-key headers or read raw keys
check('preload builds no Authorization/Bearer header',
  !/['"]Authorization['"]\s*:/.test(preload) && !/Bearer\s*['"+]/.test(preload));
check('preload builds no x-api-key header',
  !/['"]x-api-key['"]\s*:/.test(preload));
// SAM key must never be requested raw by the renderer
check('renderer never calls a get-raw-SAM path',
  !/credentials\.get\(/.test(preload) && !/get-key[\s\S]{0,20}sam/i.test(preload));
// sourcedeck.html must save SAM only via the safe credential adapter
check('renderer saves SAM via sd.credentials.set(\'sam-gov\', ...)',
  /credentials\.set\(\s*['"]sam-gov['"]/.test(html));
check('renderer does not build a SAM auth header',
  !/api\.sam\.gov[\s\S]{0,120}(Authorization|api_key=)/.test(html.replace(/\/\/[^\n]*/g, '')));

// ── 5. Export secret stripping exists + tested ────────────────────────
console.log('\n[exports]');
check('export.js strips secret-shaped keys',
  /api[_-]?key|authorization|secret|token|credential/i.test(exportSvc) && /continue|delete|skip/i.test(exportSvc));
check('export test asserts no secret leak', (() => {
  const t = read('test/govcon-export.test.js') || '';
  return /Bearer|apiKey|SECRET/.test(t);
})());

// ── 6. Procurement-integrity guardrails present ───────────────────────
console.log('\n[procurement integrity]');
check('RED_RESTRICTED present in outreach-window', /RED_RESTRICTED/.test(outreach));
check('RED_RESTRICTED blocks drafts (draftsAllowed:false)',
  /RED_RESTRICTED[\s\S]{0,400}draftsAllowed:\s*false/.test(outreach) || /draftsAllowed:\s*false[\s\S]{0,400}qaOnly:\s*true/.test(outreach));
check('KILL irreversibility present', /KILL stays KILL|Previously killed/.test(fastcash));
check('AI cannot override deterministic verdicts', (() => {
  const sol = read('services/govcon/solicitation-analysis.js') || '';
  return /cannot override (KILL|.*KILL)/i.test(sol);
})());

// ── 7. Setup wizard + safety language in renderer ─────────────────────
console.log('\n[setup wizard]');
check('wizard entry function present', /function openGovconSetupWizard/.test(html));
check('wizard has profile + SAM + safety steps', /govcon-wiz/.test(html));
check('wizard SAM copy is presence-only (no raw key display)',
  /never (be )?displayed|presence-only|never shown/i.test(html));
for (const phrase of [
  'human review', 'does not', 'RED_RESTRICTED', 'KILL'
]) check('wizard/safety copy references "' + phrase + '"',
  new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));
// must NOT claim compliance/certification in the GovCon wizard region.
// Scope to the wizard so legitimate disclaimers elsewhere (e.g. the
// readiness banner's "do not certify content as safe to send") are not
// flagged as positive claims.
const _wizStart = html.indexOf('FIRST-TIME GOVCON SETUP WIZARD');
const _wizEnd = html.indexOf('LEAD DETAIL PANEL');
const _wizRegion = (_wizStart >= 0 && _wizEnd > _wizStart) ? html.slice(_wizStart, _wizEnd) : '';
check('GovCon wizard region present for claim scan', !!_wizRegion);
check('wizard does not claim compliant/certified/safe-to-send/fully-operational',
  !!_wizRegion &&
  !/\bfully operational\b/i.test(_wizRegion) &&
  !/\bsafe to send\b/i.test(_wizRegion) &&
  !/\b(is|are)\s+compliant\b/i.test(_wizRegion) &&
  !/\bcertified\b/i.test(_wizRegion));

// ── 8. Docs present ───────────────────────────────────────────────────
console.log('\n[docs]');
check('manual-qa/govcon-capture-suite.md exists', has('docs/manual-qa/govcon-capture-suite.md'));
check('manual-qa/govcon-release-smoke.md exists', has('docs/manual-qa/govcon-release-smoke.md'));
check('release-notes/govcon-capture-suite-post-merge-qa.md exists',
  has('docs/release-notes/govcon-capture-suite-post-merge-qa.md'));

// ── summary ───────────────────────────────────────────────────────────
console.log('\n── Summary ──');
console.log('  passes:   ' + pass);
console.log('  failures: ' + fail);
if (fail > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS');
