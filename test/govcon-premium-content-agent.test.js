/**
 * Premium GovCon Content Agent tests.
 * Confirms the agent consumes the operating profile, stays draft-only,
 * makes no platform-publishing claims, and blocks unsupported certs.
 * Synthetic data only. Run: node test/govcon-premium-content-agent.test.js
 */
'use strict';
const assert = require('assert');
const a = require('../services/govcon/premium-content-agent');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

const PROFILE = {
  business: { legalBusinessName: 'Acme Federal LLC', coreServices: ['Help desk', 'Cloud migration'], differentiators: ['24/7 CONUS coverage'] },
  identifiers: { certifications: { SDVOSB: true, HUBZone: false, '8(a)': false } },
  targeting: { naicsCodes: ['541512'], targetAgencies: ['VA'] },
  content: { defaultPostingPlatforms: ['linkedin', 'facebook'], approvedTone: 'direct', blockedClaims: ['guaranteed win'], approvedClaims: ['99.7% SLA on VA help desk'], hashtagPreferences: ['#FedIT'], imageStylePreferences: ['flat, navy palette'] },
  capabilityStatement: { extractedPastPerformanceSnippets: ['VA help desk, Very Good CPARS'] },
  safety: { blockUnsupportedCertificationClaims: true, requireApprovalBeforeContentPosting: true }
};

console.log('\n── premium content agent ──');

test('consumes operating profile context (company, services, differentiators, PP)', () => {
  const r = a.generatePremiumContent(PROFILE, { topic: 'help desk recompetes', platforms: ['linkedin'] });
  const text = r.drafts.map(d => d.caption).join('\n');
  assert.ok(/Acme Federal LLC/.test(text), 'company missing');
  assert.ok(/Help desk|Cloud migration/.test(text), 'services missing');
  assert.ok(/24\/7 CONUS/.test(text), 'differentiator missing');
  assert.ok(/VA help desk/.test(text), 'past performance missing');
});

test('supported platforms are exactly the five content-prep targets', () => {
  assert.deepStrictEqual(a.SUPPORTED_PLATFORMS.slice().sort(),
    ['facebook', 'instagram', 'linkedin', 'meta_business_suite', 'tiktok'].sort());
});

test('output is draft-only / manual-post (no auto-post, no publishing)', () => {
  const r = a.generatePremiumContent(PROFILE, {});
  assert.strictEqual(r.requiresApproval, true);
  assert.strictEqual(r.sendingEnabled, false);
  assert.strictEqual(r.autoPost, false);
  assert.strictEqual(r.publishingSupported, false);
  assert.ok(r.drafts.every(d => d.requiresApproval === true && d.sendingEnabled === false && d.autoPost === false));
  assert.match(r.manualPostingNotes, /does not (connect|post)/i);
  assert.match(r.humanReviewFooter, /human review/i);
});

test('produces the expected draft artifacts', () => {
  const r = a.generatePremiumContent(PROFILE, { topic: 'recompetes' });
  assert.ok(Array.isArray(r.hooks) && r.hooks.length, 'hooks');
  assert.ok(Array.isArray(r.hashtags) && r.hashtags.length, 'hashtags');
  assert.ok(Array.isArray(r.imagePrompts) && r.imagePrompts.length, 'image prompts');
  assert.ok(Array.isArray(r.carouselOutline) && r.carouselOutline.length, 'carousel outline');
  assert.ok(Array.isArray(r.claimReviewChecklist) && r.claimReviewChecklist.length, 'claim review checklist');
  assert.deepStrictEqual(r.contentRatio, { featureBenefit: 75, diagnosticPOV: 25 });
});

test('blocks unsupported certification claims; keeps active certs', () => {
  const r = a.generatePremiumContent(PROFILE, { platforms: ['linkedin'] });
  const text = r.drafts.map(d => d.caption).join('\n') + r.hashtags.join(' ');
  assert.ok(!/HUBZone/i.test(text), 'unsupported HUBZone cert must be scrubbed');
  // SDVOSB is active -> allowed in hashtags
  assert.ok(/SDVOSB/i.test(r.hashtags.join(' ')), 'active SDVOSB cert should appear');
});

test('claim review checklist references blocked + approved claims', () => {
  const list = a.buildClaimReviewChecklist(PROFILE);
  const joined = list.join(' | ');
  assert.ok(/guaranteed win/.test(joined), 'blocked claim missing');
  assert.ok(/99\.7% SLA/.test(joined), 'approved claim missing');
  assert.ok(/compliance\/certification/i.test(joined), 'compliance caution missing');
});

test('no unsupported certification claim leaks even with no platforms requested', () => {
  const r = a.generatePremiumContent({ identifiers: { certifications: {} }, safety: { blockUnsupportedCertificationClaims: true }, business: { legalBusinessName: 'X' } }, {});
  const text = JSON.stringify(r);
  assert.ok(!/HUBZone|EDWOSB/i.test(text), 'no unsupported certs should appear');
});

const total = passed + failed;
console.log('');
console.log(failed === 0
  ? `=== PASS — ${passed}/${total} govcon-premium-content-agent tests ===`
  : `=== FAIL — ${failed}/${total} govcon-premium-content-agent tests failed ===`);
if (failed > 0) process.exit(1);
