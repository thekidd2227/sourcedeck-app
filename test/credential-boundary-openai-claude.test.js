#!/usr/bin/env node
'use strict';

// credential-boundary-openai-claude.test.js
//
// Dedicated enforcement tests for Phase 15A: OpenAI and Anthropic/Claude
// credential boundary. Proves that both providers are fully migrated to
// the secure safeStorage IPC path and that no raw key ever reaches the
// renderer, localStorage, or is echoed in any output.
//
// Runs as part of: npm test
// Manual run:      node test/credential-boundary-openai-claude.test.js

const fs     = require('fs');
const path   = require('path');
const assert = require('assert');

const HTML_PATH    = path.resolve(__dirname, '..', 'sourcedeck.html');
const PRELOAD_PATH = path.resolve(__dirname, '..', 'preload.js');
const MAIN_PATH    = path.resolve(__dirname, '..', 'main.js');
const OPENAI_SVC   = path.resolve(__dirname, '..', 'services', 'ai', 'providers', 'openai.js');
const ANTHROPIC_SVC= path.resolve(__dirname, '..', 'services', 'ai', 'providers', 'anthropic.js');
const CREDS_SVC    = path.resolve(__dirname, '..', 'services', 'settings', 'credentials.js');

const html     = fs.readFileSync(HTML_PATH, 'utf8');
const preload  = fs.readFileSync(PRELOAD_PATH, 'utf8');
const mainSrc  = fs.readFileSync(MAIN_PATH, 'utf8');
const openaiSrc= fs.readFileSync(OPENAI_SVC, 'utf8');
const anthropicSrc = fs.readFileSync(ANTHROPIC_SVC, 'utf8');
const credSrc  = fs.readFileSync(CREDS_SVC, 'utf8');

let passed = 0, failed = 0;

function check(cond, msg) {
  if (cond) { console.log('  ✅ ' + msg); passed++; }
  else       { console.log('  ❌ ' + msg); failed++; }
}

async function asyncCheck(fn, msg) {
  try {
    await fn();
    console.log('  ✅ ' + msg); passed++;
  } catch (e) {
    console.log('  ❌ ' + msg + ': ' + (e && e.message));
    failed++;
  }
}

console.log('=== Phase 15A — OpenAI & Anthropic credential boundary ===\n');

// ── SECTION A: Renderer localStorage — no raw key storage ──
console.log('── A: Renderer localStorage (no raw key write/read) ──');

check(
  !/localStorage\.setItem\s*\(\s*['"]lcc_OPENAI_KEY/.test(html),
  'sourcedeck.html: no localStorage.setItem for lcc_OPENAI_KEY'
);
check(
  !/localStorage\.setItem\s*\(\s*['"]lcc_CLAUDE_KEY/.test(html),
  'sourcedeck.html: no localStorage.setItem for lcc_CLAUDE_KEY'
);
check(
  !/localStorage\.setItem\s*\(\s*['"]lcc_ANTHROPIC_KEY/.test(html),
  'sourcedeck.html: no localStorage.setItem for lcc_ANTHROPIC_KEY'
);
// Legacy migration reads are permitted (cleanup path), but must immediately remove
check(
  /lcc_OPENAI_KEY.*removeItem|removeItem.*lcc_OPENAI_KEY/s.test(html),
  'sourcedeck.html: legacy lcc_OPENAI_KEY migration removes the entry from localStorage'
);
check(
  /lcc_CLAUDE_KEY.*removeItem|removeItem.*lcc_CLAUDE_KEY/s.test(html),
  'sourcedeck.html: legacy lcc_CLAUDE_KEY migration removes the entry from localStorage'
);

// ── SECTION B: Renderer — no direct API calls or header builds ──
console.log('\n── B: Renderer — no direct API calls or auth header builds ──');

const openaiDirectFetches = (html.match(/fetch\s*\(\s*['"]https:\/\/api\.openai\.com/g) || []).length;
check(openaiDirectFetches === 0,
  'sourcedeck.html: zero direct fetch() to api.openai.com (' + openaiDirectFetches + ' found)'
);
const anthropicDirectFetches = (html.match(/fetch\s*\(\s*['"]https:\/\/api\.anthropic\.com/g) || []).length;
check(anthropicDirectFetches === 0,
  'sourcedeck.html: zero direct fetch() to api.anthropic.com (' + anthropicDirectFetches + ' found)'
);
check(
  !/Authorization.*Bearer.*OPENAI_KEY/i.test(html),
  'sourcedeck.html: no Bearer header built with OPENAI_KEY'
);
check(
  !/x-api-key.*CLAUDE_KEY/i.test(html),
  'sourcedeck.html: no x-api-key header built with CLAUDE_KEY'
);
check(
  !/anthropic-dangerous-direct-browser-access/.test(html),
  'sourcedeck.html: no anthropic-dangerous-direct-browser-access header'
);
check(
  !/window\.OPENAI_KEY\s*=\s*keys\.OPENAI_KEY/.test(html),
  'sourcedeck.html: window.OPENAI_KEY never assigned raw form value'
);
check(
  !/window\.CLAUDE_KEY\s*=\s*keys\.CLAUDE_KEY/.test(html),
  'sourcedeck.html: window.CLAUDE_KEY never assigned raw form value'
);

// ── SECTION C: Preload — no raw key getter exposed ──
console.log('\n── C: Preload — presence-only credential surface ──');

check(
  !/credentials\.get\s*[=:]/.test(preload),
  'preload.js: credentials.get() not exposed to renderer'
);
check(
  /status\s*:\s*\(\)/.test(preload) &&
  /set\s*:\s*\(service/.test(preload) &&
  /remove\s*:\s*\(service/.test(preload),
  'preload.js: credentials surface has status/set/remove (presence-only)'
);
check(
  !/getKey.*openai|getKey.*claude|getKey.*anthropic/i.test(preload),
  'preload.js: no getKey() shortcut for OpenAI/Claude/Anthropic'
);

// ── SECTION D: Provider services — keys in main process only ──
console.log('\n── D: Provider services — credentials.get() used in main process only ──');

check(
  /credentials\.get\s*\(\s*['"]openai['"]/.test(openaiSrc),
  'services/ai/providers/openai.js: reads key via credentials.get("openai")'
);
check(
  /credentials\.get\s*\(\s*['"]anthropic['"]/.test(anthropicSrc),
  'services/ai/providers/anthropic.js: reads key via credentials.get("anthropic")'
);
check(
  /openai.*anthropic|anthropic.*openai/i.test(credSrc),
  'services/settings/credentials.js: both openai and anthropic registered as known services'
);

// ── Async sections wrapped in a single async main ──
(async () => {

// ── SECTION E: Runtime behavior — provider returns no key echo ──
console.log('\n── E: Runtime — providers do not echo credentials in results ──');

{
  const { createOpenaiProvider } = require('../services/ai/providers/openai.js');
  const fakeKey = 'sk-test-openai-sentinel-do-not-echo';
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
  const creds = { get: async (s) => s === 'openai' ? fakeKey : null };
  const provider = createOpenaiProvider({ credentials: creds, fetchFn: fakeFetch });
  const result = await provider.generate({ userMessage: 'ping', maxTokens: 10 });
  const resultStr = JSON.stringify(result);
  check(!resultStr.includes(fakeKey), 'services/ai/providers/openai.js: result does not echo the API key');
}

{
  const { createAnthropicProvider } = require('../services/ai/providers/anthropic.js');
  const fakeKey = 'sk-ant-test-anthropic-sentinel-do-not-echo';
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized', json: async () => ({ error: { message: 'unauthorized' } }) });
  const creds = { get: async (s) => s === 'anthropic' ? fakeKey : null };
  const provider = createAnthropicProvider({ credentials: creds, fetchFn: fakeFetch });
  const result = await provider.generate({ userMessage: 'ping', maxTokens: 10 });
  const resultStr = JSON.stringify(result);
  check(!resultStr.includes(fakeKey), 'services/ai/providers/anthropic.js: result does not echo the API key');
}

// ── SECTION F: Missing-credential graceful denial ──
console.log('\n── F: Missing credential — graceful denial, no crash ──');

{
  const { createOpenaiProvider } = require('../services/ai/providers/openai.js');
  const creds = { get: async () => null };
  const fakeFetch = async () => { throw new Error('should not be called'); };
  const provider = createOpenaiProvider({ credentials: creds, fetchFn: fakeFetch });
  const result = await provider.generate({ userMessage: 'ping' });
  check(result.ok === false && result.error === 'no_credential',
    'openai: missing key returns no_credential without crashing or calling API');
}

{
  const { createAnthropicProvider } = require('../services/ai/providers/anthropic.js');
  const creds = { get: async () => null };
  const fakeFetch = async () => { throw new Error('should not be called'); };
  const provider = createAnthropicProvider({ credentials: creds, fetchFn: fakeFetch });
  const result = await provider.generate({ userMessage: 'ping' });
  check(result.ok === false && result.error === 'no_credential',
    'anthropic: missing key returns no_credential without crashing or calling API');
}

// ── Summary ──
console.log('\n── Summary ──');
if (failed === 0) {
  console.log('  passes:   ' + passed);
  console.log('  failures: 0\n');
  console.log('PASS');
} else {
  console.log('  passes:   ' + passed);
  console.log('  failures: ' + failed + '\n');
  console.log('FAIL');
  process.exit(1);
}

})().catch(e => { console.error('FATAL:', e); process.exit(1); });
