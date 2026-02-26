import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

import SidebarCarpetas from './SidebarCarpetas';
import ListaCorreos from './ListaCorreos';
import VistaPrevia from './VistaPrevia';
import ModalCapturaManual from './ModalCapturaManual';
import ModalEnlazar from './ModalEnlazar';
import ConfiguracionCuentas from './ConfiguracionCuentas';


export default function BuzonInteligente({ alVolver, modoOscuro, toggleTema }) {
  // ESTADOS PRINCIPALES
  const [pestanaActiva, setPestanaActiva] = useState('bandeja');
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [correosLista, setCorreosLista] = useState([]);
  const [escaneando, setEscaneando] = useState(false);
  const [detallesCorreo, setDetallesCorreo] = useState({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
  const [carpetasNube, setCarpetasNube] = useState([]);
  // ESTADOS DE IMPORTACIÓN EN LOTE
  const [importando, setImportando] = useState(false);
  const [progresoImportacion, setProgresoImportacion] = useState({ actual: 0, total: 0 });
  const [modalExito, setModalExito] = useState({ abierto: false, cantidad: 0 });

  // ESTADO NUEVO: Modal para rellenar datos de un correo puro PDF
  const [pdfVacioAEditar, setPdfVacioAEditar] = useState(null);

  const [limiteCorreos, setLimiteCorreos] = useState(15); // Empezamos cargando 15 por defecto

  // Esta función se llama cuando agregas o cambias de cuenta
  const recargarSistemaCompleto = () => {
    setCacheCorreos({}); // Limpiamos la memoria de la cuenta anterior
    setCorreosLista([]);

    // Leemos quién es el nuevo jefe
    ipcRenderer.invoke('obtener-config-imap').then(configGuardada => {
      if (configGuardada && configGuardada.user) {
        setImapConfig(configGuardada);
        // Pedimos las carpetas de la NUEVA cuenta
        ipcRenderer.invoke('obtener-carpetas-imap').then(res => {
          if (res.success) setCarpetasNube(res.carpetas);
        });
        setPestanaActiva('bandeja'); // Brincamos al Inbox nuevo
      } else {
        setPestanaActiva('configuracion'); // Si borró todo, lo mandamos a configurar
      }
    });
  };
  // =================================================================
  // NUEVO: LA MEMORIA CACHÉ (Evita recargar al cambiar de carpeta)
  // =================================================================
  const [cacheCorreos, setCacheCorreos] = useState({});

  // ESTADOS DE IMAP (Preparándonos para las Multi-Cuentas)
  const [cuentasGuardadas, setCuentasGuardadas] = useState([]); // Próximamente guardará varias cuentas
  const [imapConfig, setImapConfig] = useState({ host: 'imap.gmail.com', port: 993, user: '', pass: '' });

  // ESTADOS DEL MODAL
  const [modalEnlazarAbierto, setModalEnlazarAbierto] = useState(false);
  const [carpetaParaEnlazar, setCarpetaParaEnlazar] = useState(null);

  useEffect(() => {
    ipcRenderer.invoke('obtener-config-imap').then(configGuardada => {
      if (configGuardada && configGuardada.user) {
        setImapConfig(configGuardada);
        setCuentasGuardadas([configGuardada]); // Próximamente guardará varias cuentas

        // ¡AQUÍ ESTÁ EL CAMBIO! Le mandamos 'false' para que use el disco duro
        ipcRenderer.invoke('obtener-carpetas-imap', false).then(res => {
          if (res.success) setCarpetasNube(res.carpetas);
        });
      } else {
        setPestanaActiva('configuracion');
      }
    });
  }, []);

  // =================================================================
  // EL MOTOR ESCÁNER (Ahora con Límite Dinámico)
  // =================================================================
  const escanearBandeja = async (ruta = pestanaActiva, forzarRecarga = false, limiteAUsar = limiteCorreos) => {
    const carpetaImap = ruta === 'bandeja' ? 'INBOX' : ruta;

    // Usamos el caché solo si no forzamos recarga
    if (!forzarRecarga && cacheCorreos[carpetaImap]) {
      setCorreosLista(cacheCorreos[carpetaImap]);
      setCorreoSeleccionado(null); setSeleccionados([]);
      return;
    }

    setEscaneando(true);
    if (!cacheCorreos[carpetaImap]) setCorreosLista([]);
    // --- NUEVO: SI FORZAMOS RECARGA DE CORREOS, TAMBIÉN RECARGAMOS CARPETAS ---
    if (forzarRecarga) {
      ipcRenderer.invoke('obtener-carpetas-imap', true).then(res => {
        if (res.success) setCarpetasNube(res.carpetas);
      });
    }

    try {
      // Le mandamos el número exacto de correos que queremos traer
      const resultado = await ipcRenderer.invoke('escanear-correos', limiteAUsar, carpetaImap, forzarRecarga);

      if (resultado.success) {
        setCorreosLista(resultado.correos);
        setCacheCorreos(prev => ({ ...prev, [carpetaImap]: resultado.correos }));
        setCorreoSeleccionado(null); setSeleccionados([]);
      } else {
        if (resultado.error.includes('No hay configuración')) setPestanaActiva('configuracion');
      }
    } catch (error) {
      console.log(error);
    }
    setEscaneando(false);
  };

  // NUEVA FUNCIÓN: Traer correos más antiguos
  const cargarMasCorreos = () => {
    const nuevoLimite = limiteCorreos + 15; // Sumamos 15 más a la cuenta
    setLimiteCorreos(nuevoLimite);
    // Forzamos ir a Google (true) para que traiga los viejos y actualice el caché
    escanearBandeja(pestanaActiva, true, nuevoLimite);
  };

  // Efecto que se dispara al cambiar de carpeta en el menú izquierdo
  useEffect(() => {
    if (pestanaActiva !== 'configuracion' && imapConfig.user) {
      escanearBandeja(pestanaActiva, false); // false = Usa la memoria si la tienes
    }
  }, [pestanaActiva, imapConfig.user]);


  // =================================================================
  // PROCESAMIENTO EN LOTE (LA MAGIA DEL ERP)
  // =================================================================
  const procesarImportacion = async () => {
    if (seleccionados.length === 0) return;

    setImportando(true);
    setProgresoImportacion({ actual: 0, total: seleccionados.length });

    const carpetaImap = pestanaActiva === 'bandeja' ? 'INBOX' : pestanaActiva;
    let exitos = 0; // AQUÍ SÍ EXISTE LA VARIABLE

    for (let i = 0; i < seleccionados.length; i++) {
      const uid = seleccionados[i];
      setProgresoImportacion({ actual: i + 1, total: seleccionados.length });

      try {
        const res = await ipcRenderer.invoke('descargar-adjuntos-correo', uid, carpetaImap);

        if (res.success && res.xmlInfo) {
          const guardado = await ipcRenderer.invoke('guardar-factura-erp', {
            archivos: res.archivos,
            xmlInfo: res.xmlInfo
          });

          // 🛡️ Si tuvo éxito O era un duplicado (ya lo tenías), lo cuenta como victoria y sigue avanzando
          if (guardado.success || guardado.error === 'DUPLICADO') {
            exitos++;
          }
        }
      } catch (e) { console.log('Error en correo', uid); }
    }

    setModalExito({ abierto: true, cantidad: exitos });
    setSeleccionados([]);
    setImportando(false);
  };

  // =================================================================
  // IMPORTACIÓN INDIVIDUAL (Desde el botón morado de la Vista Previa)
  // =================================================================
  const importarCorreoActual = async () => {
    if (!correoSeleccionado || !detallesCorreo.xmlInfo) return;

    setImportando(true);
    try {
      const guardado = await ipcRenderer.invoke('guardar-factura-erp', {
        archivos: detallesCorreo.archivos,
        xmlInfo: detallesCorreo.xmlInfo
      });

      if (guardado.success) {
        setModalExito({ abierto: true, cantidad: 1 });
      } else {
        // 🛡️ REVISAMOS SI EL CEREBRO DETECTÓ UN DUPLICADO
        if (guardado.error === 'DUPLICADO') {
          alert('⚠️ ¡Atención! Esta factura ya se encuentra registrada en el sistema de este proveedor.');
        } else {
          alert('Error al guardar: ' + guardado.error);
        }
      }
    } catch (error) {
      alert('Error crítico de conexión al guardar.');
    }
    setImportando(false);
  };

  // NUEVA FUNCIÓN: Guardar la captura manual desde el modal flotante
  const guardarCapturaPDFManual = async (e) => {
    e.preventDefault();
    if (!pdfVacioAEditar) return;

    setImportando(true);
    const formData = new FormData(e.target);
    const proveedor = formData.get('proveedor').trim() || 'Desconocido';
    const rfc = formData.get('rfc').trim() || 'XAXX010101000';
    const folio = formData.get('folio').trim() || `S/F-${Date.now().toString().slice(-4)}`;
    const total = parseFloat(formData.get('total')) || 0;
    const fecha = formData.get('fecha') || new Date().toISOString().split('T')[0];

    // Simulamos un xmlInfo para engañar sanamente al backend
    const xmlInfoInyectado = {
      nombreEmisor: proveedor,
      rfcEmisor: rfc,
      folio: folio,
      total: total.toString(),
      moneda: 'MXN'
    };

    try {
      const guardado = await ipcRenderer.invoke('guardar-factura-erp', {
        archivos: detallesCorreo.archivos, // Los PDFs descargados que enviaron
        xmlInfo: xmlInfoInyectado
      });

      if (guardado.success) {
        setPdfVacioAEditar(null);
        setModalExito({ abierto: true, cantidad: 1 });
      } else {
        if (guardado.error === 'DUPLICADO') {
          alert('⚠️ ¡Atención! Esta factura ya se encuentra registrada en el sistema.');
        } else {
          alert('Error al guardar: ' + guardado.error);
        }
      }
    } catch (error) {
      alert('Error crítico al procesar PDF manual.');
    }
    setImportando(false);
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
        const carpetaImap = pestanaActiva === 'bandeja' ? 'INBOX' : pestanaActiva;
        const resultado = await ipcRenderer.invoke('descargar-adjuntos-correo', correo.id, carpetaImap);

        if (resultado.success) {
          setDetallesCorreo({ cargando: false, archivos: resultado.archivos, xmlInfo: resultado.xmlInfo, pdfData: resultado.pdfData });

          if (resultado.xmlInfo?.total) {
            // Actualizamos el total tanto en la lista visual como en el caché
            const correosActualizados = correosLista.map(c => c.id === correo.id ? { ...c, total: `$${resultado.xmlInfo.total} ${resultado.xmlInfo.moneda}` } : c);
            setCorreosLista(correosActualizados);
            setCacheCorreos(prev => ({ ...prev, [carpetaImap]: correosActualizados }));
          }
        } else {
          alert('Error del Servidor: ' + resultado.error);
          setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
        }
      } catch (error) {
        alert('Error Crítico al Descargar: ' + error.message);
        setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
      }
    } else {
      setDetallesCorreo({ cargando: false, archivos: [], xmlInfo: null, pdfData: null });
    }
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
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">Gestor de Documentos ERP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÓN FORZAR RECARGA (TRUE) */}
          <button onClick={() => escanearBandeja(pestanaActiva, true)} disabled={escaneando || !imapConfig.user} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-5 py-2.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
            {escaneando ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
            {escaneando ? 'Sincronizando...' : 'Actualizar Correos'}
          </button>
          <button onClick={toggleTema} className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">
            {modoOscuro ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-full">
        <SidebarCarpetas
          pestanaActiva={pestanaActiva}
          setPestanaActiva={setPestanaActiva}
          setCorreoSeleccionado={setCorreoSeleccionado}
          correosLista={correosLista}
          carpetasNube={carpetasNube}
          abrirModalEnlazar={(carpeta) => { setCarpetaParaEnlazar(carpeta); setModalEnlazarAbierto(true); }}
        />

        <main className="flex-1 flex overflow-hidden p-3 lg:p-4 gap-4 bg-gray-50/50 dark:bg-[#0f141e]">
          {pestanaActiva !== 'configuracion' && (
            <>
              <ListaCorreos
                correosLista={correosLista}
                correoSeleccionado={correoSeleccionado}
                seleccionados={seleccionados}
                setSeleccionados={setSeleccionados}
                seleccionarYDescargar={seleccionarYDescargar}
                detallesCorreo={detallesCorreo}
                setCorreoSeleccionado={setCorreoSeleccionado}

                importando={importando}
                progresoImportacion={progresoImportacion}
                procesarImportacion={procesarImportacion}

                // --- NUEVAS LÍNEAS ---
                escaneando={escaneando}
                cargarMasCorreos={cargarMasCorreos}
              />

              {correoSeleccionado && (
                <div className="hidden lg:flex flex-col w-7/12 h-full">
                  <VistaPrevia
                    correoSeleccionado={correoSeleccionado}
                    setCorreoSeleccionado={setCorreoSeleccionado}
                    detallesCorreo={detallesCorreo}
                    importarCorreoActual={importarCorreoActual}
                    importando={importando}
                    abrirModalPDFManual={() => setPdfVacioAEditar(correoSeleccionado)} // <--- CONEXIÓN AL MODAL
                  />
                </div>
              )}
            </>
          )}

          {pestanaActiva === 'configuracion' && (
            <ConfiguracionCuentas alCompletar={recargarSistemaCompleto} />
          )}
        </main>
      </div>

      <ModalCapturaManual />
      <ModalEnlazar
        isOpen={modalEnlazarAbierto}
        onClose={() => setModalEnlazarAbierto(false)}
        carpeta={carpetaParaEnlazar}
      />

      {/* =========================================================
          NUEVO MODAL DE ÉXITO HERMOSO (Reemplaza al alert de Windows)
          ========================================================= */}
      {modalExito.abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center text-center p-8 border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">¡Importación Exitosa!</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
              Se guardaron <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg mx-1">{modalExito.cantidad}</span> facturas correctamente en tu base de datos y directorio de proveedores.
            </p>
            <button
              onClick={() => setModalExito({ abierto: false, cantidad: 0 })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: RELLENAR DATOS DE PDF HUÉRFANO (NUEVO)
          ========================================================= */}
      {pdfVacioAEditar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-700 relative">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Completar Datos del PDF</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Este correo solo contiene un PDF sin XML. Llena los datos para registrar el gasto en el sistema.
            </p>

            <form onSubmit={guardarCapturaPDFManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wide">Proveedor / Remitente</label>
                <input
                  type="text"
                  name="proveedor"
                  required
                  defaultValue={pdfVacioAEditar.empresa || pdfVacioAEditar.remitente}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
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
                    defaultValue={new Date().toISOString().split('T')[0]} // Fecha de hoy
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPdfVacioAEditar(null)}
                  disabled={importando}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importando}
                  className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition transform ${importando ? 'bg-orange-400 cursor-wait' : 'bg-orange-600 hover:bg-orange-700 hover:-translate-y-0.5'}`}
                >
                  {importando ? 'Guardando...' : 'Guardar Datos Ocultos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}