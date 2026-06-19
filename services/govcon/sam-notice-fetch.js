// services/govcon/sam-notice-fetch.js
//
// Phase 25AM — fetch-only SAM.gov notice metadata service.
//
// Replaces the entire Phase 25AB–25AL package download / preview /
// extraction chain. The previous architecture wrote SAM-returned bodies
// to disk, sniffed them, extracted them, persisted them in
// localStorage, and rendered them — every guard layer kept finding a
// new contamination path. This service does none of that.
//
// Contract:
//   - One method: fetchNotice({ noticeId })
//   - GET against api.sam.gov via the credential boundary
//   - Returns ONLY structured fields
//   - Never returns file bytes, never writes to disk
//   - Resource links are returned as api_key-stripped URLs the renderer
//     hands directly to shell.openExternal — the user downloads files
//     from their own browser
//
// Hard boundaries:
//   - No upload. GET only.
//   - No file I/O. Nothing touches the filesystem.
//   - Never returns a URL containing api_key.
//   - Redacts any api_key value that might appear in error text.
//   - No localStorage cache. The renderer can cache the structured
//     response per pursuit if it wants; this service is stateless.

'use strict';

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';

function stripApiKey(url){
  if (!url) return '';
  return String(url)
    .replace(/([?&])(api_key|apikey)=[^&#]*&?/gi, (_m, sep) => sep === '?' ? '?' : '&')
    .replace(/[?&]$/, '');
}

function redact(s){
  return String(s == null ? '' : s).replace(/((?:api_key|apikey)=)[^&#\s"']+/gi, '$1REDACTED');
}

function stringField(v){
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') return String(v.name || v.code || v.value || '').trim();
  return String(v).trim();
}

function normalizePlaceOfPerformance(pop){
  if (!pop) return '';
  if (typeof pop === 'string') return pop;
  if (Array.isArray(pop)) return pop.map(normalizePlaceOfPerformance).filter(Boolean).join(' / ');
  if (typeof pop === 'object'){
    const part = (v) => stringField(v);
    const city    = part(pop.city || pop.cityName);
    const state   = part(pop.state || pop.stateCode || pop.stateOrProvince);
    const zip     = part(pop.zip || pop.zipCode || pop.postalCode);
    const country = part(pop.country || pop.countryCode);
    const loc = [city, state, zip].filter(Boolean).join(', ');
    const bits = [];
    if (loc) bits.push(loc);
    if (country && !/^(usa|us)$/i.test(country)) bits.push(country);
    return bits.join(' · ');
  }
  return String(pop);
}

function normalizeContacts(rec){
  const list = Array.isArray(rec && rec.pointOfContact) ? rec.pointOfContact : [];
  return list.map(c => ({
    fullName: stringField(c && (c.fullName || c.fullname || c.name)),
    title:    stringField(c && (c.title || c.role)),
    email:    stringField(c && c.email),
    phone:    stringField(c && (c.phone || c.fax))
  })).filter(c => c.fullName || c.email || c.phone);
}

function normalizeResourceLinks(rec){
  const raw = rec && (rec.resourceLinks || rec.attachments || rec.attachmentLinks);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (!item) return null;
    if (typeof item === 'string') return { url: stripApiKey(item), label: '' };
    if (typeof item === 'object'){
      const url = stripApiKey(item.href || item.url || item.link || item.uri || '');
      if (!url) return null;
      return { url, label: stringField(item.name || item.fileName || item.title || '') };
    }
    return null;
  }).filter(Boolean);
}

// Build the safe sam.gov front-end URL the user can open in their
// browser. uiLink (when SAM returns one) is preferred; otherwise we
// build sam.gov/opp/{noticeId}/view. We never return the keyed
// api.sam.gov URL.
function safeNoticeUrl(rec, noticeId){
  if (rec && rec.uiLink) return stripApiKey(rec.uiLink);
  if (noticeId) return 'https://sam.gov/opp/' + encodeURIComponent(noticeId) + '/view';
  return '';
}

function createSamNoticeFetchService(deps){
  deps = deps || {};
  const fetchFn  = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const getApiKey = deps.getApiKey || (async () => '');

  async function fetchNotice(payload){
    payload = payload || {};
    const noticeId = String(payload.noticeId || payload.id || '').trim();
    if (!noticeId) return { ok: false, reason: 'no_notice_id' };
    if (!fetchFn) return { ok: false, reason: 'no_fetch_available' };

    let key = '';
    try { key = await getApiKey(); } catch (_) { key = ''; }
    if (!key) return { ok: false, reason: 'no_api_key' };

    const params = new URLSearchParams();
    params.set('noticeid', noticeId);
    params.set('limit', '1');
    params.set('api_key', key);
    const url = SAM_API_BASE + '?' + params.toString();

    let resp;
    try { resp = await fetchFn(url, { method: 'GET' }); }
    catch (e){ return { ok: false, reason: 'fetch_failed', error: redact(e && e.message) }; }

    if (!resp || !resp.ok){
      const status = resp && typeof resp.status === 'number' ? resp.status : 0;
      return { ok: false, reason: 'http_error', status };
    }

    let body;
    try { body = await resp.json(); }
    catch (e){ return { ok: false, reason: 'invalid_json', error: redact(e && e.message) }; }

    const list = (body && (body.opportunitiesData || body.opportunities || body.data)) || [];
    const rec = Array.isArray(list) ? list[0] : null;
    if (!rec) return { ok: false, reason: 'notice_not_found' };

    return {
      ok: true,
      notice: {
        noticeId,
        title:               stringField(rec.title),
        solicitationNumber:  stringField(rec.solicitationNumber || rec.solnbr),
        noticeType:          stringField(rec.type || rec.baseType || rec.noticeType),
        agency:              stringField(rec.fullParentPathName || rec.organizationName || rec.department),
        subAgency:           stringField(rec.subTier || rec.subTierName),
        office:              stringField(rec.office || rec.officeName),
        naicsCode:           stringField(rec.naicsCode || (Array.isArray(rec.naicsCodes) && rec.naicsCodes[0])),
        classificationCode:  stringField(rec.classificationCode || rec.psc),
        typeOfSetAside:      stringField(rec.typeOfSetAsideDescription || rec.typeOfSetAside || rec.setAside),
        postedDate:          stringField(rec.postedDate || rec.publishedDate),
        responseDeadLine:    stringField(rec.responseDeadLine || rec.responseDeadline || rec.deadline),
        placeOfPerformance:  normalizePlaceOfPerformance(rec.placeOfPerformance),
        pointOfContact:      normalizeContacts(rec),
        // SAM.gov returns a URL in `description`, not the text. We pass
        // it through as a button the user can open in their browser —
        // SourceDeck never fetches the description body.
        descriptionUrl:      stripApiKey(stringField(rec.description)),
        resourceLinks:       normalizeResourceLinks(rec),
        // Front-end URL the user opens in their default browser.
        noticeUrl:           safeNoticeUrl(rec, noticeId)
        // explicitly absent: text bodies, file paths, package manifest,
        // descriptionText, attachments[].text, raw HTML, anything that
        // can be contaminated.
      }
    };
  }

  return { fetchNotice };
}

module.exports = {
  createSamNoticeFetchService,
  _stripApiKey: stripApiKey,
  _redact: redact,
  _normalizePlaceOfPerformance: normalizePlaceOfPerformance,
  _normalizeContacts: normalizeContacts,
  _normalizeResourceLinks: normalizeResourceLinks
};
