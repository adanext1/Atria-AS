import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

// --- MINI-COMPONENTE: TOOLTIP (Letrero flotante ARRIBA del ratón) ---
const Tooltip = ({ children, texto, anchoTotal = false }) => (
  <div className={`relative group/tooltip ${anchoTotal ? 'block w-full' : 'inline-flex w-full sm:w-auto'}`}>
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[220px] bg-slate-900 dark:bg-black text-white text-[11px] font-medium px-3 py-2 rounded-xl shadow-xl z-50 text-center leading-tight whitespace-normal opacity-0 group-hover/tooltip:opacity-100 group-hover:animate-fade-in-up transition-opacity pointer-events-none border border-slate-700">
      {texto}
      {/* El triangulito que apunta hacia abajo */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-black"></div>
    </div>
  </div>
);

export default function Proveedores({ alVolver, modoOscuro, toggleTema, irANuevoProveedor, irAEditarProveedor, irADetalleProveedor }) {

  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('Todos'); // NUEVO ESTADO: Filtro por categorías
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      const datosReales = await ipcRenderer.invoke('obtener-proveedores');
      setProveedores(datosReales);
      setCargando(false);
    };
    cargarDatos();
  }, []);

  // --- LÓGICA DE PERSISTENCIA DE SCROLL ---
  useEffect(() => {
    if (!cargando) {
      const scrollGuardado = localStorage.getItem('scrollPosProveedores');
      if (scrollGuardado) {
        // Un pequeño delay asegura que el navegador haya terminado de renderizar el layout
        setTimeout(() => {
          window.scrollTo({ top: parseInt(scrollGuardado), behavior: 'instant' });
        }, 50);
      }
    }
  }, [cargando]);

  useEffect(() => {
    const guardarScroll = () => {
      // Guardamos la posición actual cada vez que el usuario mueve la rueda
      localStorage.setItem('scrollPosProveedores', window.scrollY.toString());
    };

    window.addEventListener('scroll', guardarScroll);
    return () => window.removeEventListener('scroll', guardarScroll);
  }, []);

  const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);

  // --- LÓGICA DE FILTROS MEJORADA (Búsqueda + Categoría) ---
  const proveedoresFiltrados = proveedores.filter((prov) => {
    const coincideTexto = prov.nombre.toLowerCase().includes(busqueda.toLowerCase()) || prov.rfc.toLowerCase().includes(busqueda.toLowerCase());
    const grupoProv = prov.grupo || 'Sin agrupar';
    const coincideGrupo = filtroGrupo === 'Todos' || grupoProv === filtroGrupo;
    return coincideTexto && coincideGrupo;
  });

  // Extraer los grupos únicos para llenar el desplegable automáticamente
  const gruposUnicos = ['Todos', ...new Set(proveedores.map(p => p.grupo || 'Sin agrupar'))].filter(g => g);

  const totalHistoricoGeneral = proveedores.reduce((suma, prov) => suma + (prov.metricas?.comprasHistoricas || 0), 0);

  const obtenerColorAvatar = (letra) => {
    const colores = [
      'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
      'from-purple-400 to-purple-600', 'from-orange-400 to-orange-600',
      'from-pink-400 to-pink-600', 'from-teal-400 to-teal-600'
    ];
    return colores[letra.charCodeAt(0) % colores.length];
  };
  const diasMapa = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoy = diasMapa[new Date().getDay()];
  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto pb-20 relative overflow-x-hidden">

      {/* Elementos decorativos de fondo (Glassmorphism orbs) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
        <div className="absolute top-1/2 left-10 w-[24rem] h-[24rem] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-fuchsia-400/20 dark:bg-fuchsia-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow delay-2000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center mb-8">
        {/* Botón de regreso integrado tipo floating icon */}
        <div className="w-full flex justify-start mb-4">
          <button
            onClick={alVolver}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 dark:border-slate-600/40 transition-all hover:scale-105 hover:shadow-md text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="font-bold text-sm">Volver al Centro de Control</span>
          </button>
        </div>

        {/* PANEL DE RESUMEN GLOBAL GLASSMORPHISM */}
        <div className="w-full animate-fade-in-up bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-8 lg:p-10 shadow-lg border border-white/50 dark:border-slate-700/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent dark:from-white/5 dark:to-transparent opacity-100 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
            <div className="flex items-start gap-5">
              <div className="inline-flex items-center justify-center p-4 bg-purple-100/50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-3xl shadow-sm border border-purple-200/50 dark:border-purple-500/30">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-800 dark:text-white tracking-tight leading-tight">Directorio de<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">Proveedores</span></h2>
                <p className="text-gray-500 dark:text-slate-400 mt-3 text-base lg:text-lg max-w-xl font-medium leading-relaxed">
                  Administra las empresas que te facturan. Revisa su historial, agrupa sus productos y controla los pagos pendientes.
                </p>
              </div>
            </div>

            {!cargando && proveedores.length > 0 && (
              <div className="flex gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                <Tooltip texto="Suma histórica de todas las compras de todos los proveedores juntos.">
                  <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-6 py-4 rounded-[1.5rem] border border-white/60 dark:border-slate-700/60 shadow-md min-w-[180px] flex-shrink-0 cursor-help transform transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-white/90 dark:hover:bg-slate-800/80">
                    <p className="text-xs uppercase font-black tracking-widest text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Total Histórico
                    </p>
                    <p className="text-2xl font-black text-purple-700 dark:text-purple-400 tracking-tight">{formatearDinero(totalHistoricoGeneral)}</p>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO DE GRUPOS GLASSMORPHISM */}
      <div className="relative z-10 animate-fade-in-up delay-150 flex flex-col lg:flex-row w-full gap-4 mb-8">
        {/* Buscador de Texto */}
        <div className="relative flex-1 group z-10">
          <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input
            type="text"
            placeholder="Buscar empresa o RFC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl text-base font-semibold text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Nuevo Filtro de Categorías */}
        <div className="relative md:w-72 z-10">
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="w-full pl-5 pr-10 py-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl text-base font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-purple-500 transition-all shadow-sm appearance-none cursor-pointer focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-purple-500/20"
          >
            {gruposUnicos.map(grupo => <option key={grupo} value={grupo} className="bg-white dark:bg-slate-800">{grupo === 'Todos' ? '📦 Todas las Categorías' : `📦 Grupo: ${grupo}`}</option>)}
          </select>
          <svg className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>

        {/* Botón clásico manual por si acaso */}
        <button
          onClick={irANuevoProveedor}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-purple-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/40 flex items-center justify-center gap-3 whitespace-nowrap z-10 border border-purple-400/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span className="hidden sm:inline">Dar de alta proveedor</span>
        </button>
      </div>

      {/* GRID DE TARJETAS */}
      {cargando ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-100 dark:border-slate-700 border-b-purple-600 mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Leyendo Bóveda...</p>
        </div>
      ) : (
        <main className="animate-fade-in-up delay-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {/* ========================================================= */}
          {/* TARJETA GIGANTE ANIMADA PARA AGREGAR NUEVO PROVEEDOR MANUAL */}
          {/* ========================================================= */}
          <div
            onClick={irANuevoProveedor}
            className="group bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/40 backdrop-blur-xl rounded-[2rem] border-2 border-dashed border-blue-300 dark:border-blue-500/50 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer min-h-[380px] hover:-translate-y-2 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            {/* Círculo que "late" o respira suavemente */}
            <div className="w-24 h-24 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-[0_10px_25px_-5px_rgba(59,130,246,0.3)] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 animate-[pulse_3s_ease-in-out_infinite] border border-white dark:border-slate-700">
              <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Dar de alta proveedor</h3>
            <p className="text-base text-gray-500 dark:text-slate-400 text-center px-4 font-medium">
              Registra una empresa manualmente si no cuentas con sus archivos XML.
            </p>
          </div>

          {/* ========================================================= */}
          {/* LAS TARJETAS REALES DE TUS PROVEEDORES (SEMAFORO MAESTRO) */}
          {/* ========================================================= */}
          {proveedoresFiltrados.map((prov) => {
            const inicial = prov.nombre.charAt(0).toUpperCase();
            const colorFondo = obtenerColorAvatar(inicial);

            const deudaReal = prov.metricas?.deudaActual || 0;
            const tieneDeuda = deudaReal > 0;

            // --- INICIO DE LA INTELIGENCIA DEL SEMÁFORO MAESTRO ---
            let estadoCredito = 'al_dia'; // 'al_dia', 'por_vencer', 'vencido', 'acumulando'
            let diasRestantes = 0;
            let mensajeSemáforo = 'Todo pagado.';
            const tipoPago = prov.tipoPago || 'contado';

            if (tieneDeuda) {
              const fechaHoy = new Date();
              fechaHoy.setHours(0, 0, 0, 0);
              const fechaFactura = prov.metricas?.ultimaCompra ? new Date(prov.metricas.ultimaCompra.split('T')[0]) : new Date();

              if (tipoPago === 'variable') {
                estadoCredito = 'acumulando';
                mensajeSemáforo = 'Deuda acumulándose. Paga cuando acuerden.';
              } else if (tipoPago === 'contado') {
                diasRestantes = Math.ceil((fechaFactura.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));
                if (diasRestantes < 0) {
                  estadoCredito = 'vencido';
                  mensajeSemáforo = 'Pago al contado atrasado.';
                } else {
                  estadoCredito = 'por_vencer';
                  mensajeSemáforo = 'Pago inmediato requerido hoy.';
                }
              } else if (tipoPago === 'neto') {
                const diasCredito = parseInt(prov.diasCreditoNeto) || 0;
                const fechaVencimiento = new Date(fechaFactura);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

                diasRestantes = Math.ceil((fechaVencimiento.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));

                if (diasRestantes < 0) {
                  estadoCredito = 'vencido';
                  mensajeSemáforo = `El plazo de ${diasCredito} días expiró.`;
                } else if (diasRestantes <= 3) {
                  estadoCredito = 'por_vencer';
                  mensajeSemáforo = `Vence muy pronto (en ${diasRestantes} días).`;
                } else {
                  estadoCredito = 'al_dia';
                  mensajeSemáforo = `Tienes ${diasRestantes} días de crédito restantes.`;
                }
              } else if (tipoPago === 'ciclico') {
                const diasSemanaMapa = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
                const diaObjetivo = diasSemanaMapa[prov.diaPagoFijo] || 1;
                const semanasFrecuencia = parseInt(prov.frecuenciaSemanas) || 1;

                let proximoPago = new Date(fechaFactura);
                proximoPago.setDate(proximoPago.getDate() + ((diaObjetivo + 7 - proximoPago.getDay()) % 7));

                if (proximoPago.getTime() === fechaFactura.getTime()) {
                  proximoPago.setDate(proximoPago.getDate() + (semanasFrecuencia * 7));
                }

                diasRestantes = Math.ceil((proximoPago.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));

                if (diasRestantes < 0) {
                  estadoCredito = 'vencido';
                  mensajeSemáforo = `El ciclo pasado expiró.`;
                } else if (diasRestantes <= 2) {
                  estadoCredito = 'por_vencer';
                  mensajeSemáforo = `Pago de ciclo en ${diasRestantes} días.`;
                } else {
                  estadoCredito = 'al_dia';
                  mensajeSemáforo = `Acumulando para tu pago (${prov.diaPagoFijo}).`;
                }
              }
            }
            // --- FIN DE LA INTELIGENCIA DEL SEMÁFORO ---

            // Lógica de Visitas
            const diasVisita = prov.diasVisita || [];
            const visitaHoy = diasVisita.includes(diaHoy);

            // --- LÓGICA DE ESTILOS DE LA TARJETA PREDOMINANTE ---
            let estilosTarjeta = "border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:bg-white/80 dark:hover:bg-slate-800/80";

            if (estadoCredito === 'vencido') {
              estilosTarjeta = "border-red-500/80 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.4)] animate-[pulse_3s_ease-in-out_infinite] hover:shadow-[0_20px_40px_-15px_rgba(239,68,68,0.5)] bg-red-50/70 dark:bg-red-900/20";
            } else if (estadoCredito === 'por_vencer' || visitaHoy) {
              estilosTarjeta = "border-yellow-400/80 dark:border-yellow-500/80 shadow-[0_10px_30px_-10px_rgba(250,204,21,0.3)] bg-yellow-50/70 dark:bg-yellow-900/20";
            } else if (estadoCredito === 'al_dia') {
              estilosTarjeta = "border-blue-400/80 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.4)]";
            } else if (estadoCredito === 'acumulando') {
              estilosTarjeta = "border-indigo-400/60 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)] border-dashed";
            }

            return (
              <div
                key={prov.id}
                className={`group bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border p-6 flex flex-col relative transition-all duration-300 hover:-translate-y-2 overflow-hidden ${estilosTarjeta}`}
              >

                {/* Overlay difuminado de color suave en el fondo de la tarjeta al hacer hover */}
                {estadoCredito === 'al_dia' && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[2rem]"></div>}

                {/* ZONA DE LOGO */}
                <div
                  onClick={() => irADetalleProveedor(prov)}
                  className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl h-32 mt-2 mb-6 flex items-center justify-center p-4 overflow-hidden shadow-inner cursor-pointer group/logo border border-white/50 dark:border-slate-700/50 relative z-10"
                >
                  {prov.logo ? (
                    <img src={prov.logo} alt="Logo" className="max-w-[80%] max-h-full object-contain filter drop-shadow-md transition-transform duration-500 group-hover/logo:scale-110" />
                  ) : (
                    <span className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br ${colorFondo} select-none tracking-widest uppercase transition-transform duration-500 group-hover/logo:scale-110 drop-shadow-sm`}>
                      {inicial}
                    </span>
                  )}
                </div>

                {/* TÍTULO */}
                <h3
                  onClick={() => irADetalleProveedor(prov)}
                  className="text-gray-900 dark:text-white font-black text-xl leading-tight mb-4 tracking-tight line-clamp-2 transition-colors hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer relative z-10"
                  title={prov.nombre}
                >
                  {prov.nombre}
                </h3>

                {/* BADGES (Estado, Categoría y Visita) */}
                <div className="flex items-center gap-2 mb-6 flex-wrap relative z-10">
                  <Tooltip texto={mensajeSemáforo}>
                    <span className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 cursor-help shadow-sm border ${estadoCredito === 'vencido' ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/20 border-red-200 dark:border-red-500/30' :
                      estadoCredito === 'por_vencer' ? 'text-yellow-800 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-500/20 border-yellow-200 dark:border-yellow-500/30' :
                        estadoCredito === 'al_dia' ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30' :
                          estadoCredito === 'acumulando' ? 'text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30' :
                            'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30'
                      }`}>
                      <span className={`w-2.5 h-2.5 rounded-full shadow-inner ${estadoCredito === 'vencido' ? 'bg-red-500' :
                        estadoCredito === 'por_vencer' ? 'bg-yellow-500' :
                          estadoCredito === 'al_dia' ? 'bg-blue-500' :
                            estadoCredito === 'acumulando' ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}></span>
                      {estadoCredito === 'vencido' ? 'Vencido' :
                        estadoCredito === 'por_vencer' ? 'Vence Pronto' :
                          estadoCredito === 'al_dia' ? 'Crédito Vigente' :
                            estadoCredito === 'acumulando' ? 'Acumulando' : 'Al Día'}
                    </span>
                  </Tooltip>

                  <span className="text-xs px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 font-bold tracking-wider uppercase border border-gray-200/50 dark:border-slate-600/50 truncate max-w-[120px] shadow-sm backdrop-blur-md" title={prov.grupo || 'Sin agrupar'}>
                    📦 {prov.grupo || 'Ninguno'}
                  </span>

                  {visitaHoy && estadoCredito !== 'vencido' && (
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-400 text-yellow-900 font-black tracking-wider uppercase shadow-md animate-pulse">
                      ¡HAY VISITA!
                    </span>
                  )}
                </div>

                {/* CAJA DE SALDO PENDIENTE GLASS */}
                <Tooltip texto="Monto pendiente a pagar actualmente." anchoTotal={true}>
                  <div className={`w-full border rounded-2xl p-4 mb-6 relative z-10 backdrop-blur-md flex justify-between items-center cursor-help transition-all shadow-inner ${estadoCredito === 'vencido' ? 'border-red-300/80 dark:border-red-500/50 bg-red-100/50 dark:bg-red-900/30' :
                    (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'border-blue-200/80 dark:border-blue-500/30 bg-white/70 dark:bg-blue-900/20' :
                      'border-white/60 dark:border-slate-600/50 bg-white/50 dark:bg-slate-800/50'
                    }`}>
                    <span className={`text-xs lg:text-sm flex items-center gap-1.5 font-bold tracking-wide ${estadoCredito === 'vencido' ? 'text-red-800 dark:text-red-300' :
                      (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-blue-800 dark:text-blue-300' :
                        'text-gray-600 dark:text-slate-400'
                      }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {estadoCredito === 'vencido' ? 'Deuda Vencida:' : 'Saldo Pendiente:'}
                    </span>
                    <span className={`font-black text-xl tracking-tight ${estadoCredito === 'vencido' ? 'text-red-600 dark:text-red-400' :
                      (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-blue-700 dark:text-blue-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                      {formatearDinero(deudaReal)}
                    </span>
                  </div>
                </Tooltip>

                {/* FILAS DE INFORMACIÓN */}
                <div className="flex flex-col gap-3 text-sm text-gray-500 dark:text-slate-400 mb-8 font-medium px-2 relative z-10 bg-white/30 dark:bg-slate-900/30 p-4 rounded-2xl backdrop-blur-sm border border-white/40 dark:border-slate-700/30">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Visita:</span>
                    <span className="font-bold text-right max-w-[130px] truncate text-gray-800 dark:text-slate-200">
                      {diasVisita.length > 0 ? diasVisita.map(d => d.substring(0, 3)).join(', ') : 'ND'}
                    </span>
                  </div>
                  <div className="border-t border-gray-200/50 dark:border-slate-700/50 my-1"></div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Última:</span>
                    <span className="text-gray-800 dark:text-slate-200 font-bold">{prov.metricas?.ultimaCompra ? prov.metricas.ultimaCompra.split('T')[0] : 'Sin registro'}</span>
                  </div>
                </div>

                {/* BOTONES INFERIORES */}
                <div className="flex gap-3 mt-auto relative z-10 w-full">
                  <button
                    onClick={() => irADetalleProveedor(prov)}
                    className={`flex-1 text-sm font-black py-4 rounded-2xl transition-all shadow-md transform hover:-translate-y-0.5 border ${estadoCredito === 'vencido' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-red-400' :
                      (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500/50 shadow-blue-500/20' :
                        'bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-800 dark:text-white border-gray-200 dark:border-slate-600'
                      }`}
                  >
                    {estadoCredito === 'vencido' ? 'PAGAR AHORA' : tieneDeuda ? 'Ver Deuda' : 'Ver Detalles'}
                  </button>
                  <Tooltip texto="Editar información">
                    <button
                      onClick={() => irAEditarProveedor(prov)}
                      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400 p-4 rounded-2xl transition-all shadow-sm border border-gray-200/80 dark:border-slate-600 transform hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                  </Tooltip>
                </div>

              </div>
            );
          })}
        </main>
      )}
    </div>
  );
}