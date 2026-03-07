import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
const { ipcRenderer } = window.require('electron');

export default function Importador({ alVolver, modoOscuro, toggleTema, irAProveedores, irAClientes }) {

  const [archivosEnEspera, setArchivosEnEspera] = useState([]);
  const [filaExpandida, setFilaExpandida] = useState(null); // ESTADO NUEVO: Para saber qué fila está abierta
  const [configUsuario, setConfigUsuario] = useState({});
  const [resumenExito, setResumenExito] = useState(null);
  const [pdfVacioAEditar, setPdfVacioAEditar] = useState(null); // NUEVO: Controla el modal de PDF Huérfano

  // ESTADO NUEVO: Al abrir la pantalla, preguntamos cuáles son nuestros RFCs
  useEffect(() => {
    ipcRenderer.invoke('obtener-config').then(res => setConfigUsuario(res || {}));
  }, []);

  // --- EL MOTOR QUE "ASPIRA" LOS ARCHIVOS AL INSTANTE (VERSIÓN AVANZADA) ---
  const procesarArchivos = async (archivosSueltos) => {
    const grupos = {};

    const esUnParPerfecto =
      archivosSueltos.length === 2 &&
      archivosSueltos.some(f => f.name.toLowerCase().endsWith('.xml')) &&
      archivosSueltos.some(f => f.name.toLowerCase().endsWith('.pdf'));

    if (esUnParPerfecto) {
      const xmlFile = archivosSueltos.find(f => f.name.toLowerCase().endsWith('.xml'));
      const pdfFile = archivosSueltos.find(f => f.name.toLowerCase().endsWith('.pdf'));
      const nombreBase = xmlFile.name.substring(0, xmlFile.name.lastIndexOf('.'));
      grupos[nombreBase] = { xml: xmlFile, pdf: pdfFile, nombreBase };
    } else {
      archivosSueltos.forEach(archivo => {
        const extension = archivo.name.split('.').pop().toLowerCase();
        const nombreBase = archivo.name.substring(0, archivo.name.lastIndexOf('.'));
        if (!grupos[nombreBase]) grupos[nombreBase] = { xml: null, pdf: null, nombreBase };
        if (extension === 'xml') grupos[nombreBase].xml = archivo;
        if (extension === 'pdf') grupos[nombreBase].pdf = archivo;
      });
    }

    const nuevosProcesados = [];

    // Obtenemos nuestros RFCs (Si hay varios, los separa por comas)
    const misRfcs = (configUsuario.rfc || '').toUpperCase().split(',').map(r => r.trim());

    for (const key in grupos) {
      const grupo = grupos[key];

      let datosFactura = {
        id: Date.now() + Math.random(),
        contraparte: 'Desconocido', rfcContraparte: '---', folio: 'Sin Folio', total: 0.00,
        fecha: new Date().toISOString(), // AGREGADO: Previene crasheos en el react render si entra puro PDF
        tipo: 'Desconocido', tipoOperacion: 'Compra', xmlListo: !!grupo.xml, pdfListo: !!grupo.pdf,
        estado: 'procesando', mensaje: 'Procesando...', conceptos: []
      };

      // 1. ASPIRAMOS EL XML A MEMORIA INMEDIATAMENTE
      if (grupo.xml) {
        try {
          const bufferXml = await grupo.xml.arrayBuffer();
          datosFactura.xmlData = bufferXml;

          const textoXML = new TextDecoder().decode(bufferXml);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(textoXML, "text/xml");

          const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
          const emisor = xmlDoc.getElementsByTagName('cfdi:Emisor')[0];
          const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0];

          if (comprobante && emisor && receptor) {
            const total = parseFloat(comprobante.getAttribute('Total') || 0);
            const folio = comprobante.getAttribute('Folio') || '';
            const serie = comprobante.getAttribute('Serie') || '';
            const tipoComprobante = comprobante.getAttribute('TipoDeComprobante') || 'I';
            datosFactura.fecha = comprobante.getAttribute('Fecha') || new Date().toISOString();

            let tipoLegible = 'Ingreso (Factura)';
            if (tipoComprobante === 'E') tipoLegible = 'Egreso (Devolución)';
            if (tipoComprobante === 'P') tipoLegible = 'Pago (Complemento)';

            datosFactura.folio = serie ? `${serie}-${folio}` : (folio || 'Sin Folio');
            datosFactura.total = total;
            datosFactura.tipo = tipoLegible;

            const rfcEmisor = emisor.getAttribute('Rfc');
            const rfcReceptor = receptor.getAttribute('Rfc');

            // --- LÓGICA DE DETECCIÓN: COMPRA VS VENTA ---
            if (misRfcs.includes(rfcEmisor)) {
              datosFactura.tipoOperacion = 'Venta';
              datosFactura.contraparte = receptor.getAttribute('Nombre') || 'Cliente Sin Nombre';
              datosFactura.rfcContraparte = rfcReceptor;
            } else {
              datosFactura.tipoOperacion = 'Compra';
              datosFactura.contraparte = emisor.getAttribute('Nombre') || 'Proveedor Sin Nombre';
              datosFactura.rfcContraparte = rfcEmisor;

              if (misRfcs[0] !== '' && !misRfcs.includes(rfcReceptor)) {
                datosFactura.mensajeSecundario = `⚠️ ATENCIÓN: El RFC que recibe la factura (${rfcReceptor}) no coincide con el tuyo.`;
              }
            }

            // --- EXTRACCIÓN DE PRODUCTOS PARA EL DESPLEGABLE ---
            const conceptosNodos = xmlDoc.getElementsByTagName('cfdi:Concepto');
            for (let i = 0; i < conceptosNodos.length; i++) {
              datosFactura.conceptos.push({
                cantidad: conceptosNodos[i].getAttribute('Cantidad'),
                descripcion: conceptosNodos[i].getAttribute('Descripcion'),
                precio: parseFloat(conceptosNodos[i].getAttribute('ValorUnitario') || 0),
                importe: parseFloat(conceptosNodos[i].getAttribute('Importe') || 0)
              });
            }

          } else {
            datosFactura.mensaje = 'XML Inválido: No es una factura del SAT.';
            datosFactura.estado = 'error';
          }
        } catch (error) {
          datosFactura.mensaje = 'El archivo XML está dañado.';
          datosFactura.estado = 'error';
        }
      }

      // 2. ASPIRAMOS EL PDF A MEMORIA
      if (grupo.pdf) {
        datosFactura.pdfData = await grupo.pdf.arrayBuffer();
      }

      // 3. VALIDACIÓN DE DUPLICADOS EN DISCO DURO Y ESTADOS
      if (datosFactura.estado !== 'error') {
        if (datosFactura.xmlListo) {
          let anio = '2025', mes = '01', dia = '01';
          if (datosFactura.fecha) {
            const partes = datosFactura.fecha.split('T')[0].split('-');
            if (partes.length === 3) { anio = partes[0]; mes = partes[1]; dia = partes[2]; }
          }

          const folioSeguro = datosFactura.folio.replace(/[<>:"/\\|?*]+/g, '_');

          // Consultamos al backend si ya existe el archivo
          const existe = await ipcRenderer.invoke('verificar-duplicado', {
            tipoOperacion: datosFactura.tipoOperacion,
            contraparte: datosFactura.contraparte,
            anio, mes, dia, folioSeguro
          });

          if (existe) {
            datosFactura.estado = 'duplicado';
            datosFactura.mensaje = 'Ya existe en tu bóveda. Será ignorada para evitar dobles pagos.';
          } else if (datosFactura.pdfListo) {
            datosFactura.estado = 'listo';
            datosFactura.mensaje = esUnParPerfecto ? '¡Emparejados inteligentemente! Listos para archivar.' : 'XML y PDF emparejados por nombre. Listo.';
          } else {
            datosFactura.estado = 'advertencia';
            datosFactura.mensaje = 'Falta el archivo PDF visual. Solo se archivará el XML.';
          }
        } else if (datosFactura.pdfListo && !datosFactura.xmlListo) {
          // --- CASO HUÉRFANO (SÓLO PDF) ---
          datosFactura.estado = 'advertencia';
          datosFactura.mensaje = 'Solo detectamos el PDF visual. Por favor añade los datos manualmente.';
        }
      }

      nuevosProcesados.push(datosFactura);
    }
    setArchivosEnEspera(prev => [...prev, ...nuevosProcesados]);
  };

  const guardarDatosManualesPdf = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const nombreProveedor = formData.get('proveedor').trim() || 'Desconocido';
    const rfcGenerico = formData.get('rfc').trim() || 'XAXX010101000';
    const folio = formData.get('folio').trim() || `S/F-${Date.now().toString().slice(-4)}`;
    const total = parseFloat(formData.get('total')) || 0;
    const fecha = formData.get('fecha') || new Date().toISOString().split('T')[0];

    setArchivosEnEspera(prev => prev.map(archivo => {
      if (archivo.id === pdfVacioAEditar.id) {
        return {
          ...archivo,
          contraparte: nombreProveedor,
          rfcContraparte: rfcGenerico,
          folio: folio,
          total: total,
          fecha: `${fecha}T00:00:00.000Z`,
          estado: 'listo', // Lo marcamos como listo para archivar
          mensaje: 'Datos manuales añadidos. Listo para archivar.',
          mensajeSecundario: 'Factura sin XML, generada manualmente desde Importador.'
        };
      }
      return archivo;
    }));
    setPdfVacioAEditar(null); // Cerrar Modal
  };

  const onDrop = (acceptedFiles) => procesarArchivos(acceptedFiles);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/xml': ['.xml'], 'application/pdf': ['.pdf'] } });
  const formatearDinero = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  // --- BOTÓN FINAL DE GUARDADO ---
  const archivarFacturas = async () => {
    const facturasValidas = archivosEnEspera.filter(a => a.estado !== 'error' && a.estado !== 'duplicado');
    if (facturasValidas.length === 0) return alert("No hay facturas válidas nuevas para guardar.");

    const btn = document.getElementById('btn-archivar');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = 'Guardando Archivos... ⏳';
    btn.disabled = true;

    try {
      const resultado = await ipcRenderer.invoke('procesar-facturas', facturasValidas);

      if (resultado.success) {
        // EN LUGAR DE ALERT, ACTIVAMOS LA VENTANA BONITA CON LOS DATOS:
        setResumenExito({
          cantidad: resultado.cantidad,
          nuevos: resultado.nuevos || []
        });
        setArchivosEnEspera([]);
      } else {
        alert(`Error al guardar: ${resultado.error}`);
      }
    } catch (err) {
      alert(`Error crítico de conexión: ${err.message}`);
    }

    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-[1800px] mx-auto pb-36 relative overflow-x-hidden">

      {/* Elementos decorativos de fondo (Glassmorphism orbs copiados del Dashboard y ajustados) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
        <div className="absolute top-1/2 left-20 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow delay-2000"></div>
      </div>

      <div className="animate-fade-in-up delay-100 mb-8 relative z-10 flex flex-col items-center">
        {/* Botón de regreso integrado tipo floating icon */}
        <div className="w-full flex justify-start mb-2">
          <button
            onClick={alVolver}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 dark:border-slate-600/40 transition-all hover:scale-105 hover:shadow-md text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="font-bold text-sm">Volver</span>
          </button>
        </div>

        <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 shadow-sm border border-blue-100/50 dark:border-blue-500/20 mt-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        <h2 className="text-4xl font-black text-gray-800 dark:text-white tracking-tight">Centro de Importación</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-3 text-lg max-w-2xl mx-auto text-center">Arrastra tus facturas (XML y PDF). El sistema detectará automáticamente si son compras o ventas, extrayendo todos los impuestos y conceptos.</p>
      </div>

      <section
        {...getRootProps()}
        className={`animate-fade-in-up relative z-10 delay-100 overflow-hidden border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 shadow-lg mb-8 backdrop-blur-xl group
          ${isDragActive ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/40 scale-[1.02] shadow-blue-500/20' : 'border-blue-200 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-2xl hover:bg-white/80 dark:hover:bg-slate-800/80'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <input {...getInputProps()} />
        <div className={`mb-6 p-5 rounded-2xl transition-all duration-500 shadow-md border ${isDragActive ? 'bg-blue-600 border-blue-500 scale-110 shadow-blue-500/30' : 'bg-white dark:bg-slate-700 border-gray-100 dark:border-slate-600 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-slate-600'}`}>
          <svg className={`w-12 h-12 transition-colors ${isDragActive ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
        </div>
        <h3 className={`text-2xl font-bold mb-2 transition-colors ${isDragActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
          {isDragActive ? '¡Suelta los comprobantes aquí!' : 'Sube tus archivos XML y PDF'}
        </h3>
        <p className="text-gray-500 dark:text-slate-400 text-base text-center font-medium">Puedes arrastrar carpetas enteras o decenas de archivos a la vez.</p>
      </section>

      <section className="animate-fade-in-up delay-200 relative z-10">
        <div className="flex justify-between items-center mb-6 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            Sala de Espera
            <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm shadow-blue-500/30">{archivosEnEspera.length}</span>
          </h3>
          {archivosEnEspera.length > 0 && (
            <button onClick={() => setArchivosEnEspera([])} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-red-200 shadow-sm">
              Limpiar Lista
            </button>
          )}
        </div>

        {archivosEnEspera.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-slate-600 rounded-[2rem] bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm">
            <div className="bg-gray-100 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-lg">No hay archivos en espera.<br /> Arrastra tus comprobantes arriba para comenzar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archivosEnEspera.map((archivo) => (
              <div key={archivo.id} className={`bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-[1.5rem] border ${archivo.estado === 'duplicado' ? 'border-gray-300/50 dark:border-slate-600/50 opacity-70' : 'border-white/60 dark:border-slate-700/50'} shadow-lg hover:shadow-xl transition-all group overflow-hidden`}>

                {/* ÁREA CLICKABLE (TU DISEÑO ORIGINAL MEJORADO) */}
                <div
                  className="p-5 flex flex-col md:flex-row items-start md:items-center gap-5 relative hover:bg-white/90 dark:hover:bg-slate-700/80 transition-colors"
                >
                  {/* Barra de color lateral de estado */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${archivo.estado === 'listo' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : archivo.estado === 'duplicado' ? 'bg-gray-400' : archivo.estado === 'advertencia' ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>

                  {/* Badges de XML/PDF originales */}
                  <div className="flex flex-col gap-2 pl-3">
                    <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider text-center border shadow-sm ${archivo.xmlListo ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-300' : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-500'}`}>
                      {archivo.xmlListo ? '✓ XML' : '✕ XML'}
                    </span>
                    <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider text-center border shadow-sm ${archivo.pdfListo ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-300' : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-500'}`}>
                      {archivo.pdfListo ? '✓ PDF' : '✕ PDF'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* ETIQUETA NUEVA: Compra vs Venta */}
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm ${archivo.tipoOperacion === 'Venta' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'}`}>
                        {archivo.tipoOperacion === 'Venta' ? 'VENTA A CLIENTE' : 'COMPRA A PROVEEDOR'}
                      </span>
                      <h4 className={`text-lg font-bold truncate ${archivo.estado === 'duplicado' ? 'text-gray-500 dark:text-slate-400 line-through' : 'text-gray-900 dark:text-white'}`}>{archivo.contraparte}</h4>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg> <span className="text-gray-700 dark:text-slate-200 font-semibold">{archivo.rfcContraparte}</span></span>
                      <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> <span className="text-gray-700 dark:text-slate-200 font-semibold">{archivo.folio}</span></span>
                      <span className="bg-gray-100/80 dark:bg-slate-700/80 px-2.5 py-0.5 rounded-md font-semibold text-gray-700 dark:text-slate-300">{archivo.tipo}</span>
                      <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> <span className="text-gray-700 dark:text-slate-200 font-semibold">{archivo.fecha.split('T')[0]}</span></span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 bg-white/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/50">
                      <div className={`w-2 h-2 rounded-full ${archivo.estado === 'listo' ? 'bg-emerald-500 animate-pulse' : archivo.estado === 'duplicado' ? 'bg-gray-400' : archivo.estado === 'advertencia' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                      <p className={`text-sm font-bold ${archivo.estado === 'listo' ? 'text-emerald-700 dark:text-emerald-400' : archivo.estado === 'duplicado' ? 'text-gray-600 dark:text-slate-400' : archivo.estado === 'advertencia' ? 'text-orange-700 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                        {archivo.mensaje}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-3">
                    <span className={`text-2xl font-black ${archivo.estado === 'duplicado' ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatearDinero(archivo.total)}</span>

                    <div className="flex gap-2">
                      {/* BOTÓN NUEVO: Rellenar Datos si es un PDF huérfano */}
                      {!archivo.xmlListo && archivo.pdfListo && archivo.estado === 'advertencia' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPdfVacioAEditar(archivo); }}
                          className="text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-2 rounded-xl shadow-md transition transform hover:scale-105 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          Añadir Datos
                        </button>
                      )}

                      {/* INDICADOR PARA INEXPERTOS: Clic para ver detalles */}
                      {archivo.xmlListo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFilaExpandida(filaExpandida === archivo.id ? null : archivo.id); }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-100 dark:border-blue-500/20 transition-all flex items-center gap-1.5"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-300 ${filaExpandida === archivo.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          {filaExpandida === archivo.id ? 'Ocultar XML' : 'Ver Dets. XML'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN DESPLEGABLE DE PRODUCTOS --- */}
                {filaExpandida === archivo.id && archivo.conceptos.length > 0 && (
                  <div className="bg-gray-50/80 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-700/50 p-5 animate-fade-in-up backdrop-blur-md">
                    <h5 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 inline-flex px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-slate-600/50">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      Conceptos Certificados ({archivo.conceptos.length})
                    </h5>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 shadow-inner">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100/90 dark:bg-slate-900/90 sticky top-0 backdrop-blur-sm z-10">
                          <tr className="text-xs text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                            <th className="p-3 font-bold w-16 text-center">Cant.</th>
                            <th className="p-3 font-bold">Descripción del Producto/Servicio</th>
                            <th className="p-3 font-bold text-right">P. Unitario</th>
                            <th className="p-3 font-bold text-right">Importe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                          {archivo.conceptos.map((item, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="p-3 text-center text-gray-700 dark:text-slate-300 font-bold">{item.cantidad}</td>
                              <td className="p-3 text-gray-800 dark:text-slate-200" title={item.descripcion}>
                                <div className="leading-relaxed text-sm">{item.descripcion}</div>
                              </td>
                              <td className="p-3 text-right text-gray-600 dark:text-slate-300 font-mono text-xs font-semibold">{formatearDinero(item.precio)}</td>
                              <td className="p-3 text-right text-blue-700 dark:text-blue-400 font-black font-mono text-sm">{formatearDinero(item.importe)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Este div invisible empuja todo hacia arriba para que la barra inferior jamás tape el contenido */}
      <div className="h-40 w-full shrink-0"></div>

      {archivosEnEspera.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-gray-200 dark:border-white/10 p-5 flex justify-center md:justify-end gap-4 z-50 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-fade-in-up">
          <div className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row justify-end gap-4">
            <button type="button" onClick={() => setArchivosEnEspera([])} className="px-6 py-3.5 font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-slate-600">
              Cancelar Todo
            </button>
            <button id="btn-archivar" onClick={archivarFacturas} type="button" className={`font-black py-3.5 px-10 rounded-xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg ${archivosEnEspera.filter(a => a.estado !== 'error' && a.estado !== 'duplicado').length > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] hover:-translate-y-1' : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed hidden'}`}>
              <svg className="w-6 h-6 animate-bounce mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              Sincronizar y Archivar ({archivosEnEspera.filter(a => a.estado !== 'error' && a.estado !== 'duplicado').length})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / VENTANITA DE ÉXITO AL TERMINAR DE IMPORTAR */}
      {/* ========================================================= */}
      {resumenExito && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in-up">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-[2.5rem] p-10 max-w-md w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/50 dark:border-slate-600/50 relative transform transition-all scale-100">

            {/* Icono gigante de éxito */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] border-4 border-white dark:border-slate-800 animate-bounce">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>

            <h2 className="text-3xl font-black text-center text-gray-800 dark:text-white mt-8 mb-2">¡Sincronización Exitosa!</h2>
            <p className="text-center text-gray-600 dark:text-slate-400 text-lg font-medium mb-8">
              Se han procesado y blindado <span className="font-black text-emerald-600 dark:text-emerald-400 text-2xl">{resumenExito.cantidad}</span> comprobantes en tu bóveda.
            </p>

            {/* Listita de los proveedores que el sistema creó automáticamente */}
            {resumenExito.nuevos.length > 0 && (
              <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-slate-700 max-h-48 overflow-y-auto shadow-inner">
                <p className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Nuevos Perfiles Creados Automaticamente:
                </p>
                <ul className="space-y-3">
                  {resumenExito.nuevos.map((perfil, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/50">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${perfil.tipo === 'Proveedores' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                      </div>
                      <span className="truncate flex-1">{perfil.nombre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Los 3 Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={() => { setResumenExito(null); if (irABoveda) irABoveda(); }}
                className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 text-white font-black py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2"
              >
                Ver facturas en la Bóveda
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>

              <button
                onClick={() => setResumenExito(null)}
                className="w-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold py-3.5 px-4 rounded-xl transition border border-gray-200 dark:border-slate-600"
              >
                Cerrar y seguir importando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RELLENAR DATOS DE PDF HUÉRFANO (NUEVO) */}
      {/* ========================================================= */}
      {pdfVacioAEditar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-700 relative">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Completar Datos del PDF</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Este PDF no tiene un XML asociado. Llena estos datos básicos para que el sistema sepa a quién pertenece y por cuánto dinero.
            </p>

            <form onSubmit={guardarDatosManualesPdf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">Proveedor / Tienda</label>
                <input
                  type="text"
                  name="proveedor"
                  required
                  placeholder="Ej: The Home Depot"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">RFC (Opcional)</label>
                  <input
                    type="text"
                    name="rfc"
                    placeholder="XAXX010101000"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">Folio Factura</label>
                  <input
                    type="text"
                    name="folio"
                    required
                    placeholder="Ej: F-10293"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">Monto Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="total"
                    required
                    placeholder="0.00"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">Fecha</label>
                  <input
                    type="date"
                    name="fecha"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPdfVacioAEditar(null)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition transform hover:-translate-y-0.5"
                >
                  Guardar y Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}