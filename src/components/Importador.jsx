import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
const { ipcRenderer } = window.require('electron');

export default function Importador({ alVolver, modoOscuro, toggleTema, irAProveedores }) {
  
  const [archivosEnEspera, setArchivosEnEspera] = useState([]);
  const [filaExpandida, setFilaExpandida] = useState(null); // ESTADO NUEVO: Para saber qué fila está abierta
  const [configUsuario, setConfigUsuario] = useState({});
  const [resumenExito, setResumenExito] = useState(null);
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
        tipo: 'Desconocido', tipoOperacion: 'Compra', xmlListo: !!grupo.xml, pdfListo: !!grupo.pdf,
        estado: 'procesando', mensaje: 'Procesando...', conceptos: [] // Añadimos conceptos
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
            for(let i=0; i<conceptosNodos.length; i++) {
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
      if (datosFactura.estado !== 'error' && datosFactura.xmlListo) {
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
      }

      nuevosProcesados.push(datosFactura);
    }
    setArchivosEnEspera(prev => [...prev, ...nuevosProcesados]);
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
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-5xl mx-auto pb-36">
      <header className="animate-fade-in-up flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <button onClick={alVolver} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver al Dashboard
        </button>
        <button onClick={toggleTema} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition text-sm">
          {modoOscuro ? '☀️' : '🌙'}
        </button>
      </header>

      <div className="animate-fade-in-up delay-100 mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Centro de Importación</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Arrastra tus facturas (XML y PDF). El sistema detectará si son compras o ventas automáticamente.</p>
      </div>

      <section 
        {...getRootProps()} 
        className={`animate-fade-in-up delay-100 relative overflow-hidden border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-sm mb-8
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500'}`}
      >
        <input {...getInputProps()} />
        <div className={`mb-4 p-4 rounded-full transition-transform duration-500 ${isDragActive ? 'bg-blue-100 dark:bg-blue-800/50 scale-110' : 'bg-gray-50 dark:bg-slate-700'}`}>
          <svg className={`w-10 h-10 transition-colors ${isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        <h3 className={`text-xl font-bold mb-1 transition-colors ${isDragActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
          {isDragActive ? '¡Suelta los archivos aquí!' : 'Sube tus comprobantes'}
        </h3>
        <p className="text-gray-500 dark:text-slate-400 text-sm text-center">Puedes arrastrar decenas de XML y PDF al mismo tiempo.</p>
      </section>

      <section className="animate-fade-in-up delay-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Sala de Espera
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">{archivosEnEspera.length}</span>
          </h3>
          {archivosEnEspera.length > 0 && (
            <button onClick={() => setArchivosEnEspera([])} className="text-sm font-semibold text-gray-500 hover:text-red-500 transition">
              Limpiar Lista
            </button>
          )}
        </div>
        
        {archivosEnEspera.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-slate-700 rounded-3xl">
            <p className="text-gray-400 dark:text-slate-500 font-medium">No hay archivos en espera. Arrastra algunos arriba para comenzar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archivosEnEspera.map((archivo) => (
              <div key={archivo.id} className={`bg-white dark:bg-slate-800 rounded-2xl border ${archivo.estado === 'duplicado' ? 'border-gray-300 dark:border-slate-600 opacity-80' : 'border-gray-100 dark:border-slate-700'} shadow-sm overflow-hidden transition-all group`}>
                
                {/* ÁREA CLICKABLE (TU DISEÑO ORIGINAL MEJORADO) */}
                <div 
                  onClick={() => setFilaExpandida(filaExpandida === archivo.id ? null : archivo.id)}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {/* Barra de color lateral de estado */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${archivo.estado === 'listo' ? 'bg-emerald-500' : archivo.estado === 'duplicado' ? 'bg-gray-400' : archivo.estado === 'advertencia' ? 'bg-orange-400' : 'bg-red-500'}`}></div>

                  {/* Badges de XML/PDF originales */}
                  <div className="flex flex-col gap-2 pl-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold text-center border ${archivo.xmlListo ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-400' : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700 dark:border-slate-600'}`}>
                      {archivo.xmlListo ? '✅ XML' : '❌ XML'}
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold text-center border ${archivo.pdfListo ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-700 dark:border-slate-600'}`}>
                      {archivo.pdfListo ? '✅ PDF' : '❌ PDF'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* ETIQUETA NUEVA: Compra vs Venta */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${archivo.tipoOperacion === 'Venta' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}`}>
                        {archivo.tipoOperacion === 'Venta' ? 'VENTA A CLIENTE' : 'COMPRA A PROVEEDOR'}
                      </span>
                      <h4 className={`font-bold truncate ${archivo.estado === 'duplicado' ? 'text-gray-500 dark:text-slate-400 line-through' : 'text-gray-800 dark:text-white'}`}>{archivo.contraparte}</h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
                      <span>RFC: <span className="text-gray-700 dark:text-slate-300">{archivo.rfcContraparte}</span></span>
                      <span>Folio: <span className="text-gray-700 dark:text-slate-300">{archivo.folio}</span></span>
                      <span className="bg-gray-100 dark:bg-slate-700 px-2 rounded-full">{archivo.tipo}</span>
                      <span>Fecha: <span className="text-gray-700 dark:text-slate-300">{archivo.fecha.split('T')[0]}</span></span>
                    </div>
                    
                    <div className="mt-2">
                      <p className={`text-xs font-bold ${archivo.estado === 'listo' ? 'text-emerald-600 dark:text-emerald-400' : archivo.estado === 'duplicado' ? 'text-gray-500 dark:text-slate-400' : archivo.estado === 'advertencia' ? 'text-orange-600 dark:text-orange-400' : 'text-red-500'}`}>
                        {archivo.estado === 'duplicado' ? '🚫' : archivo.estado === 'listo' ? '✓' : '⚠️'} {archivo.mensaje}
                      </p>
                      {archivo.mensajeSecundario && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-0.5 rounded">{archivo.mensajeSecundario}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-2">
                    <span className={`text-xl font-bold ${archivo.estado === 'duplicado' ? 'text-gray-400' : 'text-gray-800 dark:text-white'}`}>{formatearDinero(archivo.total)}</span>
                    {/* INDICADOR PARA INEXPERTOS: Clic para ver detalles */}
                    {archivo.xmlListo && (
                      <span className="text-[11px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {filaExpandida === archivo.id ? 'Ocultar detalles ▴' : 'Ver productos ▾'}
                      </span>
                    )}
                  </div>
                </div>

                {/* --- SECCIÓN DESPLEGABLE DE PRODUCTOS --- */}
                {filaExpandida === archivo.id && archivo.conceptos.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-900/70 border-t border-gray-100 dark:border-slate-700 p-4 animate-fade-in-up">
                    <h5 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      Conceptos de la Factura ({archivo.conceptos.length})
                    </h5>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 dark:bg-slate-900/50 sticky top-0">
                          <tr className="text-xs text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                            <th className="p-2 font-semibold w-16 text-center">Cant.</th>
                            <th className="p-2 font-semibold">Descripción del Producto/Servicio</th>
                            <th className="p-2 font-semibold text-right">P. Unitario</th>
                            <th className="p-2 font-semibold text-right">Importe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                          {archivo.conceptos.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="p-2 text-center text-gray-600 dark:text-slate-300 font-medium">{item.cantidad}</td>
                              <td className="p-2 text-gray-800 dark:text-slate-200" title={item.descripcion}>
                                <div className="line-clamp-2 leading-tight text-xs">{item.descripcion}</div>
                              </td>
                              <td className="p-2 text-right text-gray-600 dark:text-slate-300 font-mono text-xs">{formatearDinero(item.precio)}</td>
                              <td className="p-2 text-right text-gray-800 dark:text-white font-bold font-mono text-xs">{formatearDinero(item.importe)}</td>
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
        <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 p-4 flex justify-center md:justify-end gap-4 z-50 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] animate-fade-in-up">
          <button type="button" onClick={() => setArchivosEnEspera([])} className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition">
            Cancelar Todo
          </button>
          <button id="btn-archivar" onClick={archivarFacturas} type="button" className={`font-bold py-3 px-10 rounded-xl shadow-lg transition transform flex items-center gap-2 ${archivosEnEspera.filter(a => a.estado !== 'error' && a.estado !== 'duplicado').length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            Procesar y Archivar ({archivosEnEspera.filter(a => a.estado !== 'error' && a.estado !== 'duplicado').length})
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / VENTANITA DE ÉXITO AL TERMINAR DE IMPORTAR */}
      {/* ========================================================= */}
      {resumenExito && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-700 relative transform transition-all scale-100">
            
            {/* Icono gigante de éxito */}
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">¡Importación Exitosa!</h2>
            <p className="text-center text-gray-600 dark:text-slate-400 font-medium mb-6">
              Se procesaron y organizaron <span className="font-bold text-gray-800 dark:text-white text-lg">{resumenExito.cantidad}</span> comprobantes en tu bóveda.
            </p>

            {/* Listita de los proveedores que el sistema creó automáticamente */}
            {resumenExito.nuevos.length > 0 && (
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-slate-700 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
                  Nuevos Perfiles Creados:
                </p>
                <ul className="space-y-2">
                  {resumenExito.nuevos.map((perfil, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
                      <span className={`w-2 h-2 rounded-full ${perfil.tipo === 'Proveedores' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                      <span className="truncate flex-1">{perfil.nombre}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${perfil.tipo === 'Proveedores' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'}`}>
                        {perfil.tipo}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Los 3 Botones de acción */}
            <div className="space-y-3">
              <button 
                onClick={() => { setResumenExito(null); if (irAProveedores) irAProveedores(); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md flex justify-center items-center gap-2"
              >
                Ir a Directorio de Proveedores
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              
              <button 
                disabled
                className="w-full bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed border border-dashed border-gray-200 dark:border-slate-700 flex justify-center items-center gap-2"
              >
                Ir a Directorio de Clientes <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">Próximamente</span>
              </button>

              <button 
                onClick={() => setResumenExito(null)}
                className="w-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold py-3 px-4 rounded-xl transition border border-gray-200 dark:border-slate-600"
              >
                Cerrar y seguir importando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}