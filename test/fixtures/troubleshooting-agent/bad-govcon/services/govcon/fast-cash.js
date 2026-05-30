// Synthetic fixture for troubleshooting agent tests. Intentionally lacks
// the irreversible-drop verdict so the agent flags the missing safety gate.
module.exports = { decide: () => ({ verdict: 'GO' }) };
