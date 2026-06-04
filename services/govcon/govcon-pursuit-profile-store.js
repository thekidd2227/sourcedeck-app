// services/govcon/govcon-pursuit-profile-store.js
//
// Safe local JSON persistence for the GovCon Pursuit Profile.
//
// This is intentionally NOT a database. It is a small read/write helper
// over a single JSON file under the operator's app-data directory so the
// SAM Sprint CLI, the SourceDeck UI, and tests can share a single source
// of truth for the GovCon Pursuit Profile without dragging in
// electron-store, sqlite, or any new dependency.
//
// HARD RULES
//   - Never store SAM_GOV_API_KEY (or any credential-shaped field) in the
//     profile. The schema strips secrets before save via stripSecrets().
//   - Read errors must NEVER crash the caller. A missing file returns
//     the default profile. A corrupt file returns the default profile
//     plus a warning in `issues`.
//   - Writes go through normalizePursuitProfile so the file is always
//     valid, manual_review_required is locked on, and unknown fields
//     are dropped.
//   - No filesystem watches, no background sync, no network calls.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  defaultPursuitProfile,
  normalizePursuitProfile,
  stripSecrets,
} = require('./govcon-pursuit-profile');

const STORE_FILENAME = 'govcon-pursuit-profile.json';
const APP_DIR_NAME = 'SourceDeck';

// Resolve the platform-appropriate per-user app data directory and return
// the canonical profile path. Falls back to ~/.sourcedeck on non-Windows
// systems when XDG_DATA_HOME isn't set, and to %APPDATA% on Windows.
function getDefaultProfilePath() {
  const platform = process.platform;
  let baseDir;
  if (platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(baseDir, APP_DIR_NAME, STORE_FILENAME);
  }
  if (platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
    return path.join(baseDir, APP_DIR_NAME, STORE_FILENAME);
  }
  // linux / *bsd / wsl
  baseDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(baseDir, APP_DIR_NAME.toLowerCase(), STORE_FILENAME);
}

// Load a profile from disk. Returns:
//   { profile, issues, isComplete, source, raw_path, was_corrupt }
//
// - `profile` is always a fully-normalized, frozen profile (default when
//   no file exists or the file is corrupt).
// - `issues` always includes whatever normalizePursuitProfile produced,
//   plus a 'warning' entry if the file was missing or corrupt.
// - `was_corrupt` is true only when the file existed but failed to parse.
function loadGovconPursuitProfile(options) {
  const opts = options || {};
  const fsLike = opts.fs || fs;
  const targetPath = opts.path || getDefaultProfilePath();

  let exists = false;
  try { exists = fsLike.existsSync(targetPath); } catch (_) { exists = false; }

  if (!exists) {
    const { profile, issues, isComplete } = normalizePursuitProfile({});
    return {
      profile,
      issues: issues.concat([{
        level: 'notice',
        field: 'profile.source',
        message: `No saved GovCon Pursuit Profile at ${targetPath}; using defaults.`,
      }]),
      isComplete,
      source: 'default',
      raw_path: targetPath,
      was_corrupt: false,
    };
  }

  let raw;
  try {
    raw = fsLike.readFileSync(targetPath, 'utf8');
  } catch (err) {
    const { profile, issues, isComplete } = normalizePursuitProfile({});
    return {
      profile,
      issues: issues.concat([{
        level: 'warning',
        field: 'profile.source',
        message: `Could not read profile at ${targetPath} (${err && err.code || err.message}); using defaults.`,
      }]),
      isComplete,
      source: 'default',
      raw_path: targetPath,
      was_corrupt: false,
    };
  }

  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parseError = err;
  }

  if (parseError) {
    const { profile, issues, isComplete } = normalizePursuitProfile({});
    return {
      profile,
      issues: issues.concat([{
        level: 'warning',
        field: 'profile.source',
        message: `Saved profile at ${targetPath} is not valid JSON (${parseError.message}); using defaults. Original file left in place.`,
      }]),
      isComplete,
      source: 'default',
      raw_path: targetPath,
      was_corrupt: true,
    };
  }

  // Strip any secrets BEFORE normalize so the schema sees a clean input.
  const cleaned = stripSecrets(parsed);
  const { profile, issues, isComplete } = normalizePursuitProfile(cleaned);
  return {
    profile,
    issues,
    isComplete,
    source: 'file',
    raw_path: targetPath,
    was_corrupt: false,
  };
}

// Save a profile to disk. Returns:
//   { ok, path, issues, profile, error? }
//
// - The profile is always run through normalizePursuitProfile + stripSecrets
//   before serialization.
// - Parent directories are created with mkdir({recursive:true}).
// - If write fails, returns { ok: false, error: <Error> } — callers decide
//   how to surface that.
function saveGovconPursuitProfile(profileInput, options) {
  const opts = options || {};
  const fsLike = opts.fs || fs;
  const targetPath = opts.path || getDefaultProfilePath();

  const cleaned = stripSecrets(profileInput || {});
  const { profile, issues, isComplete } = normalizePursuitProfile(cleaned);

  // Belt-and-suspenders: serialize then refuse to write anything matching
  // a SAM_GOV_API_KEY-shaped value. The normalizer + stripSecrets should
  // have already removed it; this is the last line of defense.
  const serialized = JSON.stringify(profile, null, 2) + '\n';
  if (/"SAM_GOV_API_KEY"\s*:\s*"[^"]+"/i.test(serialized)) {
    return {
      ok: false,
      path: targetPath,
      issues,
      profile,
      error: new Error('Refusing to write profile that contains a SAM_GOV_API_KEY value.'),
    };
  }
  // Sanity check for any other Bearer-like token literal that slipped through.
  if (/"[^"]*(api[-_]?key|secret|token|bearer|authorization)[^"]*"\s*:\s*"[^"]+"/i.test(serialized)) {
    return {
      ok: false,
      path: targetPath,
      issues,
      profile,
      error: new Error('Refusing to write profile: secret-shaped field detected after normalization.'),
    };
  }

  try {
    const dir = path.dirname(targetPath);
    fsLike.mkdirSync(dir, { recursive: true });
    fsLike.writeFileSync(targetPath, serialized, { mode: 0o600 });
  } catch (err) {
    return { ok: false, path: targetPath, issues, profile, error: err };
  }
  return { ok: true, path: targetPath, issues, profile, isComplete };
}

// Sanitize + freeze a profile for embedding into a sprint result, a report,
// or a UI snapshot. Returns a deep-cloned plain object (not a Proxy) with
// secrets stripped and manual_review_required forced true.
function exportProfileSnapshot(profileInput) {
  const cleaned = stripSecrets(profileInput || {});
  const { profile } = normalizePursuitProfile(cleaned);
  // JSON round-trip strips frozen-ness so callers can serialize without
  // re-creating immutability.
  const cloned = JSON.parse(JSON.stringify(profile));
  cloned.output_preference = cloned.output_preference || {};
  cloned.output_preference.manual_review_required = true;
  return cloned;
}

module.exports = Object.freeze({
  getDefaultProfilePath,
  loadGovconPursuitProfile,
  saveGovconPursuitProfile,
  exportProfileSnapshot,
  STORE_FILENAME,
  APP_DIR_NAME,
});
