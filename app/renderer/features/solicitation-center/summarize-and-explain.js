// app/renderer/features/solicitation-center/summarize-and-explain.js
// Phase 25AS — structured solicitation summary and non-destructive section explain.
(function(){
  'use strict';

  function byId(id) {
    return (typeof document !== 'undefined' && document.getElementById) ? document.getElementById(id) : null;
  }
  function setHTML(id, html) {
    var el = byId(id);
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
    if (typeof window.toast === 'function') {
      try { window.toast(msg, level || 'info'); } catch (_) {}
    }
  }
  function failureMessage(result, fallback) {
    if (!result) return fallback;
    if (result.reason === 'opportunity_mismatch') return 'The selected pursuit does not match this extraction record. Re-open the correct solicitation or upload its files again.';
    if (result.reason === 'unbound_extraction') return 'This legacy extraction is not bound to a saved pursuit. Re-upload the solicitation files to create a trusted extraction record.';
    if (result.reason === 'no_extraction') return 'No solicitation extraction is available. Upload Solicitation Files first.';
    return fallback;
  }
  function sourceLine(refs) {
    refs = Array.isArray(refs) ? refs : [];
    if (!refs.length) return '';
    var labels = refs.slice(0, 6).map(function(ref){
      var file = ref && (ref.sourceFile || ref.sourceDocumentId) || '';
      var loc = ref && ref.sourceLocation || '';
      return [file, loc].filter(Boolean).join(' · ');
    }).filter(Boolean);
    return labels.length ? '<div style="font-size:9.5px;color:var(--sub);margin-top:5px"><strong>Sources:</strong> ' + safeText(labels.join(', ')) + '</div>' : '';
  }
  function statusBadge(status) {
    var label = String(status || 'not_found').replace(/_/g, ' ');
    var style = status === 'extracted'
      ? 'background:rgba(132,176,118,0.18);color:#84B076'
      : status === 'not_applicable'
      ? 'background:rgba(140,140,140,0.18);color:var(--muted)'
      : status === 'extraction_failed' || status === 'conflicting_information'
      ? 'background:rgba(196,82,82,0.18);color:#D98A8A'
      : 'background:rgba(200,168,107,0.18);color:#c8a86b';
    return '<span style="' + style + ';padding:1px 6px;border-radius:8px;font-size:9px;text-transform:uppercase">' + safeText(label) + '</span>';
  }
  function ensureExplainPanel(targetPanelId, sectionKey) {
    var explainId = 'gc-sol-explain-' + String(sectionKey || '').toLowerCase();
    var existing = byId(explainId);
    if (existing) return existing;
    var target = byId(targetPanelId);
    if (!target || typeof document.createElement !== 'function') return null;
    var panel = document.createElement('div');
    panel.id = explainId;
    if (panel.setAttribute) panel.setAttribute('data-sd-sol-explain', String(sectionKey || ''));
    panel.style.cssText = 'margin-top:8px;border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;background:var(--panel3,#0E2040)';
    if (target.insertAdjacentElement) target.insertAdjacentElement('afterend', panel);
    else if (target.parentNode && target.parentNode.insertBefore) target.parentNode.insertBefore(panel, target.nextSibling || null);
    return panel;
  }

  window.gcSolSummarizeSolicitation = async function gcSolSummarizeSolicitation(){
    if (window.sdSetActionBusy) window.sdSetActionBusy('sol-summarize', 'Summarizing...');
    var oppId = activeSolId();
    var panel = byId('gc-sol-summarize-panel');
    if (panel) panel.style.display = '';
    setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:var(--muted);line-height:1.55">Loading the structured breakdown…</div>');
    try {
      var state = loadState();
      var extraction = state && state.packageExtraction;
      if (!extraction) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:var(--muted);line-height:1.55">Upload Solicitation Files first. There is no extraction record to summarize.</div>');
        return;
      }
      var result = null;
      try {
        if (window.sd && window.sd.govcon && window.sd.govcon.solicitation && window.sd.govcon.solicitation.summarize) {
          result = await window.sd.govcon.solicitation.summarize({ opportunityId: oppId, extraction: extraction });
        }
      } catch (err) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:#c8a86b;line-height:1.55">Summarize failed: ' + safeText(String((err && err.message) || 'unknown_error')) + '.</div>');
        return;
      }
      if (!result || !result.ok || !Array.isArray(result.areas) || !result.areas.length) {
        setHTML('gc-sol-summarize-body', '<div class="gc-sol-empty" style="font-size:10.5px;color:#c8a86b;line-height:1.55">' + safeText(failureMessage(result, 'No structured breakdown was produced.')) + '</div>');
        return;
      }
      var rows = result.areas.map(function(area){
        var note = area.note ? '<div style="font-size:9.5px;color:var(--muted);font-style:italic;margin-top:5px"><em>' + safeText(area.note) + '</em></div>' : '';
        var content = area.content
          ? '<div style="font-size:11px;color:var(--text);line-height:1.55;white-space:pre-wrap;margin-top:5px">' + safeText(sanitizeText(cleanDisplayText(area.content), 'sol-summarize-' + area.key)) + '</div>'
          : '<div style="font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:5px">No data extracted for this area.</div>';
        return '<div style="border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;margin-bottom:8px;background:var(--panel3,#0E2040)">'
          + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><strong style="font-size:12px;color:var(--text)">' + safeText(area.title) + '</strong>' + statusBadge(area.status) + '</div>'
          + content + note + sourceLine(area.sourceReferences) + '</div>';
      }).join('');
      var header = '<div style="font-size:10.5px;color:var(--muted);margin-bottom:8px">'
        + safeText(String(result.populatedAreas)) + ' of ' + safeText(String(result.totalAreas)) + ' areas populated · schema v' + safeText(String(result.schemaVersion))
        + ' · processing: ' + safeText(String(result.processingStatus || 'unknown'))
        + ' · ' + safeText(String((result.sourceFiles || []).length)) + ' source file(s)</div>';
      setHTML('gc-sol-summarize-body', header + rows);
      toast('Solicitation breakdown ready. Verify each area against the source documents.', 'ok');
    } finally {
      if (window.sdClearActionBusy) window.sdClearActionBusy('sol-summarize');
    }
  };

  window.gcSolExplainSection = async function gcSolExplainSection(sectionKey, targetPanelId){
    if (!sectionKey) return;
    var oppId = activeSolId();
    var state = loadState();
    var extraction = state && state.packageExtraction;
    if (!extraction) {
      toast('Upload Solicitation Files first, then explain a section.', 'info');
      return;
    }
    var explainPanel = ensureExplainPanel(targetPanelId || ('gc-sol-section-' + String(sectionKey).toLowerCase()), sectionKey);
    if (explainPanel) explainPanel.innerHTML = '<div style="font-size:10.5px;color:var(--muted)">Preparing explanation…</div>';
    var result = null;
    try {
      if (window.sd && window.sd.govcon && window.sd.govcon.solicitation && window.sd.govcon.solicitation.explainSection) {
        result = await window.sd.govcon.solicitation.explainSection({ opportunityId: oppId, extraction: extraction, section: sectionKey });
      }
    } catch (err) {
      if (explainPanel) explainPanel.innerHTML = '<div style="font-size:10.5px;color:#c8a86b">Explain failed: ' + safeText(String((err && err.message) || 'unknown')) + '</div>';
      return;
    }
    if (!result || !result.ok) {
      if (explainPanel) explainPanel.innerHTML = '<div style="font-size:10.5px;color:#c8a86b">' + safeText(failureMessage(result, 'No explanation was produced.')) + '</div>';
      return;
    }
    if (result.status === 'not_found' || !result.explanation) {
      if (explainPanel) explainPanel.innerHTML = '<div style="font-size:10.5px;color:var(--muted)">' + safeText(result.note || ('Nothing to explain for ' + sectionKey + '.')) + '</div>';
      return;
    }
    var titleLine = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><strong>' + safeText(result.title || ('Section ' + sectionKey + ' explanation')) + '</strong>' + statusBadge(result.status || 'extracted') + '</div>';
    var noteLine = result.note ? '<div style="font-size:9.5px;color:var(--muted);margin-top:6px;font-style:italic"><em>' + safeText(result.note) + '</em></div>' : '';
    if (explainPanel) {
      explainPanel.innerHTML = '<div style="font-size:11px;color:var(--text);line-height:1.55">'
        + titleLine
        + '<div style="white-space:pre-wrap;margin-top:5px">' + safeText(sanitizeText(cleanDisplayText(String(result.explanation || '')), 'sol-explain-' + sectionKey)) + '</div>'
        + noteLine + sourceLine(result.sourceReferences) + '</div>';
    }
    toast('Section ' + sectionKey + ' explanation ready. Original extracted text remains visible.', 'ok');
  };
})();