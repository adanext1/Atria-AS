import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function ModuloProductos({ volverAlDashboard }) {
  const [pestañaActiva, setPestañaActiva] = useState('pendientes');

  // ==========================================
  // ESTADOS DEL SISTEMA
  // ==========================================
  const [estaCargando, setEstaCargando] = useState(false);
  const [resumen, setResumen] = useState({ totalProductos: 0, totalMapeos: 0, pendientesVector: 0 });
  const [estaVectorizando, setEstaVectorizando] = useState(false);

  // ESTADOS DE AUDITORÍA
  const [gruposIA, setGruposIA] = useState([]);
  const [escaneandoIA, setEscaneandoIA] = useState(false);

  // NUEVOS ESTADOS PARA FILTRO DE PROVEEDORES
  const [listaFiltroProveedores, setListaFiltroProveedores] = useState([]);

  // 1. Al abrir el módulo, leemos el estado actual del catálogo automáticamente
  useEffect(() => {
    cargarEstadoActual();
  }, []);

  // Escuchar cuando el usuario cambia a la pestaña de proveedores
  useEffect(() => {
    if (pestañaActiva === 'proveedores' && listaFiltroProveedores.length === 0) {
      cargarProveedoresBD();
    }
  }, [pestañaActiva]);

  // Cargar lista y estado IA de todos los proveedores
  const cargarProveedoresBD = async () => {
    setEstaCargando(true);
    try {
      const data = await ipcRenderer.invoke('obtener-proveedores');
      // Ordenamos para que los que tienen más facturas salgan arriba
      const ordenados = data.sort((a, b) => (b.metricas?.totalFacturas || 0) - (a.metricas?.totalFacturas || 0));
      setListaFiltroProveedores(ordenados);
    } catch (error) {
      console.error(error);
    } finally {
      setEstaCargando(false);
    }
  };

  // Función para activar/desactivar IA por Proveedor
  const cambiarEstadoIA = async (nombreProveedor, estadoActual) => {
    const nuevoEstado = !estadoActual;

    // 1. Actualización Optimizada (UI instantánea)
    setListaFiltroProveedores(prev =>
      prev.map(p => p.nombre === nombreProveedor ? { ...p, usarIA: nuevoEstado } : p)
    );

    // 2. Avisamos al backend para que guarde el archivo y purgue los productos del maestro si se apagó
    try {
      setEstaCargando(true);
      const res = await ipcRenderer.invoke('toggle-ia-proveedor', { nombreProveedor, usarIA: nuevoEstado });
      if (res.success) {
        // Al terminar de depurar la bóveda, forzamos recarga de las métricas principales (Productos / Enlaces)
        await cargarEstadoActual();
      } else {
        alert("Error al actualizar la configuración de IA.");
        // Revertir UI
        setListaFiltroProveedores(prev =>
          prev.map(p => p.nombre === nombreProveedor ? { ...p, usarIA: estadoActual } : p)
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEstaCargando(false);
    }
  };

  const cargarEstadoActual = async () => {
    try {
      setEstaCargando(true);
      const configFresca = await ipcRenderer.invoke('obtener-config');
      if (configFresca && configFresca.rutaDestino) {
        const rutaProveedores = `${configFresca.rutaDestino}/Proveedores`;
        // Ejecutamos el escaneo silencioso para saber cómo estamos
        const respuesta = await ipcRenderer.invoke('inicializar-catalogo-maestro', rutaProveedores);
        if (respuesta && respuesta.success) {
          setResumen({
            totalProductos: respuesta.totalProductos,
            totalMapeos: respuesta.totalMapeos,
            pendientesVector: respuesta.pendientesVector
          });

          // Si ya todo está vectorizado, buscamos si hay grupos pendientes de auditar
          if (respuesta.pendientesVector === 0) {
            buscarGruposSimilares();
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEstaCargando(false);
    }
  };

  // 2. Función para convertir el texto en matemáticas (Solo si hay pendientes)
  const iniciarVectorizacion = async () => {
    setEstaVectorizando(true);
    try {
      const respuesta = await ipcRenderer.invoke('vectorizar-catalogo');
      if (respuesta && respuesta.success) {
        alert(`¡Completado! 🧠 Se generaron ${respuesta.procesados} vectores nuevos.`);
        // Recargamos el estado para que desaparezca el botón
        cargarEstadoActual();
      } else {
        alert("Hubo un detalle: " + respuesta.error);
      }
    } catch (error) {
      alert("Error de conexión: " + error.message);
    } finally {
      setEstaVectorizando(false);
    }
  };

  // 3. Función para buscar duplicados
  const buscarGruposSimilares = async () => {
    setEscaneandoIA(true);
    try {
      const res = await ipcRenderer.invoke('agrupar-productos-similares');
      if (res.success) setGruposIA(res.grupos);
    } catch (e) { console.error(e); }
    setEscaneandoIA(false);
  };

  // 4. Función para guardar un grupo y hacerlo Global
  const aprobarGrupo = async (grupo) => {
    try {
      // Sacamos todos los IDs de ese grupo
      const idsSeleccionados = grupo.items.map(item => item.id);

      const respuesta = await ipcRenderer.invoke('aprobar-grupo-productos', {
        nombreGlobal: grupo.sugerencia_nombre_global,
        idsSeleccionados: idsSeleccionados
      });

      if (respuesta.success) {
        // Quitamos la tarjeta de la pantalla porque ya se guardó para siempre
        setGruposIA(prev => prev.filter(g => g.id_temporal !== grupo.id_temporal));
      } else {
        alert("Error al guardar: " + respuesta.error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto animate-fade-in-up">

      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button onClick={volverAlDashboard} className="p-2 bg-gray-50 dark:bg-slate-700 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="w-px h-8 bg-gray-200 dark:bg-slate-700"></div>
          <div>
            <h1 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-emerald-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></span>
              Inteligencia de Productos
            </h1>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">Auditoría y homologación de proveedores</p>
          </div>
        </div>
      </header>

      {/* MÉTRICAS RÁPIDAS (El resumen siempre visible) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-teal-100 text-teal-600 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>
          <div><p className="text-xs font-bold text-gray-400 uppercase">Productos Únicos</p><h3 className="text-2xl font-black text-gray-800">{resumen.totalProductos}</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div>
          <div><p className="text-xs font-bold text-gray-400 uppercase">Enlaces Directos</p><h3 className="text-2xl font-black text-gray-800">{resumen.totalMapeos}</h3></div>
        </div>

        {/* LA MAGIA: Este botón SOLO aparece si hay facturas nuevas sin procesar */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${resumen.pendientesVector > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${resumen.pendientesVector > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>Estado de la IA</p>
            <h3 className={`text-xl font-black ${resumen.pendientesVector > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
              {resumen.pendientesVector > 0 ? `${resumen.pendientesVector} Nuevos` : '100% Sincronizado'}
            </h3>
          </div>
          {resumen.pendientesVector > 0 && (
            <button onClick={iniciarVectorizacion} disabled={estaVectorizando} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all">
              {estaVectorizando ? 'Procesando...' : 'Vectorizar 🧠'}
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 pb-px overflow-x-auto">
        <button onClick={() => setPestañaActiva('pendientes')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'pendientes' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Auditoría de Duplicados {gruposIA.length > 0 && <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{gruposIA.length}</span>}
        </button>
        <button onClick={() => setPestañaActiva('catalogo')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'catalogo' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Catálogo Maestro
        </button>
        <button onClick={() => setPestañaActiva('proveedores')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'proveedores' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Proveedores (Filtro IA)
        </button>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: LABORATORIO DE AGRUPACIÓN MASIVA                 */}
      {/* ========================================================= */}
      {pestañaActiva === 'pendientes' && (
        <div className="animate-fade-in space-y-6">

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-800">Grupos Sugeridos</h2>
              <p className="text-sm text-gray-500 font-medium">Revisa y aprueba los nombres globales. Se guardarán para siempre.</p>
            </div>
            <button onClick={buscarGruposSimilares} disabled={escaneandoIA} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg">
              {escaneandoIA ? 'Pensando...' : '🔍 Re-Escanear Similitudes'}
            </button>
          </div>

          {gruposIA.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {gruposIA.map((grupo) => (
                <div key={grupo.id_temporal} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400"></div>

                  <div className="flex flex-col md:flex-row gap-8 ml-2">
                    {/* ZONA DE DEFINICIÓN */}
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre Global Oficial</h3>
                      <input
                        type="text"
                        value={grupo.sugerencia_nombre_global}
                        onChange={(e) => {
                          // Actualizamos el nombre en vivo mientras escribes
                          setGruposIA(prev => prev.map(g => g.id_temporal === grupo.id_temporal ? { ...g, sugerencia_nombre_global: e.target.value } : g));
                        }}
                        className="w-full text-2xl font-black bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl p-3 text-gray-800 outline-none transition-all"
                      />
                      <button
                        onClick={() => aprobarGrupo(grupo)}
                        className="mt-6 w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 transition-all font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Aprobar y Guardar Grupo
                      </button>
                    </div>

                    {/* ZONA DE ITEMS */}
                    <div className="flex-1 bg-slate-50 p-5 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-blue-100 text-blue-600 text-xs font-black px-2 py-1 rounded-md">IA</span>
                        <h4 className="font-bold text-gray-700">Encontró {grupo.items.length} coincidencias</h4>
                      </div>

                      <div className="space-y-2">
                        {grupo.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                            <span className="font-mono text-sm text-gray-600 truncate pr-4">{item.nombre}</span>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                              {Math.round(item.similitud * 100)}% Match
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
              <span className="text-6xl mb-4 block">☕</span>
              <h3 className="text-xl font-bold text-gray-500">Todo está ordenado y auditado.</h3>
              <p className="text-gray-400 mt-2">No se encontraron productos duplicados o pendientes.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: PROVEEDORES LISTA BLANCA (FILTRO IA)             */}
      {/* ========================================================= */}
      {pestañaActiva === 'proveedores' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-800">Filtro de Inteligencia Artificial</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Apaga el interruptor para grandes proveedores (Ej. Bimbo, Coca-Cola).
                <br />Atria ahorrará RAM y sus productos entrarán directo al catálogo sin perder tiempo analizando vectores.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 text-xs font-black text-gray-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">Logo</div>
              <div className="col-span-7">Proveedor / RFC</div>
              <div className="col-span-2 text-center">Facturas</div>
              <div className="col-span-2 text-center">Usar IA</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {listaFiltroProveedores.map((prov) => (
                <div key={prov.rfc} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="col-span-1 flex justify-center">
                    {prov.logo ? (
                      <img src={prov.logo} alt="logo" className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-600 rounded-lg flex items-center justify-center text-slate-400 font-bold">
                        {prov.nombre.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="col-span-7">
                    <p className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{prov.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{prov.rfc}</p>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="inline-block bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-xs">
                      {prov.metricas?.totalFacturas || 0}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        value=""
                        className="sr-only peer"
                        checked={prov.usarIA !== false} // Por defecto es true si no existe
                        onChange={() => cambiarEstadoIA(prov.nombre, prov.usarIA !== false)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              ))}

              {listaFiltroProveedores.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl block mb-2">📦</span>
                  No se encontraron proveedores
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}