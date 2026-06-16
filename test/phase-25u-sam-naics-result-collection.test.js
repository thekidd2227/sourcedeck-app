// Phase 25U · SAM.gov NAICS result collection
// ──────────────────────────────────────────────────────────────────────
// Drive createSamSearchService with an injected fetch and verify:
//   - the ncode param is set when NAICS is provided
//   - controlled pagination fires up to the maxPages cap when NAICS is
//     present
//   - the selected result limit is enforced
//   - unrelated NAICS rows never appear in the results (the SAM
//     service trusts the server-side filter but applyTargeting acts
//     as a safety backstop when the renderer asks for it)
//   - the URL never accidentally drops api_key encoding

const path = require('path');
const { createSamSearchService } = require(path.join('..', 'services', 'govcon', 'sam-search.js'));

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25U · SAM.gov NAICS result collection');

function mkRow(noticeId, naicsCode){
  return {
    noticeId,
    title: 'Opp ' + noticeId,
    naicsCode,
    type: 'Solicitation',
    fullParentPathName: 'DOD',
    responseDeadLine: '2026-12-31',
    postedDate: '2026-06-01',
    placeOfPerformance: { city: 'Austin', state: { code: 'TX' } }
  };
}

(async function(){
  // ── 1. ncode param fires when NAICS is provided ──────────────────
  let lastUrl = '';
  let svc = createSamSearchService({
    fetch: async (url) => {
      lastUrl = url;
      return {
        ok: true,
        json: async () => ({ totalRecords: 2, opportunitiesData: [mkRow('a', '541611'), mkRow('b', '541611')] })
      };
    },
    getApiKey: async () => 'TEST-KEY-DO-NOT-LOG'
  });
  let r = await svc.search({ naics: ['541611'], limit: 25 });
  assert(/[&?]ncode=541611/.test(lastUrl),
    'SAM URL carries ?ncode=541611 when NAICS is provided');
  assert(/api_key=TEST-KEY-DO-NOT-LOG/.test(lastUrl),
    'SAM URL still carries api_key (service injects it, never the renderer)');
  assert(r.ok && r.results.length === 2,
    'Service returns 2 rows for the matching NAICS');
  assert(r.results.every(row => row.naics === '541611'),
    'Every returned row carries NAICS 541611');

  // ── 2. Multi-NAICS — comma-joined into one ncode param ───────────
  await svc.search({ naics: ['541611', '561720', '541618'], limit: 25 });
  assert(/ncode=541611%2C561720%2C541618/.test(lastUrl),
    'Multi-NAICS is comma-joined into one ncode param (URL-encoded ,)');

  // ── 3. Controlled pagination respects the maxPages cap ───────────
  let pageCalls = 0;
  let lastOffset = -1;
  svc = createSamSearchService({
    fetch: async (url) => {
      pageCalls++;
      const m = url.match(/offset=(\d+)/);
      lastOffset = m ? parseInt(m[1], 10) : -1;
      // Always return a full page of 25 rows so the pager keeps going.
      return {
        ok: true,
        json: async () => ({ totalRecords: 500, opportunitiesData: Array.from({length: 25}, (_, i) => mkRow('p' + pageCalls + '-' + i, '541611')) })
      };
    },
    getApiKey: async () => 'K'
  });
  r = await svc.search({ naics: ['541611'], limit: 25, maxPages: 5 });
  assert(pageCalls === 5,
    'Pagination fires exactly maxPages=5 times when every page is full (got ' + pageCalls + ')');
  assert(lastOffset === 4 * 25,
    'Final page offset = (maxPages-1) * limit = 100 (got ' + lastOffset + ')');
  assert(r.results.length > 0,
    'Service returns the accumulated, deduped results');

  // ── 4. Pagination stops early when a page is short ───────────────
  pageCalls = 0;
  svc = createSamSearchService({
    fetch: async () => {
      pageCalls++;
      const body = pageCalls === 1
        ? { totalRecords: 30, opportunitiesData: Array.from({length: 25}, (_, i) => mkRow('full-' + i, '541611')) }
        : { totalRecords: 30, opportunitiesData: Array.from({length: 5},  (_, i) => mkRow('part-' + i, '541611')) };
      return { ok: true, json: async () => body };
    },
    getApiKey: async () => 'K'
  });
  r = await svc.search({ naics: ['541611'], limit: 25, maxPages: 5 });
  assert(pageCalls === 2,
    'Pagination stops as soon as a page returns fewer than limit rows (got ' + pageCalls + ')');

  // ── 5. Unrelated NAICS server response — applyTargeting backstop ──
  // If SAM.gov misbehaves and includes unrelated NAICS, the targeting
  // backstop (when naicsAllow is provided) keeps the result list
  // honest. The renderer also runs its own backstop on top of this.
  svc = createSamSearchService({
    fetch: async () => ({
      ok: true,
      json: async () => ({ totalRecords: 4, opportunitiesData: [
        mkRow('a', '541611'),
        mkRow('b', '334519'), // unrelated
        mkRow('c', '541611'),
        mkRow('d', '333415')  // unrelated
      ]})
    }),
    getApiKey: async () => 'K'
  });
  r = await svc.search({ naics: ['541611'], limit: 25, maxPages: 1 });
  assert(r.results.length === 2,
    'Service applyTargeting drops unrelated NAICS rows even if SAM.gov misbehaves (got ' + r.results.length + ')');
  assert(r.results.every(row => row.naics === '541611'),
    'Every visible row matches the requested NAICS after applyTargeting');

  // ── 6. URL never embeds raw key payload outside ?api_key= ─────────
  await svc.search({ naics: ['541611'], limit: 25 });
  // (we know api_key= is present; ensure nothing leaks into header-like spots)
  const url = lastUrl;
  const apiKeyOccurrences = (url.match(/api_key=/g) || []).length;
  assert(apiKeyOccurrences === 1,
    'Exactly one api_key= occurrence in the SAM.gov URL');

  console.log(process.exitCode ? 'Phase 25U · NAICS result collection: FAILED' : 'Phase 25U · NAICS result collection: OK');
  process.exit(process.exitCode ? 1 : 0);
})().catch(err => {
  assert(false, 'async exercise crashed: ' + err.message);
  console.log('Phase 25U · NAICS result collection: FAILED');
  process.exit(1);
});
