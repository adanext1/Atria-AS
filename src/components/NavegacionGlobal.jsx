import { useState, useEffect, useRef } from 'react';
const { ipcRenderer } = window.require('electron');

export default function NavegacionGlobal({
    pantallaActual,
    cambiarPantalla,
    modoOscuro,
    toggleTema,
    modoRendimiento,
    toggleRendimiento,
    alCerrarSesion
}) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    // Cerrar el menú si se hace clic fuera de él
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuAbierto(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    // Sincronizar tema con la barra de título de Electron
    useEffect(() => {
        ipcRenderer.send('update-titlebar', { isDark: modoOscuro });
    }, [modoOscuro]);

    // Lista de módulos para la navegación rápida (Sincronizado con Dashboard)
    const modulos = [
        { id: 'dashboard', nombre: 'Centro de Control', icono: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { id: 'importador', nombre: 'Importador', icono: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', color: 'text-blue-600 dark:text-white', bg: 'bg-blue-50 dark:bg-blue-500/20' }, // En dashboard el contenedor es azul sólido pero el icono es blanco/celeste
        { id: 'proveedores', nombre: 'Proveedores', icono: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
        { id: 'clientes', nombre: 'Clientes', icono: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
        { id: 'boveda', nombre: 'Bóveda de Facturas', icono: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { id: 'modulo-correos', nombre: 'Buzón Inteligente', icono: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { id: 'modulo-productos', nombre: 'Centro de Productos', icono: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
        { id: 'modulo-precios', nombre: 'Analítica de Precios', icono: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        { id: 'centro-apps', nombre: 'Centro de Apps', icono: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/30' },
        { id: 'configuracion', nombre: 'Configuración', icono: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    ];

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#020617]/90 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 shadow-sm transition-colors duration-500 px-4 md:px-8 py-3 draggable-region">
                <div className="max-w-[1800px] mx-auto flex items-center justify-between relative pr-32">

                    {/* Menú Hamburguesa + Logo  */}
                    <div className="flex items-center gap-4 no-drag" ref={menuRef}>
                        <button
                            onClick={() => setMenuAbierto(!menuAbierto)}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={menuAbierto ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
                            </svg>
                        </button>

                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => cambiarPantalla('dashboard')}
                        >
                            <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5 uppercase group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                                Atria <span className="text-blue-500 dark:text-cyan-400 text-sm opacity-80 mt-0.5">&bull;</span>
                            </h1>
                        </div>

                        {/* Menú Desplegable (Dropdown flotante, ahora vive dentro del menuRef junto con su botón) */}
                        {menuAbierto && (
                            <div
                                className="absolute top-16 left-4 sm:left-8 z-50 w-[280px] sm:w-[320px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-white/40 dark:border-slate-700/50 overflow-hidden animate-scale-in origin-top-left"
                            >
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border-b border-gray-100 dark:border-slate-700/50 relative overflow-hidden">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        Navegación Rápida
                                    </h3>
                                    {/* Brillo decorativo superior */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
                                </div>
                                {/* Se removió el scroll custom de tailwind aquí para que herede el nuevo Global y sea más limpio */}
                                <div className="p-2.5 max-h-[65vh] overflow-y-auto pr-1.5 flex flex-col gap-1">
                                    {modulos.map((mod, index) => (
                                        <button
                                            key={mod.id}
                                            style={{ animationDelay: `${index * 40}ms` }}
                                            onClick={() => {
                                                cambiarPantalla(mod.id);
                                                setMenuAbierto(false);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-[1.25rem] transition-all duration-200 text-left opacity-0 animate-slide-in-right group outline-none focus:ring-2 focus:ring-blue-500/30 ${pantallaActual === mod.id
                                                ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/10'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium'
                                                }`}
                                        >
                                            <div className={`p-2.5 rounded-xl transition-all duration-300 ${mod.bg} ${pantallaActual === mod.id ? 'scale-110 shadow-sm' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`}>
                                                <svg className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${mod.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pantallaActual === mod.id ? "2.5" : "2"} d={mod.icono} />
                                                </svg>
                                            </div>
                                            <span className={`${pantallaActual === mod.id ? 'font-bold' : 'group-hover:font-semibold'}`}>
                                                {mod.nombre}
                                            </span>
                                            {pantallaActual === mod.id && (
                                                <div className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Nombre de la sección actual (Oculto en móviles chicos si el texto es muy largo, pero como no hay tanto espacio, lo ajustamos) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10">
                            {modulos.find(m => m.id === pantallaActual)?.nombre || 'Sistema'}
                        </span>
                    </div>

                    {/* Lado Derecho: Controles */}
                    <div className="flex items-center gap-3 no-drag">
                        <button
                            onClick={toggleRendimiento}
                            className={`p-2.5 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/50 outline-none flex items-center justify-center gap-1.5 hidden sm:flex ${modoRendimiento ? 'bg-emerald-100 dark:bg-emerald-500/10 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                            title={modoRendimiento ? "Rendimiento Activado (Gráficos Bajos)" : "Calidad Alta Activada (Efectos Glass)"}
                        >
                            {modoRendimiento ? (
                                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                            )}
                        </button>
                        <button
                            onClick={toggleTema}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                            title={modoOscuro ? "Cambiar a modo Claro" : "Cambiar a modo Oscuro"}
                        >
                            {modoOscuro ? (
                                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                        <button
                            onClick={alCerrarSesion}
                            className="hidden sm:flex items-center gap-2 p-2.5 px-4 rounded-xl font-bold text-sm bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Salir
                        </button>

                        {/* Botón Salir solo Icono en móviles */}
                        <button
                            onClick={alCerrarSesion}
                            className="sm:hidden p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

            </div>

            {/* Espaciador invisible para empujar el contenido hacia abajo (ya que la barra es fixed) */}
            <div className="h-[76px] w-full"></div>
        </>
    );
}
