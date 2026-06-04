// services/govcon/sam-sprint-entitlements.js
//
// SAM Sprint entitlement model. Encodes the Free vs Paid NAICS access
// rule for the SAM Opportunity Sprint feature.
//
// HARD RULES
// - No payment processing. No billing IDs. No credentials. This module
//   does not decide who is paid; it only translates a plan name into a
//   query-time entitlement.
// - The free-plan NAICS limit affects the ACTIVE QUERY SET only. It
//   never mutates the operator's saved `profile.target_naics`.
// - Entitlement metadata is always explicit. We surface which NAICS
//   were searched and which were withheld so the operator can see the
//   limit and decide whether to upgrade.
// - No secrets in this module.

'use strict';

// Plan → max active NAICS per sprint. Anything above the free tier is
// unrestricted by design — the goal is to keep paid users out of the
// way of their own query, not to police them.
const PLAN_LIMITS = Object.freeze({
  free:        { is_paid: false, max_naics_codes: 1 },
  paid:        { is_paid: true,  max_naics_codes: Infinity },
  pro:         { is_paid: true,  max_naics_codes: Infinity },
  team:        { is_paid: true,  max_naics_codes: Infinity },
  enterprise:  { is_paid: true,  max_naics_codes: Infinity },
});

const KNOWN_PLANS = Object.freeze(Object.keys(PLAN_LIMITS));

// Coerce a free-form plan input to a known plan name.
// Returns { plan, normalized_from, warning } so the caller can surface
// "we treated 'pleb' as 'free'" in logs/reports without silently
// dropping it on the floor.
function normalizePlan(input) {
  if (input == null || input === '') {
    return { plan: 'free', normalized_from: null, warning: null };
  }
  const raw = String(input).trim().toLowerCase();
  if (KNOWN_PLANS.includes(raw)) {
    return { plan: raw, normalized_from: raw, warning: null };
  }
  return {
    plan: 'free',
    normalized_from: raw,
    warning: `Unknown plan "${input}" — defaulting to "free".`,
  };
}

// Accept either a plan string or an object with a `.subscription.plan`
// (a normalized pursuit profile) and return a fully-formed entitlement.
function getSamSprintEntitlement(planOrProfile) {
  let planInput = null;
  if (planOrProfile && typeof planOrProfile === 'object') {
    const sub = planOrProfile.subscription || {};
    planInput = sub.plan;
  } else {
    planInput = planOrProfile;
  }
  const { plan, normalized_from, warning } = normalizePlan(planInput);
  const limits = PLAN_LIMITS[plan];
  return Object.freeze({
    plan,
    is_paid: limits.is_paid,
    max_naics_codes: limits.max_naics_codes,
    plan_warning: warning,
    plan_normalized_from: normalized_from,
  });
}

// Apply the entitlement to a profile-shaped object. Returns a NEW shape
// that does not mutate the input:
//   {
//     allowed_naics: [...],       // codes that may be queried
//     blocked_naics: [...],       // codes withheld by the free limit
//     requested_count, allowed_count, blocked_count,
//     naics_limit_applied: boolean,
//   }
function applyNaicsLimit(profile, entitlement) {
  const requested = (profile && Array.isArray(profile.target_naics))
    ? profile.target_naics.slice()
    : [];
  const cap = entitlement && Number.isFinite(entitlement.max_naics_codes)
    ? Math.max(0, Math.floor(entitlement.max_naics_codes))
    : Infinity;

  if (!Number.isFinite(cap) || requested.length <= cap) {
    return Object.freeze({
      allowed_naics: requested.slice(),
      blocked_naics: [],
      requested_count: requested.length,
      allowed_count:   requested.length,
      blocked_count:   0,
      naics_limit_applied: false,
    });
  }

  const allowed = requested.slice(0, cap);
  const blocked = requested.slice(cap);
  return Object.freeze({
    allowed_naics: allowed,
    blocked_naics: blocked,
    requested_count: requested.length,
    allowed_count:   allowed.length,
    blocked_count:   blocked.length,
    naics_limit_applied: true,
  });
}

// Human-readable description suitable for CLI summaries, markdown
// report assumptions, and UI captions. Always honest about the limit:
// free users are told "searching 1 of X" not "we filtered some out for
// you".
function describeNaicsLimit(entitlement, requestedCount, allowedCount) {
  const req = Number(requestedCount) || 0;
  const allow = Number(allowedCount) || 0;
  if (!entitlement) return '';
  if (entitlement.is_paid) {
    return `${labelPlan(entitlement.plan)} plan: all configured NAICS codes enabled (${allow} of ${req}).`;
  }
  if (req <= allow) {
    return `${labelPlan(entitlement.plan)} plan: ${allow} of ${req} configured NAICS codes searched (within limit).`;
  }
  return `${labelPlan(entitlement.plan)} plan: searching ${allow} of ${req} configured NAICS codes. ${req - allow} withheld by free-plan limit.`;
}

function labelPlan(plan) {
  if (!plan) return 'Free';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

module.exports = Object.freeze({
  PLAN_LIMITS,
  KNOWN_PLANS,
  normalizePlan,
  getSamSprintEntitlement,
  applyNaicsLimit,
  describeNaicsLimit,
});
