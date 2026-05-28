'use strict';
const assert = require('assert');
const { analyzeSolicitation } = require('../services/govcon/solicitation-analysis');

const kill = analyzeSolicitation({ opportunity: { title:'Cleared Work', contractValue: 2000000, periodOfPerformanceMonths: 24 }, text: 'Security clearance required. Contract value $2,000,000. Response due date: June 1, 2026.' });
assert.strictEqual(kill.deterministicDecision, 'KILL');
assert.match(kill.markdown, /BID DECISION/);

const missing = analyzeSolicitation({ opportunity: { title:'Unknown Scope' }, text: 'Services are needed.' });
assert.strictEqual(missing.deterministicDecision, 'MORE_RESEARCH_NEEDED');
assert.match(missing.aiPolicy, /cannot override/);
console.log('=== PASS govcon-solicitation-analysis ===');
