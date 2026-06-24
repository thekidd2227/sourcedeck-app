/* Phase 4 renderer strangler — second extracted slice.
 *
 * Moved verbatim out of sourcedeck.html (the Phase 25E.5 inline <script>) as
 * the second step of the renderer strangler. It is a browser-safe,
 * global-attachment renderer module: sourcedeck.html loads it with a relative
 * <script src> and it attaches the same window.* renderer APIs it always did
 * (ptOnDayChange, ptSaveDebounced), invoked from the Pilot Tracker pane's
 * onchange/oninput markup which remains in sourcedeck.html.
 *
 * Behavior is intentionally identical to the previous inline script. No
 * bundler, no import, no IPC contract change. Persistence still goes through
 * the existing window.sd.storeGet/storeSet preload bridge with a localStorage
 * fallback.
 */
/* Phase 25E.5 — Pilot Tracker
   Local state for the Phase 25B 7-day internal trial. Tracks:
   - current trial day (0-7)
   - today's checklist note
   - open issue counts by severity (critical/high/medium/low)
   - go/no-go decision
   - next action note
   The Setup Wizard completion state is read from the existing
   Phase 24K localStorage flag `sd.govcon.setupComplete`.

   Persistence:
   - Primary: window.sd.storeGet/storeSet('pilotTracker') via the
     electron-store preload bridge.
   - Fallback: localStorage 'sd.pilotTracker.v1'.

   Boundary: nothing here is sent, submitted, or uploaded.
   Pilot Tracker state lives on the operator's Mac only.
*/
(function(){
  'use strict';
  var STORE_KEY  = 'sd.pilotTracker.v1';
  var BRIDGE_KEY = 'pilotTracker';

  function blank(){
    return {
      day: 0,
      dayNote: '',
      issuesCritical: 0,
      issuesHigh: 0,
      issuesMedium: 0,
      issuesLow: 0,
      gng: '',
      nextAction: '',
      updatedAt: null
    };
  }
  var _state = blank();
  var _saveTimer = null;

  function $(id){ return document.getElementById(id); }

  async function load(){
    var data = null;
    if (window.sd && typeof window.sd.storeGet === 'function'){
      try { data = await window.sd.storeGet(BRIDGE_KEY); } catch (e) { data = null; }
    }
    if (!data){
      try {
        var raw = localStorage.getItem(STORE_KEY);
        if (raw) data = JSON.parse(raw);
      } catch (e) { data = null; }
    }
    if (data && typeof data === 'object'){
      var b = blank();
      for (var k in b){ if (k in data) b[k] = data[k]; }
      _state = b;
    }
  }
  async function save(){
    var snap = JSON.parse(JSON.stringify(_state));
    snap.updatedAt = new Date().toISOString();
    _state = snap;
    if (window.sd && typeof window.sd.storeSet === 'function'){
      try { await window.sd.storeSet(BRIDGE_KEY, snap); } catch (e) {}
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(snap)); } catch (e) {}
  }

  function setupCompleteState(){
    // Phase 24K Final Confirmation persists this flag when the buyer
    // checks all 5 boxes in Step 11. Pilot Tracker surfaces it
    // read-only so the operator can confirm the buyer finished setup.
    try {
      var v = localStorage.getItem('sd.govcon.setupComplete');
      if (v === 'true' || v === '1') return 'Complete';
      if (v === 'false' || v === '0') return 'Incomplete';
      return 'Not yet';
    } catch (e) { return 'Unknown'; }
  }

  function renderPilotTracker(){
    var daySel    = $('pt-day-select');
    var dayKpi    = $('pt-trial-day');
    var dayNote   = $('pt-day-note');
    var setupKpi  = $('pt-setup-state');
    var setupDet  = $('pt-setup-detail');
    var critEl    = $('pt-issues-critical');
    var highEl    = $('pt-issues-high');
    var medEl     = $('pt-issues-medium');
    var lowEl     = $('pt-issues-low');
    var issueKpi  = $('pt-issue-count');
    var gngSel    = $('pt-gng-select');
    var gngKpi    = $('pt-gng-score');
    var nextEl    = $('pt-next-action');

    if (daySel)  daySel.value  = String(_state.day);
    if (dayKpi)  dayKpi.textContent = 'Day ' + _state.day;
    if (dayNote && dayNote.value !== _state.dayNote) dayNote.value = _state.dayNote || '';

    var setup = setupCompleteState();
    if (setupKpi) setupKpi.textContent = setup === 'Complete' ? '✓' : setup === 'Incomplete' ? '⚠' : '—';
    if (setupDet){
      if (setup === 'Complete') setupDet.textContent = 'Phase 24K Final Confirmation is complete. All 5 boxes were checked in Setup Wizard Step 11. Buyer is ready to begin the trial.';
      else if (setup === 'Incomplete') setupDet.textContent = 'Setup Wizard was opened but Final Confirmation is not complete. Run the wizard from Settings → Run Setup Wizard.';
      else setupDet.textContent = 'Setup Wizard has not been completed yet. Run it from Settings → Run Setup Wizard so the Phase 24K Final Confirmation can be checked.';
    }

    if (critEl) critEl.value = _state.issuesCritical || '';
    if (highEl) highEl.value = _state.issuesHigh || '';
    if (medEl)  medEl.value  = _state.issuesMedium || '';
    if (lowEl)  lowEl.value  = _state.issuesLow || '';
    var total = (Number(_state.issuesCritical) || 0)
              + (Number(_state.issuesHigh)     || 0)
              + (Number(_state.issuesMedium)   || 0)
              + (Number(_state.issuesLow)      || 0);
    if (issueKpi) issueKpi.textContent = String(total);

    if (gngSel) gngSel.value = _state.gng || '';
    if (gngKpi){
      var crit = Number(_state.issuesCritical) || 0;
      // Auto-force STOP if any open critical or if the operator
      // selected stop directly.
      var forced = (crit > 0) ? 'stop' : _state.gng;
      var labels = { 'ready': 'READY', 'needs-fixes': 'NEEDS FIXES', 'stop': 'STOP', '': '—' };
      gngKpi.textContent = labels[forced] || '—';
    }

    if (nextEl && nextEl.value !== _state.nextAction) nextEl.value = _state.nextAction || '';
  }

  window.ptOnDayChange = function(){
    var daySel = $('pt-day-select');
    var d = daySel ? parseInt(daySel.value, 10) : 0;
    if (isNaN(d) || d < 0 || d > 7) d = 0;
    _state.day = d;
    save();
    renderPilotTracker();
  };

  window.ptSaveDebounced = function(){
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function(){
      var dayNote = $('pt-day-note');
      var critEl  = $('pt-issues-critical');
      var highEl  = $('pt-issues-high');
      var medEl   = $('pt-issues-medium');
      var lowEl   = $('pt-issues-low');
      var gngSel  = $('pt-gng-select');
      var nextEl  = $('pt-next-action');
      if (dayNote) _state.dayNote = dayNote.value || '';
      if (critEl)  _state.issuesCritical = Number(critEl.value) || 0;
      if (highEl)  _state.issuesHigh     = Number(highEl.value) || 0;
      if (medEl)   _state.issuesMedium   = Number(medEl.value)  || 0;
      if (lowEl)   _state.issuesLow      = Number(lowEl.value)  || 0;
      if (gngSel)  _state.gng = gngSel.value || '';
      if (nextEl)  _state.nextAction = nextEl.value || '';
      save();
      renderPilotTracker();
    }, 400);
  };

  function boot(){
    load().then(renderPilotTracker).catch(renderPilotTracker);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
