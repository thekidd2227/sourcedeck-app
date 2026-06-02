#!/usr/bin/env node
/**
 * IBM watsonx Runtime Probe — CLI (Phase 18A).
 *
 * Performs an HONEST, real runtime check of the IBM watsonx path:
 *   1. Reads IBM/watsonx env from process.env ONLY (presence-only report).
 *   2. If required env is present, attempts a real IBM IAM token exchange.
 *   3. If IAM succeeds, attempts a MINIMAL real watsonx runtime request.
 *   4. Classifies the outcome into a stable state and captures redacted
 *      evidence.
 *
 * Usage:
 *   node scripts/watsonx-runtime-probe.js              # human-readable
 *   node scripts/watsonx-runtime-probe.js --json       # redacted JSON
 *   node scripts/watsonx-runtime-probe.js --evidence   # write reports
 *   node scripts/watsonx-runtime-probe.js --strict     # exit 1 unless verified_ready
 *
 * Exit semantics:
 *   default — 0 for not_configured / configured_missing_required_env /
 *             blocked_by_ibm_config / verified_ready (diagnostic mode)
 *   --strict — 1 unless the outcome is verified_ready
 *
 * NEVER prints a secret value. No API key, bearer token, project/space/
 * deployment id, or generated text is printed or written. The probe makes
 * outbound calls ONLY when required env is present.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ev = require('../services/ai/watsonx-runtime-evidence.js');
const { createWatsonxProvider } = require('../services/ai/providers/watsonx.js');

function parseArgs(argv) {
  const opts = { json: false, evidence: false, strict: false, rootDir: process.cwd(), out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--evidence') opts.evidence = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--out') opts.out = argv[++i] || null;
    else if (a === '--root') opts.rootDir = argv[++i] || opts.rootDir;
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        [
          'IBM watsonx Runtime Probe',
          '',
          'Usage: node scripts/watsonx-runtime-probe.js [--json] [--evidence] [--strict] [--out <dir>]',
          '',
          '  --json       emit redacted JSON evidence on stdout',
          '  --evidence   write redacted evidence reports under reports/watsonx-runtime/',
          '  --strict     exit 1 unless outcome is verified_ready',
          '  --out <dir>  override report output directory',
          '',
          'Presence-only. No IBM/watsonx secrets are printed or written.',
          ''
        ].join('\n')
      );
      process.exit(0);
    }
  }
  return opts;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function today() { return new Date().toISOString().slice(0, 10); }

// Build the watsonx provider config from env (values used only to make
// the live call; never returned or logged).
function configFromEnv(env) {
  return {
    apiKey:    env.WATSONX_API_KEY || env.IBM_CLOUD_API_KEY || null,
    projectId: env.WATSONX_PROJECT_ID || null,
    spaceId:   env.WATSONX_SPACE_ID || null,
    url:       env.WATSONX_URL || (env.WATSONX_REGION ? `https://${env.WATSONX_REGION}.ml.cloud.ibm.com` : 'https://us-south.ml.cloud.ibm.com'),
    modelId:   env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2'
  };
}

// Perform the live probe. Returns the raw probe-result shape consumed by
// buildWatsonxRuntimeEvidence(). Only attempts network when env allows.
async function runProbe(env, deps) {
  const envStatus = ev.getWatsonxEnvStatus(env);
  const result = { env: envStatus, attempted: { iam: false, runtime: false }, iam: null, runtime: null };

  // Do not touch the network unless the required env is present.
  if (!envStatus.configured) return result;

  const provider = createWatsonxProvider(configFromEnv(env), deps);
  if (!provider.configured) {
    // Defensive: provider disagrees about config completeness.
    return result;
  }

  // A single minimal generate() call exercises BOTH stages: IAM token
  // exchange, then the runtime text-generation request.
  result.attempted.iam = true;
  let gen;
  try {
    gen = await provider.generate({ prompt: 'ping', parameters: { max_new_tokens: 1 } });
  } catch (err) {
    // Should not normally throw (provider returns error objects), but be safe.
    result.iam = { ok: true, status: null };
    result.attempted.runtime = true;
    result.runtime = { ok: false, status: null, error: 'probe_exception', detail: ev.redactWatsonxEvidence(String(err && err.message || err)) };
    return result;
  }

  if (gen && gen.error === 'iam_auth_failed') {
    result.iam = { ok: false, status: gen.status || null };
    return result; // runtime never attempted
  }

  // IAM succeeded (token obtained) — the runtime request was attempted.
  result.iam = { ok: true, status: null };
  result.attempted.runtime = true;
  result.runtime = {
    ok: gen && gen.ok === true,
    status: (gen && gen.status) || null,
    error: gen && gen.ok === true ? null : (gen && gen.error) || 'unknown',
    detail: gen && gen.detail ? ev.redactWatsonxEvidence(String(gen.detail)) : null,
    responseTextPresent: !!(gen && gen.ok === true && gen.text)
  };
  return result;
}

function writeReports(outDir, mdText, jsonText) {
  ensureDir(outDir);
  const ts = today();
  const mdPaths = [
    path.join(outDir, 'latest-watsonx-runtime-evidence.md'),
    path.join(outDir, ts + '-watsonx-runtime-evidence.md')
  ];
  const jsonPaths = [
    path.join(outDir, 'latest-watsonx-runtime-evidence.json'),
    path.join(outDir, ts + '-watsonx-runtime-evidence.json')
  ];
  for (const p of mdPaths)   fs.writeFileSync(p, mdText);
  for (const p of jsonPaths) fs.writeFileSync(p, jsonText);
  return { mdPaths, jsonPaths };
}

function decideExit(evidence, strict) {
  if (strict) return evidence.verifiedReady === true ? 0 : 1;
  return 0; // diagnostic mode is non-blocking
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = await runProbe(process.env, {});
  const evidence = ev.buildWatsonxRuntimeEvidence(result);

  const md = ev.formatWatsonxRuntimeEvidenceMarkdown(evidence);
  const json = ev.formatWatsonxRuntimeEvidenceJson(evidence);

  if (opts.evidence) {
    const outDir = opts.out || path.join(opts.rootDir, 'reports', 'watsonx-runtime');
    const { mdPaths, jsonPaths } = writeReports(outDir, md, json);
    if (!opts.json) {
      process.stdout.write(md + '\n');
      process.stdout.write('\n--\n');
      process.stdout.write('markdown: ' + mdPaths[0] + '\n');
      process.stdout.write('json:     ' + jsonPaths[0] + '\n');
    } else {
      process.stdout.write(json + '\n');
    }
  } else if (opts.json) {
    process.stdout.write(json + '\n');
  } else {
    process.stdout.write(md + '\n');
  }

  process.exit(decideExit(evidence, opts.strict));
}

if (require.main === module) {
  main().catch((err) => {
    // Never leak anything secret-shaped on an unexpected failure.
    process.stderr.write('watsonx-runtime-probe failed: ' + ev.redactWatsonxEvidence(String(err && err.message || err)) + '\n');
    process.exit(1);
  });
}

module.exports = { parseArgs, configFromEnv, runProbe, decideExit };
