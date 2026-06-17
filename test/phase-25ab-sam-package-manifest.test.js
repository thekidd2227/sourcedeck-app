const assert = require('assert');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { createSamPackageDownloadService } = require('../services/govcon/sam-package-download');

(async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd-25ab-manifest-'));
  const fetcher = async () => ({
    ok: true,
    status: 200,
    headers: { get: (k) => String(k).toLowerCase() === 'content-type' ? 'text/plain' : '' },
    arrayBuffer: async () => Buffer.from('SECTION M\nAward will evaluate price and technical approach.')
  });
  const svc = createSamPackageDownloadService({ fetch: fetcher, getApiKey: async () => 'SECRET', userDataPath: dir });
  const out = await svc.downloadPackage({
    noticeId: 'MANIFEST-1',
    solicitationNumber: 'RFQ-1',
    title: 'Manifest check',
    agency: 'Test Agency',
    resourceLinks: ['https://files.example/section-m.txt?api_key=BAD']
  });
  const manifestPath = path.join(out.packagePath, 'package.json');
  assert.ok(fs.existsSync(manifestPath), 'package.json exists');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.files), 'files array exists');
  assert.equal(manifest.downloadedCount, 1);
  assert.equal(manifest.failedCount, 0);
  assert.ok(manifest.localZipPath && fs.existsSync(manifest.localZipPath), 'localZipPath exists when package ZIP created');
  assert.ok(!/SECRET|api_key=|apikey=/i.test(JSON.stringify(manifest)), 'manifest stores no raw key or keyed URL');
  assert.ok(manifest.packagePath.includes(path.join('govcon', 'solicitations')), 'storage path is userData govcon/solicitations tree');
  console.log('phase-25ab-sam-package-manifest: ok');
})().catch((err) => { console.error(err); process.exit(1); });
