const fsExtra = require('fs-extra');
const path = require('path');
const { app } = require('electron');

module.exports = function setupAppsIPC(ipcMain, store) {
ipcMain.handle('obtener-apps-instaladas', async () => {
  try {
    const rutaApps = path.join(app.getPath('userData'), 'apps_instaladas.json');
    if (await fsExtra.pathExists(rutaApps)) {
      const apps = await fsExtra.readJson(rutaApps);
      return { success: true, apps };
    }
    return { success: true, apps: [] }; // Si no hay archivo, devolvemos un arreglo vacío
  } catch (error) {
    console.error("Error al leer apps:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('guardar-apps-instaladas', async (event, nuevasApps) => {
  try {
    const rutaApps = path.join(app.getPath('userData'), 'apps_instaladas.json');
    await fsExtra.writeJson(rutaApps, nuevasApps, { spaces: 2 });
    return { success: true };
  } catch (error) {
    console.error("Error al guardar apps:", error);
    return { success: false, error: error.message };
  }
});

};
