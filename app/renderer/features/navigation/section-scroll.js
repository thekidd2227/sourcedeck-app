/* Phase 5 renderer strangler — third extracted slice.
 *
 * Moved verbatim out of sourcedeck.html (the Phase 25F inline <script>) as the
 * third step of the renderer strangler. It is a browser-safe, global-attachment
 * renderer module: sourcedeck.html loads it with a relative <script src> and it
 * attaches the same window.gcScrollTo global invoked from markup onclick.
 *
 * Behavior is intentionally identical to the previous inline script. Pure
 * browser code, no network, no IPC, no preload bridge, no storage. No bundler,
 * no import, no contract change.
 */
/* Phase 25F — GovCon section navigation
   Smooth-scroll the GovCon pane to a target <section> when a section
   pill is clicked. Updates the active-pill style so the buyer can
   see which section they are on. Pure browser code; no network. */
(function(){
  'use strict';
  var ACTIVE_BG    = 'rgba(176,138,60,0.10)';
  var ACTIVE_BORDER= 'rgba(176,138,60,0.32)';
  var ACTIVE_COLOR = 'var(--text)';
  var INACTIVE_BG  = 'rgba(255,255,255,0.04)';
  var INACTIVE_BORDER = 'var(--border)';
  var INACTIVE_COLOR  = 'var(--sub)';
  function pills(){
    return Array.from(document.querySelectorAll('.gc-section-pill'));
  }
  function setActive(targetId){
    pills().forEach(function(p){
      var href = (p.getAttribute('href') || '').replace(/^#/, '');
      var isActive = (href === targetId);
      p.style.background  = isActive ? ACTIVE_BG     : INACTIVE_BG;
      p.style.borderColor = isActive ? ACTIVE_BORDER : INACTIVE_BORDER;
      p.style.color       = isActive ? ACTIVE_COLOR  : INACTIVE_COLOR;
    });
  }
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
})();
