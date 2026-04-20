// ═══════════════════════════════════════════════════════════════════════════
// ChartNav live integration — phase 38
// ───────────────────────────────────────────────────────────────────────────
// Replaces the static CHARTNAV_MANIFEST shell with live consumption of the
// real ChartNav contracts:
//
//   GET <base>/capability/manifest          (public — capability card)
//   GET <base>/deployment/manifest          (public — build fingerprint)
//   GET <base>/admin/deployment/overview    (admin — live telemetry)
//
// Contract reference: chartnav-platform commit ce6c72e,
//   apps/api/app/services/{capability_manifest.py,deployment_telemetry.py}
//   docs/build/45-control-plane-and-productization.md
//
// Honest-failure rules:
//   - No silent stub fallback. Every failure mode has a stable error_code
//     the UI keys off ('no_base_url', 'no_admin_token', 'http_<status>',
//     'invalid_manifest_shape', 'invalid_telemetry_shape', 'network_error').
//   - manifest.state and telemetry.state are independent — telemetry can be
//     'unavailable' (no token) or 'failed' (token but server said no) while
//     manifest stays 'live'.
//   - summaryState() collapses both into a single label the renderer + tests
//     pin against.
//
// UMD wrap so the same file loads in:
//   - Electron renderer (browser)         → window.ChartNavIntegration
//   - Node test harness (test/*.test.js)  → require('../chartnav-integration')
// ═══════════════════════════════════════════════════════════════════════════

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChartNavIntegration = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Pure helpers ────────────────────────────────────────────────────────

  function normalizeBase(url) {
    if (typeof url !== 'string') return '';
    return url.trim().replace(/\/+$/, '');
  }

  function _isObj(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  }

  // Manifest shape comes from capability_manifest.py::card_to_dict.
  // Validate the load-bearing keys + fail loud on shape drift.
  function _validateManifest(body) {
    if (!_isObj(body)) return 'invalid_manifest_shape';
    if (typeof body.key !== 'string' || !body.key) return 'invalid_manifest_shape';
    if (typeof body.name !== 'string') return 'invalid_manifest_shape';
    if (!Array.isArray(body.setup_inputs)) return 'invalid_manifest_shape';
    if (!Array.isArray(body.prerequisites)) return 'invalid_manifest_shape';
    if (!Array.isArray(body.implementation_modes)) return 'invalid_manifest_shape';
    return null;
  }

  // Overview shape comes from deployment_telemetry.py::deployment_overview.
  function _validateTelemetry(body) {
    if (!_isObj(body)) return 'invalid_telemetry_shape';
    if (typeof body.deployment_id === 'undefined') return 'invalid_telemetry_shape';
    if (!_isObj(body.release)) return 'invalid_telemetry_shape';
    if (!_isObj(body.inputs)) return 'invalid_telemetry_shape';
    if (typeof body.health !== 'string') return 'invalid_telemetry_shape';
    return null;
  }

  // ── Factory: produce a fresh integration instance ───────────────────────
  // Tests construct one per scenario so module state never leaks between
  // assertions. The renderer also constructs one and stores it on window.
  function createIntegration(deps) {
    deps = deps || {};
    var _conn = { base_url: '', admin_token: '' };
    var _state = {
      connection: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
      manifest: { state: 'idle', data: null, error: null, fetched_at: null },
      telemetry: { state: 'idle', data: null, error: null, fetched_at: null }
    };

    function _fetch() {
      // deps.fetch wins (test injection). Otherwise globalThis.fetch.
      if (deps.fetch) return deps.fetch;
      if (typeof fetch === 'function') return fetch;
      return null;
    }

    function getConnection() {
      return { base_url: _conn.base_url, admin_token: _conn.admin_token ? '***' : '' };
    }

    function setConnection(next) {
      if (!_isObj(next)) return;
      if (typeof next.base_url === 'string') _conn.base_url = next.base_url;
      if (typeof next.admin_token === 'string') _conn.admin_token = next.admin_token;
    }

    function getState() {
      // Defensive: hand back a copy so callers can't mutate internals.
      return JSON.parse(JSON.stringify(_state));
    }

    function reset() {
      _state = {
        connection: 'disconnected',
        manifest: { state: 'idle', data: null, error: null, fetched_at: null },
        telemetry: { state: 'idle', data: null, error: null, fetched_at: null }
      };
    }

    // ── Manifest fetch ────────────────────────────────────────────────────
    function fetchManifest() {
      var fetchFn = _fetch();
      var base = normalizeBase(_conn.base_url);
      if (!base) {
        return Promise.resolve({ ok: false, error_code: 'no_base_url' });
      }
      if (!fetchFn) {
        return Promise.resolve({ ok: false, error_code: 'no_fetch_available' });
      }
      var url = base + '/capability/manifest';
      return Promise.resolve()
        .then(function () { return fetchFn(url, { headers: { 'Accept': 'application/json' } }); })
        .then(function (res) {
          if (!res || !res.ok) {
            var status = (res && res.status) || 0;
            return { ok: false, error_code: 'http_' + status };
          }
          return Promise.resolve(res.json()).then(function (body) {
            var shapeErr = _validateManifest(body);
            if (shapeErr) return { ok: false, error_code: shapeErr };
            return { ok: true, data: body };
          });
        })
        .catch(function (e) {
          return {
            ok: false,
            error_code: 'network_error',
            detail: (e && e.message) || String(e)
          };
        });
    }

    // ── Telemetry fetch ──────────────────────────────────────────────────
    function fetchTelemetry() {
      var fetchFn = _fetch();
      var base = normalizeBase(_conn.base_url);
      if (!base) {
        return Promise.resolve({ ok: false, error_code: 'no_base_url' });
      }
      if (!_conn.admin_token) {
        return Promise.resolve({ ok: false, error_code: 'no_admin_token' });
      }
      if (!fetchFn) {
        return Promise.resolve({ ok: false, error_code: 'no_fetch_available' });
      }
      var url = base + '/admin/deployment/overview';
      // ChartNav's auth_mode='header' (dev) reads X-User-Email; bearer-mode
      // reads Authorization. We send both so either works without the
      // operator having to specify which auth shape ChartNav is in. The
      // server ignores the one it doesn't use.
      var headers = {
        'Accept': 'application/json',
        'X-User-Email': _conn.admin_token,
        'Authorization': 'Bearer ' + _conn.admin_token
      };
      return Promise.resolve()
        .then(function () { return fetchFn(url, { headers: headers }); })
        .then(function (res) {
          if (!res || !res.ok) {
            var status = (res && res.status) || 0;
            return { ok: false, error_code: 'http_' + status };
          }
          return Promise.resolve(res.json()).then(function (body) {
            var shapeErr = _validateTelemetry(body);
            if (shapeErr) return { ok: false, error_code: shapeErr };
            return { ok: true, data: body };
          });
        })
        .catch(function (e) {
          return {
            ok: false,
            error_code: 'network_error',
            detail: (e && e.message) || String(e)
          };
        });
    }

    // ── Connect: end-to-end orchestration ────────────────────────────────
    // Always attempt manifest first. Telemetry is attempted only if a
    // token is configured AND the manifest fetch landed clean — there's
    // no point hammering /admin if the deployment isn't ChartNav.
    function connect() {
      _state.connection = 'connecting';
      _state.manifest = { state: 'loading', data: null, error: null, fetched_at: null };
      _state.telemetry = { state: 'idle', data: null, error: null, fetched_at: null };
      return fetchManifest().then(function (m) {
        _state.manifest.fetched_at = Date.now();
        if (!m.ok) {
          _state.connection = 'disconnected';
          _state.manifest.state = 'failed';
          _state.manifest.error = m.error_code;
          return getState();
        }
        _state.connection = 'connected';
        _state.manifest.state = 'live';
        _state.manifest.data = m.data;
        if (!_conn.admin_token) {
          _state.telemetry.state = 'unavailable';
          _state.telemetry.error = 'no_admin_token';
          _state.telemetry.fetched_at = Date.now();
          return getState();
        }
        _state.telemetry.state = 'loading';
        return fetchTelemetry().then(function (t) {
          _state.telemetry.fetched_at = Date.now();
          if (t.ok) {
            _state.telemetry.state = 'live';
            _state.telemetry.data = t.data;
          } else {
            _state.telemetry.state = 'failed';
            _state.telemetry.error = t.error_code;
          }
          return getState();
        });
      });
    }

    // ── State summary ────────────────────────────────────────────────────
    // Pure function of _state — every renderer + every test pins to this
    // matrix. Adding a new state means a docs change, not a UI guess.
    function summaryState() {
      if (_state.connection === 'connecting') return 'connecting';
      if (_state.connection === 'disconnected') {
        if (_state.manifest.state === 'failed') return 'manifest_failed';
        return 'disconnected';
      }
      // connection === 'connected'
      if (_state.manifest.state !== 'live') return 'manifest_failed';
      if (_state.telemetry.state === 'live') return 'fully_connected';
      if (_state.telemetry.state === 'unavailable') return 'manifest_only';
      if (_state.telemetry.state === 'failed') return 'manifest_only_telemetry_failed';
      if (_state.telemetry.state === 'loading') return 'manifest_only_telemetry_loading';
      return 'manifest_only';
    }

    return {
      // public surface
      normalizeBase: normalizeBase,
      getConnection: getConnection,
      setConnection: setConnection,
      getState: getState,
      reset: reset,
      fetchManifest: fetchManifest,
      fetchTelemetry: fetchTelemetry,
      connect: connect,
      summaryState: summaryState
    };
  }

  return {
    createIntegration: createIntegration,
    normalizeBase: normalizeBase,
    // Validators exposed for unit tests; renderer doesn't need them.
    _validateManifest: _validateManifest,
    _validateTelemetry: _validateTelemetry
  };
});
