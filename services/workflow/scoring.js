'use strict';

function scoreIntake({ classification, intake, template } = {}) {
  const confidence = Number(classification && classification.confidence) || 0;
  const missing = Array.isArray(classification && classification.missingFields)
    ? classification.missingFields.length
    : 0;
  const payloadSize = JSON.stringify((intake && intake.payload) || {}).length;
  const templateWeight = template && template.premium ? 8 : 4;
  const completeness = Math.max(0, 30 - missing * 6);
  const detail = Math.min(20, Math.floor(payloadSize / 40));
  const score = Math.max(1, Math.min(100, Math.round(confidence * 40 + completeness + detail + templateWeight)));
  return {
    score,
    confidence,
    factors: {
      classificationConfidence: confidence,
      missingFieldCount: missing,
      payloadSize,
      templateWeight
    }
  };
}

module.exports = { scoreIntake };
