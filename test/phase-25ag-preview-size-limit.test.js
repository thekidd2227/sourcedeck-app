/**
 * Phase 25AG — Preview size limit (renderer freeze repair).
 *
 * Text preview must be hard-capped so a multi-MB file can never be dumped
 * into the renderer DOM. Asserts the guard truncation logic and the
 * renderer's handling of the truncated flag.
 *
 * Run:  node test/phase-25ag-preview-size-limit.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const guard = require(path.join(ROOT, 'services/govcon/solicitation-preview-guard.js'));
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25AG — Preview size limit ===\n');

test('cap is 250 KB or less', () => {
  assert.ok(guard.PREVIEW_TEXT_LIMIT_BYTES <= 250 * 1024,
    'PREVIEW_TEXT_LIMIT_BYTES must be <= 250 KB, got ' + guard.PREVIEW_TEXT_LIMIT_BYTES);
});

test('small text is not truncated', () => {
  const r = guard.truncateText('hello world');
  assert.strictEqual(r.truncated, false);
  assert.strictEqual(r.text, 'hello world');
});

test('oversized text is truncated to the cap with a flag', () => {
  const big = 'A'.repeat(2 * 1024 * 1024); // 2 MB
  const r = guard.truncateText(big);
  assert.strictEqual(r.truncated, true, 'truncated flag must be set');
  assert.ok(Buffer.byteLength(r.text, 'utf8') <= guard.PREVIEW_TEXT_LIMIT_BYTES,
    'returned text must not exceed the cap, got ' + Buffer.byteLength(r.text, 'utf8'));
  assert.ok(r.text.length < big.length, 'returned text must be shorter than input');
});

test('multi-MB body never reaches the renderer whole (cap << input)', () => {
  const big = 'B'.repeat(5 * 1024 * 1024); // 5 MB
  const r = guard.truncateText(big);
  // 5 MB in, at most 250 KB out.
  assert.ok(Buffer.byteLength(r.text, 'utf8') <= 256 * 1024);
});

test('main.js truncates and sets a truncated flag + limitation message', () => {
  assert.ok(/truncateText/.test(MAIN), 'main.js must call truncateText for text previews');
  assert.ok(/truncated:\s*capped\.truncated/.test(MAIN), 'main.js must pass through the truncated flag');
  assert.ok(/TRUNCATED_MESSAGE/.test(MAIN), 'main.js must surface a truncation message');
});

test('main.js refuses to read files larger than the hard read ceiling', () => {
  assert.ok(/MAX_READ_BYTES/.test(MAIN), 'main.js must guard against oversized reads');
});

test('renderer shows a truncation note when preview.truncated is set', () => {
  assert.ok(/preview\.truncated/.test(HTML),
    'renderer must check preview.truncated');
  assert.ok(/Preview truncated for performance/.test(HTML) || /preview\.limitation/.test(HTML),
    'renderer must surface a truncation message');
});

console.log('\n' + (failed ? '❌ ' + failed + ' failed, ' : '✅ ') + passed + ' passed\n');
process.exit(failed ? 1 : 0);
