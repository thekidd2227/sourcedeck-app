// Synthetic fixture — intentionally omits required status classifications
// to trigger WX-002. Does NOT classify 401/403/network failures.
module.exports = { check: () => ({ status: 'ok' }) };
