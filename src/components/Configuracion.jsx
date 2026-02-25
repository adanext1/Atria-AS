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
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-4xl mx-auto">
      
      {/* HEADER DE NAVEGACIÓN */}
      <header className="animate-fade-in-up flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <button onClick={alVolver} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver al Dashboard
        </button>
        <button onClick={toggleTema} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition text-sm">
          {modoOscuro ? '☀️' : '🌙'}
        </button>
      </header>

      




{/* TARJETA DE SINCRONIZACIÓN DE BÓVEDA */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 mt-6 relative overflow-hidden">
        {/* Adorno visual */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Sincronizar Bóveda
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Utiliza esta herramienta si tienes facturas antiguas en tus carpetas o si moviste archivos manualmente. El sistema leerá todos tus XML y reconstruirá los libros contables, historiales de precios y gráficas desde cero.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <button 
              onClick={ejecutarSincronizacion} 
              disabled={sincronizando}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-500/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className={`mt-3 text-sm font-bold animate-fade-in ${msjSincronizacion.tipo === 'exito' ? 'text-emerald-500' : 'text-red-500'}`}>
                {msjSincronizacion.texto}
              </span>
            )}
          </div>
        </div>
      </div>










      {/* FORMULARIO */}
      <main className="animate-fade-in-up delay-100 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Ajustes del Sistema</h2>

        <form onSubmit={guardarConfiguracion} className="space-y-8">
          
          {/* SECCIÓN 1: ALMACENAMIENTO */}
          <section>
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">📂 Almacenamiento Local</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Carpeta Principal (Bóveda de Facturas)</label>
              <div className="flex gap-3">
                <input 
                  type="text" readOnly value={formData.rutaDestino}
                  placeholder="Ej. C:\Usuarios\Admin\Documentos\Facturas"
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-600 dark:text-slate-400 cursor-not-allowed"
                />
                <button type="button" onClick={seleccionarCarpeta} className="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white px-6 py-3 rounded-lg font-semibold transition">
                  Examinar...
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">Aquí se crearán automáticamente las carpetas por Proveedor/Año/Mes.</p>
            </div>
          </section>

          {/* SECCIÓN 2: DATOS FISCALES (CONSTANCIA) */}
          <section>
            <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">📄 Datos Fiscales (Constancia de Situación Fiscal)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mi RFC</label>
                <input 
                  type="text" name="rfc" value={formData.rfc} onChange={handleChange} maxLength="13"
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                  placeholder="XAXX010101000" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Razón Social / Nombre Completo</label>
                <input 
                  type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Juan Pérez Domínguez" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Código Postal Fiscal</label>
                <input 
                  type="text" name="cp" value={formData.cp} onChange={handleChange} maxLength="5"
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="00000" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Régimen Fiscal (Clave SAT)</label>
                <select 
                  name="regimen" value={formData.regimen} onChange={handleChange}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
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
          <div className="pt-4 flex items-center gap-4">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition transform hover:-translate-y-0.5">
              Guardar Cambios
            </button>
            {guardado && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
                ✅ ¡Configuración guardada exitosamente!
              </span>
            )}
          </div>

        </form>
      </main>

      
    </div>
  );
}