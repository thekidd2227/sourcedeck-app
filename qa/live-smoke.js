#!/usr/bin/env node
// Live SourceDeck ↔ ChartNav smoke. Drives the real chartnav-integration
// module against a running ChartNav instance and records per-state
// transcripts into qa/live-smoke-output.json so the run is auditable.
//
// Usage:
//   BASE=http://127.0.0.1:8765 ADMIN=admin@chartnav.local node qa/live-smoke.js

const fs = require('fs');
const path = require('path');
const ChartNav = require('../chartnav-integration');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const ADMIN = process.env.ADMIN || 'admin@chartnav.local';
const OUT = path.join(__dirname, 'live-smoke-output.json');

function summary(label, integ) {
  const s = integ.getState();
  return {
    label,
    summary_state: integ.summaryState(),
    connection: s.connection,
    manifest: {
      state: s.manifest.state,
      error: s.manifest.error,
      key: s.manifest.data && s.manifest.data.key,
      name: s.manifest.data && s.manifest.data.name,
      version: s.manifest.data && s.manifest.data.version,
      modes: (s.manifest.data && s.manifest.data.implementation_modes || []).map(m => m.key),
      setup_input_count: s.manifest.data ? s.manifest.data.setup_inputs.length : null,
      prereq_count: s.manifest.data ? s.manifest.data.prerequisites.length : null,
    },
    telemetry: {
      state: s.telemetry.state,
      error: s.telemetry.error,
      health: s.telemetry.data && s.telemetry.data.health,
      release_version: s.telemetry.data && s.telemetry.data.release && s.telemetry.data.release.release_version,
      queued: s.telemetry.data && s.telemetry.data.inputs && s.telemetry.data.inputs.queued,
      failed: s.telemetry.data && s.telemetry.data.inputs && s.telemetry.data.inputs.failed_window,
      locations: s.telemetry.data && s.telemetry.data.locations ? s.telemetry.data.locations.length : null,
    },
  };
}

(async () => {
  const out = {
    base_url: BASE, admin_token_user: ADMIN,
    started_at: new Date().toISOString(),
    scenarios: [],
  };

  // Scenario A: disconnected (no base url set)
  const a = ChartNav.createIntegration();
  out.scenarios.push(summary('A. disconnected (no settings)', a));

  // Scenario B: manifest-only (base set, no token)
  const b = ChartNav.createIntegration();
  b.setConnection({ base_url: BASE });
  await b.connect();
  out.scenarios.push(summary('B. manifest-only (no admin token)', b));

  // Scenario C: fully connected (base + admin token)
  const c = ChartNav.createIntegration();
  c.setConnection({ base_url: BASE, admin_token: ADMIN });
  await c.connect();
  out.scenarios.push(summary('C. fully connected (admin token)', c));

  // Scenario D: telemetry failure (valid base, garbage token)
  const d = ChartNav.createIntegration();
  d.setConnection({ base_url: BASE, admin_token: 'nobody@nowhere.invalid' });
  await d.connect();
  out.scenarios.push(summary('D. telemetry failed (bad token)', d));

  // Scenario E: manifest failure (wrong port)
  const e = ChartNav.createIntegration();
  e.setConnection({ base_url: 'http://127.0.0.1:1', admin_token: ADMIN });
  await e.connect();
  out.scenarios.push(summary('E. manifest failed (unreachable)', e));

  out.finished_at = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  // Pretty-print to stdout
  for (const s of out.scenarios) {
    console.log('---', s.label, '---');
    console.log('  summary_state :', s.summary_state);
    console.log('  manifest      :', s.manifest.state, s.manifest.error || '', '·', s.manifest.name || '-', s.manifest.version || '');
    console.log('  telemetry     :', s.telemetry.state, s.telemetry.error || '', '·', 'health=' + (s.telemetry.health || '-'), 'release=' + (s.telemetry.release_version || '-'));
  }
  console.log('\\nWrote:', OUT);

  // Sanity gates so this script returns non-zero on a real contract drift.
  const expect = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };
  expect(out.scenarios[0].summary_state === 'disconnected', 'A should be disconnected');
  expect(out.scenarios[1].summary_state === 'manifest_only', 'B should be manifest_only');
  expect(out.scenarios[1].manifest.key === 'chartnav', 'B manifest.key should be chartnav');
  expect(out.scenarios[2].summary_state === 'fully_connected', 'C should be fully_connected');
  expect(typeof out.scenarios[2].telemetry.health === 'string', 'C telemetry.health should be a string');
  expect(out.scenarios[3].summary_state === 'manifest_only_telemetry_failed', 'D should be manifest_only_telemetry_failed');
  expect(out.scenarios[4].summary_state === 'manifest_failed', 'E should be manifest_failed');
  console.log('All live smoke assertions passed.');
})().catch(e => { console.error(e); process.exit(2); });
