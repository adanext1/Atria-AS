const { app, BrowserWindow, ipcMain, dialog, session, Menu } = require('electron');
const path = require('path');

const storeSetup = require('./servicios/store.cjs');

const setupConfigIPC = require('./servicios/config.cjs');
const { setupProveedoresIPC } = require('./servicios/providers.cjs');
const setupPaymentsIPC = require('./servicios/payments.cjs');
const setupImapIPC = require('./servicios/imap-service.cjs');
const setupAppsIPC = require('./servicios/apps.cjs');
const setupAiIPC = require('./servicios/ai-catalog.cjs');
const setupClientesIPC = require('./servicios/clientes.cjs'); // NUEVO


let mainWindow;

function createWindow() {
  // Deshabilitar menú superior para un look más limpio (File, Edit, etc)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    titleBarStyle: 'hidden', // Oculta la barra de título tradicional
    titleBarOverlay: {
      color: '#020617', // Fondo inicial (oscuro)
      symbolColor: '#74b9ff',
      height: 40
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
  });

  if (app.isPackaged) {
    // Modo Producción (El .exe final)
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Modo Desarrollador
    mainWindow.loadURL('http://localhost:5173');
  }
}

// Handler para actualizar la barra de título dinámicamente desde el frontend
ipcMain.on('update-titlebar', (event, { isDark }) => {
  if (!mainWindow) return;

  mainWindow.setTitleBarOverlay({
    color: isDark ? '#020617' : '#f8fafc',
    symbolColor: isDark ? '#74b9ff' : '#0f172a',
    height: 40
  });
});

// ...
app.whenReady().then(async () => {
  // Hack: Hacer que WhatsApp (y otros) nos vean como un Chrome ultra moderno (ej. v120)
  // para evitar la pantalla de "WhatsApp funciona con Chrome 85+" cuando se usa un webview/ventana nueva.
  const customUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = customUserAgent;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // TambiÃ©n le decimos a electron que el userAgent global es este (ayuda a algunos scripts de front)
  app.userAgentFallback = customUserAgent;

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
