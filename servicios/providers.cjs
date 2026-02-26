const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');

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

    // 🚀 NUEVO: Detectar el Tipo de Comprobante rápidamente usando RegEx
    const tipoComprobanteMatch = contenidoXml.match(/TipoDeComprobante=["']?([IEP])["']?/i);
    const tipoComprobante = tipoComprobanteMatch ? tipoComprobanteMatch[1].toUpperCase() : 'I';

    // LÓGICA ESPECIAL PARA COMPLEMENTOS DE PAGO
    if (tipoComprobante === 'P') {
      try {
        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const xmlParseado = await parser.parseStringPromise(contenidoXml);

        // Rastrear el pago dentro del laberinto del XML SAT
        const comprobante = xmlParseado['cfdi:Comprobante'] || {};
        const complemento = comprobante['cfdi:Complemento'] || {};

        let pagoElement = complemento['pago20:Pagos'] || complemento['pago10:Pagos'];
        let listaPagos = [];
        if (pagoElement) {
          let nPagos = pagoElement['pago20:Pago'] || pagoElement['pago10:Pago'];
          if (nPagos) listaPagos = Array.isArray(nPagos) ? nPagos : [nPagos];
        }

        let uuidsSaldados = [];
        let totalSaldado = 0;

        for (const pago of listaPagos) {
          let dctos = pago['pago20:DoctoRelacionado'] || pago['pago10:DoctoRelacionado'];
          if (!dctos) continue;
          const listaDctos = Array.isArray(dctos) ? dctos : [dctos];

          for (const doc of listaDctos) {
            const docUUID = (doc.IdDocumento || '').toUpperCase();
            const impPagado = parseFloat(doc.ImpPagado || doc.ImpSaldoAnt || 0); // Manejo de pagos totales
            if (docUUID) {
              uuidsSaldados.push(docUUID);
              totalSaldado += impPagado;
            }
          }
        }

        if (uuidsSaldados.length > 0) {
          // Actualizar status de las facturas originales a 'Pagada'
          const rutaFacturas = path.join(rutaProveedor, 'registro_facturas.json');
          let facturas = await fsExtra.pathExists(rutaFacturas) ? await fsExtra.readJson(rutaFacturas) : [];

          facturas = facturas.map(fac => {
            if (uuidsSaldados.includes(fac.id)) {
              fac.estado = 'Pagada';
              // Re-utilizamos el PDF físico de este complemento como REP visual para el usuario
              fac.repPath = rutaXml.replace('.xml', '.pdf');
            }
            return fac;
          });
          await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

          // Registrar el Pago en el Historial Mágico
          const rutaPagos = path.join(rutaProveedor, 'registro_pagos.json');
          let historialPagos = await fsExtra.pathExists(rutaPagos) ? await fsExtra.readJson(rutaPagos) : [];
          historialPagos.unshift({
            idPago: Date.now().toString(),
            fecha: new Date().toISOString(),
            monto: totalSaldado,
            metodo: 'Transferencia', // Valor neutral por defecto para autpagos del SAT
            referencia: `Auto-Pago XML (${folioStr})`,
            facturasSaldadas: uuidsSaldados,
            comprobantePath: rutaXml.replace('.xml', '.pdf')
          });
          await fsExtra.writeJson(rutaPagos, historialPagos, { spaces: 2 });

          // Registrar en la Bitácora para notificarle al usuario
          const rutaBitacora = path.join(rutaProveedor, 'bitacora_eventos.json');
          let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
          bitacora.unshift({
            fechaHora: new Date().toLocaleString('es-MX'),
            tipo: 'AUTO-PAGO',
            icono: '🤖',
            descripcion: `El sistema detectó y aplicó un Complemento de Pago (${folioStr}) por $${formatearDinero(totalSaldado)} saldando ${uuidsSaldados.length} facturas.`
          });
          if (bitacora.length > 100) bitacora.length = 100;
          await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });

          // Actualizar Deuda
          const rutaPerfil = path.join(rutaProveedor, 'perfil.json');
          if (await fsExtra.pathExists(rutaPerfil)) {
            let perfil = await fsExtra.readJson(rutaPerfil);
            perfil.metricas.deudaActual = Math.max(0, (perfil.metricas.deudaActual || 0) - totalSaldado);
            await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });
          }

          console.log(`[EXITO] Auto-Pago procesado para UUIDs: ${uuidsSaldados.join(', ')}`);
          return; // 🛑 DETENEMOS EL FLUJO NORMAL DE FACTURAS 🛑
        }
      } catch (err) {
        console.log("Error intentando parsear un Complemento de Pago SAT:", err);
      }
    }


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

module.exports = {
  actualizarLibrosProveedor,
  setupProveedoresIPC: function (ipcMain, store) {
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
          } else {
            // --- CASO DE RESPALDO: SOLO HAY PDF O ARCHIVOS SIN XML ---
            const rutaFacturas = path.join(rutaRaizProveedor, 'registro_facturas.json');
            let facturas = [];
            if (await fsExtra.pathExists(rutaFacturas)) facturas = await fsExtra.readJson(rutaFacturas);

            if (!facturas.some(f => f.id === nombreArchivoBase)) {
              facturas.push({
                id: nombreArchivoBase, // Usamos el nombre base temporalmente en lugar de UUID
                folio: fac.folio,
                fecha: `${anio}-${mes}-${dia}`,
                monto: fac.total || 0,
                estado: 'Requiere Revisión (Sin XML)',
                metodoPago: 'S/D'
              });
              facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
              await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });
            }
          }

          if (fac.pdfData) {
            // Enlazamos también en bitácora para los PDFs sueltos:
            const rutaBitacora = path.join(rutaRaizProveedor, 'bitacora_eventos.json');
            let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
            if (!bitacora.some(b => b.descripcion.includes(fac.folio) && b.tipo === 'ARCHIVO')) {
              bitacora.unshift({
                fechaHora: new Date().toLocaleString('es-MX'), tipo: 'ARCHIVO', icono: '📄',
                descripcion: `Se importó manualmente un PDF suelto: ${fac.folio}`
              });
              if (bitacora.length > 100) bitacora.length = 100;
              await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });
            }

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
  }
};
