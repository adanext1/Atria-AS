import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function ConfiguracionCuentas({ alCompletar }) {
  const [cuentas, setCuentas] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  
  const [formulario, setFormulario] = useState({ host: 'imap.gmail.com', port: 993, user: '', pass: '' });
  const [estadoCarga, setEstadoCarga] = useState({ probando: false, mensaje: '', tipo: '' });

  const cargarCuentas = async () => {
    const res = await ipcRenderer.invoke('obtener-cuentas-imap');
    setCuentas(res.cuentas);
    setCuentaActiva(res.cuentaActiva);
  };

  useEffect(() => { cargarCuentas(); }, []);

  const handleChange = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const guardarYProbar = async () => {
    if (!formulario.user || !formulario.pass) {
      setEstadoCarga({ probando: false, mensaje: 'Faltan datos.', tipo: 'error' });
      return;
    }
    setEstadoCarga({ probando: true, mensaje: 'Probando conexión con Google...', tipo: '' });
    
    // Probamos si la contraseña es real
    const prueba = await ipcRenderer.invoke('probar-conexion-imap', formulario);
    if (prueba.success) {
      setEstadoCarga({ probando: true, mensaje: '¡Conectado! Guardando en el ERP...', tipo: 'exito' });
      await ipcRenderer.invoke('guardar-cuenta-imap', formulario);
      await cargarCuentas();
      setFormulario({ host: 'imap.gmail.com', port: 993, user: '', pass: '' });
      setEstadoCarga({ probando: false, mensaje: 'Cuenta guardada con éxito.', tipo: 'exito' });
      // Le avisamos al orquestador que recargue
      setTimeout(() => alCompletar(), 1000); 
    } else {
      setEstadoCarga({ probando: false, mensaje: `Error: ${prueba.error}`, tipo: 'error' });
    }
  };

  const cambiarCuenta = async (email) => {
    await ipcRenderer.invoke('cambiar-cuenta-activa', email);
    alCompletar(); // Recarga el sistema principal
  };

  const eliminarCuenta = async (email) => {
    if(window.confirm(`¿Seguro que deseas desenlazar ${email} del ERP?`)) {
      await ipcRenderer.invoke('eliminar-cuenta-imap', email);
      await cargarCuentas();
      if (cuentaActiva?.user === email) alCompletar(); // Si borró la activa, recarga
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 p-4 lg:p-8 overflow-y-auto animate-fade-in-up">
      
      {/* PANEL IZQUIERDO: MIS CUENTAS GUARDADAS */}
      <div className="w-full lg:w-5/12 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Mis Correos Vinculados
          </h2>
          <p className="text-xs text-gray-500 mt-1">Selecciona una cuenta para operar con ella.</p>
        </div>

        {cuentas.length === 0 ? (
          <div className="bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-6 text-center text-sm text-gray-400 italic">No tienes cuentas vinculadas. Agrega una a la derecha.</div>
        ) : (
          <div className="space-y-3">
            {cuentas.map((cta, i) => {
              const esActiva = cuentaActiva?.user === cta.user;
              return (
                <div key={i} className={`p-4 rounded-2xl border transition-all ${esActiva ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 shadow-md' : 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700 hover:shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${esActiva ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
                        {cta.user.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className={`font-black text-sm ${esActiva ? 'text-blue-900 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>{cta.user}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cta.host}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    {!esActiva && (
                      <button onClick={() => cambiarCuenta(cta.user)} className="flex-1 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors">Usar esta cuenta</button>
                    )}
                    {esActiva && (
                      <span className="flex-1 flex items-center justify-center py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs font-black rounded-lg">✓ Cuenta en Uso</span>
                    )}
                    <button onClick={() => eliminarCuenta(cta.user)} className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors">Borrar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PANEL DERECHO: AGREGAR NUEVA CUENTA */}
      <div className="w-full lg:w-7/12 bg-white dark:bg-slate-800 p-6 lg:p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700">
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">Agregar Nueva Cuenta</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Usa tu "Contraseña de Aplicación" para enlazar otro correo de forma segura.</p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Correo Electrónico</label>
              <input type="email" name="user" value={formulario.user} onChange={handleChange} placeholder="ejemplo@gmail.com" className="w-full bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Contraseña (App Password)</label>
              <input type="password" name="pass" value={formulario.pass} onChange={handleChange} placeholder="••••••••••••" className="w-full bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 uppercase">Servidor IMAP (Host)</label>
              <input type="text" name="host" value={formulario.host} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5 uppercase">Puerto</label>
              <input type="number" name="port" value={formulario.port} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1a1f2b] border border-gray-200 dark:border-slate-600 rounded-xl p-2.5 text-sm text-gray-900 dark:text-white outline-none" />
            </div>
          </div>

          {estadoCarga.mensaje && (
            <div className={`p-4 rounded-xl font-medium text-sm flex items-start gap-3 mt-4 ${estadoCarga.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700' : estadoCarga.tipo === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
              {estadoCarga.probando ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (estadoCarga.tipo === 'exito' ? '✅' : '❌')}
              <span>{estadoCarga.mensaje}</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button onClick={guardarYProbar} disabled={estadoCarga.probando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 transform hover:-translate-y-0.5 disabled:transform-none">
              {estadoCarga.probando ? 'Conectando...' : 'Guardar y Vincular'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}