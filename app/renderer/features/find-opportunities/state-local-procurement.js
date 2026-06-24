/* Phase 3 renderer strangler — first extracted slice.
 *
 * This module was moved verbatim out of sourcedeck.html (the Phase 25AL
 * inline <script>) as the first step of the renderer strangler. It is a
 * browser-safe, global-attachment renderer module: sourcedeck.html loads it
 * with a relative <script src> and it attaches the same window.* renderer
 * APIs it always did. There is no bundler, no import, and no IPC contract
 * change — the renderer-facing names (sdSwitchOppMode, sdRenderStatePortal,
 * sdOpenSelectedStatePortal, sdOpenExternal, SD_STATE_PORTALS) are preserved
 * exactly because markup onclick handlers and existing tests depend on them.
 *
 * Behavior is intentionally identical to the previous inline script.
 */
/* Phase 25AL — State & Local procurement portal directory hardening.
   This module is intentionally renderer-only and scoped to the Find
   Opportunities tab. It wraps the existing Federal/SAM.gov content in the
   explicit #sl-sam-content container, renders official portal starting
   points, and hands all local solicitation files to the existing SourceDeck
   upload/import pipeline via gcSolUploadActive(). */
(function(){
  'use strict';

  var DEFAULT_OPP_MODE = 'federal';
  var LAST_OPP_MODE_KEY = 'sd.govcon.findOppMode';
  var VERIFY_DATE = '2026-06-23';

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function safeUrl(u){
    var s = String(u == null ? '' : u).trim();
    if (!s || /^javascript\s*:/i.test(s)) return '';
    if (!/^https?:\/\//i.test(s)) return '';
    return s;
  }

  window.SD_STATE_PORTALS = [
    { code: 'AL', name: 'Alabama', stateUrl: 'https://www.alabamainteractive.org/stateprocurement/', localUrl: 'https://www.alabamaleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'AK', name: 'Alaska', stateUrl: 'https://aws.state.ak.us/OnlinePublicNotices/', localUrl: 'https://www.akml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'AZ', name: 'Arizona', stateUrl: 'https://app.az.gov/', localUrl: 'https://www.azleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'AR', name: 'Arkansas', stateUrl: 'https://www.arkansas.gov/dfa/procurement/', localUrl: 'https://www.arml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'CA', name: 'California', stateUrl: 'https://caleprocure.ca.gov/', localUrl: 'https://www.cacities.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'CO', name: 'Colorado', stateUrl: 'https://www.colorado.gov/vss', localUrl: 'https://www.cml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'CT', name: 'Connecticut', stateUrl: 'https://portal.ct.gov/das/ctsource', localUrl: 'https://www.ccm-ct.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'DE', name: 'Delaware', stateUrl: 'https://mmp.delaware.gov/', localUrl: 'https://www.delawareleagueoflocalgovernments.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'DC', name: 'District of Columbia', stateUrl: 'https://ocp.dc.gov/', localUrl: 'https://dccouncil.gov/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'FL', name: 'Florida', stateUrl: 'https://vendor.myfloridamarketplace.com/', localUrl: 'https://www.floridaleagueofcities.com/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'GA', name: 'Georgia', stateUrl: 'https://ssl.doas.state.ga.us/gpr/', localUrl: 'https://www.gacities.com/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'HI', name: 'Hawaii', stateUrl: 'https://hands.ehawaii.gov/hands/', localUrl: 'https://www.hicounties.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'ID', name: 'Idaho', stateUrl: 'https://purchasing.idaho.gov/', localUrl: 'https://www.idahocities.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'IL', name: 'Illinois', stateUrl: 'https://www.bidbuy.illinois.gov/', localUrl: 'https://www.iml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'IN', name: 'Indiana', stateUrl: 'https://www.in.gov/idoa/procurement/', localUrl: 'https://www.citiesandtowns.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'IA', name: 'Iowa', stateUrl: 'https://bidopportunities.iowa.gov/', localUrl: 'https://iowaleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'KS', name: 'Kansas', stateUrl: 'https://admin.ks.gov/offices/procurement-contracts', localUrl: 'https://www.lkm.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'KY', name: 'Kentucky', stateUrl: 'https://vss.ky.gov/', localUrl: 'https://www.klc.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'LA', name: 'Louisiana', stateUrl: 'https://wwwcfprd.doa.louisiana.gov/osp/lapac/pubMain.cfm', localUrl: 'https://lma.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'ME', name: 'Maine', stateUrl: 'https://www.maine.gov/dafs/bbm/procurementservices', localUrl: 'https://www.memun.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MD', name: 'Maryland', stateUrl: 'https://emma.maryland.gov/', localUrl: 'https://www.mdmunicipal.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MA', name: 'Massachusetts', stateUrl: 'https://www.commbuys.com/', localUrl: 'https://www.mma.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MI', name: 'Michigan', stateUrl: 'https://www.michigan.gov/dtmb/procurement', localUrl: 'https://mml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MN', name: 'Minnesota', stateUrl: 'https://mn.gov/admin/osp/', localUrl: 'https://www.lmc.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MS', name: 'Mississippi', stateUrl: 'https://www.ms.gov/dfa/purchasing/', localUrl: 'https://www.mmlonline.com/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MO', name: 'Missouri', stateUrl: 'https://oa.mo.gov/purchasing', localUrl: 'https://www.mocities.com/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'MT', name: 'Montana', stateUrl: 'https://spb.mt.gov/', localUrl: 'https://mtleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NE', name: 'Nebraska', stateUrl: 'https://das.nebraska.gov/materiel/purchasing.html', localUrl: 'https://www.lonm.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NV', name: 'Nevada', stateUrl: 'https://purchasing.nv.gov/', localUrl: 'https://www.nvleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NH', name: 'New Hampshire', stateUrl: 'https://das.nh.gov/purchasing/', localUrl: 'https://www.nhmunicipal.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NJ', name: 'New Jersey', stateUrl: 'https://www.njstart.gov/', localUrl: 'https://www.njlm.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NM', name: 'New Mexico', stateUrl: 'https://www.generalservices.state.nm.us/state-purchasing/', localUrl: 'https://www.nmml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NY', name: 'New York', stateUrl: 'https://www.ogs.ny.gov/procurement/', localUrl: 'https://www.nycom.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'NC', name: 'North Carolina', stateUrl: 'https://www.ips.state.nc.us/', localUrl: 'https://www.nclm.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'ND', name: 'North Dakota', stateUrl: 'https://www.omb.nd.gov/doing-business-state/procurement', localUrl: 'https://www.ndlc.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'OH', name: 'Ohio', stateUrl: 'https://procure.ohio.gov/', localUrl: 'https://www.omlohio.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'OK', name: 'Oklahoma', stateUrl: 'https://oklahoma.gov/omes/services/purchasing.html', localUrl: 'https://www.oml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'OR', name: 'Oregon', stateUrl: 'https://oregonbuys.gov/', localUrl: 'https://www.orcities.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'PA', name: 'Pennsylvania', stateUrl: 'https://www.emarketplace.state.pa.us/', localUrl: 'https://www.pml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'RI', name: 'Rhode Island', stateUrl: 'https://ridop.ri.gov/', localUrl: 'https://www.rileague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'SC', name: 'South Carolina', stateUrl: 'https://procurement.sc.gov/', localUrl: 'https://www.masc.sc/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'SD', name: 'South Dakota', stateUrl: 'https://boa.sd.gov/central-services/procurement-management/', localUrl: 'https://sdmunicipalleague.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'TN', name: 'Tennessee', stateUrl: 'https://www.tn.gov/generalservices/procurement.html', localUrl: 'https://www.tml1.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'TX', name: 'Texas', stateUrl: 'https://www.txsmartbuy.com/', localUrl: 'https://www.tml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'UT', name: 'Utah', stateUrl: 'https://purchasing.utah.gov/', localUrl: 'https://www.ulct.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'VT', name: 'Vermont', stateUrl: 'https://bgs.vermont.gov/purchasing-contracting', localUrl: 'https://www.vlct.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'VA', name: 'Virginia', stateUrl: 'https://eva.virginia.gov/', localUrl: 'https://www.vml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'WA', name: 'Washington', stateUrl: 'https://pr-webs-vendor.des.wa.gov/', localUrl: 'https://wacities.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'WV', name: 'West Virginia', stateUrl: 'https://www.state.wv.us/admin/purchase/', localUrl: 'https://www.wvml.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'WI', name: 'Wisconsin', stateUrl: 'https://vendornet.wi.gov/', localUrl: 'https://www.lwm-info.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' },
    { code: 'WY', name: 'Wyoming', stateUrl: 'https://ai.wyo.gov/divisions/general-services/procurement', localUrl: 'https://www.wyomuni.org/', lastVerified: '2026-06-23', verificationStatus: 'unverified-seed' }
  ];

  function portalByCode(code){
    var want = String(code || '').toUpperCase();
    var list = window.SD_STATE_PORTALS || [];
    for (var i = 0; i < list.length; i++){
      if (String(list[i].code || '').toUpperCase() === want) return list[i];
    }
    return list[0] || null;
  }

  function setOppModeButtonState(mode){
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-sl-opp-mode]'));
    for (var i = 0; i < buttons.length; i++){
      var match = buttons[i].getAttribute('data-sl-opp-mode') === mode;
      buttons[i].setAttribute('aria-selected', match ? 'true' : 'false');
      if (match){
        buttons[i].classList.add('active');
        buttons[i].style.background = 'rgba(176,138,60,0.14)';
        buttons[i].style.borderColor = 'rgba(176,138,60,0.45)';
        buttons[i].style.color = 'var(--text)';
      } else {
        buttons[i].classList.remove('active');
        buttons[i].style.background = 'rgba(255,255,255,0.03)';
        buttons[i].style.borderColor = 'var(--border)';
        buttons[i].style.color = 'var(--sub)';
      }
    }
  }

  window.sdSwitchOppMode = function(mode){
    var next = (mode === 'state-local') ? 'state-local' : DEFAULT_OPP_MODE;
    var sam = document.getElementById('sl-sam-content');
    var panel = document.getElementById('sl-statelocal-panel');
    if (!sam || !panel){
      if (window.toast){ try { window.toast('Opportunity source panel is unavailable.', 'warn'); } catch (e) {} }
      return false;
    }
    sam.style.display = (next === 'state-local') ? 'none' : '';
    panel.style.display = (next === 'state-local') ? '' : 'none';
    setOppModeButtonState(next);
    try { localStorage.setItem(LAST_OPP_MODE_KEY, next); } catch (e) {}
    if (next === 'state-local'){
      var sel = document.getElementById('sl-state-select');
      window.sdRenderStatePortal(sel && sel.value ? sel.value : 'VA');
    }
    return true;
  };

  window.sdRenderStatePortal = function(code){
    var host = document.getElementById('sl-portal-render');
    if (!host) return false;
    var p = portalByCode(code);
    if (!p){
      host.innerHTML = '<div style="font-size:11px;color:var(--muted)">No portal entry is available for this selection.</div>';
      return false;
    }
    var stateUrl = safeUrl(p.stateUrl);
    var localUrl = safeUrl(p.localUrl);
    host.innerHTML = '' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:8px">' +
        '<div><div style="font:700 10px/1 &quot;Azeret Mono&quot;,monospace;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold2);margin-bottom:4px">State &amp; Local Portal</div>' +
        '<div data-sl-portal-name="true" style="font-family:&quot;Syne&quot;,sans-serif;font-weight:700;font-size:14px;color:var(--text)">' + esc(p.name) + '</div></div>' +
        '<span style="font-size:9px;padding:3px 7px;border-radius:980px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--muted);font-family:&quot;IBM Plex Mono&quot;,monospace">' + esc(p.verificationStatus || 'unverified') + ' · ' + esc(p.lastVerified || VERIFY_DATE) + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">' +
        '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">State procurement</div><button type="button" class="btn btn-ghost" data-sl-state-url="' + esc(stateUrl) + '" onclick="sdOpenExternal(this.getAttribute(\'data-sl-state-url\'))" style="padding:5px 9px;font-size:10.5px;max-width:100%;overflow-wrap:anywhere">' + esc(stateUrl || 'Unavailable') + '</button></div>' +
        '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Local / municipal directory</div><button type="button" class="btn btn-ghost" data-sl-local-url="' + esc(localUrl) + '" onclick="sdOpenExternal(this.getAttribute(\'data-sl-local-url\'))" style="padding:5px 9px;font-size:10.5px;max-width:100%;overflow-wrap:anywhere">' + esc(localUrl || 'Unavailable') + '</button></div>' +
      '</div>';
    return true;
  };

  window.sdOpenSelectedStatePortal = function(kind){
    var sel = document.getElementById('sl-state-select');
    var p = portalByCode(sel && sel.value ? sel.value : 'VA');
    if (!p) return false;
    return window.sdOpenExternal(kind === 'local' ? p.localUrl : p.stateUrl);
  };

  window.sdOpenExternal = function(url){
    var safe = safeUrl(url);
    if (!safe){
      if (window.toast){ try { window.toast('Blocked unsafe external URL.', 'warn'); } catch (e) {} }
      return Promise.resolve(false);
    }
    function browserFallback(){
      try {
        if (typeof window.open === 'function'){
          window.open(safe, '_blank', 'noopener,noreferrer');
          return true;
        }
      } catch (e) {}
      return false;
    }
    try {
      if (window.sd && window.sd.shell && typeof window.sd.shell.openExternal === 'function'){
        return Promise.resolve(window.sd.shell.openExternal(safe)).then(function(){ return true; }, function(){ return browserFallback(); });
      }
    } catch (e) {
      return Promise.resolve(browserFallback());
    }
    return Promise.resolve(browserFallback());
  };

  function boot(){
    var mode = DEFAULT_OPP_MODE;
    try { mode = localStorage.getItem(LAST_OPP_MODE_KEY) || DEFAULT_OPP_MODE; } catch (e) {}
    window.sdRenderStatePortal('VA');
    window.sdSwitchOppMode(mode);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
