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

export default function Clientes({ alVolver, irANuevoCliente, irAEditarCliente, irADetalleCliente }) {

    const [busqueda, setBusqueda] = useState('');
    const [filtroGrupo, setFiltroGrupo] = useState('Todos'); // NUEVO ESTADO: Filtro por categorías
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            // Usar un endpoint específico para clientes si es necesario, ahora usa obtener-clientes.
            const datosReales = await ipcRenderer.invoke('obtener-clientes');
            setClientes(datosReales);
            setCargando(false);
        };
        cargarDatos();
    }, []);

    const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);

    // --- LÓGICA DE FILTROS MEJORADA (Búsqueda + Categoría) ---
    const clientesFiltrados = clientes.filter((cli) => {
        const coincideTexto = cli.nombre.toLowerCase().includes(busqueda.toLowerCase()) || cli.rfc.toLowerCase().includes(busqueda.toLowerCase());
        const grupoCli = cli.grupo || 'Sin agrupar';
        const coincideGrupo = filtroGrupo === 'Todos' || grupoCli === filtroGrupo;
        return coincideTexto && coincideGrupo;
    });

    // Extraer los grupos únicos para llenar el desplegable automáticamente
    const gruposUnicos = ['Todos', ...new Set(clientes.map(p => p.grupo || 'Sin agrupar'))].filter(g => g);

    const totalHistoricoGeneral = clientes.reduce((suma, cli) => suma + (cli.metricas?.comprasHistoricas || 0), 0);

    const obtenerColorAvatar = (letra) => {
        const colores = [
            'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
            'from-purple-400 to-purple-600', 'from-orange-400 to-orange-600',
            'from-pink-400 to-pink-600', 'from-cyan-400 to-cyan-600'
        ];
        return colores[letra.charCodeAt(0) % colores.length];
    };
    const diasMapa = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = diasMapa[new Date().getDay()];

    return (
        <div className="min-h-screen p-4 md:p-8 font-sans max-w-[90rem] mx-auto pb-20 relative overflow-hidden">
            {/* ELEMENTOS DECORATIVOS GLASS (ORBES FIJOS) */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
                <div className="absolute top-1/2 left-0 w-[30rem] h-[30rem] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
                <div className="absolute bottom-0 right-1/4 w-[24rem] h-[24rem] bg-blue-400/10 dark:bg-blue-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow delay-2000"></div>
            </div>

            {/* BOTÓN VOLVER (GLASS) */}
            <div className="relative z-10 mb-6">
                <button
                    onClick={alVolver}
                    className="group inline-flex items-center gap-3 px-5 py-2.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl text-gray-700 dark:text-gray-300 font-bold hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-cyan-600 dark:hover:text-cyan-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                    <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                        <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                    </div>
                    Volver al Dashboard
                </button>
            </div>

            {/* PANEL DE RESUMEN GLOBAL GLASS */}
            <div className="animate-fade-in-up delay-100 mb-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/50 dark:border-slate-700/50 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-500/5 dark:bg-cyan-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
                    <div className="flex-1 w-full">
                        <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-3 flex items-center gap-3 tracking-tight">
                            Directorio de Clientes
                            <span className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-300/80 dark:border-cyan-600/60 shadow-sm relative overflow-hidden group">
                                <span className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500"></span>
                                Cobranza Activa
                            </span>
                        </h2>
                        <p className="text-gray-600 dark:text-slate-300 font-medium max-w-xl text-lg opacity-90">
                            Aquí se encuentran tus clientes a quienes les facturas.
                        </p>
                    </div>

                    {!cargando && clientes.length > 0 && (
                        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
                            <Tooltip texto="Suma histórica de todas las ventas cobradas a todos tus clientes." anchoTotal={true}>
                                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md px-6 py-5 rounded-[2rem] border border-white/60 dark:border-slate-600/50 shadow-sm min-w-[200px] flex-shrink-0 cursor-help hover:scale-105 transition-transform">
                                    <p className="text-xs uppercase font-black tracking-widest text-cyan-700 dark:text-cyan-400 mb-2 opacity-80">Total Ventas Globales</p>
                                    <p className="text-3xl font-black text-gray-800 dark:text-white">{formatearDinero(totalHistoricoGeneral)}</p>
                                </div>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* BARRA DE BÚSQUEDA Y FILTRO INTEGRADA AL PANEL */}
                <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-slate-700/50 flex flex-col lg:flex-row w-full gap-4 relative z-10">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-6 h-6 text-gray-400 group-focus-within:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RFC del cliente..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-600/80 rounded-2xl text-base font-semibold text-gray-800 dark:text-gray-200 outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 placeholder-gray-500 dark:placeholder-gray-400 transition-all shadow-inner"
                        />
                    </div>

                    <div className="relative md:w-64">
                        <select
                            value={filtroGrupo}
                            onChange={(e) => setFiltroGrupo(e.target.value)}
                            className="w-full pl-4 pr-10 py-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-600/80 rounded-2xl text-base font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.5em_1.5em]"
                        >
                            {gruposUnicos.map(grupo => <option key={grupo} value={grupo} className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200">{grupo === 'Todos' ? '📦 Todas las Categorías' : `📦 Grupo: ${grupo}`}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={irANuevoCliente}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 whitespace-nowrap group"
                    >
                        <div className="bg-white/20 p-1.5 rounded-xl group-hover:rotate-90 transition-transform">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="hidden sm:inline">Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {/* GRID DE TARJETAS */}
            {cargando ? (
                <div className="flex flex-col justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-100 dark:border-slate-700 border-b-cyan-600 mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Leyendo Bóveda de Clientes...</p>
                </div>
            ) : (
                <main className="animate-fade-in-up delay-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                    {/* ========================================================= */}
                    {/* TARJETA GIGANTE ANIMADA PARA AGREGAR NUEVO PROVEEDOR MANUAL */}
                    {/* ========================================================= */}
                    {/* TARJETA GIGANTE ANIMADA PARA AGREGAR NUEVO CLIENTE (GLASS) */}
                    {/* ========================================================= */}
                    <div
                        onClick={irANuevoCliente}
                        className="group bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-cyan-300/60 dark:border-cyan-600/40 hover:border-cyan-400 dark:hover:border-cyan-400 hover:bg-white/60 dark:hover:bg-slate-800/70 shadow-sm hover:shadow-[0_8px_30px_rgb(34,211,238,0.15)] transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer min-h-[420px] hover:-translate-y-2 relative z-10"
                    >
                        {/* Círculo que "late" o respira suavemente */}
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/60 dark:to-blue-900/40 rounded-[2rem] flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-inner border border-white/50 dark:border-slate-700/50">
                            <svg className="w-12 h-12 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-3 text-center group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 dark:group-hover:from-cyan-400 dark:group-hover:to-blue-400 transition-all duration-300">
                            Añadir Nuevo Cliente
                        </h3>
                        <p className="text-base text-gray-500 dark:text-slate-400 text-center px-4 font-medium opacity-80 leading-relaxed">
                            Crea un registro manual para llevar su cuenta de crédito y cobranza.
                        </p>
                    </div>

                    {/* ========================================================= */}
                    {/* LAS TARJETAS REALES DE TUS CLIENTES (SEMAFORO MAESTRO) */}
                    {/* ========================================================= */}
                    {clientesFiltrados.map((cli) => {
                        const inicial = cli.nombre.charAt(0).toUpperCase();
                        const colorFondo = obtenerColorAvatar(inicial);

                        const deudaReal = cli.metricas?.deudaActual || 0;
                        const tieneDeuda = deudaReal > 0;

                        // --- INICIO DE LA INTELIGENCIA DEL SEMÁFORO MAESTRO ---
                        let estadoCredito = 'al_dia';
                        let diasRestantes = 0;
                        let mensajeSemáforo = 'Todo cobrado.';
                        const tipoPago = cli.tipoPago || 'contado';

                        if (tieneDeuda) {
                            const fechaHoy = new Date();
                            fechaHoy.setHours(0, 0, 0, 0);
                            const fechaFactura = cli.metricas?.ultimaCompra ? new Date(cli.metricas.ultimaCompra.split('T')[0]) : new Date();

                            if (tipoPago === 'variable') {
                                estadoCredito = 'acumulando';
                                mensajeSemáforo = 'Deuda acumulándose. Cobra cuando acuerden.';

                            } else if (tipoPago === 'contado') {
                                diasRestantes = Math.ceil((fechaFactura.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));
                                if (diasRestantes < 0) {
                                    estadoCredito = 'vencido';
                                    mensajeSemáforo = 'Cobro al contado atrasado.';
                                } else {
                                    estadoCredito = 'por_vencer';
                                    mensajeSemáforo = 'Cobro inmediato requerido hoy.';
                                }

                            } else if (tipoPago === 'neto') {
                                const diasCredito = parseInt(cli.diasCreditoNeto) || 0;
                                const fechaVencimiento = new Date(fechaFactura);
                                fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

                                diasRestantes = Math.ceil((fechaVencimiento.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));

                                if (diasRestantes < 0) {
                                    estadoCredito = 'vencido';
                                    mensajeSemáforo = `El plazo de ${diasCredito} días expiró.`;
                                } else if (diasRestantes <= 3) {
                                    estadoCredito = 'por_vencer';
                                    mensajeSemáforo = `Cobro muy pronto (en ${diasRestantes} días).`;
                                } else {
                                    estadoCredito = 'al_dia';
                                    mensajeSemáforo = `Tiene ${diasRestantes} días de crédito restantes.`;
                                }

                            } else if (tipoPago === 'ciclico') {
                                const diasSemanaMapa = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
                                const diaObjetivo = diasSemanaMapa[cli.diaPagoFijo] || 1;
                                const semanasFrecuencia = parseInt(cli.frecuenciaSemanas) || 1;

                                let proximoPago = new Date(fechaFactura);
                                proximoPago.setDate(proximoPago.getDate() + ((diaObjetivo + 7 - proximoPago.getDay()) % 7));

                                if (proximoPago.getTime() === fechaFactura.getTime()) {
                                    proximoPago.setDate(proximoPago.getDate() + (semanasFrecuencia * 7));
                                }

                                diasRestantes = Math.ceil((proximoPago.getTime() - fechaHoy.getTime()) / (1000 * 3600 * 24));

                                if (diasRestantes < 0) {
                                    estadoCredito = 'vencido';
                                    mensajeSemáforo = `El ciclo de cobro expiró.`;
                                } else if (diasRestantes <= 2) {
                                    estadoCredito = 'por_vencer';
                                    mensajeSemáforo = `Su fecha de pago es en ${diasRestantes} días.`;
                                } else {
                                    estadoCredito = 'al_dia';
                                    mensajeSemáforo = `Acumulando para su pago del próximo ${cli.diaPagoFijo}.`;
                                }
                            }
                        }
                        // --- FIN DE LA INTELIGENCIA DEL SEMÁFORO ---

                        const diasVisita = cli.diasVisita || [];
                        const visitaHoy = diasVisita.includes(diaHoy);

                        // --- LÓGICA DE ESTILOS DE LA TARJETA GLASS ---
                        let estilosTarjeta = "bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]";

                        if (estadoCredito === 'vencido') {
                            estilosTarjeta = "bg-red-50/70 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/50 shadow-[0_8px_30px_rgba(239,68,68,0.15)] animate-[pulse_2s_ease-in-out_infinite]";
                        } else if (estadoCredito === 'por_vencer' || visitaHoy) {
                            estilosTarjeta = "bg-yellow-50/70 dark:bg-yellow-900/20 border border-yellow-200/80 dark:border-yellow-800/50 shadow-[0_8px_30px_rgba(250,204,21,0.1)]";
                        } else if (estadoCredito === 'al_dia') {
                            estilosTarjeta = "bg-cyan-50/70 dark:bg-cyan-900/20 border border-cyan-200/80 dark:border-cyan-800/50 shadow-[0_8px_30px_rgba(34,211,238,0.1)]";
                        } else if (estadoCredito === 'acumulando') {
                            estilosTarjeta = "bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-200/80 dark:border-indigo-800/50 shadow-[0_8px_30px_rgba(99,102,241,0.1)] border-dashed";
                        }

                        return (
                            <div
                                key={cli.id}
                                className={`group backdrop-blur-xl rounded-[2.5rem] p-8 flex flex-col relative transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] z-10 ${estilosTarjeta}`}
                            >
                                {/* ZONA DE LOGO GLASS */}
                                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 dark:border-slate-700/50 rounded-[2rem] h-32 mt-2 mb-6 flex items-center justify-center p-4 overflow-hidden shadow-sm relative group-hover:scale-105 transition-transform duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none"></div>
                                    {cli.logo ? (
                                        <img src={cli.logo} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-md z-10 relative" />
                                    ) : (
                                        <span className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br ${colorFondo} select-none tracking-widest uppercase z-10 relative`}>
                                            {inicial}
                                        </span>
                                    )}
                                </div>

                                {/* TÍTULO */}
                                <h3 className="text-gray-800 dark:text-white font-black text-2xl leading-tight mb-5 line-clamp-2 transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400 tracking-tight" title={cli.nombre}>
                                    {cli.nombre}
                                </h3>

                                {/* BADGES (Estado, Categoría y Visita) CON GLASS */}
                                <div className="flex items-center gap-2 mb-6 flex-wrap">
                                    <Tooltip texto={mensajeSemáforo}>
                                        <span className={`text-xs px-3 py-1.5 rounded-full font-black tracking-wide flex items-center gap-2 cursor-help backdrop-blur-md shadow-sm border mix-blend-multiply dark:mix-blend-luminosity ${estadoCredito === 'vencido' ? 'text-red-800 dark:text-red-300 bg-red-200/70 border-red-300' :
                                            estadoCredito === 'por_vencer' ? 'text-yellow-800 dark:text-yellow-300 bg-yellow-200/70 border-yellow-300' :
                                                estadoCredito === 'al_dia' ? 'text-cyan-800 dark:text-cyan-300 bg-cyan-200/70 border-cyan-300' :
                                                    estadoCredito === 'acumulando' ? 'text-indigo-800 dark:text-indigo-300 bg-indigo-200/70 border-indigo-300' :
                                                        'text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 border-emerald-300'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${estadoCredito === 'vencido' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' :
                                                estadoCredito === 'por_vencer' ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]' :
                                                    estadoCredito === 'al_dia' ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]' :
                                                        estadoCredito === 'acumulando' ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.8)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]'
                                                }`}></span>
                                            {estadoCredito === 'vencido' ? 'Cobro Vencido' :
                                                estadoCredito === 'por_vencer' ? 'Cobro Pronto' :
                                                    estadoCredito === 'al_dia' ? 'Crédito Vigente' :
                                                        estadoCredito === 'acumulando' ? 'Acumulando' : 'Al Día'}
                                        </span>
                                    </Tooltip>

                                    <span className="text-[10px] px-3 py-1.5 rounded-full bg-white/50 dark:bg-slate-900/40 text-gray-600 dark:text-gray-300 font-extrabold tracking-wider uppercase border border-white/60 dark:border-slate-600/30 truncate max-w-[120px] backdrop-blur-sm" title={cli.grupo || 'Sin agrupar'}>
                                        📦 {cli.grupo || 'General'}
                                    </span>

                                    {visitaHoy && estadoCredito !== 'vencido' && (
                                        <span className="text-[10px] px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-200 to-amber-200 dark:from-yellow-900/50 dark:to-amber-900/50 text-yellow-800 dark:text-yellow-200 font-black tracking-widest uppercase border border-yellow-300/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse backdrop-blur-md">
                                            ¡Visita Hoy!
                                        </span>
                                    )}
                                    {visitaHoy && estadoCredito === 'vencido' && (
                                        <span className="text-[10px] px-3 py-1.5 rounded-full bg-gradient-to-r from-red-200 to-rose-200 dark:from-red-900/50 dark:to-rose-900/50 text-red-800 dark:text-red-200 font-black tracking-widest uppercase border border-red-300/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse backdrop-blur-md">
                                            ⚠️ ¡COBRAR HOY!
                                        </span>
                                    )}
                                </div>

                                {/* CAJA DE SALDO PENDIENTE GLASS */}
                                <Tooltip texto="Monto que este cliente te debe." anchoTotal={true}>
                                    <div className={`w-full backdrop-blur-md rounded-2xl p-5 mb-6 border flex justify-between items-center cursor-help transition-all shadow-inner relative overflow-hidden ${estadoCredito === 'vencido' ? 'border-red-300/60 dark:border-red-700/50 bg-red-100/50 dark:bg-red-900/20' :
                                        (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'border-cyan-300/60 dark:border-cyan-700/50 bg-cyan-100/50 dark:bg-cyan-900/20' :
                                            'border-white/60 dark:border-slate-600/40 bg-white/40 dark:bg-slate-900/30'
                                        }`}>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                                        <span className={`text-sm flex items-center gap-2 font-bold z-10 ${estadoCredito === 'vencido' ? 'text-red-700 dark:text-red-300' :
                                            (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-cyan-700 dark:text-cyan-300' :
                                                'text-gray-600 dark:text-gray-300'
                                            }`}>
                                            <div className={`p-1.5 rounded-lg ${estadoCredito === 'vencido' ? 'bg-red-200/50' : (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'bg-cyan-200/50' : 'bg-gray-200/50'}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </div>
                                            Por Cobrar:
                                        </span>
                                        <span className={`font-black text-2xl tracking-tight z-10 ${estadoCredito === 'vencido' ? 'text-red-700 dark:text-red-300' :
                                            (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'text-cyan-700 dark:text-cyan-300' :
                                                'text-gray-800 dark:text-white'
                                            }`}>
                                            {formatearDinero(deudaReal)}
                                        </span>
                                    </div>
                                </Tooltip>

                                {/* FILAS DE INFORMACIÓN */}
                                <div className="flex flex-col gap-4 text-sm text-gray-500 dark:text-slate-400 mb-8 font-medium px-2 z-10">
                                    <div className="flex justify-between items-center group/item hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                                        <span>Días de Visita:</span>
                                        <span className="font-bold text-right max-w-[150px] truncate bg-white/40 dark:bg-slate-900/40 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg border border-white/50 dark:border-slate-600/30 backdrop-blur-sm">
                                            {diasVisita.length > 0 ? diasVisita.map(d => d.substring(0, 3)).join(', ') : 'No definido'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/item hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                                        <span>Última venta:</span>
                                        <span className="font-bold bg-white/40 dark:bg-slate-900/40 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg border border-white/50 dark:border-slate-600/30 backdrop-blur-sm">
                                            {cli.metricas?.ultimaCompra ? cli.metricas.ultimaCompra.split('T')[0] : 'Sin registro'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/item hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                                        <span>Monto Histórico:</span>
                                        <span className="font-black bg-white/40 dark:bg-slate-900/40 text-gray-800 dark:text-white px-3 py-1 rounded-lg border border-white/50 dark:border-slate-600/30 backdrop-blur-sm">
                                            {formatearDinero(cli.metricas?.comprasHistoricas)}
                                        </span>
                                    </div>
                                </div>

                                {/* BOTONES INFERIORES GLASS */}
                                <div className="flex gap-4 mt-auto z-10">
                                    <button
                                        onClick={() => irADetalleCliente(cli)}
                                        className={`flex-1 text-sm font-black py-4 rounded-[1.25rem] transition-all shadow-md hover:shadow-lg border flex items-center justify-center gap-2 ${estadoCredito === 'vencido' ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-red-400 shadow-red-500/30' :
                                            (estadoCredito === 'al_dia' || estadoCredito === 'acumulando') ? 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-cyan-400 shadow-cyan-500/30' :
                                                'bg-white/60 hover:bg-white dark:bg-slate-700/60 dark:hover:bg-slate-600 text-gray-800 dark:text-white border-white/80 dark:border-slate-500/50 backdrop-blur-md'
                                            }`}
                                    >
                                        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        {estadoCredito === 'vencido' ? 'Cobrar Ahora' : tieneDeuda ? 'Ver Deuda' : 'Ver Ventas'}
                                    </button>
                                    <button
                                        onClick={() => irAEditarCliente(cli)}
                                        className="w-14 shrink-0 flex items-center justify-center bg-white/40 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-[1.25rem] transition-all shadow-sm hover:shadow-md border border-white/60 dark:border-slate-600/50 backdrop-blur-md"
                                        title="Editar Info"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
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
