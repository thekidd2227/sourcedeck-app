/**
 * Phase 14A delta — completeness(), mergeApprovedExtraction(), and
 * spec-named export aliases on the GovCon Operating Profile.
 *
 * Static-verifies wiring through preload.js, main.js, api/index.js, and
 * the wizard Finish summary. Synthetic data only.
 *
 * Run: node test/govcon-operating-profile-completeness.test.js
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
  return {
    get: k => m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null,
    set: (k, v) => m.set(k, JSON.parse(JSON.stringify(v))),
    has: k => m.has(k),
    delete: k => m.delete(k)
  };
}

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');
const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
// Phase 2: IPC handlers live in app/main/ipc/register-feature-ipc.js.
// We concat main.js + the registrar so layout-aware assertions still work
// even after the migration.
const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(ROOT, 'app/main/ipc/register-feature-ipc.js'), 'utf8');
const apiJs  = fs.readFileSync(path.join(ROOT, 'api', 'index.js'), 'utf8');

(async () => {
  console.log('\n── spec-named export aliases (additive) ──');

  test('createGovconOperatingProfileService aliases existing factory', () => {
    assert.strictEqual(typeof op.createGovconOperatingProfileService, 'function');
    // Sanity: both factories build a working service against the same store.
    const svc = op.createGovconOperatingProfileService({ store: memStore() });
    assert.strictEqual(typeof svc.get, 'function');
    assert.strictEqual(typeof svc.save, 'function');
    assert.strictEqual(typeof svc.reset, 'function');
    assert.strictEqual(typeof svc.completeness, 'function');
    assert.strictEqual(typeof svc.mergeApprovedExtraction, 'function');
  });

  test('existing export names are preserved (no breaking rename)', () => {
    for (const k of ['createOperatingProfileService', 'defaultProfile', 'sanitizeProfile', 'mergeProfile', 'looksLikeSecret', 'STORE_KEY', 'PRESENCE_MAP']) {
      assert.ok(op[k] !== undefined, 'lost existing export: ' + k);
    }
  });

  test('normalizeGovconOperatingProfile returns a sanitized profile shape', () => {
    const norm = op.normalizeGovconOperatingProfile({ business: { legalBusinessName: 'Acme LLC' } });
    assert.ok(norm && norm.business && norm.identifiers && norm.targeting && norm.content && norm.safety);
    assert.strictEqual(norm.business.legalBusinessName, 'Acme LLC');
  });

  test('sanitizeGovconOperatingProfilePatch strips credential-looking values', () => {
    const clean = op.sanitizeGovconOperatingProfilePatch({ business: { elevatorPitch: 'sk-ant-ABCDEFGHIJ1234567890' } });
    assert.strictEqual(clean.business.elevatorPitch, '');
    assert.ok(Array.isArray(clean._rejected) && clean._rejected.length >= 1);
  });

  test('rejectCredentialLikeValues throws on secret, returns safe text', () => {
    assert.strictEqual(op.rejectCredentialLikeValues('Acme Federal LLC'), 'Acme Federal LLC');
    let threw = false;
    try { op.rejectCredentialLikeValues('sk-ant-ABCDEFGHIJ1234567890'); } catch (e) { threw = true; assert.strictEqual(e.code, 'CREDENTIAL_LIKE_VALUE'); }
    assert.ok(threw, 'should throw on credential-looking value');
  });

  test('deriveCredentialPresence projects status.present into flag shape', () => {
    const flags = op.deriveCredentialPresence({ present: { 'sam-gov': true, openai: true, canva: false } });
    assert.strictEqual(flags.samGovPresent, true);
    assert.strictEqual(flags.openaiPresent, true);
    assert.strictEqual(flags.canvaPresent, false);
    assert.strictEqual(flags.tiktokPresent, false);
  });

  console.log('\n── completeness() ──');

  await atest('returns all required sections + overall', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const c = await svc.completeness();
    for (const k of ['businessProfile', 'govconTargeting', 'credentials', 'capabilityStatement', 'socialProfile', 'safetyRules', 'overall']) {
      assert.ok(c[k], 'missing section: ' + k);
      assert.strictEqual(typeof c[k].complete, 'boolean', k + '.complete bool');
      assert.ok(typeof c[k].score === 'number' && c[k].score >= 0 && c[k].score <= 1, k + '.score in [0,1]');
      assert.ok(Array.isArray(c[k].missing), k + '.missing array');
    }
  });

  await atest('empty profile reports missing fields by name', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const c = await svc.completeness();
    assert.ok(c.businessProfile.missing.includes('business.legalBusinessName'));
    assert.ok(c.businessProfile.missing.includes('business.coreServices'));
    assert.ok(c.govconTargeting.missing.includes('targeting.naicsCodes'));
    assert.ok(c.credentials.missing.includes('credentials.samGov'));
    assert.ok(c.credentials.missing.includes('credentials.aiProvider'));
    assert.strictEqual(c.overall.complete, false);
  });

  await atest('filling required business fields moves businessProfile to complete', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    await svc.save({ business: {
      legalBusinessName: 'Acme Federal LLC',
      businessEmail: 'hello@acme.gov',
      shortBusinessDescription: 'GovCon IT services for federal civilian agencies.',
      coreServices: ['Help desk', 'Cloud migration']
    }});
    const c = await svc.completeness();
    assert.strictEqual(c.businessProfile.complete, true);
    assert.strictEqual(c.businessProfile.score, 1);
  });

  await atest('credential presence comes from credentials.status() (not stored)', async () => {
    const cred = creds.createMemoryCredentialStore();
    await cred.set('sam-gov', 'x'); await cred.set('openai', 'y');
    const svc = op.createOperatingProfileService({ store: memStore(), credentials: cred });
    const c = await svc.completeness();
    assert.strictEqual(c.credentials.complete, true, 'sam + AI = credentials complete');
    assert.strictEqual(c.credentials.present.samGovPresent, true);
    assert.strictEqual(c.credentials.present.openaiPresent, true);
  });

  await atest('safety section requires all four approval flags', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    // Defaults are all true.
    let c = await svc.completeness();
    assert.strictEqual(c.safetyRules.complete, true);
    // Flip one off — should report missing.
    await svc.save({ safety: { requireApprovalBeforeContentPosting: false } });
    c = await svc.completeness();
    assert.strictEqual(c.safetyRules.complete, false);
    assert.ok(c.safetyRules.missing.includes('safety.requireApprovalBeforeContentPosting'));
  });

  console.log('\n── mergeApprovedExtraction() ──');

  const synthExtraction = {
    ok: true,
    verified: false,
    requiresApproval: true,
    candidates: {
      legalName: 'Acme Federal LLC',
      uei: 'ABC123DEF456',
      cage: '1AB2C',
      naics: ['541512', '541611'],
      psc: ['D310'],
      certifications: ['SDVOSB', 'HUBZone'],
      services: ['Help desk', 'Cloud migration'],
      differentiators: ['24/7 coverage'],
      pastPerformanceSnippets: ['DLA help-desk contract, 2022–2024']
    },
    confidence: { uei: 'high', cage: 'high' }
  };

  await atest('only merges approved keys into the live profile', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.mergeApprovedExtraction(synthExtraction, ['uei', 'cage', 'naics']);
    assert.deepStrictEqual(r.approvedMerged.sort(), ['cage', 'naics', 'uei']);
    assert.strictEqual(r.profile.identifiers.uei, 'ABC123DEF456');
    assert.strictEqual(r.profile.identifiers.cageCode, '1AB2C');
    assert.deepStrictEqual(r.profile.targeting.naicsCodes, ['541512', '541611']);
    // Unapproved keys must NOT have been promoted to live fields.
    assert.strictEqual(r.profile.business.legalBusinessName, '', 'legalName was NOT approved');
    assert.deepStrictEqual(r.profile.business.coreServices, [], 'services was NOT approved');
    assert.deepStrictEqual(r.profile.business.differentiators, [], 'differentiators was NOT approved');
  });

  await atest('records approved keys + extraction snapshot for audit', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.mergeApprovedExtraction(synthExtraction, ['legalName', 'services']);
    assert.ok(r.profile.capabilityStatement.userApprovedExtractedFields.includes('legalName'));
    assert.ok(r.profile.capabilityStatement.userApprovedExtractedFields.includes('services'));
    // Extraction snapshot is preserved for unapproved candidates too (audit).
    assert.strictEqual(r.profile.capabilityStatement.extractedUEI, 'ABC123DEF456');
    assert.deepStrictEqual(r.profile.capabilityStatement.extractedPSC, ['D310']);
    assert.strictEqual(r.profile.capabilityStatement.extractionConfidenceLabels.uei, 'high');
  });

  await atest('unknown / unsafe approval keys are silently dropped', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.mergeApprovedExtraction(synthExtraction, ['__proto__', 'constructor', 'legalName']);
    assert.deepStrictEqual(r.approvedMerged, ['legalName']);
    assert.strictEqual(r.profile.business.legalBusinessName, 'Acme Federal LLC');
  });

  await atest('approved certifications flip cert flags (whitelist only)', async () => {
    const svc = op.createOperatingProfileService({ store: memStore() });
    const r = await svc.mergeApprovedExtraction(synthExtraction, ['certifications']);
    assert.strictEqual(r.profile.identifiers.certifications.SDVOSB, true);
    assert.strictEqual(r.profile.identifiers.certifications.HUBZone, true);
    assert.strictEqual(r.profile.identifiers.certifications.WOSB, false);
  });

  await atest('extraction merge still rejects credential-looking smuggled values', async () => {
    const store = memStore();
    const svc = op.createOperatingProfileService({ store });
    const sneaky = { candidates: { differentiators: ['sk-ant-ABCDEFGHIJ1234567890', '24/7 coverage'] } };
    const r = await svc.mergeApprovedExtraction(sneaky, ['differentiators']);
    // The credential-looking string was dropped by uniqStr's looksLikeSecret guard.
    assert.deepStrictEqual(r.profile.business.differentiators, ['24/7 coverage']);
    const raw = JSON.stringify(store.get(op.STORE_KEY));
    assert.ok(!/sk-ant-ABCDEFGHIJ/.test(raw), 'credential string leaked into stored profile');
  });

  console.log('\n── wiring: api / main / preload / wizard ──');

  test('api/index.js exposes govcon.profile.completeness()', () => {
    assert.ok(/completeness\s*:\s*\(\s*\)\s*=>\s*opProfile\.completeness\s*\(/.test(apiJs), 'api missing completeness route');
  });

  test('main.js wires govcon:profile-completeness IPC', () => {
    assert.ok(/ipcMain\.handle\(\s*['"]govcon:profile-completeness['"]/.test(mainJs), 'IPC handler missing');
    assert.ok(/appApi\.govcon\.profile\.completeness\s*\(/.test(mainJs), 'IPC handler not routed to appApi');
  });

  test('preload.js exposes profile.completeness()', () => {
    assert.ok(/completeness\s*:\s*\(\s*\)\s*=>\s*ipcRenderer\.invoke\(\s*['"]govcon:profile-completeness['"]/.test(preload), 'preload missing completeness');
    // Existing surface preserved.
    assert.ok(/profile:\s*\{[\s\S]*get[\s\S]*save[\s\S]*reset[\s\S]*extractCapabilityStatement/.test(preload), 'existing profile surface broken');
  });

  test('Step 9 Finish summary references completeness + safety + readiness', () => {
    const finishIdx = html.indexOf('data-step="9"');
    assert.ok(finishIdx > 0, 'step 9 marker not found');
    const renderIdx = html.indexOf('_gcWizRenderSummary');
    assert.ok(renderIdx > 0, 'render summary function not found');
    assert.ok(/profile\.completeness\s*\(/.test(html), 'summary does not call profile.completeness');
    assert.ok(/Safety rules/.test(html), 'safety-rules line missing from summary');
    assert.ok(/Overall setup readiness/.test(html), 'overall readiness line missing');
  });

  test('no Authorization/Bearer/x-api-key added to renderer or preload by delta', () => {
    const decom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');
    const p = decom(preload); const h = decom(html);
    assert.ok(!/['"]Authorization['"]\s*:/.test(p), 'preload Authorization header');
    assert.ok(!/['"]x-api-key['"]\s*:/.test(p), 'preload x-api-key header');
    assert.ok(!/['"]Authorization['"]\s*:/.test(h), 'renderer Authorization header');
    assert.ok(!/['"]x-api-key['"]\s*:/.test(h), 'renderer x-api-key header');
  });

  const total = passed + failed;
  console.log('');
  console.log(failed === 0
    ? `=== PASS — ${passed}/${total} govcon-operating-profile-completeness tests ===`
    : `=== FAIL — ${failed}/${total} govcon-operating-profile-completeness tests failed ===`);
  if (failed > 0) process.exit(1);
})();
