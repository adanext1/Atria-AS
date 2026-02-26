const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { shell } = require('electron');

module.exports = function setupPaymentsIPC(ipcMain, store) {
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

  // --- MOTOR PARA ABRIR EL ARCHIVO ORIGINAL DE LA FACTURA ---
  ipcMain.handle('abrir-factura-original', async (event, params) => {
    try {
      const config = store.get('userConfig');
      if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

      const { nombreProveedor, fecha, folio } = params;
      const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
      const folioSeguro = (folio || 'S_F').replace(/[<>:"/\\|?*]+/g, '_');

      let anio = '2025', mes = '01', dia = '01';
      if (fecha) {
        const partes = fecha.split('T')[0].split('-');
        if (partes.length === 3) {
          anio = partes[0]; mes = partes[1]; dia = partes[2];
        }
      }

      const dirArchivos = path.join(config.rutaDestino, 'Proveedores', nombreSeguro, anio, mes, dia);

      // Búsqueda inteligente: A veces el archivo se nombra sin 'Serie' (solo los números), pero el folio sí la tiene
      if (await fsExtra.pathExists(dirArchivos)) {
        const archivos = await fsExtra.readdir(dirArchivos);
        const fragmentoFolio = folioSeguro.includes('-') ? folioSeguro.split('-').pop() : folioSeguro;

        // Priorizamos PDFs primero, si no, intentamos con XML
        let archivoDeseado = archivos.find(a => a.toLowerCase().endsWith('.pdf') && a.includes(fragmentoFolio));
        if (!archivoDeseado) {
          archivoDeseado = archivos.find(a => a.toLowerCase().endsWith('.xml') && a.includes(fragmentoFolio));
        }

        if (archivoDeseado) {
          await shell.openPath(path.join(dirArchivos, archivoDeseado));
          return { success: true };
        }
      }

      return { success: false, error: 'No se encontró el archivo físico de la factura original en la bóveda.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

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
};
