const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'main.cjs');
const serviciosPath = path.join(__dirname, 'servicios');

if (!fs.existsSync(serviciosPath)) {
    fs.mkdirSync(serviciosPath);
}

const mainContent = fs.readFileSync(mainPath, 'utf8');
const lines = mainContent.split('\n');

// Extraer fragmentos
const getLines = (start, end) => lines.slice(start - 1, end).join('\n');

// 1. config.cjs
const configContent = `const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs-extra');

module.exports = function setupConfigIPC(ipcMain, store) {
${getLines(71, 100)}
${getLines(107, 124)}

${getLines(321, 323)}
};
`;
fs.writeFileSync(path.join(serviciosPath, 'config.cjs'), configContent);


// 2. providers.cjs
const providersContent = `const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');

${getLines(132, 317)}

module.exports = {
  actualizarLibrosProveedor,
  setupProveedoresIPC: function(ipcMain, store) {
${getLines(326, 412)}

${getLines(415, 449)}

${getLines(451, 476)}

${getLines(478, 527)}

${getLines(529, 548)}

${getLines(551, 604)}

${getLines(607, 655)}
  }
};
`;
fs.writeFileSync(path.join(serviciosPath, 'providers.cjs'), providersContent);

// 3. payments.cjs
const paymentsContent = `const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { shell } = require('electron');

module.exports = function setupPaymentsIPC(ipcMain, store) {
${getLines(658, 736)}

${getLines(738, 755)}

${getLines(762, 772)}

${getLines(777, 830)}

${getLines(835, 891)}

${getLines(896, 912)}
};
`;
fs.writeFileSync(path.join(serviciosPath, 'payments.cjs'), paymentsContent);

// 4. imap-service.cjs
const imapContent = `const { app } = require('electron');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const xml2js = require('xml2js');
const { actualizarLibrosProveedor } = require('./providers.cjs');

module.exports = function setupImapIPC(ipcMain, store) {
${getLines(918, 961)}

${getLines(967, 1051)}

${getLines(1056, 1153)}

${getLines(1157, 1198)}

${getLines(1203, 1254)}

${getLines(1260, 1341)}
};
`;
fs.writeFileSync(path.join(serviciosPath, 'imap-service.cjs'), imapContent);

// 5. apps.cjs
const appsContent = `const fsExtra = require('fs-extra');
const path = require('path');
const { app } = require('electron');

module.exports = function setupAppsIPC(ipcMain, store) {
${getLines(1348, 1360)}

${getLines(1363, 1373)}
};
`;
fs.writeFileSync(path.join(serviciosPath, 'apps.cjs'), appsContent);

// 6. ai-catalog.cjs
const aiContent = `const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

let generadorDeVectores = null;

${getLines(15, 23)}

${getLines(1560, 1569)}

module.exports = function setupAiIPC(ipcMain, store) {
${getLines(26, 35)}

${getLines(1377, 1434)}

${getLines(1439, 1520)}

${getLines(1523, 1558)}

${getLines(1573, 1667)}

${getLines(1670, 1705)}

${getLines(1708, 1730)}

${getLines(1733, 1764)}

${getLines(1767, 1787)}

${getLines(1790, 1828)}

${getLines(1831, 1896)}

${getLines(1901, 2055)}
};
`;
fs.writeFileSync(path.join(serviciosPath, 'ai-catalog.cjs'), aiContent);

// 7. store.cjs
const storeContent = `let storeInstance = null;

module.exports = {
  init: async () => {
    if (!storeInstance) {
      const module = await import('electron-store');
      const Store = module.default;
      storeInstance = new Store();
    }
    return storeInstance;
  },
  getStore: () => storeInstance
};
`;
fs.writeFileSync(path.join(serviciosPath, 'store.cjs'), storeContent);

// REESCRITURA DE MAIN.CJS
let mainNuevo = `${getLines(1, 1)}
const path = require('path');

const storeSetup = require('./servicios/store.cjs');

const setupConfigIPC = require('./servicios/config.cjs');
const { setupProveedoresIPC } = require('./servicios/providers.cjs');
const setupPaymentsIPC = require('./servicios/payments.cjs');
const setupImapIPC = require('./servicios/imap-service.cjs');
const setupAppsIPC = require('./servicios/apps.cjs');
const setupAiIPC = require('./servicios/ai-catalog.cjs');

${getLines(37, 57)}

app.whenReady().then(async () => {
  const store = await storeSetup.init(); 

  setupConfigIPC(ipcMain, store);
  setupProveedoresIPC(ipcMain, store);
  setupPaymentsIPC(ipcMain, store);
  setupImapIPC(ipcMain, store);
  setupAppsIPC(ipcMain, store);
  setupAiIPC(ipcMain, store);

  createWindow();
});

${getLines(2057, 2059)}
`;
fs.writeFileSync(path.join(__dirname, 'main.cjs'), mainNuevo);

console.log("REFACTOR COMPLETE");
