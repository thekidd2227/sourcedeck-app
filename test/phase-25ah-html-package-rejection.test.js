// Phase 25AH · HTML / app-shell responses are rejected from packages
// ──────────────────────────────────────────────────────────────────────
// Root cause: the package downloader accepted ANY 200 response body and
// wrote it to an attachment / ZIP entry, and the extractor treated
// .html/.htm (and any "text" file) as readable solicitation text. When
// SAM.gov or a linked resource returned portal HTML, a login/error page,
// or — worst case — the SourceDeck app shell, that markup leaked into the
// right-side viewer and the solicitation workspace.
//
// This proves:
//   1. The content classifier rejects app-shell / generic / login HTML and
//      passes genuine PDF / ZIP / TXT / XML attachments (magic-bytes win).
//   2. downloadPackage never saves, never ZIPs, and never extracts a
//      rejected HTML body — while valid .txt / .pdf / .zip still download.
//   3. extractSolicitationPackage refuses .html/.htm and app-shell text so
//      no UI/CSS/markup enters the extracted solicitation text.
//   4. sam-search normalizeResources drops SAM human notice/search links
//      and label-only entries, keeping only real download URLs.
//
// Run:  node test/phase-25ah-html-package-rejection.test.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const pkgSvc = require('../services/govcon/sam-package-download');
const search = require('../services/govcon/sam-search');
const extract = require('../services/govcon/solicitation-package-extract');

const APP_SHELL = [
  '<!DOCTYPE html><html><head><title>SourceDeck</title>',
  '<style>.cmd-flow{display:flex}.cmd-pill{padding:4px}</style></head>',
  '<body><nav>SourceDeck GovCon Pipeline — GovCon Find Opportunities</nav>',
  '<div id="tab-govcon">Operating Hub</div></body></html>'
].join('\n');

const GENERIC_HTML = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>SAM.gov</title></head><body><h1>Notice</h1></body></html>';
const LOGIN_HTML = '<!DOCTYPE html><html><head><title>Sign in</title></head><body><form>Please log in. Authentication required.</form></body></html>';
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\ntrailer<<>>\n%%EOF', 'latin1');
const VALID_TXT = 'SECTION C\nContractor shall provide janitorial services at Naval Station Norfolk.';
const VALID_XML = '<?xml version="1.0"?>\n<solicitation><clin>0001</clin></solicitation>';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.error('  ✗ ' + msg); } }

function resp(body, headers) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''), 'utf8');
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => (headers || {})[String(k).toLowerCase()] || '' },
    arrayBuffer: async () => buf
  };
}

(async () => {
  console.log('Phase 25AH · HTML / app-shell package rejection');

  // ── 1. Classifier unit checks ──────────────────────────────────────
  const C = pkgSvc._classifyDownloadedBody;
  ok(C(Buffer.from(APP_SHELL), 'text/html').reason === 'app_shell_html_response',
    'app-shell HTML → app_shell_html_response');
  ok(C(Buffer.from(GENERIC_HTML), 'text/html').reason === 'unexpected_html_response',
    'generic HTML (text/html) → unexpected_html_response');
  ok(C(Buffer.from(LOGIN_HTML), 'text/html').reason === 'non_attachment_html_response',
    'login HTML → non_attachment_html_response');
  // Body sniff even when content-type lies (served as text/plain).
  ok(C(Buffer.from(GENERIC_HTML), 'text/plain').ok === false,
    'HTML body sniffed even when content-type is text/plain');
  // Genuine attachments pass — magic bytes win over a lying content-type.
  ok(C(PDF_BYTES, 'text/html').ok === true, 'PDF magic passes even if content-type=text/html');
  ok(C(Buffer.from(VALID_TXT), 'text/plain').ok === true, 'plain solicitation text passes');
  ok(C(Buffer.from(VALID_XML), 'application/xml').ok === true, 'valid XML attachment is NOT treated as HTML');

  // ── 2. downloadPackage end-to-end ──────────────────────────────────
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd-25ah-'));
  const zipPath = path.join(dir, 'fixture.zip');
  await pkgSvc._createZip(zipPath, [{ name: 'inside/section-l.txt', data: Buffer.from('SECTION L\nOfferors must submit a technical volume.') }]);
  const zipBuf = await fsp.readFile(zipPath);

  const fetcher = async (url) => {
    if (/appshell/.test(url)) return resp(APP_SHELL, { 'content-type': 'text/html' });
    if (/portal/.test(url)) return resp(GENERIC_HTML, { 'content-type': 'text/html' });
    if (/login/.test(url)) return resp(LOGIN_HTML, { 'content-type': 'text/html' });
    if (/sniff\.txt/.test(url)) return resp(GENERIC_HTML, { 'content-type': 'text/plain' });
    if (/scope\.txt/.test(url)) return resp(VALID_TXT, { 'content-type': 'text/plain' });
    if (/doc\.pdf/.test(url)) return resp(PDF_BYTES, { 'content-type': 'application/pdf' });
    if (/pkg\.zip/.test(url)) return resp(zipBuf, { 'content-type': 'application/zip' });
    return { ok: false, status: 404, headers: { get: () => '' }, arrayBuffer: async () => Buffer.alloc(0) };
  };

  const downloader = pkgSvc.createSamPackageDownloadService({
    fetch: fetcher,
    getApiKey: async () => '',
    userDataPath: dir,
    now: () => Date.UTC(2026, 5, 18, 12)
  });

  const out = await downloader.downloadPackage({
    noticeId: 'N-25AH',
    solicitationNumber: 'SOL-25AH',
    title: 'HTML rejection test',
    resourceLinks: [
      'https://files.example/appshell',
      'https://files.example/portal',
      'https://files.example/login',
      'https://files.example/sniff.txt',
      'https://files.example/scope.txt',
      'https://files.example/doc.pdf',
      'https://files.example/pkg.zip'
    ]
  });

  ok(out.ok === true, 'downloadPackage returns ok');
  ok(out.downloadedCount === 3, 'only the 3 valid attachments download (got ' + out.downloadedCount + ')');
  ok(out.failedCount === 4, 'the 4 HTML responses are marked failed (got ' + out.failedCount + ')');

  const byName = {};
  for (const f of out.files) byName[f.fileName] = f;
  const rejectedReasons = out.files.filter(f => f.status === 'failed').map(f => f.errorSafe);
  ok(rejectedReasons.some(r => /app_shell_html_response/.test(r)), 'app-shell rejection reason recorded');
  ok(rejectedReasons.some(r => /unexpected_html_response/.test(r)), 'generic HTML rejection reason recorded');
  ok(rejectedReasons.some(r => /non_attachment_html_response/.test(r)), 'login HTML rejection reason recorded');

  // No rejected body was written to disk.
  for (const f of out.files) {
    if (f.status === 'failed') ok(!f.localPath, 'rejected file has no localPath: ' + f.fileName);
  }
  const attachmentsDir = path.join(dir, 'govcon', 'solicitations', 'N-25AH', 'attachments');
  const onDisk = fs.existsSync(attachmentsDir) ? await fsp.readdir(attachmentsDir) : [];
  for (const name of onDisk) {
    const body = await fsp.readFile(path.join(attachmentsDir, name), 'latin1');
    ok(!/<html|SourceDeck GovCon Pipeline|<!DOCTYPE/i.test(body), 'no HTML markup persisted in attachment: ' + name);
  }

  // The created ZIP must not contain any HTML body either.
  ok(fs.existsSync(out.localZipPath), 'SourceDeck local ZIP created');
  const zipOut = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd-25ah-zip-'));
  const zipEntries = await pkgSvc._extractZip(out.localZipPath, zipOut);
  for (const e of zipEntries) {
    const body = await fsp.readFile(e.localPath, 'latin1');
    ok(!/SourceDeck GovCon Pipeline/.test(body) && !/<!DOCTYPE html/i.test(body),
      'no HTML body inside ZIP entry: ' + e.fileName);
  }

  // The HTML strings never appear anywhere in the returned summary.
  const blob = JSON.stringify(out);
  ok(!/SourceDeck GovCon Pipeline/.test(blob), 'app-shell text absent from package summary');

  // Valid attachments survived.
  ok(byName['scope.txt'] && byName['scope.txt'].status === 'downloaded', 'valid .txt downloaded');
  ok(byName['doc.pdf'] && byName['doc.pdf'].status === 'downloaded', 'valid .pdf downloaded');
  const zipFile = out.files.find(f => /\.zip$/i.test(f.fileName) && f.status === 'downloaded');
  ok(zipFile && zipFile.extractedFiles && zipFile.extractedFiles.length, 'valid .zip downloaded and extracted');

  // ── 3. extractSolicitationPackage refuses HTML / app-shell text ────
  const pkgRoot = path.join(dir, 'extract-fixture');
  const attDir = path.join(pkgRoot, 'attachments');
  await fsp.mkdir(attDir, { recursive: true });
  const htmlPath = path.join(attDir, 'notice.html');
  const txtTrapPath = path.join(attDir, 'leaked-shell.txt');
  const goodTxtPath = path.join(attDir, 'sow.txt');
  await fsp.writeFile(htmlPath, APP_SHELL);
  await fsp.writeFile(txtTrapPath, APP_SHELL);              // app-shell hiding behind a .txt name
  await fsp.writeFile(goodTxtPath, VALID_TXT);

  const manifest = {
    noticeId: 'N-25AH',
    solicitationNumber: 'SOL-25AH',
    packagePath: pkgRoot,
    files: [
      { id: 'r1', fileName: 'notice.html', localPath: htmlPath, status: 'downloaded' },
      { id: 'r2', fileName: 'leaked-shell.txt', localPath: txtTrapPath, status: 'downloaded' },
      { id: 'r3', fileName: 'sow.txt', localPath: goodTxtPath, status: 'downloaded' }
    ]
  };
  const ex = await extract.extractSolicitationPackage({ manifest });
  ok(ex.ok === true, 'extraction returns ok');
  const exByName = {};
  for (const f of ex.files) exByName[f.fileName] = f;
  ok(exByName['notice.html'] && exByName['notice.html'].extractionStatus === 'rejected', '.html file rejected from extraction');
  ok(exByName['notice.html'].text === '', '.html file contributes no text');
  ok(exByName['leaked-shell.txt'] && exByName['leaked-shell.txt'].extractionStatus === 'rejected', 'app-shell .txt rejected from extraction');
  ok(exByName['sow.txt'] && exByName['sow.txt'].extractionStatus === 'text', 'valid .txt extracted as text');
  ok(/janitorial services/i.test(exByName['sow.txt'].text), 'valid .txt text preserved');
  ok(!/SourceDeck GovCon Pipeline/.test(ex.fullText), 'app-shell text absent from extracted fullText');
  ok(!/cmd-flow|cmd-pill/.test(ex.fullText), 'app-shell CSS absent from extracted fullText');

  // ── 4. normalizeResources tightening ──────────────────────────────
  const rec = search.normalizeSamRecord({
    noticeId: 'N-1',
    title: 'Resource test',
    resourceLinks: [
      { name: 'Real attachment', url: 'https://api.sam.gov/prod/opportunities/v3/resources/files/abc/download' },
      { label: 'Label only, no URL' },
      'https://sam.gov/opp/abc123/view',
      'https://sam.gov/search/?index=opp',
      { title: 'Portal notice', url: 'https://www.sam.gov/opp/xyz/view' }
    ]
  }, Date.UTC(2026, 5, 18));
  const urls = rec.resourceLinks.map(r => r.url);
  ok(urls.length === 1, 'only the real api.sam.gov download survives (got ' + urls.length + ')');
  ok(/api\.sam\.gov/.test(urls[0]), 'kept link is the api.sam.gov download URL');
  ok(!urls.some(u => /\/view|\/search/.test(u)), 'human notice/search portal links dropped');
  ok(!rec.resourceLinks.some(r => !r.url), 'no label-only resource entries retained');

  // rec.links (HATEOAS array) is no longer blindly treated as attachments.
  const recLinks = search.normalizeSamRecord({
    noticeId: 'N-2',
    links: [{ rel: 'self', href: 'https://api.sam.gov/opportunities/v2/search?noticeid=N-2' }]
  }, Date.UTC(2026, 5, 18));
  ok(recLinks.resourceLinks.length === 0, 'broad rec.links is not treated as downloadable attachments');

  console.log('\n' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AH checks');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
