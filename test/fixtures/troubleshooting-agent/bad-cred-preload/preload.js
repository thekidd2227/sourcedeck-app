// Synthetic fixture for the troubleshooting agent test suite.
// Intentionally exposes a raw credentials.get — must trigger CRED-010.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('sd', {
  credentials: {
    get: async (service) => 'sk-test-FAKE-NOT-REAL-' + service,
  },
});
