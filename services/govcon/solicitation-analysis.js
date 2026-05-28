'use strict';

const { analyzeMiddlemanFit } = require('./middleman-fit');

function analyzeSolicitation(input) {
  input = input || {};
  const opportunity = input.opportunity || input.opp || {};
  const text = String(input.text || opportunity.description || opportunity.summary || '');
  const extracted = extractFields(text, opportunity);
  const merged = Object.assign({}, opportunity, extracted.values, {
    description: [opportunity.description, text].filter(Boolean).join('\n\n')
  });
  const fit = analyzeMiddlemanFit(merged, input.profile || {}, input.subcontractorBench || []);
  const decision = mapDecision(fit.decision, fit.score);
  const output = buildMarkdown(merged, fit, decision);
  return Object.freeze({
    ok: true,
    opportunity: merged,
    extractedFields: extracted.fields,
    deterministicDecision: decision,
    middlemanFit: fit,
    markdown: output,
    aiPolicy: 'Deterministic rules run before AI. AI may explain or draft but cannot override KILL or MORE_RESEARCH_NEEDED.'
  });
}

function extractFields(text, opportunity) {
  const fields = [];
  const add = (name, value, quote, confidence) => {
    if (value == null || value === '') return;
    fields.push({ name, value, sourceQuote: quote || null, confidence: confidence || 0.7 });
  };
  const line = (re) => {
    const m = String(text || '').match(re);
    return m ? { value: (m[1] || m[0]).trim(), quote: m[0].trim() } : null;
  };
  const due = line(/(?:response|proposal|quote)\s+(?:due|deadline)[^\n:]*[:\-]?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  const value = line(/(?:estimated\s+)?(?:contract\s+)?value[^\n$]*\$?([\d,]+(?:\.\d{2})?)/i);
  const pop = line(/period\s+of\s+performance[^\n:]*[:\-]?\s*([^\n]+)/i);
  const setAside = line(/set.aside[^\n:]*[:\-]?\s*([^\n]+)/i);
  const naics = line(/NAICS[^\d]*(\d{2,6})/i);
  add('responseDeadline', due && due.value, due && due.quote, 0.72);
  add('contractValue', value && Number(value.value.replace(/,/g, '')), value && value.quote, 0.65);
  add('periodOfPerformance', pop && pop.value, pop && pop.quote, 0.65);
  add('setAside', setAside && setAside.value, setAside && setAside.quote, 0.7);
  add('naics', naics && naics.value, naics && naics.quote, 0.8);
  const values = {};
  for (const f of fields) values[f.name] = f.value;
  return { values, fields };
}

function mapDecision(decision, score) {
  if (decision === 'KILL') return 'KILL';
  if (decision === 'MORE_RESEARCH_NEEDED') return 'MORE_RESEARCH_NEEDED';
  if (score >= 80) return 'MUST BID';
  if (score >= 65) return 'SHOULD BID';
  if (score >= 50) return 'BID IF TIME';
  return 'KILL';
}

function buildMarkdown(opp, fit, decision) {
  const profit = fit.profitStressTest || {};
  return [
    '[OPPORTUNITY ANALYSIS] — BID DECISION',
    `- Title / Solicitation #: ${val(opp.title)} / ${val(opp.solicitationNumber)}`,
    `- Agency / Office: ${val(opp.agency || opp.office)}`,
    `- Set-Aside: ${val(opp.setAside)}`,
    `- NAICS: ${val(opp.naics)}`,
    `- Location: ${val(opp.location || opp.placeOfPerformance)}`,
    `- Requirement and Period of Performance: ${val(opp.requirement || opp.scope || opp.periodOfPerformance)}`,
    `- Contract Value: ${profit.contractValue == null ? 'Unknown' : '$' + profit.contractValue.toLocaleString()}`,
    `- Response Due Date: ${val(opp.responseDeadline)}`,
    `- Profit Projection: ${profit.stressHighMarginPct == null ? 'Unknown' : profit.stressHighMarginPct + '% stressed net margin'}`,
    `- Middleman Fit: ${fit.remoteManagementFeasibility || fit.decision}`,
    `- Win Factors: ${(fit.warnings || []).slice(0, 3).map(w => w.message).join('; ') || 'No major win factors identified from provided text.'}`,
    `- Bid Decision: ${decision}`,
    `- Score: ${fit.score}/100`,
    `- Immediate Actions: ${(fit.nextActions || []).join('; ')}`
  ].join('\n');
}

function val(v) { return v == null || v === '' ? 'Unknown' : String(v); }

module.exports = { analyzeSolicitation, extractFields, mapDecision };
