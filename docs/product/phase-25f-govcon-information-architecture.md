# Phase 25F — GovCon Information Architecture

**Date:** 2026-06-09
**Companion audit:** `docs/audits/phase-25f-buyer-safety-cleanup-audit.md`.

---

## 1. Why the IA changed

The pre-Phase-25F GovCon pane was a single long scroll surface combining the Capture Command Center, Operating Rhythm, Solicitation Workspace, Vendor & Pricing, Past Performance / Capability / Prime, Submission Readiness, and Audit Log all in one continuous flow. Day 0 GUI testing flagged the pane as "too long" for the buyer to navigate.

Phase 25F leaves the pane as a single scroll surface (preserves the Phase 22–24 invariants — every section keeps its existing `<section id="gc-…">` anchor) but adds a **sticky in-pane section navigation pill bar** at the top of the GovCon pane. The pill bar gives the buyer one-click jump access to each canonical GovCon workspace section without an architectural rebuild.

## 2. The 7 canonical GovCon internal sections

| # | Pill label | Anchor target (`<section id>`) | Phase that introduced the section |
|---|---|---|---|
| 1 | Overview | `gc-capture-cc` | Phase 22B — GovCon Capture Command Center |
| 2 | Operating Rhythm | `gc-operating-rhythm` | Phase 22B — GovCon Operating Rhythm |
| 3 | Solicitation | `gc-sol-workspace` | Phase 22C — Solicitation Workspace |
| 4 | Vendor & Pricing | `gc-vqr-pricing` | Phase 22D — Vendor Quote Room + Pricing Worksheet |
| 5 | Past Performance · Capability · Prime | `gc-pp-cs-pp` | Phase 22E — Past Performance Library + Capability Statement Studio + Prime Partner Finder |
| 6 | Submission Readiness | `gc-sub-gate` | Phase 22F — Submission Readiness Gate |
| 7 | Audit Log | `gc-audit-log` | Phase 24B — Audit Log |

## 3. Pill nav specification

| Attribute | Value |
|---|---|
| Container | `<nav id="gc-section-nav" data-phase-25f="govcon-section-nav" aria-label="GovCon section navigation">` |
| Position | `position:sticky; top:0; z-index:5` — sticks to the top of the GovCon pane as the buyer scrolls |
| Background | Linear gradient fading to transparent so the pill bar visually overlays content below |
| Pill class | `.gc-section-pill` |
| Pill anchor | `<a href="#gc-…" onclick="gcScrollTo(event, 'gc-…')">` |
| Active state | Gold tint (`background: rgba(176,138,60,0.10)`, `border: rgba(176,138,60,0.32)`, `color: var(--text)`) |
| Inactive state | Subtle neutral (`background: rgba(255,255,255,0.04)`, `border: var(--border)`, `color: var(--sub)`) |
| Default active | Overview (`gc-capture-cc`) |

## 4. `gcScrollTo()` contract

```js
window.gcScrollTo = function(ev, targetId){
  if (ev && ev.preventDefault) ev.preventDefault();
  var target = document.getElementById(targetId);
  if (!target) return;
  try {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    target.scrollIntoView();
  }
  setActive(targetId);
};
```

| Property | Value |
|---|---|
| Source | `gcScrollTo` is registered on `window`. |
| Side effect | Smooth-scrolls the GovCon pane to the target section, then updates the active-pill style. |
| No network | Pure DOM manipulation. No `fetch()`. No `XMLHttpRequest`. Pinned by sentinel. |
| No persistence | Active-pill state is per-session; not written to `localStorage` or electron-store. (A future phase may persist last-active section if buyers ask for it.) |

## 5. Pane invariants preserved

- ✅ Every Phase 22–24 GovCon section remains in the DOM (Phase 22 invariants preserved).
- ✅ Every section ID (`gc-capture-cc`, `gc-operating-rhythm`, `gc-sol-workspace`, `gc-vqr-pricing`, `gc-pp-cs-pp`, `gc-sub-gate`, `gc-audit-log`) is unchanged.
- ✅ The single-scroll surface model is preserved. The pill bar is an IA aid, not a sub-tab rebuild.
- ✅ No section's content was reflowed, renamed, or restructured by Phase 25F.

## 6. Sentinel guarantees

`test/phase-25f-govcon-sections.test.js` pins the contract:

1. `<nav id="gc-section-nav">` exists in the `tab-govcon` pane, BEFORE the GovCon Mode Indicator section.
2. The nav carries `data-phase-25f="govcon-section-nav"` and `position:sticky`.
3. All 7 canonical pills exist with the expected label and `href`.
4. Each pill's anchor target exists as a `<section>` or `<div>` with the matching `id`.
5. `window.gcScrollTo` is defined as `function(ev, targetId)` and uses `scrollIntoView({behavior:'smooth'})`.
6. `gcScrollTo` does not include `fetch(` or `XMLHttpRequest`.

## 7. Future evolution

If buyer feedback indicates the pill bar is insufficient, future phases may:

- **Phase 25G+ (provisional)** — convert the pill bar to a true sub-tab swap (each section becomes its own visible panel; only one panel rendered at a time). Larger refactor; would need new pane-routing logic + state machine.
- **Phase 25G+ (provisional)** — persist last-active section per buyer profile via `window.sd.storeGet/storeSet('govcon')` so reopening the GovCon tab returns to where the buyer left off.
- **Phase 25G+ (provisional)** — auto-scrollspy: highlight the pill matching the section currently in the viewport using `IntersectionObserver`.

Phase 25F ships the minimum-viable IA aid that's reversible, sentinel-pinned, and zero-risk to existing tests.

---

## Signature

Phase 25F GovCon information architecture is a sticky pill-bar nav that gives the buyer one-click jump access to all 7 canonical GovCon workspace sections. No section was removed, renamed, or restructured. Sentinel pins every pill target.
