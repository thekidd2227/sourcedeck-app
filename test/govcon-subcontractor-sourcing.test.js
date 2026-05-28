'use strict';
const assert = require('assert');
const { sourceSubcontractors, FAR_19_7_NOTE } = require('../services/govcon/subcontractor-sourcing');

const result = sourceSubcontractors({
  sowText: 'Custodial services require bonded janitorial staff, insurance, and quality control.',
  placeOfPerformance: { city: 'Dayton', state: 'OH', lat: 39.7589, lon: -84.1916 },
  vendorCandidates: [
    { companyName: 'A Clean Co', website: 'https://a.example', email: 'info@a.example', lat: 39.76, lon: -84.20, capabilities: ['custodial', 'janitorial'], certifications: ['bonded'], naics: ['561720'] },
    { companyName: 'A Clean Co', website: 'https://a.example', lat: 39.76, lon: -84.20 },
    { companyName: 'Far Vendor', website: 'https://far.example', lat: 41.0, lon: -87.0 }
  ]
});

assert.strictEqual(result.ok, true);
assert.strictEqual(result.vendors.length, 1);
assert.match(result.farSubpart197Note, /FAR Subpart 19\.7/);
assert.match(FAR_19_7_NOTE, /subcontracting plans/i);
assert.ok(result.methodology.capabilityMapping.requiredSkills.some(s => /custodial/i.test(s)));
assert.ok(result.formats.tableRows[0].companyName);
assert.ok(result.formats.bullets.startsWith('- '));
assert.ok(result.formats.numbered.startsWith('1. '));
console.log('=== PASS govcon-subcontractor-sourcing ===');
