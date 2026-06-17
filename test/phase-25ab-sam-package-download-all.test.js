const assert = require('assert');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const svc = require('../services/govcon/sam-package-download');

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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd-25ab-'));
  const zipPath = path.join(dir, 'fixture.zip');
  await svc._createZip(zipPath, [{ name: 'inside/section-l.txt', data: Buffer.from('SECTION L\nOfferors must submit a technical volume.') }]);
  const zipBuf = await fsp.readFile(zipPath);
  const attempted = [];
  const fetcher = async (url) => {
    attempted.push(url);
    if (/scope\.txt/.test(url)) return resp('SECTION C\nContractor shall clean the facility.', { 'content-type': 'text/plain' });
    if (/package\.zip/.test(url)) return resp(zipBuf, { 'content-type': 'application/zip' });
    return { ok: false, status: 404, headers: { get: () => '' }, arrayBuffer: async () => Buffer.alloc(0) };
  };
  const downloader = svc.createSamPackageDownloadService({
    fetch: fetcher,
    getApiKey: async () => 'SHOULD_NOT_LEAK',
    userDataPath: dir,
    now: () => Date.UTC(2026, 5, 17, 12)
  });
  const out = await downloader.downloadPackage({
    noticeId: 'N-25AB',
    solicitationNumber: 'SOL-25AB',
    title: 'Janitorial test',
    resourceLinks: ['https://files.example/scope.txt', 'https://files.example/package.zip', 'https://files.example/missing.pdf']
  });
  assert.equal(out.ok, true);
  assert.equal(attempted.length, 3, 'all resourceLinks are attempted');
  assert.equal(out.resourceCount, 3);
  assert.equal(out.downloadedCount, 2);
  assert.equal(out.failedCount, 1);
  assert.ok(out.files.some(f => f.fileName === 'scope.txt'), 'text resource downloaded');
  const zipFile = out.files.find(f => /\.zip$/i.test(f.fileName));
  assert.ok(zipFile && zipFile.extractedFiles && zipFile.extractedFiles.length, 'ZIP resource extracted');
  assert.ok(fs.existsSync(out.localZipPath), 'SourceDeck local ZIP created for multi-file package');
  assert.ok(!JSON.stringify(out).includes('SHOULD_NOT_LEAK'), 'raw key not returned');
  assert.ok(!/api_key=|apikey=/i.test(JSON.stringify(out)), 'api key query is not shown');
  console.log('phase-25ab-sam-package-download-all: ok');
})().catch((err) => { console.error(err); process.exit(1); });
