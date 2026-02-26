import React, { useState, useRef, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

// ============================================================================
// 1. COMPONENTE: VENTANA FLOTANTE 
// ============================================================================
const VentanaFlotante = ({ app, icono, abierta, encendida, silenciada, reloadTrigger, onClose, traerAlFrente, zIndex }) => {
  const [posicion, setPosicion] = useState({ x: 100, y: 50 });
  const [tamaño, setTamaño] = useState({ w: 400, h: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [puedeRetroceder, setPuedeRetroceder] = useState(false);
  const [historial, setHistorial] = useState([]); // Arreglo de { url, title }
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const webviewRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  useEffect(() => {
    setPosicion({
      x: window.innerWidth / 2 - 200 + (Math.random() * 50),
      y: window.innerHeight / 2 - 325
    });
  }, []);

  // --- ESCUCHAS DEL NAVEGADOR INTERNO ---
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const actualizarNavegacion = (e) => {
      setPuedeRetroceder(wv.canGoBack());

      // Construir historial limitando a 15 elementos para no afectar RAM
      if (e && e.url) {
        setHistorial(prev => {
          // Evitar registrar la misma URL consecutivamente
          if (prev.length > 0 && prev[0].url === e.url) return prev;

          let title = "Página";
          try { title = wv.getTitle() || e.url; } catch (err) { }

          const nuevoItem = { url: e.url, title: title };
          return [nuevoItem, ...prev].slice(0, 15);
        });
      }
    };

    // Aplicar silencio si el usuario lo pide en el menú
    const aplicarSilencio = () => { try { wv.setAudioMuted(silenciada); } catch (e) { } };

    const registrarTitulo = () => {
      // Intentar actualizar el título de la última página una vez cargada
      try {
        const tituloReal = wv.getTitle();
        if (tituloReal) {
          setHistorial(prev => {
            if (prev.length === 0) return prev;
            const nuevo = [...prev];
            nuevo[0].title = tituloReal;
            return nuevo;
          });
        }
      } catch (e) { }
    };

    wv.addEventListener('did-navigate', actualizarNavegacion);
    wv.addEventListener('did-navigate-in-page', actualizarNavegacion);
    wv.addEventListener('page-title-updated', registrarTitulo);
    wv.addEventListener('dom-ready', aplicarSilencio);

    aplicarSilencio();

    return () => {
      wv.removeEventListener('did-navigate', actualizarNavegacion);
      wv.removeEventListener('did-navigate-in-page', actualizarNavegacion);
      wv.removeEventListener('page-title-updated', registrarTitulo);
      wv.removeEventListener('dom-ready', aplicarSilencio);
    };
  }, [abierta, silenciada]);

  // --- CERRAR HISTORIAL AL CLICKEAR FUERA ---
  useEffect(() => {
    const cerrarMenu = () => setMostrarHistorial(false);
    if (mostrarHistorial) {
      document.addEventListener('click', cerrarMenu);
    }
    return () => {
      document.removeEventListener('click', cerrarMenu);
    };
  }, [mostrarHistorial]);

  // --- RECARGAR PÁGINA DESDE EL MENÚ ---
  useEffect(() => {
    if (reloadTrigger > 0 && webviewRef.current) {
      try { webviewRef.current.reload(); } catch (e) { }
    }
  }, [reloadTrigger]);

  const retroceder = (e) => {
    e.stopPropagation();
    if (webviewRef.current && webviewRef.current.canGoBack()) webviewRef.current.goBack();
  };

  const navegarHistorial = (url) => {
    if (webviewRef.current) {
      webviewRef.current.loadURL(url);
    }
    setMostrarHistorial(false);
  };

  const desacoplar = (e) => {
    e.stopPropagation();
    if (webviewRef.current) {
      // Le ordenamos al webview que abra su URL actual en una ventana nueva nativa del OS
      webviewRef.current.executeJavaScript(`window.open(window.location.href, '_blank', 'width=1024,height=768');`);
      // Ocultamos la ventana flotante pequeña para no estorbar (sigue procesando en background)
      onClose();
    }
  };

  const iniciarArrastre = (e) => {
    setIsDragging(true); traerAlFrente();
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: posicion.x, initialY: posicion.y };
    document.addEventListener('mousemove', moverVentana);
    document.addEventListener('mouseup', soltarVentana);
  };

  const moverVentana = (e) => setPosicion({ x: dragRef.current.initialX + (e.clientX - dragRef.current.startX), y: Math.max(0, dragRef.current.initialY + (e.clientY - dragRef.current.startY)) });
  const soltarVentana = () => { setIsDragging(false); document.removeEventListener('mousemove', moverVentana); document.removeEventListener('mouseup', soltarVentana); };

  const iniciarRedimension = (e) => {
    e.stopPropagation(); setIsResizing(true); traerAlFrente();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: tamaño.w, startH: tamaño.h };
    document.addEventListener('mousemove', moverRedimension);
    document.addEventListener('mouseup', soltarRedimension);
  };

  const moverRedimension = (e) => setTamaño({ w: Math.max(300, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)), h: Math.max(400, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)) });
  const soltarRedimension = () => { setIsResizing(false); document.removeEventListener('mousemove', moverRedimension); document.removeEventListener('mouseup', soltarRedimension); };

  // 🔥 MAGIA DE RAM: Si está apagada, devolvemos null y la RAM se libera al 100%
  if (!encendida) return null;

  return (
    <div
      onMouseDown={traerAlFrente}
      style={{ transform: `translate(${posicion.x}px, ${posicion.y}px) scale(${abierta ? 1 : 0.95})`, zIndex: zIndex, width: `${tamaño.w}px`, height: `${tamaño.h}px`, opacity: abierta ? 1 : 0, visibility: abierta ? 'visible' : 'hidden', pointerEvents: abierta ? 'auto' : 'none' }}
      className={`fixed top-0 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden ${(!isDragging && !isResizing) ? 'transition-all duration-200' : ''} ${(isDragging || isResizing) ? 'shadow-blue-500/20' : ''}`}
    >
      <div onMouseDown={iniciarArrastre} className="bg-gray-100 dark:bg-slate-900 px-3 py-2 flex justify-between items-center select-none cursor-move border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 relative">
          <div className="flex items-center gap-0.5 mr-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <button onMouseDown={(e) => e.stopPropagation()} onClick={retroceder} disabled={!puedeRetroceder} className={`p-1.5 rounded-md transition-all ${puedeRetroceder ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700 cursor-pointer' : 'text-gray-300 dark:text-slate-700 cursor-not-allowed'}`} title="Volver atrás">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>

            <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMostrarHistorial(!mostrarHistorial); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors cursor-pointer" title="Historial reciente">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
          </div>

          <div className="w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none">{icono}</div>
          <span className="font-bold text-sm text-gray-700 dark:text-gray-300 pointer-events-none truncate max-w-[150px]">{app.nombre}</span>
          {silenciada && <span className="text-red-500 ml-1 text-xs" title="App Silenciada">🔇</span>}

          {/* Menú Flotante de Historial */}
          {mostrarHistorial && (
            <div
              className="absolute top-10 left-0 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-[200] overflow-hidden animate-fade-in-up"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-50 dark:bg-slate-900 px-3 py-2 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Historial (Top 15)</span>
                <span className="text-[10px] text-gray-400 font-medium">{historial.length} pags. guardadas</span>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {historial.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">No hay navegación reciente</div>
                ) : (
                  historial.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => navegarHistorial(item.url)}
                      className="w-full text-left px-3 py-2 border-b border-gray-50 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex flex-col items-start gap-1 group/hist"
                    >
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate w-full group-hover/hist:text-blue-600 dark:group-hover/hist:text-blue-400">{item.title}</span>
                      <span className="text-[10px] text-gray-400 truncate w-full">{item.url}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onMouseDown={(e) => e.stopPropagation()} onClick={desacoplar} className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors cursor-pointer" title="Desacoplar a ventana independiente (Multitarea)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer" title="Minimizar a la barra">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-[#f0f2f5] dark:bg-[#111b21]">
        {(isDragging || isResizing) && <div className="absolute inset-0 z-20"></div>}
        <webview ref={webviewRef} src={app.url} partition={app.particion} allowpopups="true" webpreferences="contextIsolation=no" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" className="absolute inset-0 w-full h-full border-none z-10"></webview>
        <div onMouseDown={iniciarRedimension} className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-30 flex items-end justify-end p-1.5 opacity-40 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM14 22H12V20H14V22ZM18 18H16V16H18V18Z" /></svg>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. DICCIONARIO DE ICONOS 
// ============================================================================
const getIconoPorApp = (baseId) => {
  switch (baseId) {
    case 'wa': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>;
    case 'tg': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" /></svg>;
    case 'fb': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
    case 'drive': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 1.485c-1.352 0-2.522.695-3.153 1.78L1.442 15.968c-.628 1.082-.625 2.417.009 3.504l.024.041h5.817l7.447-12.846-2.73-4.735v-.004c-.37-.643-.984-1.125-1.705-1.328a3.173 3.173 0 00-1.294-.115zM12.872 9.47L5.594 22.05h11.603c1.365 0 2.545-.71 3.175-1.808l.022-.039 3.655-6.315c.628-1.086.623-2.428-.016-3.518l-.025-.043H12.872zm-1.892.426l-3.328 5.753 3.623 6.27h-5.46L.99 13.56c-.632-1.096-.632-2.454 0-3.55l3.656-6.32 6.334 10.956z" /></svg>;
    case 'gmail': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" /></svg>;
    case 'outlook': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 5.25L12 11.25l10.5-6v13.5H1.5V5.25zM12 13.5L1.5 7.5v-1.5L12 12l10.5-6v1.5L12 13.5z" /></svg>;
    case 'canva': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5A2.5 2.5 0 018.5 14a2.5 2.5 0 012.5-2.5 2.5 2.5 0 012.5 2.5A2.5 2.5 0 0111 16.5zm4.5-3.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>;
    case 'maps': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>;
    case 'google': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" /></svg>;
    case 'chatgpt': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3z" /></svg>;
    case 'yt': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>;
    case 'ytmusic': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-11.328c-2.328 0-4.224 1.896-4.224 4.224S9.672 16.224 12 16.224s4.224-1.896 4.224-4.224-1.896-4.224-4.224-4.224zm-1.152 6.048V10.128L13.776 12l-2.928 1.824z" /></svg>;
    case 'spotify': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.366-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.6.18-1.2.78-1.38 4.2-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.5.42h-.12z" /></svg>;
    case 'jellyfin': return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
    default: return <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>;
  }
};

// ============================================================================
// 3. COMPONENTE PRINCIPAL: LA BARRA LATERAL CON MEMORIA
// ============================================================================
export default function BarraApps() {
  const [appsInstaladas, setAppsInstaladas] = useState([]);
  const [appsAbiertas, setAppsAbiertas] = useState([]);
  const [ventanaActiva, setVentanaActiva] = useState(null);
  const [reloadTriggers, setReloadTriggers] = useState({});
  const [menuCtx, setMenuCtx] = useState({ visible: false, x: 0, y: 0, app: null });

  // 🔥 MAGIA DE MEMORIA: Leemos cómo dejaste las cosas la última vez
  const [appsEncendidas, setAppsEncendidas] = useState(() => {
    const guardado = localStorage.getItem('appsEncendidas');
    return guardado ? JSON.parse(guardado) : null; // null significa "es la primera vez que abro el programa"
  });

  const [appsSilenciadas, setAppsSilenciadas] = useState(() => {
    const guardado = localStorage.getItem('appsSilenciadas');
    return guardado ? JSON.parse(guardado) : [];
  });

  // Guardamos en el disco duro instantáneamente cada vez que suspendes o enciendes algo
  useEffect(() => {
    if (appsEncendidas !== null) {
      localStorage.setItem('appsEncendidas', JSON.stringify(appsEncendidas));
    }
  }, [appsEncendidas]);

  // Guardamos instantáneamente cada vez que silencias algo
  useEffect(() => {
    localStorage.setItem('appsSilenciadas', JSON.stringify(appsSilenciadas));
  }, [appsSilenciadas]);

  const cargarApps = async () => {
    const res = await ipcRenderer.invoke('obtener-apps-instaladas');
    if (res.success) {
      setAppsInstaladas(res.apps);
      // Si es la primera vez que instalas algo y no hay memoria previa, la encendemos por defecto
      if (localStorage.getItem('appsEncendidas') === null) {
        setAppsEncendidas(res.apps.map(a => a.id));
      }
    }
  };

  useEffect(() => {
    cargarApps();
    window.addEventListener('apps-actualizadas', cargarApps);
    const cerrarMenu = () => setMenuCtx({ ...menuCtx, visible: false });
    window.addEventListener('click', cerrarMenu);

    return () => {
      window.removeEventListener('apps-actualizadas', cargarApps);
      window.removeEventListener('click', cerrarMenu);
    };
  }, []);

  if (appsInstaladas.length === 0) return null;

  const toggleApp = (id) => {
    if (!appsEncendidas.includes(id)) {
      setAppsEncendidas([...appsEncendidas, id]);
      setAppsAbiertas([...appsAbiertas, id]);
      setVentanaActiva(id);
      return;
    }
    if (appsAbiertas.includes(id)) {
      setAppsAbiertas(appsAbiertas.filter(appId => appId !== id));
    } else {
      setAppsAbiertas([...appsAbiertas, id]);
      setVentanaActiva(id);
    }
  };

  const abrirMenuContextual = (e, app) => {
    e.preventDefault();
    setMenuCtx({ visible: true, x: e.clientX, y: e.clientY, app });
  };

  const handleSilenciar = () => {
    const id = menuCtx.app.id;
    setAppsSilenciadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleApagar = () => {
    const id = menuCtx.app.id;
    setAppsEncendidas(prev => prev.filter(i => i !== id));
    setAppsAbiertas(prev => prev.filter(i => i !== id));
  };

  const handleRecargar = () => {
    const id = menuCtx.app.id;
    setReloadTriggers(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    if (!appsEncendidas.includes(id)) toggleApp(id);
  };

  const handleDesinstalar = async () => {
    const id = menuCtx.app.id;
    const confirmacion = window.confirm(`¿Estás seguro de desinstalar ${menuCtx.app.nombre}?`);
    if (!confirmacion) return;

    const nuevasApps = appsInstaladas.filter(a => a.id !== id);
    const res = await ipcRenderer.invoke('guardar-apps-instaladas', nuevasApps);
    if (res.success) {
      setAppsInstaladas(nuevasApps);
      setAppsAbiertas(prev => prev.filter(i => i !== id));
      setAppsEncendidas(prev => prev.filter(i => i !== id));
      window.dispatchEvent(new Event('apps-actualizadas'));
    }
  };

  return (
    <>
      <div className="fixed top-1/2 right-4 -translate-y-1/2 z-[100] flex flex-col gap-3 p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl transition-all h-auto">
        {appsInstaladas.map(app => {
          const estaAbierta = appsAbiertas.includes(app.id);
          const estaEncendida = appsEncendidas?.includes(app.id);
          const estaSilenciada = appsSilenciadas.includes(app.id);
          const iconoSVG = getIconoPorApp(app.baseId);

          return (
            <div key={app.id} className="relative group">
              <button
                onClick={() => toggleApp(app.id)}
                onContextMenu={(e) => abrirMenuContextual(e, app)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm 
                  ${estaAbierta ? `bg-gray-100 dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 scale-95 shadow-inner ${app.color.split(' ')[0]}` :
                    `bg-gray-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 hover:scale-110 hover:shadow-md 
                  ${estaEncendida ? app.color : 'text-gray-400 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}`}
              >
                <div className="w-6 h-6 relative">
                  {iconoSVG}
                  {estaSilenciada && <div className="absolute -top-2 -right-3 text-[10px]">🔇</div>}
                </div>
              </button>

              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 dark:bg-black text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 shadow-lg flex items-center z-50">
                {app.nombre} {!estaEncendida && "(Suspendida)"}
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[5px] border-transparent border-l-gray-900 dark:border-l-black"></div>
              </div>

              {estaAbierta && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
              )}
            </div>
          );
        })}
      </div>

      {menuCtx.visible && (
        <div
          className="fixed z-[200] w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-2 animate-fade-in-up origin-top-right overflow-hidden"
          style={{ top: menuCtx.y, left: menuCtx.x - 230 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 mb-1">
            <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">{menuCtx.app.nombre}</span>
          </div>
          <button onClick={handleRecargar} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
            <span>🔄</span> Recargar
          </button>
          <button onClick={handleSilenciar} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
            <span>{appsSilenciadas.includes(menuCtx.app.id) ? '🔊' : '🔇'}</span>
            {appsSilenciadas.includes(menuCtx.app.id) ? 'Activar sonido' : 'Silenciar app'}
          </button>
          <button onClick={handleApagar} disabled={!appsEncendidas?.includes(menuCtx.app.id)} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition-colors ${appsEncendidas?.includes(menuCtx.app.id) ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10' : 'text-gray-300 dark:text-slate-600 cursor-not-allowed'}`}>
            <span>💤</span> Suspender proceso
          </button>
          <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
          <button onClick={handleDesinstalar} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors">
            <span>🗑️</span> Desinstalar
          </button>
        </div>
      )}

      {appsInstaladas.map(app => (
        <VentanaFlotante
          key={app.id}
          app={app}
          icono={getIconoPorApp(app.baseId)}
          abierta={appsAbiertas.includes(app.id)}
          encendida={appsEncendidas?.includes(app.id)}
          silenciada={appsSilenciadas.includes(app.id)}
          reloadTrigger={reloadTriggers[app.id] || 0}
          onClose={() => toggleApp(app.id)}
          traerAlFrente={() => setVentanaActiva(app.id)}
          zIndex={ventanaActiva === app.id ? 95 : 90}
        />
      ))}
    </>
  );
}