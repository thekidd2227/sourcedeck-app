'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REQUIRED = 'SourceDeck helps small businesses organize GovCon pursuit workflows, prepare review-ready outreach/content, and manage capture activity with human approval at every decision point.';

const FILES = [
  'docs/premium-content-agent.md',
  'src/content/premiumContentAgent.ts',
  'services/govcon/premium-content-agent.js',
  'docs/release-notes/govcon-premium-content-agent.md',
  'docs/pricing/sourceDeck-pricing-revaluation-2026.md',
  'docs/pricing/sourceDeck-pricing-packaging.md'
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function flat(rel) {
  return read(rel).replace(/\n>\s*/g, ' ').replace(/\s+/g, ' ');
}

function assertNoPositiveClaim(rel, pattern, label) {
  const lines = read(rel).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!pattern.test(line)) continue;
    const context = [lines[i - 1] || '', line].join(' ');
    const guardrail = /\b(do\s*\W*not|does\s*\W*not|never|no |not |without|avoid|blocked|guardrail|false|not_supported|no-auto)\b/i.test(context);
    assert.ok(guardrail, `${rel} has unguarded ${label}: ${line}`);
  }
}

for (const rel of FILES) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} exists`);
}

assert.ok(flat('docs/premium-content-agent.md').includes(REQUIRED), 'required positioning sentence exists in Premium Content Agent docs');
assert.ok(flat('src/content/premiumContentAgent.ts').includes(REQUIRED), 'required positioning sentence exists in spec');
assert.ok(flat('services/govcon/premium-content-agent.js').includes(REQUIRED), 'required positioning sentence exists in generation service');
assert.ok(flat('docs/release-notes/govcon-premium-content-agent.md').includes(REQUIRED), 'required positioning sentence exists in release notes');
assert.ok(flat('docs/pricing/sourceDeck-pricing-packaging.md').includes(REQUIRED), 'required positioning sentence exists in pricing packaging');

for (const rel of FILES) {
  assertNoPositiveClaim(rel, /\bguarantee[sd]?\s+(award|awards|revenue|compliance|outreach|success)\b/i, 'guarantee language');
  assertNoPositiveClaim(rel, /\bwins?\s+contracts?\s+automatically\b/i, 'automatic contract-win language');
  assertNoPositiveClaim(rel, /\b(auto-send|autosend|auto-post|autopost)\b/i, 'auto-send/auto-post language');
}

const packaging = flat('docs/pricing/sourceDeck-pricing-packaging.md');
const whiteGloveSection = packaging.match(/## White-Glove[\s\S]*?## GovCon Operator/)?.[0] || '';
for (const term of ['setup', 'Capture Suite setup', 'Outreach Agent setup', 'Premium Content setup', 'QA and handoff']) {
  assert.ok(whiteGloveSection.includes(term), `White-Glove includes ${term}`);
}

const coreSection = packaging.match(/## Core[\s\S]*?## Growth/)?.[0] || '';
const growthSection = packaging.match(/## Growth[\s\S]*?## White-Glove/)?.[0] || '';
assert.ok(coreSection.includes('Self-install'), 'Core is self-install');
assert.ok(coreSection.includes('User-led setup'), 'Core is user-led setup');
assert.ok(growthSection.includes('Guided setup'), 'Growth includes guided setup');
assert.ok(growthSection.includes('SAM/API onboarding support'), 'Growth includes SAM/API onboarding support');
assert.ok(growthSection.includes('Basic workflow testing'), 'Growth includes workflow testing');
assert.ok(/Difference between Core and Growth/i.test(growthSection), 'Growth is clearly distinguished from Core');

const operatorSection = packaging.match(/## GovCon Operator[\s\S]*?## GovCon Operator Plus/)?.[0] || '';
assert.ok(operatorSection.includes('$499/month'), 'Operator is monthly');
assert.ok(/ongoing optimization/i.test(operatorSection), 'Operator is recurring optimization');
assert.ok(/Monthly content\/support layer/i.test(operatorSection), 'Operator includes monthly support');
assert.ok(!/done-for-you implementation/i.test(operatorSection), 'Operator is not initial implementation');

console.log('=== PASS govcon-pricing-positioning ===');
