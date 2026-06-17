'use strict';
const assert = require('assert');
const { normalizeSetAsideCode } = require('../services/govcon/govcon-index');

assert.strictEqual(normalizeSetAsideCode('SDVOSB'), 'SDVOSBC');
assert.strictEqual(normalizeSetAsideCode('SDVOSBC'), 'SDVOSBC');
assert.strictEqual(normalizeSetAsideCode('SDVOSBS'), 'SDVOSBS');
assert.strictEqual(normalizeSetAsideCode('HUBZone'), 'HZC');
assert.strictEqual(normalizeSetAsideCode('HZC'), 'HZC');
assert.strictEqual(normalizeSetAsideCode('HZS'), 'HZS');
assert.strictEqual(normalizeSetAsideCode('8(a)'), '8A');
assert.strictEqual(normalizeSetAsideCode('WOSB'), 'WOSB');
assert.strictEqual(normalizeSetAsideCode('EDWOSB'), 'EDWOSB');
assert.strictEqual(normalizeSetAsideCode('VOSB'), 'VSA');
console.log('Phase 25AA set-aside code mapping: OK');
