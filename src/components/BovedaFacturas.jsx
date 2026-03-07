import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function BovedaFacturas({ alVolver, modoOscuro, toggleTema }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 1. Estados para los filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroProveedor, setFiltroProveedor] = useState('Todos');

  // Estados para fila expandida
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [datosXML, setDatosXML] = useState({});
  const [cargandoXML, setCargandoXML] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const datosGlobales = await ipcRenderer.invoke('obtener-todas-facturas-completas');
      setFacturas(datosGlobales);
      setCargando(false);
    };
    cargarDatos();
  }, []);

  const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);

  // 2. MOTOR DE BÚSQUEDA Y FILTRADO MÚLTIPLE
  const facturasFiltradas = facturas.filter((fac) => {
    const termino = busqueda.toLowerCase().trim();

    // Búsqueda por texto (Folio, Proveedor, Monto Exacto o Productos)
    const coincideTexto = termino === '' ||
      (fac.folio && fac.folio.toLowerCase().includes(termino)) ||
      (fac.proveedor && fac.proveedor.toLowerCase().includes(termino)) ||
      (fac.monto && fac.monto.toString().includes(termino)) ||
      (fac.productosAsociados && fac.productosAsociados.some(p =>
        p.nombre.toLowerCase().includes(termino) || p.claveSAT.includes(termino)
      ));

    // Filtro por Año y Mes
    const anioFac = fac.fecha ? fac.fecha.split('-')[0] : '';
    const mesFac = fac.fecha ? fac.fecha.split('-')[1] : '';

    const coincideAnio = filtroAnio === 'Todos' || anioFac === filtroAnio;
    const coincideMes = filtroMes === 'Todos' || mesFac === filtroMes;
    // Ojo: proveedor exacto por nombre
    const coincideProv = filtroProveedor === 'Todos' || fac.proveedor === filtroProveedor;

    return coincideTexto && coincideAnio && coincideMes && coincideProv;
  });

  // Extraer listas únicas
  const proveedoresUnicos = ['Todos', ...new Set(facturas.map(f => f.proveedor).filter(Boolean))].sort();
  const aniosUnicos = ['Todos', ...new Set(facturas.map(f => f.fecha ? f.fecha.split('-')[0] : '').filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const meses = [
    { valor: 'Todos', nombre: 'Todos los Meses' }, { valor: '01', nombre: 'Enero' }, { valor: '02', nombre: 'Febrero' },
    { valor: '03', nombre: 'Marzo' }, { valor: '04', nombre: 'Abril' }, { valor: '05', nombre: 'Mayo' },
    { valor: '06', nombre: 'Junio' }, { valor: '07', nombre: 'Julio' }, { valor: '08', nombre: 'Agosto' },
    { valor: '09', nombre: 'Septiembre' }, { valor: '10', nombre: 'Octubre' }, { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' }
  ];

  // =========================================================
  // FUNCIONES DE ARCHIVO (OJITOS Y LECTURA)
  // =========================================================
  const abrirDocumento = async (ruta, e) => {
    e.stopPropagation(); // Evita expandir la fila
    if (!ruta) return alert('No hay ruta guardada para este archivo.');
    const resultado = await ipcRenderer.invoke('abrir-archivo', ruta);
    if (!resultado.success) alert(`Error al abrir archivo: ${resultado.error}`);
  };

  const abrirFacturaOriginal = async (fac, e) => {
    e.stopPropagation();
    const resultado = await ipcRenderer.invoke('abrir-factura-original', {
      nombreProveedor: fac.carpetaDestino,
      fecha: fac.fecha,
      folio: fac.folio
    });
    if (!resultado.success) alert(resultado.error);
  };

  const renderBotonDoc = (fac, tipo) => {
    let tieneDoc = false;
    let rutaDoc = null;

    if (tipo === 'COMP') {
      tieneDoc = !!fac.comprobantePath;
      rutaDoc = fac.comprobantePath;
      if (fac.estado === 'Pendiente' || fac.estado === 'Vencida') return <span className="text-gray-300 dark:text-slate-600 font-bold">-</span>;
    } else if (tipo === 'REP') {
      if (fac.metodoPago !== 'PPD') return <span className="text-gray-300 dark:text-slate-600 font-bold" title="No aplica (Es PUE)">-</span>;
      tieneDoc = !!fac.repPath;
      rutaDoc = fac.repPath;
    } else if (tipo === 'NC') {
      tieneDoc = !!fac.notaCredito;
      rutaDoc = fac.notaCredito?.path;
    }

    if (tieneDoc) {
      return (
        <div className="flex flex-col items-center justify-center">
          <button onClick={(e) => abrirDocumento(rutaDoc, e)} title={`Ver ${tipo}`} className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg transition hover:scale-110">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </button>
          {tipo === 'NC' && fac.notaCredito?.monto && (
            <span className="text-[9px] font-black text-emerald-500 mt-1 block tracking-tighter">-{formatearDinero(fac.notaCredito.monto)}</span>
          )}
        </div>
      );
    }
    return <span className="text-gray-300 dark:text-slate-600 font-bold">-</span>;
  };

  const handleExpandir = async (fac) => {
    if (filaExpandida === fac.id) {
      setFilaExpandida(null); // Colapsar si ya estaba abierta
      return;
    }

    setFilaExpandida(fac.id);

    // Si no tenemos los datos cacheados y la factura tiene un XML probable
    if (!datosXML[fac.id] && fac.rutaXmlProbable) {
      setCargandoXML(true);
      const resultado = await ipcRenderer.invoke('leer-xml-factura', fac.rutaXmlProbable);
      if (resultado.success) {
        setDatosXML(prev => ({ ...prev, [fac.id]: resultado.datosFiscales }));
      } else {
        // En caso de error, guardamos el error para no ciclar
        setDatosXML(prev => ({ ...prev, [fac.id]: { error: resultado.error } }));
      }
      setCargandoXML(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-[90rem] mx-auto pb-20 relative overflow-hidden">

      {/* Elementos decorativos Glass (Orbes de fondo fijos) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
        <div className="absolute top-1/2 left-0 w-[30rem] h-[30rem] bg-emerald-400/20 dark:bg-emerald-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
        <div className="absolute bottom-0 right-1/4 w-[24rem] h-[24rem] bg-purple-400/10 dark:bg-purple-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow delay-2000"></div>
      </div>

      {/* HEADER SUPERIOR GLASSMORPHISM */}
      <header className="animate-fade-in-up flex justify-between items-center mb-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 relative z-10 transition-all hover:shadow-md">
        <button onClick={alVolver} className="group flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition bg-white/50 dark:bg-slate-900/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/50 dark:border-slate-600/40 shadow-sm hover:scale-105">
          <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Volver al Dashboard
        </button>
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-50/80 dark:bg-indigo-900/40 backdrop-blur-md text-indigo-700 dark:text-indigo-400 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            {facturasFiltradas.length} Facturas Indexadas
          </div>
        </div>
      </header>

      {/* TÍTULO Y BARRA DE FILTROS GIGANTE CON GLASS */}
      <div className="animate-fade-in-up delay-100 mb-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/50 dark:border-slate-700/50 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-8 flex items-center gap-3 relative z-10 tracking-tight">
          Bóveda de Facturas Global
          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-indigo-300/80 dark:border-indigo-600/60 shadow-sm relative overflow-hidden group">
            <span className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500"></span>
            Buscador Profundo
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {/* Buscador de texto (Folio, Proveedor, Productos) */}
          <div className="col-span-1 md:col-span-2 relative">
            <svg className="w-5 h-5 absolute left-4 top-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input
              type="text"
              placeholder="Buscar por Folio, Proveedor o Concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner font-medium placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Filtro Proveedor */}
          <div>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} className="w-full py-3.5 px-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-600/80 rounded-2xl text-gray-800 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold shadow-sm transition-colors hover:bg-white/90 dark:hover:bg-slate-800/90 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25em_1.25em] pr-10">
              {proveedoresUnicos.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-semibold">{p === 'Todos' ? '🏢 Todos los Proveedores' : p}</option>)}
            </select>
          </div>

          {/* Filtro Fecha (Año y Mes) */}
          <div className="flex gap-3">
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="w-1/2 py-3.5 px-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-600/80 rounded-2xl text-gray-800 dark:text-gray-200 outline-none cursor-pointer font-bold shadow-sm transition-colors hover:bg-white/90 dark:hover:bg-slate-800/90 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1em_1em] pr-8">
              {aniosUnicos.map(a => <option key={a} value={a} className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-semibold">{a === 'Todos' ? '📅 Año' : a}</option>)}
            </select>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-1/2 py-3.5 px-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-slate-600/80 rounded-2xl text-gray-800 dark:text-gray-200 outline-none cursor-pointer font-bold shadow-sm transition-colors hover:bg-white/90 dark:hover:bg-slate-800/90 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1em_1em] pr-8">
              {meses.map(m => <option key={m.valor} value={m.valor} className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-semibold">{m.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE RESULTADOS MAESTRA GLASS */}
      <main className="animate-fade-in-up delay-200 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-white/50 dark:border-slate-700/50 overflow-hidden relative z-10 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">

            <thead className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/40 dark:border-slate-700/30">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">Folio</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">Proveedor</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest text-right">Total</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest text-center" title="Factura Original PDF">PDF</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest text-center" title="Comprobante de Pago">Comp.</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest text-center" title="Recibo de Parcialidad">REP</th>
                <th className="py-4 px-2 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest text-center" title="Nota de Crédito">N.C.</th>
                <th className="py-4 px-4 font-black text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200/30 dark:divide-slate-700/30 bg-white/20 dark:bg-slate-900/10 backdrop-blur-sm">
              {cargando ? (
                <tr>
                  <td colSpan="10" className="p-16 text-center text-gray-400">
                    <svg className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="font-medium animate-pulse">Escaneando bóveda de facturas...</p>
                  </td>
                </tr>
              ) : facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-16 text-center text-gray-500 dark:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400/50 dark:text-slate-600/50 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="font-black text-lg text-gray-700 dark:text-gray-300">No se encontraron facturas con esos filtros.</p>
                    <p className="text-sm mt-1">Intenta con otro folio o nombre de producto.</p>
                  </td>
                </tr>
              ) : (
                facturasFiltradas.map((fac) => {
                  const expandida = filaExpandida === fac.id;

                  return (
                    <React.Fragment key={fac.id}>
                      {/* FILA PRINCIPAL (CLICKABLE PARA EXPANDIR) */}
                      <tr
                        onClick={() => handleExpandir(fac)}
                        className={`transition-all duration-300 cursor-pointer group ${expandida ? 'bg-indigo-50/60 dark:bg-indigo-900/20 backdrop-blur-md shadow-inner' : 'hover:bg-white/50 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="p-4 text-gray-400 group-hover:text-indigo-500 transition-colors relative">
                          <svg className={`w-5 h-5 transform transition-transform duration-300 ${expandida ? 'rotate-90 text-indigo-500 drop-shadow-sm' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                          {expandida && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                        </td>

                        <td className="py-4 px-2 font-mono font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[120px]" title={fac.folio}>{fac.folio}</td>

                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center text-xs font-black shrink-0 border border-indigo-200/50 dark:border-indigo-700/30 shadow-sm backdrop-blur-sm">
                              {fac.proveedor ? fac.proveedor.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm truncate max-w-[180px]" title={fac.proveedor}>{fac.proveedor}</span>
                          </div>
                        </td>

                        <td className="py-4 px-2 text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap">{fac.fecha}</td>

                        <td className="py-4 px-2 text-right font-black text-gray-800 dark:text-white whitespace-nowrap">{formatearDinero(fac.monto)}</td>

                        {/* COLUMNAS DE ARCHIVOS */}
                        <td className="py-4 px-2 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <button onClick={(e) => abrirFacturaOriginal(fac, e)} title="Ver Factura Original (PDF)" className="text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/30 p-1.5 rounded-lg transition hover:scale-110">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-2 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'COMP')}</div></td>
                        <td className="py-4 px-2 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'REP')}</div></td>
                        <td className="py-4 px-2 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'NC')}</div></td>

                        {/* ESTADO */}
                        <td className="py-4 px-4 text-left">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm whitespace-nowrap mix-blend-luminosity dark:mix-blend-normal ${fac.estado === 'Pagada' ? 'bg-emerald-50/80 text-emerald-700 border-white/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                            fac.estado === 'Vencida' ? 'bg-red-50/80 text-red-700 border-white/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                              fac.estado === 'Esperando REP' ? 'bg-purple-50/80 text-purple-700 border-white/50 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' :
                                'bg-orange-50/80 text-orange-700 border-white/50 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50'
                            }`}>
                            {fac.estado === 'Pagada' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                            {fac.estado === 'Vencida' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                            {fac.estado}
                          </div>
                        </td>
                      </tr>

                      {/* SUB-FILA EXPANDIDA: DETALLES MÁGICOS GLASS */}
                      {expandida && (
                        <tr className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md animate-fade-in shadow-inner relative z-0">
                          <td colSpan="10" className="p-0 border-t border-b border-indigo-100/50 dark:border-indigo-900/30">
                            <div className="p-6 md:p-8">

                              <div className="flex flex-col xl:flex-row gap-8">
                                {/* COLUMNA IZQUIERDA: LISTA DE PRODUCTOS */}
                                <div className="flex-1">
                                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-4 flex items-center gap-2 border-b border-gray-200/50 dark:border-slate-700/50 pb-2 drop-shadow-sm">
                                    <svg className="w-5 h-5 text-indigo-500 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                    Conceptos / Productos
                                  </h4>

                                  {fac.productosAsociados && fac.productosAsociados.length > 0 ? (
                                    <div className="overflow-x-auto border border-white/50 dark:border-slate-700/50 rounded-2xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-md shadow-sm">
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-sm border-b border-gray-200/50 dark:border-slate-700/50">
                                          <tr>
                                            <th className="p-3 font-bold text-gray-500 dark:text-slate-400 text-xs tracking-wider">Clave SAT</th>
                                            <th className="p-3 font-bold text-gray-500 dark:text-slate-400 text-xs tracking-wider">Cant.</th>
                                            <th className="p-3 font-bold text-gray-500 dark:text-slate-400 text-xs tracking-wider">Descripción</th>
                                            <th className="p-3 font-bold text-gray-500 dark:text-slate-400 text-xs tracking-wider text-right">P. Unitario</th>
                                            <th className="p-3 font-bold text-gray-500 dark:text-slate-400 text-xs tracking-wider text-right">Importe</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/30 dark:divide-slate-700/30">
                                          {fac.productosAsociados.map((prod, i) => (
                                            <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-700/40 transition-colors">
                                              <td className="p-3 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 bg-white/20 dark:bg-black/10 rounded-l-lg space-x-1">{prod.claveSAT || 'N/A'}</td>
                                              <td className="p-3 font-black text-gray-800 dark:text-gray-200">{prod.cantidad} <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md ml-1 border border-indigo-100/50 dark:border-indigo-800/30">{prod.claveUnidad}</span></td>
                                              <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{prod.nombre}</td>
                                              <td className="p-3 text-right font-medium text-gray-600 dark:text-gray-400">{formatearDinero(prod.precioUnitario)}</td>
                                              <td className="p-3 text-right font-black text-gray-900 dark:text-white drop-shadow-sm">{formatearDinero(prod.cantidad * prod.precioUnitario)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="p-6 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/50 dark:border-slate-700/50 text-center text-gray-500 dark:text-slate-400 text-sm font-semibold flex flex-col items-center gap-2">
                                      <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                      Esta factura no tiene productos indexados o es una factura genérica.
                                    </div>
                                  )}
                                </div>

                                {/* COLUMNA DERECHA: DATOS FISCALES LECTURA EN VIVO XML */}
                                <div className="xl:w-80">
                                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-4 flex items-center gap-2 border-b border-gray-200/50 dark:border-slate-700/50 pb-2 drop-shadow-sm">
                                    <svg className="w-5 h-5 text-indigo-500 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Datos Fiscales (Live)
                                  </h4>

                                  <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/30 backdrop-blur-xl rounded-3xl p-6 border border-white/60 dark:border-indigo-500/20 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 dark:bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

                                    {cargandoXML && !datosXML[fac.id] ? (
                                      <div className="py-10 text-center">
                                        <svg className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <p className="text-xs text-gray-500 animate-pulse">Leyendo XML Original...</p>
                                      </div>
                                    ) : datosXML[fac.id] && datosXML[fac.id].error ? (
                                      <div className="py-6 text-center text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        {datosXML[fac.id].error}
                                      </div>
                                    ) : datosXML[fac.id] ? (
                                      <div className="space-y-4 relative z-10">

                                        <div className="relative z-10">
                                          <p className="text-[10px] font-black text-indigo-600/70 dark:text-indigo-400/80 uppercase tracking-widest mb-1.5 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> Folio Fiscal (UUID)</p>
                                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-white/80 dark:border-slate-700/50 break-all shadow-inner backdrop-blur-sm select-all">{datosXML[fac.id].uuid}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                          <div className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-white/50 dark:border-slate-700/50 backdrop-blur-sm">
                                            <p className="text-[9px] font-black text-indigo-600/70 dark:text-indigo-400/80 uppercase tracking-widest mb-1">Método Pago</p>
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200">{datosXML[fac.id].metodoPago}</p>
                                          </div>
                                          <div className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-white/50 dark:border-slate-700/50 backdrop-blur-sm">
                                            <p className="text-[9px] font-black text-indigo-600/70 dark:text-indigo-400/80 uppercase tracking-widest mb-1">Uso CFDI</p>
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200 truncate" title={datosXML[fac.id].usoCFDI}>{datosXML[fac.id].usoCFDI}</p>
                                          </div>
                                        </div>

                                        <hr className="my-5 border-indigo-200/50 dark:border-indigo-900/30 relative z-10" />

                                        <div className="space-y-2.5 relative z-10 font-medium">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-slate-400">SubTotal</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatearDinero(parseFloat(datosXML[fac.id].subTotal))}</span>
                                          </div>
                                          {parseFloat(datosXML[fac.id].descuento) > 0 && (
                                            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                              <span className="font-bold">Descuentos</span>
                                              <span className="font-black">-{formatearDinero(parseFloat(datosXML[fac.id].descuento))}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-slate-400">Imp. Trasladados</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">+{formatearDinero(parseFloat(datosXML[fac.id].totalImpuestosTrasladados))}</span>
                                          </div>
                                          {parseFloat(datosXML[fac.id].totalImpuestosRetenidos) > 0 && (
                                            <div className="flex justify-between text-sm text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                                              <span className="font-bold">Imp. Retenidos</span>
                                              <span className="font-black">-{formatearDinero(parseFloat(datosXML[fac.id].totalImpuestosRetenidos))}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="pt-4 border-t border-indigo-200/50 dark:border-indigo-900/30 flex justify-between items-end mt-4 relative z-10">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gran Total</span>
                                          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 drop-shadow-sm">{formatearDinero(parseFloat(datosXML[fac.id].total))}</span>
                                        </div>

                                      </div>
                                    ) : (
                                      <div className="py-6 text-center text-sm text-gray-500">
                                        Sin datos disponibles.
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

    </div>
  );
}