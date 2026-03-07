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
    <div className="min-h-screen font-sans relative transition-all duration-500 w-full bg-transparent pt-16 md:pt-20">

      {/* BACKGROUND ORBES GLASS */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden fixed bg-gray-50 dark:bg-[#0f141e]">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[35rem] h-[35rem] bg-emerald-400/20 dark:bg-emerald-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-blue-400/10 dark:bg-blue-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-40 animate-float-slow delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={volverAlDashboard}
              className="p-2 bg-white/40 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/60 dark:hover:bg-slate-600/60 rounded-xl transition-all border border-transparent hover:border-white/50 dark:hover:border-slate-600/50"
              title="Regresar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700/50"></div>
            <div>
              <h1 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500 dark:text-emerald-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </span>
                Inteligencia de Productos
              </h1>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">Auditoría y homologación de proveedores</p>
            </div>
          </div>
        </header>

        {/* MÉTRICAS RÁPIDAS (El resumen siempre visible) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm flex items-center gap-4 transition-all hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md group">
            <div className="bg-teal-100/50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 p-3.5 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Productos Únicos</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">{resumen.totalProductos}</h3>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm flex items-center gap-4 transition-all hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md group">
            <div className="bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-3.5 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Enlaces Directos</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">{resumen.totalMapeos}</h3>
            </div>
          </div>

          {/* LA MAGIA: Este botón SOLO aparece si hay facturas nuevas sin procesar */}
          <div className={`p-5 rounded-3xl border backdrop-blur-md flex items-center justify-between transition-all group ${resumen.pendientesVector > 0 ? 'bg-orange-50/40 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/30' : 'bg-emerald-50/40 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/30'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-2xl group-hover:scale-110 transition-transform ${resumen.pendientesVector > 0 ? 'bg-orange-100/50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-100/50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                {resumen.pendientesVector > 0 ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${resumen.pendientesVector > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'}`}>Estado de la IA</p>
                <h3 className={`text-xl font-black ${resumen.pendientesVector > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {resumen.pendientesVector > 0 ? `${resumen.pendientesVector} Nuevos` : '100% Sincronizado'}
                </h3>
              </div>
            </div>
            {resumen.pendientesVector > 0 && (
              <button
                onClick={iniciarVectorizacion}
                disabled={estaVectorizando}
                className="bg-indigo-600/90 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {estaVectorizando ? 'Procesando...' : 'Vectorizar 🧠'}
              </button>
            )}
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex gap-2 mb-8 border-b border-white/20 dark:border-slate-800 pb-0 overflow-x-auto custom-scrollbar relative">
          {[
            { id: 'pendientes', label: 'Auditoría Duplicados', count: gruposIA.length, color: 'emerald' },
            { id: 'catalogo', label: 'Catálogo Maestro', color: 'indigo' },
            { id: 'proveedores', label: 'Filtro Proveedores', color: 'blue' },
            { id: 'huerfanos', label: 'Productos Pendientes', count: productosPendientes.length, color: 'orange' },
            { id: 'manual', label: 'Agrupación Manual', color: 'purple' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPestañaActiva(tab.id)}
              className={`px-6 py-3.5 font-bold text-sm whitespace-nowrap transition-all border-b-[3px] flex items-center gap-2 ${pestañaActiva === tab.id
                ? `border-${tab.color === 'emerald' ? 'emerald' : tab.color === 'orange' ? 'orange' : tab.color === 'purple' ? 'purple' : 'indigo'}-500 text-${tab.color === 'emerald' ? 'emerald' : tab.color === 'orange' ? 'orange' : tab.color === 'purple' ? 'purple' : 'indigo'}-600 dark:text-${tab.color === 'emerald' ? 'emerald' : tab.color === 'orange' ? 'orange' : tab.color === 'purple' ? 'purple' : 'indigo'}-400 bg-white/30 dark:bg-slate-800/20`
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/10'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 bg-${tab.id === 'huerfanos' ? 'orange' : 'red'}-100 dark:bg-${tab.id === 'huerfanos' ? 'orange' : 'red'}-900/40 text-${tab.id === 'huerfanos' ? 'orange' : 'red'}-600 dark:text-${tab.id === 'huerfanos' ? 'orange' : 'red'}-400 py-0.5 px-2 rounded-full text-[10px] font-black`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* VISTA 1: LABORATORIO DE AGRUPACIÓN MASIVA                 */}
        {/* ========================================================= */}
        {pestañaActiva === 'pendientes' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4 items-center transition-all">
              <div>
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Grupos Sugeridos</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-tight">Revisa y aprueba los nombres globales sugeridos por la IA.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="relative flex-1 max-w-xs group">
                  <input
                    type="text"
                    placeholder="Buscar producto o RFC..."
                    value={busquedaDuplicados}
                    onChange={(e) => setBusquedaDuplicados(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 absolute left-3 top-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <button onClick={buscarGruposSimilares} disabled={escaneandoIA} className="bg-indigo-600/90 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap">
                  {escaneandoIA ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : '🔍 Re-Escanear'}
                </button>
              </div>
            </div>

            {gruposIAFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {gruposIAFiltrados.map((grupo) => (
                  <div key={grupo.id_temporal} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 border border-emerald-500/30 shadow-sm relative overflow-hidden group/card transition-all hover:bg-white/50 dark:hover:bg-slate-800/50">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400/80"></div>

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
                          title="Haz clic aquí para modificar el nombre que sugirió la IA"
                          onChange={(e) => {
                            setGruposIA(prev => prev.map(g => g.id_temporal === grupo.id_temporal ? { ...g, sugerencia_nombre_global: e.target.value } : g));
                          }}
                          className="w-full text-xl font-black bg-white/50 dark:bg-slate-900/50 border-2 border-white/20 dark:border-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl p-3 text-gray-800 dark:text-white outline-none transition-all shadow-inner focus:bg-emerald-50/10"
                        />
                        <button
                          onClick={() => aprobarGrupo(grupo)}
                          className="mt-6 w-full bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Aprobar y Guardar Grupo
                        </button>
                      </div>

                      {/* ZONA DE ITEMS */}
                      <div className="flex-[1.5] bg-white/20 dark:bg-slate-900/30 backdrop-blur-sm p-5 rounded-2xl border border-white/20 dark:border-slate-800/50">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-black px-2 py-1 rounded-md transition-colors">IA</span>
                          <h4 className="font-bold text-gray-700 dark:text-gray-300 transition-colors">Encontró {grupo.items.length} coincidencias</h4>
                        </div>

                        <div className="space-y-3">
                          {grupo.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-white/20 dark:border-slate-700/50 relative group transition-all hover:bg-white/60 dark:hover:bg-slate-800/60">

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
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative overflow-hidden transition-all">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500/80"></div>
              <div className="ml-2">
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Catálogo Maestro</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-tight">La verdad de tu inventario. Homologa tus productos de forma global.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="relative flex-1 max-w-xs group">
                  <input
                    type="text"
                    placeholder="Buscar producto o proveedor..."
                    value={busquedaCatalogo}
                    onChange={(e) => setBusquedaCatalogo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 absolute left-3 top-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <button onClick={cargarCatalogoMaestro} disabled={estaCargando} className="bg-white/40 dark:bg-slate-700/50 text-indigo-600 dark:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-600/60 p-2 px-4 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <svg className={`w-5 h-5 ${estaCargando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Recargar
                </button>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 overflow-hidden divide-y divide-white/20 dark:divide-slate-700/50 transition-all">
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
                      <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border-t border-white/20 dark:border-slate-700/50 p-6 shadow-inner transition-all">
                        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Orígenes del Producto</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {maestro.hijos.map((hijo, index) => (
                            <div key={index} className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-2xl border border-white/30 dark:border-slate-700/50 shadow-sm flex items-center justify-between group/hijo hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all">
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
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4 items-center transition-all">
              <div>
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Filtro de Inteligencia Artificial</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-tight">Optimiza el rendimiento apagando la IA para proveedores conocidos.</p>
              </div>
              <div className="flex justify-end">
                <div className="relative w-full max-w-sm group">
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={busquedaListaFiltro}
                    onChange={(e) => setBusquedaListaFiltro(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 absolute left-3 top-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 overflow-hidden transition-all">
              <div className="grid grid-cols-12 gap-4 p-5 bg-white/30 dark:bg-slate-900/30 border-b border-white/20 dark:border-slate-700/50 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                <div className="col-span-1 text-center">Logo</div>
                <div className="col-span-7">Proveedor / RFC</div>
                <div className="col-span-2 text-center">Facturas</div>
                <div className="col-span-2 text-center">Usar IA</div>
              </div>

              <div className="divide-y divide-white/10 dark:divide-slate-700/50 transition-all">
                {listaFiltroProveedoresFiltrados.map((prov) => (
                  <div key={prov.rfc} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-white/20 dark:hover:bg-slate-700/20 transition-all group">
                    <div className="col-span-1 flex justify-center">
                      {prov.logo ? (
                        <img src={prov.logo} alt="logo" className="w-10 h-10 object-contain rounded-xl shadow-sm bg-white p-1" />
                      ) : (
                        <div className="w-10 h-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border border-white/50 dark:border-slate-700/50 transition-all group-hover:scale-110">
                          {prov.nombre.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="col-span-7">
                      <p className="font-bold text-gray-800 dark:text-white text-sm md:text-base group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">{prov.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{prov.rfc}</p>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="inline-block bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-600 dark:text-indigo-300 font-black px-3 py-1 rounded-full text-xs border border-white/50 dark:border-slate-600/50 transition-all">
                        {prov.metricas?.totalFacturas || 0}
                      </span>
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          value=""
                          className="sr-only peer"
                          checked={prov.usarIA !== false}
                          onChange={() => cambiarEstadoIA(prov.nombre, prov.usarIA !== false)}
                        />
                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 transition-all shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ========================================================= */}
        {/* VISTA 4: PRODUCTOS PENDIENTES (HUÉRFANOS)                 */}
        {/* ========================================================= */}
        {pestañaActiva === 'huerfanos' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative overflow-hidden transition-all">
              <div className="absolute top-0 left-0 w-2 h-full bg-orange-500/80"></div>
              <div className="ml-2">
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Restauración y Cajas Asiladas</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-tight">
                  Productos desvinculados o que no lograron enlazarse automáticamente.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="relative w-full max-w-xs group">
                  <input
                    type="text"
                    placeholder="Buscar pendiente..."
                    value={busquedaPendientes}
                    onChange={(e) => setBusquedaPendientes(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <svg className="w-4 h-4 text-orange-400 group-focus-within:text-orange-500 absolute left-3 top-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <button onClick={cargarProductosPendientes} disabled={estaCargando} className="bg-white/40 dark:bg-slate-700/50 text-orange-600 dark:text-orange-400 hover:bg-white/60 dark:hover:bg-slate-600/60 p-2 px-4 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <svg className={`w-5 h-5 ${estaCargando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Recargar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {productosPendientesFiltrados.length > 0 ? (
                productosPendientesFiltrados.map(producto => (
                  <div key={producto.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white/50 dark:border-slate-700/50 flex justify-between items-center group transition-all hover:bg-white/50 dark:hover:bg-slate-800/50">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-bold text-gray-800 dark:text-white truncate text-lg">{producto.nombre_limpio}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 border border-white/50 dark:border-slate-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 transition-all">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                          {producto.rfc_proveedor}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => aprobarProductoIndividual(producto.id)}
                      className="shrink-0 bg-orange-600/90 hover:bg-orange-600 text-white shadow-lg shadow-orange-600/20 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Aprobar Único
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-md border-2 border-dashed border-white/30 dark:border-slate-700/50 rounded-3xl transition-all">
                  <span className="text-6xl mb-4 block opacity-80">🧹</span>
                  <h3 className="text-xl font-bold text-gray-500 dark:text-slate-400">Todo limpio</h3>
                  <p className="text-gray-400 dark:text-slate-500 mt-2">No hay productos huérfanos pendientes.</p>
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
            <div className="w-full lg:w-1/2 flex flex-col h-[700px]">
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-t-3xl shadow-sm border border-white/50 dark:border-slate-700/50 border-b-0 transition-all">
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Almacén General</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-4">Selecciona los productos para fusionar.</p>

                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Buscar pendiente..."
                    value={busquedaManual}
                    onChange={(e) => setBusquedaManual(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <svg className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 absolute left-3 top-3.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-slate-900/30 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 rounded-b-3xl shadow-sm overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar transition-all">
                {almacenfParaAgrupacionManual.length > 0 ? (
                  almacenfParaAgrupacionManual.map(producto => (
                    <div key={producto.id} className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-2xl border border-white/30 dark:border-slate-700/50 shadow-sm flex items-center justify-between group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm truncate">{producto.nombre_limpio}</h3>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1 font-mono">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                          {producto.rfc_proveedor}
                        </div>
                      </div>
                      <button
                        onClick={() => agregarAlAgrupadorManual(producto)}
                        className="bg-purple-600/90 hover:bg-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-purple-600/20 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-60">
                    <p className="text-sm font-bold text-gray-500 dark:text-slate-500 tracking-tight">Cero resultados</p>
                  </div>
                )}
              </div>
            </div>

            {/* PANEL DERECHO: CONSTRUCTOR DE GRUPO (CESTA) */}
            <div className="w-full lg:w-1/2 flex flex-col h-[700px]">
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 flex-1 flex flex-col relative overflow-hidden transition-all">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/80"></div>

                <div className="ml-2 flex flex-col h-full">
                  <header className="mb-6">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white mb-1">Cesta de Integración</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-medium tracking-tight">Asigna un nombre oficial al grupo.</p>
                  </header>

                  {/* ZONA DE DEFINICIÓN DEL NOMBRE */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Nombre Global Maestro</h3>
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black px-2 py-0.5 rounded-full flex items-center gap-1 transition-all">
                        <svg className="w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        Editable
                      </span>
                    </div>
                    <input
                      type="text"
                      value={grupoManualNombre}
                      onChange={(e) => setGrupoManualNombre(e.target.value)}
                      placeholder="Ej. PRODUCTO GENERAL X"
                      className="w-full text-xl font-black bg-white/50 dark:bg-slate-900/50 border-2 border-white/20 dark:border-slate-700/50 focus:border-purple-500 focus:bg-purple-100/10 rounded-xl p-3.5 text-gray-800 dark:text-white outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* CESTA DE ELEMENTOS */}
                  <div className="flex-1 border-2 border-dashed border-white/30 dark:border-slate-700/50 rounded-2xl bg-white/10 dark:bg-slate-900/10 p-4 mb-6 overflow-y-auto custom-scrollbar transition-all">
                    {grupoManualItems.length > 0 ? (
                      <div className="space-y-3">
                        {grupoManualItems.map(item => (
                          <div key={item.id} className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-white/20 dark:border-slate-700/50 shadow-sm flex items-center justify-between animate-fade-in-up transition-all">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-mono text-sm text-gray-700 dark:text-gray-200 font-bold truncate">{item.nombre_limpio}</p>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                {item.rfc_proveedor}
                              </span>
                            </div>
                            <button
                              onClick={() => quitarDelAgrupadorManual(item.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        <p className="font-bold text-center">Cesta Vacía</p>
                        <p className="text-[10px] mt-1 text-center font-black uppercase tracking-widest">Añade 2+ productos</p>
                      </div>
                    )}
                  </div>

                  {/* ACCIÓN FINAL */}
                  <button
                    onClick={construirGrupoManual}
                    disabled={estaCargando || grupoManualItems.length < 2 || !grupoManualNombre.trim()}
                    className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${grupoManualItems.length >= 2 && grupoManualNombre.trim() && !estaCargando
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30'
                      : 'bg-white/10 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-white/20 dark:border-slate-700/50'
                      }`}
                  >
                    {estaCargando ? <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Construir Catálogo Maestro'}
                  </button>
                  <p className="text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-4">
                    Acción Permanente (Deshacer en Catálogo)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
