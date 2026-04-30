const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sd', {
  // ── Existing secure-key + store (unchanged) ────────────────────────
  storeKey:    (service, key)  => ipcRenderer.invoke('store-key',  service, key),
  getKey:      (service)       => ipcRenderer.invoke('get-key',    service),
  deleteKey:   (service)       => ipcRenderer.invoke('delete-key', service),
  storeGet:    (key)           => ipcRenderer.invoke('store-get',  key),
  storeSet:    (key, value)    => ipcRenderer.invoke('store-set',  key, value),

  // ── IBM-readiness layer (additive, status only — never raw secrets) ──
  aiProviderStatus:      ()                 => ipcRenderer.invoke('ai-provider-status'),
  storageProviderStatus: ()                 => ipcRenderer.invoke('storage-provider-status'),
  aiGenerate:            (input)            => ipcRenderer.invoke('ai-generate', input),
  storageTestPut:        (text)             => ipcRenderer.invoke('storage-test-put', text),
  validateUpload:        (descriptor)       => ipcRenderer.invoke('validate-upload', descriptor),
  contextGet:            ()                 => ipcRenderer.invoke('context-get'),
  contextSet:            (patch)            => ipcRenderer.invoke('context-set', patch),
  guardSensitiveAction:  (name, opts)       => ipcRenderer.invoke('guard-sensitive-action', name, opts),
  auditSummary:          ()                 => ipcRenderer.invoke('audit-summary'),

  version: '1.1.0',
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback)
});
