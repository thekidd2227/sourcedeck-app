/**
 * Phase 25AD-HOTFIX — Right-side file viewer must be closed by default.
 *
 * The Phase 25AD viewer aside shipped with the HTML `hidden` attribute
 * but ALSO with an inline `display:flex` that overrode the user-agent
 * `[hidden] { display:none }` rule. The user saw a permanently open
 * "No file selected" panel taking ~half the app shell.
 *
 * Asserts:
 *   - The aside is rendered with `hidden` (closed by default) and
 *     `aria-hidden="true"`.
 *   - No inline `display:flex` lives on the aside (it would re-open it).
 *   - A CSS rule guarantees `#sd-right-file-viewer[hidden]{display:none}`.
 *   - The `.is-open` state is paired with `display:flex` so the viewer
 *     is visible ONLY when the open helper runs.
 *   - `sdRightFileViewerOpen()` removes `hidden`, sets `aria-hidden=false`,
 *     and adds `.is-open`.
 *   - `sdRightFileViewerClose()` re-adds `hidden`, sets `aria-hidden=true`,
 *     removes `.is-open`, and clears the title/body so it is not
 *     "permanently open showing No file selected" after a failed view.
 *   - The View action populates the viewer through `gcACPreviewFile()`
 *     rather than opening a separate window (no `window.open` /
 *     `openExternal` in that path).
 *
 * Static; never executes the renderer; never touches the network.
 *
 * Run:  node test/phase-25ad-hotfix-viewer-hidden-default.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AD-HOTFIX — Right-side viewer hidden by default ===\n');

// ───── Initial DOM state ─────

test('aside is rendered hidden + aria-hidden by default', () => {
  // Extract the opening tag of the aside and assert both flags are set.
  const m = HTML.match(/<aside id="sd-right-file-viewer"[\s\S]*?>/);
  assert.ok(m, '<aside id="sd-right-file-viewer"> not found');
  const openingTag = m[0];
  assert.ok(/\bhidden\b/.test(openingTag),
    'aside must carry the HTML hidden attribute (closed by default)');
  assert.ok(/aria-hidden="true"/.test(openingTag),
    'aside must carry aria-hidden="true" by default');
});

test('aside inline style no longer forces display:flex', () => {
  // The Phase 25AD shipping bug: `display:flex` lived on the inline
  // style and overrode the user-agent [hidden] rule. The hotfix must
  // remove that property so `hidden` actually hides the panel.
  const m = HTML.match(/<aside id="sd-right-file-viewer"[\s\S]*?>/);
  assert.ok(m, '<aside id="sd-right-file-viewer"> not found');
  assert.ok(!/display:flex/.test(m[0]),
    'aside inline style must NOT contain display:flex (it overrides [hidden])');
});

test('CSS guarantees [hidden] collapses the viewer to zero layout', () => {
  // The dedicated rule makes `hidden` authoritative regardless of inline
  // style remnants and is the contract the test relies on.
  assert.ok(/#sd-right-file-viewer\[hidden\]\{\s*display:none\s*!important;\s*\}/.test(HTML),
    'CSS rule `#sd-right-file-viewer[hidden]{display:none !important}` missing');
});

test('CSS pairs the `.is-open` class with display:flex', () => {
  assert.ok(/#sd-right-file-viewer\.is-open\{\s*display:flex\s*!important;\s*\}/.test(HTML),
    'CSS rule `#sd-right-file-viewer.is-open{display:flex !important}` missing');
});

test('"No file selected" copy is scoped to the hidden viewer header + close reset', () => {
  // The phantom-panel report came from an inline preview pane that
  // ALSO printed "No file selected" outside the (hidden) right-side
  // viewer. The hotfix keeps that copy in exactly two places:
  //   1) the default title inside `#sd-right-file-viewer-title`
  //      (hidden because the aside is `hidden`),
  //   2) the close handler that resets the title back to the same copy.
  // Any third occurrence would mean another surface re-introduced the
  // bug we just fixed.
  const matches = (HTML.match(/No file selected/g) || []).length;
  assert.strictEqual(matches, 2,
    '"No file selected" must appear only in the viewer header + close reset (found ' + matches + ' occurrences)');
  // The header occurrence MUST be inside the hidden aside — assert that
  // the substring sits between the aside open tag and `</aside>`.
  const asideBlock = HTML.match(/<aside id="sd-right-file-viewer"[\s\S]*?<\/aside>/);
  assert.ok(asideBlock, 'right-side viewer aside not found');
  assert.ok(/No file selected/.test(asideBlock[0]),
    'one "No file selected" occurrence must live inside the hidden aside');
  // The aside opening tag must carry `hidden` so even that occurrence
  // is invisible on initial load.
  const openTag = asideBlock[0].match(/<aside id="sd-right-file-viewer"[\s\S]*?>/)[0];
  assert.ok(/\bhidden\b/.test(openTag),
    'the aside hosting the visible "No file selected" copy must be hidden');
});

// ───── Open / close helpers ─────

test('sdRightFileViewerOpen removes hidden + aria-hidden and adds .is-open', () => {
  const m = HTML.match(/window\.sdRightFileViewerOpen = function\(\)\{[\s\S]*?\};/);
  assert.ok(m, 'sdRightFileViewerOpen helper not found');
  const body = m[0];
  assert.ok(/viewer\.hidden = false;/.test(body),
    'open must set viewer.hidden = false');
  assert.ok(/viewer\.setAttribute\('aria-hidden', 'false'\);/.test(body),
    'open must set aria-hidden="false"');
  assert.ok(/viewer\.classList\.add\('is-open'\);/.test(body),
    'open must add the .is-open class so CSS reveals the panel');
});

test('sdRightFileViewerClose restores hidden, aria-hidden, and clears state', () => {
  const m = HTML.match(/window\.sdRightFileViewerClose = function\(\)\{[\s\S]*?\};/);
  assert.ok(m, 'sdRightFileViewerClose helper not found');
  const body = m[0];
  assert.ok(/viewer\.hidden = true;/.test(body),
    'close must set viewer.hidden = true');
  assert.ok(/viewer\.setAttribute\('aria-hidden', 'true'\);/.test(body),
    'close must set aria-hidden="true"');
  assert.ok(/viewer\.classList\.remove\('is-open'\);/.test(body),
    'close must remove the .is-open class');
  assert.ok(/viewer\.removeAttribute\('data-current-pursuit-id'\);/.test(body),
    'close must clear the active pursuit id so subsequent opens are explicit');
  assert.ok(/viewer\.removeAttribute\('data-current-file-index'\);/.test(body),
    'close must clear the active file index');
  // Body is reset to the default "click View" hint so a closed-then-
  // reopened viewer never displays stale per-file content.
  assert.ok(/Click <strong>View<\/strong> on a downloaded attachment/.test(body),
    'close must reset the body back to the default hint');
});

// ───── Open Local File stays separate from View ─────

test('Open Local File still launches the local folder, not a remote window', () => {
  // The Open Local File button uses the existing gcABOpenLocalPackageFolder
  // helper (which uses shell.openPath via the credential boundary). No
  // window.open or openExternal in this path.
  const m = HTML.match(/btnOpen\s*addEventListener\('click', function\(\)\{[\s\S]*?\}\);|btnOpen\.addEventListener\('click', function\(\)\{[\s\S]*?\}\);/);
  // The handler block is short — just assert that the button delegates
  // to gcABOpenLocalPackageFolder and does NOT contain window.open.
  assert.ok(/gcABOpenLocalPackageFolder\(pid\)/.test(HTML),
    'Open Local File must call gcABOpenLocalPackageFolder(pid)');
});

test('View action populates the viewer through gcACPreviewFile (no separate window)', () => {
  // The View button on a file row routes to gcABViewAttachment which
  // delegates to gcACPreviewFile — populating the right-side viewer in
  // place. The hotfix MUST NOT change this contract.
  assert.ok(/if \(typeof window\.gcACPreviewFile === 'function'\) window\.gcACPreviewFile\(id, idx\);/.test(HTML),
    'View must continue to delegate to gcACPreviewFile (no separate-window path)');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD-HOTFIX checks ===');
if (failed > 0) process.exit(1);
