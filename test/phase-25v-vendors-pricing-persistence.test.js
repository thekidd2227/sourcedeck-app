/**
 * Phase 25V — Vendors / Pricing separation + per-solicitation persistence.
 *
 * Asserts the combined "Vendors + Pricing" tab is split into two focused
 * tabs, that each persists rows by solicitation id, that switching tabs does
 * not erase state, and that pricing can reference vendor quote data.
 *
 * Static string assertions only.
 *
 * Run:  node test/phase-25v-vendors-pricing-persistence.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'sourcedeck.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ': ' + e.message); }
}

console.log('\n=== Phase 25V — Vendors / Pricing separation + persistence ===\n');

// 1. Combined tab removed; two focused tabs present.
test('Vendors and Pricing are separate tabs; combined tab removed', () => {
  assert.ok(/data-gc-tab="vendors"/.test(HTML), 'Vendors tab present');
  assert.ok(/data-gc-tab="pricing"/.test(HTML), 'Pricing tab present');
  assert.ok(/data-gc-tab-page="vendors"/.test(HTML), 'Vendors tab page present');
  assert.ok(/data-gc-tab-page="pricing"/.test(HTML), 'Pricing tab page present');
  assert.ok(!/data-gc-tab="vendors-pricing"/.test(HTML), 'combined Vendors + Pricing tab removed');
  assert.ok(!/data-gc-tab-page="vendors-pricing"/.test(HTML), 'combined Vendors + Pricing tab page removed');
});

// 2. Vendors tab keeps the vendor quote room surfaces.
test('Vendors tab keeps vendor quote room', () => {
  assert.ok(/id="gc-vqr"/.test(HTML), 'Vendor Quote Room present');
  assert.ok(/id="gc-vqr-intake-form"/.test(HTML), 'vendor intake form present');
  assert.ok(/gcVqrAddQuote/.test(HTML), 'add vendor row handler present');
});

// 3. Pricing tab keeps the pricing worksheet surfaces.
test('Pricing tab keeps pricing worksheet', () => {
  assert.ok(/id="gc-pricing-page"/.test(HTML), 'Pricing tab page present');
  assert.ok(/id="gc-pricing"/.test(HTML), 'Pricing Worksheet present');
  assert.ok(/gcPricingRecalc/.test(HTML), 'pricing recalc handler present');
});

// 4. Per-solicitation selectors on both tabs.
test('per-solicitation selectors on Vendors and Pricing tabs', () => {
  assert.ok(/id="gc-vendors-sol-select"/.test(HTML), 'Vendors solicitation selector present');
  assert.ok(/id="gc-pricing-sol-select"/.test(HTML), 'Pricing solicitation selector present');
  assert.ok(/gcVendorsSolSelect/.test(HTML), 'Vendors selector handler present');
  assert.ok(/gcPricingSolSelect/.test(HTML), 'Pricing selector handler present');
});

// 5. Rows persist by solicitation id (archive keyed by sol id).
test('vendor + pricing data persist by solicitation id', () => {
  assert.ok(/sd\.govcon\.activeSolicitation\.v1/.test(HTML), 'active solicitation key present');
  assert.ok(/sd\.govcon\.vendorQuotes\.bySol\.v1/.test(HTML), 'vendor per-solicitation archive present');
  assert.ok(/sd\.govcon\.pricingWorksheet\.bySol\.v1/.test(HTML), 'pricing per-solicitation archive present');
  assert.ok(/gcV25SelectSolicitation/.test(HTML), 'solicitation switch swaps working sets');
  assert.ok(/gcV25PersistWorking/.test(HTML), 'add/edit persists working set per solicitation');
});

// 6. Switching tabs does not erase state.
test('switching tabs does not erase vendor/pricing state', () => {
  // Renderers read from localStorage on every render, and the per-tab hook
  // re-renders the active solicitation's working set on tab switch.
  assert.ok(/gcV25SolHook/.test(HTML), 'tab hook re-renders persisted state');
  assert.ok(/loadArr\(VQR_KEY\)|loadJSON\('sd\.govcon\.vendorQuotes\.v1'/.test(HTML) || /vendorQuotes\.v1/.test(HTML),
    'vendor renderer reads persisted store');
});

// 7. Pricing can reference vendor quote data.
test('pricing references vendor quote data', () => {
  assert.ok(/Quote Comparison/.test(HTML), 'Quote Comparison surface present in pricing');
  assert.ok(/id="gc-pr-quote-compare-table"/.test(HTML), 'quote comparison table present');
  assert.ok(/id="gc-pr-f-vendor"/.test(HTML), 'pricing subcontractor/vendor cost field present');
});

// 8. No external send / no auto-contact (controls, not safety copy).
test('no external send or vendor auto-contact', () => {
  assert.ok(!/>Submit Quote</.test(HTML), 'no Submit Quote control');
  assert.ok(!/>Submit Bid</.test(HTML), 'no Submit Bid control');
  assert.ok(!/>Send Email</.test(HTML), 'no Send Email control');
  assert.ok(/SourceDeck does not submit bids or quotes/.test(HTML), 'no-submit copy preserved');
});

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${passed + failed} Phase 25V vendors-pricing-persistence checks ===\n`);
process.exit(failed ? 1 : 0);
