import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
const { ipcRenderer } = window.require('electron');

export default function ModuloPrecios({ volverAlDashboard }) {
    const [estaCargando, setEstaCargando] = useState(true);
    const [analiticas, setAnaliticas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [filtroTiempo, setFiltroTiempo] = useState('TODO');

    useEffect(() => {
        cargarAnaliticas();
    }, []);

    const cargarAnaliticas = async () => {
        setEstaCargando(true);
        const respuesta = await ipcRenderer.invoke('obtener-analiticas-precios');
        if (respuesta && respuesta.success) {
            setAnaliticas(respuesta.analiticas);
            if (respuesta.analiticas.length > 0) {
                setProductoSeleccionado(respuesta.analiticas[0]);
            }
        }
        setEstaCargando(false);
    };

    const analiticasFiltradas = analiticas.filter(item =>
        item.nombre_global.toLowerCase().includes(busqueda.toLowerCase())
    );

    const datosFiltradosYKPIs = React.useMemo(() => {
        if (!productoSeleccionado || !productoSeleccionado.historial_compuesto) return null;

        let historial = [...productoSeleccionado.historial_compuesto];
        if (filtroTiempo !== 'TODO') {
            const fechaLimite = new Date();
            if (filtroTiempo === '3M') fechaLimite.setMonth(fechaLimite.getMonth() - 3);
            if (filtroTiempo === '6M') fechaLimite.setMonth(fechaLimite.getMonth() - 6);
            if (filtroTiempo === '1A') fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);

            historial = historial.filter(h => new Date(h.fecha) >= fechaLimite);
        }

        if (historial.length === 0) {
            return {
                historial_compuesto: [],
                kpis: {
                    precioMin: 0,
                    precioMax: 0,
                    ultimoPrecio: productoSeleccionado.kpis.ultimoPrecio,
                    variacionPorcentualTotal: 0
                }
            };
        }

        let precioMin = Infinity;
        let precioMax = -Infinity;
        let primerPrecio = historial[0].precio;
        let ultimoPrecio = historial[historial.length - 1].precio;

        historial.forEach(h => {
            if (h.precio < precioMin) precioMin = h.precio;
            if (h.precio > precioMax) precioMax = h.precio;
        });

        let variacionPorcentualTotal = 0;
        if (primerPrecio > 0) {
            variacionPorcentualTotal = ((ultimoPrecio - primerPrecio) / primerPrecio) * 100;
        }

        return {
            historial_compuesto: historial,
            kpis: {
                precioMin,
                precioMax,
                ultimoPrecio,
                variacionPorcentualTotal: parseFloat(variacionPorcentualTotal.toFixed(2))
            }
        };
    }, [productoSeleccionado, filtroTiempo]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-xl z-50">
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-white/20 dark:border-slate-700/30 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex flex-col mb-1 last:mb-0">
                            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-tight">{entry.payload.rfc_proveedor}</span>
                            <span className="font-black text-xl text-gray-800 dark:text-white tabular-nums">
                                ${entry.value.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen font-sans relative transition-all duration-500 w-full bg-transparent pt-16 md:pt-20">

            {/* BACKGROUND ORBES GLASS */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden fixed bg-gray-50 dark:bg-[#0f141e]">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
                <div className="absolute bottom-1/4 left-1/4 w-[35rem] h-[35rem] bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-blue-400/10 dark:bg-blue-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-40 animate-float-slow delay-2000"></div>
            </div>

            <div className="max-w-[1800px] mx-auto p-4 md:p-8 relative z-10 h-[calc(100vh-80px)] flex flex-col">
                {/* HEADER SUPERIOR */}
                <header className="flex justify-between items-center mb-8 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-4 md:p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all shrink-0">
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
                                <span className="text-indigo-500 dark:text-indigo-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                </span>
                                Inteligencia de Precios
                            </h1>
                            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">Análisis histórico y evaluación evolutiva de costos</p>
                        </div>
                    </div>
                </header>

                {estaCargando ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/50 dark:border-slate-700/50 my-auto shadow-xl">
                        <div className="w-20 h-20 relative">
                            <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="mt-6 font-black text-indigo-500 dark:text-indigo-400 text-lg animate-pulse tracking-tight text-center px-4">
                            Agrupando historiales de precios...
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-6">

                        {/* PANEL IZQUIERDO: LISTA DE PRODUCTOS */}
                        <aside className="w-full lg:w-1/3 lg:max-w-md bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border border-white/40 dark:border-slate-800/50 flex flex-col transition-all rounded-3xl overflow-hidden shrink-0 shadow-lg">
                            <div className="p-6 border-b border-white/10 dark:border-slate-700/50 bg-white/10 dark:bg-slate-800/10">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Buscar producto a examinar..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-700/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-all backdrop-blur-sm shadow-inner"
                                    />
                                    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 absolute left-3 top-3.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                {analiticasFiltradas.length > 0 ? (
                                    analiticasFiltradas.map(prod => (
                                        <div
                                            key={prod.id_maestro}
                                            onClick={() => setProductoSeleccionado(prod)}
                                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 relative overflow-hidden group/item ${productoSeleccionado?.id_maestro === prod.id_maestro
                                                ? 'bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                                : 'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-white/60 dark:hover:bg-slate-800/60'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-1 relative z-10">
                                                <h3 className={`font-black text-sm truncate pr-2 ${productoSeleccionado?.id_maestro === prod.id_maestro ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-white'}`}>
                                                    {prod.nombre_global}
                                                </h3>
                                                {!prod.auditado && (
                                                    <span className="shrink-0 text-[9px] bg-orange-100/50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-200/50">Asilado</span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-4 relative z-10">
                                                <span className="text-sm font-black text-gray-500 dark:text-gray-400 tracking-tight">${prod.kpis.ultimoPrecio.toFixed(2)}</span>
                                                <div className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${prod.kpis.variacionPorcentualTotal > 0 ? 'bg-red-100/50 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200/50' :
                                                    prod.kpis.variacionPorcentualTotal < 0 ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/50' :
                                                        'bg-slate-100/50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 border border-slate-200/50'
                                                    }`}>
                                                    {prod.kpis.variacionPorcentualTotal > 0 ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg> :
                                                        prod.kpis.variacionPorcentualTotal < 0 ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg> :
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
                                                    {Math.abs(prod.kpis.variacionPorcentualTotal)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-50">
                                        <span className="text-4xl block mb-2 animate-float">🔭</span>
                                        <p className="text-sm font-black text-gray-500 dark:text-gray-400">No hay productos que coincidan</p>
                                    </div>
                                )}
                            </div>
                        </aside>

                        <main className="flex-1 overflow-y-auto p-2 custom-scrollbar relative z-10 transition-all rounded-3xl bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm border border-white/20 dark:border-white/5 shadow-inner xl:ml-2">
                            {productoSeleccionado && datosFiltradosYKPIs ? (
                                <div className="animate-fade-in-up w-full space-y-8 p-4 md:p-8 lg:p-12 pb-32">

                                    {/* CABECERA DE PRODUCTO */}
                                    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 md:p-10 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 relative overflow-hidden transition-all group/header">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover/header:bg-indigo-500/20 transition-all duration-700"></div>
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                                            <div className="max-w-xl">
                                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                                    <span className="bg-indigo-100/50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-indigo-200/50">
                                                        {productoSeleccionado.total_proveedores} Proveedores Mapeados
                                                    </span>
                                                    {productoSeleccionado.auditado && (
                                                        <span className="bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200/50 animate-pulse">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                            Auditado IA
                                                        </span>
                                                    )}
                                                </div>
                                                <h2 className="text-3xl md:text-5xl font-black text-gray-800 dark:text-white leading-[1.1] tracking-tight">{productoSeleccionado.nombre_global}</h2>
                                            </div>

                                            <div className="text-left md:text-right bg-white/20 dark:bg-slate-900/20 p-5 rounded-3xl border border-white/30 dark:border-white/5 shadow-inner">
                                                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Último Precio Detectado</p>
                                                <p className="text-4xl md:text-5xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tighter">${datosFiltradosYKPIs.kpis.ultimoPrecio.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TARJETAS DE KPIS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all hover:bg-white/50 dark:hover:bg-slate-800/50 group">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> Mínimo Histórico
                                            </p>
                                            <p className="text-3xl font-black text-gray-800 dark:text-white tabular-nums group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">${datosFiltradosYKPIs.kpis.precioMin.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all hover:bg-white/50 dark:hover:bg-slate-800/50 group">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span> Máximo Histórico
                                            </p>
                                            <p className="text-3xl font-black text-gray-800 dark:text-white tabular-nums group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors tracking-tight">${datosFiltradosYKPIs.kpis.precioMax.toFixed(2)}</p>
                                        </div>
                                        <div className={`p-6 rounded-3xl shadow-sm border backdrop-blur-md transition-all group ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0
                                            ? 'bg-red-50/40 border-red-200/50 dark:bg-red-900/10 dark:border-red-900/30 shadow-[0_0_30px_rgba(239,68,68,0.05)]'
                                            : datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0
                                                ? 'bg-emerald-50/40 border-emerald-200/50 dark:bg-emerald-900/10 dark:border-emerald-900/30 shadow-[0_0_30px_rgba(16,185,129,0.05)]'
                                                : 'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-slate-700/50'
                                            }`}>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? 'text-red-500' :
                                                datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0 ? 'text-emerald-500' :
                                                    'text-gray-400 dark:text-slate-500'
                                                }`}>Variación Total</p>
                                            <p className={`text-3xl font-black tabular-nums transition-all tracking-tight ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? 'text-red-600 dark:text-red-400 group-hover:scale-105' :
                                                datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0 ? 'text-emerald-600 dark:text-emerald-400 group-hover:scale-105' :
                                                    'text-gray-800 dark:text-white'
                                                }`}>
                                                {datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? '+' : ''}{datosFiltradosYKPIs.kpis.variacionPorcentualTotal}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* DESGLOSE POR PROVEEDOR */}
                                    {productoSeleccionado.proveedores_vinculados && productoSeleccionado.proveedores_vinculados.length > 0 && (
                                        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all">
                                            <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                                Opciones de Surtido Actuales
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {productoSeleccionado.proveedores_vinculados.map((prov, i) => (
                                                    <div key={i} className="flex flex-col bg-white/20 dark:bg-slate-900/40 p-5 rounded-2xl border border-white/30 dark:border-white/5 shadow-inner hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all group/prov hover:scale-[1.02] active:scale-95 duration-300">
                                                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 mb-2 uppercase tracking-[0.1em] bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)] self-start px-3 py-1 rounded-full border border-indigo-500/20" title={prov.rfc}>{prov.nombre_comercial}</span>
                                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-1 mb-4 transition-colors group-hover/prov:text-indigo-600 dark:group-hover/prov:text-indigo-400" title={prov.nombre_original}>{prov.nombre_original}</p>
                                                        <span className="text-2xl font-black text-gray-700 dark:text-slate-400 mt-auto tabular-nums group-hover/prov:scale-105 transition-transform tracking-tighter">${prov.precioActual.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* GRÁFICA GIGANTE */}
                                    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 transition-all shadow-xl">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                                                </div>
                                                <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Línea del Tiempo</h3>
                                            </div>
                                            <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1.5 rounded-2xl shadow-inner border border-white/10 overflow-hidden">
                                                {['3M', '6M', '1A', 'TODO'].map(filtro => (
                                                    <button
                                                        key={filtro}
                                                        onClick={() => setFiltroTiempo(filtro)}
                                                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 ${filtroTiempo === filtro
                                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md transform scale-105'
                                                            : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300'}`}
                                                    >
                                                        {filtro === 'TODO' ? 'Histórico' : filtro === '1A' ? '1 Año' : `${filtro.charAt(0)} Meses`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {datosFiltradosYKPIs.historial_compuesto && datosFiltradosYKPIs.historial_compuesto.length > 0 ? (
                                            <div className="h-[400px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={datosFiltradosYKPIs.historial_compuesto} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.1} />
                                                        <XAxis
                                                            dataKey="fecha"
                                                            tickFormatter={(str) => {
                                                                try {
                                                                    const date = new Date(str);
                                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                                } catch (e) { return str; }
                                                            }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '900' }}
                                                            dy={15}
                                                        />
                                                        <YAxis
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '900' }}
                                                            tickFormatter={(val) => `$${val}`}
                                                        />
                                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="precio"
                                                            stroke="#6366f1"
                                                            strokeWidth={5}
                                                            fillOpacity={1}
                                                            fill="url(#colorPrecio)"
                                                            activeDot={{ r: 10, strokeWidth: 4, stroke: '#fff', fill: '#4f46e5', shadow: '0 0 30px rgba(99, 102, 241, 0.8)' }}
                                                            animationDuration={1500}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/20 dark:border-slate-700/50 rounded-3xl bg-white/5 dark:bg-slate-900/10 space-y-4">
                                                <span className="text-5xl opacity-30">📉</span>
                                                <p className="text-gray-400 dark:text-slate-500 font-bold mb-0">Sin datos suficientes para proyectar historial</p>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-70 p-10 space-y-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                                        <span className="text-9xl animate-float relative z-10 drop-shadow-2xl">📊</span>
                                    </div>
                                    <div className="text-center max-w-sm">
                                        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-200 tracking-tight">Análisis de Perfil</h2>
                                        <p className="font-bold text-gray-500 dark:text-slate-500 mt-3 leading-relaxed">Selecciona un producto del catálogo para visualizar el histórico de costos y opciones de proveeduría.</p>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                )}
            </div>
        </div>
    );
}
