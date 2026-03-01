import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
const { ipcRenderer } = window.require('electron');

export default function FormularioProveedor({ alVolver, modoOscuro, toggleTema, proveedorAEditar = null }) {
  const esModoEdicion = Boolean(proveedorAEditar);

  const estadoInicial = {
    carpetaDestino: '', // Referencia a la carpeta física original (Evita crear duplicados al renombrar)
    logoPreview: null, logoPath: null,
    nombreComercial: '', razonSocial: '', rfc: '', grupo: '', diasVisita: [],
    tipoPago: 'contado', diasCreditoNeto: '', frecuenciaSemanas: '1', diaPagoFijo: 'Lunes', fechaBase: '', limiteCredito: '',
    // CORREOS GLOBALES (Nuevo)
    correosFacturacion: '', correosPagos: '',
    contactos: [{ id: Date.now(), rol: 'Vendedor / Ejecutivo', nombre: '', telefono: '', correo: '', esWhatsApp: false }],
    cuentasBancarias: [{ id: Date.now(), banco: '', cuenta: '', clabe: '' }],
    notasGenerales: ''
  };

  const [formData, setFormData] = useState(estadoInicial);
  const [gruposExistentes, setGruposExistentes] = useState([]);
  const [mostrarOpcionesGrupo, setMostrarOpcionesGrupo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const opcionesPago = [
    { id: 'contado', icono: '💰', titulo: 'Al Contado', desc: 'Pago inmediato. Factura recibida = Factura por pagar en el momento.' },
    { id: 'neto', icono: '📅', titulo: 'Crédito por Días', desc: 'Se pagan exactamente X días naturales después de emitida la factura.' },
    { id: 'ciclico', icono: '📆', titulo: 'Cíclico / Recurrente', desc: 'Pagos en días específicos (Ej. Cada 2 semanas los días Lunes).' },
    { id: 'variable', icono: '⚖️', titulo: 'Variable (Acumulable)', desc: 'Se juntan varias facturas libres y se pacta el cobro.' }
  ];

  useEffect(() => {
    if (proveedorAEditar) {
      setFormData({
        ...estadoInicial,
        ...proveedorAEditar,
        nombreComercial: proveedorAEditar.nombre || '',
        logoPreview: proveedorAEditar.logo
      });
    }
    ipcRenderer.invoke('obtener-grupos').then(res => setGruposExistentes(res));
  }, [proveedorAEditar]);

  const onDropLogo = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFormData(prev => ({ ...prev, logoFile: file, logoPreview: URL.createObjectURL(file) }));
    }
  };
  const { getRootProps: getLogoProps, getInputProps: getLogoInput, isDragActive: isDragLogo } = useDropzone({
    onDrop: onDropLogo, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }, maxFiles: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'rfc' ? value.toUpperCase() : value });
  };

  const convertirABase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const seleccionarGrupo = (grupo) => { setFormData({ ...formData, grupo }); setMostrarOpcionesGrupo(false); };
  const toggleDiaVisita = (dia) => { setFormData(prev => ({ ...prev, diasVisita: prev.diasVisita.includes(dia) ? prev.diasVisita.filter(d => d !== dia) : [...prev.diasVisita, dia] })); };

  // FUNCIONES DE CONTACTOS Y BANCOS
  const agregarContacto = () => setFormData(prev => ({ ...prev, contactos: [...prev.contactos, { id: Date.now(), rol: 'Otro', nombre: '', telefono: '', correo: '', esWhatsApp: false }] }));
  const actualizarContacto = (id, campo, valor) => setFormData(prev => ({ ...prev, contactos: prev.contactos.map(c => c.id === id ? { ...c, [campo]: valor } : c) }));
  const eliminarContacto = (id) => { if (formData.contactos.length > 1) setFormData(prev => ({ ...prev, contactos: prev.contactos.filter(c => c.id !== id) })); };
  const agregarBanco = () => setFormData(prev => ({ ...prev, cuentasBancarias: [...prev.cuentasBancarias, { id: Date.now(), banco: '', cuenta: '', clabe: '' }] }));
  const actualizarBanco = (id, campo, valor) => setFormData(prev => ({ ...prev, cuentasBancarias: prev.cuentasBancarias.map(b => b.id === id ? { ...b, [campo]: valor } : b) }));
  const eliminarBanco = (id) => { if (formData.cuentasBancarias.length > 1) setFormData(prev => ({ ...prev, cuentasBancarias: prev.cuentasBancarias.filter(b => b.id !== id) })); };

  // =========================================================
  // EL "LIMPIADOR" Y GUARDADO SEGURO
  // =========================================================
  const guardarProveedor = async (e) => {
    e.preventDefault();
    setGuardando(true);

    if (!formData.nombreComercial) {
      alert("El Nombre Comercial es obligatorio."); setGuardando(false); return;
    }

    // CLONAMOS los datos para limpiarlos antes de enviarlos
    let payload = { ...formData, nombre: formData.nombreComercial };

    // LA REGLA DE ORO: Borramos la basura según el tipo de pago elegido
    if (payload.tipoPago === 'contado' || payload.tipoPago === 'variable') {
      payload.diasCreditoNeto = '';
      payload.frecuenciaSemanas = '';
      payload.diaPagoFijo = '';
    } else if (payload.tipoPago === 'neto') {
      payload.frecuenciaSemanas = '';
      payload.diaPagoFijo = '';
    } else if (payload.tipoPago === 'ciclico') {
      payload.diasCreditoNeto = '';
    }

    if (formData.logoFile) {
      payload.logoBase64 = await convertirABase64(formData.logoFile);
      payload.logoExt = formData.logoFile.name.substring(formData.logoFile.name.lastIndexOf('.'));
      delete payload.logoFile;
    }

    const resultado = await ipcRenderer.invoke('guardar-proveedor-manual', payload);

    setGuardando(false);
    if (resultado.success) {
      setMostrarModalExito(true);
    } else {
      alert(`Error al guardar: ${resultado.error}`);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-5xl mx-auto">

      {/* HEADER */}
      <header className="animate-fade-in-up flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative z-20">
        <button type="button" onClick={alVolver} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 font-semibold transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Cancelar
        </button>
        <button type="button" onClick={toggleTema} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">
          {modoOscuro ? '☀️' : '🌙'}
        </button>
      </header>

      {/* TÍTULO DINÁMICO */}
      <div className="animate-fade-in-up delay-100 mb-8 relative z-10">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
          {esModoEdicion ? `Editar: ${formData.nombreComercial}` : 'Alta de Nuevo Proveedor'}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          {esModoEdicion ? 'Añade contactos, bancos o cambia sus plazos de pago.' : 'Configura las reglas exactas para automatizar tus pagos.'}
        </p>
      </div>

      <form onSubmit={guardarProveedor} className="space-y-6 animate-fade-in-up delay-100 relative z-0">

        {/* IDENTIDAD */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:shadow-md">
          <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-6 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Identidad de la Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Logo Comercial</label>
              <div {...getLogoProps()} className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${isDragLogo ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-105' : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800/50'}`}>
                <input {...getLogoInput()} />
                {formData.logoPreview ? (
                  <img src={formData.logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span className="text-sm text-gray-500 font-medium">Clic o arrastra imagen</span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nombre Comercial *</label>
                <input type="text" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange} required placeholder="Ej. Frutabastos La Ramada" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Razón Social</label>
                  <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} placeholder="Ej. Frutabastos SAS de CV." className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">RFC</label>
                  <input type="text" name="rfc" value={formData.rfc} onChange={handleChange} maxLength="13" placeholder="Opcional" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>

              <div className="relative">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 group cursor-help w-max">
                  Grupo / Categoría
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs p-3 rounded-lg shadow-xl z-50">Escribe una nueva categoría o selecciona una existente.</div>
                </label>
                <input type="text" name="grupo" value={formData.grupo} onChange={handleChange} onFocus={() => setMostrarOpcionesGrupo(true)} onBlur={() => setTimeout(() => setMostrarOpcionesGrupo(false), 200)} placeholder="Ej. Abarrotes, Carnes, Lácteos..." className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />

                {mostrarOpcionesGrupo && gruposExistentes.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto">
                    {gruposExistentes.map(grupo => (
                      <div key={grupo} onMouseDown={() => seleccionarGrupo(grupo)} className="px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-gray-700 dark:text-gray-300 cursor-pointer transition-colors">📦 {grupo}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* LOGÍSTICA Y PAGOS */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:shadow-md">
          <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-6 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Reglas de Visita y Plazos de Pago
          </h3>

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Días habituales de visita (Opcional)</label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <button key={dia} type="button" onClick={() => toggleDiaVisita(dia)} className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-300 transform hover:scale-105 ${formData.diasVisita.includes(dia) ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/30' : 'bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-purple-300'}`}>
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gray-100 dark:bg-slate-700"></div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Modalidad del Crédito / Pagos</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {opcionesPago.map(opc => (
                  <div key={opc.id} onClick={() => setFormData({ ...formData, tipoPago: opc.id })} className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-start relative overflow-hidden ${formData.tipoPago === opc.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md transform -translate-y-1' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:border-purple-300'}`}>
                    {formData.tipoPago === opc.id && <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>}
                    <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{opc.icono}</span><h4 className={`font-bold ${formData.tipoPago === opc.id ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-slate-300'}`}>{opc.titulo}</h4></div>
                    <p className={`text-xs ${formData.tipoPago === opc.id ? 'text-purple-600 dark:text-purple-300' : 'text-gray-500 dark:text-slate-400'}`}>{opc.desc}</p>
                  </div>
                ))}
              </div>

              {/* CUADROS DINÁMICOS ANIMADOS */}
              <div className={`overflow-hidden transition-all duration-500 ${formData.tipoPago !== 'contado' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="bg-purple-50 dark:bg-slate-900/80 p-5 rounded-xl border border-purple-100 dark:border-slate-700 shadow-inner">

                  {formData.tipoPago === 'neto' && (
                    <div className="flex items-center gap-3 animate-fade-in">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dar crédito de</span>
                      <input type="number" name="diasCreditoNeto" value={formData.diasCreditoNeto} onChange={handleChange} placeholder="Ej. 15" className="w-24 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-center text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">días naturales.</span>
                    </div>
                  )}

                  {formData.tipoPago === 'ciclico' && (
                    <div className="flex flex-wrap items-center gap-3 animate-fade-in">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pagar cada</span>
                      <select name="frecuenciaSemanas" value={formData.frecuenciaSemanas} onChange={handleChange} className="bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500"><option value="1">1 semana</option><option value="2">2 semanas</option></select>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">los días</span>
                      <select name="diaPagoFijo" value={formData.diaPagoFijo} onChange={handleChange} className="bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500">{diasSemana.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    </div>
                  )}

                  {formData.tipoPago === 'variable' && (
                    <p className="text-sm text-purple-700 dark:text-purple-400 font-medium animate-fade-in">Las facturas se acumularán sin marcarse como "Vencidas" hasta que tú decidas realizar el pago grupal.</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Límite de Crédito Autorizado ($)</label>
              <input type="number" name="limiteCredito" value={formData.limiteCredito} onChange={handleChange} placeholder="Monto máximo permitido (Opcional)" className="w-full md:w-1/2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" />
            </div>
          </div>
        </section>

        {/* CORREOS Y COMUNICACIÓN AUTOMÁTICA */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:shadow-md">
          <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Correos Electrónicos (Para envíos automáticos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Correo para enviar Comprobantes de Pago</label>
              <input type="email" name="correosPagos" value={formData.correosPagos} onChange={handleChange} placeholder="Ej. cobranza@empresa.com" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Correo para solicitar Facturas / REPs</label>
              <input type="email" name="correosFacturacion" value={formData.correosFacturacion} onChange={handleChange} placeholder="Ej. facturacion@empresa.com" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
            </div>
          </div>
        </section>

        {/* DIRECTORIO DE CONTACTOS */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              Directorio de Personal
            </h3>
            <button type="button" onClick={agregarContacto} className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">+ Añadir Persona</button>
          </div>
          <div className="space-y-4">
            {formData.contactos.map((contacto) => (
              <div key={contacto.id} className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 relative animate-fade-in flex flex-col md:flex-row gap-3">
                <select value={contacto.rol} onChange={(e) => actualizarContacto(contacto.id, 'rol', e.target.value)} className="bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none w-full md:w-auto">
                  <option value="Vendedor / Ejecutivo">Ejecutivo de Ventas</option><option value="Cobrador">Cobrador</option><option value="Soporte">Soporte</option><option value="Otro">Otro</option>
                </select>
                <input type="text" placeholder="Nombre completo" value={contacto.nombre} onChange={(e) => actualizarContacto(contacto.id, 'nombre', e.target.value)} className="flex-1 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none" />
                <div className="flex gap-2 w-full md:w-auto">
                  <input type="tel" placeholder="Teléfono" value={contacto.telefono} onChange={(e) => actualizarContacto(contacto.id, 'telefono', e.target.value)} className="w-32 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none" />

                  {/* NUEVO: Checkbox para WhatsApp */}
                  <label className="flex items-center justify-center p-2 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer" title="¿Tiene WhatsApp?">
                    <input type="checkbox" checked={contacto.esWhatsApp} onChange={(e) => actualizarContacto(contacto.id, 'esWhatsApp', e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-gray-300 cursor-pointer" />
                    <svg className={`w-4 h-4 ml-1 ${contacto.esWhatsApp ? 'text-emerald-500' : 'text-gray-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.571-.012c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                  </label>

                  <button type="button" onClick={() => eliminarContacto(contacto.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition" title="Eliminar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BANCOS Y NOTAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
              <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">Cuentas Bancarias</h3>
              <button type="button" onClick={agregarBanco} className="text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition">+ Añadir Cuenta</button>
            </div>
            <div className="space-y-4">
              {formData.cuentasBancarias.map((cuenta) => (
                <div key={cuenta.id} className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-200 dark:border-slate-700 relative">
                  <input type="text" placeholder="Banco (Ej. Banamex)" value={cuenta.banco} onChange={(e) => actualizarBanco(cuenta.id, 'banco', e.target.value)} className="w-full mb-2 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="No. Cuenta" value={cuenta.cuenta} onChange={(e) => actualizarBanco(cuenta.id, 'cuenta', e.target.value)} className="flex-1 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none" />
                    <input type="text" placeholder="CLABE" maxLength="18" value={cuenta.clabe} onChange={(e) => actualizarBanco(cuenta.id, 'clabe', e.target.value)} className="flex-1 bg-white dark:bg-[#1e2433] border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Notas Generales</h3>
            <textarea name="notasGenerales" value={formData.notasGenerales} onChange={handleChange} placeholder="Ej. No reciben pagos después de las 4 PM..." className="w-full flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none resize-none min-h-[120px] focus:border-blue-500"></textarea>
          </section>
        </div>

        <div className="h-40 w-full shrink-0"></div>
      </form>

      {/* BOTÓN INFERIOR */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 p-4 flex justify-center md:justify-end gap-4 z-50">
        <button type="button" onClick={alVolver} className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
        <button type="button" onClick={guardarProveedor} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5 flex items-center gap-2">
          {guardando ? (
            <><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Procesando...</>
          ) : esModoEdicion ? 'Guardar Cambios' : 'Crear Proveedor'}
        </button>
      </div>

      {/* MODAL DE ÉXITO */}
      {mostrarModalExito && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1e2433] rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-700/50 relative transform transition-all flex flex-col items-center text-center animate-bounce-in">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-[pulse_2s_ease-in-out_infinite]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">¡Guardado con Éxito!</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium mb-8">
              {esModoEdicion ? `Los datos de ${formData.nombreComercial} se han actualizado correctamente en la bóveda.` : `El proveedor ${formData.nombreComercial} se ha registrado y su perfil está listo.`}
            </p>
            <button onClick={() => { setMostrarModalExito(false); alVolver(); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition transform hover:-translate-y-0.5">
              Aceptar y Volver
            </button>
          </div>
        </div>
      )}

    </div>
  );
}