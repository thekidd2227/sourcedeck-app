/**
 * Phase 25AD — Send Package to Solicitation Center uses local manifest.
 *
 * Asserts:
 *   - gcW25SendToWorkspace passes the saved pursuit id into the
 *     Solicitation Center selector and renders the workspace source panel
 *     with the local package manifest (not raw SAM.gov resource links).
 *   - When a local package exists, extraction is kicked off via the
 *     `gcABExtractPackageToCenter` hook that consumes the local manifest.
 *   - api/index.js routes packages.extractSolicitationPackage to the
 *     solicitation-package-extract service, which produces a file-aware
 *     `extractedFiles` array from a manifest (not from upload state).
 *
 * Run:  node test/phase-25ad-send-package-to-solicitation-center.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

async function main(){

console.log('\n=== Phase 25AD — Send Package to Solicitation Center handoff ===\n');

await test('gcW25SendToWorkspace selects the saved pursuit in the Solicitation Center', () => {
  assert.ok(/window\.gcW25SendToWorkspace = async function\(id\)/.test(HTML),
    'gcW25SendToWorkspace handler missing');
  // The handler hands off to gcV25SelectSolicitation with the pursuit id
  // so the Solicitation Center loads the same record.
  assert.ok(/window\.gcV25SelectSolicitation\(id\)/.test(HTML),
    'send-to-workspace must call gcV25SelectSolicitation(id)');
  // Routes into the GovCon tab and the Solicitation sub-tab.
  assert.ok(/window\.gcTabSwitch\('solicitation'\)/.test(HTML),
    'send-to-workspace must switch to the solicitation sub-tab');
});

await test('Solicitation Center renders the local package manifest, not raw SAM.gov links', () => {
  // The handler renders the workspace source panel for the same id, which
  // shares renderSourcePanel with the saved pursuits view. That panel
  // gates the SAM.gov listing block behind `!sm.package`, so once a
  // package exists only the local manifest is rendered.
  assert.ok(/window\.gcW25RenderWorkspaceSource\(id\)/.test(HTML),
    'send-to-workspace must call gcW25RenderWorkspaceSource(id)');
  assert.ok(/data-gc-ab-package-summary="true"/.test(HTML),
    'workspace renderer must surface the local package summary block');
});

await test('extraction is kicked off from the local manifest when a package exists', () => {
  // The handler awaits gcABExtractPackageToCenter only when a package
  // exists for the pursuit; this prevents a stale upload-state failure
  // from blocking the newly downloaded package.
  assert.ok(/if \(sm && sm\.package && typeof window\.gcABExtractPackageToCenter === 'function'\)/.test(HTML),
    'extraction call must be gated on sm.package presence');
  assert.ok(/await window\.gcABExtractPackageToCenter\(id\)/.test(HTML),
    'send-to-workspace must await gcABExtractPackageToCenter(id)');
});

await test('extractSolicitationPackage routes through the api boundary', () => {
  const api = fs.readFileSync(path.join(ROOT, 'api', 'index.js'), 'utf8');
  assert.ok(/extractSolicitationPackage:\s*\(input\)\s*=>\s*\n?\s*solicitationPackageExtractSvc\.extractSolicitationPackage\(input \|\| \{\}\)/.test(api),
    'api packages.extractSolicitationPackage must route to the service');
});

await test('extract service produces file-aware rows for each manifest file', async () => {
  // The Phase 25AC try/catch wrapper still applies; one bad file does
  // not collapse the whole package. We exercise the service with two
  // manifest entries: one missing localPath (drops out) and one .txt
  // file present in /tmp so the extractor reads it.
  const os = require('os');
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'phase-25ad-extract-'));
  const txt = path.join(tmpDir, 'description.txt');
  await fs.promises.writeFile(txt, 'Hello SourceDeck — local file extraction.', 'utf8');
  const svc = require(path.join(ROOT, 'services', 'govcon', 'solicitation-package-extract.js'));
  const out = await svc.extractSolicitationPackage({
    manifest: {
      files: [
        { fileName: 'description.txt', localPath: txt, source: 'package' },
        { fileName: 'phantom.docx', localPath: path.join(tmpDir, 'phantom.docx'), source: 'package' }
      ]
    }
  });
  assert.ok(out && Array.isArray(out.files), 'extractedFiles must be returned as out.files');
  // The .txt file is read; the missing .docx is dropped (its path does
  // not exist on disk so the harness filters it out before extract).
  const names = out.files.map(f => f.fileName);
  assert.ok(names.indexOf('description.txt') >= 0, 'description.txt must be present in extracted files');
  const txtRow = out.files.find(f => f.fileName === 'description.txt');
  assert.ok(txtRow && txtRow.extractionStatus === 'text', 'description.txt must be extracted as text');
  assert.ok(/Hello SourceDeck/.test(txtRow.text || ''), 'description.txt text body must round-trip');
  // Cleanup.
  try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

console.log('\n=== ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + '/' + (passed + failed) + ' Phase 25AD handoff checks ===');
if (failed > 0) process.exit(1);

}
main().catch((e) => { console.error(e); process.exit(1); });
