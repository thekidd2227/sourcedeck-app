// Phase 25AH (follow-up) · sam-source-fetch HTML / app-shell rejection
// ──────────────────────────────────────────────────────────────────────
// Phase 25AG hardened the package downloader against HTML responses.
// The audit then found that the legacy source-material path —
// services/govcon/sam-source-fetch.js, called from the renderer via
// gcW25FetchDescription / gcW25ImportResource — still returned raw
// HTML bodies and the renderer stored them in sd.govcon.sourceMaterials.v1.
//
// This test pins the follow-up: sam-source-fetch routes every response
// through the shared body classifier (services/govcon/sam-body-classifier.js)
// before returning text. HTML / app-shell / SAM-login / generic-error
// responses come back as { ok:false, reason } and never include the
// rejected body.

const path = require('path');
const svc = require(path.join('..', 'services', 'govcon', 'sam-source-fetch.js'));
const { classifyResponseBody } = require(path.join('..', 'services', 'govcon', 'sam-body-classifier.js'));

function assert(c, m){ if(!c){ console.error('  ✗ ' + m); process.exitCode = 1; } else { console.log('  ✓ ' + m); } }

console.log('Phase 25AH · sam-source-fetch HTML rejection');

// ── Shared classifier exposes the canonical reason set ──────────────
(function(){
  const head = '<!doctype html><html><head><title>Test</title></head><body>';
  // Generic HTML: unexpected_html_response.
  let v = classifyResponseBody(head + 'Body</body></html>', 'text/html');
  assert(v.ok === false && v.reason === 'unexpected_html_response',
    'Generic HTML → unexpected_html_response (got ' + JSON.stringify(v) + ')');
  // SAM login HTML.
  v = classifyResponseBody(head + '<h1>Sign in to SAM.gov</h1></body></html>', 'text/html');
  assert(v.ok === false && v.reason === 'sam_login_html_response',
    'SAM-login HTML → sam_login_html_response (got ' + JSON.stringify(v) + ')');
  // Generic error HTML.
  v = classifyResponseBody(head + '<h1>Forbidden</h1><p>HTTP 403</p></body></html>', 'text/html');
  assert(v.ok === false && v.reason === 'non_attachment_html_response',
    'Generic error HTML → non_attachment_html_response (got ' + JSON.stringify(v) + ')');
  // SourceDeck app-shell HTML.
  v = classifyResponseBody(head + 'SourceDeck GovCon Pipeline ...\n.cmd-flow { display: flex; }</body></html>', 'text/html');
  assert(v.ok === false && v.reason === 'app_shell_html_response',
    'App-shell HTML → app_shell_html_response (got ' + JSON.stringify(v) + ')');
  // Real solicitation text passes (no HTML at all).
  v = classifyResponseBody('SOLICITATION SF1449. The Department of the Navy seeks janitorial services.', 'text/plain');
  assert(v.ok === true,
    'Real solicitation text → ok:true');
  // PDF magic bytes pass even with text/html content-type (defensive).
  const pdfBuf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
  v = classifyResponseBody(pdfBuf, 'text/html');
  assert(v.ok === true,
    'PDF magic bytes win even if content-type lies as text/html');
})();

// ── sam-source-fetch wires the classifier into the response path ────
(function(){
  function makeMock(body, contentType){
    const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    return {
      ok: true, status: 200,
      headers: { get: function(k){ return k === 'content-type' ? (contentType || 'text/html') : ''; } },
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      text: async () => buf.toString('utf8')
    };
  }
  // HTML → ok:false, no text in response.
  const fetcher1 = svc.createSamSourceFetchService({
    getApiKey: async () => 'K',
    fetch: async () => makeMock('<!doctype html><html><body>Welcome</body></html>', 'text/html')
  });
  return fetcher1.fetchSource({ url: 'https://api.sam.gov/x?noticeid=1' }).then(r => {
    assert(r.ok === false, 'HTML response → ok:false');
    assert(r.reason === 'unexpected_html_response',
      'Reason = unexpected_html_response (got ' + r.reason + ')');
    assert(r.text == null, 'Response carries NO text field on rejection (got ' + (typeof r.text) + ')');
    assert(typeof r.sourceUrlSafe === 'string' && !/api_key/i.test(r.sourceUrlSafe),
      'Rejected response still surfaces api_key-free sourceUrlSafe');
  }).then(() => {
    // SAM-login HTML.
    const fetcher2 = svc.createSamSourceFetchService({
      getApiKey: async () => 'K',
      fetch: async () => makeMock('<!doctype html><html><head><title>Sign in - SAM.gov</title></head><body><h1>Sign in to SAM.gov</h1></body></html>', 'text/html')
    });
    return fetcher2.fetchSource({ url: 'https://api.sam.gov/x' }).then(r => {
      assert(r.ok === false && r.reason === 'sam_login_html_response',
        'SAM-login HTML → sam_login_html_response (got ' + r.reason + ')');
      assert(r.text == null, 'SAM-login response carries no text body');
    });
  }).then(() => {
    // SourceDeck app-shell HTML — the actual reported runtime bug.
    const fetcher3 = svc.createSamSourceFetchService({
      getApiKey: async () => 'K',
      fetch: async () => makeMock('<html><body>SourceDeck GovCon Pipeline\n.cmd-flow { }\n.cmd-pill { }</body></html>', 'text/html')
    });
    return fetcher3.fetchSource({ url: 'https://api.sam.gov/x' }).then(r => {
      assert(r.ok === false && r.reason === 'app_shell_html_response',
        'App-shell HTML → app_shell_html_response (got ' + r.reason + ')');
      assert(r.text == null, 'App-shell response carries no text body');
      assert(JSON.stringify(r).indexOf('cmd-flow') < 0,
        'App-shell markers never appear in the rejected response payload');
    });
  }).then(() => {
    // Real solicitation text passes through (and gets redacted of any
    // echoed key, per Phase 25W).
    const fetcher4 = svc.createSamSourceFetchService({
      getApiKey: async () => 'SECRETKEY999',
      fetch: async () => makeMock('SOLICITATION SF1449. Janitorial services. api_key=SECRETKEY999 echoed', 'text/plain')
    });
    return fetcher4.fetchSource({ url: 'https://api.sam.gov/x' }).then(r => {
      assert(r.ok === true, 'Real solicitation text → ok:true');
      assert(/SOLICITATION SF1449/.test(r.text), 'Returned text retains the real solicitation body');
      assert(!/SECRETKEY999/.test(r.text), 'Returned text never contains the raw api_key value');
      assert(/REDACTED/.test(r.text), 'Echoed key is replaced with REDACTED');
    });
  }).then(() => {
    console.log(process.exitCode ? 'Phase 25AH · sam-source-fetch HTML rejection: FAILED' : 'Phase 25AH · sam-source-fetch HTML rejection: OK');
    process.exit(process.exitCode ? 1 : 0);
  }).catch(err => {
    assert(false, 'Async exercise crashed: ' + err.message);
    console.log('Phase 25AH · sam-source-fetch HTML rejection: FAILED');
    process.exit(1);
  });
})();
