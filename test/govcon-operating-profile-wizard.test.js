/**
 * GovCon Operating Profile + Wizard tests.
 *
 * Exercises the operating-profile service (credential boundary, secret
 * rejection, presence derivation, no-dupe targeting) and static-verifies
 * the upgraded 9-step wizard in sourcedeck.html. Synthetic data only.
 * Run: node test/govcon-operating-profile-wizard.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const op = require('../services/settings/govcon-operating-profile');
const creds = require('../services/settings/credentials');

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }
async function atest(name, fn) { try { await fn(); passed++; console.log('  ✅ ' + name); } catch (e) { failed++; console.log('  ❌ ' + name + ': ' + (e && e.message)); } }

function memStore() {
  const m = new Map();
  return { get: k => m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null, set: (k, v) => m.set(k, JSON.parse(JSON.stringify(v))), has: k => m.has(k), delete: k => m.delete(k) };
}

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

(async () => {
  console.log('\n── operating profile service ──');

  await atest('save stores business fields and validates UEI/CAGE', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.save({ business: { legalBusinessName: 'Acme LLC', coreServices: ['Help desk'] }, identifiers: { uei: 'ABC123DEF456', cageCode: '1AB2C' } });
    assert.strictEqual(r.business.legalBusinessName, 'Acme LLC');
    assert.strictEqual(r.identifiers.uei, 'ABC123DEF456');
    assert.strictEqual(r.identifiers.cageCode, '1AB2C');
  });

  await atest('invalid UEI/CAGE are dropped (not stored)', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.save({ identifiers: { uei: 'too-short', cageCode: 'XXXXXXX' } });
    assert.strictEqual(r.identifiers.uei, '');
    assert.strictEqual(r.identifiers.cageCode, '');
  });

  await atest('profile save REJECTS credential-looking strings', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.save({ business: { elevatorPitch: 'sk-ant-ABCDEFGHIJ1234567890', shortBusinessDescription: 'Bearer abcdef1234567890token' } });
    assert.strictEqual(r.business.elevatorPitch, '', 'secret pitch must be dropped');
    assert.strictEqual(r.business.shortBusinessDescription, '', 'secret desc must be dropped');
    assert.ok(Array.isArray(r._rejected) && r._rejected.length >= 2, 'rejections recorded');
  });

  await atest('looksLikeSecret detects keys but not plain business text', () => {
    assert.strictEqual(op.looksLikeSecret('sk-abcdefghijklmnop1234'), true);
    assert.strictEqual(op.looksLikeSecret('AKIAIOSFODNN7EXAMPLE'), true);
    assert.strictEqual(op.looksLikeSecret('Acme Federal Solutions LLC'), false);
    assert.strictEqual(op.looksLikeSecret('Help desk, cloud migration'), false);
  });

  await atest('raw API keys never appear in stored profile JSON', async () => {
    const store = memStore();
    const svc = op.createOperatingProfileService({ store });
    await svc.save({ business: { shortBusinessDescription: 'sk-ant-SECRETSECRETSECRET123456' }, content: { brandVoice: 'AKIAIOSFODNN7EXAMPLE' } });
    const raw = JSON.stringify(store.get(op.STORE_KEY));
    assert.ok(!/sk-ant-SECRETSECRET/.test(raw), 'sk- key leaked into profile');
    assert.ok(!/AKIAIOSFODNN7EXAMPLE/.test(raw), 'AWS key leaked into profile');
  });

  await atest('credential presence derived from credentials.status() (not stored)', async () => {
    const cred = creds.createMemoryCredentialStore();
    await cred.set('sam-gov', 'x'); await cred.set('canva', 'y'); await cred.set('openai', 'z');
    const svc = op.createOperatingProfileService({ store: memStore(), credentials: cred });
    const r = await svc.get();
    assert.strictEqual(r.credentialPresence.samGovPresent, true);
    assert.strictEqual(r.credentialPresence.canvaPresent, true);
    assert.strictEqual(r.credentialPresence.openaiPresent, true);
    assert.strictEqual(r.credentialPresence.tiktokPresent, false);
  });

  await atest('social handles save as profile context, not credentials', async () => {
    const store = memStore();
    const svc = op.createOperatingProfileService({ store });
    const r = await svc.save({ content: { socialHandles: { linkedin: 'https://linkedin.com/company/acme', tiktok: '@acme' }, defaultPostingPlatforms: ['linkedin', 'tiktok'] } });
    assert.strictEqual(r.content.socialHandles.linkedin, 'https://linkedin.com/company/acme');
    assert.strictEqual(r.content.socialHandles.tiktok, '@acme');
    assert.deepStrictEqual(r.content.defaultPostingPlatforms.sort(), ['linkedin', 'tiktok']);
  });

  await atest('targeting routes through injected targeting service (no dupe)', async () => {
    const store = memStore();
    const tp = require('../services/govcon/targeting-profile').createTargetingProfileService(store);
    const svc = op.createOperatingProfileService({ store, targetingProfile: tp });
    await svc.save({ targeting: { naicsCodes: ['541512'], targetAgencies: ['DLA'] } });
    const t = tp.load();
    assert.deepStrictEqual(t.naics, ['541512'], 'targeting service should hold naics');
    assert.deepStrictEqual(t.agencies.include, ['DLA']);
  });

  console.log('\n── credential catalog ──');

  await atest('KNOWN_SERVICES includes new creative/social services', () => {
    for (const s of ['canva', 'meta', 'instagram', 'facebook', 'tiktok', 'linkedin', 'google', 'x-twitter']) {
      assert.ok(creds.KNOWN_SERVICES.includes(s), 'missing service: ' + s);
    }
    for (const s of ['sam-gov', 'openai', 'anthropic', 'watsonx', 'airtable', 'apollo', 'ibm-cos']) {
      assert.ok(creds.KNOWN_SERVICES.includes(s), 'lost existing service: ' + s);
    }
  });

  await atest('status() includes new services as presence-only; set/remove work; no raw value', async () => {
    const c = creds.createMemoryCredentialStore();
    await c.set('canva', 'CANVA_SECRET');
    const st = await c.status();
    assert.strictEqual(st.present.canva, true);
    const stStr = JSON.stringify(st);
    assert.ok(!/CANVA_SECRET/.test(stStr), 'status must not leak raw value');
    await c.remove('canva');
    const st2 = await c.status();
    assert.ok(!st2.present.canva, 'remove should clear presence');
  });

  console.log('\n── wizard UI (9 steps) ──');

  test('wizard has all 9 steps', () => {
    for (let i = 1; i <= 9; i++) assert.ok(new RegExp('data-step="' + i + '"').test(html), 'missing step ' + i);
  });

  test('business profile fields exist', () => {
    for (const id of ['gcwiz-company', 'gcwiz-dba', 'gcwiz-website', 'gcwiz-bizemail', 'gcwiz-bizphone', 'gcwiz-hqstate', 'gcwiz-contactname', 'gcwiz-bizdesc', 'gcwiz-coreservices', 'gcwiz-differentiators']) {
      assert.ok(html.includes('id="' + id + '"'), 'missing field ' + id);
    }
  });

  test('capability statement paste + extract + approve flow exists', () => {
    assert.ok(/id="gcwiz-capstmt"/.test(html), 'paste field missing');
    assert.ok(/gcWizExtractCapability\(\)/.test(html), 'extract action missing');
    assert.ok(/gcWizApproveCapability\(\)/.test(html), 'approve action missing');
    assert.ok(/not verified/i.test(html), 'candidate/unverified language missing');
  });

  test('SAM/AI/creative keys saved through credentials boundary only', () => {
    assert.ok(/credentials\.set\(\s*['"]sam-gov['"]/.test(html) || /_gcWizSaveKey\('sam-gov'/.test(html), 'SAM save path missing');
    assert.ok(/gcWizSaveAiKey/.test(html) && /gcwiz-ai-provider/.test(html), 'AI key onboarding missing');
    assert.ok(/gcWizSaveCreativeKey/.test(html) && /gcwiz-creative-provider/.test(html), 'creative key onboarding missing');
    // the generic key saver routes everything through sd.credentials.set
    assert.ok(/sd\.credentials\.set\(service/.test(html), 'keys must save via sd.credentials.set');
  });

  test('social handles save as profile context (not credentials)', () => {
    for (const id of ['gcwiz-soc-linkedin', 'gcwiz-soc-facebook', 'gcwiz-soc-instagram', 'gcwiz-soc-tiktok']) {
      assert.ok(html.includes('id="' + id + '"'), 'missing social field ' + id);
    }
    // social handles flow into profile patch content.socialHandles, never credentials.set
    assert.ok(/socialHandles:/.test(html), 'social handles not mapped into profile patch');
  });

  test('preload exposes profile.get/save/reset/extractCapabilityStatement + content.generate', () => {
    assert.ok(/profile:\s*\{[\s\S]*get[\s\S]*save[\s\S]*reset[\s\S]*extractCapabilityStatement/.test(preload), 'profile surface missing');
    assert.ok(/content:\s*\{[\s\S]*generate/.test(preload), 'content.generate missing');
  });

  test('no Authorization/Bearer/x-api-key built in renderer/preload', () => {
    const decom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');
    const p = decom(preload);
    assert.ok(!/['"]Authorization['"]\s*:/.test(p), 'preload Authorization header');
    assert.ok(!/['"]x-api-key['"]\s*:/.test(p), 'preload x-api-key header');
    assert.ok(!/credentials\s*:\s*\{[\s\S]*?\bget\b\s*:/.test(p), 'preload exposes credentials.get');
  });

  test('wizard does not claim platform publishing / auto-post', () => {
    const wizStart = html.indexOf('FIRST-TIME GOVCON SETUP WIZARD');
    const wizEnd = html.indexOf('LEAD DETAIL PANEL');
    const region = html.slice(wizStart, wizEnd);
    assert.ok(/No platform posting|does not post|does not connect/i.test(region), 'no-posting copy missing');
    assert.ok(!/auto-?post(s|ing)?\s+(enabled|supported|to)\b/i.test(region), 'must not claim auto-post');
  });

  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} govcon-operating-profile-wizard tests ===`
    : `=== FAIL — ${failed}/${total} govcon-operating-profile-wizard tests failed ===`);
  if (failed > 0) process.exit(1);
})();
