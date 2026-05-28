'use strict';
const assert = require('assert');
const { extractDeadlines, generateReminders } = require('../services/govcon/deadline-extraction');

const now = new Date('2026-05-28T12:00:00Z');
const out = extractDeadlines({
  solicitationNumber: 'ABC-1',
  text: 'Response due date: June 10, 2026. Q&A deadline: 06/01/2026. Site visit May 1, 2026. Optional phase date TBD June 15, 2026.'
}, { now });

assert.strictEqual(out.ok, true);
assert.ok(out.events.some(e => e.eventType === 'response_due'));
assert.ok(out.events.some(e => e.eventType === 'qa_deadline'));
assert.ok(out.events.some(e => e.needs_review));
assert.strictEqual(out.events.filter(e => e.eventType === 'site_visit').length, 1);
assert.ok(out.reminders.every(r => new Date(r.remindAt) > now), 'past reminders excluded');
assert.ok(out.reminders.some(r => r.offsetHours === 48));

const dup = extractDeadlines({ solicitationNumber: 'ABC-1', text: 'Response due date: June 10, 2026.\nResponse due date: June 10, 2026.' }, { now });
assert.strictEqual(dup.events.filter(e => e.eventType === 'response_due').length, 1);
assert.strictEqual(generateReminders([{ id: 'old', date: '2026-05-01', eventType: 'response_due' }], { now }).length, 0);
console.log('=== PASS govcon-deadlines ===');
