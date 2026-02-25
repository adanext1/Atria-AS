import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function CentroApps({ volverAlDashboard }) {
  const [filtro, setFiltro] = useState('Todas');
  
  // ESTADOS DINÁMICOS
  const [appsInstaladas, setAppsInstaladas] = useState([]);
  const [modal, setModal] = useState({ abierto: false, appBase: null, nombrePersonalizado: '' });

  // 1. CARGAR APPS AL ABRIR LA PANTALLA
  useEffect(() => {
    cargarAppsInstaladas();
  }, []);

  const cargarAppsInstaladas = async () => {
    const res = await ipcRenderer.invoke('obtener-apps-instaladas');
    if (res.success) setAppsInstaladas(res.apps);
  };

  // ==========================================
  // MEGA PAQUETE DE ÍCONOS SVG
  // ==========================================
  const iconWhatsApp = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
  const iconTelegram = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>;
  const iconDrive = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12.01 1.485c-1.352 0-2.522.695-3.153 1.78L1.442 15.968c-.628 1.082-.625 2.417.009 3.504l.024.041h5.817l7.447-12.846-2.73-4.735v-.004c-.37-.643-.984-1.125-1.705-1.328a3.173 3.173 0 00-1.294-.115zM12.872 9.47L5.594 22.05h11.603c1.365 0 2.545-.71 3.175-1.808l.022-.039 3.655-6.315c.628-1.086.623-2.428-.016-3.518l-.025-.043H12.872zm-1.892.426l-3.328 5.753 3.623 6.27h-5.46L.99 13.56c-.632-1.096-.632-2.454 0-3.55l3.656-6.32 6.334 10.956z"/></svg>;
  const iconYoutube = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
  const iconYTMusic = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-11.328c-2.328 0-4.224 1.896-4.224 4.224S9.672 16.224 12 16.224s4.224-1.896 4.224-4.224-1.896-4.224-4.224-4.224zm-1.152 6.048V10.128L13.776 12l-2.928 1.824z"/></svg>;
  const iconSpotify = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.366-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.6.18-1.2.78-1.38 4.2-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.5.42h-.12z"/></svg>;
  const iconGmail = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>;
  const iconFacebook = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
  const iconGoogle = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>;
  const iconMaps = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
  const iconCanva = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5A2.5 2.5 0 018.5 14a2.5 2.5 0 012.5-2.5 2.5 2.5 0 012.5 2.5A2.5 2.5 0 0111 16.5zm4.5-3.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
  const iconChatgpt = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3z"/></svg>;
  const iconJellyfin = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; // Servidor local
  const iconOutlook = <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M1.5 5.25L12 11.25l10.5-6v13.5H1.5V5.25zM12 13.5L1.5 7.5v-1.5L12 12l10.5-6v1.5L12 13.5z"/></svg>;

  // ==========================================
  // MEGA BASE DE DATOS DE APPS 
  // ==========================================
  const catalogoApps = [
    // Comunicación
    { idBase: 'wa', nombre: 'WhatsApp', desc: 'Sincroniza tus chats personales o de empresa para atención al cliente.', categoria: 'Comunicación', url: 'https://web.whatsapp.com', iconoElemento: iconWhatsApp, color: 'text-green-500 hover:text-green-600' },
    { idBase: 'tg', nombre: 'Telegram', desc: 'Mensajería rápida y segura en la nube. Ideal para grupos de trabajo.', categoria: 'Comunicación', url: 'https://web.telegram.org/a/', iconoElemento: iconTelegram, color: 'text-blue-500 hover:text-blue-600' },
    { idBase: 'fb', nombre: 'Facebook', desc: 'Accede a tu cuenta de Facebook o páginas de negocio.', categoria: 'Comunicación', url: 'https://www.facebook.com', iconoElemento: iconFacebook, color: 'text-blue-600 hover:text-blue-700' },
    
    // Productividad
    { idBase: 'drive', nombre: 'Google Drive', desc: 'Accede a tus documentos, hojas de cálculo y respaldos en la nube.', categoria: 'Productividad', url: 'https://drive.google.com', iconoElemento: iconDrive, color: 'text-yellow-500 hover:text-yellow-600' },
    { idBase: 'gmail', nombre: 'Gmail', desc: 'Revisa y envía correos rápidamente sin salir de tu sistema.', categoria: 'Productividad', url: 'https://mail.google.com', iconoElemento: iconGmail, color: 'text-red-500 hover:text-red-600' },
    { idBase: 'outlook', nombre: 'Outlook', desc: 'Cliente de correo de Microsoft para cuentas Hotmail, Live o corporativas.', categoria: 'Productividad', url: 'https://outlook.live.com', iconoElemento: iconOutlook, color: 'text-blue-500 hover:text-blue-600' },
    { idBase: 'canva', nombre: 'Canva', desc: 'Herramienta de diseño gráfico para crear cotizaciones o banners.', categoria: 'Productividad', url: 'https://www.canva.com', iconoElemento: iconCanva, color: 'text-teal-500 hover:text-teal-600' },
    { idBase: 'maps', nombre: 'Google Maps', desc: 'Busca direcciones, rutas y ubica proveedores en el mapa.', categoria: 'Productividad', url: 'https://www.google.com/maps', iconoElemento: iconMaps, color: 'text-green-500 hover:text-green-600' },
    { idBase: 'google', nombre: 'Buscador Google', desc: 'Navegador rápido para buscar información, RFCs o dudas contables.', categoria: 'Productividad', url: 'https://www.google.com', iconoElemento: iconGoogle, color: 'text-blue-500 hover:text-blue-600' },
    { idBase: 'chatgpt', nombre: 'ChatGPT', desc: 'Tu asistente de IA. Pídele que redacte correos formales o te ayude con fórmulas.', categoria: 'Productividad', url: 'https://chatgpt.com', iconoElemento: iconChatgpt, color: 'text-emerald-500 hover:text-emerald-600' },
    
    // Entretenimiento
    { idBase: 'yt', nombre: 'YouTube', desc: 'Reproduce tutoriales, podcasts o música de fondo mientras trabajas.', categoria: 'Entretenimiento', url: 'https://www.youtube.com', iconoElemento: iconYoutube, color: 'text-red-500 hover:text-red-600' },
    { idBase: 'ytmusic', nombre: 'YouTube Music', desc: 'Plataforma oficial de Google para escuchar toda tu música.', categoria: 'Entretenimiento', url: 'https://music.youtube.com', iconoElemento: iconYTMusic, color: 'text-red-600 hover:text-red-700' }, 
    { idBase: 'spotify', nombre: 'Spotify', desc: 'Escucha tus playlists favoritas, música y podcasts.', categoria: 'Entretenimiento', url: 'https://open.spotify.com', iconoElemento: iconSpotify, color: 'text-green-500 hover:text-green-600' },
    { idBase: 'jellyfin', nombre: 'Jellyfin', desc: 'Tu servidor CasaOS para escuchar música en formato FLAC en alta fidelidad.', categoria: 'Entretenimiento', url: 'jellyfin.adanext.com', iconoElemento: iconJellyfin, color: 'text-purple-500 hover:text-purple-600' },
  ];

  const categorias = ['Todas', 'Comunicación', 'Productividad', 'Entretenimiento'];
  const appsFiltradas = filtro === 'Todas' ? catalogoApps : catalogoApps.filter(a => a.categoria === filtro);

  // 2. LÓGICA DE INSTALACIÓN
  const abrirModalInstalacion = (appBase) => {
    setModal({ abierto: true, appBase, nombrePersonalizado: appBase.nombre });
  };

  const confirmarInstalacion = async () => {
    if (!modal.nombrePersonalizado.trim()) return;

    const timestampId = Date.now(); // Genera un número único
    
    // Creamos la nueva instancia "Virtual"
    const nuevaInstancia = {
      id: `${modal.appBase.idBase}-${timestampId}`,
      baseId: modal.appBase.idBase,
      nombre: modal.nombrePersonalizado,
      url: modal.appBase.url,
      particion: `persist:${modal.appBase.idBase}-${timestampId}`, // <--- ¡LA MAGIA DE LAS SESIONES SEPARADAS!
      color: modal.appBase.color
    };

    const nuevoArreglo = [...appsInstaladas, nuevaInstancia];
    const res = await ipcRenderer.invoke('guardar-apps-instaladas', nuevoArreglo);
    
    if (res.success) {
      setAppsInstaladas(nuevoArreglo);
      setModal({ abierto: false, appBase: null, nombrePersonalizado: '' });
      // Le avisamos a la Barra Lateral que hay una app nueva para que se actualice sola
      window.dispatchEvent(new Event('apps-actualizadas'));
    } else {
      alert("Error al instalar módulo.");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto animate-fade-in-up relative">
      
      {/* HEADER TIPO DASHBOARD */}
      <header className="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={volverAlDashboard} className="p-2 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="w-px h-8 bg-gray-200 dark:bg-slate-700"></div>
          <div>
            <h1 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-pink-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              </span>
              Centro de Apps
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">Instala y administra extensiones web para tu ERP.</p>
          </div>
        </div>
      </header>

      {/* PESTAÑAS DE CATEGORÍAS */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {categorias.map(cat => (
          <button
            key={cat} onClick={() => setFiltro(cat)}
            className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${filtro === cat ? 'bg-gray-800 text-white shadow-md dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID DE APLICACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {appsFiltradas.map(app => {
          // Buscamos cuántas veces hemos instalado esta app en específico
          const instanciasDeEstaApp = appsInstaladas.filter(inst => inst.baseId === app.idBase);
          const numInstancias = instanciasDeEstaApp.length;

          return (
            <div key={app.idBase} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${app.color.split(' ')[0]}`}>
                  {app.iconoElemento}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                  {app.categoria}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">{app.nombre}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                  {app.desc}
                </p>
              </div>

              {/* Acciones e Instalación Dinámicas */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                {numInstancias > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      {numInstancias} Instancias activas
                    </span>
                    <button 
                      onClick={() => abrirModalInstalacion(app)}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600" 
                      title="Añadir otra cuenta/instancia"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => abrirModalInstalacion(app)}
                    className="w-full py-2.5 bg-gray-50 dark:bg-slate-900 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 group/btn border border-gray-200 dark:border-slate-700 hover:border-transparent"
                  >
                    <svg className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    Instalar Módulo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* 3. MODAL DE INSTALACIÓN (FLOTANTE) */}
      {/* ================================================================= */}
      {modal.abierto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setModal({ abierto: false, appBase: null, nombrePersonalizado: '' })}></div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-fade-in-up border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 bg-gray-50 dark:bg-slate-900 rounded-xl flex items-center justify-center ${modal.appBase.color.split(' ')[0]}`}>
                {modal.appBase.iconoElemento}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white">Instalar {modal.appBase.nombre}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Crea una nueva instancia aislada.</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre de la instancia:</label>
              <input 
                type="text" 
                autoFocus
                value={modal.nombrePersonalizado}
                onChange={(e) => setModal({ ...modal, nombrePersonalizado: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none dark:text-white font-medium"
                placeholder="Ej. WhatsApp Empresa"
                onKeyDown={(e) => e.key === 'Enter' && confirmarInstalacion()}
              />
              <p className="text-[10px] text-gray-400 mt-2">Este nombre aparecerá al pasar el ratón por la barra lateral.</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setModal({ abierto: false, appBase: null, nombrePersonalizado: '' })}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarInstalacion}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Confirmar e Instalar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}