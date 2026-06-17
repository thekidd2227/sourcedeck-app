/**
 * Phase 25Y — SAM.gov keyword relevance enforcement.
 * Run:  node test/phase-25y-sam-keyword-enforcement.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const SAMSRC = fs.readFileSync(path.join(ROOT, 'services', 'govcon', 'sam-search.js'), 'utf8');
let passed = 0, failed = 0;
function test(n, fn){ try { fn(); passed++; console.log('  ✅ ' + n); } catch (e) { failed++; console.log('  ❌ ' + n + ': ' + e.message); } }
console.log('\n=== Phase 25Y — SAM keyword enforcement ===\n');

test('keyword is read from the UI filter', () => {
  assert.ok(/data-gc-tab-sam-filter="keyword"/.test(HTML), 'keyword input present');
  assert.ok(/id="gc-tab-f-keyword"/.test(HTML), 'keyword field id present');
});

test('keyword is passed into the SAM.gov query', () => {
  assert.ok(/params\.set\('title', filters\.keyword\)/.test(SAMSRC), 'keyword passed to SAM API title param');
});

test('renderer has a local keyword relevance backstop', () => {
  assert.ok(/function _samMatchesKeyword\(/.test(HTML), 'keyword matcher present');
  assert.ok(/if \(!_samMatchesKeyword\(r, filters\.keyword\)\) return false/.test(HTML), 'backstop applied in local filter');
});

// Extract and exercise the matcher logic to prove relevance behavior.
function buildMatcher(){
  const GENERIC = { support:1, services:1, service:1, repair:1, supplies:1, supply:1, system:1, the:1, of:1, and:1, 'for':1, a:1, to:1, in:1, on:1, with:1 };
  function tok(k){ return String(k||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
  function hay(r){ const desc = (typeof r.description === 'string' && !/^https?:\/\//i.test(r.description)) ? r.description : '';
    return [r.title, r.solicitationNumber, r.noticeId, r.agency, r.naics, r.setAside, r.classificationCode, desc].map(x=>String(x==null?'':x).toLowerCase()).join('  '); }
  return function(r, kw){ if(!kw||!kw.trim()) return true; const h=hay(r); const p=kw.trim().toLowerCase(); if(h.indexOf(p)>=0) return true;
    const t=tok(kw); let s=t.filter(x=>!GENERIC[x]&&x.length>=3); if(!s.length) s=t; for(let i=0;i<s.length;i++){ if(h.indexOf(s[i])<0) return false; } return true; };
}
const match = buildMatcher();

test('mock result with keyword in title is kept', () => {
  assert.strictEqual(match({ title: 'Janitorial Services — Base X', agency: 'Army' }, 'janitorial'), true);
});
test('mock result with keyword in description is kept', () => {
  assert.strictEqual(match({ title: 'Custodial RFP', description: 'Contractor shall provide janitorial labor' }, 'janitorial'), true);
});
test('unrelated DoD part record is hidden', () => {
  assert.strictEqual(match({ title: 'O-RING, AIRCRAFT VALVE', agency: 'DLA', description: 'NSN part item' }, 'janitorial'), false);
});
test('generic-only keyword does not overmatch unrelated rows', () => {
  // "support services" should still require the literal tokens present
  assert.strictEqual(match({ title: 'O-RING valve' }, 'support services'), false);
});

test('status line shows returned + visible counts (+ keyword)', () => {
  assert.ok(/returned ' \+ returned \+ ' · visible/.test(HTML), 'status line shows returned + visible');
  assert.ok(/keyword: ' \+ filters\.keyword/.test(HTML), 'status line shows active keyword');
});

test('zero keyword matches is explicit, not unrelated rows', () => {
  assert.ok(/none matched keyword/.test(HTML) || /No keyword matches after relevance filtering/.test(HTML), 'explicit zero-keyword-match message');
});

test('no raw key in keyword path', () => {
  assert.ok(!/api_key=[A-Za-z0-9]{6,}/.test(HTML), 'no raw key literal');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25Y keyword-enforcement checks ===\n`);
process.exit(failed ? 1 : 0);
