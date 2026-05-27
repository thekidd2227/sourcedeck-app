#!/usr/bin/env node
'use strict';

// renderer-ai-migration.test.js
//
// Verifies that the renderer (sourcedeck.html) no longer builds
// Authorization / x-api-key headers with raw AI provider keys.
// This is the credential-boundary test for the OpenAI + Anthropic
// migration that completes the pattern started by Airtable and Apollo.

const fs   = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'sourcedeck.html');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { console.log('  ✅ ' + msg); passed++; }
  else      { console.log('  ❌ ' + msg); failed++; }
}

console.log('=== Renderer AI credential migration — boundary tests ===\n');

const src = fs.readFileSync(HTML_PATH, 'utf8');

// ── Zero credential-bearing fetch headers ──
assert(
  !(/Authorization.*Bearer.*OPENAI_KEY/i.test(src)),
  'No fetch with Bearer + OPENAI_KEY in renderer'
);
assert(
  !(/x-api-key.*CLAUDE_KEY/i.test(src)),
  'No fetch with x-api-key + CLAUDE_KEY in renderer'
);
assert(
  !(/anthropic-dangerous-direct-browser-access/.test(src)),
  'No anthropic-dangerous-direct-browser-access header in renderer'
);
assert(
  !(/Authorization.*Bearer.*ok/.test(src) && /api\.openai\.com/.test(src)),
  'No fetch to api.openai.com with Bearer + local variable in renderer'
);
assert(
  !(/x-api-key.*ck/.test(src) && /api\.anthropic\.com/.test(src)),
  'No fetch to api.anthropic.com with x-api-key + local variable in renderer'
);

// ── No direct OpenAI/Anthropic API fetch calls in renderer ──
const openaiDirectFetches = (src.match(/fetch\s*\(\s*['"]https:\/\/api\.openai\.com/g) || []).length;
assert(
  openaiDirectFetches === 0,
  'Zero direct fetch() calls to api.openai.com (' + openaiDirectFetches + ' found)'
);
const anthropicDirectFetches = (src.match(/fetch\s*\(\s*['"]https:\/\/api\.anthropic\.com/g) || []).length;
assert(
  anthropicDirectFetches === 0,
  'Zero direct fetch() calls to api.anthropic.com (' + anthropicDirectFetches + ' found)'
);

// ── localStorage: no writes of credential keys ──
assert(
  !/localStorage\.setItem\s*\(\s*['"]lcc_OPENAI_KEY/.test(src),
  'No localStorage.setItem for lcc_OPENAI_KEY'
);
assert(
  !/localStorage\.setItem\s*\(\s*['"]lcc_CLAUDE_KEY/.test(src),
  'No localStorage.setItem for lcc_CLAUDE_KEY'
);

// ── window globals are presence-only, not raw values ──
// After migration, the only assignments to window.OPENAI_KEY should be:
// '' empty string, '<openai_credential_present>' placeholder, or
// defensive self-assignment (window.X = window.X || '').
// The key must never be assigned a raw user-typed secret value like keys.OPENAI_KEY.
assert(
  !/window\.OPENAI_KEY\s*=\s*keys\.OPENAI_KEY/.test(src),
  'window.OPENAI_KEY is never assigned the raw settings form value'
);
assert(
  !/window\.CLAUDE_KEY\s*=\s*keys\.CLAUDE_KEY/.test(src),
  'window.CLAUDE_KEY is never assigned the raw settings form value'
);

// ── Settings inputs are write-only ──
// After save, credential fields should be cleared (el.value = ''),
// not pre-filled with raw key values.
assert(
  !/el\.value\s*=\s*(?:ck|ok|v)\s*;/.test(src) || !/s-claude|s-openai/.test(src),
  'Settings fields are not pre-filled with raw credential values'
);

// ── callAI routes through IPC ──
assert(
  /window\.sd\.ai\.generate/.test(src),
  'callAI routes through window.sd.ai.generate (IPC)'
);

// ── One-time migration exists for legacy keys ──
assert(
  /lcc_OPENAI_KEY.*removeItem/s.test(src),
  'One-time migration removes lcc_OPENAI_KEY from localStorage'
);
assert(
  /lcc_CLAUDE_KEY.*removeItem/s.test(src),
  'One-time migration removes lcc_CLAUDE_KEY from localStorage'
);

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' renderer-ai-migration tests ===');
if (failed > 0) process.exit(1);
