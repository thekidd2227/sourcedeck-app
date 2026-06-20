'use strict';
const assert = require('assert');
const w = require('../services/govcon/vendor-quote-workflow');
const matrix = [
  { id:'C-1', requirement:'Contractor shall provide licensed HVAC technicians within 50 miles of Richmond, Virginia.', sourceFile:'pws.docx', evidenceNeeded:'State license' },
  { id:'C-2', requirement:'Contractor must supply service vehicles, diagnostic equipment, insurance, and a quality-control report.', sourceFile:'pws.docx' },
  { id:'I-1', requirement:'Contractor shall comply with OSHA and FAR 52.219-14.', sourceFile:'clauses.xml' }
];
const r = w.analyzeSubcontractingNeeds({ complianceMatrix:matrix, metadata:{ placeOfPerformance:'Richmond, VA', naics:'238220', classificationCode:'J041' }, companyProfile:{ capabilities:['Prime management'] } });
assert.equal(r.ok, true); assert.equal(r.requirements.length, 3);
assert.ok(r.requirements.every(x => x.requiredCapability && x.coverageStatus && x.sourceCitation));
assert.ok(r.requirements.some(x => /license/i.test(x.requiredCertificationsLicenses.join(' '))));
assert.ok(r.requirements.some(x => /equipment/i.test(x.task)));
assert.ok(r.requirements.some(x => /FAR/i.test(x.task)));
assert.ok(r.requirements.some(x => x.coverageStatus === 'unresolved' || x.coverageStatus === 'vendor required'));
assert.ok(r.vettingChecklist.some(x => /license/i.test(x)) && r.vettingChecklist.some(x => /insurance/i.test(x)));
console.log('vendor-quote-room-capability-map: ok');
