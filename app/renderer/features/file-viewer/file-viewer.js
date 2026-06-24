/* Phase 6 renderer strangler — fourth extracted slice.
 *
 * Moved verbatim out of sourcedeck.html (the Phase 25AD inline <script>) as the
 * fourth step of the renderer strangler. It is a browser-safe,
 * global-attachment renderer module: sourcedeck.html loads it with a relative
 * <script src> immediately after the #sd-right-file-viewer markup, and it
 * attaches the same window.sdRightFileViewerOpen / window.sdRightFileViewerClose
 * globals that the Saved Pursuits / Attachments code (gcACPreviewFile) calls.
 *
 * Scope is strictly the right-side file viewer's open/close UI behavior: show /
 * hide the panel, toggle visibility class + state attributes, and reset the
 * title/meta/body to their default placeholder on close. It performs NO upload,
 * extraction, parsing, persistence, IPC, preload-bridge, or GovCon business
 * logic. Behavior is intentionally identical to the previous inline script,
 * including the early return when the viewer element is absent and the unused
 * (dormant) open-local button reference, both preserved verbatim.
 */
/* Phase 25AD — Right-side file viewer open/close helpers. The viewer DOM
   itself is static; gcACPreviewFile() (defined in the Saved Pursuits /
   Attachments module) populates title/meta/body when the user clicks
   View on a downloaded file. The viewer never opens a separate OS or
   browser window — it stays attached to the SourceDeck app shell. */
(function(){
  'use strict';
  var viewer  = document.getElementById('sd-right-file-viewer');
  var btnClose = document.getElementById('sd-right-file-viewer-close');
  var btnOpen  = document.getElementById('sd-right-file-viewer-open-local');
  if (!viewer) return;
  // Phase 25AD-HOTFIX — explicit open/close state. The viewer is closed
  // by default (hidden + aria-hidden); open adds the .is-open class that
  // the CSS rule pairs with display:flex. Close strips every open marker
  // so the panel takes no layout space and the buttons under it stay
  // clickable.
  window.sdRightFileViewerOpen = function(){
    viewer.hidden = false;
    viewer.setAttribute('aria-hidden', 'false');
    viewer.classList.add('is-open');
    viewer.setAttribute('data-open', 'true');
  };
  window.sdRightFileViewerClose = function(){
    viewer.hidden = true;
    viewer.setAttribute('aria-hidden', 'true');
    viewer.classList.remove('is-open');
    viewer.removeAttribute('data-open');
    viewer.removeAttribute('data-current-pursuit-id');
    viewer.removeAttribute('data-current-file-index');
    var t = document.getElementById('sd-right-file-viewer-title'); if (t) t.textContent = 'No file selected';
    var m = document.getElementById('sd-right-file-viewer-meta');  if (m) m.textContent = '';
    var b = document.getElementById('sd-right-file-viewer-body');
    if (b) b.innerHTML = '<div style="color:var(--muted,#94a3b8);font-size:11px;line-height:1.55">Upload solicitation files to inspect extracted content in the Solicitation Center.</div>';
  };
  if (btnClose) btnClose.addEventListener('click', function(){ window.sdRightFileViewerClose(); });
  // Removal phase — the local downloaded-package folder opener is gone; this
  // control no longer has a retrieval action to perform.
})();
