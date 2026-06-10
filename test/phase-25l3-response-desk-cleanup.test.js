// Phase 25L-3 · Response Desk cleanup
// ──────────────────────────────────────────────────────────────────────
// Response Desk header is title-only (no operational subtitle). The
// import-first header copy is provider-gated: Import Email uses the
// configured email integration if set up in Settings → Email Import;
// otherwise the user pastes the reply manually. The pane carries no
// ICS / calendar import controls — calendar setup belongs in
// Settings → Calendar Import. The Airtable Email Events ledger error
// no longer surfaces as an active red banner in the buyer UI.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'sourcedeck.html'),
  'utf8'
);

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25L-3 · Response Desk cleanup');

// ── Extract the Response Desk pane slice ─────────────────────────────
const paneStart = html.indexOf('id="tab-reply"');
const paneEnd = html.indexOf('<div class="tab-pane"', paneStart + 1);
const pane = html.slice(paneStart, paneEnd === -1 ? html.length : paneEnd);

// ── Pane title is exactly "Response Desk"; subtitle removed ──────────
assert(pane.includes('<span class="brief-head">Response Desk</span>'),
  'Response Desk pane title is "Response Desk"');
assert(!pane.includes('Inbound reply triage · intent detection · next-action routing · draft-only responses'),
  'Pre-25L-3 operational subtitle is removed');
assert(!/<div class="pane-sub">[^<]*Inbound reply triage/.test(pane),
  'No subtitle containing "Inbound reply triage" remains in the pane header');

// ── Import Email + Paste Reply Manually buttons preserved ────────────
assert(/onclick="rdOpenImport\(\)"/.test(pane),
  'Import Email button is preserved');
assert(/onclick="rdFocusPaste\(\)"/.test(pane),
  'Paste Reply Manually button is preserved');

// ── Provider-gated copy ──────────────────────────────────────────────
assert(/Import Email uses your configured email integration if set up in Settings/.test(pane),
  'Import-first header explains provider gating via Settings → Email Import');
assert(/Otherwise, paste the reply manually/.test(pane),
  'Import-first header steers to manual paste fallback');
assert(/No email integration configured\. Paste the reply manually or set up email import in Settings when available\./.test(pane),
  'Import-first header carries the explicit "no email integration configured" sentence');
assert(/SourceDeck does not auto-scan email/.test(pane),
  'Import-first header reiterates no auto-scan');
assert(/SourceDeck[^.]*never requests Gmail, iCloud, or Outlook passwords/.test(pane),
  'Import-first header reiterates no password collection');

// ── No ICS / calendar import controls inside Response Desk ───────────
const calendarPatterns = [
  /Import \.ics/i,
  /Paste Calendar Text/i,
  /calOpenIcsPicker\(/i,
  /calOpenPasteModal\(/i,
  /calToggleIcsHelp\(/i
];
calendarPatterns.forEach(function(re){
  assert(!re.test(pane),
    'Response Desk pane does not contain a calendar/ICS control matching ' + re);
});

// ── Airtable Email Events ledger active red banner is neutralized ────
// The pre-25L-3 buyer-facing surfaces showed a prominent red "⚠ EMAIL
// EVENTS LEDGER UNAVAILABLE" banner when the ledger fetch failed.
// Phase 25L-3 replaces that with a calm "no email integration
// configured" placeholder while preserving the operator-facing error
// in _emailTrackerState.error.
assert(!html.includes('⚠ EMAIL EVENTS LEDGER UNAVAILABLE'),
  'Buyer-facing ⚠ EMAIL EVENTS LEDGER UNAVAILABLE banner is removed');
assert(!html.includes("'<span style=\"color:var(--red);font-weight:700\">⚠ Ledger: '"),
  'Buyer-facing red ⚠ Ledger error sub-header is removed');
assert(html.includes('No email integration configured · Set up Email Import in Settings'),
  'Email Tracker sub-header falls back to calm "no email integration configured" copy on error');
assert(html.includes('No email integration configured</div>'),
  'Email Tracker tbody falls back to calm placeholder on error');

console.log(process.exitCode ? 'Phase 25L-3 · Response Desk cleanup: FAILED' : 'Phase 25L-3 · Response Desk cleanup: OK');
