/**
 * ChartNav live integration — deterministic unit tests.
 *
 * Runs with Node.js assert (matches test/clinical-capability.test.js
 * style — no external test framework). Mocks `fetch` per scenario so
 * no real network call ever leaves the harness; every code path the
 * UI keys off (`disconnected` → `connecting` → `manifest_failed` /
 * `fully_connected` / `manifest_only` / `manifest_only_telemetry_failed`
 * / `manifest_only_telemetry_loading`) is exercised here against
 * canned ChartNav responses that match the real shapes from
 * chartnav-platform commit ce6c72e.
 *
 * Run:  node test/chartnav-integration.test.js
 */

'use strict';

const assert = require('assert');
const ChartNav = require('../chartnav-integration');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    const ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret.then(
        function () { passed++; console.log('  \u2705 ' + name); },
        function (e) { failed++; console.log('  \u274C ' + name + ': ' + e.message); }
      );
    }
    passed++;
    console.log('  \u2705 ' + name);
  } catch (e) {
    failed++;
    console.log('  \u274C ' + name + ': ' + e.message);
  }
}

console.log('\n=== ChartNav live integration \u2014 unit tests ===\n');

// ── Helpers: mocked fetch ──────────────────────────────────────────────

function fakeResponse(status, body, opts) {
  opts = opts || {};
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () {
      if (opts.jsonThrows) return Promise.reject(new Error('bad json'));
      return Promise.resolve(body);
    }
  };
}

// Manifest payload mirrors capability_manifest.py::card_to_dict
const FAKE_MANIFEST = {
  schema_version: 'capability_manifest/v1',
  key: 'chartnav',
  version: '1.0.0',
  name: 'ChartNav',
  one_liner: 'Doctor-first dictation + structured note workflow',
  longer_pitch: 'Captures dictation, transcribes via STT, ...',
  target_buyers: ['Single-specialty practices'],
  capability_summary: ['Browser microphone capture', 'Pluggable STT'],
  setup_inputs: [
    { key: 'organization_name', kind: 'string', required: true },
    { key: 'stt_provider', kind: 'select', required: true,
      options: ['stub', 'openai_whisper', 'none'] }
  ],
  prerequisites: [
    { key: 'https_endpoint', label: 'HTTPS endpoint' }
  ],
  implementation_modes: [
    { key: 'self_implementation', name: 'Self-implementation' },
    { key: 'done_for_you', name: 'Done-for-you implementation' }
  ]
};

// Telemetry payload mirrors deployment_telemetry.py::deployment_overview
const FAKE_TELEMETRY = {
  schema_version: 'deployment_overview/v1',
  deployment_id: 1,
  window_hours: 24,
  generated_at: '2026-04-20T01:00:00+00:00',
  release: {
    release_version: '0.1.0',
    api_version: 'v1',
    platform_mode: 'standalone',
    integration_adapter: 'native',
    audio_ingest_mode: 'inline',
    stt_provider: 'stub',
    storage_scheme: 'file',
    capture_modes: ['file-upload', 'browser-mic']
  },
  inputs: { queued: 0, processing: 0, completed_window: 5,
            failed_window: 0, needs_review_window: 0,
            oldest_queued_age_seconds: null },
  notes:  { open_drafts: 1, signed_window: 2, exported_window: 1 },
  alerts: { total: 0, items: [] },
  users:  { active_total: 3, by_role: { admin: 1, clinician: 1, reviewer: 1 } },
  qa:     { inputs_needing_review: 0, notes_awaiting_signoff: 0 },
  locations: [],
  health: 'green'
};

// ── normalizeBase ─────────────────────────────────────────────────────

test('normalizeBase strips trailing slashes', function () {
  assert.strictEqual(ChartNav.normalizeBase('https://example.com/'), 'https://example.com');
  assert.strictEqual(ChartNav.normalizeBase('https://example.com//'), 'https://example.com');
  assert.strictEqual(ChartNav.normalizeBase('  https://example.com  '), 'https://example.com');
});

test('normalizeBase handles empty / non-string', function () {
  assert.strictEqual(ChartNav.normalizeBase(''), '');
  assert.strictEqual(ChartNav.normalizeBase(null), '');
  assert.strictEqual(ChartNav.normalizeBase(undefined), '');
  assert.strictEqual(ChartNav.normalizeBase(42), '');
});

// ── Validators ────────────────────────────────────────────────────────

test('_validateManifest accepts a real manifest payload', function () {
  assert.strictEqual(ChartNav._validateManifest(FAKE_MANIFEST), null);
});

test('_validateManifest rejects shape drift', function () {
  assert.strictEqual(ChartNav._validateManifest(null), 'invalid_manifest_shape');
  assert.strictEqual(ChartNav._validateManifest({}), 'invalid_manifest_shape');
  assert.strictEqual(ChartNav._validateManifest({ key: '', name: '', setup_inputs: [], prerequisites: [], implementation_modes: [] }), 'invalid_manifest_shape');
  assert.strictEqual(
    ChartNav._validateManifest(Object.assign({}, FAKE_MANIFEST, { setup_inputs: 'not-an-array' })),
    'invalid_manifest_shape'
  );
});

test('_validateTelemetry accepts a real overview payload', function () {
  assert.strictEqual(ChartNav._validateTelemetry(FAKE_TELEMETRY), null);
});

test('_validateTelemetry rejects shape drift', function () {
  assert.strictEqual(ChartNav._validateTelemetry({}), 'invalid_telemetry_shape');
  assert.strictEqual(
    ChartNav._validateTelemetry(Object.assign({}, FAKE_TELEMETRY, { release: null })),
    'invalid_telemetry_shape'
  );
  assert.strictEqual(
    ChartNav._validateTelemetry(Object.assign({}, FAKE_TELEMETRY, { health: 42 })),
    'invalid_telemetry_shape'
  );
});

// ── Default state ─────────────────────────────────────────────────────

test('createIntegration: default state is fully disconnected', function () {
  const integ = ChartNav.createIntegration();
  const s = integ.getState();
  assert.strictEqual(s.connection, 'disconnected');
  assert.strictEqual(s.manifest.state, 'idle');
  assert.strictEqual(s.telemetry.state, 'idle');
  assert.strictEqual(integ.summaryState(), 'disconnected');
});

test('setConnection: stores base_url + admin_token, masks token in getConnection', function () {
  const integ = ChartNav.createIntegration();
  integ.setConnection({ base_url: 'https://chartnav.test/', admin_token: 'sek-123' });
  const c = integ.getConnection();
  assert.strictEqual(c.base_url, 'https://chartnav.test/');
  assert.strictEqual(c.admin_token, '***'); // masked, not raw
});

// ── fetchManifest ─────────────────────────────────────────────────────

test('fetchManifest: missing base_url \u2192 no_base_url', function () {
  const integ = ChartNav.createIntegration({ fetch: function () { throw new Error('should not be called'); } });
  return integ.fetchManifest().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'no_base_url');
  });
});

test('fetchManifest: 200 OK + valid body \u2192 ok=true with data', function () {
  let calledUrl = null;
  const integ = ChartNav.createIntegration({
    fetch: function (url) { calledUrl = url; return Promise.resolve(fakeResponse(200, FAKE_MANIFEST)); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.fetchManifest().then(function (r) {
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.data.key, 'chartnav');
    assert.strictEqual(calledUrl, 'https://chartnav.test/capability/manifest');
  });
});

test('fetchManifest: 500 \u2192 http_500', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(500, { error: 'oops' })); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.fetchManifest().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'http_500');
  });
});

test('fetchManifest: 200 + invalid shape \u2192 invalid_manifest_shape', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(200, { wrong: 'shape' })); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.fetchManifest().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'invalid_manifest_shape');
  });
});

test('fetchManifest: network throw \u2192 network_error with detail', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.reject(new Error('ECONNREFUSED')); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.fetchManifest().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'network_error');
    assert.ok(r.detail.indexOf('ECONNREFUSED') >= 0);
  });
});

// ── fetchTelemetry ────────────────────────────────────────────────────

test('fetchTelemetry: no admin_token \u2192 no_admin_token', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { throw new Error('should not be called'); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.fetchTelemetry().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'no_admin_token');
  });
});

test('fetchTelemetry: success path sends both auth headers', function () {
  let capturedHeaders = null;
  const integ = ChartNav.createIntegration({
    fetch: function (url, init) {
      capturedHeaders = init.headers;
      return Promise.resolve(fakeResponse(200, FAKE_TELEMETRY));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 'admin@x.com' });
  return integ.fetchTelemetry().then(function (r) {
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.data.health, 'green');
    // Sends BOTH so either ChartNav auth_mode (header / bearer) accepts.
    assert.strictEqual(capturedHeaders['X-User-Email'], 'admin@x.com');
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer admin@x.com');
  });
});

test('fetchTelemetry: 403 \u2192 http_403', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(403, {})); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.fetchTelemetry().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'http_403');
  });
});

test('fetchTelemetry: 200 + bad shape \u2192 invalid_telemetry_shape', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(200, { not: 'an overview' })); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.fetchTelemetry().then(function (r) {
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error_code, 'invalid_telemetry_shape');
  });
});

// ── connect() orchestration & summaryState matrix ────────────────────

test('connect: manifest 200 + token present + telemetry 200 \u2192 fully_connected', function () {
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/capability/manifest') >= 0) return Promise.resolve(fakeResponse(200, FAKE_MANIFEST));
      if (url.indexOf('/admin/deployment/overview') >= 0) return Promise.resolve(fakeResponse(200, FAKE_TELEMETRY));
      return Promise.resolve(fakeResponse(404, {}));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function (s) {
    assert.strictEqual(s.connection, 'connected');
    assert.strictEqual(s.manifest.state, 'live');
    assert.strictEqual(s.manifest.data.key, 'chartnav');
    assert.strictEqual(s.telemetry.state, 'live');
    assert.strictEqual(s.telemetry.data.health, 'green');
    assert.strictEqual(integ.summaryState(), 'fully_connected');
  });
});

test('connect: manifest 200 + no token \u2192 manifest_only (telemetry skipped)', function () {
  let telemetryCalls = 0;
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/admin/deployment/overview') >= 0) { telemetryCalls++; }
      return Promise.resolve(fakeResponse(200, FAKE_MANIFEST));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.connect().then(function (s) {
    assert.strictEqual(s.connection, 'connected');
    assert.strictEqual(s.manifest.state, 'live');
    assert.strictEqual(s.telemetry.state, 'unavailable');
    assert.strictEqual(s.telemetry.error, 'no_admin_token');
    assert.strictEqual(integ.summaryState(), 'manifest_only');
    assert.strictEqual(telemetryCalls, 0); // never even attempted
  });
});

test('connect: manifest 200 + telemetry 401 \u2192 manifest_only_telemetry_failed', function () {
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/capability/manifest') >= 0) return Promise.resolve(fakeResponse(200, FAKE_MANIFEST));
      return Promise.resolve(fakeResponse(401, { error: 'unauthorized' }));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function (s) {
    assert.strictEqual(s.connection, 'connected');
    assert.strictEqual(s.manifest.state, 'live');
    assert.strictEqual(s.telemetry.state, 'failed');
    assert.strictEqual(s.telemetry.error, 'http_401');
    assert.strictEqual(integ.summaryState(), 'manifest_only_telemetry_failed');
  });
});

test('connect: manifest fails \u2192 manifest_failed (telemetry not attempted)', function () {
  let telemetryCalls = 0;
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/admin/deployment/overview') >= 0) { telemetryCalls++; }
      return Promise.resolve(fakeResponse(503, {}));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function (s) {
    assert.strictEqual(s.connection, 'disconnected');
    assert.strictEqual(s.manifest.state, 'failed');
    assert.strictEqual(s.manifest.error, 'http_503');
    assert.strictEqual(integ.summaryState(), 'manifest_failed');
    assert.strictEqual(telemetryCalls, 0); // skipped because manifest failed
  });
});

test('connect: connecting state observable mid-flight (no silent success)', function () {
  // Hold the manifest promise so summaryState reads `connecting`.
  let resolveManifest;
  const integ = ChartNav.createIntegration({
    fetch: function () {
      return new Promise(function (res) { resolveManifest = function () { res(fakeResponse(200, FAKE_MANIFEST)); }; });
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  const connectPromise = integ.connect();
  assert.strictEqual(integ.summaryState(), 'connecting');
  // fetchFn is scheduled via a microtask inside fetchManifest(); wait one
  // tick so resolveManifest has been assigned before we call it.
  return Promise.resolve().then(function () {
    resolveManifest();
    return connectPromise;
  }).then(function () {
    assert.strictEqual(integ.summaryState(), 'manifest_only');
  });
});

// ── Reset + isolation ────────────────────────────────────────────────

test('reset(): wipes state back to disconnected (connection settings preserved)', function () {
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(200, FAKE_MANIFEST)); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function () {
    assert.notStrictEqual(integ.summaryState(), 'disconnected');
    integ.reset();
    assert.strictEqual(integ.summaryState(), 'disconnected');
    // Connection settings survive reset() — only ephemeral state cleared.
    assert.strictEqual(integ.getConnection().admin_token, '***');
  });
});

test('multiple instances are isolated — no module-level state leak', function () {
  const a = ChartNav.createIntegration({ fetch: function () { return Promise.resolve(fakeResponse(200, FAKE_MANIFEST)); } });
  const b = ChartNav.createIntegration({ fetch: function () { return Promise.resolve(fakeResponse(500, {})); } });
  a.setConnection({ base_url: 'https://a.test' });
  b.setConnection({ base_url: 'https://b.test' });
  return Promise.all([a.connect(), b.connect()]).then(function () {
    assert.strictEqual(a.summaryState(), 'manifest_only');
    assert.strictEqual(b.summaryState(), 'manifest_failed');
  });
});

// ── HTML hookup sanity (the renderer must actually load this module) ─

test('sourcedeck.html includes chartnav-integration.js script tag', function () {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf-8');
  assert.ok(
    html.indexOf('chartnav-integration.js') >= 0,
    'sourcedeck.html must <script src> the integration module so the renderer can use it'
  );
});

test('sourcedeck.html exposes ChartNav connection card with required fields', function () {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf-8');
  assert.ok(html.indexOf('id="cn-base-url"') >= 0, 'connection card must have a base-url input');
  assert.ok(html.indexOf('id="cn-admin-token"') >= 0, 'connection card must have an admin-token input');
  assert.ok(html.indexOf('id="cn-connection-status"') >= 0, 'connection card must have a status badge');
});

// ── Schema-version handling ────────────────────────────────────────────

test('connect: surfaces schema_version when ChartNav publishes a known one', function () {
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/admin/deployment/overview') >= 0) return Promise.resolve(fakeResponse(200, FAKE_TELEMETRY));
      return Promise.resolve(fakeResponse(200, FAKE_MANIFEST));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function (s) {
    assert.strictEqual(s.manifest.schema_version, 'capability_manifest/v1');
    assert.strictEqual(s.manifest.schema_warning, null);
    assert.strictEqual(s.telemetry.schema_version, 'deployment_overview/v1');
    assert.strictEqual(s.telemetry.schema_warning, null);
  });
});

test('connect: missing schema_version is accepted (older ChartNav, backwards-compat)', function () {
  const noSchema = Object.assign({}, FAKE_MANIFEST); delete noSchema.schema_version;
  const integ = ChartNav.createIntegration({
    fetch: function () { return Promise.resolve(fakeResponse(200, noSchema)); }
  });
  integ.setConnection({ base_url: 'https://chartnav.test' });
  return integ.connect().then(function (s) {
    assert.strictEqual(integ.summaryState(), 'manifest_only');
    assert.strictEqual(s.manifest.schema_version, null);
    assert.strictEqual(s.manifest.schema_warning, null);
  });
});

test('connect: unexpected schema_version surfaces a non-blocking warning', function () {
  const futureManifest = Object.assign({}, FAKE_MANIFEST, { schema_version: 'capability_manifest/v2' });
  const futureTelemetry = Object.assign({}, FAKE_TELEMETRY, { schema_version: 'deployment_overview/v9' });
  const integ = ChartNav.createIntegration({
    fetch: function (url) {
      if (url.indexOf('/admin/deployment/overview') >= 0) return Promise.resolve(fakeResponse(200, futureTelemetry));
      return Promise.resolve(fakeResponse(200, futureManifest));
    }
  });
  integ.setConnection({ base_url: 'https://chartnav.test', admin_token: 't' });
  return integ.connect().then(function (s) {
    // Still fully_connected — schema mismatch is a soft signal, not a reject.
    assert.strictEqual(integ.summaryState(), 'fully_connected');
    assert.deepStrictEqual(s.manifest.schema_warning, { observed: 'capability_manifest/v2', expected: 'capability_manifest/v1' });
    assert.deepStrictEqual(s.telemetry.schema_warning, { observed: 'deployment_overview/v9', expected: 'deployment_overview/v1' });
  });
});

test('_validateManifest rejects a non-string schema_version (real shape drift)', function () {
  const bad = Object.assign({}, FAKE_MANIFEST, { schema_version: 1 });
  assert.strictEqual(ChartNav._validateManifest(bad), 'invalid_manifest_shape');
});

test('admin token persistence routes through safeStorage (storeKey/getKey), not the plain store', function () {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf-8');
  // Save path: token must go through storeKey('chartnav_admin_token', ...)
  assert.ok(
    /storeKey\(\s*['\"]chartnav_admin_token['\"]/.test(html),
    'admin token must be persisted via window.sd.storeKey (safeStorage-backed)'
  );
  // Load path: token must be read back through getKey('chartnav_admin_token')
  assert.ok(
    /getKey\(\s*['\"]chartnav_admin_token['\"]/.test(html),
    'admin token must be loaded via window.sd.getKey (safeStorage-backed)'
  );
  // Empty token must clear via deleteKey, not by leaving stale state
  assert.ok(
    /deleteKey\(\s*['\"]chartnav_admin_token['\"]/.test(html),
    'clearing the admin token must call window.sd.deleteKey'
  );
  // The plain-store payload under "chartnav" must NOT contain admin_token
  // on the save path. Look for `storeSet('chartnav', { ... admin_token`.
  const badSavePattern = /storeSet\(\s*['\"]chartnav['\"]\s*,\s*\{[^}]*admin_token/;
  assert.ok(!badSavePattern.test(html),
    'save path must not write admin_token into the plain electron-store payload');
});

test('main.js wires safeStorage-backed key IPC the renderer relies on', function () {
  const fs = require('fs');
  const path = require('path');
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8');
  assert.ok(/safeStorage/.test(main), 'main.js must import safeStorage');
  assert.ok(/ipcMain\.handle\(['\"]store-key['\"]/.test(main), 'store-key handler required');
  assert.ok(/ipcMain\.handle\(['\"]get-key['\"]/.test(main), 'get-key handler required');
  assert.ok(/ipcMain\.handle\(['\"]delete-key['\"]/.test(main), 'delete-key handler required');
});

test('package.json includes chartnav-integration.js in build.files', function () {
  const fs = require('fs');
  const path = require('path');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  assert.ok(
    Array.isArray(pkg.build.files) && pkg.build.files.indexOf('chartnav-integration.js') >= 0,
    'electron-builder must pack chartnav-integration.js'
  );
});

// ── Summary ────────────────────────────────────────────────────────────

// Wait for any in-flight async tests to finish before exiting.
setTimeout(function () {
  console.log('\n  ' + passed + ' passed \u00B7 ' + failed + ' failed\n');
  process.exit(failed > 0 ? 1 : 0);
}, 200);
