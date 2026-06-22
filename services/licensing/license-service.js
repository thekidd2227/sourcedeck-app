'use strict';

const crypto = require('crypto');

const DEFAULT_LICENSE_API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
const LICENSE_KEY_STORE_PATH = 'license.encryptedKey';
const LICENSE_STATUS_STORE_PATH = 'license.status';
const LICENSE_INSTANCE_STORE_PATH = 'license.instance';
const LICENSE_PROVIDER_STORE_PATH = 'license.provider';
const LICENSE_LAST_CHECK_STORE_PATH = 'license.lastCheck';

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function maskLicenseKey(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (s.length <= 10) return `${s.slice(0, 2)}…${s.slice(-2)}`;
  return `${s.slice(0, 5)}…${s.slice(-5)}`;
}

function normalizeLicenseKey(value) {
  return String(value || '').trim();
}

function getMachineInstanceName({ appName, appVersion, platform, arch, userDataPath }) {
  const seed = [appName || 'SourceDeck', appVersion || 'unknown', platform || process.platform, arch || process.arch, userDataPath || ''].join('|');
  return `SourceDeck ${platform || process.platform}/${arch || process.arch} ${sha256(seed).slice(0, 12)}`;
}

function sanitizeLicenseApiBase(value) {
  const raw = String(value || DEFAULT_LICENSE_API_BASE).trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(raw)) return DEFAULT_LICENSE_API_BASE;
  return raw;
}

function encryptValue({ safeStorage, value }) {
  if (!value) return '';
  if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(value).toString('base64')}`;
  }
  return `plain:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decryptValue({ safeStorage, value }) {
  const stored = String(value || '');
  if (!stored) return '';
  try {
    if (stored.startsWith('safe:')) {
      if (!safeStorage || typeof safeStorage.isEncryptionAvailable !== 'function' || !safeStorage.isEncryptionAvailable()) return '';
      return safeStorage.decryptString(Buffer.from(stored.slice(5), 'base64'));
    }
    if (stored.startsWith('plain:')) return Buffer.from(stored.slice(6), 'base64').toString('utf8');
    return stored;
  } catch (_err) {
    return '';
  }
}

function normalizeLemonResponse(payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  const licenseKey = data.license_key && typeof data.license_key === 'object' ? data.license_key : {};
  const instance = data.instance && typeof data.instance === 'object' ? data.instance : {};
  return {
    valid: Boolean(data.valid),
    status: licenseKey.status || meta.license_key_status || (data.valid ? 'active' : 'invalid'),
    activationLimit: Number.isFinite(Number(licenseKey.activation_limit)) ? Number(licenseKey.activation_limit) : null,
    activationUsage: Number.isFinite(Number(licenseKey.activation_usage)) ? Number(licenseKey.activation_usage) : null,
    expiresAt: licenseKey.expires_at || null,
    customerName: meta.customer_name || null,
    customerEmail: meta.customer_email || null,
    productName: meta.product_name || null,
    variantName: meta.variant_name || null,
    instanceId: instance.id || meta.instance_id || null,
    instanceName: instance.name || null,
    rawCode: data.error || data.code || null
  };
}

async function postForm({ fetchFn, url, fields, timeoutMs }) {
  if (typeof fetchFn !== 'function') {
    return { ok: false, reason: 'fetch_unavailable', status: 0 };
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs || 12000) : null;
  try {
    const body = new URLSearchParams();
    Object.keys(fields || {}).forEach((key) => {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') body.append(key, String(fields[key]));
    });
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller ? controller.signal : undefined
    });
    let payload = null;
    try { payload = await response.json(); } catch (_err) { payload = null; }
    return { ok: response.ok, status: response.status, payload };
  } catch (err) {
    return { ok: false, reason: err && err.name === 'AbortError' ? 'timeout' : 'network_error', status: 0, error: err && err.message ? err.message : String(err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createLicenseService(options) {
  const store = options && options.store;
  const safeStorage = options && options.safeStorage;
  const fetchFn = options && options.fetchFn;
  const appInfo = options && options.appInfo ? options.appInfo : {};
  const apiBase = sanitizeLicenseApiBase(process.env.SOURCEDECK_LICENSE_API_BASE);

  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('createLicenseService requires an electron-store compatible store');
  }

  function getStoredLicenseKey() {
    return decryptValue({ safeStorage, value: store.get(LICENSE_KEY_STORE_PATH, '') });
  }

  function getStatus() {
    const stored = store.get(LICENSE_STATUS_STORE_PATH, null) || {};
    const key = getStoredLicenseKey();
    return {
      configured: Boolean(key),
      provider: store.get(LICENSE_PROVIDER_STORE_PATH, 'lemonsqueezy'),
      state: stored.state || (key ? 'unverified' : 'missing'),
      valid: Boolean(stored.valid),
      maskedKey: maskLicenseKey(key),
      licenseKeyHash: key ? sha256(key) : null,
      customerEmail: stored.customerEmail || null,
      customerName: stored.customerName || null,
      productName: stored.productName || null,
      variantName: stored.variantName || null,
      expiresAt: stored.expiresAt || null,
      activationLimit: stored.activationLimit || null,
      activationUsage: stored.activationUsage || null,
      instanceId: stored.instanceId || store.get(LICENSE_INSTANCE_STORE_PATH, null),
      instanceName: stored.instanceName || null,
      lastCheckedAt: store.get(LICENSE_LAST_CHECK_STORE_PATH, null),
      lastError: stored.lastError || null
    };
  }

  function persistStatus(patch) {
    const next = Object.assign({}, store.get(LICENSE_STATUS_STORE_PATH, null) || {}, patch || {}, { updatedAt: nowIso() });
    store.set(LICENSE_STATUS_STORE_PATH, next);
    store.set(LICENSE_LAST_CHECK_STORE_PATH, next.checkedAt || next.updatedAt);
    if (next.instanceId) store.set(LICENSE_INSTANCE_STORE_PATH, next.instanceId);
    store.set(LICENSE_PROVIDER_STORE_PATH, 'lemonsqueezy');
    return getStatus();
  }

  async function activate(input) {
    const licenseKey = normalizeLicenseKey(input && input.licenseKey);
    const instanceName = String((input && input.instanceName) || getMachineInstanceName(appInfo)).slice(0, 120);
    if (!licenseKey || licenseKey.length < 12) {
      return { ok: false, state: 'missing', reason: 'license_key_required', message: 'Enter a valid SourceDeck license key.' };
    }

    const result = await postForm({
      fetchFn,
      url: `${apiBase}/activate`,
      fields: { license_key: licenseKey, instance_name: instanceName },
      timeoutMs: 15000
    });

    if (!result.ok || !result.payload) {
      const status = persistStatus({ state: 'activation_failed', valid: false, lastError: result.reason || `http_${result.status}`, checkedAt: nowIso() });
      return { ok: false, state: status.state, reason: result.reason || `http_${result.status}`, message: 'License activation could not be completed. Check the key and your connection.', status };
    }

    const normalized = normalizeLemonResponse(result.payload);
    if (!normalized.valid) {
      const status = persistStatus({ state: 'invalid', valid: false, lastError: normalized.rawCode || 'invalid_license', checkedAt: nowIso() });
      return { ok: false, state: 'invalid', reason: normalized.rawCode || 'invalid_license', message: 'That license key is not valid for SourceDeck.', status };
    }

    store.set(LICENSE_KEY_STORE_PATH, encryptValue({ safeStorage, value: licenseKey }));
    const status = persistStatus(Object.assign({}, normalized, { state: 'active', valid: true, lastError: null, checkedAt: nowIso() }));
    return { ok: true, state: 'active', message: 'SourceDeck license activated.', status };
  }

  async function validate() {
    const licenseKey = getStoredLicenseKey();
    const instanceId = store.get(LICENSE_INSTANCE_STORE_PATH, null);
    if (!licenseKey) return { ok: false, state: 'missing', reason: 'license_key_missing', status: getStatus() };

    const fields = { license_key: licenseKey };
    if (instanceId) fields.instance_id = instanceId;
    const result = await postForm({ fetchFn, url: `${apiBase}/validate`, fields, timeoutMs: 12000 });

    if (!result.ok || !result.payload) {
      const status = persistStatus({ state: 'offline_grace', valid: getStatus().valid, lastError: result.reason || `http_${result.status}`, checkedAt: nowIso() });
      return { ok: false, state: status.state, reason: result.reason || `http_${result.status}`, message: 'License validation is offline. SourceDeck will keep the last known status.', status };
    }

    const normalized = normalizeLemonResponse(result.payload);
    const status = persistStatus(Object.assign({}, normalized, { state: normalized.valid ? 'active' : 'invalid', valid: normalized.valid, lastError: normalized.valid ? null : (normalized.rawCode || 'invalid_license'), checkedAt: nowIso() }));
    return { ok: normalized.valid, state: status.state, reason: normalized.valid ? null : (normalized.rawCode || 'invalid_license'), status };
  }

  async function deactivate() {
    const licenseKey = getStoredLicenseKey();
    const instanceId = store.get(LICENSE_INSTANCE_STORE_PATH, null);
    if (licenseKey && instanceId) {
      await postForm({ fetchFn, url: `${apiBase}/deactivate`, fields: { license_key: licenseKey, instance_id: instanceId }, timeoutMs: 12000 });
    }
    store.delete(LICENSE_KEY_STORE_PATH);
    store.delete(LICENSE_INSTANCE_STORE_PATH);
    store.set(LICENSE_STATUS_STORE_PATH, { state: 'deactivated', valid: false, updatedAt: nowIso(), checkedAt: nowIso(), lastError: null });
    store.set(LICENSE_LAST_CHECK_STORE_PATH, nowIso());
    return { ok: true, state: 'deactivated', status: getStatus() };
  }

  return { status: getStatus, activate, validate, deactivate, maskLicenseKey };
}

module.exports = {
  createLicenseService,
  maskLicenseKey,
  normalizeLicenseKey,
  normalizeLemonResponse,
  getMachineInstanceName,
  DEFAULT_LICENSE_API_BASE
};
