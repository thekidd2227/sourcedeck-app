// app/main/startup/privacy-scrub.js
//
// First-run privacy scrub. Runs before the BrowserWindow is created. If any
// owner-identifying string from the base64 blocklist is found in stored
// state, drop all non-essential state. Credentials (encrypted) are left
// intact so the user does not lose their own API keys.
//
// The blocklist fragments are base64-encoded so the packaged asar (and any
// `strings(1)` scan of it) does NOT contain the literal owner strings.
// See test/first-run-safety.test.js for the decoded set (kept out of
// shipping source).
//
// Phase 1 composition-root extraction. Behavior is byte-for-byte identical
// to the previous in-file implementation in main.js. No new dependencies,
// no contract change. This module is invoked once from main.js at boot.

'use strict';

const PRIVACY_SCRUB_B64_BLOCKS = Object.freeze([
  'QVJDRyBTeXN0ZW1z',
  'YXJjZ3N5c3RlbXM=',
  'YXJpdmVyZ3JvdXA=',
  'ZGlnaWFyY2dzeXN0ZW1z',
  'YXJjZy5haQ==',
  'SmVhbi1NYXg=',
  'amVhbm1heA=='
]);

function decodeBlocklist(b64Blocks){
  return (b64Blocks || PRIVACY_SCRUB_B64_BLOCKS).map(s => Buffer.from(s, 'base64').toString('utf8'));
}

// Run the scrub against an electron-store-shaped object. Returns
// { contaminated, appliedAt } so callers can audit/log if needed.
// Never throws — boot must continue even when scrub fails.
function runPrivacyScrub({ store, blocklist }){
  const result = { contaminated: false, appliedAt: null };
  try {
    const owners = blocklist || decodeBlocklist();
    const snapshot = (store && store.store) || {};
    const json = JSON.stringify(snapshot);
    const contaminated = owners.some(s => json.includes(s));
    if (!contaminated) return result;

    const keep = {};
    if (snapshot.keys) keep.keys = snapshot.keys;
    store.clear();
    Object.keys(keep).forEach(k => store.set(k, keep[k]));
    const appliedAt = new Date().toISOString();
    store.set('_privacy_scrub_applied_at', appliedAt);
    result.contaminated = true;
    result.appliedAt = appliedAt;
  } catch (_) {
    // Never crash boot on scrub failure.
  }
  return result;
}

module.exports = {
  runPrivacyScrub,
  decodeBlocklist,
  PRIVACY_SCRUB_B64_BLOCKS
};
