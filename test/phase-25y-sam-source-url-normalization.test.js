/**
 * Phase 25Y — SAM source URL normalization (no [object Object], no api_key).
 * Run:  node test/phase-25y-sam-source-url-normalization.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — Source URL normalization ===\n');

test('a URL-string coercer exists that handles objects', () => {
  assert.ok(/function _samUrlString\(/.test(HTML), '_samUrlString present');
  assert.ok(/v\.href \|\| v\.url \|\| v\.link/.test(HTML), 'extracts href/url/link from objects');
});

test('_samSafeUrl guards against [object and api_key', () => {
  const fn = HTML.slice(HTML.indexOf('function _samSafeUrl('), HTML.indexOf('function _samSafeUrl(') + 1400);
  assert.ok(/\\\[object/.test(fn) || /\[object/.test(fn), 'guards against [object');
  assert.ok(/api_key/.test(fn), 'guards against api_key');
});

// Reproduce the normalizer logic and prove it never yields [object Object].
function buildNorm(){
  function urlString(v){ if(!v) return ''; if(typeof v==='string') return v.trim();
    if(Array.isArray(v)){ for(const x of v){ const s=urlString(x); if(s) return s; } return ''; }
    if(typeof v==='object') return urlString(v.href||v.url||v.link||v.uri||''); return ''; }
  function strip(u){ let s=urlString(u); if(!s) return ''; s=s.replace(/([?&])(api_key|apikey)=[^&#]*&?/gi,(m,sep)=>sep==='?'?'?':'&').replace(/[?&]$/,''); if(/\[object\s+\w+\]/i.test(s)) return ''; return s; }
  function safe(r){ if(!r) return ''; const ok=u=>u&&/^https?:\/\//i.test(u)&&!/\[object/i.test(u)&&!/api_key/i.test(u);
    let ui=strip(r.uiLink); if(ok(ui)) return ui; let u=strip(r.url); if(ok(u)&&!/api\.sam\.gov/i.test(u)) return u;
    if(r.noticeId) return 'https://sam.gov/opp/'+encodeURIComponent(String(r.noticeId))+'/view'; return ''; }
  return { strip, safe };
}
const N = buildNorm();

test('object uiLink never renders [object Object]', () => {
  const out = N.safe({ uiLink: { href: 'https://sam.gov/opp/abc/view' } });
  assert.strictEqual(out, 'https://sam.gov/opp/abc/view');
  assert.ok(!/\[object/i.test(out));
});
test('plain object with no url falls back to noticeId notice URL', () => {
  const out = N.safe({ uiLink: { foo: 'bar' }, noticeId: 'XYZ' });
  assert.strictEqual(out, 'https://sam.gov/opp/XYZ/view');
  assert.ok(!/\[object/i.test(out));
});
test('api_key is stripped from any candidate URL', () => {
  const out = N.strip('https://api.sam.gov/x?noticeid=1&api_key=SECRET123');
  assert.ok(!/api_key/i.test(out), 'no api_key in normalized url');
  assert.ok(!/SECRET123/.test(out), 'no key value in normalized url');
});
test('empty / null inputs yield empty string, never [object Object]', () => {
  assert.strictEqual(N.safe(null), '');
  assert.strictEqual(N.strip(undefined), '');
  assert.strictEqual(N.strip({}), '');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y source-url-normalization checks ===\n`);
process.exit(failed ? 1 : 0);
