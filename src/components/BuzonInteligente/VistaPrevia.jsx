import React from 'react';

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

export default function VistaPrevia({ correoSeleccionado, setCorreoSeleccionado, detallesCorreo, esModoAcordeon = false, importarCorreoActual, importando }) {
  if (!correoSeleccionado) return null;

  const colorP = getColorPorRemitente(correoSeleccionado.remitente);

  return (
    <div onClick={(e) => e.stopPropagation()} className={`flex flex-col bg-white dark:bg-slate-800 overflow-hidden relative z-10 animate-fade-in transition-all ${esModoAcordeon ? 'rounded-xl border border-gray-100 dark:border-slate-700 mt-3 shadow-inner' : 'rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 h-full w-full'}`}>

      {/* HEADER DE VISTA PREVIA */}
      <div className={`${colorP.light} ${colorP.darkBg} p-5 lg:p-6 border-b ${colorP.border} ${colorP.darkBorder} flex justify-between items-start shrink-0`}>
        <div className="flex items-center gap-3 lg:gap-4">
          <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-black text-lg lg:text-xl shadow-inner shrink-0 ${colorP.iconBg}`}>
            {correoSeleccionado.empresa ? correoSeleccionado.empresa.charAt(0) : '@'}
          </div>
          <div>
            <h2 className={`text-lg lg:text-xl font-black ${colorP.text} leading-tight`}>{correoSeleccionado.asunto}</h2>
            <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-slate-300 mt-1">De: <span className="font-bold">{correoSeleccionado.remitente}</span></p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setCorreoSeleccionado(null)} className="p-2 bg-white/50 dark:bg-slate-900/50 hover:bg-white hover:text-red-500 dark:hover:bg-slate-900 dark:hover:text-red-400 rounded-lg text-gray-600 dark:text-gray-300 transition-colors shadow-sm" title="Cerrar Panel">
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      {/* CUERPO DEL CORREO */}
      <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
        <p className="text-gray-700 dark:text-gray-300 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap">{correoSeleccionado.mensaje}</p>
      </div>

      {/* DETECTOR DE XML O PDF INTELIGENTE */}
      {/* 1. FLUJO NORMAL: Si viene XML, mostramos los datos hermosos extraídos de él */}
      {detallesCorreo.xmlInfo ? (
        <div className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-3 lg:p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Factura: {detallesCorreo.xmlInfo.folio}</p>
              <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-gray-200">Total a Pagar: ${detallesCorreo.xmlInfo.total} {detallesCorreo.xmlInfo.moneda}</p>
            </div>
          </div>
          <button
            onClick={importarCorreoActual}
            disabled={importando}
            className={`w-full md:w-auto px-4 py-2 text-xs lg:text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 ${importando ? 'bg-purple-400 text-white cursor-wait' : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-500/30 transform hover:-translate-y-0.5'}`}
          >
            {importando ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Guardando...
              </>
            ) : (
              'Importar al Sistema'
            )}
          </button>
        </div>
      ) : (
        /* 2. FLUJO DE EXCEPCIÓN: ¡El PDF Huérfano! Si descargamos y vimos un archivo pero NO hay xmlInfo */
        correoSeleccionado.tienePdf && detallesCorreo.pdfData && (
          <div className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg shadow-sm font-bold text-lg">✏️</div>
              <div>
                <p className="text-xs lg:text-sm font-bold text-orange-800 dark:text-orange-400">PDF sin XML asociado.</p>
                <p className="text-[10px] lg:text-xs font-semibold text-gray-600 dark:text-gray-400">Dile al sistema a qué proveedor de tu base pertenece este gasto.</p>
              </div>
            </div>

            <button
              onClick={abrirModalPDFManual}
              disabled={importando}
              className={`w-full md:w-auto px-4 py-2.5 text-xs font-bold text-white rounded-lg shadow-md transition transform ${importando ? 'bg-orange-400 cursor-wait' : 'bg-orange-500 hover:bg-orange-600 hover:-translate-y-0.5'}`}
            >
              Añadir Datos y Archivar
            </button>
          </div>
        )
      )}

      {/* VISUALIZADOR DE PDF */}
      <div className={`p-4 lg:p-6 flex flex-col ${esModoAcordeon ? 'h-[500px]' : 'flex-1 min-h-0'}`}>
        <h4 className="text-[10px] lg:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Previsualización PDF</h4>

        {detallesCorreo.cargando ? (
          <div className="flex-1 bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center animate-pulse">
            <svg className="animate-spin w-8 h-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-sm font-bold text-gray-500">Descargando archivos de forma segura...</p>
          </div>
        ) : detallesCorreo.pdfData ? (
          <div className="flex-1 bg-gray-100 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden relative group">
            <iframe src={detallesCorreo.pdfData} className="w-full h-full border-none" title="Visor PDF" />
          </div>
        ) : correoSeleccionado.tienePdf || correoSeleccionado.tieneXml ? (
          <div className="flex-1 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl flex items-center justify-center">
            <p className="text-xs text-rose-500">No se pudo cargar el PDF o no venía incluido.</p>
          </div>
        ) : (
          <div className="flex-1 bg-gray-50 dark:bg-slate-900/30 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
            <p className="text-xs lg:text-sm text-gray-400 italic">No hay documentos adjuntos en este correo.</p>
          </div>
        )}
      </div>
    </div>
  );
}