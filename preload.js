const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sd', {
  storeKey: (service, key) => ipcRenderer.invoke('store-key', service, key),
  getKey: (service) => ipcRenderer.invoke('get-key', service),
  deleteKey: (service) => ipcRenderer.invoke('delete-key', service),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  version: '1.0.0',
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback)
});
