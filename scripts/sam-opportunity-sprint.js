#!/usr/bin/env node
// scripts/sam-opportunity-sprint.js
//
// CLI runner for the SAM Opportunity Sprint service. Standalone — no
// Electron/main-process dependency, so operators can run it from a
// terminal independently of the desktop app.
//
// Behavior:
//   - Loads the GovCon Pursuit Profile from one of, in order:
//       1. --profile=<path>
//       2. ./reports/govcon-pursuit-profile.json (if present)
//       3. ./govcon-pursuit-profile.json (if present)
//       4. defaults from services/govcon/govcon-pursuit-profile.js
//   - Reads SAM_GOV_API_KEY only from process.env. Never prints it.
//   - If the key is missing, exits 0 with a "not_configured" notice and
//     instructions for configuring without echoing secrets.
//   - On success, writes JSON + Markdown + CSV + email-drafts reports
//     to ./reports/ and prints a summary only.
//
// Hard rules upheld:
//   - never print the SAM.gov API key
//   - never auto-send emails
//   - manual_review_required stays true in every draft
//   - no guaranteed-award / revenue language allowed by the safe()
//     filter in the sprint service

'use strict';

const fs = require('fs');
const path = require('path');

const { runSprint } = require('../services/govcon/sam-opportunity-sprint');
const {
  normalizePursuitProfile,
  calculateProfileCompleteness,
} = require('../services/govcon/govcon-pursuit-profile');
const {
  getDefaultProfilePath,
  loadGovconPursuitProfile,
} = require('../services/govcon/govcon-pursuit-profile-store');
const {
  getSamSprintEntitlement,
  applyNaicsLimit,
  describeNaicsLimit,
  normalizePlan,
} = require('../services/govcon/sam-sprint-entitlements');

const REPORTS_DIR = path.resolve(process.cwd(), 'reports');

function arg(flag, fallback) {
  for (const a of process.argv.slice(2)) {
    if (a === flag) return true;
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return fallback;
}

function loadProfile() {
  // Priority:
  //   1. --profile=<path> flag
  //   2. SAM_SPRINT_PROFILE_PATH env var
  //   3. reports/govcon-pursuit-profile.json (legacy in-repo)
  //   4. ./govcon-pursuit-profile.json (legacy in-repo)
  //   5. canonical user-app-data path via the profile store
  //   6. defaults
  const explicit = arg('--profile', null) || process.env.SAM_SPRINT_PROFILE_PATH || null;
  const legacy = [
    path.join(REPORTS_DIR, 'govcon-pursuit-profile.json'),
    path.resolve(process.cwd(), 'govcon-pursuit-profile.json'),
  ];

  // Clone the profile via JSON round-trip so the CLI can mutate it
  // (e.g. to apply the SAM_SPRINT_PLAN env override) without tripping
  // the deep-freeze set by normalizePursuitProfile.
  const mutable = (p) => JSON.parse(JSON.stringify(p || {}));

  if (explicit) {
    // Use the store loader for the explicit path so we get the same
    // safety semantics (missing file, corrupt JSON, secret stripping).
    const r = loadGovconPursuitProfile({ path: explicit });
    return {
      source: r.source === 'file'
        ? explicit
        : `(defaults; ${r.was_corrupt ? 'corrupt at ' + explicit : 'no file at ' + explicit})`,
      profile: mutable(r.profile),
      issues: r.issues,
      was_corrupt: r.was_corrupt,
    };
  }

  for (const f of legacy) {
    try {
      if (fs.existsSync(f)) {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        return { source: f, profile: raw, issues: [], was_corrupt: false };
      }
    } catch (e) {
      console.error(`[profile] could not parse ${f}: ${e.message}`);
    }
  }

  // Canonical user-data store. If absent, returns defaults safely.
  const r = loadGovconPursuitProfile();
  if (r.source === 'file') {
    return { source: r.raw_path, profile: mutable(r.profile), issues: r.issues, was_corrupt: false };
  }
  return { source: '(defaults)', profile: {}, issues: [], was_corrupt: false };
}

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeJson(file, payload) {
  mkdirp(path.dirname(file));
  // Defense in depth: refuse to write any object that somehow contains
  // a SAM_GOV_API_KEY string. This is paranoia; the service already
  // never embeds the key in returned data.
  const serialized = JSON.stringify(payload, null, 2);
  if (/SAM_GOV_API_KEY\s*[:=]\s*["'][^"']+/i.test(serialized)) {
    throw new Error('Refusing to write report payload that contains a secret-looking SAM_GOV_API_KEY value.');
  }
  fs.writeFileSync(file, serialized + '\n');
}

function writeMd(file, result) {
  mkdirp(path.dirname(file));
  const lines = [];
  lines.push('# SAM Opportunity Sprint Report');
  lines.push('');
  lines.push(`Generated: ${result.generated_at}`);
  lines.push(`Scoring model: ${result.scoring_model_version}`);
  lines.push(`Profile complete: ${result.profile_complete ? 'yes' : 'no (rankings are preliminary)'}`);
  lines.push('');
  if (!result.profile_complete) {
    lines.push('> ⚠ The GovCon Pursuit Profile is incomplete. Scoring is preliminary until business identity, goal, service lanes, geography, and certifications are populated.');
    lines.push('');
  }
  lines.push(`- Raw results: ${result.raw_count}`);
  lines.push(`- Unique after dedupe: ${result.unique_count}`);
  lines.push(`- Errors: ${(result.errors || []).length}`);
  lines.push('');
  const comp = result.profile_completeness;
  if (comp) {
    lines.push('## Profile Completeness');
    lines.push('');
    lines.push(`- Readiness: **${comp.readiness_label}** (${comp.percent}%, ${comp.satisfied_count}/${comp.total_field_count} fields)`);
    lines.push(`- Scoring confidence: **${result.scoring_confidence || 'preliminary'}**`);
    if (comp.missing_fields && comp.missing_fields.length) {
      lines.push(`- Missing fields:`);
      for (const f of comp.missing_fields) lines.push(`  - ${f.label} (\`${f.key}\`)`);
    } else {
      lines.push('- Missing fields: none');
    }
    lines.push('');
  }
  if ((result.scoring_confidence || 'preliminary') === 'preliminary') {
    lines.push('> ⚠ Scoring is preliminary because your GovCon Pursuit Profile is incomplete. Rankings will personalize once you configure identity, goal, NAICS, lanes, geography, certifications, capacity, risk filters, and past performance.');
    lines.push('');
  }
  lines.push('> 👤 Human approval required before any outreach. SourceDeck does not auto-send emails, submit quotes, or contact agencies.');
  lines.push('');
  const ent = result.entitlement || (result.query_metadata && result.query_metadata.entitlement);
  if (ent) {
    lines.push('## Profile Assumptions — Plan Entitlement');
    lines.push('');
    lines.push(`- Plan: **${ent.plan}** (paid: ${ent.is_paid})`);
    lines.push(`- ${ent.message}`);
    if (ent.naics_limit_applied) {
      lines.push(`- NAICS searched: ${ent.allowed_naics_count} of ${ent.requested_naics_count} configured`);
      if (Array.isArray(ent.blocked_naics_codes) && ent.blocked_naics_codes.length) {
        lines.push(`- NAICS withheld by free-plan limit: ${ent.blocked_naics_codes.join(', ')}`);
      }
    } else {
      lines.push(`- NAICS searched: all ${ent.allowed_naics_count} configured (no plan limit applied)`);
    }
    if (ent.plan_warning) lines.push(`- Plan warning: ${ent.plan_warning}`);
    lines.push('');
  }
  lines.push('## Profile Snapshot');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(result.profile_snapshot, null, 2));
  lines.push('```');
  lines.push('');
  const opps = result.scored_opportunities || [];
  const top = opps.slice(0, 10);
  lines.push('## Top 10 Pursuit Targets');
  lines.push('');
  if (!top.length) {
    lines.push('_No opportunities returned. Confirm the API key, profile settings, and window._');
  }
  for (let i = 0; i < top.length; i++) {
    const o = top[i];
    lines.push(`### ${i + 1}. [${o.fit_score}] ${o.title}`);
    lines.push('');
    lines.push(`- **Label:** ${o.score_label}`);
    lines.push(`- **Agency:** ${o.agency || 'n/a'} — ${o.office || 'office n/a'}`);
    lines.push(`- **Solicitation:** ${o.solicitationNumber || 'n/a'}`);
    lines.push(`- **Notice type:** ${o.noticeType || o.type || 'n/a'}`);
    lines.push(`- **Response deadline:** ${o.responseDeadline || 'n/a'} (${o.daysUntilClose == null ? '?' : o.daysUntilClose} days)`);
    lines.push(`- **NAICS:** ${o.naics || 'n/a'}`);
    lines.push(`- **Set-aside:** ${o.setAside || 'none'}`);
    lines.push(`- **Place of performance:** ${[(o.placeOfPerformance || {}).city, (o.placeOfPerformance || {}).state, (o.placeOfPerformance || {}).country].filter(Boolean).join(', ') || 'n/a'}`);
    const c = o.contact || {};
    lines.push(`- **POC:** ${c.name || 'n/a'} — ${c.email || 'no email'} — ${c.phone || 'no phone'}`);
    lines.push(`- **SAM link:** ${o.uiLink || 'n/a'}`);
    lines.push(`- **Why this fits:**`);
    for (const r of (o.why_this_fits || [])) lines.push(`  - ${r}`);
    if ((o.risk_flags || []).length) {
      lines.push(`- **Risk flags:**`);
      for (const f of o.risk_flags) lines.push(`  - [${f.severity}] ${f.message}`);
    }
    lines.push(`- **Pursuit angle:** ${o.recommended_pursuit_angle}`);
    lines.push(`- **Outreach angle:** ${o.suggested_outreach_angle}`);
    lines.push(`- **Bid/No-Bid:** ${o.bid_no_bid_recommendation}`);
    lines.push('');
  }
  lines.push('## Top 3 Act-First');
  lines.push('');
  const act = opps.slice(0, 3);
  for (let i = 0; i < act.length; i++) {
    const o = act[i];
    lines.push(`${i + 1}. **${o.title}** — score ${o.fit_score}, closes in ${o.daysUntilClose ?? '?'}d. Angle: ${o.recommended_pursuit_angle}.`);
  }
  lines.push('');
  lines.push('## All Scored Opportunities');
  lines.push('');
  lines.push('| # | Score | Label | Closes | NAICS | State | Title |');
  lines.push('|---|---|---|---|---|---|---|');
  for (let i = 0; i < opps.length; i++) {
    const o = opps[i];
    lines.push(`| ${i + 1} | ${o.fit_score} | ${o.score_label} | ${o.daysUntilClose ?? '?'}d | ${o.naics || '-'} | ${(o.placeOfPerformance || {}).state || '-'} | ${(o.title || '').slice(0, 80)} |`);
  }
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function writeCsv(file, opps) {
  mkdirp(path.dirname(file));
  const headers = [
    'fit_score', 'score_label', 'days_until_close', 'response_deadline', 'title',
    'agency', 'office', 'solicitation_number', 'naics', 'set_aside',
    'pop_city', 'pop_state', 'contact_name', 'contact_email', 'contact_phone',
    'recommended_pursuit_angle', 'bid_no_bid_recommendation', 'sam_link',
  ];
  const lines = [headers.join(',')];
  for (const o of opps) {
    lines.push([
      o.fit_score, o.score_label, o.daysUntilClose, o.responseDeadline, o.title,
      o.agency, o.office, o.solicitationNumber, o.naics, o.setAside,
      (o.placeOfPerformance || {}).city, (o.placeOfPerformance || {}).state,
      (o.contact || {}).name, (o.contact || {}).email, (o.contact || {}).phone,
      o.recommended_pursuit_angle, o.bid_no_bid_recommendation, o.uiLink,
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function writeEmailDrafts(file, drafts) {
  mkdirp(path.dirname(file));
  const lines = [
    '# SAM Opportunity Sprint — Top 10 Email Drafts',
    '',
    '> DRAFTS ONLY. No emails are sent by this tool.',
    '> Review every draft before contacting government personnel.',
    '> If the POC is a Contracting Officer or Specialist, use procurement-safe language and route official questions through the solicitation Q&A channel.',
    '',
  ];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    lines.push(`## Draft ${i + 1} — ${d.subject}`);
    lines.push('');
    lines.push(`- **To:** ${d.to_name} <${d.to}>`);
    lines.push(`- **Solicitation:** ${d.solicitation_number || 'n/a'} (SAM: ${d.sam_link || 'n/a'})`);
    lines.push(`- **Deadline:** ${d.response_deadline || 'n/a'}`);
    lines.push(`- **Subject:** ${d.subject}`);
    lines.push(`- **Manual approval required:** ${d.manual_approval_required ? 'yes' : 'NO — VIOLATION, do not send'}`);
    lines.push('');
    lines.push('```text');
    lines.push(d.body);
    lines.push('```');
    lines.push('');
  }
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

// ---------- main ----------

async function main() {
  const { source: profileSource, profile: rawProfile } = loadProfile();

  // Allow `SAM_SPRINT_PLAN=free|paid|...` to override the profile's
  // subscription.plan from the environment. Never accepts credentials,
  // billing IDs, or tokens — just a plan name. Default is free.
  const planEnv = process.env.SAM_SPRINT_PLAN;
  if (planEnv) {
    const { plan } = normalizePlan(planEnv);
    rawProfile.subscription = Object.assign({}, rawProfile.subscription || {}, {
      plan,
      is_paid: plan !== 'free',
      source: 'env_override',
    });
  }

  // Normalize early so we can echo a summary even on not_configured exit.
  const { profile, issues, isComplete } = normalizePursuitProfile(rawProfile);

  // Compute the entitlement preview here so we can show plan/NAICS
  // summary regardless of whether SAM_GOV_API_KEY is configured.
  const entitlement = getSamSprintEntitlement(profile);
  const naicsLimit = applyNaicsLimit(profile, entitlement);
  const entitlementLine = describeNaicsLimit(entitlement, naicsLimit.requested_count, naicsLimit.allowed_count);

  // Profile completeness — always printed so the operator knows whether
  // SAM Sprint rankings are preliminary or profile-driven.
  const completeness = calculateProfileCompleteness(profile);
  const scoringConfidence = (completeness.readiness_label === 'incomplete') ? 'preliminary' : 'profile_driven';

  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    console.log('[sam-sprint] status: not_configured');
    console.log(`[sam-sprint] profile source: ${profileSource}`);
    console.log(`[sam-sprint] profile readiness: ${completeness.readiness_label} (${completeness.percent}%, ${completeness.satisfied_count}/${completeness.total_field_count} fields)`);
    console.log(`[sam-sprint] missing profile fields: ${completeness.missing_fields.length}`);
    console.log(`[sam-sprint] scoring confidence: ${scoringConfidence}`);
    console.log(`[sam-sprint] plan: ${entitlement.plan} (paid=${entitlement.is_paid})`);
    console.log(`[sam-sprint] ${entitlementLine}`);
    if (naicsLimit.blocked_count > 0) {
      console.log(`[sam-sprint] withheld NAICS by free-plan limit: ${naicsLimit.blocked_count}`);
    }
    console.log('');
    console.log('SAM_GOV_API_KEY is not present in the process environment.');
    console.log('To configure (do NOT paste the key into chat or commit it):');
    console.log('  1. Obtain a key from https://open.gsa.gov/api/get-opportunities-public-api/');
    console.log('  2. Export it in the shell that will run this script:');
    console.log('       export SAM_GOV_API_KEY=...   # value omitted intentionally');
    console.log('  3. Re-run:  node scripts/sam-opportunity-sprint.js');
    console.log('');
    console.log('Exiting safely with status not_configured. No network calls were made.');
    console.log('(No reports were written; reports are only generated when the key is configured.)');
    process.exit(0);
    return;
  }

  console.log('[sam-sprint] status: running');
  console.log(`[sam-sprint] profile source: ${profileSource}`);
  console.log(`[sam-sprint] profile readiness: ${completeness.readiness_label} (${completeness.percent}%, ${completeness.satisfied_count}/${completeness.total_field_count} fields)`);
  console.log(`[sam-sprint] missing profile fields: ${completeness.missing_fields.length}`);
  console.log(`[sam-sprint] scoring confidence: ${scoringConfidence}`);
  if (scoringConfidence === 'preliminary') {
    console.log('[sam-sprint] WARNING: scoring is preliminary because the profile is incomplete; results will personalize once you configure identity, goal, NAICS, lanes, and geography.');
  }
  console.log(`[sam-sprint] plan: ${entitlement.plan} (paid=${entitlement.is_paid})`);
  console.log(`[sam-sprint] ${entitlementLine}`);
  if (naicsLimit.blocked_count > 0) {
    console.log(`[sam-sprint] withheld NAICS by free-plan limit: ${naicsLimit.blocked_count}`);
  }
  if (issues.length) {
    for (const i of issues) console.log(`[profile:${i.level}] ${i.field}: ${i.message}`);
  }

  const result = await runSprint({
    profile,
    getApiKey: async () => key,
    fetch: globalThis.fetch,
    now: () => Date.now(),
  });

  if (result.status === 'not_configured') {
    console.log('[sam-sprint] status: not_configured (post-init)');
    process.exit(0);
    return;
  }

  // Write reports.
  writeJson(path.join(REPORTS_DIR, 'sam-opportunity-sprint.json'), result);
  writeMd(path.join(REPORTS_DIR, 'sam-opportunity-sprint.md'), result);
  writeCsv(path.join(REPORTS_DIR, 'sam-outreach-targets.csv'), result.scored_opportunities);
  writeEmailDrafts(path.join(REPORTS_DIR, 'sam-email-drafts.md'), result.email_drafts || []);

  // Summary only.
  const top = (result.scored_opportunities || []).slice(0, 10);
  const act = top.slice(0, 3);
  const resultEnt = result.entitlement || (result.query_metadata && result.query_metadata.entitlement);
  console.log('');
  if (resultEnt) {
    console.log(`[sam-sprint] entitlement: ${resultEnt.message}`);
  }
  console.log(`[sam-sprint] raw: ${result.raw_count}, unique: ${result.unique_count}, errors: ${(result.errors || []).length}`);
  console.log('[sam-sprint] top 10:');
  for (let i = 0; i < top.length; i++) {
    const o = top[i];
    console.log(`  ${String(i + 1).padStart(2, ' ')}. [${o.fit_score} ${o.score_label}] closes=${o.daysUntilClose ?? '?'}d state=${(o.placeOfPerformance || {}).state || '-'} ${(o.title || '').slice(0, 80)}`);
  }
  console.log('[sam-sprint] top 3 act-first:');
  for (let i = 0; i < act.length; i++) {
    const o = act[i];
    console.log(`   ${i + 1}) ${o.title} — angle: ${o.recommended_pursuit_angle}`);
  }
  console.log('');
  console.log('[sam-sprint] reports:');
  console.log(`   - ${path.join(REPORTS_DIR, 'sam-opportunity-sprint.json')}`);
  console.log(`   - ${path.join(REPORTS_DIR, 'sam-opportunity-sprint.md')}`);
  console.log(`   - ${path.join(REPORTS_DIR, 'sam-outreach-targets.csv')}`);
  console.log(`   - ${path.join(REPORTS_DIR, 'sam-email-drafts.md')}`);
  console.log('[sam-sprint] manual review required before any outreach.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[sam-sprint] FATAL:', err && err.stack || err);
    process.exit(1);
  });
}

module.exports = { main };
