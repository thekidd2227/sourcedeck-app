const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const importer = require('../services/govcon/solicitation-import');

async function runFarCommercialItemsFixture() {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-far-commercial-src-'));
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-far-commercial-user-'));
  const solicitationPath = path.join(sourceDir, 'far-52-212-commercial-items.txt');

  fs.writeFileSync(solicitationPath, [
    'SOLICITATION / CONTRACT / ORDER FOR COMMERCIAL ITEMS',
    'Solicitation Number: 1240LP26Q0063',
    'Department: AGRICULTURE, DEPARTMENT OF',
    'NAICS Code: 561720',
    'Place of Performance: Fort Collins, Colorado 80526',
    '',
    'ADDENDUM TO FAR 52.212-1',
    'Quotes are due by June 30 2026 at 2:00 PM Mountain Time.',
    'Submit one technical quote and one price quote by email to the Contracting Officer.',
    'The technical quote must include a staffing plan, quality control approach, and recent relevant experience.',
    '',
    'ADDENDUM TO FAR 52.212-2',
    'Award will be made to the responsible quoter whose quotation represents best value.',
    'Technical capability is more important than price. Past performance will be considered.',
    '',
    'PERFORMANCE REQUIREMENTS SUMMARY',
    'Clean and service vault toilets at the Canyon Lakes Ranger District recreation sites.',
    'Provide all labor, supervision, equipment, supplies, transportation, and materials necessary to perform the services.',
    'Maintain restrooms in a sanitary condition and remove trash from the service area.',
    '',
    'FAR 52.212-3 Offeror Representations and Certifications -- Commercial Items.',
    'Attachment 1 Price Schedule must be completed and returned.',
    'Attachment 2 Wage Determination applies.',
  ].join('\n'));

  return importer.importAndExtract({
    filePaths: [solicitationPath],
    userDataPath,
    timestamp: 'phase-25aq',
    opportunity: {
      id: 'sam:1240LP26Q0063',
      noticeId: '1240LP26Q0063',
      solicitationNumber: '1240LP26Q0063',
      title: 'Canyon Lakes RD- Vault Toilet Facility Cleaning',
      agency: 'AGRICULTURE, DEPARTMENT OF',
      naics: '561720',
      placeOfPerformance: 'Fort Collins, Colorado 80526'
    }
  });
}

(async () => {
  const result = await runFarCommercialItemsFixture();

  assert.equal(result.ok, true, 'FAR commercial-items fixture should import successfully');
  assert.ok(result.metadata.title || result.metadata.noticeId, 'summary metadata should still populate');

  assert.equal(result.sections.L.found, true, 'FAR 52.212-1 addendum must hydrate Section L / Instructions panel');
  assert.match(result.sections.L.text, /Submit one technical quote/i, 'Section L should include the submission instruction body, not just a heading');
  assert.match(result.sections.L.text, /staffing plan, quality control approach/i, 'Section L should include proposal content requirements');

  assert.equal(result.sections.M.found, true, 'FAR 52.212-2 addendum must hydrate Section M / Evaluation panel');
  assert.match(result.sections.M.text, /best value/i, 'Section M should include basis-for-award text');
  assert.match(result.sections.M.text, /Technical capability is more important than price/i, 'Section M should include evaluation weighting text');

  assert.equal(result.sections.C.found, true, 'Performance Requirements Summary must hydrate Section C/F scope panel');
  assert.match(result.sections.C.text, /Clean and service vault toilets/i, 'Scope section should include actual work requirements');
  assert.doesNotMatch(result.sections.C.text, /^Place of Performance:/i, 'Scope section should not be reduced to metadata-only place-of-performance text');

  assert.equal(result.sections.K.found, true, 'FAR 52.212-3 must hydrate Section K reps/certs when no formal Section K header exists');
  assert.match(result.sections.K.text, /Representations and Certifications/i, 'Section K should include reps/certs provision text');

  assert.ok(result.requiredFormsAttachments.some(item => /Attachment 1 Price Schedule/i.test(item.text)), 'Attachment 1 should be available to Required Forms panel');
  assert.ok(result.requiredFormsAttachments.some(item => /Attachment 2 Wage Determination/i.test(item.text)), 'Attachment 2 should be available to Required Forms panel');
  assert.ok(result.deadlines.some(item => /Quotes are due/i.test(item.text)), 'deadline alias should still be extracted');
  assert.ok(result.complianceMatrix.some(row => /Submit one technical quote/i.test(row.requirementText || row.text || '')), 'compliance matrix should include submission requirements');
  assert.ok(result.complianceMatrix.some(row => /Clean and service vault toilets/i.test(row.requirementText || row.text || '')), 'compliance matrix should include actual scope requirements');

  console.log('phase-25aq-far-commercial-items-section-extraction: PASS');
})();
