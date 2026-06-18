// Phase 25AG · HTML / app-shell preview is blocked
// ──────────────────────────────────────────────────────────────────────
// The root cause of the freeze: govcon:preview-package-file treated
// .html / .htm as inline text. SAM.gov / linked resources sometimes
// return portal pages, error pages, or app-shell HTML. The viewer then
// dumped raw HTML (and, in the worst case, SourceDeck's own UI/CSS
// text) into the right-side panel and froze the renderer.
//
// Phase 25AG removes .html / .htm from TEXT_EXT, adds an explicit
// HTML branch that returns kind:'fallback' reason:'html_not_previewable',
// and adds an app-shell detector that refuses to surface even text
// files whose content matches SourceDeck UI markers.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AG · HTML / app-shell preview blocked');

// ── Static guarantees ───────────────────────────────────────────────
assert(/function looksLikeSourceDeckAppShellPreview/.test(mainSrc),
  'looksLikeSourceDeckAppShellPreview helper is defined');
assert(/const TEXT_EXT = \[[^\]]+\]/.test(mainSrc),
  'TEXT_EXT constant is defined');
// .html / .htm must NOT be in TEXT_EXT.
const textExtMatch = mainSrc.match(/const TEXT_EXT = \[([^\]]+)\]/);
assert(textExtMatch && !/['"]?\.html['"]?/.test(textExtMatch[1]),
  'TEXT_EXT does not include .html');
assert(textExtMatch && !/['"]?\.htm['"]?/.test(textExtMatch[1]),
  'TEXT_EXT does not include .htm');
// The HTML branch must fire BEFORE the text branch and return the
// canonical fallback reason.
assert(/ext === '\.html' \|\| ext === '\.htm'[\s\S]{0,400}reason: 'html_not_previewable'/.test(mainSrc),
  'HTML / HTM extensions trigger the html_not_previewable fallback before text branch');
// App-shell guard runs inside the text branch.
assert(/looksLikeSourceDeckAppShellPreview\(raw\)[\s\S]{0,300}reason: 'app_shell_preview_blocked'/.test(mainSrc),
  'App-shell detector returns app_shell_preview_blocked fallback');
// Text preview is capped.
assert(/const MAX_TEXT_PREVIEW_CHARS = \d+/.test(mainSrc),
  'MAX_TEXT_PREVIEW_CHARS cap is defined');
assert(/truncated = charCount > MAX_TEXT_PREVIEW_CHARS/.test(mainSrc),
  'Text preview marks truncated:true when over the cap');
assert(/raw\.slice\(0, MAX_TEXT_PREVIEW_CHARS\)/.test(mainSrc),
  'Truncated text is sliced to the cap; full payload is never sent to renderer');

// ── Functional: drive the detector helper ──────────────────────────
function loadHelper(){
  const src = mainSrc;
  const start = src.indexOf('function looksLikeSourceDeckAppShellPreview');
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++){
    if (src[i] === '{') depth++;
    else if (src[i] === '}'){
      depth--;
      if (depth === 0){ end = i + 1; break; }
    }
  }
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src.slice(start, end) + '; this.looksLikeSourceDeckAppShellPreview = looksLikeSourceDeckAppShellPreview;', sandbox);
  return sandbox.looksLikeSourceDeckAppShellPreview;
}

const detector = loadHelper();

// A real solicitation description should pass through.
assert(detector('SOLICITATION SF1449. The Department of the Navy seeks janitorial services for Naval Station Norfolk.\nResponse due: 2026-07-15.') === false,
  'Real solicitation text is NOT flagged as app-shell');
// SourceDeck UI dump must be flagged.
const dump = 'SourceDeck GovCon Pipeline — Expected — Leads — LIVE EN ES\n.cmd-flow { display: flex; }\n.cmd-pill { padding: 4px 8px; }';
assert(detector(dump) === true,
  'Text containing SourceDeck GovCon Pipeline + .cmd-flow is flagged as app-shell');
// Multiple markers in different orders trip the threshold.
assert(detector('Operating Hub\nGovCon Find Opportunities\nLorem ipsum') === true,
  '"Operating Hub" + "GovCon Find Opportunities" combination is flagged');
// Single marker is not enough — avoid false positives on solicitations
// that happen to mention "SourceDeck" in passing.
assert(detector('SourceDeck GovCon Pipeline is awesome\nbut nothing else matches') === false,
  'A single SourceDeck marker is not enough to block (avoids false positives)');
// Empty / null safe.
assert(detector('') === false, 'Empty string is safe');
assert(detector(null) === false, 'null is safe');
assert(detector(undefined) === false, 'undefined is safe');

console.log(process.exitCode ? 'Phase 25AG · HTML / app-shell preview blocked: FAILED' : 'Phase 25AG · HTML / app-shell preview blocked: OK');
