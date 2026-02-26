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
            // Autoseleccionamos el primero si hay datos
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

    // Formatenado el tooltip de la gráfica
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-xl z-50 transition-colors">
                    <p className="text-gray-500 dark:text-gray-400 font-bold mb-2 text-xs uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex flex-col mb-2 last:mb-0">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{entry.payload.rfc_proveedor}</span>
                            <span className="font-bold text-lg" style={{ color: entry.color }}>
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
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col transition-colors duration-300">

            {/* HEADER SUPERIOR */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 md:px-8 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-4">
                    <button onClick={volverAlDashboard} className="p-2 bg-gray-50 dark:bg-slate-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-700"></div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="text-indigo-600 dark:text-indigo-400">📈</span> Inteligencia de Precios
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Análisis histórico y evaluación evolutiva de costos</p>
                    </div>
                </div>
            </div>

            {estaCargando ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="mt-4 font-bold text-indigo-500">Agrupando historiales de precios...</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                    {/* PANEL IZQUIERDO: LISTA DE PRODUCTOS */}
                    <div className="w-full lg:w-1/3 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col transition-colors">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar producto a examinar..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 dark:text-white transition-colors shadow-inner"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {analiticasFiltradas.length > 0 ? (
                                analiticasFiltradas.map(prod => (
                                    <div
                                        key={prod.id_maestro}
                                        onClick={() => setProductoSeleccionado(prod)}
                                        className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${productoSeleccionado?.id_maestro === prod.id_maestro
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-500/50 shadow-md'
                                            : 'bg-white dark:bg-slate-800 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-bold text-sm truncate pr-2 ${productoSeleccionado?.id_maestro === prod.id_maestro ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-white'}`}>
                                                {prod.nombre_global}
                                            </h3>
                                            {!prod.auditado && (
                                                <span className="shrink-0 text-[9px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-black px-1.5 py-0.5 rounded uppercase">Asilado</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">${prod.kpis.ultimoPrecio.toFixed(2)}</span>
                                            <div className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${prod.kpis.variacionPorcentualTotal > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                prod.kpis.variacionPorcentualTotal < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
                                                }`}>
                                                {prod.kpis.variacionPorcentualTotal > 0 ? '↗' : prod.kpis.variacionPorcentualTotal < 0 ? '↘' : '→'}
                                                {Math.abs(prod.kpis.variacionPorcentualTotal)}%
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-50">
                                    <span className="text-4xl block mb-2">🔭</span>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No hay resultados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PANEL DERECHO: EL LIENZO DE ANÁLISIS */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        {productoSeleccionado && datosFiltradosYKPIs ? (
                            <div className="animate-fade-in-up max-w-5xl mx-auto space-y-6">

                                {/* CABECERA DE PRODUCTO */}
                                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden transition-colors">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">{productoSeleccionado.total_proveedores} Proveedores Mapeados</span>
                                                {productoSeleccionado.auditado && (
                                                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                        Auditado IA
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-2xl md:text-4xl font-black text-gray-800 dark:text-white leading-tight">{productoSeleccionado.nombre_global}</h2>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Último Precio Detectado</p>
                                            <p className="text-4xl md:text-5xl font-black text-indigo-600 dark:text-indigo-400">${datosFiltradosYKPIs.kpis.ultimoPrecio.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* TARJETAS DE KPIS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Mínimo Histórico
                                        </p>
                                        <p className="text-3xl font-black text-gray-800 dark:text-white">${datosFiltradosYKPIs.kpis.precioMin.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Máximo Histórico
                                        </p>
                                        <p className="text-3xl font-black text-gray-800 dark:text-white">${datosFiltradosYKPIs.kpis.precioMax.toFixed(2)}</p>
                                    </div>
                                    <div className={`p-6 rounded-3xl shadow-sm border ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0
                                        ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
                                        : datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0
                                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
                                        } transition-colors`}>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? 'text-red-500' :
                                            datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0 ? 'text-emerald-500' :
                                                'text-gray-400 dark:text-gray-500'
                                            }`}>Diferencia Evolutiva</p>
                                        <p className={`text-3xl font-black ${datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? 'text-red-600 dark:text-red-400' :
                                            datosFiltradosYKPIs.kpis.variacionPorcentualTotal < 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                                'text-gray-800 dark:text-white'
                                            }`}>
                                            {datosFiltradosYKPIs.kpis.variacionPorcentualTotal > 0 ? '+' : ''}{datosFiltradosYKPIs.kpis.variacionPorcentualTotal}%
                                        </p>
                                    </div>
                                </div>

                                {/* DESGLOSE POR PROVEEDOR */}
                                {productoSeleccionado.proveedores_vinculados && productoSeleccionado.proveedores_vinculados.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                                        <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Opciones de Surtido Actuales</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {productoSeleccionado.proveedores_vinculados.map((prov, i) => (
                                                <div key={i} className="flex flex-col bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors">
                                                    <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 self-start px-2 py-0.5 rounded-full" title={prov.rfc}>{prov.nombre_comercial}</span>
                                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-2 mb-3" title={prov.nombre_original}>{prov.nombre_original}</span>
                                                    <span className="text-2xl font-black text-gray-600 dark:text-gray-400 mt-auto">${prov.precioActual.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* GRÁFICA GIGANTE */}
                                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                        <h3 className="text-lg font-black text-gray-800 dark:text-white">Línea del Tiempo de Costos</h3>
                                        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                                            {['3M', '6M', '1A', 'TODO'].map(filtro => (
                                                <button
                                                    key={filtro}
                                                    onClick={() => setFiltroTiempo(filtro)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTiempo === filtro
                                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                                >
                                                    {filtro === 'TODO' ? 'Todo' : filtro === '1A' ? '1 Año' : `${filtro.charAt(0)} Meses`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {datosFiltradosYKPIs.historial_compuesto && datosFiltradosYKPIs.historial_compuesto.length > 0 ? (
                                        <div className="h-80 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={datosFiltradosYKPIs.historial_compuesto} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                                                    <XAxis
                                                        dataKey="fecha"
                                                        tickFormatter={(str) => {
                                                            const date = new Date(str);
                                                            return `${date.getDate()}/${date.getMonth() + 1}`;
                                                        }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                                                        tickFormatter={(val) => `$${val}`}
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="precio"
                                                        stroke="#6366f1"
                                                        strokeWidth={4}
                                                        fillOpacity={1}
                                                        fill="url(#colorPrecio)"
                                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
                                            <p className="text-gray-400 dark:text-gray-500 font-bold">No hay un historial trazable para este ítem.</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <span className="text-8xl mb-6">📊</span>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200">Selecciona un Producto</h2>
                                <p className="font-bold text-gray-500 dark:text-gray-400 mt-2">Elige un ítem del panel izquierdo para analizar su comportamiento en el mercado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
