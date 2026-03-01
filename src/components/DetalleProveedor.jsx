import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function DetalleProveedor({ alVolver, modoOscuro, toggleTema, proveedor }) {
  const nombreCarpeta = proveedor.carpetaDestino || proveedor.nombre;

  const [facturas, setFacturas] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [productos, setProductos] = useState({});
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [busquedaFactura, setBusquedaFactura] = useState('');
  const [cargando, setCargando] = useState(true);
  const [animarGrafica, setAnimarGrafica] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const [deudaLocal, setDeudaLocal] = useState(proveedor.metricas?.deudaActual || 0);

  // --- ESTADOS PARA MODAL DE PAGOS PRINCIPAL ---
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [pagoExitosoInfo, setPagoExitosoInfo] = useState(null);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [datosPago, setDatosPago] = useState({ metodo: 'Transferencia', referencia: '', comprobanteArchivo: null, comprobanteNombre: '' });
  const [procesandoPago, setProcesandoPago] = useState(false);

  // --- ESTADOS PARA EL NUEVO MODAL DE ADJUNTAR (DOCUMENTOS REZAGADOS / N.C.) ---
  const [modalAdjuntoAbierto, setModalAdjuntoAbierto] = useState(false);
  const [procesandoAdjunto, setProcesandoAdjunto] = useState(false);
  const [datosAdjunto, setDatosAdjunto] = useState({ idFactura: '', folio: '', tipoDoc: '', archivo: null, nombreArchivo: '', montoNC: '' });

  // Filtrar facturas para pago
  const facturasPorPagar = facturas
    .filter(fac => fac.estado !== 'Pagada' && fac.estado !== 'Esperando REP')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // La matemática inteligente: Sumar montos seleccionados RESTANDO las notas de crédito si las hay
  const totalSeleccionado = facturasPorPagar
    .filter(fac => facturasSeleccionadas.includes(fac.id))
    .reduce((sum, fac) => {
      const descuento = fac.notaCredito ? fac.notaCredito.monto : 0;
      return sum + Math.max(0, fac.monto - descuento);
    }, 0);

  const toggleSeleccionFactura = (id) => {
    setFacturasSeleccionadas(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // =========================================================
  // FUNCIÓN: ABRIR DOCUMENTOS (EL "OJITO" AZUL)
  // =========================================================
  const abrirDocumento = async (ruta) => {
    if (!ruta) return alert('No hay ruta guardada para este archivo.');
    const resultado = await ipcRenderer.invoke('abrir-archivo', ruta);
    if (!resultado.success) alert(`Error al abrir archivo: ${resultado.error}`);
  };

  const abrirFacturaOriginal = async (fac) => {
    const resultado = await ipcRenderer.invoke('abrir-factura-original', {
      nombreProveedor: nombreCarpeta,
      fecha: fac.fecha,
      folio: fac.folio
    });
    if (!resultado.success) alert(resultado.error);
  };

  // =========================================================
  // FUNCIÓN: PREPARAR MODAL PARA ADJUNTAR (EL BOTÓN "+")
  // =========================================================
  const prepararModalAdjunto = (fac, tipo) => {
    setDatosAdjunto({ idFactura: fac.id, folio: fac.folio, tipoDoc: tipo, archivo: null, nombreArchivo: '', montoNC: '' });
    setModalAdjuntoAbierto(true);
  };

  // =========================================================
  // FUNCIÓN: GUARDAR DOCUMENTO REZAGADO O NOTA DE CRÉDITO
  // =========================================================
  const guardarAdjunto = async () => {
    setProcesandoAdjunto(true);
    let base64 = null;
    let ext = '';

    if (datosAdjunto.archivo) {
      base64 = await fileToBase64(datosAdjunto.archivo);
      const partes = datosAdjunto.nombreArchivo.split('.');
      ext = '.' + partes[partes.length - 1];
    }

    let resultado;

    // Si es Nota de Crédito, usamos el súper poder 3. Si no, el súper poder 2.
    if (datosAdjunto.tipoDoc === 'NC') {
      if (!datosAdjunto.montoNC || parseFloat(datosAdjunto.montoNC) <= 0) {
        alert("Debes ingresar un monto válido para la Nota de Crédito.");
        setProcesandoAdjunto(false);
        return;
      }
      resultado = await ipcRenderer.invoke('registrar-nota-credito', {
        nombreProveedor: nombreCarpeta, idFactura: datosAdjunto.idFactura,
        montoNC: datosAdjunto.montoNC, archivoBase64: base64, extension: ext
      });
    } else {
      if (!base64) {
        alert("Debes seleccionar un archivo (PDF o Imagen).");
        setProcesandoAdjunto(false);
        return;
      }
      resultado = await ipcRenderer.invoke('adjuntar-documento', {
        nombreProveedor: nombreCarpeta, idFactura: datosAdjunto.idFactura,
        tipoDoc: datosAdjunto.tipoDoc, archivoBase64: base64, extension: ext
      });
    }

    if (resultado.success) {
      setModalAdjuntoAbierto(false);
      await cargarDatosCompletos(); // Recarga la tabla para que el "+" se convierta en "ojito"

      // Si fue nota de crédito, actualizamos la deuda principal visualmente al instante
      if (datosAdjunto.tipoDoc === 'NC') {
        setDeudaLocal(prev => Math.max(0, prev - parseFloat(datosAdjunto.montoNC)));
      }

      alert('Operación registrada exitosamente.');
    } else {
      alert(`Ocurrió un error: ${resultado.error}`);
    }
    setProcesandoAdjunto(false);
  };

  // =========================================================
  // FUNCIÓN: PROCESAR PAGO PRINCIPAL
  // =========================================================
  const procesarPago = async () => {
    setProcesandoPago(true);
    let base64 = null;
    let ext = null;
    if (datosPago.comprobanteArchivo) {
      base64 = await fileToBase64(datosPago.comprobanteArchivo);
      const nombrePartes = datosPago.comprobanteNombre.split('.');
      ext = '.' + nombrePartes[nombrePartes.length - 1];
    }
    const resultado = await ipcRenderer.invoke('registrar-pago', {
      nombreProveedor: nombreCarpeta, facturasSeleccionadas: facturasSeleccionadas,
      datosPago: { metodo: datosPago.metodo, referencia: datosPago.referencia, comprobanteBase64: base64, comprobanteExt: ext }
    });

    if (resultado.success) {
      setModalPagoAbierto(false);
      setFacturasSeleccionadas([]);
      setDatosPago({ metodo: 'Transferencia', referencia: '', comprobanteArchivo: null, comprobanteNombre: '' });
      cargarDatosCompletos();
      setDeudaLocal(prev => Math.max(0, prev - resultado.montoSaldado));
      setPagoExitosoInfo(resultado.montoSaldado);
      setTimeout(() => setPagoExitosoInfo(null), 3000);
    } else {
      alert(`Error al registrar el pago: ${resultado.error}`);
    }
    setProcesandoPago(false);
  };

  const sincronizarLocal = async () => {
    setSincronizando(true);
    const resultado = await ipcRenderer.invoke('sincronizar-proveedor', nombreCarpeta);
    if (resultado.success) {
      await cargarDatosCompletos();
      const perfilActualizado = await ipcRenderer.invoke('obtener-proveedores');
      const esteProv = perfilActualizado.find(p => p.carpetaDestino === nombreCarpeta);
      if (esteProv) setDeudaLocal(esteProv.metricas.deudaActual);
      setAnimarGrafica(false); setTimeout(() => setAnimarGrafica(true), 100);
    } else {
      alert(`Error al sincronizar: ${resultado.error}`);
    }
    setSincronizando(false);
  };

  const cargarDatosCompletos = async () => {
    const facturasReales = await ipcRenderer.invoke('obtener-facturas-proveedor', nombreCarpeta);
    const bitacoraReal = await ipcRenderer.invoke('obtener-bitacora', nombreCarpeta);
    const productosReales = await ipcRenderer.invoke('obtener-productos-proveedor', nombreCarpeta); // <--- NUEVA LLAMADA

    setFacturas(facturasReales);
    setBitacora(bitacoraReal);
    setProductos(productosReales); // <--- GUARDAMOS LOS PRODUCTOS
    setCargando(false);
    setTimeout(() => setAnimarGrafica(true), 100);
  };

  useEffect(() => { cargarDatosCompletos(); }, [nombreCarpeta]);

  const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);

  const limiteCredito = parseFloat(proveedor.limiteCredito) || 0;
  const comprasTotales = proveedor.metricas?.comprasHistoricas || 0;
  const creditoDisponible = limiteCredito > 0 ? (limiteCredito - deudaLocal) : 0;
  const porcentajeCredito = limiteCredito > 0 ? Math.min((deudaLocal / limiteCredito) * 100, 100) : 0;
  const contactos = proveedor.contactos || [];
  const notas = proveedor.notasGenerales || "No notas registradas.";

  const generarDatosGrafica = () => {
    if (facturas.length === 0) return [];
    const mesesMap = {};
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    facturas.forEach(fac => {
      const fechaObj = new Date(fac.fecha);
      const mesNombre = nombresMeses[fechaObj.getMonth()];
      mesesMap[mesNombre] = (mesesMap[mesNombre] || 0) + fac.monto;
    });
    const historial = Object.keys(mesesMap).map(mes => ({ mes, monto: mesesMap[mes] }));
    const maxMonto = Math.max(...historial.map(d => d.monto), 1);
    return historial.map(d => ({ ...d, porcentajeAlto: Math.round((d.monto / maxMonto) * 100) })).reverse().slice(0, 6);
  };
  const datosGrafica = generarDatosGrafica();

  // =========================================================
  // DIBUJADOR DE BOTONES PARA LA TABLA (OJITO O SIGNO +)
  // =========================================================
  const renderBotonDoc = (fac, tipo) => {
    let tieneDoc = false;
    let rutaDoc = null;

    // Evaluamos las reglas de negocio
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

    // Si TIENE documento, pintamos el ojito azul
    if (tieneDoc) {
      return (
        <div className="flex flex-col items-center justify-center">
          <button onClick={() => abrirDocumento(rutaDoc)} title={`Ver ${tipo}`} className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg transition hover:scale-110">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </button>
          {tipo === 'NC' && fac.notaCredito?.monto && (
            <span className="text-[9px] font-black text-emerald-500 mt-1 block tracking-tighter">-{formatearDinero(fac.notaCredito.monto)}</span>
          )}
        </div>
      );
    }

    // Si NO TIENE documento (y aplica tenerlo), pintamos el botón de +
    return (
      <button onClick={() => prepararModalAdjunto(fac, tipo)} title={`Adjuntar ${tipo}`} className="text-gray-400 hover:text-gray-700 bg-gray-100 dark:bg-slate-700 p-1.5 rounded-lg transition hover:bg-gray-200 dark:hover:bg-slate-600 hover:scale-110">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
      </button>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto pb-20">

      {/* HEADER TIPO TARJETA */}
      <header className="animate-fade-in-up bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex justify-between items-start relative z-10 mb-6">
          <button onClick={alVolver} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-semibold transition bg-gray-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Volver al Directorio
          </button>
          <div className="flex items-center gap-2">
            <button onClick={sincronizarLocal} disabled={sincronizando} className="p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 transition disabled:opacity-50">
              <svg className={`w-5 h-5 ${sincronizando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <button onClick={toggleTema} className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
              {modoOscuro ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <div className="w-24 h-24 bg-white dark:bg-[#0f141e] rounded-2xl border-2 border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-center p-2 overflow-hidden">
            {proveedor.logo ? <img src={proveedor.logo} alt="Logo" className="max-w-full max-h-full object-contain" /> : <span className="text-3xl font-black text-gray-400 dark:text-slate-600">{proveedor.nombre.charAt(0)}</span>}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white leading-tight">{proveedor.nombre}</h1>
            <p className="text-gray-500 dark:text-slate-400 font-medium mb-3">RFC: {proveedor.rfc || 'No registrado'} • Regla: {proveedor.tipoPago?.toUpperCase() || 'CONTADO'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${deudaLocal > 0 ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30'}`}>
                {deudaLocal > 0 ? `🔴 Tiene Deuda Pendiente` : '🟢 Cuenta al Día'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up delay-100">
            <div className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-colors ${deudaLocal > 0 ? 'border-red-200 dark:border-red-900/50' : 'border-gray-100 dark:border-slate-700'}`}>
              <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${deudaLocal > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">Deuda Actual</p>
              <h3 className={`text-3xl font-bold transition-colors ${deudaLocal > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatearDinero(deudaLocal)}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-end mb-1">
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Crédito Libre</p>
                {limiteCredito > 0 ? (<span className="text-xs font-bold text-blue-500">{Math.round(100 - porcentajeCredito)}%</span>) : (<span className="text-xs font-bold text-emerald-500">Ilimitado</span>)}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">{limiteCredito > 0 ? formatearDinero(creditoDisponible) : '---'}</h3>
              <div className="w-full bg-gray-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${porcentajeCredito > 85 ? 'bg-red-500' : porcentajeCredito > 60 ? 'bg-orange-400' : 'bg-blue-500'}`} style={{ width: `${limiteCredito > 0 ? porcentajeCredito : 100}%` }}></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">Compras Históricas</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatearDinero(comprasTotales)}</h3>
            </div>
          </div>

          {/* Gráfica */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up delay-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Tendencia de Compras</h3>
            {datosGrafica.length > 0 ? (
              <div className="h-48 flex items-end gap-2 md:gap-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                {datosGrafica.map((dato, index) => (
                  <div key={index} className="relative flex-1 flex flex-col items-center group h-full justify-end">
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1.5 px-2.5 rounded-lg whitespace-nowrap z-10 font-bold shadow-lg">{formatearDinero(dato.monto)}</div>
                    <div className="w-full max-w-[40px] bg-gradient-to-t from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/50 group-hover:from-blue-400 group-hover:to-blue-500 rounded-t-lg transition-all duration-[1000ms] relative" style={{ height: animarGrafica ? `${dato.porcentajeAlto}%` : '0%' }}>
                      <div className="absolute top-0 w-full h-1.5 bg-blue-500 rounded-t-lg"></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-2">{dato.mes}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">No hay datos para la gráfica.</p>}
          </div>

          {/* TABLAS DE FACTURAS */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up delay-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Facturas en Bóveda ({facturas.length})
              </h3>

              {/* BARRA DE BÚSQUEDA DE FACTURAS */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar factura por folio o fecha..."
                  value={busquedaFactura}
                  onChange={(e) => setBusquedaFactura(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-[#1a1f2b] text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* TABLA PENDIENTES */}
            <div className="mb-8">
              <h4 className="text-md font-bold text-red-600 dark:text-red-400 mb-3 border-b border-red-100 dark:border-red-900/30 pb-2">Pendientes de Pago</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2 pt-2">Folio</th>
                      <th className="pb-3 pt-2">Fecha</th>
                      <th className="pb-3 text-right pt-2">Monto</th>
                      <th className="pb-3 text-center pt-2" title="Factura Original">PDF</th>
                      <th className="pb-3 text-center pt-2" title="Comprobante">Comp.</th>
                      <th className="pb-3 text-center pt-2" title="REP (SAT)">REP</th>
                      <th className="pb-3 text-center pt-2" title="Nota de Crédito">N.C.</th>
                      <th className="pb-3 pl-4 pt-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {cargando ? <tr><td colSpan="8" className="text-center py-8">Cargando...</td></tr> :
                      facturas.filter(f => f.estado !== 'Pagada' && ((f.folio || '').toLowerCase().includes(busquedaFactura.toLowerCase()) || (f.fecha || '').includes(busquedaFactura))).length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-8 text-gray-400 italic">No hay facturas pendientes.</td></tr>
                      ) : (
                        facturas
                          .filter(f => f.estado !== 'Pagada')
                          .filter(f => (f.folio || '').toLowerCase().includes(busquedaFactura.toLowerCase()) || (f.fecha || '').includes(busquedaFactura))
                          .map((fac, idx) => (
                            <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition">
                              <td className="py-4 pl-2 font-mono font-medium text-gray-800 dark:text-gray-200 truncate max-w-[100px]" title={fac.folio}>{fac.folio}</td>
                              <td className="py-4 text-gray-600 dark:text-slate-400 whitespace-nowrap">{fac.fecha}</td>
                              <td className="py-4 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap">
                                {formatearDinero(fac.monto)}
                              </td>
                              <td className="py-4 align-middle">
                                <div className="flex justify-center">
                                  <button onClick={() => abrirFacturaOriginal(fac)} title="Ver Factura Original" className="text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition hover:scale-110">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'COMP')}</div></td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'REP')}</div></td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'NC')}</div></td>
                              <td className="py-4 pl-4 align-middle">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${fac.estado === 'Esperando REP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                                  {fac.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA PAGADAS */}
            <div>
              <h4 className="text-md font-bold text-emerald-600 dark:text-emerald-400 mb-3 border-b border-emerald-100 dark:border-emerald-900/30 pb-2">Pagadas y Completadas</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2 pt-2">Folio</th>
                      <th className="pb-3 pt-2">Fecha</th>
                      <th className="pb-3 text-right pt-2">Monto</th>
                      <th className="pb-3 text-center pt-2" title="Factura Original">PDF</th>
                      <th className="pb-3 text-center pt-2" title="Comprobante">Comp.</th>
                      <th className="pb-3 text-center pt-2" title="REP (SAT)">REP</th>
                      <th className="pb-3 text-center pt-2" title="Nota de Crédito">N.C.</th>
                      <th className="pb-3 pl-4 pt-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {cargando ? <tr><td colSpan="8" className="text-center py-8">Cargando...</td></tr> :
                      facturas.filter(f => f.estado === 'Pagada' && ((f.folio || '').toLowerCase().includes(busquedaFactura.toLowerCase()) || (f.fecha || '').includes(busquedaFactura))).length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-8 text-gray-400 italic">No hay facturas pagadas.</td></tr>
                      ) : (
                        facturas
                          .filter(f => f.estado === 'Pagada')
                          .filter(f => (f.folio || '').toLowerCase().includes(busquedaFactura.toLowerCase()) || (f.fecha || '').includes(busquedaFactura))
                          .map((fac, idx) => (
                            <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition">
                              <td className="py-4 pl-2 font-mono font-medium text-gray-800 dark:text-gray-200 truncate max-w-[100px]" title={fac.folio}>{fac.folio}</td>
                              <td className="py-4 text-gray-600 dark:text-slate-400 whitespace-nowrap">{fac.fecha}</td>
                              <td className="py-4 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap">
                                {formatearDinero(fac.monto)}
                              </td>
                              <td className="py-4 align-middle">
                                <div className="flex justify-center">
                                  <button onClick={() => abrirFacturaOriginal(fac)} title="Ver Factura Original" className="text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition hover:scale-110">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'COMP')}</div></td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'REP')}</div></td>
                              <td className="py-4 align-middle"><div className="flex justify-center">{renderBotonDoc(fac, 'NC')}</div></td>
                              <td className="py-4 pl-4 align-middle">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30`}>
                                  {fac.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>
          {/* ========================================================= */}
          {/* NUEVA SECCIÓN: CATÁLOGO Y TENDENCIA DE PRECIOS            */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up delay-300">

            {/* CABECERA CON BUSCADOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                Análisis de Precios ({Object.keys(productos).length} Conceptos)
              </h3>

              {/* LA BARRA DE BÚSQUEDA */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-[#1a1f2b] text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-white transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr className="border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2 pt-2">Descripción (Concepto)</th>
                    <th className="pb-3 text-right pt-2">Último Precio</th>
                    <th className="pb-3 text-center pt-2">Tendencia</th>
                    <th className="pb-3 text-center pt-2">Mínimo / Máximo Registrado</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.keys(productos).length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-gray-400 italic">Aún no hay productos registrados en las facturas.</td></tr>
                  ) : (
                    Object.entries(productos)
                      // --- EL FILTRO MÁGICO ---
                      .filter(([nombreArticulo]) => nombreArticulo.toLowerCase().includes(busquedaProducto.toLowerCase()))
                      .map(([nombreArticulo, datos], idx) => {
                        // Calculamos la tendencia
                        let tendencia = 'igual';
                        if (datos.historial && datos.historial.length > 1) {
                          const precioAnterior = datos.historial[datos.historial.length - 2].precio;
                          if (datos.precioActual > precioAnterior) tendencia = 'subio';
                          if (datos.precioActual < precioAnterior) tendencia = 'bajo';
                        }

                        return (
                          <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition">
                            <td className="py-4 pl-2 font-medium text-gray-800 dark:text-gray-200">{nombreArticulo}</td>
                            <td className="py-4 text-right font-black text-gray-800 dark:text-white">{formatearDinero(datos.precioActual)}</td>
                            <td className="py-4 text-center align-middle">
                              <div className="flex justify-center">
                                {tendencia === 'subio' && <span title="¡Subió de precio!" className="bg-red-100 text-red-600 dark:bg-red-900/30 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg></span>}
                                {tendencia === 'bajo' && <span title="¡Bajó de precio!" className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg></span>}
                                {tendencia === 'igual' && <span title="Precio estable" className="bg-gray-100 text-gray-400 dark:bg-slate-700 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg></span>}
                              </div>
                            </td>
                            <td className="py-4 text-center align-middle">
                              <div className="flex items-center justify-center gap-2 text-xs font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/10 px-2 py-1 rounded">Min: {formatearDinero(datos.precioMinimo)}</span>
                                <span className="text-gray-300 dark:text-slate-600">-</span>
                                <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded">Max: {formatearDinero(datos.precioMaximo)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                  {/* Mensaje inteligente si la búsqueda no arroja resultados */}
                  {Object.keys(productos).length > 0 && Object.entries(productos).filter(([n]) => n.toLowerCase().includes(busquedaProducto.toLowerCase())).length === 0 && (
                    <tr><td colSpan="4" className="text-center py-8 text-gray-500 font-medium">No se encontraron productos que coincidan con "{busquedaProducto}"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6 animate-fade-in-up delay-300">
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-3xl shadow-lg text-white">
            <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
            <button onClick={() => setModalPagoAbierto(true)} className="w-full bg-white text-blue-600 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition shadow-md transform hover:-translate-y-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Saldar Facturas (Pago)
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-bold mb-4 uppercase">Directorio</h3>
            {contactos.length > 0 ? (
              <div className="space-y-4">
                {contactos.map(contacto => (
                  <div key={contacto.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{contacto.nombre ? contacto.nombre.charAt(0) : 'C'}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{contacto.nombre || contacto.rol}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{contacto.telefono || contacto.correo}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500 italic">No hay contactos.</p>}
          </div>
        </div>
      </div>

      {/* BITÁCORA */}
      <div className="mt-8 animate-fade-in-up delay-500">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Historial de Actividad
        </h3>
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden max-h-64 overflow-y-auto p-4">
          {bitacora.length === 0 ? <p className="text-center text-gray-400 italic py-4">No hay actividad registrada.</p> : (
            <ul className="space-y-3">
              {bitacora.map((ev, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm border-b border-gray-50 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
                  <span className="text-xl mt-0.5">{ev.icono}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{ev.descripcion}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ev.fechaHora} • <span className="font-semibold uppercase">{ev.tipo}</span></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. MODAL DE PAGOS PRINCIPAL                                 */}
      {/* ========================================================= */}
      {modalPagoAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1e2433] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-700/50 transform animate-fade-in-up">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
              <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">Registrar Nuevo Pago</h2>
              <button onClick={() => setModalPagoAbierto(false)} className="text-gray-400 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase flex items-center gap-2">Facturas a saldar</h3>
                {facturasPorPagar.length === 0 ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl text-emerald-600 text-center font-medium border border-emerald-100 dark:border-emerald-800/30">¡Todo al día! No tienes facturas con deuda.</div>
                ) : (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                        <tr><th className="p-4 w-12 text-center">✔</th><th className="p-4">Folio</th><th className="p-4 text-right">Monto</th></tr>
                      </thead>
                      <tbody>
                        {facturasPorPagar.map(fac => {
                          const seleccionado = facturasSeleccionadas.includes(fac.id);
                          const descuentoNC = fac.notaCredito ? fac.notaCredito.monto : 0;
                          return (
                            <tr key={fac.id} onClick={() => toggleSeleccionFactura(fac.id)} className={`border-b border-gray-100 dark:border-slate-700/50 cursor-pointer transition-all ${seleccionado ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'}`}>
                              <td className="p-4 text-center"><input type="checkbox" checked={seleccionado} readOnly className="w-4 h-4" /></td>
                              <td className="p-4">
                                <p className={`font-mono font-medium ${seleccionado ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{fac.folio}</p>
                                {descuentoNC > 0 && <p className="text-xs text-emerald-500 font-bold mt-1 bg-emerald-50 dark:bg-emerald-900/30 inline-block px-2 py-0.5 rounded">- N.C. Aplicada ({formatearDinero(descuentoNC)})</p>}
                              </td>
                              <td className={`p-4 text-right font-black ${seleccionado ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                                {descuentoNC > 0 ? (
                                  <div>
                                    <span className="line-through text-gray-400 text-xs block">{formatearDinero(fac.monto)}</span>
                                    {formatearDinero(Math.max(0, fac.monto - descuentoNC))}
                                  </div>
                                ) : formatearDinero(fac.monto)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`transition-all duration-300 ${facturasSeleccionadas.length > 0 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase flex items-center gap-2">Detalles del Movimiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Método de Pago</label>
                    <select value={datosPago.metodo} onChange={(e) => setDatosPago({ ...datosPago, metodo: e.target.value })} className="w-full bg-white dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-3.5 text-sm outline-none">
                      <option value="Transferencia">Transferencia Bancaria</option><option value="Cheque">Cheque</option><option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">{datosPago.metodo === 'Efectivo' ? 'Entregado a:' : 'No. de Referencia'}</label>
                    <input type="text" value={datosPago.referencia} onChange={(e) => setDatosPago({ ...datosPago, referencia: e.target.value })} className="w-full bg-white dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-3.5 text-sm outline-none" />
                  </div>
                </div>
                {datosPago.metodo !== 'Efectivo' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Adjuntar Comprobante (Opcional)</label>
                    <div className="relative w-full h-28 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-blue-50 cursor-pointer overflow-hidden group">
                      <input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files[0]) setDatosPago({ ...datosPago, comprobanteArchivo: e.target.files[0], comprobanteNombre: e.target.files[0].name }); }} />
                      {datosPago.comprobanteNombre ? (
                        <div className="flex flex-col items-center text-emerald-600 font-bold"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg><span className="text-sm px-4 truncate max-w-[250px]">{datosPago.comprobanteNombre}</span></div>
                      ) : <span className="text-sm font-medium text-gray-400">Clickea o arrastra aquí tu PDF o captura</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 dark:border-slate-700/50 bg-white flex justify-between items-center z-20">
              <div><p className="text-xs text-gray-500 font-bold uppercase mb-0.5">Total a Pagar</p><p className="text-3xl font-black text-blue-600">{formatearDinero(totalSeleccionado)}</p></div>
              <button onClick={procesarPago} disabled={facturasSeleccionadas.length === 0 || procesandoPago} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl disabled:opacity-50">{procesandoPago ? 'Guardando...' : 'Confirmar y Saldar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. NUEVO MODAL MULTIPROPÓSITO (ADJUNTAR / NOTA DE CRÉDITO) */}
      {/* ========================================================= */}
      {modalAdjuntoAbierto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1e2433] rounded-3xl w-full max-w-md shadow-2xl border border-slate-700/50 overflow-hidden transform animate-fade-in-up">

            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                {datosAdjunto.tipoDoc === 'NC' ? 'Registrar Nota de Crédito' : `Adjuntar Documento (${datosAdjunto.tipoDoc})`}
              </h2>
              <button onClick={() => setModalAdjuntoAbierto(false)} className="text-gray-400 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Factura Seleccionada</p>
                <p className="font-mono text-gray-800 dark:text-gray-200">{datosAdjunto.folio}</p>
              </div>

              {datosAdjunto.tipoDoc === 'NC' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Monto de la Nota de Crédito ($)</label>
                  <input type="number" step="0.01" value={datosAdjunto.montoNC} onChange={(e) => setDatosAdjunto({ ...datosAdjunto, montoNC: e.target.value })} placeholder="Ej. 1500.00" className="w-full bg-white dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                  <p className="text-xs text-gray-400 mt-2">Este monto se restará de la deuda automáticamente.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  Archivo a adjuntar (PDF/Imagen) {datosAdjunto.tipoDoc !== 'NC' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-blue-50 cursor-pointer overflow-hidden group">
                  <input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files[0]) setDatosAdjunto({ ...datosAdjunto, archivo: e.target.files[0], nombreArchivo: e.target.files[0].name }); }} />
                  {datosAdjunto.nombreArchivo ? (
                    <div className="flex flex-col items-center text-emerald-600 font-bold"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg><span className="text-sm px-4 truncate max-w-[250px] mt-1">{datosAdjunto.nombreArchivo}</span></div>
                  ) : <span className="text-sm font-medium text-gray-400">Seleccionar o arrastrar archivo</span>}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 flex justify-end">
              <button onClick={guardarAdjunto} disabled={procesandoAdjunto || (datosAdjunto.tipoDoc !== 'NC' && !datosAdjunto.archivo)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50">
                {procesandoAdjunto ? 'Guardando...' : 'Guardar y Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEQUEÑO: CONFIRMACIÓN DE ÉXITO */}
      {pagoExitosoInfo !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1e2433] p-8 rounded-[32px] shadow-2xl flex flex-col items-center max-w-sm w-full animate-bounce-in border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-5 text-emerald-500 shadow-inner"><svg className="w-10 h-10 animate-[bounce_1s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 text-center">¡Pago Exitoso!</h3>
            <p className="text-gray-500 dark:text-slate-400 text-center mb-6 leading-relaxed">El saldo de la cuenta ha sido actualizado. Se registraron <br /><span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-2">{formatearDinero(pagoExitosoInfo)}</span></p>
            <button onClick={() => setPagoExitosoInfo(null)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/30">Aceptar</button>
          </div>
        </div>
      )}

    </div>
  );
}