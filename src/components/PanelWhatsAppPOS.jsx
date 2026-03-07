import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function PanelWhatsAppPOS({ proveedor, onClose, onInsertarPedido }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const cargarCatalogo = async () => {
      console.log("[POS] Proveedor data recibida:", proveedor);
      setCargando(true);
      if (proveedor && proveedor.carpetaAsociada) {
        try {
          console.log("[POS] Pidiendo productos al backend para la carpeta:", proveedor.carpetaAsociada);
          // El backend espera el nombre completo de la carpeta (proveedor.carpetaAsociada)
          const res = await ipcRenderer.invoke('obtener-productos-proveedor', proveedor.carpetaAsociada);
          console.log("[POS] Respuesta del backend (productos):", res);

          if (Array.isArray(res)) {
            setProductos(res);
          } else if (res && typeof res === 'object') {
            // El backend devuelve un diccionario donde la LLAVE es la descripción del producto
            // Transformarlo a un Array para que React lo pueda iterar con .map()
            const productosArray = Object.entries(res).map(([nombreProducto, detalles]) => ({
              descripcion: nombreProducto,
              ...detalles
            }));
            setProductos(productosArray);
          } else {
            console.error("[POS] Formato desconocido devuelto por el backend:", res);
            setProductos([]);
          }
        } catch (error) {
          console.error("[POS] Error cargando productos", error);
          setProductos([]);
        }
      } else {
        console.warn("[POS] Faltan datos del proveedor o no tiene carpeta asociada", proveedor);
        setProductos([]);
      }
      setCargando(false);
    };

    cargarCatalogo();
    setCarrito({});
  }, [proveedor]);

  const modificarCantidad = (prodId, delta) => {
    setCarrito(prev => {
      const actual = prev[prodId] || 0;
      const nueva = actual + delta;

      const newCart = { ...prev };
      if (nueva <= 0) {
        delete newCart[prodId];
      } else {
        newCart[prodId] = nueva;
      }
      return newCart;
    });
  };

  const handleTerminar = () => {
    // Construir el string del pedido
    let pedidoStr = `*📦 PEDIDO ATRIA - ${proveedor.nombre}*\n\n`;
    let totalLineas = 0;

    Object.keys(carrito).forEach(id => {
      const prod = productos.find(p => p.id === id || p.claveProv === id || p.descripcion === id);
      if (prod) {
        const qty = carrito[id];
        pedidoStr += `▫️ ${qty}x ${prod.descripcion}\n`;
        totalLineas++;
      }
    });

    pedidoStr += `\n_Mensaje generado automáticamente vía Atria ERP_`;

    console.log("[POS] Pedido generado para inyectar:\n", pedidoStr);

    if (totalLineas > 0) {
      onInsertarPedido(pedidoStr);
    }
  };

  const prodsFiltrados = productos.filter(p => p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalItemsEnCarrito = Object.values(carrito).reduce((acc, qty) => acc + qty, 0);

  return (
    <div className="w-full h-full bg-white/60 dark:bg-slate-950/40 backdrop-blur-2xl flex flex-col z-10 animate-fade-in shadow-2xl border-l border-white/40 dark:border-slate-800/50 relative overflow-hidden">

      {/* Orbs internos decorativos (Atria Boost POS Style) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-20%] w-[100%] h-[50%] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[100%] h-[50%] bg-emerald-500/10 dark:bg-emerald-600/5 rounded-full blur-[80px]"></div>
      </div>

      {/* HEADER */}
      <div className="px-5 py-4 border-b border-gray-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative z-10">
        <span className="font-black text-xs text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          Generador de Pedidos
        </span>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="text-gray-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-xl transition-all hover:scale-110 cursor-pointer border border-transparent hover:border-red-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* INFO PROVEEDOR */}
        <div className="p-5 bg-transparent shrink-0">
          <div className="bg-white/40 dark:bg-slate-900/40 p-4 rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-inner group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <div className="min-w-0 flex flex-col">
                <p className="font-black text-gray-800 dark:text-white text-base truncate tracking-tight">{proveedor?.nombre}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/30 uppercase tracking-tighter">
                    {proveedor?.rfc || "Sin RFC"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Buscar en el catálogo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm py-3.5 pl-10 pr-4 bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-800/80 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-200 transition-all font-semibold placeholder:text-gray-400 italic"
            />
          </div>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar relative">
          {cargando ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full shadow-lg"></div>
              <p className="text-sm font-bold tracking-tight">Sincronizando catálogo...</p>
            </div>
          ) : prodsFiltrados.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-slate-800/50 rounded-[2rem] text-center mt-4 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
              <p className="text-sm text-gray-400 font-medium">
                {searchTerm ? "No se encontraron resultados." : "No hay catálogo disponible."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 pb-28">
              {prodsFiltrados.map((prod, i) => {
                const pid = prod.id || prod.claveProv || prod.descripcion;
                const qty = carrito[pid] || 0;

                return (
                  <div key={i} className={`p-4 rounded-[1.75rem] border backdrop-blur-md transition-all duration-300 ${qty > 0 ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-500/50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/10 scale-[1.02]' : 'border-white/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-800/30 hover:border-blue-400/50 hover:bg-white/60 dark:hover:bg-slate-800/50'} flex flex-col gap-3 group`}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-black text-gray-800 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {prod.descripcion}
                      </p>
                      {qty > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce-in shadow-md">
                          EN CARRITO
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                          {prod.claveProv ? `#${prod.claveProv}` : (prod.codigoBarras ? `#${prod.codigoBarras}` : 'Código SF')}
                        </span>
                        {prod.precioActual && (
                          <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                            ${(Number(prod.precioActual) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            <span className="text-[10px] text-gray-400 ml-1 font-bold">{prod.unidad || 'PZA'}</span>
                          </span>
                        )}
                      </div>

                      {/* CONTROLES CARRITO PREMIUM */}
                      <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
                        <button
                          onClick={() => modificarCantidad(pid, -1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${qty > 0 ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40' : 'text-gray-300 pointer-events-none'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                        </button>

                        <div className="w-8 text-center text-sm font-black text-gray-800 dark:text-white">
                          {qty}
                        </div>

                        <button
                          onClick={() => modificarCantidad(pid, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 transition-all font-black"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DOCK DEL CARRITO INFERIOR GLASS */}
        <div className={`absolute bottom-0 left-0 right-0 p-5 bg-white/70 dark:bg-slate-950/80 backdrop-blur-3xl border-t border-white/60 dark:border-slate-800/80 transition-all duration-500 ease-in-out z-20 ${totalItemsEnCarrito > 0 ? 'translate-y-0 opacity-100 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]' : 'translate-y-full opacity-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Resumen del Pedido</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{totalItemsEnCarrito} Items seleccionados</span>
          </div>
          <button
            onClick={handleTerminar}
            className="w-full py-4.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 flex justify-center items-center gap-3 text-base transition-all transform hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
          >
            <span>Confirmar Pedido</span>
            <div className="w-px h-6 bg-white/20"></div>
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
