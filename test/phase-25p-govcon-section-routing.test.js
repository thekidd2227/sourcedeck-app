// Phase 25P · GovCon section routing reconciliation
// ──────────────────────────────────────────────────────────────────────
// After PR #115 (Phase 25M) merged on top of PR #116 (Phase 25N) the
// Phase 25M `#gc-sam-pipeline` section landed inside `#tab-govcon`
// WITHOUT a `data-gc-tab-page` attribute. Because the Phase 25N
// `gcTabSwitch()` tab-page switcher only hides elements that carry
// the attribute, `#gc-sam-pipeline` was rendering under every tab in
// the GovCon pane — a regression buyers can see immediately on
// rebuild.
//
// Phase 25P routes `#gc-sam-pipeline` to the Find Opportunities tab
// (`data-gc-tab-page="find-opportunities"` + inline display:none)
// and adds this regression test so any future top-level `<section>`
// added directly inside `#tab-govcon` must declare a tab page.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25P · GovCon section routing reconciliation');

// ── Phase 25M #gc-sam-pipeline routing ──────────────────────────────
// Phase 25P initially routed this section to "find-opportunities" to
// give it a home after Phase 25N. Phase 25R then retired the duplicate
// SAM search section entirely (merged its filters into the canonical
// #gc-tab-find-opportunities) and routed gc-sam-pipeline to the
// hidden-internal buffer. The original Phase 25P invariant that
// matters survives: the section IS routed (data-gc-tab-page is
// present) AND it starts with inline display:none.
const samPipelineMatch = html.match(/<section[^>]*id="gc-sam-pipeline"[^>]*>/);
assert(samPipelineMatch, 'Phase 25M #gc-sam-pipeline section still exists in DOM');
if (samPipelineMatch){
  assert(/data-gc-tab-page="(?:find-opportunities|hidden-internal)"/.test(samPipelineMatch[0]),
    '#gc-sam-pipeline carries data-gc-tab-page routing (find-opportunities or hidden-internal after Phase 25R)');
  assert(/style="display:none/.test(samPipelineMatch[0]),
    '#gc-sam-pipeline starts with inline display:none so gcTabSwitch can control it');
}

// ── No top-level <section> directly inside #tab-govcon may lack
//    data-gc-tab-page. (We allow nested sections — only the ones at
//    the same indentation level as the existing tab-page sections.)
const govconStart = html.indexOf('<div class="tab-pane active" id="tab-govcon">');
const govconEnd = html.indexOf('<!-- ═══════ PRIME PARTNER FINDER ═══════ -->', govconStart);
const govcon = html.slice(govconStart, govconEnd === -1 ? govconStart + 200000 : govconEnd);

// Top-level sections inside the GovCon pane are indented exactly 8
// spaces (`        <section`). Capture each one and verify routing.
const topLevelSections = govcon.match(/\n        <section[^>]*>/g) || [];
assert(topLevelSections.length > 0, 'GovCon pane contains top-level <section> elements');
topLevelSections.forEach(function(section){
  // Strip leading whitespace + newline so the match excerpt is clean.
  const trimmed = section.replace(/^\n\s*/, '');
  assert(/data-gc-tab-page=/.test(trimmed),
    'Top-level GovCon <section> carries data-gc-tab-page routing: ' + trimmed.slice(0, 120) + '…');
});

// ── gcTabSwitch hides every [data-gc-tab-page] not matching id ──────
assert(/style\.display = \(pages\[i\]\.getAttribute\('data-gc-tab-page'\) === id\) \? '' : 'none'/.test(html),
  'gcTabSwitch() relies on data-gc-tab-page; sections without it will render under every tab (regression guard)');

console.log(process.exitCode ? 'Phase 25P · GovCon section routing: FAILED' : 'Phase 25P · GovCon section routing: OK');
