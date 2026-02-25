import React, { useState, useEffect } from 'react';

// AÑADIMOS la prop abrirModalEnlazar
export default function SidebarCarpetas({ pestanaActiva, setPestanaActiva, setCorreoSeleccionado, correosLista, carpetasNube = [], abrirModalEnlazar }) {
  
  // ESTADOS PARA EL MENÚ CLICK DERECHO
  const [menuVisible, setMenuVisible] = useState(false);
  const [posicionMenu, setPosicionMenu] = useState({ x: 0, y: 0 });
  const [carpetaClick, setCarpetaClick] = useState(null);

  const cambiarPestana = (pestana) => {
    setPestanaActiva(pestana);
    setCorreoSeleccionado(null);
  };

  // FUNCIÓN: Detectar el Click Derecho
  const manejarClickDerecho = (e, carpeta) => {
    e.preventDefault(); // Evita que salga el menú normal feo de Chrome
    setCarpetaClick(carpeta);
    setPosicionMenu({ x: e.pageX, y: e.pageY });
    setMenuVisible(true);
  };

  // FUNCIÓN: Cerrar el menú si das clic en cualquier otro lado
  useEffect(() => {
    const cerrarMenu = () => setMenuVisible(false);
    if (menuVisible) {
      document.addEventListener('click', cerrarMenu);
    }
    return () => {
      document.removeEventListener('click', cerrarMenu);
    };
  }, [menuVisible]);

  const carpetasNormales = carpetasNube.filter(c => !c.esEspecial && !c.ruta.includes('[Gmail]'));

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-col p-4 shrink-0 relative">
      
      <div className="mb-6 pb-4 border-b border-gray-100 dark:border-slate-700">
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Cuenta Activa</p>
         <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-600">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">Mi Gmail Principal</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </button>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Bandeja Principal</p>
        
        <button onClick={() => cambiarPestana('bandeja')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'bandeja' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2-2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
            Para Revisión (Inbox)
          </div>
          {correosLista.length > 0 && pestanaActiva === 'bandeja' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200/50 text-blue-800">{correosLista.length}</span>}
        </button>

        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 mt-6 px-2 flex items-center justify-between">
          Carpetas en la Nube
          <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 px-1.5 py-0.5 rounded-md text-[9px]">{carpetasNormales.length}</span>
        </p>
        
        {carpetasNormales.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400 italic">Cargando carpetas...</div>
        ) : (
          carpetasNormales.map((carpeta, index) => (
            <button 
              key={index} 
              onClick={() => cambiarPestana(carpeta.ruta)} 
              onContextMenu={(e) => manejarClickDerecho(e, carpeta)} // <--- EL EVENTO MÁGICO
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all ${pestanaActiva === carpeta.ruta ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <svg className={`w-4 h-4 shrink-0 ${pestanaActiva === carpeta.ruta ? 'text-emerald-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                <span className="truncate">{carpeta.nombre}</span>
              </div>
            </button>
          ))
        )}
      </nav>

      {/* EL MENÚ CONTEXTUAL FLOTANTE (Oculto hasta que das clic derecho) */}
      {menuVisible && (
        <div 
          className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-xl py-2 w-56 animate-fade-in"
          style={{ top: posicionMenu.y, left: posicionMenu.x }}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase truncate">Opciones para:</p>
            <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">{carpetaClick?.nombre}</p>
          </div>
          
          <button 
            onClick={() => {
              setMenuVisible(false); // Cierra el menú click derecho
              abrirModalEnlazar(carpetaClick); // Abre la super ventana
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/30 dark:hover:text-purple-400 flex items-center gap-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            Enlazar a Proveedor
          </button>
          
          <button 
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Forzar Sincronización
          </button>
          
          <div className="my-1 border-t border-gray-100 dark:border-slate-700"></div>
          
          <button 
            className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 transition-colors"
          >
            Ocultar Carpeta
          </button>
        </div>
      )}

      <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
        <button onClick={() => cambiarPestana('configuracion')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'configuracion' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Cuentas IMAP
        </button>
      </div>
    </aside>
  );
}