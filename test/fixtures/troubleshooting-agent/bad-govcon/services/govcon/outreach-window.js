// Synthetic fixture for troubleshooting agent tests. Intentionally lacks
// the safety-window classifier so the agent flags the missing policy.
module.exports = { evaluate: () => 'GREEN_OPEN' };
