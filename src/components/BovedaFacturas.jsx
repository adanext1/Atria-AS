import { useState } from 'react';

export default function BovedaFacturas({ alVolver, modoOscuro, toggleTema }) {
  // 1. Estados para los filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroProveedor, setFiltroProveedor] = useState('Todos');

  // DATOS DE PRUEBA (Mockup): Así se verá cuando leamos tus carpetas reales
  const [facturasMock] = useState([
    { id: 1, folio: 'F-8923', proveedor: 'Bimbo S.A. de C.V.', fecha: '2026-02-14', monto: 4500.00, estado: 'Pendiente', tienePDF: true, tieneXML: true },
    { id: 2, folio: 'A-102', proveedor: 'Papelería Tony', fecha: '2026-02-10', monto: 850.50, estado: 'Pagada', tienePDF: true, tieneXML: true },
    { id: 3, folio: 'FAC-991', proveedor: 'Coca-Cola', fecha: '2026-01-25', monto: 12400.00, estado: 'Pagada', tienePDF: true, tieneXML: true },
    { id: 4, folio: 'B-404', proveedor: 'Bimbo S.A. de C.V.', fecha: '2025-12-15', monto: 3200.00, estado: 'Pagada', tienePDF: false, tieneXML: true }, // Ejemplo sin PDF
    { id: 5, folio: 'F-8810', proveedor: 'CFE', fecha: '2026-02-01', monto: 5420.00, estado: 'Vencida', tienePDF: true, tieneXML: true },
  ]);

  const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  // 2. MOTOR DE BÚSQUEDA Y FILTRADO MÚLTIPLE
  const facturasFiltradas = facturasMock.filter((fac) => {
    // Filtro por texto (Busca en Folio o Proveedor)
    const coincideTexto = fac.folio.toLowerCase().includes(busqueda.toLowerCase()) || 
                          fac.proveedor.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por Año y Mes (Extrayendo de la fecha YYYY-MM-DD)
    const anioFac = fac.fecha.split('-')[0];
    const mesFac = fac.fecha.split('-')[1];
    
    const coincideAnio = filtroAnio === 'Todos' || anioFac === filtroAnio;
    const coincideMes = filtroMes === 'Todos' || mesFac === filtroMes;
    const coincideProv = filtroProveedor === 'Todos' || fac.proveedor === filtroProveedor;

    return coincideTexto && coincideAnio && coincideMes && coincideProv;
  });

  // Extraer listas únicas para los selectores (dropdowns)
  const proveedoresUnicos = ['Todos', ...new Set(facturasMock.map(f => f.proveedor))];
  const aniosUnicos = ['Todos', '2026', '2025', '2024']; // Esto luego se calculará automático
  const meses = [
    { valor: 'Todos', nombre: 'Todos los Meses' }, { valor: '01', nombre: 'Enero' }, { valor: '02', nombre: 'Febrero' },
    { valor: '03', nombre: 'Marzo' }, { valor: '04', nombre: 'Abril' }, { valor: '05', nombre: 'Mayo' },
    { valor: '06', nombre: 'Junio' }, { valor: '07', nombre: 'Julio' }, { valor: '08', nombre: 'Agosto' },
    { valor: '09', nombre: 'Septiembre' }, { valor: '10', nombre: 'Octubre' }, { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto pb-20">
      
      {/* HEADER SUPERIOR */}
      <header className="animate-fade-in-up flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <button onClick={alVolver} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver al Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
            {facturasFiltradas.length} Facturas
          </div>
          <button onClick={toggleTema} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition">
            {modoOscuro ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* TÍTULO Y BARRA DE FILTROS GIGANTE */}
      <div className="animate-fade-in-up delay-100 mb-6 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
          Bóveda de Facturas
          <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-slate-900 px-3 py-1 rounded-full">Buscador Global</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Buscador de texto */}
          <div className="col-span-1 md:col-span-2 relative">
            <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Buscar por Folio o Proveedor..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Filtro Proveedor */}
          <div>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} className="w-full py-3 px-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500">
              {proveedoresUnicos.map(p => <option key={p} value={p}>{p === 'Todos' ? '🏢 Todos los Proveedores' : p}</option>)}
            </select>
          </div>

          {/* Filtro Fecha (Año y Mes) */}
          <div className="flex gap-2">
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="w-1/2 py-3 px-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white outline-none cursor-pointer">
              {aniosUnicos.map(a => <option key={a} value={a}>{a === 'Todos' ? '📅 Año' : a}</option>)}
            </select>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-1/2 py-3 px-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white outline-none cursor-pointer">
              {meses.map(m => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <main className="animate-fade-in-up delay-200 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm">Archivos</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm">Folio</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm">Proveedor</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm">Fecha</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm text-right">Total</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm text-center">Estado</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-slate-300 text-sm text-center">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-gray-500 dark:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    No se encontraron facturas con esos filtros.
                  </td>
                </tr>
              ) : (
                facturasFiltradas.map((fac) => (
                  <tr key={fac.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors group">
                    
                    {/* Iconos de archivos disponibles */}
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {fac.tieneXML && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800" title="XML Guardado">XML</span>}
                        {fac.tienePDF && <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800" title="PDF Guardado">PDF</span>}
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-gray-800 dark:text-gray-200">{fac.folio}</td>
                    
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400">
                          {fac.proveedor.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white">{fac.proveedor}</span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{fac.fecha}</td>
                    
                    <td className="p-4 text-right font-bold text-gray-800 dark:text-white">{formatearDinero(fac.monto)}</td>
                    
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        fac.estado === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                        fac.estado === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                        'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                      }`}>
                        {fac.estado}
                      </span>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 dark:bg-slate-700 dark:hover:bg-blue-900/50 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg transition" title="Ver Detalles XML">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        {fac.tienePDF && (
                          <button className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900/50 dark:text-gray-300 dark:hover:text-red-400 rounded-lg transition" title="Abrir PDF original">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

    </div>
  );
}