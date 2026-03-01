const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { shell } = require('electron');

module.exports = function setupClientesIPC(ipcMain, store) {

    // --- MOTOR PARA LEER TODOS LOS CLIENTES ---
    ipcMain.handle('obtener-clientes', async () => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return [];

            const rutaClientes = path.join(config.rutaDestino, 'Clientes');
            if (!(await fsExtra.pathExists(rutaClientes))) return [];

            const carpetas = await fsExtra.readdir(rutaClientes);
            const listaClientes = [];

            for (const carpeta of carpetas) {
                const rutaPerfil = path.join(rutaClientes, carpeta, 'perfil.json');

                if (await fsExtra.pathExists(rutaPerfil)) {
                    const perfil = await fsExtra.readJson(rutaPerfil);

                    if (perfil.logo && await fsExtra.pathExists(perfil.logo)) {
                        const base64Data = fs.readFileSync(perfil.logo, { encoding: 'base64' });
                        const ext = path.extname(perfil.logo).replace('.', '') || 'png';
                        perfil.logo = `data:image/${ext};base64,${base64Data}`;
                    } else {
                        perfil.logo = null;
                    }

                    listaClientes.push(perfil);
                }
            }

            return listaClientes;
        } catch (error) {
            console.error("Error al obtener clientes:", error);
            return [];
        }
    });

    // --- MOTOR PARA LEER GRUPOS EXISTENTES (CLIENTES) ---
    ipcMain.handle('obtener-grupos-clientes', async () => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return [];

            const rutaClientes = path.join(config.rutaDestino, 'Clientes');
            if (!(await fsExtra.pathExists(rutaClientes))) return [];

            const carpetas = await fsExtra.readdir(rutaClientes);
            const gruposSet = new Set();

            for (const carpeta of carpetas) {
                const rutaPerfil = path.join(rutaClientes, carpeta, 'perfil.json');
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

    // --- MOTOR PARA GUARDAR / EDITAR CLIENTE MANUALMENTE ---
    ipcMain.handle('guardar-cliente-manual', async (event, datosCliente) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino en Ajustes.' };

            const nombreSeguro = datosCliente.nombreComercial.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaRaizCliente = path.join(config.rutaDestino, 'Clientes', nombreSeguro);

            await fsExtra.ensureDir(rutaRaizCliente);

            const rutaPerfilJson = path.join(rutaRaizCliente, 'perfil.json');
            let perfilFinal = {};

            if (await fsExtra.pathExists(rutaPerfilJson)) {
                const perfilExistente = await fsExtra.readJson(rutaPerfilJson);
                perfilFinal = { ...perfilExistente, ...datosCliente };
            } else {
                perfilFinal = {
                    ...datosCliente,
                    id: Date.now().toString(),
                    tipo: 'Clientes',
                    fechaRegistro: new Date().toISOString(),
                    metricas: { comprasHistoricas: 0, ultimaCompra: null, totalFacturas: 0, deudaActual: 0 }
                };
            }

            if (datosCliente.logoBase64) {
                const ext = datosCliente.logoExt || '.png';
                const rutaDestinoLogo = path.join(rutaRaizCliente, `logo${ext}`);
                const base64Puro = datosCliente.logoBase64.replace(/^data:image\/\w+;base64,/, "");

                fs.writeFileSync(rutaDestinoLogo, base64Puro, 'base64');
                perfilFinal.logo = rutaDestinoLogo;

            } else if (datosCliente.logoPath && !datosCliente.logoPath.startsWith('http') && !datosCliente.logoPath.startsWith('data:image')) {
                const ext = path.extname(datosCliente.logoPath);
                const rutaDestinoLogo = path.join(rutaRaizCliente, `logo${ext}`);
                await fsExtra.copy(datosCliente.logoPath, rutaDestinoLogo);
                perfilFinal.logo = rutaDestinoLogo;
            }

            await fsExtra.writeJson(rutaPerfilJson, perfilFinal, { spaces: 2 });

            return { success: true, ruta: rutaRaizCliente };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    });

    // --- MOTOR PARA LEER LAS FACTURAS DE UN CLIENTE ---
    ipcMain.handle('obtener-facturas-cliente', async (event, nombreCliente) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return [];

            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaFacturas = path.join(config.rutaDestino, 'Clientes', nombreSeguro, 'registro_facturas.json');

            if (await fsExtra.pathExists(rutaFacturas)) {
                let facturas = await fsExtra.readJson(rutaFacturas);
                facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                return facturas;
            }
            return [];
        } catch (error) {
            console.error("Error al leer facturas de cliente:", error);
            return [];
        }
    });

    // --- MOTOR PARA SINCRONIZAR BOVEDA CLIENTES ---
    ipcMain.handle('sincronizar-boveda-clientes', async (event) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

            const rutaClientes = path.join(config.rutaDestino, 'Clientes');
            if (!(await fsExtra.pathExists(rutaClientes))) return { success: true, cantidad: 0 };

            const clientes = await fsExtra.readdir(rutaClientes);
            let facturasProcesadas = 0;

            // Importar aquí la función madre del otro archivo (Hack temporal para reciclar)
            const providersUtils = require('./providers.cjs');

            for (const cli of clientes) {
                const rutaCli = path.join(rutaClientes, cli);
                const stat = await fsExtra.stat(rutaCli);
                if (!stat.isDirectory()) continue;

                await fsExtra.remove(path.join(rutaCli, 'registro_facturas.json'));
                await fsExtra.remove(path.join(rutaCli, 'registro_productos.json'));
                await fsExtra.remove(path.join(rutaCli, 'bitacora_eventos.json'));

                async function buscarXMLs(directorio) {
                    const elementos = await fsExtra.readdir(directorio);
                    for (const item of elementos) {
                        const rutaItem = path.join(directorio, item);
                        const itemStat = await fsExtra.stat(rutaItem);

                        if (itemStat.isDirectory()) {
                            await buscarXMLs(rutaItem);
                        } else if (item.endsWith('.xml')) {
                            await providersUtils.actualizarLibrosProveedor(rutaCli, rutaItem, item);
                            facturasProcesadas++;
                        }
                    }
                }

                const carpetasRaiz = await fsExtra.readdir(rutaCli);
                for (const carpeta of carpetasRaiz) {
                    const rutaCarpeta = path.join(rutaCli, carpeta);
                    const carpetaStat = await fsExtra.stat(rutaCarpeta);
                    if (carpetaStat.isDirectory()) {
                        await buscarXMLs(rutaCarpeta);
                    }
                }
            }

            return { success: true, cantidad: facturasProcesadas };
        } catch (error) {
            console.error("Error en sincronización de clientes:", error);
            return { success: false, error: error.message };
        }
    });

    // --- MOTOR PARA SINCRONIZAR 1 CLIENTE ---
    ipcMain.handle('sincronizar-cliente', async (event, nombreCliente) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaCli = path.join(config.rutaDestino, 'Clientes', nombreSeguro);

            if (!(await fsExtra.pathExists(rutaCli))) return { success: false, error: 'Carpeta no encontrada.' };

            let facturasProcesadas = 0;
            const providersUtils = require('./providers.cjs');

            await fsExtra.remove(path.join(rutaCli, 'registro_facturas.json'));
            await fsExtra.remove(path.join(rutaCli, 'registro_productos.json'));
            await fsExtra.remove(path.join(rutaCli, 'bitacora_eventos.json'));

            async function buscarXMLs(directorio) {
                const elementos = await fsExtra.readdir(directorio);
                for (const item of elementos) {
                    const rutaItem = path.join(directorio, item);
                    const itemStat = await fsExtra.stat(rutaItem);

                    if (itemStat.isDirectory()) {
                        await buscarXMLs(rutaItem);
                    } else if (item.endsWith('.xml')) {
                        await providersUtils.actualizarLibrosProveedor(rutaCli, rutaItem, item);
                        facturasProcesadas++;
                    }
                }
            }

            const carpetasRaiz = await fsExtra.readdir(rutaCli);
            for (const carpeta of carpetasRaiz) {
                const rutaCarpeta = path.join(rutaCli, carpeta);
                const carpetaStat = await fsExtra.stat(rutaCarpeta);
                if (carpetaStat.isDirectory()) {
                    await buscarXMLs(rutaCarpeta);
                }
            }

            return { success: true, cantidad: facturasProcesadas };
        } catch (error) {
            console.error("Error en sincronización individual cliente:", error);
            return { success: false, error: error.message };
        }
    });


    // =========================================================================================
    // FUNCIONES DE PAGOS / COBROS / BITÁCORA CLIENTES (Copias de payments.cjs)
    // =========================================================================================

    ipcMain.handle('registrar-cobro-cliente', async (event, params) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

            const { nombreCliente, facturasSeleccionadas, datosPago } = params;
            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaCli = path.join(config.rutaDestino, 'Clientes', nombreSeguro);

            if (!(await fsExtra.pathExists(rutaCli))) return { success: false, error: 'Cliente no encontrado.' };

            let rutaComprobanteFisico = null;
            if (datosPago.comprobanteBase64) {
                const dirPagos = path.join(rutaCli, 'Cobros_Recibidos');
                await fsExtra.ensureDir(dirPagos);
                const nombreArchivo = `Cobro_${datosPago.metodo}_${(datosPago.referencia || 'SinRef').replace(/[^a-zA-Z0-9-]/g, '')}_${Date.now()}${datosPago.comprobanteExt}`;
                rutaComprobanteFisico = path.join(dirPagos, nombreArchivo);

                const base64Puro = datosPago.comprobanteBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
                fs.writeFileSync(rutaComprobanteFisico, base64Puro, 'base64');
            }

            const rutaFacturas = path.join(rutaCli, 'registro_facturas.json');
            let facturas = await fsExtra.pathExists(rutaFacturas) ? await fsExtra.readJson(rutaFacturas) : [];
            let montoSaldado = 0;
            let uuidsSaldados = [];

            facturas = facturas.map(fac => {
                if (facturasSeleccionadas.includes(fac.id)) {
                    montoSaldado += fac.monto;
                    uuidsSaldados.push(fac.id);

                    fac.estado = fac.metodoPago === 'PPD' ? 'Esperando REP' : 'Cobrada'; // Mantenemos el hack frontend o backend
                    if (rutaComprobanteFisico) {
                        fac.comprobantePath = rutaComprobanteFisico;
                    }
                }
                return fac;
            });
            await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

            const rutaPerfil = path.join(rutaCli, 'perfil.json');
            let perfil = await fsExtra.readJson(rutaPerfil);
            perfil.metricas.deudaActual = Math.max(0, (perfil.metricas.deudaActual || 0) - montoSaldado);
            await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });

            const rutaPagos = path.join(rutaCli, 'registro_cobros.json');
            let historialPagos = await fsExtra.pathExists(rutaPagos) ? await fsExtra.readJson(rutaPagos) : [];
            historialPagos.unshift({
                idPago: Date.now().toString(),
                fecha: new Date().toISOString(),
                monto: montoSaldado,
                metodo: datosPago.metodo,
                referencia: datosPago.referencia || 'Sin Referencia',
                facturasSaldadas: uuidsSaldados,
                comprobantePath: rutaComprobanteFisico
            });
            await fsExtra.writeJson(rutaPagos, historialPagos, { spaces: 2 });

            const rutaBitacora = path.join(rutaCli, 'bitacora_eventos.json');
            let bitacora = await fsExtra.pathExists(rutaBitacora) ? await fsExtra.readJson(rutaBitacora) : [];
            bitacora.unshift({
                fechaHora: new Date().toLocaleString('es-MX'),
                tipo: 'COBRO',
                icono: '💰',
                descripcion: `Cobro de $${new Intl.NumberFormat('es-MX').format(montoSaldado)} por ${datosPago.metodo} (${uuidsSaldados.length} facturas). Ref: ${datosPago.referencia || 'N/A'}`
            });
            if (bitacora.length > 100) bitacora.length = 100;
            await fsExtra.writeJson(rutaBitacora, bitacora, { spaces: 2 });

            return { success: true, montoSaldado };
        } catch (error) {
            console.error("Error al registrar cobro:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('obtener-bitacora-cliente', async (event, nombreCliente) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return [];
            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaCli = path.join(config.rutaDestino, 'Clientes', nombreSeguro);
            const rutaBitacora = path.join(rutaCli, 'bitacora_eventos.json');

            if (await fsExtra.pathExists(rutaBitacora)) {
                return await fsExtra.readJson(rutaBitacora);
            }
            return [];
        } catch (error) {
            console.error("Error al leer bitácora de cliente:", error);
            return [];
        }
    });

    ipcMain.handle('abrir-factura-cliente-original', async (event, params) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

            const { nombreProveedor: nombreCliente, fecha, folio } = params; // Reusamos la propiedad del frontend
            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const folioSeguro = (folio || 'S_F').replace(/[<>:"/\\|?*]+/g, '_');

            let anio = '2025', mes = '01', dia = '01';
            if (fecha) {
                const partes = fecha.split('T')[0].split('-');
                if (partes.length === 3) {
                    anio = partes[0]; mes = partes[1]; dia = partes[2];
                }
            }

            const dirArchivos = path.join(config.rutaDestino, 'Clientes', nombreSeguro, anio, mes, dia);

            if (await fsExtra.pathExists(dirArchivos)) {
                const archivos = await fsExtra.readdir(dirArchivos);
                const fragmentoFolio = folioSeguro.includes('-') ? folioSeguro.split('-').pop() : folioSeguro;

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

    ipcMain.handle('adjuntar-documento-cliente', async (event, params) => {
        try {
            const config = store.get('userConfig');
            const { nombreCliente, idFactura, tipoDoc, archivoBase64, extension } = params;

            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaCli = path.join(config.rutaDestino, 'Clientes', nombreSeguro);

            const nombreCarpeta = tipoDoc === 'REP' ? 'Comprobantes_REP' : 'Cobros_Recibidos';
            const dirDestino = path.join(rutaCli, nombreCarpeta);
            await fsExtra.ensureDir(dirDestino);

            const nombreArchivo = `${tipoDoc}_${idFactura}_${Date.now()}${extension}`;
            const rutaFinal = path.join(dirDestino, nombreArchivo);
            const base64Puro = archivoBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
            require('fs').writeFileSync(rutaFinal, base64Puro, 'base64');

            const rutaFacturas = path.join(rutaCli, 'registro_facturas.json');
            let facturas = await fsExtra.readJson(rutaFacturas);
            let folioFac = '';

            facturas = facturas.map(fac => {
                if (fac.id === idFactura) {
                    folioFac = fac.folio;
                    if (tipoDoc === 'REP') {
                        fac.repPath = rutaFinal;
                        fac.estado = 'Cobrada';
                    } else if (tipoDoc === 'COMP') {
                        fac.comprobantePath = rutaFinal;
                    }
                }
                return fac;
            });
            await fsExtra.writeJson(rutaFacturas, facturas, { spaces: 2 });

            const rutaBitacora = path.join(rutaCli, 'bitacora_eventos.json');
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

    ipcMain.handle('registrar-nota-credito-cliente', async (event, params) => {
        try {
            const config = store.get('userConfig');
            const { nombreCliente, idFactura, montoNC, archivoBase64, extension } = params;
            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaCli = path.join(config.rutaDestino, 'Clientes', nombreSeguro);

            let rutaFinal = null;
            if (archivoBase64) {
                const dirDestino = path.join(rutaCli, 'Notas_Credito');
                await fsExtra.ensureDir(dirDestino);
                const nombreArchivo = `NC_${idFactura}_${Date.now()}${extension}`;
                rutaFinal = path.join(dirDestino, nombreArchivo);
                const base64Puro = archivoBase64.replace(/^data:([A-Za-z-+/]+);base64,/, "");
                require('fs').writeFileSync(rutaFinal, base64Puro, 'base64');
            }

            const rutaFacturas = path.join(rutaCli, 'registro_facturas.json');
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

            const rutaPerfil = path.join(rutaCli, 'perfil.json');
            let perfil = await fsExtra.readJson(rutaPerfil);
            perfil.metricas.deudaActual = Math.max(0, (perfil.metricas.deudaActual || 0) - parseFloat(montoNC));
            await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });

            const rutaBitacora = path.join(rutaCli, 'bitacora_eventos.json');
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

    ipcMain.handle('obtener-productos-cliente', async (event, nombreCliente) => {
        try {
            const config = store.get('userConfig');
            if (!config || !config.rutaDestino) return {};

            const nombreSeguro = nombreCliente.replace(/[<>:"/\\|?*]+/g, '').trim();
            const rutaProductos = path.join(config.rutaDestino, 'Clientes', nombreSeguro, 'registro_productos.json');

            if (await fsExtra.pathExists(rutaProductos)) {
                return await fsExtra.readJson(rutaProductos);
            }
            return {};
        } catch (error) {
            console.error("Error al leer productos de cliente:", error);
            return {};
        }
    });
};
