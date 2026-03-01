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
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto pb-20">

      {/* HEADER SUPERIOR */}
      <header className="animate-fade-in-up flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <button
          onClick={alVolver}
          className="group flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition"
        >
          <div className="bg-gray-100 dark:bg-slate-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 p-1.5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </div>
          Volver al Dashboard
        </button>
        <div className="flex items-center gap-4">
          <Tooltip texto="Cambia entre modo Claro y Oscuro para descansar la vista.">
            <button onClick={toggleTema} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition text-sm shadow-sm w-full">
              {modoOscuro ? '☀️ Tema Claro' : '🌙 Tema Oscuro'}
            </button>
          </Tooltip>
        </div>
      </header>

      {/* PANEL DE RESUMEN GLOBAL */}
      <div className="animate-fade-in-up delay-100 mb-8 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3 tracking-tight">Directorio de Proveedores</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm md:text-base max-w-xl">
              Aquí se guardan las empresas de tus facturas XML. Selecciona una para ver su historial, agruparlas por producto y administrar pagos.
            </p>
          </div>
          {!cargando && proveedores.length > 0 && (
            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Tooltip texto="Suma histórica de todas las compras de todos los proveedores juntos.">
                <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm min-w-[140px] flex-shrink-0 cursor-help">
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Total Histórico</p>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-400">{formatearDinero(totalHistoricoGeneral)}</p>
                </div>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO DE GRUPOS */}
      <div className="animate-fade-in-up delay-150 flex flex-col lg:flex-row w-full gap-4 mb-6">
        {/* Buscador de Texto */}
        <div className="relative flex-1 group z-10">
          <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400 group-focus-within:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input
            type="text"
            placeholder="Buscar empresa o RFC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
          />
        </div>

        {/* Nuevo Filtro de Categorías */}
        <div className="relative md:w-64 z-10">
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-purple-500 transition-all shadow-sm appearance-none cursor-pointer"
          >
            {gruposUnicos.map(grupo => <option key={grupo} value={grupo}>{grupo === 'Todos' ? '📦 Todas las Categorías' : `📦 Grupo: ${grupo}`}</option>)}
          </select>
          <svg className="w-5 h-5 absolute right-4 top-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>

        {/* Botón clásico manual por si acaso */}
        <button
          onClick={irANuevoProveedor}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
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
        <main className="animate-fade-in-up delay-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* ========================================================= */}
          {/* TARJETA GIGANTE ANIMADA PARA AGREGAR NUEVO PROVEEDOR MANUAL */}
          {/* ========================================================= */}
          <div
            onClick={irANuevoProveedor}
            className="group bg-gradient-to-br from-blue-50 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-[32px] border-2 border-dashed border-blue-300 dark:border-blue-600/60 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer min-h-[380px] hover:-translate-y-2"
          >
            {/* Círculo que "late" o respira suavemente */}
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 animate-[pulse_3s_ease-in-out_infinite]">
              <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Dar de alta proveedor</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center px-4">
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
                // MODO 1: VARIABLE (Nunca se vence solo, siempre se acumula hasta que tú decides pagar)
                estadoCredito = 'acumulando';
                mensajeSemáforo = 'Deuda acumulándose. Paga cuando acuerden.';

              } else if (tipoPago === 'contado') {
                // MODO 2: CONTADO (Se vence el mismo día. Si la factura es de ayer, ya es Rojo)
                diasRestantes = Math.ceil((fechaFactura.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));
                if (diasRestantes < 0) {
                  estadoCredito = 'vencido';
                  mensajeSemáforo = 'Pago al contado atrasado.';
                } else {
                  estadoCredito = 'por_vencer';
                  mensajeSemáforo = 'Pago inmediato requerido hoy.';
                }

              } else if (tipoPago === 'neto') {
                // MODO 3: CRÉDITO POR DÍAS (Suma X días a la factura)
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
                // MODO 4: CÍCLICO (Busca el próximo "Lunes" o "Martes" que toca pagar)
                const diasSemanaMapa = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
                const diaObjetivo = diasSemanaMapa[prov.diaPagoFijo] || 1; // Por defecto Lunes si falla
                const semanasFrecuencia = parseInt(prov.frecuenciaSemanas) || 1;

                // Calculamos cuándo es el próximo día de pago desde la fecha de la factura
                let proximoPago = new Date(fechaFactura);
                proximoPago.setDate(proximoPago.getDate() + ((diaObjetivo + 7 - proximoPago.getDay()) % 7));

                // Si la factura cayó el mismo día de pago, lo mandamos al siguiente ciclo
                if (proximoPago.getTime() === fechaFactura.getTime()) {
                  proximoPago.setDate(proximoPago.getDate() + (semanasFrecuencia * 7));
                }

                diasRestantes = Math.ceil((proximoPago.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));

                if (diasRestantes < 0) {
                  estadoCredito = 'vencido';
                  mensajeSemáforo = `El ciclo de pago pasado expiró.`;
                } else if (diasRestantes <= 2) {
                  estadoCredito = 'por_vencer';
                  mensajeSemáforo = `Tu pago de ciclo es en ${diasRestantes} días.`;
                } else {
                  estadoCredito = 'al_dia';
                  mensajeSemáforo = `Acumulando para tu pago del próximo ${prov.diaPagoFijo}.`;
                }
              }
            }
            // --- FIN DE LA INTELIGENCIA DEL SEMÁFORO ---

            // Lógica de Visitas
            const diasVisita = prov.diasVisita || [];
            const visitaHoy = diasVisita.includes(diaHoy);

            // --- LÓGICA DE ESTILOS DE LA TARJETA ---
            let estilosTarjeta = "border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]";

            if (estadoCredito === 'vencido') {
              estilosTarjeta = "border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-[pulse_2s_ease-in-out_infinite]";
            } else if (estadoCredito === 'por_vencer' || visitaHoy) {
              estilosTarjeta = "border-2 border-yellow-400 dark:border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.2)]";
            } else if (estadoCredito === 'al_dia') {
              estilosTarjeta = "border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
            } else if (estadoCredito === 'acumulando') {
              estilosTarjeta = "border border-indigo-400/80 shadow-[0_0_10px_rgba(99,102,241,0.2)] border-dashed";
            }

            return (
              <div
                key={prov.id}
                className={`group bg-white dark:bg-[#1e2433] rounded-[24px] p-6 flex flex-col relative transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${estilosTarjeta}`}
              >
                {/* ZONA DE LOGO */}
                <div
                  onClick={() => irADetalleProveedor(prov)}
                  className="bg-gray-100 dark:bg-[#e2e8f0] rounded-xl h-28 mt-2 mb-5 flex items-center justify-center p-4 overflow-hidden shadow-inner cursor-pointer group/logo"
                >
                  {prov.logo ? (
                    <img src={prov.logo} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-sm transition-transform group-hover/logo:scale-110 group-hover:scale-105" />
                  ) : (
                    <span className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br ${colorFondo} select-none tracking-widest uppercase transition-transform group-hover/logo:scale-110`}>
                      {inicial}
                    </span>
                  )}
                </div>

                {/* TÍTULO */}
                <h3
                  onClick={() => irADetalleProveedor(prov)}
                  className="text-gray-800 dark:text-white font-black text-xl leading-tight mb-4 line-clamp-2 transition-colors hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer group-hover:text-purple-600 dark:group-hover:text-purple-400"
                  title={prov.nombre}
                >
                  {prov.nombre}
                </h3>

                {/* BADGES (Estado, Categoría y Visita) */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  <Tooltip texto={mensajeSemáforo}>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 cursor-help transition-colors ${estadoCredito === 'vencido' ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30' :
                        estadoCredito === 'por_vencer' ? 'text-yellow-800 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30' :
                          estadoCredito === 'al_dia' ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' :
                            estadoCredito === 'acumulando' ? 'text-indigo-700 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30' :
                              'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${estadoCredito === 'vencido' ? 'bg-red-500' :
                          estadoCredito === 'por_vencer' ? 'bg-yellow-500' :
                            estadoCredito === 'al_dia' ? 'bg-blue-500' :
                              estadoCredito === 'acumulando' ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}></span>
                      {estadoCredito === 'vencido' ? 'Pago Vencido' :
                        estadoCredito === 'por_vencer' ? 'Vence Pronto' :
                          estadoCredito === 'al_dia' ? 'Crédito Vigente' :
                            estadoCredito === 'acumulando' ? 'Acumulando' : 'Al Día'}
                    </span>
                  </Tooltip>

                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-[#2a3441] dark:text-slate-300 font-bold tracking-wider uppercase border border-slate-200 dark:border-slate-600/50 truncate max-w-[120px]" title={prov.grupo || 'Sin agrupar'}>
                    📦 {prov.grupo || 'General'}
                  </span>

                  {visitaHoy && estadoCredito !== 'vencido' && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold tracking-wider uppercase border border-yellow-300 dark:border-yellow-500/50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(250,204,21,0.3)] animate-pulse">
                      ¡Visita Hoy!
                    </span>
                  )}
                  {visitaHoy && estadoCredito === 'vencido' && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold tracking-wider uppercase border border-red-300 dark:border-red-500/50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                      ⚠️ ¡COBRADOR HOY!
                    </span>
                  )}
                </div>

                {/* CAJA DE SALDO PENDIENTE */}
                <Tooltip texto="Monto pendiente a pagar actualmente." anchoTotal={true}>
                  <div className={`w-full border rounded-xl p-4 mb-6 bg-gray-50 dark:bg-[#1a1f2b] flex justify-between items-center cursor-help transition-colors ${estadoCredito === 'vencido' ? 'border-red-400/50 dark:border-red-500/30 bg-red-50/50 dark:bg-red-900/10' :
                      (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'border-blue-400/50 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10' :
                        'border-gray-200 dark:border-slate-600/50'
                    }`}>
                    <span className={`text-sm flex items-center gap-1.5 font-medium ${estadoCredito === 'vencido' ? 'text-red-600 dark:text-red-400' :
                        (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-500 dark:text-slate-400'
                      }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Saldo Pendiente:
                    </span>
                    <span className={`font-bold text-lg tracking-wide ${estadoCredito === 'vencido' ? 'text-red-600 dark:text-red-400' :
                        (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-800 dark:text-white'
                      }`}>
                      {formatearDinero(deudaReal)}
                    </span>
                  </div>
                </Tooltip>

                {/* FILAS DE INFORMACIÓN */}
                <div className="flex flex-col gap-3 text-sm text-gray-500 dark:text-slate-400 mb-8 font-medium px-1">
                  <div className="flex justify-between items-center">
                    <span>Visita:</span>
                    <span className="font-semibold text-right max-w-[150px] truncate text-gray-700 dark:text-slate-200">
                      {diasVisita.length > 0 ? diasVisita.map(d => d.substring(0, 3)).join(', ') : 'No definido'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Última factura:</span>
                    <span className="text-gray-700 dark:text-slate-200 font-semibold">{prov.metricas?.ultimaCompra ? prov.metricas.ultimaCompra.split('T')[0] : 'Sin registro'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Gasto Total:</span>
                    <span className="text-gray-700 dark:text-slate-200 font-semibold">{formatearDinero(prov.metricas?.comprasHistoricas)}</span>
                  </div>
                </div>

                {/* BOTONES INFERIORES */}
                <div className="flex gap-4 mt-auto">
                  <button
                    onClick={() => irADetalleProveedor(prov)}
                    className={`flex-1 text-sm font-bold py-3.5 rounded-xl transition-colors shadow-sm ${estadoCredito === 'vencido' ? 'bg-red-100 hover:bg-red-600 dark:bg-red-900/40 dark:hover:bg-red-600 text-red-700 hover:text-white dark:text-red-400 dark:hover:text-white' :
                        (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'bg-blue-100 hover:bg-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-600 text-blue-700 hover:text-white dark:text-blue-400 dark:hover:text-white' :
                          'bg-gray-100 hover:bg-purple-600 dark:bg-[#2a3441] dark:hover:bg-[#323d4d] text-gray-700 hover:text-white dark:text-slate-300 dark:hover:text-white'
                      }`}
                  >
                    {estadoCredito === 'vencido' ? 'Pagar Ahora' : tieneDeuda ? 'Ver Deuda' : 'Estados De Cuenta'}
                  </button>
                  <button
                    onClick={() => irAEditarProveedor(prov)}
                    className="flex-1 bg-gray-100 hover:bg-blue-600 dark:bg-[#2a3441] dark:hover:bg-[#323d4d] text-gray-700 hover:text-white dark:text-slate-300 dark:hover:text-white text-sm font-bold py-3.5 rounded-xl transition-colors shadow-sm"
                  >
                    Editar Info
                  </button>
                </div>

              </div>
            );
          })}
        </main>
      )}
    </div>
  );
}