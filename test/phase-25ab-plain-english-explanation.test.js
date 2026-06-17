const assert = require('assert');
const { _classifySections, plainEnglish } = require('../services/govcon/solicitation-package-extract');

const sections = _classifySections('SECTION C\nContractor shall clean.\nSECTION L\nOfferor must submit forms.');
const out = plainEnglish({ sections });
assert.equal(out.ok, true);
assert.equal(out.notLegalAdvice, true);
assert.equal(out.verifyAgainstSource, true);
assert.ok(out.sections.C.found, 'found section explained');
assert.ok(/What to do|Read the source/.test(out.sections.C.mustDo), 'simple action language exists');
assert.ok(!out.sections.M.found && /Verify source package/.test(out.sections.M.mustDo), 'missing section flagged');
console.log('phase-25ab-plain-english-explanation: ok');
