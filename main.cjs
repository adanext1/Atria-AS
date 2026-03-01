const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

const storeSetup = require('./servicios/store.cjs');

const setupConfigIPC = require('./servicios/config.cjs');
const { setupProveedoresIPC } = require('./servicios/providers.cjs');
const setupPaymentsIPC = require('./servicios/payments.cjs');
const setupImapIPC = require('./servicios/imap-service.cjs');
const setupAppsIPC = require('./servicios/apps.cjs');
const setupAiIPC = require('./servicios/ai-catalog.cjs');
const setupClientesIPC = require('./servicios/clientes.cjs'); // NUEVO


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
  });

  if (app.isPackaged) {
    // Modo Producción (El .exe final)
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Modo Desarrollador
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(async () => {
  const store = await storeSetup.init();

  setupConfigIPC(ipcMain, store);
  setupProveedoresIPC(ipcMain, store);
  setupPaymentsIPC(ipcMain, store);
  setupImapIPC(ipcMain, store);
  setupAppsIPC(ipcMain, store);
  setupAiIPC(ipcMain, store);
  setupClientesIPC(ipcMain, store); // NUEVO

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
