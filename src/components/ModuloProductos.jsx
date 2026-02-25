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

  // NUEVOS ESTADOS PARA PRODUCTOS HUÉRFANOS/PENDIENTES
  const [productosPendientes, setProductosPendientes] = useState([]);

  // 1. Al abrir el módulo, leemos el estado actual del catálogo automáticamente
  useEffect(() => {
    cargarEstadoActual();
  }, []);

  // Escuchar cuando el usuario cambia a la pestaña de huérfanos
  useEffect(() => {
    if (pestañaActiva === 'huerfanos') {
      cargarProductosPendientes();
    }
  }, [pestañaActiva]);

  const cargarProductosPendientes = async () => {
    setEstaCargando(true);
    try {
      const data = await ipcRenderer.invoke('obtener-productos-pendientes');
      if (data.success) {
        setProductosPendientes(data.productos);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEstaCargando(false);
    }
  };

  const aprobarProductoIndividual = async (idProducto) => {
    try {
      setEstaCargando(true);
      const res = await ipcRenderer.invoke('aprobar-producto-individual', idProducto);
      if (res.success) {
        // Quitarlo inmediatamente de la lista visual
        setProductosPendientes(prev => prev.filter(p => p.id !== idProducto));
        await cargarEstadoActual(); // Refrescar métricas
      } else {
        alert("Error al aprobar: " + res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEstaCargando(false);
    }
  };

  // Escuchar cuando el usuario cambia a la pestaña de proveedores
  useEffect(() => {
    if (pestañaActiva === 'proveedores' && listaFiltroProveedores.length === 0) {
      cargarProveedoresBD();
    }
  }, [pestañaActiva]);

  // Escuchar cuando el usuario cambia a la pestaña de catálogo maestro
  useEffect(() => {
    if (pestañaActiva === 'catalogo' && catalogoMaestro.length === 0) {
      cargarCatalogoMaestro();
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

  // NUEVO ESTADO PARA EL CATÁLOGO MAESTRO (FASE 7)
  const [catalogoMaestro, setCatalogoMaestro] = useState([]);
  const [productoExpandido, setProductoExpandido] = useState(null); // Para el acordeón

  const cargarCatalogoMaestro = async () => {
    setEstaCargando(true);
    try {
      const data = await ipcRenderer.invoke('obtener-catalogo-agrupado');
      if (data.success) {
        setCatalogoMaestro(data.catalogo);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEstaCargando(false);
    }
  };

  const desagruparProductoIndividual = async (rfc_proveedor, nombre_en_xml) => {
    if (!confirm("¿Estás seguro de desvincular este producto? Volverá a la bandeja de pendientes.")) return;

    setEstaCargando(true);
    try {
      const resp = await ipcRenderer.invoke('desagrupar-producto', { rfc_proveedor, nombre_en_xml });
      if (resp.success) {
        // Recargar el catálogo directamente
        await cargarCatalogoMaestro();
        await cargarEstadoActual(); // Recargar métricas superiores
      } else {
        alert("Error al desagrupar: " + resp.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEstaCargando(false);
    }
  };

  // NUEVOS ESTADOS PARA LOS BUSCADORES (FASE 9)
  const [busquedaDuplicados, setBusquedaDuplicados] = useState('');
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [busquedaListaFiltro, setBusquedaListaFiltro] = useState('');
  const [busquedaPendientes, setBusquedaPendientes] = useState('');

  // ESTADOS PARA AGRUPACIÓN MANUAL (FASE 12)
  const [busquedaManual, setBusquedaManual] = useState('');
  const [grupoManualNombre, setGrupoManualNombre] = useState('');
  const [grupoManualItems, setGrupoManualItems] = useState([]);

  // FILTROS REACTIVOS ANTES DEL RENDER
  const gruposIAFiltrados = gruposIA.filter(g =>
    g.sugerencia_nombre_global.toLowerCase().includes(busquedaDuplicados.toLowerCase()) ||
    g.items.some(i => i.nombre.toLowerCase().includes(busquedaDuplicados.toLowerCase()) || i.rfc_proveedor.toLowerCase().includes(busquedaDuplicados.toLowerCase()))
  );

  const catalogoMaestroFiltrado = catalogoMaestro.filter(m =>
    m.nombre_global.toLowerCase().includes(busquedaCatalogo.toLowerCase()) ||
    m.hijos.some(h => h.nombre_en_xml.toLowerCase().includes(busquedaCatalogo.toLowerCase()) || h.rfc_proveedor.toLowerCase().includes(busquedaCatalogo.toLowerCase()))
  );

  const listaFiltroProveedoresFiltrados = listaFiltroProveedores.filter(p =>
    p.nombre.toLowerCase().includes(busquedaListaFiltro.toLowerCase()) ||
    p.rfc.toLowerCase().includes(busquedaListaFiltro.toLowerCase())
  );

  const productosPendientesFiltrados = productosPendientes.filter(p =>
    p.nombre_limpio.toLowerCase().includes(busquedaPendientes.toLowerCase()) ||
    p.rfc_proveedor.toLowerCase().includes(busquedaPendientes.toLowerCase())
  );

  const almacenfParaAgrupacionManual = productosPendientes.filter(p => !grupoManualItems.some(item => item.id === p.id)).filter(p =>
    p.nombre_limpio.toLowerCase().includes(busquedaManual.toLowerCase()) ||
    p.rfc_proveedor.toLowerCase().includes(busquedaManual.toLowerCase())
  );

  // Funciones Agrupador Manual
  const agregarAlAgrupadorManual = (producto) => {
    // Regla de canibalismo manual (opcional, pero buena práctica)
    if (grupoManualItems.some(i => i.rfc_proveedor === producto.rfc_proveedor)) {
      alert("No puedes agregar dos productos del mismo proveedor a un mismo grupo.");
      return;
    }
    setGrupoManualItems(prev => [...prev, producto]);
  };

  const quitarDelAgrupadorManual = (productoId) => {
    setGrupoManualItems(prev => prev.filter(i => i.id !== productoId));
  };

  const construirGrupoManual = async () => {
    if (!grupoManualNombre.trim() || grupoManualItems.length < 2) {
      alert("Debes escribir un Nombre Global y agregar al menos 2 productos a la cesta.");
      return;
    }
    setEstaCargando(true);
    try {
      const idsSeleccionados = grupoManualItems.map(i => i.id);
      const res = await ipcRenderer.invoke('aprobar-grupo-productos', {
        nombreGlobal: grupoManualNombre.trim(),
        idsSeleccionados
      });

      if (res.success) {
        setGrupoManualItems([]);
        setGrupoManualNombre('');
        setBusquedaManual('');
        // Recargar datos
        await cargarProductosPendientes();
        await cargarCatalogoMaestro();
        await cargarEstadoActual();
        alert("¡Grupo Manual creado con éxito en el Catálogo!");
      } else {
        alert("Error al construir grupo: " + res.error);
      }
    } catch (e) {
      console.error(e);
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

  // 5. Función para expulsar un ítem de un grupo temporalmente
  const expulsarProductoDeGrupo = async (grupoId, itemId) => {
    // UI update instantáneo 
    setGruposIA(prev => prev.map(grupo => {
      if (grupo.id_temporal === grupoId) {
        return {
          ...grupo,
          items: grupo.items.filter(item => item.id !== itemId)
        };
      }
      return grupo;
    }).filter(grupo => grupo.items.length > 1)); // Si el grupo se queda de 1, desaparece

    // Backend real call
    try {
      const resp = await ipcRenderer.invoke('expulsar-producto-grupo', itemId);
      if (!resp.success) alert("Error al expulsar: " + resp.error);
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
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>
          <div><p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Productos Únicos</p><h3 className="text-2xl font-black text-gray-800 dark:text-white">{resumen.totalProductos}</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div>
          <div><p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Enlaces Directos</p><h3 className="text-2xl font-black text-gray-800 dark:text-white">{resumen.totalMapeos}</h3></div>
        </div>

        {/* LA MAGIA: Este botón SOLO aparece si hay facturas nuevas sin procesar */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors duration-300 ${resumen.pendientesVector > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30'}`}>
          <div>
            <p className={`text-xs font-bold uppercase ${resumen.pendientesVector > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'}`}>Estado de la IA</p>
            <h3 className={`text-xl font-black ${resumen.pendientesVector > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
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
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 pb-px overflow-x-auto transition-colors duration-300">
        <button onClick={() => setPestañaActiva('pendientes')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'pendientes' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Auditoría de Duplicados {gruposIA.length > 0 && <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs dark:bg-red-900/30 dark:text-red-400">{gruposIA.length}</span>}
        </button>
        <button onClick={() => setPestañaActiva('catalogo')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'catalogo' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Catálogo Maestro
        </button>
        <button onClick={() => setPestañaActiva('proveedores')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'proveedores' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Proveedores (Filtro IA)
        </button>
        <button onClick={() => setPestañaActiva('huerfanos')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'huerfanos' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Pendientes (Sin Agrupar) {productosPendientes.length > 0 && <span className="ml-2 bg-orange-100 text-orange-600 py-0.5 px-2 rounded-full text-xs dark:bg-orange-900/30 dark:text-orange-400">{productosPendientes.length}</span>}
        </button>
        <button onClick={() => setPestañaActiva('manual')} className={`px-5 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-all ${pestañaActiva === 'manual' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Agrupación Manual
        </button>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: LABORATORIO DE AGRUPACIÓN MASIVA                 */}
      {/* ========================================================= */}
      {pestañaActiva === 'pendientes' && (
        <div className="animate-fade-in space-y-6">

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 items-center transition-colors duration-300">
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Grupos Sugeridos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Revisa y aprueba los nombres globales. Se guardarán para siempre.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar producto o RFC..."
                  value={busquedaDuplicados}
                  onChange={(e) => setBusquedaDuplicados(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 dark:text-white transition-colors"
                />
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <button onClick={buscarGruposSimilares} disabled={escaneandoIA} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm whitespace-nowrap">
                {escaneandoIA ? 'Pensando...' : '🔍 Re-Escanear'}
              </button>
            </div>
          </div>

          {gruposIAFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {gruposIAFiltrados.map((grupo) => (
                <div key={grupo.id_temporal} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400"></div>

                  <div className="flex flex-col md:flex-row gap-8 ml-2">
                    {/* ZONA DE DEFINICIÓN */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nombre Global Oficial</h3>
                        <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          Editable
                        </span>
                      </div>
                      <input
                        type="text"
                        value={grupo.sugerencia_nombre_global}
                        title="Haz clic aquí para borrar o modificar el nombre que sugirió la IA"
                        onChange={(e) => {
                          // Actualizamos el nombre en vivo mientras escribes
                          setGruposIA(prev => prev.map(g => g.id_temporal === grupo.id_temporal ? { ...g, sugerencia_nombre_global: e.target.value } : g));
                        }}
                        className="w-full text-xl font-black bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/50 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-xl p-3 text-gray-800 dark:text-white outline-none transition-all shadow-inner focus:bg-emerald-50 dark:focus:bg-emerald-900/10"
                      />
                      <button
                        onClick={() => aprobarGrupo(grupo)}
                        className="mt-6 w-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 border border-emerald-200 dark:border-emerald-800/50 transition-all font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Aprobar y Guardar Grupo
                      </button>
                    </div>

                    {/* ZONA DE ITEMS */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-black px-2 py-1 rounded-md transition-colors">IA</span>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 transition-colors">Encontró {grupo.items.length} coincidencias</h4>
                      </div>

                      <div className="space-y-2">
                        {grupo.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 relative group transition-all hover:border-gray-300 dark:hover:border-slate-500">

                            {/* TEXTOS Y PROVEEDOR */}
                            <div className="flex flex-col flex-1 min-w-0 pr-4">
                              <span className="font-mono text-sm text-gray-800 dark:text-gray-200 font-bold truncate transition-colors">{item.nombre}</span>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 truncate flex items-center gap-1 transition-colors" title="RFC o Nombre del Proveedor de Origen">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                {item.rfc_proveedor || 'Desconocido'}
                              </span>
                            </div>

                            {/* MATCH Y BOTONES MÁGICOS */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 px-2 py-1 rounded-full whitespace-nowrap shadow-sm transition-colors">
                                {Math.round(item.similitud * 100)}% Match
                              </span>
                              <button
                                onClick={() => expulsarProductoDeGrupo(grupo.id_temporal, item.id)}
                                title="Desvincular producto de este grupo"
                                className="text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 -mr-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl transition-colors">
              <span className="text-6xl mb-4 block opacity-80">☕</span>
              <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">Todo está ordenado y auditado.</h3>
              <p className="text-gray-400 dark:text-gray-500 mt-2">No se encontraron productos duplicados o pendientes.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: CATÁLOGO MAESTRO (AGRUPADO)                      */}
      {/* ========================================================= */}
      {pestañaActiva === 'catalogo' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400 dark:bg-blue-500"></div>
            <div className="ml-2">
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Catálogo Maestro</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                La fuente de la verdad para tu inventario. Haz clic en un producto para ver qué elementos lo componen <br />
                y de qué proveedores provienen. Puedes desvincularlos si hubo un error.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar producto o proveedor..."
                  value={busquedaCatalogo}
                  onChange={(e) => setBusquedaCatalogo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 dark:text-white transition-colors"
                />
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <button onClick={cargarCatalogoMaestro} disabled={estaCargando} className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm whitespace-nowrap">
                <svg className={`w-5 h-5 ${estaCargando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Recargar
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700 transition-colors duration-300">
            {catalogoMaestroFiltrado.length > 0 ? (
              catalogoMaestroFiltrado.map((maestro) => (
                <div key={maestro.id_maestro} className="flex flex-col transition-all">

                  {/* CABECERA DEL ACORDEÓN */}
                  <div
                    onClick={() => setProductoExpandido(productoExpandido === maestro.id_maestro ? null : maestro.id_maestro)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg transition-colors ${productoExpandido === maestro.id_maestro ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'}`}>
                        <svg className={`w-5 h-5 transition-transform ${productoExpandido === maestro.id_maestro ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{maestro.nombre_global}</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Contiene {maestro.hijos.length} sub-productos sincronizados</p>
                      </div>
                    </div>
                  </div>

                  {/* CONTENIDO DEL ACORDEÓN (LOS HIJOS) */}
                  {productoExpandido === maestro.id_maestro && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700/50 p-6 shadow-inner transition-colors duration-300">
                      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Orígenes del Producto</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {maestro.hijos.map((hijo, index) => (
                          <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between group/hijo hover:border-blue-300 dark:hover:border-blue-500/50 transition-all">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-mono text-sm text-gray-700 dark:text-gray-200 font-bold truncate" title={hijo.nombre_en_xml}>
                                {hijo.nombre_en_xml}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                {hijo.rfc_proveedor}
                              </div>
                            </div>

                            {/* BOTÓN DESVINCULAR */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                desagruparProductoIndividual(hijo.rfc_proveedor, hijo.nombre_en_xml);
                              }}
                              title="Separar este producto de este grupo maestro"
                              className="text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all opacity-0 group-hover/hijo:opacity-100 shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <span className="text-4xl block mb-2 opacity-80">📚</span>
                <p className="font-medium">El Catálogo Maestro está vacío</p>
                <p className="text-xs opacity-70 mt-1">Acumula y aprueba grupos en la Auditoría para llenar este catálogo coordinado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: PROVEEDORES LISTA BLANCA (FILTRO IA)             */}
      {/* ========================================================= */}
      {pestañaActiva === 'proveedores' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 items-center transition-colors duration-300">
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Filtro de Inteligencia Artificial</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                Apaga el interruptor para grandes proveedores (Ej. Bimbo, Coca-Cola).
                <br />Atria ahorrará RAM y sus productos entrarán directo al catálogo sin perder tiempo analizando vectores.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="relative w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Buscar proveedor..."
                  value={busquedaListaFiltro}
                  onChange={(e) => setBusquedaListaFiltro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-500 transition-colors"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">
              <div className="col-span-1 text-center">Logo</div>
              <div className="col-span-7">Proveedor / RFC</div>
              <div className="col-span-2 text-center">Facturas</div>
              <div className="col-span-2 text-center">Usar IA</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700 transition-colors">
              {listaFiltroProveedoresFiltrados.map((prov) => (
                <div key={prov.rfc} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="col-span-1 flex justify-center">
                    {prov.logo ? (
                      <img src={prov.logo} alt="logo" className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold transition-colors">
                        {prov.nombre.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="col-span-7">
                    <p className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{prov.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{prov.rfc}</p>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-xs transition-colors">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500 transition-colors"></div>
                    </label>
                  </div>
                </div>
              ))}

              {listaFiltroProveedores.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
                  <span className="text-4xl block mb-2 opacity-80">📦</span>
                  No se encontraron proveedores
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 4: PRODUCTOS PENDIENTES (HUÉRFANOS)                 */}
      {/* ========================================================= */}
      {pestañaActiva === 'huerfanos' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-400 dark:bg-orange-500"></div>
            <div className="ml-2">
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Restauración y Cajas Asiladas</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                Productos que fueron expulsados (desvinculados) o que no lograron enlazarse.
                <br />Puedes unirlos manualmente a un grupo existente o asimilarlos como un producto único permanente.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar pendiente..."
                  value={busquedaPendientes}
                  onChange={(e) => setBusquedaPendientes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-orange-50/30 dark:bg-slate-900 border border-orange-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 dark:text-white transition-colors"
                />
                <svg className="w-4 h-4 text-orange-400 dark:text-orange-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <button onClick={cargarProductosPendientes} disabled={estaCargando} className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
                <svg className={`w-5 h-5 ${estaCargando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Recargar lista
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {productosPendientes.length > 0 ? (
              productosPendientes.map(producto => (
                <div key={producto.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-orange-300 dark:hover:border-orange-500/50">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-bold text-gray-800 dark:text-white truncate text-lg">{producto.nombre_limpio}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <svg className="w-3 h-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        {producto.rfc_proveedor}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => aprobarProductoIndividual(producto.id)}
                    className="shrink-0 bg-white dark:bg-slate-800 border-2 border-orange-500 dark:border-orange-500/50 text-orange-500 hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Aprobar como Único
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl transition-colors">
                <span className="text-6xl mb-4 block opacity-80">🧹</span>
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">Nada pendiente en la bandeja.</h3>
                <p className="text-gray-400 dark:text-gray-500 mt-2">No hay productos huérfanos rezagados por ahora.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 5: AGRUPACIÓN MANUAL (CREADOR DE GRUPOS CUSTOM)     */}
      {/* ========================================================= */}
      {pestañaActiva === 'manual' && (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-6">

          {/* PANEL IZQUIERDO: ALMACÉN (BUSCADOR DE PENDIENTES) */}
          <div className="w-full lg:w-1/2 flex flex-col max-h-[800px]">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-t-3xl shadow-sm border border-gray-100 dark:border-slate-700 border-b-0 transition-colors duration-300">
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Almacén General</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4">Busca los productos que deseas fusionar en un mismo grupo maestro.</p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar 'Chamorro', 'Chamberete'..."
                  value={busquedaManual}
                  onChange={(e) => setBusquedaManual(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 dark:text-white transition-colors shadow-inner"
                />
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-b-3xl shadow-sm overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar transition-colors duration-300">
              {almacenfParaAgrupacionManual.length > 0 ? (
                almacenfParaAgrupacionManual.map(producto => (
                  <div key={producto.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-purple-300 dark:hover:border-purple-500/50 transition-all">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-bold text-gray-800 dark:text-white text-sm truncate" title={producto.nombre_limpio}>{producto.nombre_limpio}</h3>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                        <svg className="w-3 h-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        {producto.rfc_proveedor}
                      </div>
                    </div>
                    <button
                      onClick={() => agregarAlAgrupadorManual(producto)}
                      className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white p-2 rounded-lg transition-all border border-transparent hover:border-purple-500"
                      title="Agregar a la Cesta"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-60">
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No hay resultados en el almacén.</p>
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO: CONSTRUCTOR DE GRUPO (CESTA) */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-slate-700 flex-1 flex flex-col relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>

              <div className="ml-2 flex flex-col h-full">
                <h2 className="text-xl font-black text-gray-800 dark:text-white mb-1">Cesta de Integración</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6">Asigna un nombre general y agrega productos del panel izquierdo.</p>

                {/* ZONA DE DEFINICIÓN DEL NOMBRE */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nombre Global Oficial</h3>
                    <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    value={grupoManualNombre}
                    onChange={(e) => setGrupoManualNombre(e.target.value)}
                    placeholder="Ej. CORTE DE CARNE CHAMORRO"
                    className="w-full text-xl font-black bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:bg-purple-50 dark:focus:bg-purple-900/10 rounded-xl p-3 text-gray-800 dark:text-white outline-none transition-all shadow-inner"
                  />
                </div>

                {/* CESTA DE ELEMENTOS */}
                <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 p-4 mb-6 overflow-y-auto max-h-[400px] transition-colors duration-300">
                  {grupoManualItems.length > 0 ? (
                    <div className="space-y-3">
                      {grupoManualItems.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm flex items-center justify-between animate-fade-in-up transition-colors">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-mono text-sm text-gray-700 dark:text-gray-200 font-bold truncate" title={item.nombre_limpio}>{item.nombre_limpio}</p>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                              <svg className="w-3 h-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                              {item.rfc_proveedor}
                            </span>
                          </div>
                          <button
                            onClick={() => quitarDelAgrupadorManual(item.id)}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all shrink-0"
                            title="Remover de la cesta"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-50 py-10 transition-opacity">
                      <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      <p className="text-gray-500 dark:text-gray-400 font-bold text-center">La cesta está vacía</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] text-center">Añade al menos 2 productos del panel izquierdo.</p>
                    </div>
                  )}
                </div>

                {/* ACCIÓN FINAL */}
                <button
                  onClick={construirGrupoManual}
                  disabled={estaCargando || grupoManualItems.length < 2 || !grupoManualNombre.trim()}
                  className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-md ${grupoManualItems.length >= 2 && grupoManualNombre.trim() && !estaCargando
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {estaCargando ? 'Guardando en la Bóveda...' : 'Construir y Enviar al Catálogo'}
                </button>
                <p className="text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-4 transition-colors">
                  Acción Permanente (Deshacer en Catálogo)
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}