const { app, BrowserWindow, ipcMain, dialog } = require('electron');


const { ImapFlow } = require('imapflow'); // <--- AQUÍ ES SU LUGAR CORRECTO
const { simpleParser } = require('mailparser');
const xml2js = require('xml2js');
const { pipeline } = require('@xenova/transformers');

let store; // Preparamos la variable para la base de datos

async function inicializarModeloIA() {
  if (!generadorDeVectores) {
    console.log("🤖 Cargando motor de análisis semántico...");
    generadorDeVectores = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
    console.log("✅ Motor IA listo y cargado en RAM.");
  }
  return generadorDeVectores;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IPC para generar el vector de un nombre de producto
ipcMain.handle('generar-embedding', async (event, texto) => {
  try {
    const extractor = await inicializarModeloIA();
    // Generamos el vector (embedding)
    const salida = await extractor(texto, { pooling: 'mean', normalize: true });
    // Convertimos el objeto de salida a un arreglo de números simple
    return Array.from(salida.data);
  } catch (error) {
    console.error("Error en IA:", error);
    return null;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webviewTag: true
    },
  });
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const path = require('path');

  
  if (app.isPackaged) {
    // Modo Producción (El .exe final)
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Modo Desarrollador
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(async () => {
  // Importamos electron-store de forma moderna y asíncrona para que no marque error
  const module = await import('electron-store');
  const Store = module.default;
  store = new Store();

  // Ya que cargó la base de datos, ahora sí abrimos la ventana
  createWindow();

  // --- NUESTROS PUENTES DE COMUNICACIÓN (IPC) ---

  // 1. Obtener la configuración guardada
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const fs = require('fs');
const path = require('path');

// IPC para el proceso de inicialización masiva
ipcMain.handle('inicializar-catalogo-maestro', async (event, rutaBaseProveedores) => {
  const rutaMaestro = path.join(app.getPath('userData'), 'productos_maestros.json');
  const rutaMapeos = path.join(app.getPath('userData'), 'mapeos_sistema.json');

  let maestro = {}; // Usaremos un objeto indexado por ID para rapidez
  let mapeos = [];

  try {
    // 1. Obtener todas las carpetas de proveedores
    const carpetas = fs.readdirSync(rutaBaseProveedores);

    for (const rfc of carpetas) {
      const rutaJsonProv = path.join(rutaBaseProveedores, rfc, 'productos.json');
      
      if (fs.existsSync(rutaJsonProv)) {
        const productosProv = JSON.parse(fs.readFileSync(rutaJsonProv, 'utf8'));

        for (const [nombreXML, datos] of Object.entries(productosProv)) {
          
          // GENERAR UN ID ÚNICO TEMPORAL O BUSCAR EXISTENTE
          let idEncontrado = null;

          // Regla A: Si tiene código de barras, buscar en el maestro
          if (datos.codigoBarras && datos.codigoBarras !== "") {
            idEncontrado = Object.keys(maestro).find(id => 
              maestro[id].codigos_barras.includes(datos.codigoBarras)
            );
          }

          if (idEncontrado) {
            // Ya existe en el maestro, solo creamos el puente
            mapeos.push({
              master_id: idEncontrado,
              rfc_proveedor: rfc,
              nombre_en_xml: nombreXML
            });
          } else {
            // Es un producto "nuevo" para el maestro
            const nuevoId = `mstr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            maestro[nuevoId] = {
              nombre_limpio: nombreXML, // Por ahora usamos el nombre crudo
              codigos_barras: datos.codigoBarras ? [datos.codigoBarras] : [],
              claveSAT: datos.claveSAT,
              unidad_oficial: datos.unidad || "S/U",
              // El vector se generará en el siguiente paso con la IA
              vector: null 
            };

            mapeos.push({
              master_id: nuevoId,
              rfc_proveedor: rfc,
              nombre_en_xml: nombreXML
            });
          }
        }
      }
    }

    // Guardar resultados iniciales
    fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
    fs.writeFileSync(rutaMapeos, JSON.stringify(mapeos, null, 2));

    return { success: true, totalProductos: Object.keys(maestro).length };

  } catch (error) {
    console.error("Error en escaneo masivo:", error);
    return { success: false, error: error.message };
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 4. Crear un nuevo proveedor (Guarda datos y crea carpeta física)
  const fs = require('fs-extra');
 
  const path = require('path');

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
});

// --- MOTOR PARA PROCESAR Y ARCHIVAR FACTURAS ---
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

// =====================================================================
// FUNCIÓN MAESTRA: ACTUALIZAR "LIBROS MAYORES" DEL PROVEEDOR
// =====================================================================
async function actualizarLibrosProveedor(rutaProveedor, rutaXml, nombreArchivo) {
  try {
    const contenidoXml = await fsExtra.readFile(rutaXml, 'utf-8');
    
    // 1. Extracción con UUID (Folio Fiscal del SAT)
    const totalMatch = contenidoXml.match(/\sTotal="([^"]+)"/);
    const folioMatch = contenidoXml.match(/Folio="([^"]+)"/);
    const serieMatch = contenidoXml.match(/Serie="([^"]+)"/);
    const fechaMatch = contenidoXml.match(/Fecha="([^"]+)"/);
    
    // Extraemos el UUID del Timbre Fiscal Digital
    const uuidMatch = contenidoXml.match(/UUID=["']?([a-fA-F0-9\-]{36})["']?/i);
    const uuid = uuidMatch ? uuidMatch[1].toUpperCase() : nombreArchivo; 
    
    const monto = totalMatch ? parseFloat(totalMatch[1]) : 0;
    const folioStr = (serieMatch ? serieMatch[1] + '-' : '') + (folioMatch ? folioMatch[1] : 'S/F');
    const fechaCruda = fechaMatch ? fechaMatch[1] : new Date().toISOString();
    const fecha = fechaCruda.split('T')[0];
    const metodoSATPago = contenidoXml.includes('MetodoPago="PPD"') ? 'PPD' : 'PUE';

    // --- REVISAR SI YA ESTABA PAGADA EN EL HISTORIAL ---
    const rutaPagos = path.join(rutaProveedor, 'registro_pagos.json');
    let pagosExistentes = await fsExtra.pathExists(rutaPagos) ? await fsExtra.readJson(rutaPagos) : [];
    const estaPagada = pagosExistentes.some(p => p.facturasSaldadas.includes(uuid));
    
    let estadoCalculado = 'Pendiente';
    if (estaPagada) {
      estadoCalculado = metodoSATPago === 'PPD' ? 'Esperando REP' : 'Pagada';
    }

    // --- A) ACTUALIZAR REGISTRO DE FACTURAS ---
    const rutaFacturas = path.join(rutaProveedor, 'registro_facturas.json');
    let facturas = [];
    if (await fsExtra.pathExists(rutaFacturas)) facturas = await fsExtra.readJson(rutaFacturas);
    
    if (!facturas.some(f => f.id === uuid)) {
      facturas.push({
        id: uuid,
        folio: folioStr,
        fecha: fecha,
        monto: monto,
        estado: estadoCalculado, 
        metodoPago: metodoSATPago
      });
      facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });
    }

    // =====================================================================
    // --- B) ACTUALIZAR REGISTRO DE PRODUCTOS (CATÁLOGO + IMPUESTOS) ---
    // =====================================================================
    const rutaProductos = path.join(rutaProveedor, 'registro_productos.json');
    let productos = {};
    if (await fsExtra.pathExists(rutaProductos)) productos = await fsExtra.readJson(rutaProductos);

    try {
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const xmlParseado = await parser.parseStringPromise(contenidoXml);
      
      const comprobante = xmlParseado['cfdi:Comprobante'] || {};
      const conceptosPadre = comprobante['cfdi:Conceptos'] || {};
      let listaConceptos = conceptosPadre['cfdi:Concepto'] || [];
      
      if (!Array.isArray(listaConceptos)) listaConceptos = [listaConceptos];

      for (const concepto of listaConceptos) {
        const descripcion = (concepto.Descripcion || 'SIN DESCRIPCIÓN').trim().toUpperCase();
        const precioUnitario = parseFloat(concepto.ValorUnitario || 0);
        
        // Datos de Catálogo
        const codigoBarras = concepto.NoIdentificacion || ''; 
        const claveSAT = concepto.ClaveProdServ || ''; 
        const claveUnidad = concepto.ClaveUnidad || ''; 
        const unidad = concepto.Unidad || ''; 
        const cantidadComprada = parseFloat(concepto.Cantidad || 1);

        // 🔥 EXTRACCIÓN SEGURA DE IMPUESTOS (IVA / IEPS) 🔥
        let impuestosAplicables = [];
        // Los "paracaídas": Si no hay nodo de impuestos, devuelve un objeto vacío en lugar de crashear
        const nodoImpuestos = concepto['cfdi:Impuestos'] || {};
        const nodoTraslados = nodoImpuestos['cfdi:Traslados'] || {};
        let listaTraslados = nodoTraslados['cfdi:Traslado'];
        
        if (listaTraslados) {
          if (!Array.isArray(listaTraslados)) listaTraslados = [listaTraslados];
          
          for (const traslado of listaTraslados) {
            // El SAT usa códigos: 002 = IVA, 003 = IEPS, 001 = ISR
            let nombreImpuesto = traslado.Impuesto;
            if (nombreImpuesto === '002') nombreImpuesto = 'IVA';
            if (nombreImpuesto === '003') nombreImpuesto = 'IEPS';
            
            // Calculamos el porcentaje (Ej. 0.160000 se vuelve 16%)
            let tasaPorcentaje = traslado.TasaOCuota ? (parseFloat(traslado.TasaOCuota) * 100).toFixed(0) + '%' : 'Exento/Tasa 0';

            impuestosAplicables.push({
              tipo: nombreImpuesto,
              tasa: tasaPorcentaje,
              importeMxn: parseFloat(traslado.Importe || 0)
            });
          }
        }

        if (!productos[descripcion]) {
          productos[descripcion] = {
            codigoBarras: codigoBarras,
            claveSAT: claveSAT,
            claveUnidad: claveUnidad,
            unidad: unidad,
            impuestosBase: impuestosAplicables, // <-- Guardamos la regla de impuestos del producto
            precioActual: precioUnitario, 
            precioMinimo: precioUnitario, 
            precioMaximo: precioUnitario,
            historial: [{ fecha: fecha, precio: precioUnitario, cantidad: cantidadComprada, folio: folioStr, impuestosPagados: impuestosAplicables }]
          };
        } else {
          const prod = productos[descripcion];
          
          // Rellenar datos faltantes si la nueva factura sí los trae
          if (codigoBarras && !prod.codigoBarras) prod.codigoBarras = codigoBarras;
          if (claveSAT && !prod.claveSAT) prod.claveSAT = claveSAT;
          if (claveUnidad && !prod.claveUnidad) prod.claveUnidad = claveUnidad;
          if (unidad && !prod.unidad) prod.unidad = unidad;
          // Actualizamos los impuestos base por si cambiaron de ley
          if (impuestosAplicables.length > 0) prod.impuestosBase = impuestosAplicables;

          const ultimoRegistro = prod.historial[prod.historial.length - 1];
          if (ultimoRegistro.precio !== precioUnitario || ultimoRegistro.fecha !== fecha) {
            prod.historial.push({ 
              fecha: fecha, 
              precio: precioUnitario, 
              cantidad: cantidadComprada, 
              folio: folioStr,
              impuestosPagados: impuestosAplicables // <-- Anotamos los impuestos de ESTA compra en específico
            });
            prod.precioActual = precioUnitario;
            if (precioUnitario < prod.precioMinimo) prod.precioMinimo = precioUnitario;
            if (precioUnitario > prod.precioMaximo) prod.precioMaximo = precioUnitario;
          }
        }
      }
      await fsExtra.writeJson(rutaProductos, productos, { spaces: 2 });
    } catch (errorParseo) {
      console.log("Error al extraer catálogo de productos del XML:", errorParseo);
    }

    // --- C) ACTUALIZAR BITÁCORA DE EVENTOS ---
    const rutaBitacora = path.join(rutaProveedor, 'bitacora_eventos.json');
    let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];

    if (!bitacora.some(b => b.descripcion.includes(folioStr) && b.tipo === 'IMPORTACIÓN')) {
      bitacora.unshift({ 
        fechaHora: new Date().toLocaleString('es-MX'), tipo: 'IMPORTACIÓN', icono: '📥',
        descripcion: `Se importó la factura ${folioStr} por un monto de $${formatearDinero(monto)}`
      });
      if (bitacora.length > 100) bitacora.length = 100; 
      await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });
    }

    // --- D) RECALCULAR DEUDA GLOBAL Y ACTUALIZAR PERFIL ---
    const rutaPerfil = path.join(rutaProveedor, 'perfil.json');
    if (await fsExtra.pathExists(rutaPerfil)) {
      let perfil = await fsExtra.readJson(rutaPerfil);
      
      const deudaReal = facturas
        .filter(f => f.estado !== 'Pagada' && f.estado !== 'Esperando REP')
        .reduce((sum, f) => {
          const descuentoNC = f.notaCredito ? parseFloat(f.notaCredito.monto) : 0;
          return sum + Math.max(0, f.monto - descuentoNC);
        }, 0);
        
      perfil.metricas.deudaActual = deudaReal;
      await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });
    }

  } catch (error) {
    console.error("Error al actualizar libros del proveedor:", error);
  }
}
// Helper interno para la bitácora
function formatearDinero(cantidad) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(cantidad);
}


// 1. Herramienta para que el Frontend lea la configuración rápido
ipcMain.handle('obtener-config', () => {
  return store.get('userConfig') || {};
});

// 2. Herramienta para detectar Duplicados
ipcMain.handle('verificar-duplicado', async (event, params) => {
  const config = store.get('userConfig');
  if (!config || !config.rutaDestino) return false;

  const { tipoOperacion, contraparte, anio, mes, dia, folioSeguro } = params;
  const subcarpeta = tipoOperacion === 'Venta' ? 'Clientes' : 'Proveedores';
  const nombreSeguro = contraparte.replace(/[<>:"/\\|?*]+/g, '').trim();
  const nombreArchivoBase = `${nombreSeguro}_${folioSeguro}`;

  const rutaXml = path.join(config.rutaDestino, subcarpeta, nombreSeguro, anio, mes, dia, `${nombreArchivoBase}.xml`);
  return await fsExtra.pathExists(rutaXml);
});

// 3. El Motor Principal (Con rastreador de nuevos perfiles y CREACIÓN DE LIBROS)
ipcMain.handle('procesar-facturas', async (event, facturas) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

    let procesadas = 0;
    let nuevosPerfiles = []; 

    for (const fac of facturas) {
      if (fac.estado === 'error' || fac.estado === 'duplicado') continue;

      const nombreSeguro = fac.contraparte.replace(/[<>:"/\\|?*]+/g, '').trim();
      let anio = '2025', mes = '01', dia = '01';

      if (fac.fecha) {
        const partes = fac.fecha.split('T')[0].split('-');
        if (partes.length === 3) { anio = partes[0]; mes = partes[1]; dia = partes[2]; }
      }

      const subcarpeta = fac.tipoOperacion === 'Venta' ? 'Clientes' : 'Proveedores';
      const rutaRaizProveedor = path.join(config.rutaDestino, subcarpeta, nombreSeguro);
      await fsExtra.ensureDir(rutaRaizProveedor);

      const rutaPerfilJson = path.join(rutaRaizProveedor, 'perfil.json');
      let perfil = {};

      if (await fsExtra.pathExists(rutaPerfilJson)) {
        perfil = await fsExtra.readJson(rutaPerfilJson);
        perfil.metricas.comprasHistoricas = (perfil.metricas.comprasHistoricas || 0) + fac.total;
        perfil.metricas.ultimaCompra = fac.fecha;
        perfil.metricas.totalFacturas = (perfil.metricas.totalFacturas || 0) + 1;
      } else {
        perfil = {
          id: Date.now().toString(), nombre: fac.contraparte, rfc: fac.rfcContraparte,
          tipo: subcarpeta, tipoPago: 'contado', logo: '',
          contactos: [{ id: 1, rol: 'Vendedor / Ejecutivo', nombre: '', telefono: '', correo: '' }],
          cuentasBancarias: [{ id: 1, banco: '', cuenta: '', clabe: '' }], notasGenerales: '',
          metricas: { comprasHistoricas: fac.total, ultimaCompra: fac.fecha, totalFacturas: 1, deudaActual: 0, limiteCredito: 0 },
          fechaRegistro: new Date().toISOString()
        };
        nuevosPerfiles.push({ nombre: fac.contraparte, tipo: subcarpeta });
      }
      
      await fsExtra.writeJson(rutaPerfilJson, perfil, { spaces: 2 });

      const rutaFinalArchivos = path.join(rutaRaizProveedor, anio, mes, dia);
      await fsExtra.ensureDir(rutaFinalArchivos);

      const folioSeguro = fac.folio.replace(/[<>:"/\\|?*]+/g, '_');
      const nombreArchivoBase = `${nombreSeguro}_${folioSeguro}`;
      const nombreArchivoXml = `${nombreArchivoBase}.xml`;
      const rutaCompletaXml = path.join(rutaFinalArchivos, nombreArchivoXml);

      // --- AQUÍ CONECTAMOS LA MAGIA ---
      if (fac.xmlData) {
        fs.writeFileSync(rutaCompletaXml, Buffer.from(fac.xmlData)); 
        // Generamos los JSON ligeros analizando el archivo que acabamos de guardar
        await actualizarLibrosProveedor(rutaRaizProveedor, rutaCompletaXml, nombreArchivoXml);
      }
      
      if (fac.pdfData) {
        fs.writeFileSync(path.join(rutaFinalArchivos, `${nombreArchivoBase}.pdf`), Buffer.from(fac.pdfData));
      }

      procesadas++;
    }
    
    return { success: true, cantidad: procesadas, nuevos: nuevosPerfiles };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// --- MOTOR PARA LEER EL DIRECTORIO DE PROVEEDORES ---
ipcMain.handle('obtener-proveedores', async () => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return [];

    const rutaProveedores = path.join(config.rutaDestino, 'Proveedores');
    if (!(await fsExtra.pathExists(rutaProveedores))) return [];

    const carpetas = await fsExtra.readdir(rutaProveedores);
    const listaProveedores = [];

    for (const carpeta of carpetas) {
      const rutaPerfil = path.join(rutaProveedores, carpeta, 'perfil.json');
      
      if (await fsExtra.pathExists(rutaPerfil)) {
        const perfil = await fsExtra.readJson(rutaPerfil);
        
        if (perfil.logo && await fsExtra.pathExists(perfil.logo)) {
          const base64Data = fs.readFileSync(perfil.logo, { encoding: 'base64' });
          const ext = path.extname(perfil.logo).replace('.', '') || 'png';
          perfil.logo = `data:image/${ext};base64,${base64Data}`;
        } else {
          perfil.logo = null; 
        }

        listaProveedores.push(perfil);
      }
    }

    return listaProveedores;
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return [];
  }
});

// --- MOTOR PARA LEER GRUPOS EXISTENTES ---
ipcMain.handle('obtener-grupos', async () => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return [];
    
    const rutaProveedores = path.join(config.rutaDestino, 'Proveedores');
    if (!(await fsExtra.pathExists(rutaProveedores))) return [];

    const carpetas = await fsExtra.readdir(rutaProveedores);
    const gruposSet = new Set();

    for (const carpeta of carpetas) {
      const rutaPerfil = path.join(rutaProveedores, carpeta, 'perfil.json');
      if (await fsExtra.pathExists(rutaPerfil)) {
        const perfil = await fsExtra.readJson(rutaPerfil);
        if (perfil.grupo && perfil.grupo.trim() !== '') {
          gruposSet.add(perfil.grupo.trim());
        }
      }
    }
    return Array.from(gruposSet);
  } catch (error) {
    return [];
  }
});

// --- MOTOR PARA GUARDAR / EDITAR PROVEEDOR MANUALMENTE ---
ipcMain.handle('guardar-proveedor-manual', async (event, datosProveedor) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino en Ajustes.' };

    const nombreSeguro = datosProveedor.nombreComercial.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaRaizProveedor = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);
    
    await fsExtra.ensureDir(rutaRaizProveedor);

    const rutaPerfilJson = path.join(rutaRaizProveedor, 'perfil.json');
    let perfilFinal = {};

    if (await fsExtra.pathExists(rutaPerfilJson)) {
      const perfilExistente = await fsExtra.readJson(rutaPerfilJson);
      perfilFinal = { ...perfilExistente, ...datosProveedor }; 
    } else {
      perfilFinal = {
        ...datosProveedor,
        id: Date.now().toString(),
        tipo: 'Proveedores',
        fechaRegistro: new Date().toISOString(),
        metricas: { comprasHistoricas: 0, ultimaCompra: null, totalFacturas: 0, deudaActual: 0 }
      };
    }

    if (datosProveedor.logoBase64) {
      const ext = datosProveedor.logoExt || '.png';
      const rutaDestinoLogo = path.join(rutaRaizProveedor, `logo${ext}`);
      const base64Puro = datosProveedor.logoBase64.replace(/^data:image\/\w+;base64,/, "");
      
      fs.writeFileSync(rutaDestinoLogo, base64Puro, 'base64');
      perfilFinal.logo = rutaDestinoLogo; 
      
    } else if (datosProveedor.logoPath && !datosProveedor.logoPath.startsWith('http') && !datosProveedor.logoPath.startsWith('data:image')) { 
      const ext = path.extname(datosProveedor.logoPath);
      const rutaDestinoLogo = path.join(rutaRaizProveedor, `logo${ext}`);
      await fsExtra.copy(datosProveedor.logoPath, rutaDestinoLogo);
      perfilFinal.logo = rutaDestinoLogo; 
    }

    await fsExtra.writeJson(rutaPerfilJson, perfilFinal, { spaces: 2 });

    return { success: true, ruta: rutaRaizProveedor };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// --- MOTOR PARA LEER LAS FACTURAS DE UN PROVEEDOR (AHORA SÍ LEE EL JSON OPTIMIZADO) ---
ipcMain.handle('obtener-facturas-proveedor', async (event, nombreProveedor) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return [];

    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaFacturas = path.join(config.rutaDestino, 'Proveedores', nombreSeguro, 'registro_facturas.json');
    
    if (await fsExtra.pathExists(rutaFacturas)) {
      let facturas = await fsExtra.readJson(rutaFacturas);
      facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return facturas;
    }
    return [];
  } catch (error) {
    console.error("Error al leer facturas desde JSON:", error);
    return [];
  }
});

// --- MOTOR PARA SINCRONIZAR LA BÓVEDA (RECONSTRUIR LIBROS MAYORES) ---
ipcMain.handle('sincronizar-boveda', async (event) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

    const rutaProveedores = path.join(config.rutaDestino, 'Proveedores');
    if (!(await fsExtra.pathExists(rutaProveedores))) return { success: true, cantidad: 0 };

    const proveedores = await fsExtra.readdir(rutaProveedores);
    let facturasProcesadas = 0;

    for (const prov of proveedores) {
      const rutaProv = path.join(rutaProveedores, prov);
      const stat = await fsExtra.stat(rutaProv);
      if (!stat.isDirectory()) continue;

      // 1. Limpiamos los libros viejos para evitar duplicados en la reconstrucción
      await fsExtra.remove(path.join(rutaProv, 'registro_facturas.json'));
      await fsExtra.remove(path.join(rutaProv, 'registro_productos.json'));
      await fsExtra.remove(path.join(rutaProv, 'bitacora_eventos.json')); // <-- Agregado

      // 2. Función recursiva para buscar y procesar todos los XMLs dentro de las carpetas
      async function buscarXMLs(directorio) {
        const elementos = await fsExtra.readdir(directorio);
        for (const item of elementos) {
          const rutaItem = path.join(directorio, item);
          const itemStat = await fsExtra.stat(rutaItem);
          
          if (itemStat.isDirectory()) {
            await buscarXMLs(rutaItem); 
          } else if (item.endsWith('.xml')) {
            await actualizarLibrosProveedor(rutaProv, rutaItem, item);
            facturasProcesadas++;
          }
        }
      }

      // 3. Iniciamos la búsqueda solo en las carpetas de años (ej. "2025", "2026")
      const carpetasRaiz = await fsExtra.readdir(rutaProv);
      for (const carpeta of carpetasRaiz) {
        const rutaCarpeta = path.join(rutaProv, carpeta);
        const carpetaStat = await fsExtra.stat(rutaCarpeta);
        if (carpetaStat.isDirectory()) {
          await buscarXMLs(rutaCarpeta);
        }
      }
    }

    return { success: true, cantidad: facturasProcesadas };
  } catch (error) {
    console.error("Error en sincronización:", error);
    return { success: false, error: error.message };
  }
});

// --- MOTOR PARA SINCRONIZAR UN SOLO PROVEEDOR (RÁPIDO) ---
ipcMain.handle('sincronizar-proveedor', async (event, nombreProveedor) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);
    
    if (!(await fsExtra.pathExists(rutaProv))) return { success: false, error: 'Carpeta no encontrada.' };

    let facturasProcesadas = 0;

    // 1. Limpiamos los libros viejos SOLO de este proveedor
    await fsExtra.remove(path.join(rutaProv, 'registro_facturas.json'));
    await fsExtra.remove(path.join(rutaProv, 'registro_productos.json'));
    await fsExtra.remove(path.join(rutaProv, 'bitacora_eventos.json'));

    // 2. Función recursiva
    async function buscarXMLs(directorio) {
      const elementos = await fsExtra.readdir(directorio);
      for (const item of elementos) {
        const rutaItem = path.join(directorio, item);
        const itemStat = await fsExtra.stat(rutaItem);
        
        if (itemStat.isDirectory()) {
          await buscarXMLs(rutaItem); 
        } else if (item.endsWith('.xml')) {
          await actualizarLibrosProveedor(rutaProv, rutaItem, item);
          facturasProcesadas++;
        }
      }
    }

    // 3. Iniciamos la búsqueda
    const carpetasRaiz = await fsExtra.readdir(rutaProv);
    for (const carpeta of carpetasRaiz) {
      const rutaCarpeta = path.join(rutaProv, carpeta);
      const carpetaStat = await fsExtra.stat(rutaCarpeta);
      if (carpetaStat.isDirectory()) {
        await buscarXMLs(rutaCarpeta);
      }
    }

    return { success: true, cantidad: facturasProcesadas };
  } catch (error) {
    console.error("Error en sincronización individual:", error);
    return { success: false, error: error.message };
  }
});

// --- MOTOR PARA REGISTRAR UN PAGO Y SALDAR DEUDAS ---
// --- MOTOR PARA REGISTRAR UN PAGO Y SALDAR DEUDAS (CON UUID) ---
ipcMain.handle('registrar-pago', async (event, params) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

    const { nombreProveedor, facturasSeleccionadas, datosPago } = params;
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);
    
    if (!(await fsExtra.pathExists(rutaProv))) return { success: false, error: 'Proveedor no encontrado.' };

    let rutaComprobanteFisico = null;
    if (datosPago.comprobanteBase64) {
      const dirPagos = path.join(rutaProv, 'Pagos_Realizados');
      await fsExtra.ensureDir(dirPagos);
      const nombreArchivo = `Pago_${datosPago.metodo}_${(datosPago.referencia || 'SinRef').replace(/[^a-zA-Z0-9-]/g, '')}_${Date.now()}${datosPago.comprobanteExt}`;
      rutaComprobanteFisico = path.join(dirPagos, nombreArchivo);
      
      const base64Puro = datosPago.comprobanteBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
      fs.writeFileSync(rutaComprobanteFisico, base64Puro, 'base64');
    }

    const rutaFacturas = path.join(rutaProv, 'registro_facturas.json');
    let facturas = await fsExtra.pathExists(rutaFacturas) ? await fsExtra.readJson(rutaFacturas) : [];
    let montoSaldado = 0;
    let uuidsSaldados = []; 

    facturas = facturas.map(fac => {
      if (facturasSeleccionadas.includes(fac.id)) {
        montoSaldado += fac.monto;
        uuidsSaldados.push(fac.id); 
        
        fac.estado = fac.metodoPago === 'PPD' ? 'Esperando REP' : 'Pagada';
        
        // ¡NUEVO! Le inyectamos la ruta del PDF a la factura para que el "Ojito" sepa qué abrir
        if (rutaComprobanteFisico) {
          fac.comprobantePath = rutaComprobanteFisico;
        }
      }
      return fac;
    });
    await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

    const rutaPerfil = path.join(rutaProv, 'perfil.json');
    let perfil = await fsExtra.readJson(rutaPerfil);
    perfil.metricas.deudaActual = Math.max(0, (perfil.metricas.deudaActual || 0) - montoSaldado);
    await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });

    const rutaPagos = path.join(rutaProv, 'registro_pagos.json');
    let historialPagos = await fsExtra.pathExists(rutaPagos) ? await fsExtra.readJson(rutaPagos) : [];
    historialPagos.unshift({
      idPago: Date.now().toString(),
      fecha: new Date().toISOString(),
      monto: montoSaldado,
      metodo: datosPago.metodo,
      referencia: datosPago.referencia || 'Sin Referencia',
      facturasSaldadas: uuidsSaldados, // ¡AQUÍ SE GUARDAN LOS UUIDs DEL SAT!
      comprobantePath: rutaComprobanteFisico
    });
    await fsExtra.writeJson(rutaPagos, historialPagos, { spaces: 2 });

    const rutaBitacora = path.join(rutaProv, 'bitacora_eventos.json');
    let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
    bitacora.unshift({ 
      fechaHora: new Date().toLocaleString('es-MX'),
      tipo: 'PAGO',
      icono: '💸',
      descripcion: `Pago de $${new Intl.NumberFormat('es-MX').format(montoSaldado)} por ${datosPago.metodo} (${uuidsSaldados.length} facturas). Ref: ${datosPago.referencia || 'N/A'}`
    });
    if (bitacora.length > 100) bitacora.length = 100;
    await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });

    return { success: true, montoSaldado };
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return { success: false, error: error.message };
  }
});

// --- MOTOR PARA LEER LA BITÁCORA DE EVENTOS ---
ipcMain.handle('obtener-bitacora', async (event, nombreProveedor) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return [];
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);
    const rutaBitacora = path.join(rutaProv, 'bitacora_eventos.json');

    if (await fsExtra.pathExists(rutaBitacora)) {
      return await fsExtra.readJson(rutaBitacora);
    }
    return [];
  } catch (error) {
    console.error("Error al leer bitácora:", error);
    return [];
  }
});

// =====================================================================
// SUPERPODER 1: ABRIR CUALQUIER PDF O IMAGEN EN WINDOWS
// =====================================================================
const { shell } = require('electron'); // Herramienta del sistema operativo

ipcMain.handle('abrir-archivo', async (event, rutaAbsoluta) => {
  try {
    if (await fsExtra.pathExists(rutaAbsoluta)) {
      await shell.openPath(rutaAbsoluta); // Abre el PDF con el programa predeterminado de Windows
      return { success: true };
    }
    return { success: false, error: 'El archivo físico ya no se encuentra en la bóveda.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =====================================================================
// SUPERPODER 2: ADJUNTAR DOCUMENTOS REZAGADOS (REP O COMPROBANTES)
// =====================================================================
ipcMain.handle('adjuntar-documento', async (event, params) => {
  try {
    const config = store.get('userConfig');
    const { nombreProveedor, idFactura, tipoDoc, archivoBase64, extension } = params;
    
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);

    // Creamos la carpeta (Si es REP va a una especial, si es COMP va a pagos)
    const nombreCarpeta = tipoDoc === 'REP' ? 'Comprobantes_REP' : 'Pagos_Realizados';
    const dirDestino = path.join(rutaProv, nombreCarpeta);
    await fsExtra.ensureDir(dirDestino);

    // Guardamos el archivo físico
    const nombreArchivo = `${tipoDoc}_${idFactura}_${Date.now()}${extension}`;
    const rutaFinal = path.join(dirDestino, nombreArchivo);
    const base64Puro = archivoBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
    require('fs').writeFileSync(rutaFinal, base64Puro, 'base64');

    // Actualizamos la factura específica en el JSON
    const rutaFacturas = path.join(rutaProv, 'registro_facturas.json');
    let facturas = await fsExtra.readJson(rutaFacturas);
    let folioFac = '';

    facturas = facturas.map(fac => {
      if (fac.id === idFactura) {
        folioFac = fac.folio;
        if (tipoDoc === 'REP') {
          fac.repPath = rutaFinal;
          fac.estado = 'Pagada'; // ¡Si ya entregó el REP, la cuenta por fin está saldada al 100%!
        } else if (tipoDoc === 'COMP') {
          fac.comprobantePath = rutaFinal;
        }
      }
      return fac;
    });
    await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

    // Anotamos en la bitácora
    const rutaBitacora = path.join(rutaProv, 'bitacora_eventos.json');
    let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
    bitacora.unshift({
      fechaHora: new Date().toLocaleString('es-MX'),
      tipo: 'DOCUMENTO',
      icono: '📎',
      descripcion: `Se adjuntó el documento [${tipoDoc}] a la factura ${folioFac}`
    });
    await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =====================================================================
// SUPERPODER 3: REGISTRAR NOTAS DE CRÉDITO Y DESCONTAR DEUDAS
// =====================================================================
ipcMain.handle('registrar-nota-credito', async (event, params) => {
  try {
    const config = store.get('userConfig');
    const { nombreProveedor, idFactura, montoNC, archivoBase64, extension } = params;
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);

    let rutaFinal = null;
    if (archivoBase64) {
      const dirDestino = path.join(rutaProv, 'Notas_Credito');
      await fsExtra.ensureDir(dirDestino);
      const nombreArchivo = `NC_${idFactura}_${Date.now()}${extension}`;
      rutaFinal = path.join(dirDestino, nombreArchivo);
      const base64Puro = archivoBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
      require('fs').writeFileSync(rutaFinal, base64Puro, 'base64');
    }

    // Le agregamos la Nota de Crédito a la factura
    const rutaFacturas = path.join(rutaProv, 'registro_facturas.json');
    let facturas = await fsExtra.readJson(rutaFacturas);
    let folioFac = '';

    facturas = facturas.map(fac => {
      if (fac.id === idFactura) {
        folioFac = fac.folio;
        fac.notaCredito = {
          monto: parseFloat(montoNC),
          path: rutaFinal,
          fecha: new Date().toISOString()
        };
      }
      return fac;
    });
    await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

    // ¡DESCONTAMOS EL DINERO DE LA DEUDA GLOBAL DEL PROVEEDOR!
    const rutaPerfil = path.join(rutaProv, 'perfil.json');
    let perfil = await fsExtra.readJson(rutaPerfil);
    perfil.metricas.deudaActual = Math.max(0, (perfil.metricas.deudaActual || 0) - parseFloat(montoNC));
    await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });

    // Anotamos en la bitácora
    const rutaBitacora = path.join(rutaProv, 'bitacora_eventos.json');
    let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
    bitacora.unshift({
      fechaHora: new Date().toLocaleString('es-MX'),
      tipo: 'NOTA DE CRÉDITO',
      icono: '🏷️',
      descripcion: `Se aplicó Nota de Crédito por $${new Intl.NumberFormat('es-MX').format(montoNC)} a la factura ${folioFac}`
    });
    await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =====================================================================
// EXTRAER CATÁLOGO Y PRECIOS DE PRODUCTOS DEL PROVEEDOR
// =====================================================================
ipcMain.handle('obtener-productos-proveedor', async (event, nombreProveedor) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return {};
    
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProductos = path.join(config.rutaDestino, 'Proveedores', nombreSeguro, 'registro_productos.json');

    if (await fsExtra.pathExists(rutaProductos)) {
      return await fsExtra.readJson(rutaProductos);
    }
    return {};
  } catch (error) {
    console.error("Error al leer productos:", error);
    return {};
  }
});

// =====================================================================
// MOTOR DE CORREOS (IMAP): GUARDAR CONFIGURACIÓN Y PROBAR CONEXIÓN
// =====================================================================

ipcMain.handle('obtener-config-imap', async () => {
  return store.get('imapConfig') || { host: 'imap.gmail.com', port: 993, user: '', pass: '' };
});

ipcMain.handle('guardar-config-imap', async (event, config) => {
  try {
    store.set('imapConfig', config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('probar-conexion-imap', async (event, config) => {
  try {
    // Limpiamos la contraseña por si copiaste los espacios
    const passLimpia = config.pass.replace(/\s+/g, '');

    const client = new ImapFlow({
      host: config.host,
      port: parseInt(config.port),
      secure: true,
      tls: {
        rejectUnauthorized: false // Evita que tu Antivirus/Windows bloquee la conexión
      },
      auth: {
        user: config.user,
        pass: passLimpia
      },
      logger: false 
    });

    // Le ponemos un límite de tiempo (Timeout) de 10 segundos para que nunca se quede girando infinito
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu internet o firewall.')), 10000))
    ]);

    await client.logout(); 
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// =====================================================================
// MOTOR IMAP 1: ESCANEAR CORREOS CON CACHÉ PERMANENTE EN DISCO
// =====================================================================
ipcMain.handle('escanear-correos', async (event, limite = 10, rutaCarpeta = 'INBOX', forzarRecarga = false) => {
  const config = store.get('imapConfig');
  if (!config || !config.user) return { success: false, error: 'No hay configuración IMAP.' };

  // 1. RUTA DEL CACHÉ EN EL DISCO DURO (Memoria a largo plazo)
  const nombreLimpio = rutaCarpeta.replace(/[^a-zA-Z0-9]/g, '_');
  const carpetaCache = path.join(app.getPath('userData'), 'Cache_ERP');
  const archivoCache = path.join(carpetaCache, `lista_${nombreLimpio}.json`);
  
  await fsExtra.ensureDir(carpetaCache);

  // 2. SI NO ESTAMOS FORZANDO RECARGA, LEEMOS EL DISCO DURO AL INSTANTE
  if (!forzarRecarga) {
    try {
      if (await fsExtra.pathExists(archivoCache)) {
        const correosGuardados = await fsExtra.readJson(archivoCache);
        // Si hay datos, los devolvemos sin conectarnos a internet
        if (correosGuardados && correosGuardados.length > 0) {
          return { success: true, correos: correosGuardados };
        }
      }
    } catch (e) { console.log('No hay caché o hubo un error al leerlo.'); }
  }

  // 3. SI FORZAMOS (BOTÓN ACTUALIZAR) O ES LA PRIMERA VEZ, VAMOS A GMAIL
  const passLimpia = config.pass.replace(/\s+/g, '');
  const client = new ImapFlow({
    host: config.host,
    port: parseInt(config.port),
    secure: true,
    tls: { rejectUnauthorized: false },
    auth: { user: config.user, pass: passLimpia },
    logger: false 
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock(rutaCarpeta);
    const status = await client.mailboxOpen(rutaCarpeta);
    const totalMessages = status.exists;
    
    if (totalMessages === 0) {
      lock.release(); await client.logout();
      return { success: true, correos: [] };
    }

    const start = Math.max(1, totalMessages - limite + 1);
    const seq = `${start}:*`;
    const correosReales = [];
    
    for await (let message of client.fetch(seq, { source: true })) {
      const parsed = await simpleParser(message.source);
      let tieneXml = false; let tienePdf = false;

      if (parsed.attachments && parsed.attachments.length > 0) {
        parsed.attachments.forEach(att => {
          const ext = att.filename ? att.filename.toLowerCase() : '';
          if (ext.endsWith('.xml')) tieneXml = true;
          if (ext.endsWith('.pdf')) tienePdf = true;
        });
      }

      correosReales.push({
        id: message.uid,
        remitente: parsed.from?.value[0]?.address || 'Desconocido',
        empresa: parsed.from?.value[0]?.name || parsed.from?.value[0]?.address,
        asunto: parsed.subject || 'Sin Asunto',
        mensaje: parsed.text ? parsed.text.substring(0, 120) + '...' : 'Sin vista previa.',
        fecha: parsed.date ? parsed.date.toLocaleDateString() : 'Hoy',
        tieneXml, tienePdf, total: 'Por calcular'
      });
    }

    lock.release();
    await client.logout();
    const correosFinales = correosReales.reverse();

    // 4. GUARDAMOS LO NUEVO EN EL DISCO DURO PARA MAÑANA
    await fsExtra.writeJson(archivoCache, correosFinales);

    return { success: true, correos: correosFinales };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =====================================================================
// MOTOR IMAP 2: DESCARGA PEREZOSA (CACHÉ DE ARCHIVOS PERMANENTE)
// =====================================================================
ipcMain.handle('descargar-adjuntos-correo', async (event, uid, rutaCarpeta = 'INBOX') => {
  try {
    const config = store.get('imapConfig');
    if (!config || !config.user) return { success: false, error: 'No hay configuración IMAP.' };

    // 🛡️ EL ARREGLO: Combinamos el nombre de la carpeta con el UID para que sea 100% único
    const nombreCarpetaLimpio = rutaCarpeta.replace(/[^a-zA-Z0-9]/g, '_');
    const carpetaCacheArchivos = path.join(app.getPath('userData'), 'Cache_Documentos', `${nombreCarpetaLimpio}_${uid}`);
    
    // MAGIA: Si la carpeta ya existe, LEEMOS EL DISCO DURO DIRECTO (Modo Offline/Ultra Rápido)
    if (await fsExtra.pathExists(carpetaCacheArchivos)) {
      const archivosGuardados = await fsExtra.readdir(carpetaCacheArchivos);
      if (archivosGuardados.length > 0) {
        let rutasAdjuntos = []; let datosXml = null; let pdfSeguro = null;

        for (const archivo of archivosGuardados) {
          const ext = archivo.toLowerCase();
          const rutaArchivo = path.join(carpetaCacheArchivos, archivo);
          rutasAdjuntos.push(rutaArchivo);
          const contenido = await fsExtra.readFile(rutaArchivo);

          if (ext.endsWith('.pdf')) {
            pdfSeguro = `data:application/pdf;base64,${contenido.toString('base64')}`;
          }
          if (ext.endsWith('.xml')) {
            try {
              const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
              const xmlParseado = await parser.parseStringPromise(contenido.toString('utf-8'));
              const comprobante = xmlParseado['cfdi:Comprobante'] || {};
              const emisor = comprobante['cfdi:Emisor'] || {};
              datosXml = {
                rfcEmisor: emisor.Rfc || 'Sin RFC', nombreEmisor: emisor.Nombre || 'Sin Nombre',
                total: comprobante.Total || '0.00', folio: comprobante.Folio || 'Sin Folio', moneda: comprobante.Moneda || 'MXN'
              };
            } catch(e) {}
          }
        }
        return { success: true, archivos: rutasAdjuntos, xmlInfo: datosXml, pdfData: pdfSeguro };
      }
    }

    // 2. SI ES LA PRIMERA VEZ QUE LO ABRES, VAMOS A GMAIL
    await fsExtra.ensureDir(carpetaCacheArchivos);

    const passLimpia = config.pass.replace(/\s+/g, '');
    const client = new ImapFlow({
      host: config.host, port: parseInt(config.port), secure: true,
      tls: { rejectUnauthorized: false }, auth: { user: config.user, pass: passLimpia }, logger: false 
    });

    await client.connect();
    let lock = await client.getMailboxLock(rutaCarpeta);
    await client.mailboxOpen(rutaCarpeta); 

    const seq = String(uid);
    let message = await client.fetchOne(seq, { source: true }, { uid: true });
    
    if (!message) {
      lock.release(); await client.logout();
      return { success: false, error: `Correo no encontrado en la nube.` };
    }

    const parsed = await simpleParser(message.source);
    let rutasAdjuntos = []; let datosXml = null; let pdfSeguro = null;

    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        if (!att.filename) continue;
        const ext = att.filename.toLowerCase();
        const rutaArchivo = path.join(carpetaCacheArchivos, att.filename);
        
        try { await fsExtra.writeFile(rutaArchivo, att.content); } catch(e){}
        rutasAdjuntos.push(rutaArchivo);

        if (ext.endsWith('.pdf')) pdfSeguro = `data:application/pdf;base64,${att.content.toString('base64')}`;
        if (ext.endsWith('.xml')) {
          try {
            const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
            const xmlParseado = await parser.parseStringPromise(att.content.toString('utf-8'));
            const comprobante = xmlParseado['cfdi:Comprobante'] || {};
            const emisor = comprobante['cfdi:Emisor'] || {};
            datosXml = {
              rfcEmisor: emisor.Rfc || '', nombreEmisor: emisor.Nombre || '',
              total: comprobante.Total || '0.00', folio: comprobante.Folio || '', moneda: comprobante.Moneda || 'MXN'
            };
          } catch (e) {}
        }
      }
    }

    lock.release();
    await client.logout();
    return { success: true, archivos: rutasAdjuntos, xmlInfo: datosXml, pdfData: pdfSeguro };

  } catch (error) {
    return { success: false, error: error.message }; 
  }
});
// =====================================================================
// MOTOR IMAP 3: GESTOR MULTI-CUENTAS
// =====================================================================
ipcMain.handle('obtener-cuentas-imap', () => {
  return { 
    cuentas: store.get('listaCuentasImap') || [], 
    cuentaActiva: store.get('imapConfig') || null 
  };
});

ipcMain.handle('guardar-cuenta-imap', async (event, config) => {
  let cuentas = store.get('listaCuentasImap') || [];
  // Evitamos duplicados (si ya existe ese correo, lo actualizamos)
  cuentas = cuentas.filter(c => c.user !== config.user);
  cuentas.push(config);
  store.set('listaCuentasImap', cuentas);
  // Al agregar una nueva, la ponemos como activa por defecto
  store.set('imapConfig', config); 
  return { success: true };
});

ipcMain.handle('eliminar-cuenta-imap', (event, email) => {
  let cuentas = store.get('listaCuentasImap') || [];
  cuentas = cuentas.filter(c => c.user !== email);
  store.set('listaCuentasImap', cuentas);
  
  // Si borramos la cuenta que estaba activa, cambiamos a otra o limpiamos
  const activa = store.get('imapConfig');
  if (activa && activa.user === email) {
    if (cuentas.length > 0) store.set('imapConfig', cuentas[0]);
    else store.delete('imapConfig');
  }
  return { success: true };
});

ipcMain.handle('cambiar-cuenta-activa', (event, email) => {
  const cuentas = store.get('listaCuentasImap') || [];
  const seleccionada = cuentas.find(c => c.user === email);
  if (seleccionada) {
    store.set('imapConfig', seleccionada);
    return { success: true };
  }
  return { success: false, error: 'Cuenta no encontrada' };
});


// =====================================================================
// MOTOR IMAP: OBTENER LISTA DE CARPETAS (CON CACHÉ PERMANENTE)
// =====================================================================
ipcMain.handle('obtener-carpetas-imap', async (event, forzarRecarga = false) => {
  const config = store.get('imapConfig');
  if (!config || !config.user) return { success: false, error: 'No hay configuración' };

  // 1. RUTA DEL CACHÉ EN EL DISCO DURO
  const carpetaCache = path.join(app.getPath('userData'), 'Cache_ERP');
  const archivoCacheCarpetas = path.join(carpetaCache, `carpetas_${config.user.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  await fsExtra.ensureDir(carpetaCache);

  // 2. SI NO ESTAMOS FORZANDO, LEEMOS EL DISCO DURO AL INSTANTE
  if (!forzarRecarga) {
    try {
      if (await fsExtra.pathExists(archivoCacheCarpetas)) {
        const carpetasGuardadas = await fsExtra.readJson(archivoCacheCarpetas);
        if (carpetasGuardadas && carpetasGuardadas.length > 0) {
          return { success: true, carpetas: carpetasGuardadas };
        }
      }
    } catch (e) { console.log('Error al leer caché de carpetas.'); }
  }

  // 3. VAMOS A GOOGLE SOLO SI ES LA PRIMERA VEZ O SI PRESIONASTE "ACTUALIZAR"
  const passLimpia = config.pass.replace(/\s+/g, '');
  const client = new ImapFlow({
    host: config.host,
    port: parseInt(config.port),
    secure: true,
    tls: { rejectUnauthorized: false },
    auth: { user: config.user, pass: passLimpia },
    logger: false 
  });

  try {
    await client.connect();
    const listaCarpetas = await client.list();
    
    const carpetasLimpias = listaCarpetas.map(carpeta => ({
      nombre: carpeta.name,
      ruta: carpeta.path,
      esEspecial: carpeta.flags && (carpeta.flags.has('\\All') || carpeta.flags.has('\\Trash') || carpeta.flags.has('\\Sent'))
    }));

    await client.logout();

    // 4. GUARDAMOS LAS CARPETAS PARA LA PRÓXIMA VEZ
    await fsExtra.writeJson(archivoCacheCarpetas, carpetasLimpias);

    return { success: true, carpetas: carpetasLimpias };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// =====================================================================
// MOTOR ERP: GUARDAR FACTURAS DEL CORREO DIRECTO EN TU BÓVEDA
// =====================================================================
ipcMain.handle('guardar-factura-erp', async (event, datos) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) {
      return { success: false, error: 'No has configurado la carpeta principal en los Ajustes del programa.' };
    }

    const rfc = datos.xmlInfo.rfcEmisor || 'Desconocido';
    const nombreCrudo = datos.xmlInfo.nombreEmisor || 'Desconocido';
    const nombreSeguro = nombreCrudo.replace(/[<>:"/\\|?*]+/g, '').trim();
    
    const folioCrudo = datos.xmlInfo.folio || `SF_${Date.now()}`;
    const folioSeguro = folioCrudo.replace(/[<>:"/\\|?*]+/g, '_');

    const rutaRaizProveedor = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);
    
    // =====================================================
    // 🛡️ ESCUDO ANTI-DUPLICADOS: Revisamos si ya existe
    // =====================================================
    const rutaFacturasJSON = path.join(rutaRaizProveedor, 'registro_facturas.json');
    if (await fsExtra.pathExists(rutaFacturasJSON)) {
      const facturasDB = await fsExtra.readJson(rutaFacturasJSON);
      // Checamos si alguna factura ya tiene este folio exacto
      const yaExiste = facturasDB.some(f => f.folio.includes(folioCrudo));
      if (yaExiste) {
        return { success: false, error: 'DUPLICADO' }; // Cortamos el proceso aquí mismo
      }
    }
    // =====================================================

    await fsExtra.ensureDir(rutaRaizProveedor);

    // ... (El resto sigue exactamente igual)
    const hoy = new Date();
    const anio = hoy.getFullYear().toString();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');

    const rutaPerfilJson = path.join(rutaRaizProveedor, 'perfil.json');
    let perfil = {};

    if (await fsExtra.pathExists(rutaPerfilJson)) {
      perfil = await fsExtra.readJson(rutaPerfilJson);
      perfil.metricas.comprasHistoricas = (perfil.metricas.comprasHistoricas || 0) + parseFloat(datos.xmlInfo.total || 0);
      perfil.metricas.totalFacturas = (perfil.metricas.totalFacturas || 0) + 1;
      perfil.metricas.ultimaCompra = hoy.toISOString();
    } else {
      perfil = {
        id: Date.now().toString(), nombre: nombreCrudo, rfc: rfc,
        tipo: 'Proveedores', tipoPago: 'contado', logo: '',
        contactos: [{ id: 1, rol: 'Vendedor / Ejecutivo', nombre: '', telefono: '', correo: '' }],
        cuentasBancarias: [{ id: 1, banco: '', cuenta: '', clabe: '' }], notasGenerales: '',
        metricas: { comprasHistoricas: parseFloat(datos.xmlInfo.total || 0), ultimaCompra: hoy.toISOString(), totalFacturas: 1, deudaActual: 0, limiteCredito: 0 },
        fechaRegistro: hoy.toISOString()
      };
    }
    await fsExtra.writeJson(rutaPerfilJson, perfil, { spaces: 2 });

    const rutaFinalArchivos = path.join(rutaRaizProveedor, anio, mes, dia);
    await fsExtra.ensureDir(rutaFinalArchivos);

    const nombreArchivoBase = `${nombreSeguro}_${folioSeguro}`;
    let rutaXmlFinal = '';

    for (const rutaVieja of datos.archivos) {
      const extension = path.extname(rutaVieja).toLowerCase(); 
      const rutaNueva = path.join(rutaFinalArchivos, `${nombreArchivoBase}${extension}`);
      await fsExtra.copy(rutaVieja, rutaNueva, { overwrite: true });
      if (extension === '.xml') rutaXmlFinal = rutaNueva;
    }

    if (rutaXmlFinal) {
      await actualizarLibrosProveedor(rutaRaizProveedor, rutaXmlFinal, `${nombreArchivoBase}.xml`);
    }

    return { success: true, mensaje: `Factura ${folioSeguro} guardada e indexada en el ERP.` };

  } catch (error) {
    console.error("Error importando desde correo:", error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// GESTOR DEL CENTRO DE APPS (INSTALADOR DE MÓDULOS)
// =====================================================================

// 1. LEER APPS INSTALADAS
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

// 2. GUARDAR / INSTALAR NUEVA APP
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});