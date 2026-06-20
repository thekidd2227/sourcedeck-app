// Phase 25N · GovCon copy cleanup
// ──────────────────────────────────────────────────────────────────────
// Even though every Overview-y section is now hidden by default, the
// strings inside them remain in source for the underlying tests. We
// verify that the Find Opportunities surface (the new default
// landing) does not contain stale demo / internal language, and that
// the broader runtime keeps the concise no-send / no-submit /
// no-upload safety copy.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25N · GovCon copy cleanup');

// ── Slice out the Find Opportunities tab body ────────────────────────
const findStart = html.indexOf('id="gc-tab-find-opportunities"');
const findEnd = html.indexOf('</section>', findStart);
const find = html.slice(findStart, findEnd);

// ── Banned demo / internal copy is NOT in the default landing ──────
const bannedInLanding = [
  'this demo focuses',
  'Other business tools remain available',
  'operator-loaded SAMPLE',
  'Sample demo data loaded',
  'Replace before proposal use',
  'Last updated: 2026-06-04',
  'GovCon Mode — Capture OS workflow',
  'GovCon Outreach OS'
];
bannedInLanding.forEach(function(s){
  assert(!find.toLowerCase().includes(s.toLowerCase()),
    'Find Opportunities tab does NOT contain stale copy: "' + s + '"');
});

// ── Allowed safety copy still appears somewhere (e.g. in the tab) ───
const allowedSafety = [
  'Drafts only. Human approval required.',
  'SourceDeck does not submit bids, quotes, or government responses.'
];
allowedSafety.forEach(function(s){
  assert(html.includes(s),
    'Allowed concise safety copy is preserved: "' + s + '"');
});

// ── Find Opportunities empty-state copy matches the contract ────────
assert(/Search SAM\.gov or upload a solicitation to begin\./.test(html),
  'Phase 25N empty-state copy is present');

// ── No raw API key copy / no stale 2026-06-04 timestamp in Find tab ─
assert(!/2026-06-04/.test(find),
  'Find Opportunities does not carry the stale "2026-06-04" timestamp');

// ── No affirmative submission / upload claims globally ──────────────
// (Negation phrases inside comments / docs are stripped before scan.)
// The Phase 25I farBuildReviewPrompt builder is a model instruction —
// not user-facing UI copy — and deliberately enumerates the banned
// claims ("certified compliant" / "legally sufficient" / "FAR
// certified") so the AI is told NOT to use them. That negative guard
// is asserted verbatim by test/phase-25i-far-upload-review.test.js, so
// it is excluded here to avoid a false "affirmative claim" positive.
const stripped = html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/window\.farBuildReviewPrompt\s*=\s*function[\s\S]*?\n\s*\};/, '');
const forbidden = [
  { re: />\s*Submit Bid\s*</, label: 'Submit Bid button' },
  { re: />\s*Submit Quote\s*</, label: 'Submit Quote button' },
  { re: />\s*Send Email\s*</, label: 'Send Email button' },
  { re: /\bupload to SAM\b/i, label: 'upload to SAM' },
  { re: /\bupload to PIEE\b/i, label: 'upload to PIEE' },
  { re: /\bupload to eBuy\b/i, label: 'upload to eBuy' },
  { re: /\bauto[-\s]?contact (?:vendors|agencies)\b/i, label: 'auto-contact vendors/agencies' },
  { re: /\bcertified compliant\b/i, label: 'certified compliant' },
  { re: /\blegally sufficient\b/i, label: 'legally sufficient' },
  { re: /\bprovides legal advice\b/i, label: 'provides legal advice' }
];
forbidden.forEach(function(f){
  assert(!f.re.test(stripped),
    'No affirmative "' + f.label + '" claim present in renderer');
});

// ── No raw SAM key input on the Find Opportunities tab ──────────────
assert(!/type="password"/.test(find),
  'Find Opportunities does NOT include a password-type input');
assert(!/id="s-samkey"/.test(find),
  'Find Opportunities does NOT host the Settings SAM key input');

console.log(process.exitCode ? 'Phase 25N · GovCon copy cleanup: FAILED' : 'Phase 25N · GovCon copy cleanup: OK');
