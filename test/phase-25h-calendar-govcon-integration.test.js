'use strict';

/**
 * Phase 25H — Calendar ↔ GovCon integration
 *
 * Asserts the calendar event schema and form surface the link
 * fields needed to associate an event with:
 * - a GovCon solicitation
 * - a vendor / subcontractor
 * - a Phase 25E.2 Proposal Workspace section
 *
 * Also asserts the event form includes the GovCon-flavored task
 * types (vendor follow-up, quote due, Q&A deadline, proposal
 * deadline, internal review, etc.) so the buyer can use Calendar
 * as the home for every GovCon-driven deadline.
 *
 * The integration is a contract: Phase 25H adds the link fields +
 * task types. Live cross-pane sync (e.g., a GovCon Q&A deadline
 * auto-creating a calendar event) is a future-phase enhancement.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

function getPane() {
  const start = HTML.indexOf('<div class="tab-pane" id="tab-calendar">');
  const after = HTML.indexOf('<!-- ═══════ CLINICAL', start);
  return HTML.slice(start, after);
}

test('event form surfaces a "Linked solicitation ID" field', () => {
  const pane = getPane();
  assert.match(pane, /id="cal-f-link-sol"/);
  assert.match(pane, /Linked solicitation ID/);
});

test('event form surfaces a "Linked vendor / sub" field', () => {
  const pane = getPane();
  assert.match(pane, /id="cal-f-link-vendor"/);
  assert.match(pane, /Linked vendor \/ sub/);
});

test('event form surfaces a "Linked proposal section" dropdown matching Phase 25E.2 sections', () => {
  const pane = getPane();
  assert.match(pane, /id="cal-f-link-section"/);
  // The 13 canonical Phase 25E.2 sections must be selectable.
  const REQUIRED_SECTIONS = [
    'table-of-contents',
    'solicitation-summary',
    'compliance-matrix',
    'technical-approach',
    'management-approach',
    'staffing-key-personnel',
    'past-performance',
    'quality-control',
    'risk-management',
    'transition-mobilization',
    'cost-price-volume',
    'attachments-forms',
    'final-internal-review',
  ];
  for (const sec of REQUIRED_SECTIONS) {
    assert.match(pane, new RegExp(`<option value="${sec}"`));
  }
});

test('event form supports every GovCon-flavored task type', () => {
  const pane = getPane();
  const REQUIRED_TASK_TYPES = [
    'vendor-follow-up',
    'quote-due',
    'site-visit',
    'qa-deadline',
    'proposal-deadline',
    'internal-review',
    'subcontractor-meeting',
    'proposal-section-work',
  ];
  for (const t of REQUIRED_TASK_TYPES) {
    assert.match(pane, new RegExp(`<option value="${t}"`));
  }
});

test('rendered event card surfaces the linked solicitation / vendor / section chips', () => {
  // The render helper builds three chips per event when the link
  // fields are populated. The chip markup is in the calendar script
  // block.
  const startMarker = '/* Phase 25H — SourceDeck Calendar Module';
  const startIdx = HTML.indexOf(startMarker);
  const endIdx = HTML.indexOf('</script>', startIdx);
  const src = HTML.slice(startIdx, endIdx);
  assert.match(src, /linkedSolicitationId/);
  assert.match(src, /linkedVendorId/);
  assert.match(src, /linkedProposalSectionId/);
  assert.match(src, /cal-link-chip/);
});

test('GovCon integration is read-only — no auto-invite / auto-send / portal-upload control', () => {
  const pane = getPane();
  // The calendar must not surface any control that would send an
  // event invitation, contact a vendor, or upload to a portal.
  assert.doesNotMatch(pane, />\s*Send Invite\s*</i);
  assert.doesNotMatch(pane, />\s*Email Invite\s*</i);
  assert.doesNotMatch(pane, />\s*Contact Vendor\s*</i);
  assert.doesNotMatch(pane, />\s*Contact Agency\s*</i);
  assert.doesNotMatch(pane, />\s*Upload to SAM\s*</i);
  assert.doesNotMatch(pane, />\s*Upload to PIEE\s*</i);
  assert.doesNotMatch(pane, />\s*Upload to eBuy\s*</i);
  assert.doesNotMatch(pane, />\s*Upload to GSA\s*</i);
});

test('event status pill renders the canonical 5 statuses', () => {
  const startMarker = '/* Phase 25H — SourceDeck Calendar Module';
  const startIdx = HTML.indexOf(startMarker);
  const endIdx = HTML.indexOf('</script>', startIdx);
  const src = HTML.slice(startIdx, endIdx);
  // statusPillStyle returns palette entries for these 5 keys.
  for (const s of ['scheduled', 'completed', 'missed', 'reschedule', 'canceled']) {
    assert.match(src, new RegExp(`['"]${s}['"]\\s*:`));
  }
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25h-calendar-govcon-integration\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25h-calendar-govcon-integration.test.js'
  );
});
