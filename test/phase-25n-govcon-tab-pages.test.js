// Phase 25N · GovCon tab-page navigation
// ──────────────────────────────────────────────────────────────────────
// Asserts the GovCon pane uses a real tab-page architecture instead of
// the Phase 25F "Jump to" scroll-pill bar. Every tab in the row has a
// matching tab-page; the tab-switcher hides every other page when one
// is active. The default landing is Find Opportunities (not the
// retired Overview).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25N · GovCon tab-page navigation');

// ── Tab nav exists with the Phase 25N marker ─────────────────────────
assert(/id="gc-tab-nav"/.test(html),
  'GovCon tab navigation container exists');
assert(/data-phase-25n="govcon-tab-nav"/.test(html),
  'Tab nav carries the Phase 25N marker');
assert(/role="tablist"/.test(html),
  'Tab nav declares ARIA role=tablist');

// ── All required tabs are present ────────────────────────────────────
const required = [
  { tab: 'find-opportunities',   label: 'Find Opportunities'    },
  { tab: 'saved-pursuits',       label: 'Saved Pursuits'        },
  // Phase 25R — "Solicitation" renamed "Solicitation Center"; Audit Log moved
  // out of GovCon to Settings → Audit Log; Contract Awards relabeled
  // "Federal Procurement Data" (tab id retained).
  { tab: 'solicitation',         label: 'Solicitation Center'   },
  // Phase 25V — Scope tab removed (lives in Proposal Workspace intake);
  // Vendors + Pricing split into two focused tabs; Prime Partners promoted
  // to its own GovCon tab.
  { tab: 'vendors',              label: 'Vendors'               },
  { tab: 'pricing',              label: 'Pricing'               },
  { tab: 'past-performance',     label: 'Past Performance'      },
  { tab: 'prime-partners',       label: 'Prime Partners'        },
  { tab: 'far-reference',        label: 'FAR Reference'         },
  { tab: 'submission-readiness', label: 'Submission Readiness'  },
  { tab: 'contract-awards',      label: 'Federal Procurement Data' }
];
required.forEach(function(r){
  const buttonRe = new RegExp('data-gc-tab="' + r.tab + '"[\\s\\S]{0,500}>' + r.label.replace(/[.*+?^${}()|[\]\\+]/g, '\\$&') + '<');
  assert(buttonRe.test(html),
    'Tab button "' + r.label + '" (data-gc-tab="' + r.tab + '") is present');
  const pageRe = new RegExp('data-gc-tab-page="' + r.tab + '"');
  assert(pageRe.test(html),
    'Tab page "' + r.tab + '" (data-gc-tab-page) is present');
});

// ── Find Opportunities is the default landing ────────────────────────
assert(/<button type="button" class="gc-tab-btn active"[^>]*aria-selected="true"[^>]*data-gc-tab="find-opportunities"/.test(html),
  'Find Opportunities tab is marked active + aria-selected=true on cold open');
assert(/DEFAULT_TAB\s*=\s*'find-opportunities'/.test(html),
  'JS DEFAULT_TAB constant resolves to find-opportunities');

// ── Find Opportunities tab carries the intake controls ──────────────
assert(/id="gc-tab-search-sam-btn"/.test(html),
  'Find Opportunities tab exposes a Search SAM.gov button');
assert(/data-gc-find-action="search-sam"/.test(html),
  'Search SAM.gov action is tagged');
assert(/data-gc-find-action="upload-solicitation"/.test(html),
  'Upload Solicitation action is tagged');
assert(!/data-gc-find-action="download-package"/.test(html),
  'Find Opportunities no longer offers automatic package download');
assert(/Search SAM\.gov or upload a solicitation to begin\./.test(html),
  'Find Opportunities empty-state copy is present (no download wording)');

// ── SAM.gov key presence-only status on the tab ─────────────────────
assert(/id="gc-tab-sam-key-status"/.test(html),
  'SAM.gov key presence-only status pill is present on Find Opportunities');
assert(/SAM\.gov key: checking…/.test(html),
  'Key status defaults to "checking…" before refresh');
assert(/id="gc-tab-sam-key-missing"/.test(html),
  'Key-missing banner exists on the tab');
const findStart = html.indexOf('id="gc-tab-find-opportunities"');
const findEnd = html.indexOf('</section>', findStart);
const findSlice = html.slice(findStart, findEnd);
assert(!/type="password"/.test(findSlice),
  'Find Opportunities tab does NOT contain a password-type input');
assert(!/id="s-samkey"/.test(findSlice),
  'Find Opportunities tab does NOT host the Settings SAM key input');

// ── Tab-switcher JS hides every page except the active one ───────────
assert(/window\.gcTabSwitch = function\(tabId\)/.test(html),
  'window.gcTabSwitch is defined');
assert(/getAttribute\('data-gc-tab-page'\)/.test(html),
  'gcTabSwitch reads data-gc-tab-page on every section');
assert(/style\.display = \(pages\[i\]\.getAttribute\('data-gc-tab-page'\) === id\) \? '' : 'none'/.test(html),
  'gcTabSwitch hides every non-matching page via style.display=none');

// ── Sandbox simulation: switching tab hides others ──────────────────
try {
  var pages = [
    { tab: 'find-opportunities', d: '' },
    { tab: 'saved-pursuits',     d: '' },
    { tab: 'solicitation',       d: '' },
    { tab: 'hidden-internal',    d: '' }
  ];
  var sandbox = {
    pages: pages,
    activated: null,
    document: {
      querySelectorAll: function(sel){
        if (sel.indexOf('data-gc-tab-page') >= 0){
          return pages.map(function(p){
            return {
              _tab: p.tab,
              getAttribute: function(name){ if (name === 'data-gc-tab-page') return this._tab; return null; },
              style: { set display(v){ p.d = v; }, get display(){ return p.d; } },
              classList: { add: function(){}, remove: function(){} },
              setAttribute: function(){}
            };
          });
        }
        if (sel.indexOf('data-gc-tab') >= 0){
          return [];
        }
        return [];
      },
      getElementById: function(){ return null; },
      addEventListener: function(){},
      readyState: 'complete'
    },
    window: { sd: null, toast: function(){} },
    localStorage: { setItem: function(){}, getItem: function(){ return null; } },
    setTimeout: function(fn){ try { fn(); } catch (e) {} },
    console: console
  };
  vm.createContext(sandbox);
  // Extract the IIFE body for gcTabSwitch and run a single switch.
  var iifeStart = html.indexOf('/* Phase 25N — GovCon tab-page switcher');
  var iifeEnd = html.indexOf('</script>', iifeStart);
  var iife = html.slice(iifeStart, iifeEnd);
  vm.runInContext(iife, sandbox);
  vm.runInContext('try { window.gcTabSwitch("saved-pursuits"); } catch(e){ console.error("switch err:", e.message); }', sandbox);
  var displays = pages.reduce(function(acc, p){ acc[p.tab] = p.d; return acc; }, {});
  assert(displays['saved-pursuits'] === '',
    'After gcTabSwitch("saved-pursuits"), the saved-pursuits page is shown (display=\"\")');
  assert(displays['find-opportunities'] === 'none',
    'After switching, find-opportunities is hidden (display=none)');
  assert(displays['hidden-internal'] === 'none',
    'hidden-internal sections stay hidden after any switch');
} catch (e) {
  assert(false, 'Tab-switch sandbox simulation failed: ' + e.message);
}

// ── lastTab persistence ─────────────────────────────────────────────
assert(/localStorage\.setItem\('sd\.govcon\.lastTab', id\)/.test(html),
  'Last active tab is persisted to localStorage');

console.log(process.exitCode ? 'Phase 25N · GovCon tab-page navigation: FAILED' : 'Phase 25N · GovCon tab-page navigation: OK');
