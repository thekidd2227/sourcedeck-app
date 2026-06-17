const assert = require('assert');
const fsp = require('fs').promises;
const os = require('os');
const path = require('path');
const extract = require('../services/govcon/solicitation-package-extract');

(async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd-25ab-extract-'));
  const p = path.join(dir, 'sol.txt');
  await fsp.writeFile(p, [
    'SECTION A Solicitation form',
    'SECTION B Supplies or Services and Prices/Costs',
    'SECTION C Contractor shall provide custodial services.',
    'SECTION L Offerors must submit technical approach by Friday.',
    'SECTION M Award will evaluate technical, past performance, and price.'
  ].join('\n'));
  const result = await extract.extractSolicitationPackage({
    noticeId: 'EX-1',
    packagePath: dir,
    files: [{ fileName: 'sol.txt', localPath: p, status: 'downloaded' }]
  });
  for (const letter of 'ABCDEFGHIJKLM'.split('')) assert.ok(result.sections[letter], `Section ${letter} present`);
  assert.ok(result.parts['Part I'].length === 8, 'Part I A-H present');
  assert.ok(result.parts['Part II'][0].letter === 'I', 'Part II Section I present');
  assert.ok(result.parts['Part III'][0].letter === 'J', 'Part III Section J present');
  assert.ok(result.parts['Part IV'].map(s => s.letter).join('') === 'KLM', 'Part IV K-M present');
  assert.ok(result.sections.C.found && /custodial/.test(result.sections.C.text), 'Section C extracted');
  assert.ok(result.sections.L.found && /must submit/.test(result.sections.L.text), 'Section L extracted');
  assert.ok(result.sections.M.found && /evaluate/.test(result.sections.M.text), 'Section M extracted');
  assert.ok(/No Section I/.test(result.sections.I.text), 'missing section uses verify placeholder');
  assert.ok(result.complianceMatrixStarter.length, 'compliance matrix starter exists');
  console.log('phase-25ab-extract-sections-a-to-m: ok');
})().catch((err) => { console.error(err); process.exit(1); });
