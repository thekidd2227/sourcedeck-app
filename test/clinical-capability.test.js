/**
 * Clinical Capability module — deterministic unit tests.
 *
 * Runs with Node.js assert (no external test framework needed).
 * Tests cover the module's data model, manifest shape, readiness
 * computation, and state defaults — everything that does not require
 * an Electron renderer. The actual DOM rendering is validated by
 * visual inspection during dev.
 *
 * Run:  node test/clinical-capability.test.js
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ── Extract the manifest + state defaults from the inline JS ──────
// We parse the HTML to extract the CHARTNAV_MANIFEST object and the
// default _state so we can test them in isolation.
const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf-8');

// Extract the manifest JSON object from the script block.
const manifestMatch = html.match(/const CHARTNAV_MANIFEST\s*=\s*(\{[\s\S]*?\n  \});/);
assert(manifestMatch, 'CHARTNAV_MANIFEST must exist in sourcedeck.html');
// eslint-disable-next-line no-eval
const manifest = eval('(' + manifestMatch[1] + ')');

// Extract default state shape.
const stateMatch = html.match(/let _state\s*=\s*(\{[\s\S]*?\n  \});/);
assert(stateMatch, '_state default must exist in sourcedeck.html');
const defaultState = eval('(' + stateMatch[1] + ')');

// ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Clinical Capability / EHR Mode — unit tests ===\n');

// ── Manifest shape ──────────────────────────────────────────────
test('manifest has capability_id', () => {
  assert.strictEqual(manifest.capability_id, 'clinical_ehr_mode');
});

test('manifest has display_name', () => {
  assert.strictEqual(manifest.display_name, 'Clinical Capability / EHR Mode');
});

test('manifest has provider SourceDeck', () => {
  assert.strictEqual(manifest.provider, 'SourceDeck');
});

test('manifest has exactly 2 implementation_modes', () => {
  assert.strictEqual(manifest.implementation_modes.length, 2);
});

test('implementation modes are self_implementation + done_for_you', () => {
  const keys = manifest.implementation_modes.map(m => m.key).sort();
  assert.deepStrictEqual(keys, ['done_for_you', 'self_implementation']);
});

test('manifest has 8 prerequisites', () => {
  assert.strictEqual(manifest.prerequisites.length, 8);
});

test('every prerequisite has key + label + type + required', () => {
  for (const p of manifest.prerequisites) {
    assert(p.key, 'key missing');
    assert(p.label, 'label missing');
    assert(p.type, 'type missing');
    assert(typeof p.required === 'boolean', 'required must be boolean');
  }
});

test('manifest lists expected capabilities', () => {
  const expected = ['encounter_documentation', 'dictation_transcription', 'review_approval',
                    'office_deployment', 'implementation_readiness', 'control_plane_monitoring'];
  assert.deepStrictEqual(manifest.capabilities, expected);
});

// ── Default state ───────────────────────────────────────────────
test('default state has enabled=false', () => {
  assert.strictEqual(defaultState.enabled, false);
});

test('default state has empty impl_mode', () => {
  assert.strictEqual(defaultState.impl_mode, '');
});

test('default state has provider_count=1', () => {
  assert.strictEqual(defaultState.provider_count, 1);
});

test('default state keys match manifest setup_inputs', () => {
  const configKeys = manifest.setup_inputs;
  for (const k of configKeys) {
    assert(k in defaultState, `state missing key: ${k}`);
  }
});

// ── Readiness computation (simulated) ───────────────────────────
function computeReadiness(state) {
  return manifest.prerequisites.map(p => {
    let val = '';
    switch (p.key) {
      case 'org_name':       val = state.org_name;                       break;
      case 'provider_count': val = state.provider_count > 0 ? String(state.provider_count) : ''; break;
      case 'locations':      val = state.locations.trim();               break;
      case 'transcription':  val = state.transcription;                  break;
      case 'ehr_system':     val = state.ehr_system;                     break;
      case 'storage':        val = state.storage;                        break;
      case 'auth':           val = state.auth;                           break;
      case 'impl_mode':      val = state.impl_mode;                      break;
    }
    return { key: p.key, pass: !!val };
  });
}

test('readiness: all fail with default state', () => {
  const checks = computeReadiness(defaultState);
  // provider_count=1 passes; rest should fail
  const failing = checks.filter(c => !c.pass);
  assert(failing.length >= 6, `expected >=6 failures, got ${failing.length}`);
});

test('readiness: all pass with fully populated state', () => {
  const fullState = {
    enabled: true,
    impl_mode: 'done_for_you',
    org_name: 'Test Clinic',
    provider_count: 3,
    locations: 'Main Office\nSatellite',
    transcription: 'whisper_openai',
    ehr_system: 'epic',
    storage: 'hipaa_cloud',
    auth: 'sso_ad'
  };
  const checks = computeReadiness(fullState);
  const failing = checks.filter(c => !c.pass);
  assert.strictEqual(failing.length, 0, `expected 0 failures, got ${failing.length}: ${failing.map(f=>f.key).join(',')}`);
});

test('readiness: self_implementation mode passes impl_mode check', () => {
  const state = Object.assign({}, defaultState, {
    impl_mode: 'self_implementation',
    org_name: 'X', locations: 'Y', transcription: 'a', ehr_system: 'b', storage: 'c', auth: 'd'
  });
  const checks = computeReadiness(state);
  assert(checks.find(c => c.key === 'impl_mode').pass, 'impl_mode should pass');
});

// ── Nav isolation ───────────────────────────────────────────────
test('sidebar nav-capabilities section exists with display:none', () => {
  assert(html.includes('id="nav-capabilities"'), 'nav-capabilities element must exist');
  assert(html.includes('id="nav-capabilities" style="display:none"'), 'nav-capabilities must default to hidden');
});

test('clinical tab pane exists', () => {
  assert(html.includes('id="tab-clinical"'), 'tab-clinical pane must exist');
});

test('standard tabs are not broken (dashboard still present)', () => {
  assert(html.includes('data-tab="dashboard"'), 'dashboard nav button must exist');
  assert(html.includes('id="tab-dashboard"'), 'dashboard tab pane must exist');
});

// ── Summary ─────────────────────────────────────────────────────
console.log(`\n  ${passed} passed · ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
