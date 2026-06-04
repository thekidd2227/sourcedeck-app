# Renderer Boot Syntax Fix — Audit

**Branch:** `fix/renderer-boot-syntax-errors`
**Base:** `main` @ `f23bd07` (Phase 21A buyer-demo acceptance; docs-only)
**Date:** 2026-06-04
**Severity:** BLOCKER — app renderer JavaScript did not execute.

## 1. Problem

Post-PR #52 macOS visual QA found that SourceDeck launched and rendered its
**static** markup, but the **core renderer JavaScript never executed**. Tab
navigation and every dynamic function were dead:

- `openTab`, `renderDashboard`, `renderActivityFeed`, `filterLeads`, `ARCG_OS`
  were all `undefined`.
- Clicking nav buttons did not switch panes.
- Static empty-states rendered (they are authored directly in markup), but the
  JS-driven UI was inert.

The default-state cleanup screens *looked* clean only because PR #52 had
hard-coded the empty states into static markup — masking the fact that the
renderer's script never ran.

## 2. Root causes

Two independent parse-time failures in the renderer:

### 2a. Malformed inline `toast()` call — `sourcedeck.html:6973`

```js
// BEFORE (invalid):
if(typeof toast==='function')toast(r.ok?'CRM updated: '+rid:'Save error','+(r.ok?'ok':'err'));
```

The fragment `,'+(r.ok?'ok':'err')` opens a stray string literal (`'+(r.ok?'`)
immediately followed by the identifier `ok`, producing:

```
SyntaxError: missing ) after argument list
```

Because this line lives inside the single large inline `<script>` block
(`sourcedeck.html` lines ~4787–9599), the **entire block was discarded** by the
parser — which is why `openTab`, `renderDashboard`, `ARCG_OS`, etc. (all defined
in that block) were `undefined`.

### 2b. Global `_api` collision between two classic scripts

`services/response-desk.js` and `services/default-state-policy.js` are both
loaded as classic `<script src>` tags in `sourcedeck.html`. Each declared a
top-level `const _api`. Loaded into the same global lexical scope, the second
threw:

```
SyntaxError: Identifier '_api' has already been declared
```

`services/default-state-policy.js` (loaded second, added by PR #52) was the one
that failed to evaluate.

## 3. Fixes

### 3a. `sourcedeck.html:6973` — corrected `toast()` arguments

```js
// AFTER (valid; preserves intent — message + toast type):
if(typeof toast==='function')toast(r.ok?'CRM updated: '+rid:'Save error',r.ok?'ok':'err');
```

Minimal change; no surrounding renderer logic rewritten.

### 3b. `services/default-state-policy.js` — unique internal identifier

Renamed the colliding top-level `const _api` to `const _defaultStateApi`. The
public surface is unchanged:

- `module.exports = _defaultStateApi` (CommonJS / tests) — preserved.
- `window.SDDefaultState = _defaultStateApi` (renderer namespace) — preserved.

`services/response-desk.js` was **not modified** (it loads first and keeps its
own `_api`; the unique `window.SDResponseDesk` namespace already prevented a
window-level collision).

## 4. Verification

### Static parse (Node `vm`, no app execution)
- All 8 inline `<script>` blocks in `sourcedeck.html` parse cleanly.
- `response-desk.js` then `default-state-policy.js` load into one shared global
  with no redeclaration; `window.SDResponseDesk` and `window.SDDefaultState`
  both attach.

### Live Electron renderer (CDP, `--remote-debugging-port=9227`)
- **0 boot-time exceptions.**
- `typeof openTab === 'function'`, `renderDashboard`, `renderActivityFeed`,
  `filterLeads` all functions; `ARCG_OS` is an object.
- `window.SDResponseDesk` and `window.SDDefaultState` present.
- Nav-button clicks switch panes correctly for all required tabs:
  Dashboard, Lead Generator (`leads`), Ad Engine (`content`),
  Daily Operating Rhythm (`dailyops`), System Flow (`sysflow`), Settings,
  Response Desk (`reply`), GovCon (`govcon`), SAM Sprint outreach (`outreach`).
- `bindNav` is intentionally IIFE-scoped (not a global); navigation works
  through the handlers it binds, satisfying the "tab navigation works through
  the app's intended handlers" requirement.

## 5. Tests added

`test/renderer-boot.test.js` (wired into the `npm test` chain):

1. Every inline `<script>` block parses with `new vm.Script(...)`.
2. `response-desk.js` + `default-state-policy.js` load in browser order into one
   shared global without collision; both namespaces attach.
3. `default-state-policy.js` no longer declares a top-level `const _api`
   (unique `_defaultStateApi` present).
4. The exact malformed `toast(...)` string is gone; the corrected form present.
5. Core renderer symbols still defined in source.
6. Protected strings remain (`Response Desk`, `Free users: 1 NAICS`,
   `Phase 20G guard`, `human_approval_required`, `auto_send`).
7. No `Send Email` / `autoSend` surface introduced.

## 6. No product behavior change

The only behavioral effect is **restoring** renderer execution that was broken.
No feature logic was altered. Regression-guarded surfaces, all re-verified:

- **Default-state cleanup preserved** — `test/default-state-policy.test.js`
  22/22; no operator/demo contamination reintroduced (diff is two surgical
  edits only).
- **Response Desk preserved** — `test/response-desk.test.js` 24/24; no Send
  Email; `human_approval_required: true`; `auto_send: false`.
- **SAM Sprint preserved** — `test/sam-opportunity-sprint.test.js` 62/62; Free =
  1 NAICS; no auto-send.
- **Phase 20G guard preserved** — `.btn-gold` cool-gold lock and 900px/899px
  breakpoints untouched.
