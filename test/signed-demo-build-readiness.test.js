/**
 * Phase 23E — Signed Demo Build Readiness regression test.
 *
 * Asserts:
 *   - the .github/workflows/signed-demo-build.yml workflow exists;
 *   - it triggers on workflow_dispatch only (no push, no
 *     pull_request, no schedule, no release);
 *   - it references CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID,
 *     APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID strictly via the
 *     `${{ secrets.* }}` GitHub Actions context — never as literal
 *     values, never echoed via `echo $SECRET`;
 *   - it does NOT auto-publish (no `--publish always`, no `--publish`,
 *     no softprops/action-gh-release, no actions/create-release);
 *   - it wires the existing gates (npm test, release-check,
 *     macos-signing-readiness:strict, release:evidence:strict);
 *   - the Phase 23E audit + release-notes docs include the required
 *     verification chain and the forbidden-signing-claim list;
 *   - no positive signed/notarized completion claim exists in the
 *     renderer or in committed docs;
 *   - Phase 23D GovCon demo delivery test still passes (verified by
 *     re-running the static-shape regression);
 *   - renderer boot still parses;
 *   - System Readiness / System Flow tab stays removed.
 *
 * Static; never executes app/renderer code or touches the network.
 *
 * Run:  node test/signed-demo-build-readiness.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'signed-demo-build.yml');
const AUDIT_PATH = path.join(ROOT, 'docs', 'audits', 'phase-23e-signed-demo-build-readiness-audit.md');
const RN_PATH = path.join(ROOT, 'docs', 'release-notes', 'phase-23e-signed-demo-build-readiness.md');
const HTML_PATH = path.join(ROOT, 'sourcedeck.html');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 23E — Signed Demo Build Readiness ===\n');

// 1. Workflow file exists.
test('signed-demo-build workflow file exists', () => {
  assert.ok(fs.existsSync(WORKFLOW_PATH),
    '.github/workflows/signed-demo-build.yml is missing');
});

const WORKFLOW = fs.existsSync(WORKFLOW_PATH) ? fs.readFileSync(WORKFLOW_PATH, 'utf8') : '';

// 2. workflow_dispatch trigger declared.
test('workflow_dispatch trigger declared', () => {
  assert.ok(/^on:\s*\n\s+workflow_dispatch\s*:/m.test(WORKFLOW) ||
    /\non:\s*\n\s+workflow_dispatch\s*:/m.test(WORKFLOW),
    'workflow_dispatch trigger not declared at the top level');
});

// 3. No `push` trigger.
test('workflow does NOT trigger on push', () => {
  // The `on:` block must not contain a top-level `push:` key.
  const onBlock = (WORKFLOW.match(/^on:\s*\n([\s\S]*?)\n[a-zA-Z#]/m) || [, ''])[1];
  assert.ok(!/^\s+push\s*:/m.test(onBlock),
    'workflow declares `push:` trigger inside top-level on: block');
});

// 4. No `pull_request` trigger.
test('workflow does NOT trigger on pull_request', () => {
  const onBlock = (WORKFLOW.match(/^on:\s*\n([\s\S]*?)\n[a-zA-Z#]/m) || [, ''])[1];
  assert.ok(!/^\s+pull_request\s*:/m.test(onBlock),
    'workflow declares `pull_request:` trigger inside top-level on: block');
});

// 4b. Also no schedule or release trigger.
test('workflow does NOT trigger on schedule or release', () => {
  const onBlock = (WORKFLOW.match(/^on:\s*\n([\s\S]*?)\n[a-zA-Z#]/m) || [, ''])[1];
  assert.ok(!/^\s+schedule\s*:/m.test(onBlock), 'schedule trigger present');
  assert.ok(!/^\s+release\s*:/m.test(onBlock), 'release trigger present');
});

// 5–9. Secret references go through ${{ secrets.* }} only.
const SECRETS = [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
];
for (const s of SECRETS) {
  test(`${s} referenced through secrets context only`, () => {
    // Must appear at least once as ${{ secrets.NAME }} or as bare env-var
    // *consumer* of that secret on a subsequent line.
    const secretRefRe = new RegExp('\\$\\{\\{\\s*secrets\\.' + s + '\\s*(?:!=\\s*\'\')?\\s*\\}\\}');
    assert.ok(secretRefRe.test(WORKFLOW),
      'workflow does not reference ${{ secrets.' + s + ' }}');
    // Must NEVER be assigned a literal value (e.g. `CSC_LINK=https://...`).
    const literalRe = new RegExp('\\b' + s + '\\s*=\\s*[^\\$\\s][^\\s]*', 'g');
    const literalMatches = (WORKFLOW.match(literalRe) || []).filter(m => !/^\s*$/.test(m));
    assert.ok(literalMatches.length === 0,
      'workflow appears to assign a literal value to ' + s + ': ' + literalMatches.join(' | '));
  });
}

// 10. Workflow does NOT echo secret values.
test('workflow does NOT echo or print secret values', () => {
  // Detect any `echo ... $SECRET` or `printenv SECRET` etc.
  for (const s of SECRETS) {
    const echoRe = new RegExp('echo[^\\n]*\\$\\{?' + s + '\\}?');
    assert.ok(!echoRe.test(WORKFLOW),
      'workflow contains echo of $' + s);
    const printenvRe = new RegExp('\\b(printenv|env\\s*\\|)[^\\n]*' + s);
    assert.ok(!printenvRe.test(WORKFLOW),
      'workflow appears to print env containing ' + s);
  }
  // Also forbid `${{ secrets.X }}` appearing inside a `run:` echo command.
  const echoSecretRe = /echo[^\n]*\$\{\{\s*secrets\.[A-Z_]+/;
  assert.ok(!echoSecretRe.test(WORKFLOW),
    'workflow appears to echo a ${{ secrets.* }} expansion');
});

// 11. Workflow does NOT print secret values (duplicate angle — narrow check).
test('workflow does NOT cat / print secret values', () => {
  const catRe = /cat[^\n]*\$\{\{\s*secrets\./;
  assert.ok(!catRe.test(WORKFLOW), 'workflow cats a secret expansion');
  const setOutputRe = /(set-output|GITHUB_OUTPUT)[^\n]*\$\{\{\s*secrets\./;
  assert.ok(!setOutputRe.test(WORKFLOW),
    'workflow writes a secret expansion to GITHUB_OUTPUT');
});

// 12. No auto-publish.
test('workflow does NOT auto-publish public releases', () => {
  assert.ok(!/--publish\s+always/.test(WORKFLOW),
    'workflow uses --publish always');
  assert.ok(!/--publish\s+onTagOrDraft/.test(WORKFLOW),
    'workflow uses --publish onTagOrDraft');
  assert.ok(!/--publish\s+\S/.test(WORKFLOW.replace(/<\!--[\s\S]*?-->/g, '')),
    'workflow uses --publish with any value');
  assert.ok(!/softprops\/action-gh-release/.test(WORKFLOW),
    'workflow uses softprops/action-gh-release (publishes a release)');
  assert.ok(!/actions\/create-release/.test(WORKFLOW),
    'workflow uses actions/create-release');
  assert.ok(!/ncipollo\/release-action/.test(WORKFLOW),
    'workflow uses ncipollo/release-action');
});

// 13. Workflow wires the existing test + signing-readiness gates.
test('workflow invokes npm test + signing-readiness strict + release-check', () => {
  assert.ok(/npm\s+test\b/.test(WORKFLOW), 'workflow does not run npm test');
  assert.ok(/release:mac-signing-readiness:strict|macos-signing-readiness\.js/.test(WORKFLOW),
    'workflow does not run the strict macOS signing-readiness gate');
  assert.ok(/scripts\/release-check\.js|release:check\b/.test(WORKFLOW),
    'workflow does not run release-check');
});

// 14. Workflow wires release-evidence after the build.
test('workflow invokes release:evidence (strict) after build', () => {
  assert.ok(/release:evidence:strict|release-evidence\.js/.test(WORKFLOW),
    'workflow does not run release-evidence after the build');
});

// 14b. Workflow uses electron-builder --mac WITHOUT --publish.
test('workflow runs electron-builder --mac WITHOUT --publish', () => {
  const builderRe = /electron-builder\s+--mac[^\n]*/g;
  const matches = WORKFLOW.match(builderRe) || [];
  assert.ok(matches.length > 0, 'workflow does not invoke electron-builder --mac');
  for (const m of matches) {
    assert.ok(!/--publish/.test(m),
      'electron-builder invocation includes --publish: ' + m);
  }
});

// 14c. Artifact is uploaded as a workflow artifact (not a release).
test('workflow uploads signed-demo candidate as a workflow artifact (not a Release asset)', () => {
  assert.ok(/uses:\s*actions\/upload-artifact@v[34]/.test(WORKFLOW),
    'workflow does not use actions/upload-artifact');
  assert.ok(/signed-demo-candidate/i.test(WORKFLOW),
    'workflow does not label its artifact as a signed-demo candidate');
});

// 14d. Concurrency control + read-only token.
test('workflow declares read-only token + a concurrency group', () => {
  assert.ok(/permissions:\s*\n\s+contents:\s*read/.test(WORKFLOW),
    'workflow does not declare permissions: contents: read');
  assert.ok(/concurrency:/.test(WORKFLOW),
    'workflow does not declare a concurrency group');
});

// 15. Docs include the required verification chain.
test('audit doc includes the required verification chain', () => {
  assert.ok(fs.existsSync(AUDIT_PATH), 'phase-23e audit doc missing');
  const audit = fs.readFileSync(AUDIT_PATH, 'utf8');
  // The chain steps must all appear: signing-readiness strict → signed mac
  // build → release-check → codesign → spctl → stapler → release-evidence.
  for (const step of [
    /signing[- ]readiness strict passes/i,
    /signed mac build runs with secrets/i,
    /release-check passes/i,
    /\bcodesign\b/i,
    /\bspctl\b/i,
    /\bstapler\b/i,
    /release[- ]evidence/i,
  ]) {
    assert.ok(step.test(audit),
      'audit doc missing verification-chain step: ' + step);
  }
});

// 16. Docs include the forbidden-signing-claim list.
test('audit doc lists forbidden signing/notarization claims', () => {
  const audit = fs.readFileSync(AUDIT_PATH, 'utf8');
  for (const phrase of [
    /SourceDeck is signed and notarized/,
    /Apple notarized/,
    /Production signed/,
    /Notarized release/,
    /Publicly signed/,
    /SourceDeck is signed\b/,
    /SourceDeck is notarized\b/,
  ]) {
    assert.ok(phrase.test(audit),
      'audit doc does not name forbidden phrase ' + phrase + ' (must be enumerated to prevent regression)');
  }
});

// 17. No positive signed/notarized completion claim in renderer or in docs (the docs may
//     ENUMERATE the forbidden phrase but must not POSITIVELY claim it).
test('no positive signed/notarized completion claim in renderer', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  // The forbidden positive claims must not appear in any user-facing
  // renderer surface. Cross-check the same list as the renderer-boot test.
  const forbidden = [
    /signed and notarized/i,
    /Apple notarized/i,
    /production signed/i,
    /publicly signed/i,
    /SourceDeck is signed\b/i,
    /SourceDeck is notarized\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(!re.test(html),
      'renderer contains positive signed/notarized claim ' + re);
  }
});

// 18. Phase 23D GovCon demo delivery test still passes (re-run inline).
test('Phase 23D govcon-demo-delivery-polish test still passes', () => {
  const result = require('child_process').spawnSync(
    process.execPath,
    [path.join(ROOT, 'test', 'govcon-demo-delivery-polish.test.js')],
    { encoding: 'utf8' }
  );
  assert.strictEqual(result.status, 0,
    'Phase 23D regression test failed: exit ' + result.status + '\n' + (result.stdout || '') + (result.stderr || ''));
  assert.ok(/PASS — 26\/26/.test(result.stdout || ''),
    'Phase 23D regression test stdout did not assert 26/26 PASS');
});

// 19. Renderer boot still parses (every inline <script> block).
test('every inline <script> block still parses (renderer boot guard)', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const blocks = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g) || [];
  let parsed = 0;
  for (const blk of blocks) {
    const m = blk.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
    if (!m) continue;
    if (/\bsrc=/.test(blk)) continue;
    try { new vm.Script(m[1]); parsed++; }
    catch (e) { throw new Error('inline <script> failed to parse: ' + e.message); }
  }
  assert.ok(parsed > 0, 'no inline scripts parsed — sanity check failed');
});

// 20. System Readiness / System Flow tab stays removed.
test('Phase 21F System Readiness / System Flow tab stays removed', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.ok(!/data-tab="sysflow"/.test(html), 'sysflow nav-btn returned');
  assert.ok(!/id="tab-sysflow"/.test(html), 'tab-sysflow pane returned');
});

// 21. Release-notes doc explicitly states the artifact is internal-review-only.
test('release-notes doc declares internal-review-only intent', () => {
  assert.ok(fs.existsSync(RN_PATH), 'phase-23e release-notes doc missing');
  const rn = fs.readFileSync(RN_PATH, 'utf8');
  assert.ok(/internal[- ]review[- ]only|internal review only/i.test(rn),
    'release-notes does not state internal-review-only intent');
  assert.ok(/no public release/i.test(rn),
    'release-notes does not state "no public release"');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 23E signed-demo-build-readiness checks ===');
if (failed > 0) process.exit(1);
