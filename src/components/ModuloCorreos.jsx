import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

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

export default function ModuloCorreos({ alVolver, modoOscuro, toggleTema }) {
  const [pestanaActiva, setPestanaActiva] = useState('bandeja'); 
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  
  const [correosLista, setCorreosLista] = useState([]); 
  const [escaneando, setEscaneando] = useState(false); 

  // ACTUALIZACIÓN: Se agrega pdfData al estado inicial
  const [detallesCorreo, setDetallesCorreo] = useState({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });

  const [imapConfig, setImapConfig] = useState({ host: 'imap.gmail.com', port: 993, user: '', pass: '' });
  const [estadoConexion, setEstadoConexion] = useState({ probando: false, mensaje: '', tipo: '' });

  useEffect(() => {
    ipcRenderer.invoke('obtener-config-imap').then(configGuardada => {
      if (configGuardada && configGuardada.user) {
        setImapConfig(configGuardada);
      } else {
        setPestanaActiva('configuracion'); 
      }
    });
  }, []);

  const handleChangeConfig = (e) => {
    setImapConfig({ ...imapConfig, [e.target.name]: e.target.value });
    setEstadoConexion({ probando: false, mensaje: '', tipo: '' }); 
  };

  const guardarYProbarConexion = async () => {
    if (!imapConfig.user || !imapConfig.pass) {
      setEstadoConexion({ probando: false, mensaje: 'Debes ingresar correo y contraseña.', tipo: 'error' });
      return;
    }
    setEstadoConexion({ probando: true, mensaje: 'Conectando con el servidor...', tipo: '' });
    await ipcRenderer.invoke('guardar-config-imap', imapConfig);
    const resultado = await ipcRenderer.invoke('probar-conexion-imap', imapConfig);
    
    if (resultado.success) {
      setEstadoConexion({ probando: false, mensaje: '¡Conexión Exitosa!', tipo: 'exito' });
      setTimeout(() => setPestanaActiva('bandeja'), 1500); 
    } else {
      setEstadoConexion({ probando: false, mensaje: `Error: ${resultado.error}`, tipo: 'error' });
    }
  };

  const escanearBandeja = async () => {
    setEscaneando(true);
    try {
      const resultado = await ipcRenderer.invoke('escanear-correos', 10);
      if (resultado.success) {
        setCorreosLista(resultado.correos); 
        setPestanaActiva('bandeja'); 
        setCorreoSeleccionado(null);
        setSeleccionados([]);
      } else {
        alert('Error al escanear: ' + resultado.error);
        if (resultado.error.includes('No hay configuración')) setPestanaActiva('configuracion');
      }
    } catch (error) {
      alert('Hubo un problema de conexión con el sistema local.');
    }
    setEscaneando(false);
  };

  const seleccionarYDescargar = async (correo) => {
    if (correoSeleccionado?.id === correo.id) {
      setCorreoSeleccionado(null);
      setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
      return;
    }

    setCorreoSeleccionado(correo);

    if (correo.tieneXml || correo.tienePdf) {
      setDetallesCorreo({ cargando: true, archivos: [], xmlInfo: null, pdfData: null });
      try {
        const resultado = await ipcRenderer.invoke('descargar-adjuntos-correo', correo.id);
        if (resultado.success) {
          setDetallesCorreo({
            cargando: false,
            archivos: resultado.archivos,
            xmlInfo: resultado.xmlInfo,
            pdfData: resultado.pdfData // Guardamos el PDF convertido
          });
          
          if (resultado.xmlInfo?.total) {
             setCorreosLista(prev => prev.map(c => c.id === correo.id ? { ...c, total: `$${resultado.xmlInfo.total} ${resultado.xmlInfo.moneda}` } : c));
          }
        } else {
          setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
          console.error(resultado.error);
        }
      } catch (error) {
        setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
      }
    } else {
      setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
    }
  };

  const toggleSeleccion = (id, e) => {
    e.stopPropagation();
    setSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === correosLista.length) setSeleccionados([]);
    else setSeleccionados(correosLista.map(c => c.id));
  };

  const renderVistaPrevia = (esModoAcordeon = false) => {
    if (!correoSeleccionado) return null;
    const colorP = getColorPorRemitente(correoSeleccionado.remitente);

    return (
      <div onClick={(e) => e.stopPropagation()} className={`flex flex-col bg-white dark:bg-slate-800 overflow-hidden relative z-10 animate-fade-in transition-all ${esModoAcordeon ? 'rounded-xl border border-gray-100 dark:border-slate-700 mt-3 shadow-inner' : 'rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 h-full'}`}>
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
        
        <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <p className="text-gray-700 dark:text-gray-300 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap">{correoSeleccionado.mensaje}</p>
        </div>

        {detallesCorreo.xmlInfo && (
          <div className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-3 lg:p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
              <div>
                <p className="text-[10px] lg:text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Factura: {detallesCorreo.xmlInfo.folio}</p>
                <p className="text-xs lg:text-sm font-semibold text-gray-800 dark:text-gray-200">Total a Pagar: ${detallesCorreo.xmlInfo.total} {detallesCorreo.xmlInfo.moneda}</p>
              </div>
            </div>
            <button className="w-full md:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs lg:text-sm font-bold rounded-lg shadow-md transition">Importar al Sistema</button>
          </div>
        )}
        
        <div className={`p-4 lg:p-6 flex flex-col ${esModoAcordeon ? 'h-[500px]' : 'flex-1 min-h-0'}`}>
          <h4 className="text-[10px] lg:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Previsualización PDF</h4>
          
          {detallesCorreo.cargando ? (
            <div className="flex-1 bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center animate-pulse">
               <svg className="animate-spin w-8 h-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <p className="text-sm font-bold text-gray-500">Descargando archivos de forma segura...</p>
            </div>
          ) : detallesCorreo.pdfData ? (
            <div className="flex-1 bg-gray-100 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden relative group">
               {/* NUEVO: iframe usando Data URI seguro en lugar de ruta de archivo */}
               <iframe 
                 src={detallesCorreo.pdfData} 
                 className="w-full h-full border-none" 
                 title="Visor PDF"
               />
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
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#0f141e] font-sans overflow-hidden">
      <header className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={alVolver} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Buzón Inteligente</span>
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">Recepción de Facturas y Comprobantes</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={escanearBandeja} disabled={escaneando || !imapConfig.user} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-5 py-2.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
            {escaneando ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
            {escaneando ? 'Buscando...' : 'Escanear Correos'}
          </button>
          <button onClick={toggleTema} className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">
            {modoOscuro ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-full">
        <aside className="hidden md:flex w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-col p-4 shrink-0">
          <nav className="space-y-1.5 flex-1">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Buzón Principal</p>
            <button onClick={() => { setPestanaActiva('bandeja'); setCorreoSeleccionado(null); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'bandeja' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
              <div className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg> Para Revisión</div>
              {correosLista.length > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${pestanaActiva === 'bandeja' ? 'bg-blue-200/50 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200' : 'bg-gray-100 dark:bg-slate-700'}`}>{correosLista.length}</span>}
            </button>
            <button onClick={() => { setPestanaActiva('pendientes'); setCorreoSeleccionado(null); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'pendientes' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
              <div className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Pendientes (Snooze)</div>
            </button>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 mt-6 px-2">Historial</p>
            <button onClick={() => { setPestanaActiva('procesados'); setCorreoSeleccionado(null); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'procesados' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
              <div className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Importados</div>
            </button>
          </nav>
          <div className="mt-auto border-t border-gray-100 dark:border-slate-700 pt-4">
            <button onClick={() => { setPestanaActiva('configuracion'); setCorreoSeleccionado(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${pestanaActiva === 'configuracion' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Cuentas IMAP
            </button>
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden p-3 lg:p-4 gap-4 bg-gray-50/50 dark:bg-[#0f141e]">
          
          {pestanaActiva === 'bandeja' && (
             <>
               {correosLista.length === 0 ? (
                 <div className="flex flex-col h-full w-full max-w-2xl mx-auto items-center justify-center text-center animate-fade-in-up">
                    <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Bandeja Lista</h2>
                    <p className="text-gray-500 dark:text-slate-400">Dale clic al botón azul de <strong className="text-blue-600 dark:text-blue-400">"Escanear Correos"</strong> para descargar facturas.</p>
                 </div>
               ) : (
                 <>
                   <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${correoSeleccionado ? 'w-full lg:w-5/12' : 'w-full max-w-5xl mx-auto'}`}>
                     <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-4 flex justify-between items-center shrink-0">
                       <div className="flex items-center gap-2 lg:gap-3">
                         <input type="checkbox" checked={seleccionados.length === correosLista.length && correosLista.length > 0} onChange={seleccionarTodos} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ml-1 lg:ml-2" />
                         <span className="text-xs lg:text-sm font-bold text-gray-500 dark:text-gray-400">Todo</span>
                       </div>
                       <div className={`flex gap-2 transition-opacity duration-300 ${seleccionados.length > 0 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                         <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> Importar
                         </button>
                       </div>
                     </div>

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
                             {estaActivo && (
                               <div className="block lg:hidden w-full cursor-default pb-2">
                                 {renderVistaPrevia(true)}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   {correoSeleccionado && (
                     <div className="hidden lg:flex flex-col w-7/12 h-full">
                       {renderVistaPrevia(false)}
                     </div>
                   )}
                 </>
               )}
             </>
          )}

          {pestanaActiva === 'configuracion' && (
             <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in-up mt-4 overflow-y-auto">
               {/* Pantalla de configuración (sin cambios) */}
             </div>
          )}
        </main>
      </div>
    </div>
  );
}