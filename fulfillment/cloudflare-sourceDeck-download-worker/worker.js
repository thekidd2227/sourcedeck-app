'use strict';

/**
 * SourceDeck secure download fulfillment worker.
 *
 * Intended deployment target: Cloudflare Workers with a private R2 bucket binding.
 * This file is a production-oriented template; configure secrets/bindings outside git.
 *
 * Required bindings/secrets:
 * - SOURCEDECK_RELEASES: R2 bucket binding containing signed/notarized artifacts
 * - LEMONSQUEEZY_WEBHOOK_SECRET
 * - DOWNLOAD_SIGNING_SECRET
 * - SOURCEDECK_PRODUCT_ID
 * - SOURCEDECK_VARIANT_IDS comma-separated allowed variant IDs
 * - SOURCEDECK_CURRENT_MAC_DMG_KEY e.g. releases/mac/SourceDeck-1.1.0.dmg
 * - SOURCEDECK_CURRENT_MAC_SHA256
 */

const encoder = new TextEncoder();

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyLemonWebhook(request, env, rawBody) {
  const signature = request.headers.get('x-signature') || request.headers.get('X-Signature') || '';
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET || !signature) return false;
  const expected = await hmacHex(env.LEMONSQUEEZY_WEBHOOK_SECRET, rawBody);
  return timingSafeEqualHex(signature, expected);
}

function allowedVariantIds(env) {
  return String(env.SOURCEDECK_VARIANT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function extractLemonEvent(payload) {
  const meta = payload && payload.meta ? payload.meta : {};
  const data = payload && payload.data ? payload.data : {};
  const attrs = data.attributes || {};
  const firstOrderItem = Array.isArray(attrs.first_order_item) ? attrs.first_order_item[0] : attrs.first_order_item;
  const productId = String(attrs.product_id || (firstOrderItem && firstOrderItem.product_id) || '');
  const variantId = String(attrs.variant_id || (firstOrderItem && firstOrderItem.variant_id) || '');
  return {
    eventName: String(meta.event_name || ''),
    productId,
    variantId,
    customerEmail: attrs.user_email || attrs.customer_email || '',
    customerName: attrs.user_name || attrs.customer_name || '',
    orderId: String(data.id || attrs.order_id || ''),
    status: String(attrs.status || '').toLowerCase()
  };
}

function isEligiblePurchase(event, env) {
  const allowedEvents = new Set(['order_created', 'subscription_created', 'license_key_created']);
  if (!allowedEvents.has(event.eventName)) return false;
  if (env.SOURCEDECK_PRODUCT_ID && event.productId && String(env.SOURCEDECK_PRODUCT_ID) !== event.productId) return false;
  const variants = allowedVariantIds(env);
  if (variants.length && event.variantId && !variants.includes(event.variantId)) return false;
  return true;
}

function base64UrlEncode(value) {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function createDownloadToken(env, claims) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  const payload = base64UrlEncode(JSON.stringify({ ...claims, exp }));
  const sig = await hmacHex(env.DOWNLOAD_SIGNING_SECRET, payload);
  return `${payload}.${sig}`;
}

async function verifyDownloadToken(env, token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig || !env.DOWNLOAD_SIGNING_SECRET) return null;
  const expected = await hmacHex(env.DOWNLOAD_SIGNING_SECRET, payload);
  if (!timingSafeEqualHex(sig, expected)) return null;
  let claims;
  try { claims = JSON.parse(base64UrlDecode(payload)); }
  catch (_) { return null; }
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const verified = await verifyLemonWebhook(request, env, rawBody);
  if (!verified) return json({ ok: false, error: 'invalid_webhook_signature' }, 401);

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const event = extractLemonEvent(payload);
  if (!isEligiblePurchase(event, env)) {
    return json({ ok: true, ignored: true, reason: 'not_sourceDeck_purchase', event });
  }

  const token = await createDownloadToken(env, {
    orderId: event.orderId,
    email: event.customerEmail,
    variantId: event.variantId,
    artifact: env.SOURCEDECK_CURRENT_MAC_DMG_KEY
  });

  // Production option: send this link through Lemon Squeezy receipt redirect,
  // customer portal, or transactional email provider. Returning it is useful for
  // test-mode validation and webhook debugging.
  return json({
    ok: true,
    event: event.eventName,
    customerEmail: event.customerEmail,
    downloadUrl: `/download/mac?token=${encodeURIComponent(token)}`,
    sha256: env.SOURCEDECK_CURRENT_MAC_SHA256 || null,
    expiresInSeconds: 3600
  });
}

async function handleMacDownload(request, env) {
  const url = new URL(request.url);
  const claims = await verifyDownloadToken(env, url.searchParams.get('token'));
  if (!claims) return json({ ok: false, error: 'invalid_or_expired_download_token' }, 401);

  const key = claims.artifact || env.SOURCEDECK_CURRENT_MAC_DMG_KEY;
  if (!key) return json({ ok: false, error: 'missing_artifact_key' }, 500);

  const object = await env.SOURCEDECK_RELEASES.get(key);
  if (!object) return json({ ok: false, error: 'artifact_not_found' }, 404);

  return new Response(object.body, {
    headers: {
      'content-type': 'application/x-apple-diskimage',
      'content-disposition': `attachment; filename="${key.split('/').pop()}"`,
      'x-sourcedeck-sha256': env.SOURCEDECK_CURRENT_MAC_SHA256 || '',
      'cache-control': 'private, no-store'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/webhooks/lemonsqueezy') return handleWebhook(request, env);
    if (request.method === 'GET' && url.pathname === '/download/mac') return handleMacDownload(request, env);
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, service: 'sourcedeck-fulfillment' });
    return json({ ok: false, error: 'not_found' }, 404);
  }
};
