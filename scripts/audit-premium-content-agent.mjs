#!/usr/bin/env node
/**
 * Audit script for the SourceDeck Premium Content Agent.
 *
 * Verifies:
 *   1. Required docs exist
 *   2. Spec module exists
 *   3. "highest paid tier only" appears in docs (case-insensitive)
 *   4. "watsonx" appears in docs
 *   5. GitHub, GitLab, Bitbucket each appear in the ingestion doc
 *   6. Auto-posting claims are not made in docs unless backed by code
 *   7. LinkedIn hashtag list has 10–12 entries in spec
 *   8. Facebook hashtag list has 3–6 entries in spec
 *   9. No free-tier inclusion claim in docs or marketing copy
 *
 * Exits non-zero on any violation. Pure Node, no deps.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DOC_PATHS = [
  'docs/premium-content-agent.md',
  'docs/premium-content-agent-ingestion.md',
  'docs/premium-content-agent-prompt-strategy.md',
  'docs/examples/premium-content-agent-examples.md'
];

const SPEC_CANDIDATES = [
  'src/features/premiumContentAgent.ts',
  'src/lib/premiumContentAgent.ts',
  'src/content/premiumContentAgent.ts'
];

const MARKETING_GLOBS = [
  'app', 'pages', 'src/app', 'src/pages', 'src/components',
  'src/marketing', 'src/features', 'src/content', 'public'
];

let failures = 0;
let passes = 0;

function pass(msg) { passes++; console.log('  ✅ ' + msg); }
function fail(msg) { failures++; console.log('  ❌ ' + msg); }

function read(p) {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
  catch { return null; }
}

function exists(p) {
  try { return fs.existsSync(path.join(ROOT, p)); } catch { return false; }
}

function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === '.next') continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

console.log('── Premium Content Agent audit ──');

// 1. Required docs exist
for (const p of DOC_PATHS) {
  if (exists(p)) pass('doc exists: ' + p);
  else fail('missing doc: ' + p);
}

// 2. Spec module exists at one of the supported paths
const specPath = SPEC_CANDIDATES.find(p => exists(p));
if (specPath) pass('spec module exists: ' + specPath);
else fail('spec module missing — expected one of: ' + SPEC_CANDIDATES.join(', '));

// 3. "highest paid tier only" appears in docs (case-insensitive)
const docCorpus = DOC_PATHS.map(p => read(p) || '').join('\n').toLowerCase();
if (/highest paid tier only/.test(docCorpus)) pass('"highest paid tier only" present in docs');
else fail('"highest paid tier only" not found in docs');

// 4. "watsonx" appears in docs
if (/watsonx/i.test(docCorpus)) pass('"watsonx" present in docs');
else fail('"watsonx" not found in docs');

// 5. GitHub, GitLab, Bitbucket each appear in the ingestion doc
const ingestion = read('docs/premium-content-agent-ingestion.md') || '';
for (const k of ['GitHub', 'GitLab', 'Bitbucket']) {
  if (new RegExp(k, 'i').test(ingestion)) pass(k + ' present in ingestion doc');
  else fail(k + ' missing from ingestion doc');
}

// 6. Auto-post claims must be backed by code if present in docs.
//    We only flag *positive* claims — phrases like "does not auto-post",
//    "no auto-posting", "never auto-posts", and "without auto-posting"
//    are denials and do not count.
const autoPhraseRe = /(auto[- ]post(?:s|ing|ed)?|automatically posts?)/gi;
const NEGATION_RE = /\b(no|not|never|without|nothing|neither|none|cannot|can'?t|do(?:es)?\s+not|don'?t|doesn'?t|won'?t|will\s+not)\b/;
const docHasAutoClaim = (() => {
  let m;
  autoPhraseRe.lastIndex = 0;
  while ((m = autoPhraseRe.exec(docCorpus)) !== null) {
    // Look at the sentence-ish window before the match (up to 80 chars
    // or the previous sentence boundary, whichever is shorter).
    const start = Math.max(0, m.index - 80);
    const ctx = docCorpus.slice(start, m.index);
    const sentenceStart = Math.max(
      ctx.lastIndexOf('. '),
      ctx.lastIndexOf('\n'),
      0
    );
    const window = ctx.slice(sentenceStart);
    if (NEGATION_RE.test(window)) continue; // denial — skip
    return true; // positive auto-post claim
  }
  return false;
})();
const codeFiles = ['app', 'pages', 'src'].flatMap(walk);
const codeCorpus = codeFiles
  .filter(p => /\.(t|j)sx?$|\.mjs$|\.cjs$/.test(p))
  .map(p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } })
  .join('\n');
// "Backing code" heuristic: an actual publish/post function or an external
// publishing connector import.
const codeBacksAutoPost =
  /\b(publishPost|autoPublish|schedulePublish|postToLinkedIn|postToFacebook)\s*\(/.test(codeCorpus) ||
  /from\s+['"]@buffer\//.test(codeCorpus) ||
  /from\s+['"]@hootsuite\//.test(codeCorpus) ||
  /linkedin-api/.test(codeCorpus);
if (docHasAutoClaim && !codeBacksAutoPost) {
  fail('docs claim auto-posting but no backing code was found');
} else if (docHasAutoClaim && codeBacksAutoPost) {
  pass('auto-post claim in docs is backed by code in the repo');
} else {
  pass('no unsupported auto-post claims in docs');
}

// 7 & 8. Hashtag count rules — read the spec module and parse the two arrays.
if (specPath) {
  const specSrc = read(specPath) || '';
  const linkedinTags = extractTagArray(specSrc, 'linkedin');
  const facebookTags = extractTagArray(specSrc, 'facebook');
  if (linkedinTags == null) fail('could not parse linkedin tag array in spec');
  else if (linkedinTags.length >= 10 && linkedinTags.length <= 12)
    pass('LinkedIn hashtag count is ' + linkedinTags.length + ' (10–12 expected)');
  else fail('LinkedIn hashtag count is ' + linkedinTags.length + ' (expected 10–12)');

  if (facebookTags == null) fail('could not parse facebook tag array in spec');
  else if (facebookTags.length >= 3 && facebookTags.length <= 6)
    pass('Facebook hashtag count is ' + facebookTags.length + ' (3–6 expected)');
  else fail('Facebook hashtag count is ' + facebookTags.length + ' (expected 3–6)');
}

// 9. No free-tier inclusion claim in docs OR marketing copy
const marketingFiles = MARKETING_GLOBS.flatMap(walk).filter(p =>
  /\.(t|j)sx?$|\.mdx?$|\.html?$/.test(p)
);
const marketingCorpus = marketingFiles
  .map(p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } })
  .join('\n')
  .toLowerCase();
const combined = docCorpus + '\n' + marketingCorpus;
const freeTierClaimPhrases = [
  /available on free/gi,
  /free tier includes premium content agent/gi,
  /free plan includes premium content agent/gi,
  /included in (the )?free tier/gi,
  /free\b.{0,80}\bincludes\b.{0,80}\bpremium content agent/gi
];
const claimsFound = freeTierClaimPhrases.flatMap(re => findPositiveClaims(combined, re));
if (claimsFound.length === 0) pass('no free-tier inclusion claim in docs or marketing copy');
else fail('found free-tier inclusion claim(s): ' + claimsFound.join(' | '));

console.log('');
console.log('── Summary ──');
console.log('  passes:   ' + passes);
console.log('  failures: ' + failures);

if (failures > 0) {
  console.log('\nFAIL');
  process.exit(1);
} else {
  console.log('\nPASS');
}

// ── helpers ─────────────────────────────────────────────────────────

function extractTagArray(src, platform) {
  // Match the `tags: [ ... ]` array that follows the platform key
  // inside `hashtagSchemas`. Deliberately tolerant; we don't want to
  // depend on TS pretty-printing.
  const platformRe = new RegExp(
    platform + '\\s*:\\s*\\{[^}]*tags\\s*:\\s*\\[([^\\]]+)\\]',
    'i'
  );
  const m = src.match(platformRe);
  if (!m) return null;
  const inner = m[1];
  const tags = inner.match(/'([^']+)'|"([^"]+)"|`([^`]+)`/g) || [];
  return tags;
}

function findPositiveClaims(src, re) {
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(src)) !== null) {
    const start = Math.max(0, m.index - 100);
    const ctx = src.slice(start, m.index);
    const sentenceStart = Math.max(
      ctx.lastIndexOf('. '),
      ctx.lastIndexOf('\n'),
      0
    );
    const window = ctx.slice(sentenceStart);
    if (NEGATION_RE.test(window)) continue;
    out.push(re.source);
  }
  return out;
}
