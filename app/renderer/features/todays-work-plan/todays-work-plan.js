/* Phase 7 renderer strangler — fifth extracted slice.
 *
 * Moved verbatim out of sourcedeck.html (the Phase 25H "Today's Work Plan
 * integration" inline <script>) as the fifth step of the renderer strangler.
 * It is a browser-safe, global-attachment renderer module: sourcedeck.html
 * loads it with a relative <script src> and it attaches the same
 * window.calRenderTodayWorkPlan global other code can call to refresh the
 * mirror after a calendar change.
 *
 * Scope is strictly UI / local read-only state: it renders today's calendar
 * events into the Daily Operating Rhythm pane's #do-checklist host. It reads
 * the calendar's in-memory state (window.__sdCalendar.getState) or the
 * sd.calendar.v1 localStorage fallback — READ ONLY, never writing storage and
 * never changing the data shape. It performs NO IPC, preload-bridge, provider,
 * upload, extraction, parsing, persistence-write, or GovCon business logic.
 * Behavior is intentionally identical to the previous inline script, including
 * the guarded no-op when #do-checklist is absent and the empty-state copy.
 */
/* Phase 25H — Today's Work Plan integration
   Surfaces today's calendar events at the top of the Daily
   Operating Rhythm pane. Read-only mirror; the source of truth
   is the Calendar module. */
(function(){
  'use strict';
  function todayIso(){
    var d = new Date();
    var pad = function(n){ return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function getCalendarEvents(){
    try {
      if (window.__sdCalendar && typeof window.__sdCalendar.getState === 'function'){
        var s = window.__sdCalendar.getState();
        if (s && Array.isArray(s.events)) return s.events;
      }
      var raw = localStorage.getItem('sd.calendar.v1');
      if (raw){
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events)) return parsed.events;
      }
    } catch (e) {}
    return [];
  }
  function renderTodayWorkPlan(){
    var host = document.getElementById('do-checklist');
    if (!host) return;
    var iso = todayIso();
    var events = getCalendarEvents().filter(function(e){ return e.date === iso; });
    if (!events.length){
      host.innerHTML = '<div data-phase-25h="today-work-plan-empty" style="font-size:11px;color:var(--muted);line-height:1.55;padding:6px 0">No calendar events for today. Open the <a href="#" onclick="event.preventDefault(); if(window.openTab) openTab(\'calendar\');" style="color:var(--gold2);text-decoration:underline">Calendar</a> to import an .ics or add an event manually.</div>';
      return;
    }
    events.sort(function(a, b){ return (a.start || '').localeCompare(b.start || ''); });
    var html = '<div data-phase-25h="today-work-plan-list" style="display:flex;flex-direction:column;gap:5px">';
    for (var i = 0; i < events.length; i++){
      var ev = events[i];
      var when = ev.allDay ? 'All day' : ((ev.start || '') + (ev.end ? ' – ' + ev.end : ''));
      html += '<div style="padding:6px 9px;border:1px solid var(--border);border-radius:5px;background:var(--panel2,#0f1e32)">' +
                '<div style="font-size:11.5px;font-weight:600;color:var(--text)">' + escapeHtml(ev.title) + '</div>' +
                '<div style="font-size:10px;color:var(--muted);margin-top:2px">' + escapeHtml(when) + ' · ' + escapeHtml(ev.taskType || 'calendar-event') + ' · ' + escapeHtml(ev.status || 'scheduled') + '</div>' +
              '</div>';
    }
    html += '</div>';
    host.innerHTML = html;
  }
  function escapeHtml(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  window.calRenderTodayWorkPlan = renderTodayWorkPlan;
  function boot(){
    renderTodayWorkPlan();
    // Re-render after a short delay to pick up calendar state once
    // its loadState promise resolves on cold open.
    setTimeout(renderTodayWorkPlan, 300);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
