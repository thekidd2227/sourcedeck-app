// Boots a real Electron BrowserWindow against sourcedeck.html, drives
// the live ChartNav integration into 4 distinct states, and captures
// the clinical pane as PNGs. Run with:
//   BASE=http://127.0.0.1:8765 ADMIN=admin@chartnav.local \
//     ./node_modules/.bin/electron qa/capture-screens.js
//
// Outputs:
//   qa/screens/01-disconnected.png
//   qa/screens/02-manifest-only.png
//   qa/screens/03-fully-connected.png
//   qa/screens/04-telemetry-failed.png

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Minimal in-memory IPC handlers so the renderer's window.sd.* calls
// don't throw. We don't need persistence for screenshot capture.
const _mem = new Map();
ipcMain.handle('store-get', (_e, k) => (_mem.has(k) ? _mem.get(k) : null));
ipcMain.handle('store-set', (_e, k, v) => { _mem.set(k, v); return { success: true }; });
ipcMain.handle('store-key', (_e, s, v) => { _mem.set('keys.' + s, v); return { success: true }; });
ipcMain.handle('get-key', (_e, s) => _mem.get('keys.' + s) || null);
ipcMain.handle('delete-key', (_e, s) => { _mem.delete('keys.' + s); return { success: true }; });

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const ADMIN = process.env.ADMIN || 'admin@chartnav.local';
const OUT_DIR = path.join(__dirname, 'screens');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function snap(win, label) {
  await new Promise(r => setTimeout(r, 700));
  // Scroll the clinical pane so the ChartNav cards (which sit BELOW
  // the capability/impl/config cards) are in view before capturing.
  await win.webContents.executeJavaScript(`
    (() => {
      const target = document.getElementById('cl-connection-card');
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    })()
  `);
  await new Promise(r => setTimeout(r, 350));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT_DIR, label + '.png'), img.toPNG());
  console.log('  wrote', path.join(OUT_DIR, label + '.png'));
}

async function drive(win, scenario) {
  return win.webContents.executeJavaScript(`
    (async () => {
      const integ = window.__chartnavInteg;
      if (!integ) throw new Error('chartnav integration not exposed on window');
      integ.reset();
      // Reflect raw values into the visible inputs first so the
      // screenshot shows what the user would have typed.
      const baseEl = document.getElementById('cn-base-url');
      const tokEl  = document.getElementById('cn-admin-token');
      if (baseEl) baseEl.value = ${JSON.stringify(scenario.conn.base_url)};
      if (tokEl)  tokEl.value  = ${JSON.stringify(scenario.conn.admin_token)};
      integ.setConnection(${JSON.stringify(scenario.conn)});
      if (${JSON.stringify(scenario.connect)}) {
        await integ.connect();
      }
      // Re-render all three chartnav cards.
      window.chartnavRender && window.chartnavRender();
      return integ.summaryState();
    })()
  `);
}

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

  // Enable clinical mode + jump to the clinical tab so the ChartNav
  // cards become visible.
  await win.webContents.executeJavaScript(`
    (async () => {
      // Force-enable clinical state without going through the toggle
      // (toggle flips, so we set explicitly via storeSet then reload UI).
      await window.sd.storeSet('clinical', { enabled: true, impl_mode: 'self_implementation', org_name: 'QA Test Org', provider_count: 1, locations: 'QA Site', transcription: 'whisper', ehr_system: 'chartnav', storage: 'local', auth: 'header' });
      // Re-pull state by toggling twice (off→on) is too disruptive; just
      // mutate the in-scope module state via the public hooks the
      // renderer exposes, then trigger a render.
      if (window.clinicalToggle) {
        // Read current; if disabled, toggle on. If already on, leave.
        // Simpler: just call toggle if the badge says DISABLED.
        const badge = document.getElementById('cl-status-badge');
        if (badge && badge.textContent === 'DISABLED') await window.clinicalToggle();
      }
      if (typeof openTab === 'function') openTab('clinical');
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));

  const scenarios = [
    { label: '01-disconnected',     conn: { base_url: '', admin_token: '' }, connect: false },
    { label: '02-manifest-only',    conn: { base_url: BASE, admin_token: '' }, connect: true },
    { label: '03-fully-connected',  conn: { base_url: BASE, admin_token: ADMIN }, connect: true },
    { label: '04-telemetry-failed', conn: { base_url: BASE, admin_token: 'nobody@nowhere.invalid' }, connect: true },
  ];
  for (const s of scenarios) {
    const state = await drive(win, s);
    console.log('-', s.label, '→', state);
    await snap(win, s.label);
  }
  console.log('Done. Quitting Electron.');
  app.quit();
}).catch(e => { console.error(e); app.quit(); });
