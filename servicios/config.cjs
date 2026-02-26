const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs-extra');

module.exports = function setupConfigIPC(ipcMain, store) {
  ipcMain.handle('get-config', () => {
    return store.get('userConfig') || {
      rfc: '',
      razonSocial: '',
      cp: '',
      regimen: '',
      rutaDestino: ''
    };
  });

  // 2. Guardar nueva configuración
  ipcMain.handle('save-config', (event, config) => {
    store.set('userConfig', config);
    return { success: true };
  });

  // 3. Abrir ventana de Windows para seleccionar carpeta
  ipcMain.handle('select-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(win, {
      title: 'Selecciona la carpeta principal para tus facturas',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });
  ipcMain.handle('crear-proveedor', async (event, datosProveedor) => {
    try {
      const config = store.get('userConfig');
      if (!config || !config.rutaDestino) {
        return { success: false, error: 'No has configurado la carpeta principal en Ajustes.' };
      }

      const nombreSeguro = datosProveedor.nombreComercial.replace(/[<>:"/\\|?*]+/g, '').trim();
      const rutaProveedor = path.join(config.rutaDestino, nombreSeguro);
      await fs.ensureDir(rutaProveedor);

      console.log('Carpeta creada exitosamente en:', rutaProveedor);
      return { success: true, ruta: rutaProveedor };
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      return { success: false, error: error.message };
    }
  });

ipcMain.handle('obtener-config', () => {
  return store.get('userConfig') || {};
});
};
