const { app } = require('electron');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const xml2js = require('xml2js');
const { actualizarLibrosProveedor } = require('./providers.cjs');

module.exports = function setupImapIPC(ipcMain, store) {
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

  ipcMain.handle('escanear-correos', async (event, limite = 20, rutaCarpeta = 'INBOX', forzarRecarga = false) => {
    const config = store.get('imapConfig');
    if (!config || !config.user) return { success: false, error: 'No hay configuración IMAP.' };

    // 1. RUTA DEL CACHÉ EN EL DISCO DURO (Memoria a largo plazo)
    const nombreLimpio = rutaCarpeta.trim().replace(/[^a-zA-Z0-9_-]/gi, '_');
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
      // Ensure we lock the SPECIFIC folder the user requested
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

      // 3B. LEER ARCHIVO DE CORREOS YA PROCESADOS
      const procesadosPath = path.join(carpetaCache, `procesados_${config.user.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      let procesados = [];
      if (await fsExtra.pathExists(procesadosPath)) {
        procesados = await fsExtra.readJson(procesadosPath);
      }

      for await (let message of client.fetch(seq, { source: true })) {
        const parsed = await simpleParser(message.source);
        let tieneXml = false; let tienePdf = false;
        let otrosAdjuntos = [];
        let totalXmlTag = 'Por calcular';

        if (parsed.attachments && parsed.attachments.length > 0) {
          parsed.attachments.forEach(att => {
            const ext = att.filename ? att.filename.toLowerCase() : '';
            if (ext.endsWith('.xml')) {
              tieneXml = true;
              if (totalXmlTag === 'Por calcular' && att.content) {
                const xmlStr = att.content.toString('utf-8');
                const totalMatch = xmlStr.match(/\sTotal=["']?([^"']+)["']?/);
                if (totalMatch) totalXmlTag = `$${totalMatch[1]} MXN`;
              }
            } else if (ext.endsWith('.pdf')) {
              tienePdf = true;
            } else if (ext.endsWith('.zip') || ext.endsWith('.rar')) {
              if (!otrosAdjuntos.includes('ZIP')) otrosAdjuntos.push('ZIP');
            } else if (ext.endsWith('.jpg') || ext.endsWith('.png') || ext.endsWith('.jpeg')) {
              if (!otrosAdjuntos.includes('IMG')) otrosAdjuntos.push('IMG');
            }
          });
        }

        correosReales.push({
          id: message.uid,
          remitente: parsed.from?.value[0]?.address || 'Desconocido',
          empresa: parsed.from?.value[0]?.name || parsed.from?.value[0]?.address,
          asunto: parsed.subject || 'Sin Asunto',
          mensaje: parsed.text ? parsed.text.substring(0, 120) + '...' : 'Sin vista previa.',
          mensajeHtml: parsed.html || parsed.textAsHtml || '',
          fecha: parsed.date ? parsed.date.toLocaleDateString() : 'Hoy',
          tieneXml, tienePdf, otrosAdjuntos,
          total: totalXmlTag,
          importado: procesados.includes(message.uid)
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
              } catch (e) { }
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

          try { await fsExtra.writeFile(rutaArchivo, att.content); } catch (e) { }
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
            } catch (e) { }
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

  ipcMain.handle('guardar-factura-erp', async (event, datos) => {
    try {
      const configUsuario = store.get('userConfig') || {};
      const misRfcs = (configUsuario.rfc || '').toUpperCase().split(',').map(r => r.trim());

      const fuenteDatos = datos.xmlInfo || {};
      const datosManuales = datos.datosManuales || null;

      const rfcEmisor = ((datosManuales ? datosManuales.rfc : fuenteDatos.rfcEmisor) || '').toUpperCase();
      const rfcReceptor = ((fuenteDatos.rfcReceptor) || '').toUpperCase();
      let tipoOperacion = 'Compra';
      let nombreContraparte = (datosManuales ? datosManuales.proveedor : fuenteDatos.nombreEmisor) || 'Desconocido';

      if (!datosManuales && misRfcs.includes(rfcEmisor)) {
        tipoOperacion = 'Venta';
        nombreContraparte = fuenteDatos.nombreReceptor || 'Cliente Desconocido';
      }

      const nombreSeguro = nombreContraparte.replace(/[<>:"/\\|?*]+/g, '').trim();
      const subcarpeta = tipoOperacion === 'Venta' ? 'Clientes' : 'Proveedores';

      const rutaRaizProveedor = path.join(configUsuario.rutaDestino, subcarpeta, nombreSeguro);
      await fsExtra.ensureDir(rutaRaizProveedor);

      const folioExtraido = (datosManuales ? datosManuales.folio : fuenteDatos.folio) || `S_F-${Date.now().toString().slice(-4)}`;
      const folioSeguro = folioExtraido.replace(/[<>:"/\\|?*]+/g, '_');

      let anio = '2025', mes = '01', dia = '01';
      const fechaParaExtraer = datosManuales ? datosManuales.fecha : null;
      if (fechaParaExtraer) {
        const partes = fechaParaExtraer.split('-');
        if (partes.length === 3) { anio = partes[0]; mes = partes[1]; dia = partes[2]; }
      }

      const rutaFinalArchivos = path.join(rutaRaizProveedor, anio, mes, dia);
      await fsExtra.ensureDir(rutaFinalArchivos);

      const nombreArchivoBase = `${nombreSeguro}_${folioSeguro}`;
      let rutaXmlFinal = '';
      let rutaPdfFinal = '';

      // Verificar si ya existe para evitar crasheos o sobreescritura accidental
      const existeXml = await fsExtra.pathExists(path.join(rutaFinalArchivos, `${nombreArchivoBase}.xml`));
      if (existeXml) {
        return { success: false, error: 'DUPLICADO' };
      }

      const rutaPerfilJson = path.join(rutaRaizProveedor, 'perfil.json');
      if (!(await fsExtra.pathExists(rutaPerfilJson))) {
        await fsExtra.writeJson(rutaPerfilJson, {
          id: Date.now().toString(), nombre: nombreContraparte, rfc: rfcEmisor,
          tipo: subcarpeta, tipoPago: 'contado', logo: '', contactos: [], cuentasBancarias: [],
          metricas: {
            comprasHistoricas: parseFloat((datosManuales ? datosManuales.total : fuenteDatos.total) || 0),
            totalFacturas: 1, deudaActual: 0
          },
          fechaRegistro: new Date().toISOString()
        }, { spaces: 2 });
      }

      for (const rutaVieja of datos.archivos || []) {
        const extension = path.extname(rutaVieja).toLowerCase();
        const rutaNueva = path.join(rutaFinalArchivos, `${nombreArchivoBase}${extension}`);
        await fsExtra.copy(rutaVieja, rutaNueva, { overwrite: true });
        if (extension === '.xml') rutaXmlFinal = rutaNueva;
        if (extension === '.pdf') rutaPdfFinal = rutaNueva;
      }

      if (rutaXmlFinal) {
        const { actualizarLibrosProveedor } = require('./providers.cjs');
        await actualizarLibrosProveedor(rutaRaizProveedor, rutaXmlFinal, `${nombreArchivoBase}.xml`);
      } else if (datosManuales && rutaPdfFinal) {
        const rutaFacturas = path.join(rutaRaizProveedor, 'registro_facturas.json');
        let facturas = [];
        if (await fsExtra.pathExists(rutaFacturas)) facturas = await fsExtra.readJson(rutaFacturas);

        facturas.push({
          id: Date.now().toString(),
          folio: folioExtraido,
          fecha: `${datosManuales.fecha}T00:00:00.000Z`,
          monto: parseFloat(datosManuales.total || 0),
          estado: 'Requiere Revisión',
          metodoPago: 'PUE',
          pdfPath: rutaPdfFinal,
          xmlPath: null
        });
        await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

        const rutaBitacora = path.join(rutaRaizProveedor, 'bitacora_eventos.json');
        let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
        bitacora.unshift({
          fechaHora: new Date().toLocaleString('es-MX'),
          tipo: 'NUEVA FACTURA', icono: '📄',
          descripcion: `Nueva compra registrada MANUALMENTE (Folio: ${folioExtraido}) por $${parseFloat(datosManuales.total || 0)}`
        });
        await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });
      }

      // IMPORTANTE: Guardamos el ID del correo como procesado para mostrar la etiqueta ✅ Importado
      if (datos.correoId) {
        const carpetaCache = path.join(app.getPath('userData'), 'Cache_ERP');
        const procesadosPath = path.join(carpetaCache, `procesados_${configUsuario.user?.replace(/[^a-zA-Z0-9]/g, '_') || 'default'}.json`);
        await fsExtra.ensureDir(carpetaCache);
        let procesados = [];
        if (await fsExtra.pathExists(procesadosPath)) procesados = await fsExtra.readJson(procesadosPath);
        if (!procesados.includes(datos.correoId)) {
          procesados.push(datos.correoId);
          await fsExtra.writeJson(procesadosPath, procesados);
        }
      }

      return { success: true, mensaje: `Factura ${folioSeguro} guardada e indexada en el ERP.` };

    } catch (error) {
      console.error("Error importando desde correo:", error);
      return { success: false, error: error.message };
    }
  });
};
