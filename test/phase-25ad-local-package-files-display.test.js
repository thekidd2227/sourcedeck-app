/**
 * Phase 25AD — Local package files display cleanly after download.
 *
 * Asserts:
 *   - After a package has been downloaded, the "Attachments listed by
 *     SAM.gov" block is hidden (rendered only when !sm.package).
 *   - Each local file row carries fileName, status, size chip, source
 *     chip, plus View / Extract Text / Include-or-Exclude / Open Local
 *     File controls.
 *   - No `[object Object]` literal appears in the rendered file row
 *     (Phase 25AC item 1 carried forward).
 *   - The View Attachments saved-pursuit action expands the panel and
 *     scrolls to the local package summary; if no package exists it
 *     shows a "download first" toast.
 *
 * Run:  node test/phase-25ad-local-package-files-display.test.js
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

console.log('\n=== Phase 25AD — Local package files display ===\n');

test('SAM.gov listed attachments block is gated behind !sm.package', () => {
  // Phase 25AC introduced the gate; Phase 25AD preserves it so the local
  // package files become the only file listing after download.
  assert.ok(/if \(!sm\.package\) \{\s*\n\s*parts\.push\('<div data-gc-ac-sam-listing="true"/.test(HTML),
    'SAM.gov listed attachments block must be wrapped in `if (!sm.package)`');
});

test('local package file row carries file name, status, size, and source chips', () => {
  // fileName + status chip + new sizeBytes chip + new source chip emitted
  // by renderSourcePanel for each downloaded file.
  assert.ok(/esc\(f\.fileName \|\| 'attachment'\)/.test(HTML),
    'file name chip must come from f.fileName');
  assert.ok(/f\.status === 'downloaded' \? 'var\(--green,#30d158\)' : 'var\(--red,#ef4444\)'/.test(HTML),
    'status chip color must reflect downloaded/failed state');
  assert.ok(/typeof f\.sizeBytes === 'number'/.test(HTML),
    'size chip must be rendered when f.sizeBytes is numeric');
  assert.ok(/if \(f\.source\) parts\.push\('<span style="font-size:9px;color:var\(--muted\)">' \+ esc\(String\(f\.source\)\) \+ '<\/span>'\);/.test(HTML),
    'source chip must be rendered when f.source is set');
});

test('every local file row exposes View, Extract Text, Include/Exclude, Open Local File', () => {
  assert.ok(/onclick="gcABViewAttachment\(/.test(HTML),         'View button missing');
  assert.ok(/onclick="gcABExtractAttachment\(/.test(HTML),      'Extract Text button missing');
  assert.ok(/onclick="gcABToggleAttachmentIncluded\(/.test(HTML), 'Include/Exclude toggle missing');
  assert.ok(/onclick="gcABOpenLocalPackageFolder\(/.test(HTML), 'Open Local File button missing');
});

test('renderer never emits a literal [object Object] in active runtime', () => {
  // Comments that document the urlLabel guard are acceptable; an active
  // template/string that would print the literal is not.
  const lines = HTML.split('\n').map((l, i) => ({ i: i + 1, l }));
  const offenders = lines.filter(({ l }) => {
    if (!/\[object Object\]/.test(l)) return false;
    // Acceptable: comment line documenting the historical bug.
    if (/^\s*\/\//.test(l)) return false;
    // Acceptable: the urlLabel guard string that *blocks* the literal.
    if (/s === '\[object Object\]'/.test(l)) return false;
    return true;
  });
  assert.strictEqual(offenders.length, 0,
    'no literal [object Object] in active renderer (found at: ' +
    offenders.map(o => o.i).join(', ') + ')');
});

test('View Attachments expands the panel and scrolls to local files', () => {
  assert.ok(/window\.gcW25ViewAttachments = async function/.test(HTML),
    'window.gcW25ViewAttachments handler missing');
  assert.ok(/data-gc-saved-action="view-attachments" onclick="gcW25ViewAttachments\(/.test(HTML),
    'View Attachments button must invoke gcW25ViewAttachments');
  assert.ok(/scrollIntoView/.test(HTML),
    'View Attachments handler must scroll to the package summary block');
});

test('View Attachments without a downloaded package surfaces a clear toast', () => {
  assert.ok(/No local package downloaded yet\. Click Download Solicitation Package\./.test(HTML),
    'no-package toast copy must match the documented message');
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD package-display checks ===');
if (failed > 0) process.exit(1);
