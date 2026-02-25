import React, { useState } from 'react';

// Simulamos tu base de datos de proveedores del ERP
const proveedoresBD = [
  { id: 1, nombre: 'Arca Continental', rfc: 'ACO010203XX1', logo: 'A' },
  { id: 2, nombre: 'Bimbo S.A. de C.V.', rfc: 'BIM990101XX2', logo: 'B' },
  { id: 3, nombre: 'OfficeMax', rfc: 'OMX120304XX3', logo: 'O' },
  { id: 4, nombre: 'CFE Suministrador', rfc: 'CSS160330CP7', logo: 'C' },
  { id: 5, nombre: 'Casa Ley', rfc: 'LEY700814XX4', logo: 'L' }
];

export default function ModalEnlazar({ isOpen, onClose, carpeta }) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);

  if (!isOpen) return null;

  const proveedoresFiltrados = proveedoresBD.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.rfc.toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardarEnlace = () => {
    // Aquí después le diremos al Cerebro que guarde esto en la Base de Datos
    alert(`¡Éxito! La carpeta "${carpeta.nombre}" ahora pertenece al proveedor: ${seleccionado.nombre}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABECERA DEL MODAL */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Enlazar Carpeta</h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-1">
              Conectando <span className="text-blue-600 dark:text-blue-400 font-bold">"{carpeta?.nombre}"</span> a tu directorio.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="p-6 pb-2">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Buscar proveedor por nombre o RFC..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2 custom-scrollbar">
          {proveedoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">No se encontraron proveedores.</div>
          ) : (
            proveedoresFiltrados.map(prov => (
              <div 
                key={prov.id}
                onClick={() => setSeleccionado(prov)}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer border-2 transition-all ${seleccionado?.id === prov.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/30 hover:border-gray-100 dark:hover:border-slate-600'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${seleccionado?.id === prov.id ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
                  {prov.logo}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${seleccionado?.id === prov.id ? 'text-purple-900 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>{prov.nombre}</h4>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">RFC: {prov.rfc}</p>
                </div>
                {seleccionado?.id === prov.id && (
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
            ))
          )}
        </div>

        {/* PIE DEL MODAL / BOTÓN GUARDAR */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button 
            onClick={guardarEnlace}
            disabled={!seleccionado}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            Vincular al ERP
          </button>
        </div>
      </div>
    </div>
  );
}