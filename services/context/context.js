// services/context/context.js
// Local tenant/workspace/user/role context for the desktop app.
//
// Single-user desktop apps don't have real auth; this module gives the
// rest of the codebase a stable shape to query so it can pretend it
// does — making it easy to swap in real OIDC/IBM IAM later without
// rewriting every call site. Defaults route to a "viewer" identity so
// sensitive actions are blocked unless the user opts in.

'use strict';

const ROLES = ['owner', 'admin', 'analyst', 'viewer'];
const RANK  = { owner: 4, admin: 3, analyst: 2, viewer: 1 };

const DEFAULT_CONTEXT = Object.freeze({
  tenantId:    'local',
  workspaceId: 'default',
  userId:      'local-user',
  role:        'viewer'
});

function createContext(store) {
  // In-memory fallback for tests / first-boot before electron-store
  // has any value yet. Survives within the process lifetime.
  let memoryCtx = null;

  function load() {
    if (store) {
      const persisted = store.get('context', null);
      if (persisted) return persisted;
    }
    return memoryCtx || DEFAULT_CONTEXT;
  }
  function save(c) {
    memoryCtx = c;
    if (store) store.set('context', c);
  }

  function get() {
    const c = load();
    // Always coerce a known role.
    return {
      tenantId:    c.tenantId    || 'local',
      workspaceId: c.workspaceId || 'default',
      userId:      c.userId      || 'local-user',
      role:        ROLES.includes(c.role) ? c.role : 'viewer'
    };
  }

  function set(patch) {
    const next = { ...get(), ...(patch || {}) };
    if (!ROLES.includes(next.role)) next.role = 'viewer';
    save(next);
    return next;
  }

  /** True iff current role rank >= minRole rank. */
  function hasRole(minRole) {
    const c = get();
    return (RANK[c.role] || 0) >= (RANK[minRole] || 0);
  }

  /** Throws (or returns false in soft mode) when the action is not permitted. */
  function guardSensitiveAction(actionName, opts) {
    opts = opts || {};
    const minRole = opts.minRole || 'admin';
    if (hasRole(minRole)) return true;
    if (opts.soft) return false;
    const err = new Error(`sensitive action "${actionName}" requires role>=${minRole}; current role is "${get().role}"`);
    err.code = 'sensitive_action_denied';
    err.action = actionName;
    err.minRole = minRole;
    err.haveRole = get().role;
    throw err;
  }

  return { get, set, hasRole, guardSensitiveAction, ROLES };
}

module.exports = { createContext, ROLES, RANK, DEFAULT_CONTEXT };
