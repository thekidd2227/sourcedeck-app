// Phase 25AM · Fetch-only SAM.gov notice architecture
// ──────────────────────────────────────────────────────────────────────
// The entire Phase 25AB–25AL package download / preview / extraction
// chain is gone. Replaced by a single fetch-only service that returns
// structured metadata + api_key-stripped resource URLs. The renderer
// hands resource URLs to shell.openExternal; SourceDeck never touches
// solicitation bytes.

const fs = require('fs');
const path = require('path');
const svc = require(path.join('..', 'services', 'govcon', 'sam-notice-fetch.js'));

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AM · Fetch-only SAM.gov notice architecture');

// ── The retired REMOTE services are gone ────────────────────────────
// Phase 25AN note: the remote downloader (sam-package-download.js) and the
// remote source-body fetcher (sam-source-fetch.js) stay retired. The local
// extraction engine (solicitation-package-extract.js, sam-body-classifier.js,
// package-file-validator.js) is restored as an UPLOAD/IMPORT-ONLY service
// (no remote fetching) and is therefore expected to exist on disk again.
[
  'services/govcon/sam-package-download.js',
  'services/govcon/sam-source-fetch.js'
].forEach(p => {
  assert(!fs.existsSync(path.join(__dirname, '..', p)),
    'Retired REMOTE service is removed from disk: ' + p);
});

const mainSrc    = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const preloadSrc = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
const apiSrc     = fs.readFileSync(path.join(__dirname, '..', 'api', 'index.js'), 'utf8');
const html       = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');

[
  'govcon:download-solicitation-package',
  'govcon:extract-solicitation-package',
  'govcon:validate-package-files',
  'govcon:explain-solicitation-package',
  'govcon:open-solicitation-package-folder',
  'govcon:save-package-copy',
  'govcon:preview-package-file',
  'govcon:sam-fetch-source'
].forEach(ch => {
  assert(!new RegExp("ipcMain\\.handle\\('" + ch.replace(/[.\-]/g, m => '\\' + m) + "'").test(mainSrc),
    'Retired IPC handler is removed: ' + ch);
});

assert(/ipcMain\.handle\('govcon:sam-fetch-notice'/.test(mainSrc),
  'New IPC handler govcon:sam-fetch-notice is wired in main.js');
assert(/samFetchNotice:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('govcon:sam-fetch-notice'/.test(preloadSrc),
  'New preload bridge sd.govcon.samFetchNotice is exposed');
assert(/fetchNotice:\s*\(payload\)\s*=>\s*samNoticeFetch\.fetchNotice/.test(apiSrc),
  'New api.govcon.sam.fetchNotice is wired in api/index.js');

// ── The retired preload bridges are gone ────────────────────────────
[
  'downloadSolicitationPackage',
  'extractSolicitationPackage',
  'validatePackageFiles',
  'explainSolicitationPackage',
  'openSolicitationPackageFolder',
  'savePackageCopy',
  'previewPackageFile',
  'samFetchSource'
].forEach(name => {
  assert(!new RegExp(name + ':\\s*\\(').test(preloadSrc),
    'Retired preload bridge removed: ' + name);
});

// ── Renderer entry points neutralized ───────────────────────────────
assert(/Phase 25AM/.test(html),
  'sourcedeck.html carries Phase 25AM marker');
assert(/window\.gcABDownloadPackage = async function/.test(html),
  'gcABDownloadPackage still exposed as the user-facing entry point');
assert(/samFetchNotice\(\{ noticeId: noticeId \}\)/.test(html),
  'gcABDownloadPackage routes through the new fetchNotice IPC');
assert(/gcOpenExternal\(browserUrl, 'SAM\.gov notice'\)/.test(html),
  'gcABDownloadPackage opens the notice in the user\'s default browser');
// renderSourcePanel must not read sm.package / sm.description / sm.resources
const panelStart = html.indexOf('function renderSourcePanel(');
const panelEnd = html.indexOf('\n  }', panelStart);
const panelBody = html.slice(panelStart, panelEnd === -1 ? panelStart + 8000 : panelEnd);
assert(!/sm\.package/.test(panelBody),
  'renderSourcePanel never reads sm.package');
assert(!/sm\.description/.test(panelBody),
  'renderSourcePanel never reads sm.description');
assert(!/sm\.resources/.test(panelBody),
  'renderSourcePanel never reads sm.resources');
assert(!/innerHTML\s*=/.test(panelBody),
  'renderSourcePanel never assigns innerHTML (DOM construction + textContent only)');
assert(/textContent = String/.test(panelBody),
  'renderSourcePanel writes content via textContent');

// ── Retired handlers short-circuit before legacy bodies run ─────────
[
  ['gcW25FetchDescription', 'Description now lives on the SAM.gov notice'],
  ['gcW25ImportResource',    'Resource links now open in your browser'],
  ['gcABExtractPackageToCenter', 'Extraction now reads only uploaded files'],
  ['gcACPreviewFile',        'right-side viewer is no longer wired to file content'],
  ['gcABViewAttachment',     'Attachments now live on SAM.gov']
].forEach(([fn, copy]) => {
  // Match the declaration specifically (= async function | = function),
  // not inline references like `typeof window.fn === 'function'`.
  const declRe = new RegExp('window\\.' + fn + '\\s*=\\s*(?:async\\s+)?function');
  const m = html.match(declRe);
  if (!m){ assert(false, fn + ' is defined'); return; }
  const idx = m.index;
  const after = html.slice(idx, idx + 1500);
  assert(after.indexOf('Phase 25AM') >= 0,
    fn + ' carries Phase 25AM marker');
  assert(after.indexOf(copy) >= 0 || /return\s*;?\s*\n/.test(after.slice(0, 600)),
    fn + ' short-circuits with the retired-feature notice');
});

assert(/window\.gcW25CollectSourceText = function/.test(html),
  'gcW25CollectSourceText is defined');
assert(/window\.gcW25CollectSourceText = function\(_solId\)\{\s*\n\s*\/\/ Phase 25AM/.test(html),
  'gcW25CollectSourceText short-circuits to return empty string');

// ── Sandbox: drive the new service against mocked SAM.gov responses ─
(async function(){
  const SAMPLE_REC = {
    noticeId: 'abc-123',
    title: 'Janitorial Services — Naval Station Norfolk',
    solicitationNumber: 'N00189-26-R-0001',
    fullParentPathName: 'DEPT OF DEFENSE',
    naicsCode: '561720',
    typeOfSetAsideDescription: 'Total Small Business',
    postedDate: '2026-06-01',
    responseDeadLine: '2026-08-01',
    placeOfPerformance: { city: { name: 'Norfolk' }, state: { code: 'VA' }, zip: '23511', country: { code: 'USA' } },
    pointOfContact: [{ fullName: 'J. Doe', email: 'j.doe@example.mil', phone: '555-0100' }],
    description: 'https://api.sam.gov/prod/opportunities/v1/noticedesc?noticeid=abc-123',
    uiLink: 'https://sam.gov/opp/abc-123/view',
    resourceLinks: [
      'https://sam.gov/api/prod/opps/v3/opportunities/resources/files/r1/download?api_key=SECRETKEY',
      { url: 'https://sam.gov/api/prod/opps/v3/opportunities/resources/files/r2/download', name: 'attachment2.pdf' }
    ]
  };

  let lastUrl = '';
  const fetcher = svc.createSamNoticeFetchService({
    getApiKey: async () => 'TESTKEY999',
    fetch: async (url) => {
      lastUrl = url;
      return {
        ok: true, status: 200,
        json: async () => ({ totalRecords: 1, opportunitiesData: [SAMPLE_REC] })
      };
    }
  });

  // Happy path.
  const ok = await fetcher.fetchNotice({ noticeId: 'abc-123' });
  assert(ok.ok === true, 'fetchNotice returns ok:true for a valid notice');
  assert(ok.notice && ok.notice.title === SAMPLE_REC.title, 'Notice title preserved');
  assert(ok.notice.naicsCode === '561720', 'NAICS preserved');
  assert(ok.notice.typeOfSetAside === 'Total Small Business', 'Set-aside description preserved');
  assert(/Norfolk/.test(ok.notice.placeOfPerformance) && /VA/.test(ok.notice.placeOfPerformance),
    'Place of performance flattened');
  assert(Array.isArray(ok.notice.pointOfContact) && ok.notice.pointOfContact.length === 1,
    'POC list preserved');
  assert(ok.notice.noticeUrl === 'https://sam.gov/opp/abc-123/view',
    'Safe browser URL is built');
  assert(Array.isArray(ok.notice.resourceLinks) && ok.notice.resourceLinks.length === 2,
    'Resource link count preserved');
  ok.notice.resourceLinks.forEach((r, i) => {
    assert(!/api_key/i.test(r.url),
      'Resource link ' + i + ' has api_key stripped: ' + r.url);
  });
  assert(!/api_key/.test(JSON.stringify(ok.notice)),
    'No api_key value anywhere in the returned notice object');
  assert(/api_key=TESTKEY999/.test(lastUrl),
    'Outbound request includes api_key on the SAM.gov side only (service-injected)');

  // No api key → returns a safe reason, never crashes.
  const noKey = svc.createSamNoticeFetchService({ getApiKey: async () => '', fetch: async () => ({ ok: true }) });
  const r2 = await noKey.fetchNotice({ noticeId: 'x' });
  assert(r2.ok === false && r2.reason === 'no_api_key',
    'Missing key → ok:false, reason:no_api_key (no crash)');

  // Missing noticeId.
  const r3 = await fetcher.fetchNotice({});
  assert(r3.ok === false && r3.reason === 'no_notice_id',
    'Missing noticeId → ok:false, reason:no_notice_id');

  // HTTP error.
  const fail = svc.createSamNoticeFetchService({
    getApiKey: async () => 'K',
    fetch: async () => ({ ok: false, status: 503 })
  });
  const r4 = await fail.fetchNotice({ noticeId: 'x' });
  assert(r4.ok === false && r4.reason === 'http_error' && r4.status === 503,
    'HTTP 503 → ok:false, reason:http_error, status:503');

  // Notice not found.
  const empty = svc.createSamNoticeFetchService({
    getApiKey: async () => 'K',
    fetch: async () => ({ ok: true, json: async () => ({ totalRecords: 0, opportunitiesData: [] }) })
  });
  const r5 = await empty.fetchNotice({ noticeId: 'x' });
  assert(r5.ok === false && r5.reason === 'notice_not_found',
    'Empty result → ok:false, reason:notice_not_found');

  // No file bytes ever appear in the returned notice. The service exposes
  // descriptionUrl (the SAM.gov URL the user can open) — never a text
  // body, never file path, never manifest.
  const keys = Object.keys(ok.notice);
  ['text','description','descriptionText','filePath','localPath','files','manifest','attachments','bytes','content'].forEach(k => {
    assert(keys.indexOf(k) < 0,
      'Notice object does not expose ' + k + ' (no file-bytes surface)');
  });
  assert(keys.indexOf('descriptionUrl') >= 0,
    'Notice object exposes descriptionUrl (URL string only)');

  console.log(process.exitCode ? 'Phase 25AM · Fetch-only architecture: FAILED' : 'Phase 25AM · Fetch-only architecture: OK');
  process.exit(process.exitCode ? 1 : 0);
})().catch(err => {
  assert(false, 'Async exercise crashed: ' + err.message);
  console.log('Phase 25AM · Fetch-only architecture: FAILED');
  process.exit(1);
});
