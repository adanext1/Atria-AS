import React from 'react';
import VistaPrevia from './VistaPrevia'; // Importamos a su hermano para las pantallas pequeñas

const paletasDominio = [
  { id: 'blue', light: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-800', hover: 'hover:border-blue-400 hover:shadow-blue-500/10', iconBg: 'bg-blue-100 text-blue-600', darkBg: 'dark:bg-blue-900/10', darkBorder: 'dark:border-blue-800/40' },
  { id: 'emerald', light: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-800', hover: 'hover:border-emerald-400 hover:shadow-emerald-500/10', iconBg: 'bg-emerald-100 text-emerald-600', darkBg: 'dark:bg-emerald-900/10', darkBorder: 'dark:border-emerald-800/40' },
  { id: 'purple', light: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-800', hover: 'hover:border-purple-400 hover:shadow-purple-500/10', iconBg: 'bg-purple-100 text-purple-600', darkBg: 'dark:bg-purple-900/10', darkBorder: 'dark:border-purple-800/40' },
  { id: 'orange', light: 'bg-orange-50/70', border: 'border-orange-200', text: 'text-orange-800', hover: 'hover:border-orange-400 hover:shadow-orange-500/10', iconBg: 'bg-orange-100 text-orange-600', darkBg: 'dark:bg-orange-900/10', darkBorder: 'dark:border-orange-800/40' },
  { id: 'rose', light: 'bg-rose-50/70', border: 'border-rose-200', text: 'text-rose-800', hover: 'hover:border-rose-400 hover:shadow-rose-500/10', iconBg: 'bg-rose-100 text-rose-600', darkBg: 'dark:bg-rose-900/10', darkBorder: 'dark:border-rose-800/40' }
];

const getColorPorRemitente = (email) => {
  if (!email) return paletasDominio[0];
  const dominio = email.split('@')[1] || email;
  let hash = 0;
  for (let i = 0; i < dominio.length; i++) hash = dominio.charCodeAt(i) + ((hash << 5) - hash);
  return paletasDominio[Math.abs(hash) % paletasDominio.length];
};

export default function ListaCorreos({ correosLista, correoSeleccionado, seleccionados, setSeleccionados, seleccionarYDescargar, detallesCorreo, setCorreoSeleccionado, importando, progresoImportacion, procesarImportacion, escaneando, cargarMasCorreos }) {
  
  if (correosLista.length === 0) {
    return (
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto items-center justify-center text-center animate-fade-in-up">
        <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Bandeja Lista</h2>
        <p className="text-gray-500 dark:text-slate-400">Dale clic al botón azul de <strong className="text-blue-600 dark:text-blue-400">"Escanear Correos"</strong> para descargar facturas.</p>
      </div>
    );
  }

  const toggleSeleccion = (id, e) => {
    e.stopPropagation();
    setSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === correosLista.length) setSeleccionados([]);
    else setSeleccionados(correosLista.map(c => c.id));
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${correoSeleccionado ? 'w-full lg:w-5/12' : 'w-full max-w-5xl mx-auto'}`}>
      
      {/* BARRA DE ACCIONES MASIVAS */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 lg:gap-3">
          <input type="checkbox" checked={seleccionados.length === correosLista.length && correosLista.length > 0} onChange={seleccionarTodos} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ml-1 lg:ml-2" />
          <span className="text-xs lg:text-sm font-bold text-gray-500 dark:text-gray-400">Todo</span>
        </div>
        <div className={`flex gap-2 transition-opacity duration-300 ${seleccionados.length > 0 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <button 
            onClick={procesarImportacion}
            disabled={importando}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 ${importando ? 'bg-purple-600 text-white cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}
          >
            {importando ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Procesando {progresoImportacion.actual}/{progresoImportacion.total}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> 
                Importar Seleccionados
              </>
            )}
          </button>
        </div>
      </div>

      {/* LISTA DE TARJETAS */}
      <div className="overflow-y-auto space-y-3 pb-20 pr-1 custom-scrollbar">
        {correosLista.map(correo => {
          const colorP = getColorPorRemitente(correo.remitente);
          const estaActivo = correoSeleccionado?.id === correo.id;

          return (
            <div key={correo.id} className="flex flex-col">
              <div 
                onClick={() => seleccionarYDescargar(correo)}
                className={`rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3 lg:gap-4 group 
                  ${estaActivo ? `${colorP.light} ${colorP.darkBg} ${colorP.border} ${colorP.darkBorder} shadow-md transform scale-[1.01] lg:scale-100` : `bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:shadow-sm ${colorP.hover}`}`}
              >
                <div className="pt-0.5 lg:pt-1">
                  <input type="checkbox" checked={seleccionados.includes(correo.id)} onChange={(e) => toggleSeleccion(correo.id, e)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-black truncate pr-2 text-xs lg:text-sm ${estaActivo ? colorP.text : 'text-gray-800 dark:text-white'}`}>{correo.empresa || correo.remitente}</h3>
                    <span className="text-[9px] lg:text-[10px] font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">{correo.fecha}</span>
                  </div>
                  <p className={`text-xs lg:text-sm font-semibold truncate mb-1 ${estaActivo ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-slate-300'}`}>{correo.asunto}</p>
                  <p className="hidden md:block text-xs text-gray-500 dark:text-slate-500 truncate mb-2">{correo.mensaje}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 mt-2 md:mt-0">
                      {correo.tieneXml && <span className="flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-black tracking-wider uppercase border border-purple-200 dark:border-purple-800/50">XML</span>}
                      {correo.tienePdf && <span className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-black tracking-wider uppercase border border-red-200 dark:border-red-800/50">PDF</span>}
                      {!correo.tieneXml && !correo.tienePdf && <span className="flex items-center gap-1 bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold tracking-wider uppercase">Solo Texto</span>}
                    </div>
                    {correo.total && correo.total !== 'Por calcular' && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">{correo.total}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* MODO ACORDEÓN PARA CELULARES */}
              {estaActivo && (
                <div className="block lg:hidden w-full cursor-default pb-2">
                  <VistaPrevia 
                    correoSeleccionado={correoSeleccionado} 
                    setCorreoSeleccionado={setCorreoSeleccionado} 
                    detallesCorreo={detallesCorreo} 
                    esModoAcordeon={true} 
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* BOTÓN CARGAR MÁS CORREOS */}
        {correosLista.length > 0 && (
          <div className="p-4 mt-2 flex justify-center border-t border-gray-100 dark:border-slate-700/50">
            <button 
              onClick={cargarMasCorreos}
              disabled={escaneando}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {escaneando ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Buscando en Google...
                </>
              ) : (
                'Cargar correos más antiguos'
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}