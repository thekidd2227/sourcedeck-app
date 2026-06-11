// Phase 25O · AI Lead Builder clarity
// ──────────────────────────────────────────────────────────────────────
// The AI Lead Builder header no longer carries the long pre-25O
// subtitle "AI-assisted prospect research → save to your CRM". The
// header shows only "AI Lead Builder". Concise scope + provider/
// status copy now lives inside the Target Profile area where the
// buyer reads it at the moment of intent.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25O · AI Lead Builder clarity');

// ── Slice out the AI Lead Builder pane ───────────────────────────────
const paneStart = html.indexOf('id="tab-aigenerate"');
const paneEnd = html.indexOf('<div class="tab-pane"', paneStart + 1);
const pane = html.slice(paneStart, paneEnd === -1 ? paneStart + 30000 : paneEnd);

// ── Header is title-only ─────────────────────────────────────────────
const headerStart = pane.indexOf('<div class="pane-hdr">');
const headerEnd = pane.indexOf('</div>\n      </div>\n      <div class="pane-body">', headerStart);
const header = pane.slice(headerStart, headerEnd === -1 ? headerStart + 4000 : headerEnd);

assert(header.includes('<span class="brief-head">AI Lead Builder</span>'),
  'Header carries the "AI Lead Builder" title');
assert(!header.includes('AI-assisted prospect research'),
  'Pre-25O subtitle phrase "AI-assisted prospect research" is removed from the header');
assert(!header.includes('save to your CRM'),
  'Pre-25O subtitle phrase "save to your CRM" is removed from the header');
assert(!/<div class="pane-sub">[^<]*(?:AI-assisted prospect research|save to your CRM)/.test(header),
  'Header does not host any pane-sub containing the retired subtitle');

// ── Scope copy lives INSIDE the body, not under the title ───────────
assert(/data-ag-scope-card="true"/.test(pane),
  'Phase 25O scope card lands inside the pane body');
assert(/data-ag-scope-explanation="true"/.test(pane),
  'Scope explanation block carries its data attribute');
assert(pane.includes('Create organization leads only. SourceDeck can help research businesses, government agencies, prime contractors, subcontractors/vendors, and commercial prospects. It does not generate residential consumer leads.'),
  'Organization-lead explanation copy matches the contract verbatim');

// ── Residential / consumer lead generation is explicitly disclaimed ──
assert(/does not generate residential consumer leads/.test(pane),
  'AI Lead Builder explicitly disclaims residential consumer lead generation');
// And no affirmative residential-lead-generation claim exists.
const affirmativeResidential = /generates? (?:residential|consumer) leads\b/i;
assert(!affirmativeResidential.test(pane),
  'No affirmative "generates residential / consumer leads" claim');

// ── Provider / status bullets ────────────────────────────────────────
const requiredBullets = [
  { id: 'ag-provider-required',     copy: 'Live lead lookup requires a configured provider in Settings.' },
  { id: 'ag-hunter-optional',       copy: 'Hunter.io is optional for contact enrichment.' },
  { id: 'ag-no-provider-fallback',  copy: 'If no provider is configured, SourceDeck can draft a lead-search plan, but it cannot pull verified live leads.' }
];
requiredBullets.forEach(function(b){
  assert(pane.includes('id="' + b.id + '"'),
    'Provider/status bullet "' + b.id + '" is present');
  assert(pane.includes(b.copy),
    'Bullet copy matches contract for "' + b.id + '"');
});

console.log(process.exitCode ? 'Phase 25O · AI Lead Builder clarity: FAILED' : 'Phase 25O · AI Lead Builder clarity: OK');
