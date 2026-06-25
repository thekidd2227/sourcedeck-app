// app/renderer/features/solicitation-center/summarize-and-explain.js
//
// Phase 25AR — Renderer module for the Solicitation Center's structured
// "Summarize Solicitation" 17-area breakdown + per-section "Explain"
// actions. Browser-safe global-attachment script (no bundler, no
// imports). Loaded via a relative <script src> in sourcedeck.html.
//
// Renderer-facing surface attached to window (markup invokes these):
//   - window.gcSolSummarizeSolicitation()
//   - window.gcSolExplainSection(sectionKey, targetPanelId)
//
// Renderer-only — must not import electron or use its renderer-IPC
// surface directly. All main-process access goes through window.sd.*
// (preload bridge)
// (sd.govcon.solicitation.summarize / sd.govcon.solicitation.explainSection).
//
// Status states surfaced to operators: extracted, not_applicable,
// not_found, and explicit failure copy when the IPC bridge throws.

(function(){
  'use strict';

  // Local fallbacks for renderer-side helpers usually attached to window
  // before this module loads. If they're missing we degrade gracefully
  // instead of throwing.
  function setHTML(id, html) {
    var el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
    if (el) el.innerHTML = html;
  }
  function safeText(s) {
    if (typeof window.safeText === 'function') return window.safeText(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }
  function cleanDisplayText(s) {
    return typeof window.cleanDisplayText === 'function' ? window.cleanDisplayText(s) : String(s == null ? '' : s);
  }
  function sanitizeText(s, ctx) {
    return typeof window._sal25SafeText === 'function' ? window._sal25SafeText(s, ctx) : String(s == null ? '' : s);
  }
  function activeSolId() {
    return typeof window.activeSolId === 'function'
      ? window.activeSolId()
      : (typeof localStorage !== 'undefined' && localStorage.getItem('sd.govcon.activeSolicitation.v1')) || '';
  }
  function loadState() {
    return typeof window.gcSolLoadState === 'function' ? window.gcSolLoadState() : {};
  }
  function toast(msg, level) {
    if (typeof window.toast === 'function') try { window.toast(msg, level || 'info'); } catch (e) {}
  }

  // ── Summarize Solicitation ─────────────────────────────────────────
  window.gcSolSummarizeSolicitation = async function gcSolSummarizeSolicitation(){
    if (window.sdSetActionBusy) window.sdSetActionBusy('sol-summarize', 'Summarizing...');
    var oppId = activeSolId();
    var panel = document.getElementById('gc-sol-summarize-panel');
    if (panel) panel.style.display = '';
    setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:var(--muted);line-height:1.55">Loading the structured breakdown…</div>');
    try {
      var state = loadState();
      var extraction = state && state.packageExtraction;
      if (!extraction) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:var(--muted);line-height:1.55">Upload Solicitation Files first, then try again. The structured breakdown reads the persisted extraction record — there is nothing to summarize yet.</div>');
        return;
      }
      var result = null;
      try {
        if (window.sd && window.sd.govcon && window.sd.govcon.solicitation && window.sd.govcon.solicitation.summarize) {
          result = await window.sd.govcon.solicitation.summarize({ opportunityId: oppId, extraction: extraction });
        }
      } catch (err) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:#c8a86b;line-height:1.55">Summarize failed: ' + safeText(String((err && err.message) || 'unknown_error')) + '. The persisted extraction record was not modified.</div>');
        return;
      }
      if (!result || !result.ok || !Array.isArray(result.areas) || !result.areas.length) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:var(--muted);line-height:1.55">No structured breakdown was produced. Confirm a solicitation is selected and that extraction has been run.</div>');
        return;
      }
      var rows = result.areas.map(function(area){
        var sourceFiles = Array.isArray(area.sourceFiles) && area.sourceFiles.length
          ? '<div style="font-size:9.5px;color:var(--sub);margin-top:4px"><strong>Sources:</strong> ' + safeText(area.sourceFiles.slice(0, 4).join(', ')) + '</div>' : '';
        var sourceFields = Array.isArray(area.sourceFields) && area.sourceFields.length
          ? '<div style="font-size:9.5px;color:var(--sub);margin-top:2px"><strong>Fields:</strong> ' + safeText(area.sourceFields.join(', ')) + '</div>' : '';
        var statusBadge = area.status === 'extracted'
          ? '<span style="background:rgba(132,176,118,0.18);color:#84B076;padding:1px 6px;border-radius:8px;font-size:9px;text-transform:uppercase">extracted</span>'
          : area.status === 'not_applicable'
          ? '<span style="background:rgba(140,140,140,0.18);color:var(--muted);padding:1px 6px;border-radius:8px;font-size:9px;text-transform:uppercase">n/a</span>'
          : '<span style="background:rgba(200,168,107,0.18);color:#c8a86b;padding:1px 6px;border-radius:8px;font-size:9px;text-transform:uppercase">not found</span>';
        var note = area.note
          ? '<div style="font-size:9.5px;color:var(--muted);font-style:italic;margin-top:4px"><em>Analysis: ' + safeText(area.note) + '</em></div>' : '';
        var content = area.content
          ? '<div style="font-size:11px;color:var(--text);line-height:1.55;white-space:pre-wrap;margin-top:4px">' + safeText(sanitizeText(cleanDisplayText(area.content), 'sol-summarize-' + area.key)) + '</div>'
          : '<div style="font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:4px">No data extracted for this area.</div>';
        return '<div style="border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;margin-bottom:8px;background:var(--panel3,#0E2040)">'
          + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><strong style="font-size:12px;color:var(--text)">' + safeText(area.title) + '</strong>' + statusBadge + '</div>'
          + content + note + sourceFields + sourceFiles + '</div>';
      }).join('');
      var header = '<div style="font-size:10.5px;color:var(--muted);margin-bottom:8px">'
        + safeText(String(result.populatedAreas)) + ' of ' + safeText(String(result.totalAreas)) + ' areas populated · schema v' + safeText(String(result.schemaVersion))
        + ' · ' + safeText(String((result.sourceFiles || []).length)) + ' source file(s)</div>';
      setHTML('gc-sol-summarize-body', header + rows);
      toast('Solicitation breakdown ready. Verify each area against the source documents.', 'ok');
    } finally {
      if (window.sdClearActionBusy) window.sdClearActionBusy('sol-summarize');
    }
  };

  // ── Per-section Explain ────────────────────────────────────────────
  window.gcSolExplainSection = async function gcSolExplainSection(sectionKey, targetPanelId){
    if (!sectionKey) return;
    var oppId = activeSolId();
    var panelId = targetPanelId || ('gc-sol-section-' + String(sectionKey).toLowerCase());
    var state = loadState();
    var extraction = state && state.packageExtraction;
    if (!extraction) {
      toast('Upload Solicitation Files first, then explain a section.', 'info');
      return;
    }
    var result = null;
    try {
      if (window.sd && window.sd.govcon && window.sd.govcon.solicitation && window.sd.govcon.solicitation.explainSection) {
        result = await window.sd.govcon.solicitation.explainSection({ opportunityId: oppId, extraction: extraction, section: sectionKey });
      }
    } catch (err) {
      toast('Explain failed: ' + String((err && err.message) || 'unknown'), 'warn');
      return;
    }
    if (!result || !result.ok || result.status === 'not_found') {
      toast('Nothing to explain for section ' + sectionKey + ' — it was not detected in the extracted package.', 'info');
      return;
    }
    var titleLine = result.title ? '<strong>' + safeText(result.title) + '</strong><br>' : '';
    var noteLine  = result.note  ? '<div style="font-size:9.5px;color:var(--muted);margin-top:6px;font-style:italic"><em>' + safeText(result.note) + '</em></div>' : '';
    setHTML(panelId,
      '<div style="font-size:11px;color:var(--text);line-height:1.55">'
      + titleLine
      + safeText(sanitizeText(cleanDisplayText(String(result.explanation || '')), 'sol-explain-' + sectionKey)).replace(/\n/g, '<br>')
      + noteLine
      + '</div>'
    );
    toast('Section ' + sectionKey + ' explanation ready.', 'ok');
  };
})();
