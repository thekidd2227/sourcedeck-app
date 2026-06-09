'use strict';

/**
 * Phase 25I — FAR AI FAQ
 *
 * Asserts the FAR AI FAQ panel:
 * - Uses the existing user-configured AI provider (Phase 24L
 *   credential boundary) — no new mandatory FAR-specific API key
 * - Builds a source-grounded prompt that refuses to fabricate
 *   FAR text when no source is provided
 * - Cites FAR sections and surfaces acquisition.gov verification
 * - Carries the canonical "advisory only / not legal advice"
 *   disclaimer
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('FAR FAQ panel exposes the question / context / source / answer / citation UI', () => {
  assert.match(HTML, /id="far-faq-question"/);
  assert.match(HTML, /id="far-faq-context"/);
  assert.match(HTML, /id="far-faq-source-text"/);
  assert.match(HTML, /id="far-faq-answer-panel"/);
  assert.match(HTML, /id="far-faq-answer"/);
  assert.match(HTML, /id="far-faq-citations-panel"/);
  assert.match(HTML, /id="far-faq-citations"/);
  assert.match(HTML, /id="far-faq-ask-btn"/);
  assert.match(HTML, /onclick="farAskAi\(\)"/);
  assert.match(HTML, /onclick="farClearFaq\(\)"/);
  assert.match(HTML, /onclick="farCopyAsNote\(\)"/);
});

test('FAR FAQ context selector ships all 10 canonical contexts', () => {
  const REQUIRED = [
    'general',
    'micro-purchase',
    'solicitation-instructions',
    'evaluation-factors',
    'subcontracting-teaming',
    'small-business',
    'pricing-cost',
    'past-performance',
    'communication-restrictions',
    'clauses-forms',
  ];
  for (const v of REQUIRED) {
    assert.match(HTML, new RegExp(`<option value="${v}"`));
  }
});

test('FAR FAQ prompt builder is source-grounded', () => {
  const builder = HTML.match(/window\.farBuildFaqPrompt\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(builder, 'window.farBuildFaqPrompt builder not found');
  const src = builder[0];
  // The prompt must instruct: source-only, FAR citations, no legal
  // advice, no compliance claim, "I do not know" if insufficient.
  assert.match(src, /Answer only from provided FAR/i);
  assert.match(src, /acquisition\.gov/i);
  assert.match(src, /Cite FAR Part\/Subpart\/Section/i);
  assert.match(src, /Do not provide legal advice/i);
  assert.match(src, /Do not claim compliance/i);
  assert.match(src, /I do not know/i);
  assert.match(src, /Advisory only/i);
});

test('FAR FAQ refuses to fabricate when no source text is provided', () => {
  const ask = HTML.match(/window\.farAskAi\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(ask, 'window.farAskAi handler not found');
  const src = ask[0];
  // When no AI provider configured, redirect to Settings + acquisition.gov.
  assert.match(src, /Add an AI API key in Settings/i);
  // When no source text pasted, refuse to fabricate.
  assert.match(src, /No FAR source text was retrieved/i);
  assert.match(src, /Open acquisition\.gov or paste FAR text before relying/i);
});

test('FAR FAQ does NOT introduce a mandatory FAR-specific API key', () => {
  // The credential boundary must reuse the existing user-configured
  // AI provider, not a new FAR-specific key. The renderer must not
  // ship a "Save FAR API Key" field.
  assert.doesNotMatch(HTML, /Save FAR API Key/i);
  assert.doesNotMatch(HTML, /far[_-]?api[_-]?key/i);
});

test('FAR FAQ renderer does not call fetch / XHR directly', () => {
  // The IIFE must route through the bridge (window.sd.ai.complete)
  // or fall back to a manual prompt display — never a renderer-
  // direct network call.
  const startMarker = '/* Phase 25I — FAR Reference (acquisition.gov-grounded)';
  const startIdx = HTML.indexOf(startMarker);
  const endIdx = HTML.indexOf('</script>', startIdx);
  let src = HTML.slice(startIdx, endIdx);
  // Strip comments before scanning.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
});

test('FAR FAQ carries the canonical advisory disclaimer', () => {
  // Two disclaimers: the pane-level top banner + the FAR FAQ
  // panel-level orange warning.
  const startIdx = HTML.indexOf('<section id="gc-far-reference"');
  const endIdx = HTML.indexOf('</section>', startIdx);
  const sec = HTML.slice(startIdx, endIdx);
  // The mission's canonical safety language.
  assert.match(sec, /SourceDeck provides internal review support only/);
  assert.match(sec, /not legal advice/i);
});

test('FAR FAQ saved-note path stores citations alongside the answer', () => {
  const copyFn = HTML.match(/window\.farCopyAsNote\s*=\s*function[\s\S]*?\n\s*\};/);
  assert.ok(copyFn, 'farCopyAsNote not found');
  const src = copyFn[0];
  assert.match(src, /kind:\s*['"]far-faq['"]/);
  assert.match(src, /question:/);
  assert.match(src, /answer:/);
  assert.match(src, /citations:/);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25i-far-ai-faq\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25i-far-ai-faq.test.js'
  );
});
