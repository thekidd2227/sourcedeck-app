'use strict';

/**
 * Phase 25E.3 — Airtable User-Facing Copy Cleanup
 *
 * Asserts the buyer-visible CTAs, pane subtitles, and labels no longer
 * lead with the word "Airtable". The underlying integration code,
 * function names, and internal JS status messages are intentionally
 * unchanged: the integration is preserved as an optional legacy CRM
 * channel, but it is no longer the primary visible surface.
 *
 * This is a copy-only sub-phase. A future sub-phase may relocate the
 * integration to a hidden/advanced surface or replace it with a
 * local-CRM contract; until then the boundary is explicit:
 * - Primary buyer CTAs use neutral CRM language ("Save Lead", "Save
 *   to your CRM").
 * - The Settings "Airtable PAT" label is retained because it
 *   identifies the credential, but it is contextualized as an
 *   optional legacy integration.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO_ROOT, 'sourcedeck.html'), 'utf8');

test('Create Lead pane subtitle no longer reads "Push directly to Airtable Leads table"', () => {
  assert.doesNotMatch(
    HTML,
    /Push directly to Airtable Leads table/,
    'Phase 25E.3 retired the Airtable-led subtitle on the Create Lead pane'
  );
});

test('Create Lead pane subtitle is "Save a new lead to your CRM"', () => {
  // Specific phrasing so a future regression that swaps in a different
  // CRM-neutral copy is also caught (we want one canonical phrasing).
  assert.match(
    HTML,
    /Create Lead<\/span>[\s\S]{0,80}Save a new lead to your CRM/
  );
});

test('Create Lead primary CTA reads "Save Lead", not "Push to Airtable"', () => {
  assert.doesNotMatch(
    HTML,
    />\s*⬆\s*Push to Airtable\s*</,
    'Phase 25E.3 retired the "Push to Airtable" primary CTA on Create Lead'
  );
  // The button id, onclick, and function name are intentionally
  // preserved; only the visible label flips.
  assert.match(
    HTML,
    /id="cl-btn"[^>]*onclick="createLeadAirtable\(\)">⬆ Save Lead</
  );
});

test('AI Lead Builder pane subtitle no longer leads with "Airtable"', () => {
  assert.doesNotMatch(
    HTML,
    /AI-assisted prospect research\s*→\s*push to your CRM \/ Airtable/,
    'Phase 25E.3 retired the Airtable-led subtitle on AI Lead Builder'
  );
  assert.match(
    HTML,
    /AI Lead Builder<\/span>[\s\S]{0,80}AI-assisted prospect research → save to your CRM/
  );
});

test('Command Center cmd-inbox empty state no longer reads "Airtable Leads"', () => {
  assert.doesNotMatch(
    HTML,
    /Aggregated from Airtable Leads \+ Email Events/,
    'Phase 25E.3 reworded the cmd-inbox aggregation copy'
  );
  assert.match(
    HTML,
    /Aggregated from your leads pipeline and email events/
  );
});

test('Response Desk CRM field label no longer says "Optional CRM / Airtable record ID"', () => {
  assert.doesNotMatch(
    HTML,
    /Optional CRM \/ Airtable record ID/,
    'Phase 25E.3 dropped the Airtable callout from the Response Desk CRM record field'
  );
  assert.match(
    HTML,
    /Optional CRM record ID/
  );
});

test('Response Desk save-to-CRM button no longer reads "Save analysis to CRM/Airtable"', () => {
  assert.doesNotMatch(
    HTML,
    /Save analysis to CRM\/Airtable/,
    'Phase 25E.3 dropped the slash-Airtable wording on the analysis save button'
  );
  assert.match(
    HTML,
    /Save analysis to CRM</
  );
});

test('Settings PAT field is contextualized as an optional legacy integration', () => {
  // The label still reads "Airtable PAT" so the operator knows which
  // credential they are entering, but it is followed by the explicit
  // "optional legacy CRM integration" qualifier.
  assert.match(
    HTML,
    /Airtable PAT\s*<span[^>]*>\(optional legacy CRM integration\)/
  );
  // And the helper copy explicitly reframes the integration as
  // optional rather than required.
  assert.match(
    HTML,
    /SourceDeck owns lead management locally\. Airtable is supported as an optional legacy export integration only/
  );
});

test('test is wired into npm test chain', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    /test\/phase-25e3-airtable-user-facing-copy\.test\.js/.test(pkg.scripts.test),
    'package.json scripts.test must include test/phase-25e3-airtable-user-facing-copy.test.js'
  );
});
