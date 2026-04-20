// Capture a single renderer screenshot showing SourceDeck connected to
// a bearer-mode ChartNav (real RS256 JWT validated against a real local
// JWKS endpoint). Writes qa/screens/06-bearer-fully-connected.png.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const _mem = new Map();
ipcMain.handle('store-get', (_e, k) => (_mem.has(k) ? _mem.get(k) : null));
ipcMain.handle('store-set', (_e, k, v) => { _mem.set(k, v); return { success: true }; });
ipcMain.handle('store-key', (_e, s, v) => { _mem.set('keys.' + s, v); return { success: true }; });
ipcMain.handle('get-key',   (_e, s) => _mem.get('keys.' + s) || null);
ipcMain.handle('delete-key',(_e, s) => { _mem.delete('keys.' + s); return { success: true }; });

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const TOKEN = fs.readFileSync(path.join(__dirname, 'bearer-token.txt'), 'utf-8').trim();
const OUT = path.join(__dirname, 'screens', '06-bearer-fully-connected.png');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440, height: 900, show: true, backgroundColor: '#04040A',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  await win.loadFile(path.join(__dirname, '..', 'sourcedeck.html'));
  await new Promise(r => setTimeout(r, 1500));

  await win.webContents.executeJavaScript(`
    (async () => {
      await window.sd.storeSet('clinical', { enabled: true, impl_mode: 'self_implementation', org_name: 'QA Bearer Org', provider_count: 1, locations: 'QA', transcription: 'whisper', ehr_system: 'chartnav', storage: 'local', auth: 'bearer' });
      const badge = document.getElementById('cl-status-badge');
      if (badge && badge.textContent === 'DISABLED' && window.clinicalToggle) await window.clinicalToggle();
      if (typeof openTab === 'function') openTab('clinical');
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  const state = await win.webContents.executeJavaScript(`
    (async () => {
      const integ = window.__chartnavInteg;
      integ.reset();
      document.getElementById('cn-base-url').value = ${JSON.stringify(BASE)};
      // Truncate token visually so the screenshot doesn't leak the full JWT.
      // The integration receives the FULL token via setConnection; only the
      // visible <input> is masked for the screenshot.
      const tokDisplay = ${JSON.stringify(TOKEN.slice(0, 18) + '…(JWT, ' + TOKEN.length + ' chars)')};
      document.getElementById('cn-admin-token').value = tokDisplay;
      integ.setConnection({ base_url: ${JSON.stringify(BASE)}, admin_token: ${JSON.stringify(TOKEN)} });
      await integ.connect();
      window.chartnavRender && window.chartnavRender();
      document.getElementById('cl-connection-card').scrollIntoView({block:'start'});
      return integ.summaryState();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  console.log('bearer-mode summary_state =', state);

  const img = await win.webContents.capturePage();
  fs.writeFileSync(OUT, img.toPNG());
  console.log('wrote', OUT);
  app.quit();
}).catch(e => { console.error(e); app.quit(); });
