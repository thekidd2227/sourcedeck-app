#!/usr/bin/env node
/**
 * Phase 13 — release-candidate gate summary.
 *
 * Confirms the Phase 13 artifacts exist and that no forbidden release
 * copy leaked into the RC docs/evidence. Does NOT re-run the full test
 * suite (run `npm test` / `npm run govcon:outreach-os:audit` separately);
 * it summarizes RC readiness inputs. Exits non-zero on any failure.
 *
 * Run: node scripts/phase-13-rc-check.mjs  (npm run phase13:rc-check)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };
const check = (n, c) => c ? ok(n) : bad(n);
const has = (p) => { try { return fs.existsSync(path.join(ROOT, p)); } catch { return false; } };
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };

console.log('── Phase 13 RC check ──');

// Required scripts / gates present
console.log('\n[automated gate inputs]');
const pkg = JSON.parse(read('package.json') || '{}');
const scripts = pkg.scripts || {};
check('npm test script present', typeof scripts.test === 'string' && scripts.test.length > 0);
check('govcon:smoke script present', !!scripts['govcon:smoke'] && has('scripts/govcon-release-smoke.mjs'));
check('govcon:outreach-os:audit script present', !!scripts['govcon:outreach-os:audit'] && has('scripts/govcon-outreach-os-audit.mjs'));
check('i18n:audit script present', !!scripts['i18n:audit']);
check('release-check present', has('scripts/release-check.js'));

// Phase 13 artifacts
console.log('\n[phase 13 artifacts]');
check('manual QA checklist present', has('docs/manual-qa/govcon-outreach-os-release-smoke.md'));
check('release-evidence folder present', has('docs/release-evidence/phase-13-operator-smoke'));
check('evidence README present', has('docs/release-evidence/phase-13-operator-smoke/README.md'));
check('functional smoke output present', has('docs/release-evidence/phase-13-operator-smoke/functional-smoke-output.txt'));
check('release-candidate report present', has('docs/release-notes/phase-13-release-candidate.md'));

// Functional smoke recorded a PASS
console.log('\n[functional smoke evidence]');
const smokeOut = read('docs/release-evidence/phase-13-operator-smoke/functional-smoke-output.txt');
check('functional smoke recorded PASS', /FUNCTIONAL SMOKE PASS/.test(smokeOut) && !/FUNCTIONAL SMOKE FAIL/.test(smokeOut));

// No forbidden release copy in RC docs/evidence (positive claims only)
console.log('\n[forbidden release copy scan]');
const rcDocs = [
  'docs/release-notes/phase-13-release-candidate.md',
  'docs/manual-qa/govcon-outreach-os-release-smoke.md',
  'docs/release-evidence/phase-13-operator-smoke/README.md'
].map(read).join('\n');
const NEG = /\b(no|not|never|without|nothing|cannot|can'?t|do(?:es)?\s+not|don'?t|must not|forbidden|absent|disclaim)\b/;
function positiveClaim(corpus, phraseRe) {
  let m; phraseRe.lastIndex = 0;
  while ((m = phraseRe.exec(corpus)) !== null) {
    // Examine the full line containing the match — these are checklist /
    // disclaimer lines ("Confirm no copy says ... certified ...") where
    // the negation can sit anywhere on the line.
    // Include the previous line too (markdown wraps negated checklist
    // bullets, e.g. "nothing says ...\n  \"certified\", ...").
    const curStart = corpus.lastIndexOf('\n', m.index) + 1;
    const prevStart = corpus.lastIndexOf('\n', curStart - 2) + 1;
    let lineEnd = corpus.indexOf('\n', m.index);
    if (lineEnd < 0) lineEnd = corpus.length;
    const line = corpus.slice(prevStart, lineEnd).toLowerCase();
    if (NEG.test(line)) continue;
    return m[0] + '  ::  ' + line.trim().slice(0, 80);
  }
  return null;
}
for (const [label, re] of [
  ['safe to send', /safe to send/gi],
  ['compliant', /\b(is|are|fully)\s+compliant\b/gi],
  ['certified', /\bcertified\b/gi],
  ['fully operational', /fully operational/gi],
  ['auto-send enabled', /auto-?send\s+enabled/gi]
]) {
  const hit = positiveClaim(rcDocs, re);
  check('no positive "' + label + '" claim in RC docs', !hit);
}

console.log('\n── Summary ──');
console.log('  passes:   ' + pass);
console.log('  failures: ' + fail);
if (fail > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS');
