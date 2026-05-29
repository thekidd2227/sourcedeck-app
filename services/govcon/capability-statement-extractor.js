// services/govcon/capability-statement-extractor.js
//
// Deterministic, offline extractor for GovCon capability statements.
//
// PRINCIPLE: extraction produces CANDIDATE fields only. Nothing is
// auto-saved or treated as verified. The user must approve extracted
// fields before they land in the Operating Profile. This module makes
// NO network calls and uploads NOTHING to any AI provider — it is a
// plain text/regex parser over text the user pasted or that was already
// safely extracted upstream. (AI-assisted extraction, if ever added, is
// a separate explicit opt-in path.)
//
// Pure functions. No I/O.

'use strict';

const CERT_VOCAB = [
  { key: 'SDVOSB', re: /\b(SDVOSB|service[- ]disabled veteran[- ]owned)\b/i },
  { key: 'VOSB',   re: /\b(VOSB|veteran[- ]owned small business)\b/i },
  { key: 'HUBZone',re: /\bHUB[- ]?Zone\b/i },
  { key: '8(a)',   re: /\b8\s*\(\s*a\s*\)|\b8a\b/i },
  { key: 'WOSB',   re: /\b(WOSB|woman[- ]owned small business)\b/i },
  { key: 'EDWOSB', re: /\b(EDWOSB|economically disadvantaged woman[- ]owned)\b/i },
  { key: 'MBE',    re: /\b(MBE|minority[- ]owned business enterprise)\b/i },
  { key: 'DBE',    re: /\b(DBE|disadvantaged business enterprise)\b/i },
  { key: 'SBE',    re: /\b(SBE|small business enterprise)\b/i }
];

function str(v) { return typeof v === 'string' ? v : ''; }
function uniq(a) { return Array.from(new Set(a.filter(Boolean))); }

// Confidence label from a value + the evidence that produced it.
// Deterministic: a labeled/anchored match is HIGH; a loose/contextual
// match is LOW; nothing is ever "verified".
function confidenceLabel(value, evidence) {
  if (!value) return 'none';
  const ev = str(evidence).toLowerCase();
  if (/labeled|anchor|explicit|prefix/.test(ev)) return 'high';
  if (/pattern|format|regex/.test(ev)) return 'medium';
  return 'low';
}

// UEI: 12-char alphanumeric (SAM UEI). Prefer a labeled match.
// CAGE: 5-char alphanumeric, prefer labeled.
function extractBusinessIdentifiers(text) {
  const t = str(text);
  const out = { uei: '', cage: '', legalName: '', _conf: {} };

  const ueiLabeled = t.match(/\bUEI\s*[:#]?\s*([A-Z0-9]{12})\b/i);
  const cageLabeled = t.match(/\bCAGE(?:\s*Code)?\s*[:#]?\s*([A-Z0-9]{5})\b/i);
  if (ueiLabeled) { out.uei = ueiLabeled[1].toUpperCase(); out._conf.uei = confidenceLabel(out.uei, 'labeled'); }
  if (cageLabeled) { out.cage = cageLabeled[1].toUpperCase(); out._conf.cage = confidenceLabel(out.cage, 'labeled'); }

  // Legal name: look for a "Legal Name:" / "Company:" label.
  const nameLabeled = t.match(/\b(?:legal (?:business )?name|company name|company|dba)\s*[:#]\s*(.+)/i);
  if (nameLabeled) {
    out.legalName = nameLabeled[1].split(/[\n\r|]/)[0].trim().slice(0, 160);
    out._conf.legalName = confidenceLabel(out.legalName, 'labeled');
  }
  return out;
}

// NAICS: 2–6 digit codes, prefer those near a NAICS label.
function normalizeNaicsCodes(text) {
  const t = str(text);
  const out = [];
  // Labeled block first
  const block = t.match(/NAICS[^\n]{0,400}/i);
  const scope = block ? block[0] : t;
  const matches = scope.match(/\b\d{6}\b/g) || [];
  for (const m of matches) out.push(m);
  // Fall back to any 6-digit codes if none labeled
  if (out.length === 0) {
    const any = t.match(/\b\d{6}\b/g) || [];
    for (const m of any.slice(0, 20)) out.push(m);
  }
  return uniq(out).slice(0, 40);
}

// PSC: letter+3 alnum, or 4-char codes near a PSC label.
function normalizePscCodes(text) {
  const t = str(text);
  const block = t.match(/\b(PSC|product service code)[^\n]{0,300}/i);
  const scope = block ? block[0] : '';
  const matches = (scope.match(/\b[A-Z]\d{2}[A-Z0-9]\b|\b[A-Z]{1,2}\d{1,3}\b/g) || []);
  return uniq(matches.map(s => s.toUpperCase())).slice(0, 40);
}

function detectCertifications(text) {
  const t = str(text);
  const found = [];
  for (const c of CERT_VOCAB) if (c.re.test(t)) found.push(c.key);
  return uniq(found);
}

// Services: bullet-like lines or "Core Services:" / "Capabilities:" block.
function extractServices(text) {
  const t = str(text);
  const out = [];
  const block = t.match(/(?:core services|capabilities|services)\s*[:\n]([\s\S]{0,600})/i);
  const scope = block ? block[1] : t;
  const lines = scope.split(/\n|•|·|•|;|–|-\s/).map(s => s.trim());
  for (const l of lines) {
    if (l.length >= 4 && l.length <= 160 && /[a-z]/i.test(l) && !/^NAICS|^PSC|^UEI|^CAGE/i.test(l)) out.push(l);
    if (out.length >= 20) break;
  }
  return uniq(out).slice(0, 20);
}

// Differentiators: lines near "differentiators"/"why us"/"what sets us".
function extractDifferentiators(text) {
  const t = str(text);
  const block = t.match(/(?:differentiators|why (?:us|choose)|what sets us apart|competitive advantage)\s*[:\n]([\s\S]{0,600})/i);
  if (!block) return [];
  const lines = block[1].split(/\n|•|·|•|;/).map(s => s.trim());
  return uniq(lines.filter(l => l.length >= 4 && l.length <= 240)).slice(0, 12);
}

function extractPastPerformanceSnippets(text) {
  const t = str(text);
  const block = t.match(/(?:past performance|experience|representative (?:projects|clients))\s*[:\n]([\s\S]{0,800})/i);
  if (!block) return [];
  const lines = block[1].split(/\n|•|·|•|;/).map(s => s.trim());
  return uniq(lines.filter(l => l.length >= 8 && l.length <= 400)).slice(0, 12);
}

// Top-level: produce a candidate bundle. NOTHING here is verified or
// saved — the caller presents these for explicit user approval.
function extractCapabilityStatementFields(text) {
  const t = str(text);
  if (!t.trim()) {
    return { ok: false, reason: 'no_text', candidates: {}, confidence: {}, note: NOTE };
  }
  const ids = extractBusinessIdentifiers(t);
  const naics = normalizeNaicsCodes(t);
  const psc = normalizePscCodes(t);
  const certs = detectCertifications(t);
  const services = extractServices(t);
  const diffs = extractDifferentiators(t);
  const pp = extractPastPerformanceSnippets(t);

  const candidates = {
    legalName: ids.legalName,
    uei: ids.uei,
    cage: ids.cage,
    naics, psc,
    certifications: certs,
    services,
    differentiators: diffs,
    pastPerformanceSnippets: pp
  };
  const confidence = {
    legalName: ids._conf.legalName || confidenceLabel(ids.legalName, ''),
    uei: ids._conf.uei || confidenceLabel(ids.uei, ''),
    cage: ids._conf.cage || confidenceLabel(ids.cage, ''),
    naics: confidenceLabel(naics[0], 'pattern'),
    psc: confidenceLabel(psc[0], 'pattern'),
    certifications: confidenceLabel(certs[0], 'labeled'),
    services: confidenceLabel(services[0], ''),
    differentiators: confidenceLabel(diffs[0], 'labeled'),
    pastPerformanceSnippets: confidenceLabel(pp[0], 'labeled')
  };

  return {
    ok: true,
    verified: false,         // never verified by extraction
    requiresApproval: true,  // user must approve before save
    candidates,
    confidence,
    note: NOTE
  };
}

const NOTE = 'Candidate fields only — not verified. Review and approve each field before it is saved to your GovCon Operating Profile. No data was sent to any external provider.';

module.exports = {
  extractCapabilityStatementFields,
  normalizeNaicsCodes,
  normalizePscCodes,
  detectCertifications,
  extractBusinessIdentifiers,
  extractServices,
  extractDifferentiators,
  extractPastPerformanceSnippets,
  confidenceLabel,
  CERT_VOCAB
};
