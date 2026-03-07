import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');



export default function Configuracion({ alVolver, modoOscuro, toggleTema }) {
  const [formData, setFormData] = useState({
    rfc: '', razonSocial: '', cp: '', regimen: '', rutaDestino: ''
  });
  const [guardado, setGuardado] = useState(false);

  // Cargar datos al abrir la pantalla
  useEffect(() => {
    ipcRenderer.invoke('get-config').then((data) => setFormData(data));
  }, []);

  const handleChange = (e) => {
    // Forzamos el RFC a mayúsculas siempre
    const value = e.target.name === 'rfc' ? e.target.value.toUpperCase() : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const seleccionarCarpeta = async () => {
    const ruta = await ipcRenderer.invoke('select-folder');
    if (ruta) setFormData({ ...formData, rutaDestino: ruta });
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    await ipcRenderer.invoke('save-config', formData);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000); // Quita el mensaje a los 3 seg
  };

  const { ipcRenderer } = window.require('electron'); // Asegúrate de tener esto importado
  const [sincronizando, setSincronizando] = useState(false);
  const [msjSincronizacion, setMsjSincronizacion] = useState(null);

  const ejecutarSincronizacion = async () => {
    setSincronizando(true);
    setMsjSincronizacion(null);

    const resultado = await ipcRenderer.invoke('sincronizar-boveda');

    if (resultado.success) {
      setMsjSincronizacion({ tipo: 'exito', texto: `¡Bóveda actualizada! Se procesaron ${resultado.cantidad} facturas.` });
    } else {
      setMsjSincronizacion({ tipo: 'error', texto: `Hubo un error: ${resultado.error}` });
    }
    setSincronizando(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-4xl mx-auto relative overflow-hidden">
      {/* ORBES GLASS DE FONDO */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-pink-400/10 dark:bg-pink-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float-reverse delay-1000"></div>
      </div>

      {/* HEADER DE NAVEGACIÓN COMPATIBLE CON GLASSMORPHISM (Solo si no usa NavegacionGlobal) */}
      <header className="relative z-10 animate-fade-in-up flex justify-between items-center mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/50 dark:border-slate-700/50 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <button onClick={alVolver} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-bold transition">
          <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-xl transition-transform shadow-sm">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </div>
          Volver al Dashboard
        </button>
        <button onClick={toggleTema} className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-700/60 text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-slate-600 transition shadow-inner">
          {modoOscuro ? '☀️' : '🌙'}
        </button>
      </header>






      {/* TARJETA DE SINCRONIZACIÓN DE BÓVEDA (GLASS) */}
      <div className="relative z-10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/50 dark:border-slate-700/50 mt-6 overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        {/* Adorno visual */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 p-2 rounded-xl shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </span>
              Sincronizar Bóveda
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-300 max-w-xl leading-relaxed mt-3">
              Utiliza esta herramienta si tienes facturas antiguas en tus carpetas o si moviste archivos manualmente. El sistema leerá todos tus XML y reconstruirá los libros contables, historiales de precios y gráficas desde cero.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <button
              onClick={ejecutarSincronizacion}
              disabled={sincronizando}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
            >
              {sincronizando ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Escaneando Archivos...
                </>
              ) : (
                'Ejecutar Sincronización'
              )}
            </button>

            {msjSincronizacion && (
              <span className={`mt-3 px-3 py-1.5 rounded-lg text-sm font-bold animate-fade-in backdrop-blur-md shadow-inner border border-white/20 ${msjSincronizacion.tipo === 'exito' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                {msjSincronizacion.texto}
              </span>
            )}
          </div>
        </div>
      </div>










      {/* FORMULARIO */}
      <main className="relative z-10 animate-fade-in-up delay-100 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/50 dark:border-slate-700/50 mt-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6">Ajustes del Sistema</h2>

        <form onSubmit={guardarConfiguracion} className="space-y-8 relative">

          {/* SECCIÓN 1: ALMACENAMIENTO */}
          <section>
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4 border-b border-white/50 dark:border-slate-700/50 pb-3 flex items-center gap-2">📂 Almacenamiento Local</h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Carpeta Principal (Bóveda de Facturas)</label>
              <div className="flex gap-3">
                <input
                  type="text" readOnly value={formData.rutaDestino}
                  placeholder="Ej. C:\Usuarios\Admin\Documentos\Facturas"
                  className="flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/60 dark:border-slate-600/50 rounded-xl p-3.5 text-gray-600 dark:text-slate-400 cursor-not-allowed shadow-inner"
                />
                <button type="button" onClick={seleccionarCarpeta} className="bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 text-gray-800 dark:text-white px-6 py-3.5 rounded-xl font-bold transition shadow-sm border border-white dark:border-slate-600">
                  Examinar...
                </button>
              </div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mt-2 uppercase tracking-wide">Aquí se crearán automáticamente las carpetas por Proveedor/Año/Mes.</p>
            </div>
          </section>

          {/* SECCIÓN 2: DATOS FISCALES (CONSTANCIA) */}
          <section>
            <h3 className="text-lg font-bold text-pink-600 dark:text-pink-400 mb-4 border-b border-white/50 dark:border-slate-700/50 pb-3 flex items-center gap-2">📄 Datos Fiscales (Constancia de Situación Fiscal)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Mi RFC</label>
                <input
                  type="text" name="rfc" value={formData.rfc} onChange={handleChange} maxLength="13"
                  className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/60 dark:border-slate-600/50 rounded-xl p-3.5 text-gray-900 dark:text-white focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none uppercase shadow-inner transition-all font-semibold"
                  placeholder="XAXX010101000" required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Razón Social / Nombre Completo</label>
                <input
                  type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange}
                  className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/60 dark:border-slate-600/50 rounded-xl p-3.5 text-gray-900 dark:text-white focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none shadow-inner transition-all font-semibold"
                  placeholder="Juan Pérez Domínguez" required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Código Postal Fiscal</label>
                <input
                  type="text" name="cp" value={formData.cp} onChange={handleChange} maxLength="5"
                  className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/60 dark:border-slate-600/50 rounded-xl p-3.5 text-gray-900 dark:text-white focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none shadow-inner transition-all font-semibold"
                  placeholder="00000" required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Régimen Fiscal (Clave SAT)</label>
                <select
                  name="regimen" value={formData.regimen} onChange={handleChange}
                  className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/60 dark:border-slate-600/50 rounded-xl p-3.5 text-gray-900 dark:text-white focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none shadow-inner transition-all font-semibold appearance-none"
                >
                  <option value="">Selecciona tu Régimen...</option>
                  <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                </select>
              </div>
            </div>
          </section>



          {/* BOTÓN DE GUARDAR Y MENSAJE */}
          <div className="pt-6 flex items-center justify-between gap-4 mt-4 border-t border-white/50 dark:border-slate-700/50">
            {guardado && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl backdrop-blur-md border border-emerald-500/20 animate-fade-in flex items-center gap-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ¡Configuración guardada exitosamente!
              </span>
            )}
            <button type="submit" className="ml-auto bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-pink-500/30 transition-all transform hover:-translate-y-0.5">
              Guardar Ajustes
            </button>
          </div>

        </form>
      </main>


    </div>
  );
}