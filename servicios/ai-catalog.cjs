const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

let generadorDeVectores = null;

async function inicializarModeloIA() {
  if (!generadorDeVectores) {
    console.log("🤖 Cargando motor de análisis semántico...");
    // Cargamos el modelo bilingüe para que "TOM SAL" y "TOMATE" se parezcan matemáticamente
    generadorDeVectores = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
    console.log("✅ Motor IA listo y cargado en RAM.");
  }
  return generadorDeVectores;
}

// Función matemática para comparar dos vectores
function calcularSimilitud(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = function setupAiIPC(ipcMain, store) {
ipcMain.handle('generar-embedding', async (event, texto) => {
  try {
    const extractor = await inicializarModeloIA();
    const salida = await extractor(texto, { pooling: 'mean', normalize: true });
    return Array.from(salida.data);
  } catch (error) {
    console.error("Error en IA:", error);
    return null;
  }
});

ipcMain.handle('toggle-ia-proveedor', async (event, params) => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Falta ruta destino.' };

    const { nombreProveedor, usarIA } = params;
    const nombreSeguro = nombreProveedor.replace(/[<>:"/\\|?*]+/g, '').trim();
    const rutaProv = path.join(config.rutaDestino, 'Proveedores', nombreSeguro);

    // 1. Guardar la configuración en su perfil principal
    const rutaPerfil = path.join(rutaProv, 'perfil.json');
    if (await fsExtra.pathExists(rutaPerfil)) {
      let perfil = await fsExtra.readJson(rutaPerfil);
      perfil.usarIA = usarIA;
      await fsExtra.writeJson(rutaPerfil, perfil, { spaces: 2 });
    } else {
      return { success: false, error: 'Perfil no encontrado.' };
    }

    // 2. Modificar el catálogo maestro retrospectivamente
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');

    if (await fsExtra.pathExists(rutaMaestro) && await fsExtra.pathExists(rutaMapeos)) {
      let maestro = await fsExtra.readJson(rutaMaestro);
      let mapeos = await fsExtra.readJson(rutaMapeos);

      // Buscamos todos los IDs maestros que pertenezcan EXCLUSIVAMENTE a este proveedor
      // (Si Bimbo y la tienda local venden "Donas", la IA sí debe analizar a la tienda local)
      const mapeosDelProveedor = mapeos.filter(m => m.rfc_proveedor === nombreSeguro || m.rfc_proveedor === nombreProveedor);

      let idsAfectados = new Set(mapeosDelProveedor.map(m => m.master_id));

      for (let id of idsAfectados) {
        if (maestro[id]) {
          if (usarIA === false) {
            // EXCLUIR: Apagamos su vector y lo marcamos como auditado para que nadie lo moleste
            maestro[id].vector = 'EXCLUIDO';
            maestro[id].auditado = true;
          } else {
            // INCLUIR: Le quitamos la cadena y lo devolvemos al ruedo para que reciba IA nueva
            if (maestro[id].vector === 'EXCLUIDO') {
              maestro[id].vector = null;
              maestro[id].auditado = false;
            }
          }
        }
      }

      await fsExtra.writeJson(rutaMaestro, maestro, { spaces: 2 });
    }

    return { success: true };
  } catch (error) {
    console.error("Error al hacer toggle de IA:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inicializar-catalogo-maestro', async (event, rutaBaseProveedores) => {
  const config = store.get('userConfig');
  if (!config || !config.rutaDestino) return { success: false, error: 'Sin ruta configurada' };

  const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
  const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');

  // 🔥 LA SOLUCIÓN: Si ya existe el archivo, lo cargamos en memoria. Si no, creamos uno vacío.
  // Así conservamos tus vectores y tus agrupaciones aprobadas.
  let maestro = fs.existsSync(rutaMaestro) ? JSON.parse(fs.readFileSync(rutaMaestro, 'utf8')) : {};
  let mapeos = fs.existsSync(rutaMapeos) ? JSON.parse(fs.readFileSync(rutaMapeos, 'utf8')) : [];

  try {
    const carpetas = fs.readdirSync(rutaBaseProveedores);

    for (const rfc of carpetas) {
      const rutaJsonProv = path.join(rutaBaseProveedores, rfc, 'registro_productos.json');
      const rutaPerfilProv = path.join(rutaBaseProveedores, rfc, 'perfil.json');

      let usarIA = true;
      if (fs.existsSync(rutaPerfilProv)) {
        const perfil = JSON.parse(fs.readFileSync(rutaPerfilProv, 'utf8'));
        if (perfil.usarIA === false) usarIA = false;
      }

      if (fs.existsSync(rutaJsonProv)) {
        const productosProv = JSON.parse(fs.readFileSync(rutaJsonProv, 'utf8'));

        for (const [nombreXML, datos] of Object.entries(productosProv)) {

          // Verificamos si este producto de este proveedor ya está mapeado
          const yaMapeado = mapeos.find(m => m.rfc_proveedor === rfc && m.nombre_en_xml === nombreXML);

          // Si NO está mapeado, es totalmente nuevo y lo procesamos
          if (!yaMapeado) {
            let idEncontrado = null;

            if (datos.codigoBarras && datos.codigoBarras !== "") {
              idEncontrado = Object.keys(maestro).find(id =>
                maestro[id].codigos_barras && maestro[id].codigos_barras.includes(datos.codigoBarras)
              );
            }

            if (idEncontrado) {
              mapeos.push({ master_id: idEncontrado, rfc_proveedor: rfc, nombre_en_xml: nombreXML });
            } else {
              const nuevoId = `mstr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              maestro[nuevoId] = {
                nombre_limpio: nombreXML,
                codigos_barras: datos.codigoBarras ? [datos.codigoBarras] : [],
                claveSAT: datos.claveSAT,
                unidad_oficial: datos.unidad || "S/U",
                vector: usarIA ? null : 'EXCLUIDO',  // MAGIA: Si está apagada la IA, nace excluido
                auditado: usarIA ? false : true      // MAGIA: Si está apagada la IA, nace auditado
              };
              mapeos.push({ master_id: nuevoId, rfc_proveedor: rfc, nombre_en_xml: nombreXML });
            }
          }
        }
      }
    }

    // Guardamos respetando lo que ya existía + lo nuevo
    fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
    fs.writeFileSync(rutaMapeos, JSON.stringify(mapeos, null, 2));

    // Contamos los que faltan de vectorizar
    let pendientesVector = 0;
    for (const id in maestro) {
      if (!maestro[id].vector) pendientesVector++;
    }

    return {
      success: true,
      totalProductos: Object.keys(maestro).length,
      totalMapeos: mapeos.length,
      pendientesVector: pendientesVector
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vectorizar-catalogo', async (event) => {
  try {
    // Le decimos que busque el archivo en tu bóveda principal
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');

    if (!fs.existsSync(rutaMaestro)) {
      return { success: false, error: 'No se encontró el catálogo maestro en tu bóveda.' };
    }

    // Leemos los 99 productos
    let maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    const extractor = await inicializarModeloIA();
    let procesados = 0;

    // Recorremos cada producto para darle su identidad matemática
    for (const id in maestro) {
      if (!maestro[id].vector) {
        // Generamos el vector basado en el nombre limpio
        const salida = await extractor(maestro[id].nombre_limpio, { pooling: 'mean', normalize: true });

        // Lo guardamos en el producto
        maestro[id].vector = Array.from(salida.data);
        procesados++;
      }
    }

    // Guardamos el archivo actualizado con todos los números
    fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));

    return { success: true, procesados };
  } catch (error) {
    console.error("Error al vectorizar:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('agrupar-productos-similares', async (event) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json'); // NUEVO
    if (!fs.existsSync(rutaMaestro)) return { success: false, error: 'No hay catálogo' };

    const maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    let mapeos = [];
    if (fs.existsSync(rutaMapeos)) {
      mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));
    }

    // SOLO agarramos los que tienen vector y NO han sido auditados/aprobados/excluidos
    const productos = Object.entries(maestro).filter(([id, data]) => data.vector && !data.auditado && data.vector !== 'EXCLUIDO');

    let grupos = [];
    let procesados = new Set();

    for (let i = 0; i < productos.length; i++) {
      const [idA, dataA] = productos[i];
      if (procesados.has(idA)) continue;

      // Buscar el rfc usando mapeos para inyectarlo al Frontend
      const mapA = mapeos.find(m => m.master_id === idA);
      const rfcA = mapA ? mapA.rfc_proveedor : 'DESCONOCIDO';

      let grupoActual = {
        id_temporal: `grupo_${i}`,
        sugerencia_nombre_global: dataA.nombre_limpio,
        items: [{ id: idA, nombre: dataA.nombre_limpio, similitud: 1.0, rfc_proveedor: rfcA }]
      };
      procesados.add(idA);

      for (let j = i + 1; j < productos.length; j++) {
        const [idB, dataB] = productos[j];
        if (procesados.has(idB)) continue;

        let dotProduct = 0, normA = 0, normB = 0;
        for (let k = 0; k < dataA.vector.length; k++) {
          dotProduct += dataA.vector[k] * dataB.vector[k];
          normA += dataA.vector[k] * dataA.vector[k];
          normB += dataB.vector[k] * dataB.vector[k];
        }
        const similitud = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

        if (similitud > 0.82) { // 82% de similitud mínima para agrupar
          const mapB = mapeos.find(m => m.master_id === idB);
          const rfcB = mapB ? mapB.rfc_proveedor : 'DESCONOCIDO';

          // FASE 10: Prevención de Mismo Proveedor
          // Si el rfc de este producto B ya existe dentro del grupo actual de la propuesta, NO se puede añadir.
          // Un proveedor no puede estar dos veces en el mismo grupo de similitud (Ej. Leche Ley 1L vs Leche Ley 2L)
          const yaExisteProveedorEnGrupo = grupoActual.items.some(item => item.rfc_proveedor === rfcB && rfcB !== 'DESCONOCIDO');

          if (yaExisteProveedorEnGrupo) {
            continue; // Saltamos este producto para este grupo. Se evaluará luego en su propio grupo.
          }

          grupoActual.items.push({ id: idB, nombre: dataB.nombre_limpio, similitud: similitud, rfc_proveedor: rfcB });
          procesados.add(idB);
        }
      }

      if (grupoActual.items.length > 1) {
        // --- INICIO MAGIA IA: NOMBRES INTELIGENTES ---
        // Tomamos todos los nombres originales fragmentados en palabras
        const arraysDePalabras = grupoActual.items.map(item => item.nombre.split(' '));
        // Usamos el nombre que tenga menos palabras como pivote para comparar
        let pivote = arraysDePalabras.reduce((a, b) => a.length <= b.length ? a : b);
        let palabrasEnComun = [];

        for (const palabra of pivote) {
          // Checamos si esta palabra exacta existe dentro de TODOS los demás productos del grupo
          const sobreviveEnTodos = arraysDePalabras.every(arr => arr.includes(palabra));
          if (sobreviveEnTodos) {
            palabrasEnComun.push(palabra);
          }
        }

        // Si sobrevive al menos una palabra, ese es el nuevo "Nombre Unificador"
        if (palabrasEnComun.length > 0) {
          grupoActual.sugerencia_nombre_global = palabrasEnComun.join(' ');
        }
        // --- FIN MAGIA IA ---

        grupos.push(grupoActual);
      }
    }
    grupos.sort((a, b) => b.items.length - a.items.length);
    return { success: true, grupos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('aprobar-grupo-productos', async (event, { nombreGlobal, idsSeleccionados }) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');

    let maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    let mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));

    // El primer ID del grupo se convierte en el "Maestro Oficial"
    const idPrincipal = idsSeleccionados[0];

    if (maestro[idPrincipal]) {
      maestro[idPrincipal].nombre_limpio = nombreGlobal; // Le ponemos el nombre que tú escribiste
      maestro[idPrincipal].auditado = true; // Lo marcamos para que la IA no lo vuelva a molestar
    }

    // A todos los demás IDs los eliminamos y redirigimos sus mapeos al ID Principal
    for (let i = 1; i < idsSeleccionados.length; i++) {
      const idSecundario = idsSeleccionados[i];
      // Redirigimos el puente
      mapeos = mapeos.map(m => m.master_id === idSecundario ? { ...m, master_id: idPrincipal } : m);
      // Borramos el duplicado
      delete maestro[idSecundario];
    }

    // Guardamos los cambios en el disco duro (Tu bóveda)
    fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
    fs.writeFileSync(rutaMapeos, JSON.stringify(mapeos, null, 2));

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expulsar-producto-grupo', async (event, id_producto) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    if (!fs.existsSync(rutaMaestro)) return { success: false, error: 'No hay catálogo' };

    let maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));

    if (maestro[id_producto]) {
      // MAGIA: Lo dejamos explícitamente como auditado: false.
      // Al aprobarse el resto del grupo, este se quedará solito y huérfano
      // esperando a la siguiente IA o a la pestaña de pendientes.
      maestro[id_producto].auditado = false;
      fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
      return { success: true };
    } else {
      return { success: false, error: 'Producto no encontrado en catálogo maestro.' };
    }
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obtener-productos-pendientes', async (event) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');
    if (!fs.existsSync(rutaMaestro)) return { success: false, error: 'No hay catálogo' };

    const maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    let mapeos = [];
    if (fs.existsSync(rutaMapeos)) {
      mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));
    }

    // Buscamos todos los que NO están auditados y NO están excluidos deliberadamente
    const huérfanos = [];
    for (const [id, data] of Object.entries(maestro)) {
      if (!data.auditado && data.vector && data.vector !== 'EXCLUIDO') {
        const mapeo = mapeos.find(m => m.master_id === id);
        huérfanos.push({
          id: id,
          nombre_limpio: data.nombre_limpio,
          rfc_proveedor: mapeo ? mapeo.rfc_proveedor : 'DESCONOCIDO'
        });
      }
    }

    return { success: true, productos: huérfanos };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('aprobar-producto-individual', async (event, id_producto) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    if (!fs.existsSync(rutaMaestro)) return { success: false, error: 'No hay catálogo' };

    let maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));

    if (maestro[id_producto]) {
      // Al marcarlo como auditado, se asimila a la bóveda permanentemente
      maestro[id_producto].auditado = true;
      fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
      return { success: true };
    } else {
      return { success: false, error: 'Producto no encontrado.' };
    }
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obtener-catalogo-agrupado', async (event) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');
    if (!fs.existsSync(rutaMaestro)) return { success: false, error: 'No hay catálogo' };

    const maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    let mapeos = [];
    if (fs.existsSync(rutaMapeos)) {
      mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));
    }

    // Convertir a un arreglo donde cada maestro tenga su lista de "hijos"
    const catalogo = [];

    // Recorremos cada producto maestro (Solo los auditados entran al catálogo formal)
    for (const [id, data] of Object.entries(maestro)) {
      if (data.auditado && data.vector !== 'EXCLUIDO') {
        // Buscar quiénes están mapeados a este ID Maestro
        const hijosSincronizados = mapeos.filter(m => m.master_id === id);

        catalogo.push({
          id_maestro: id,
          nombre_global: data.nombre_limpio,
          hijos: hijosSincronizados // Lista de ítems originales
        });
      }
    }

    // Ordenar alfabéticamente para facilidad de lectura
    catalogo.sort((a, b) => a.nombre_global.localeCompare(b.nombre_global));

    return { success: true, catalogo };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('desagrupar-producto', async (event, { rfc_proveedor, nombre_en_xml }) => {
  try {
    const config = store.get('userConfig');
    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');
    if (!fs.existsSync(rutaMaestro) || !fs.existsSync(rutaMapeos)) return { success: false, error: 'Archivos no encontrados' };

    let maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    let mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));

    // 1. Encontrar el mapeo específico que queremos romper
    const indiceMapeo = mapeos.findIndex(m => m.rfc_proveedor === rfc_proveedor && m.nombre_en_xml === nombre_en_xml);

    if (indiceMapeo === -1) {
      return { success: false, error: 'No se encontró el vínculo en el sistema.' };
    }

    const mapRoto = mapeos[indiceMapeo];
    const idMaestroOriginal = mapRoto.master_id;

    // Heredamos el vector del maestro para no obligar a la IA a re-vectorizar y para que aparezca en Pendientes instantáneamente.
    const vectorHeredado = maestro[idMaestroOriginal] ? maestro[idMaestroOriginal].vector : null;

    // 2. Eliminar el mapeo para romper el puente
    mapeos.splice(indiceMapeo, 1);

    // 3. Crear una nueva entrada en productos_maestros para que este ítem vuelva a nacer 
    // y se vaya a la pestaña de pendientes (auditado: false)
    const crypto = require('crypto');
    const nuevoIdMaestro = crypto.randomUUID();

    maestro[nuevoIdMaestro] = {
      nombre_limpio: mapRoto.nombre_en_xml,
      codigos_barras: [],
      claveSAT: "",
      unidad_oficial: "S/U",
      vector: vectorHeredado,
      auditado: false // Esto lo manda a "Pendientes (Sin Agrupar)" en el Frontend
    };

    // 4. Volvemos a mapear este producto a su nuevo ID Maestro recién nacido
    mapeos.push({
      ...mapRoto,
      master_id: nuevoIdMaestro
    });

    // 5. Verificar si el Maestro Original se quedó vacío (sin mapeos hijos). 
    // Si es así, lo borramos para que no quede como fantasma.
    const mappingsRestantes = mapeos.filter(m => m.master_id === idMaestroOriginal);
    if (mappingsRestantes.length === 0) {
      delete maestro[idMaestroOriginal];
    } else if (maestro[idMaestroOriginal]) {
      // Opcional: Si el grupo quedó de 1, sigue siendo Auditado.
      // Se queda como estaba, pero con 1 solo hijo.
    }

    // Guardar cambios
    fs.writeFileSync(rutaMaestro, JSON.stringify(maestro, null, 2));
    fs.writeFileSync(rutaMapeos, JSON.stringify(mapeos, null, 2));

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('obtener-analiticas-precios', async () => {
  try {
    const config = store.get('userConfig');
    if (!config || !config.rutaDestino) return { success: false, error: 'Ruta no configurada' };

    const rutaMaestro = path.join(config.rutaDestino, 'productos_maestros.json');
    const rutaMapeos = path.join(config.rutaDestino, 'mapeos_sistema.json');
    const carpetaProveedores = path.join(config.rutaDestino, 'Proveedores');

    if (!fs.existsSync(rutaMaestro) || !fs.existsSync(rutaMapeos)) {
      return { success: false, error: 'No hay catálogo maestro auditado todavía.' };
    }

    const maestro = JSON.parse(fs.readFileSync(rutaMaestro, 'utf8'));
    const mapeos = JSON.parse(fs.readFileSync(rutaMapeos, 'utf8'));

    // 1. Cargar en memoria todos los JSON de `registro_productos.json` usando sus carpetas
    const datosProveedoresCache = {};
    if (fs.existsSync(carpetaProveedores)) {
      const carpetas = fs.readdirSync(carpetaProveedores, { withFileTypes: true });
      for (const dir of carpetas) {
        if (dir.isDirectory()) {
          const rutaProd = path.join(carpetaProveedores, dir.name, 'registro_productos.json');
          const rutaPerfil = path.join(carpetaProveedores, dir.name, 'perfil.json');
          if (fs.existsSync(rutaProd) && fs.existsSync(rutaPerfil)) {
            const perfilRaw = JSON.parse(fs.readFileSync(rutaPerfil, 'utf8'));
            const rfcProveedor = perfilRaw.rfc ? perfilRaw.rfc.trim() : dir.name;
            const nombreProveedor = perfilRaw.nombre ? perfilRaw.nombre.trim() : dir.name;

            datosProveedoresCache[rfcProveedor] = {
              nombreCarpeta: dir.name,
              nombreComercial: nombreProveedor,
              productos: JSON.parse(fs.readFileSync(rutaProd, 'utf8'))
            };
          }
        }
      }
    }

    // 2. Armar la gran matriz de analíticas

    const analiticas = [];
    const agrupadosPorMaestro = {};
    const productosAislados = [];

    // Recorrer todos los proveedores en caché como base principal
    for (const [rfc_proveedor, provData] of Object.entries(datosProveedoresCache)) {
      if (!provData.productos) continue;

      for (const [nombre_original, itemPuro] of Object.entries(provData.productos)) {
        // Buscar si este producto está mapeado permitiendo múltiples llaves (RFC, Comercial, Carpeta)
        const mapeoBase = mapeos.find(m =>
          (m.rfc_proveedor === rfc_proveedor || m.rfc_proveedor === provData.nombreCarpeta || m.rfc_proveedor === provData.nombreComercial) &&
          m.nombre_en_xml === nombre_original
        );

        const infoProvedorVinculado = {
          rfc: rfc_proveedor,
          nombre_comercial: provData.nombreComercial || rfc_proveedor,
          nombre_original: nombre_original,
          precioActual: itemPuro.precioActual || 0
        };

        const historialFirmado = (itemPuro.historial && Array.isArray(itemPuro.historial))
          ? itemPuro.historial.map(hito => ({
            ...hito,
            rfc_proveedor: rfc_proveedor,
            nombre_comercial: provData.nombreComercial || rfc_proveedor,
            nombre_original: nombre_original
          }))
          : [];

        if (mapeoBase && maestro[mapeoBase.master_id] && maestro[mapeoBase.master_id].vector !== 'EXCLUIDO') {
          // Producto agrupado/homologado por la IA
          const id_maestro = mapeoBase.master_id;
          if (!agrupadosPorMaestro[id_maestro]) {
            agrupadosPorMaestro[id_maestro] = {
              id_maestro: id_maestro,
              nombre_global: maestro[id_maestro].nombre_limpio,
              auditado: maestro[id_maestro].auditado,
              proveedoresInvolucrados: new Set(),
              proveedores_vinculados: [],
              historialUnificado: []
            };
          }
          agrupadosPorMaestro[id_maestro].proveedoresInvolucrados.add(rfc_proveedor);
          agrupadosPorMaestro[id_maestro].proveedores_vinculados.push(infoProvedorVinculado);
          agrupadosPorMaestro[id_maestro].historialUnificado = agrupadosPorMaestro[id_maestro].historialUnificado.concat(historialFirmado);
        } else {
          // Producto Aislado o de Proveedor sin IA
          const crypto = require('crypto');
          const id_aislado = 'aislado-' + crypto.createHash('md5').update(rfc_proveedor + nombre_original).digest('hex').substring(0, 10);
          productosAislados.push({
            id_maestro: id_aislado,
            nombre_global: nombre_original,
            auditado: false,
            proveedoresInvolucrados: new Set([rfc_proveedor]),
            proveedores_vinculados: [infoProvedorVinculado],
            historialUnificado: historialFirmado
          });
        }
      }
    }

    // Constructor de métricas finales
    function procesarKPIsYEmitir(objData, arrayFinal) {
      objData.historialUnificado.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      let precioMin = Infinity;
      let precioMax = -Infinity;
      let ultimoPrecio = 0;
      let primerPrecio = 0;
      let variacionPorcentualTotal = 0;

      if (objData.historialUnificado.length > 0) {
        primerPrecio = objData.historialUnificado[0].precio;
        ultimoPrecio = objData.historialUnificado[objData.historialUnificado.length - 1].precio;
        objData.historialUnificado.forEach(h => {
          if (h.precio < precioMin) precioMin = h.precio;
          if (h.precio > precioMax) precioMax = h.precio;
        });
        if (primerPrecio > 0) variacionPorcentualTotal = ((ultimoPrecio - primerPrecio) / primerPrecio) * 100;
      } else {
        precioMin = 0;
        precioMax = 0;
      }

      arrayFinal.push({
        id_maestro: objData.id_maestro,
        nombre_global: objData.nombre_global,
        auditado: objData.auditado,
        total_proveedores: objData.proveedoresInvolucrados.size,
        proveedores_vinculados: objData.proveedores_vinculados,
        kpis: {
          precioMin,
          precioMax,
          ultimoPrecio,
          variacionPorcentualTotal: parseFloat(variacionPorcentualTotal.toFixed(2))
        },
        historial_compuesto: objData.historialUnificado
      });
    }

    // Inyectar ambos mundos al contenedor principal
    Object.values(agrupadosPorMaestro).forEach(grupo => procesarKPIsYEmitir(grupo, analiticas));
    productosAislados.forEach(aislado => procesarKPIsYEmitir(aislado, analiticas));

    // Ordenar de forma alfabética (o podría ser por los que más variación sufrieron)
    analiticas.sort((a, b) => a.nombre_global.localeCompare(b.nombre_global));

    return { success: true, analiticas };
  } catch (error) {
    console.error("Error Obteniendo Analíticas:", error);
    return { success: false, error: error.message };
  }
});
};
