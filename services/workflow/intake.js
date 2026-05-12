'use strict';

const TEMPLATE_VERTICALS = Object.freeze({
  GOVCON: 'govcon',
  PROPERTY_MANAGEMENT: 'property-management',
  SERVICE_COMPANY: 'service-company',
  SMALL_BUSINESS: 'small-business'
});

const CLASSIFICATION_RULES = Object.freeze([
  {
    vertical: TEMPLATE_VERTICALS.GOVCON,
    suggestedTemplate: 'govcon',
    terms: [
      'sam.gov', 'sam gov', 'naics', 'solicitation', 'set-aside', 'set aside',
      'rfp', 'rfi', 'rfq', 'fbo', 'far', 'contracting officer', 'cui',
      'opportunity number', 'uei', 'cage', 'past performance'
    ],
    missingFields: ['solicitationSource', 'deadline', 'naicsOrSetAside']
  },
  {
    vertical: TEMPLATE_VERTICALS.PROPERTY_MANAGEMENT,
    suggestedTemplate: 'property-management',
    terms: [
      'tenant', 'unit', 'maintenance', 'vendor', 'work order', 'property',
      'lease', 'resident', 'repair', 'inspection', 'apartment', 'building'
    ],
    missingFields: ['propertyOrUnit', 'maintenanceIssue', 'vendorStatus']
  },
  {
    vertical: TEMPLATE_VERTICALS.SERVICE_COMPANY,
    suggestedTemplate: 'service-company',
    terms: [
      'estimate', 'crew', 'job', 'service address', 'dispatch', 'technician',
      'appointment', 'quote', 'field service', 'scope visit', 'schedule'
    ],
    missingFields: ['serviceAddress', 'jobScope', 'scheduleWindow']
  },
  {
    vertical: TEMPLATE_VERTICALS.SMALL_BUSINESS,
    suggestedTemplate: 'small-business',
    terms: [
      'lead', 'client request', 'proposal', 'follow-up', 'follow up',
      'customer', 'inquiry', 'onboarding', 'invoice', 'owner assignment'
    ],
    missingFields: ['clientName', 'requestedOutcome', 'owner']
  }
]);

function normalizeTenant(input) {
  const src = _asObject(input);
  return _stripUndefined({
    tenantId: _string(src.tenantId || src.id),
    name: _string(src.name),
    plan: _string(src.plan || 'unassigned'),
    verticalsEnabled: _array(src.verticalsEnabled).map(_string).filter(Boolean),
    dataRegion: _string(src.dataRegion || 'us')
  });
}

function normalizeUser(input) {
  const src = _asObject(input);
  return _stripUndefined({
    userId: _string(src.userId || src.id),
    tenantId: _string(src.tenantId),
    role: _string(src.role || 'operator'),
    email: _normalizeEmail(src.email),
    status: _string(src.status || 'active')
  });
}

function normalizeWorkspace(input) {
  const src = _asObject(input);
  return _stripUndefined({
    workspaceId: _string(src.workspaceId || src.id),
    tenantId: _string(src.tenantId),
    vertical: _normalizeVertical(src.vertical),
    name: _string(src.name),
    createdAt: _iso(src.createdAt)
  });
}

function normalizeIntake(input) {
  const src = _asObject(input);
  const payload = _asObject(src.payload);
  return _stripUndefined({
    intakeId: _string(src.intakeId || src.id),
    workspaceId: _string(src.workspaceId),
    source: _string(src.source || 'manual'),
    verticalHint: _normalizeVertical(src.verticalHint),
    payload,
    normalizedFields: _normalizeFields(src.normalizedFields || payload),
    receivedAt: _iso(src.receivedAt)
  });
}

function normalizeSecretRef(input) {
  const src = _asObject(input);
  return _stripUndefined({
    secretRefId: _string(src.secretRefId || src.id),
    tenantId: _string(src.tenantId),
    provider: _string(src.provider),
    vaultPath: _string(src.vaultPath),
    status: _string(src.status || 'active')
  });
}

function classifyIntake(input) {
  const normalized = normalizeIntake(input || {});
  const haystack = _searchText(normalized);
  const scored = CLASSIFICATION_RULES.map((rule) => {
    const matched = rule.terms.filter((term) => haystack.includes(term));
    const hintBoost = normalized.verticalHint === rule.vertical ? 2 : 0;
    return {
      rule,
      score: matched.length + hintBoost,
      matched
    };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const confidence = _confidence(winner ? winner.score : 0, haystack.length);
  const rule = winner && winner.score > 0 ? winner.rule : CLASSIFICATION_RULES[3];
  const reasons = winner && winner.matched.length
    ? winner.matched.map((term) => `matched heuristic: ${term}`)
    : ['no strong vertical markers found; defaulted to small-business operations'];

  return {
    vertical: rule.vertical,
    confidence,
    reasons,
    suggestedTemplate: rule.suggestedTemplate,
    missingFields: _missingFields(rule, normalized)
  };
}

function _missingFields(rule, intake) {
  const text = _searchText(intake);
  return rule.missingFields.filter((field) => !text.includes(field.toLowerCase()));
}

function _confidence(score, textLength) {
  if (score <= 0) return 0.35;
  const densityBoost = textLength > 80 ? 0.05 : 0;
  return Math.min(0.95, Number((0.45 + score * 0.12 + densityBoost).toFixed(2)));
}

function _searchText(value) {
  return JSON.stringify(value || {})
    .toLowerCase()
    .replace(/["'{}[\],:]/g, ' ')
    .replace(/\s+/g, ' ');
}

function _normalizeFields(fields) {
  const src = _asObject(fields);
  const out = {};
  for (const key of Object.keys(src)) {
    const cleanKey = _string(key).trim();
    if (!cleanKey) continue;
    const value = src[key];
    out[cleanKey] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

function _normalizeVertical(value) {
  const v = _string(value).toLowerCase().replace(/_/g, '-');
  if (['govcon', 'federal', 'government-contracting'].includes(v)) return TEMPLATE_VERTICALS.GOVCON;
  if (['property-management', 'property', 'maintenance'].includes(v)) return TEMPLATE_VERTICALS.PROPERTY_MANAGEMENT;
  if (['service-company', 'service', 'field-service'].includes(v)) return TEMPLATE_VERTICALS.SERVICE_COMPANY;
  if (['small-business', 'smb', 'operations'].includes(v)) return TEMPLATE_VERTICALS.SMALL_BUSINESS;
  return v || undefined;
}

function _normalizeEmail(value) {
  const v = _string(value).trim().toLowerCase();
  return v || undefined;
}

function _iso(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function _array(value) {
  return Array.isArray(value) ? value : [];
}

function _asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function _string(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function _stripUndefined(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'undefined') continue;
    if (typeof value === 'string' && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

module.exports = {
  TEMPLATE_VERTICALS,
  CLASSIFICATION_RULES,
  normalizeTenant,
  normalizeUser,
  normalizeWorkspace,
  normalizeIntake,
  normalizeSecretRef,
  classifyIntake,
  _internal: { _searchText, _normalizeVertical }
};
