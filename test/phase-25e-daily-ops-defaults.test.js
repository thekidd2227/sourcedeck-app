'use strict';

/**
 * Phase 25E.6 — Daily Ops + Settings legacy-integration default cleanup
 *
 * Asserts:
 * - The Daily Operating Rhythm pane ships clean empty states. The
 *   pre-Phase-25E founder/internal default tasks (PROD-01 Assessment,
 *   PROD-02 Notion Sync, PROD-03 Instantly, PROD-04 Reply Intel,
 *   PROD-05 Booking Brief, Gmail / Notion / Airtable writeback) must
 *   NOT appear in the active Daily Ops pane on cold open.
 * - The Settings Automation Config card is framed as "optional legacy
 *   integrations" so a buyer does not infer that Make.com / Instantly /
 *   Assessment Webhook fields are required. Every legacy integration
 *   field carries an "(optional)" qualifier in its label.
 * - Active renderer markup ships zero positive PROD-01..05 references
 *   (the existing Spanish-i18n entry for the legacy assessment-webhook
 *   key is allowed because it sits inside the i18n dictionary, not
 *   active surface markup).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

function extractDailyOpsPane() {
  const start = HTML.indexOf('<div class="tab-pane" id="tab-dailyops">');
  assert.ok(start !== -1, 'tab-dailyops pane not found');
  const after = HTML.indexOf('<div class="tab-pane"', start + 1);
  return HTML.slice(start, after === -1 ? HTML.length : after);
}

function extractSettingsPane() {
  const start = HTML.indexOf('<div class="tab-pane" id="tab-settings">');
  assert.ok(start !== -1, 'tab-settings pane not found');
  const after = HTML.indexOf('<div class="tab-pane"', start + 1);
  return HTML.slice(start, after === -1 ? HTML.length : after);
}

test('Daily Operating Rhythm pane ships an empty checklist by default', () => {
  const pane = extractDailyOpsPane();
  // The Day 1 panel must render the neutral empty state rather than
  // founder/internal PROD tasks.
  assert.match(
    pane,
    /No operating rhythm yet/i,
    'Daily Ops Day 1 panel must show the neutral empty state'
  );
  assert.match(
    pane,
    /No weekly rhythm yet/i,
    'Daily Ops Weekly Rhythm card must show the neutral empty state'
  );
  assert.match(
    pane,
    /No escalation rules configured/i,
    'Daily Ops Escalation Rules card must show the neutral empty state'
  );
});

test('Daily Operating Rhythm pane carries no founder/internal PROD defaults', () => {
  const pane = extractDailyOpsPane();
  const FORBIDDEN = [
    /PROD-?01/,
    /PROD-?02/,
    /PROD-?03/,
    /PROD-?04/,
    /PROD-?05/,
    /Notion Sync/i,
    /Reply Intel/i,
    /Booking Brief/i,
    /Gmail reply/i,
    /Airtable writeback/i,
    /Jean-?Max/i,
    /ARCG internal/i,
    /ChartNav/i,
    /Clinical/i,
    /EHR/i
  ];
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(
      pane,
      re,
      `Daily Ops pane must not surface "${re.source}" by default`
    );
  }
});

test('Settings Automation Config is framed as optional legacy integrations', () => {
  const settings = extractSettingsPane();
  assert.match(
    settings,
    /Automation Config\s*<span[^>]*>\(optional legacy integrations\)/i,
    'Automation Config card title must call out the (optional legacy integrations) framing'
  );
  // Helper copy that reframes the legacy integrations as optional.
  assert.match(
    settings,
    /SourceDeck owns workflow automation locally\. These third-party integrations are optional/i
  );
});

test('Make.com / Instantly / Assessment Webhook field labels carry the (optional) qualifier', () => {
  const settings = extractSettingsPane();
  // Each label tagged with the (optional) qualifier so a buyer cannot
  // mistake any of these legacy fields for a required setup step.
  assert.match(
    settings,
    /Make\.com Booking Webhook\s*<span[^>]*>\(optional\)/i,
    'Make.com Booking Webhook label must carry (optional)'
  );
  assert.match(
    settings,
    /Instantly Campaign ID\s*<span[^>]*>\(optional\)/i,
    'Instantly Campaign ID label must carry (optional)'
  );
  assert.match(
    settings,
    /Assessment Webhook\s*<span[^>]*>\(optional\)/i,
    'Assessment Webhook label must carry (optional)'
  );
});

test('placeholder copy reinforces "leave blank to skip" on the legacy fields', () => {
  const settings = extractSettingsPane();
  assert.match(settings, /id="s-bookwh"[^>]*placeholder="[^"]*leave blank to skip/i);
  assert.match(settings, /id="s-instantly"[^>]*placeholder="[^"]*leave blank to skip/i);
  assert.match(settings, /id="s-asswh"[^>]*placeholder="[^"]*leave blank to skip/i);
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e-daily-ops-defaults\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e-daily-ops-defaults.test.js'
  );
});
