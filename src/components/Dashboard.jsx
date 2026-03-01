export default function Dashboard({ alCerrarSesion, modoOscuro, toggleTema, irAConfiguracion, irAProveedores, irAClientes, irABoveda, irAImportador, irAlCorreo, irAApps, irAProductos, irAPrecios }) {
  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-7xl mx-auto">

      {/* HEADER SUPERIOR */}
      <header className="animate-fade-in-up flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/40 p-2 rounded-xl">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Centro de Control</h1>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleTema} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition font-medium text-sm">
            {modoOscuro ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-slate-600"></div>
          <button onClick={alCerrarSesion} className="text-sm font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition">
            Salir
          </button>
        </div>
      </header>

      {/* GRID DE MÓDULOS PRINCIPALES */}
      <main className="animate-fade-in-up delay-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">

        {/* 1. CARD: IMPORTADOR (LA NUEVA ESTRELLA) */}
        <div onClick={irAImportador} className="group bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-white/20 p-4 rounded-2xl text-white backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <span className="text-white/70 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Centro de Importación</h3>
          <p className="text-sm text-blue-100 leading-relaxed relative z-10">
            Sube tus archivos XML y PDF. El sistema extraerá los datos, creará proveedores nuevos y organizará todo automáticamente.
          </p>
        </div>

        {/* CARD: PROVEEDORES */}
        <div onClick={irAProveedores} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Directorio Proveedores</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Consulta y administra las razones sociales, RFCs y el histórico de compras agrupadas por empresa.
          </p>
        </div>

        {/* CARD: CLIENTES */}
        <div onClick={irAClientes} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-cyan-50 dark:bg-cyan-900/30 p-4 rounded-2xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Directorio Clientes</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Administra a los clientes a los que les facturas, revisa sus pagos y estados de cuenta históricos.
          </p>
        </div>

        {/* CARD: HISTÓRICO DE FACTURAS */}
        <div onClick={irABoveda} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Bóveda de Facturas</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Explora todos tus comprobantes organizados por mes y año. Busca por folio o filtra por validaciones.
          </p>
        </div>

        {/* TARJETA: BUZÓN DE CORREOS */}
        <div onClick={irAlCorreo} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Buzón Inteligente</h2>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium leading-relaxed">
            Conecta tu correo. El sistema escaneará facturas (XML/PDF), las filtrará y tú decides qué importar a Proveedores o Clientes.
          </p>
        </div>

        {/* CARD: CONFIGURACIÓN */}
        <div onClick={irAConfiguracion} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-orange-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configuración</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Ajusta tu RFC, las rutas de almacenamiento local y tus preferencias de validación del SAT.
          </p>
        </div>

        {/* CARD: CENTRO DE APPS */}
        <div onClick={irAApps} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-pink-50 dark:bg-pink-900/30 p-4 rounded-2xl text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Centro de Apps</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Instala y administra mini-herramientas, utilidades extra y extensiones para potenciar tu sistema.
          </p>
        </div>

        {/* NUEVA CARD: PRODUCTOS E IA */}
        <div onClick={irAProductos} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-2xl text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-teal-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Centro de Productos</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Catálogo maestro y homologación avanzada de productos mediante análisis semántico.
          </p>
        </div>

        {/* OCTAVA CARD: INTELIGENCIA DE PRECIOS */}
        <div onClick={irAPrecios} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Analítica de Precios</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Compara y traza la evolución histórica del costo de tus insumos en el mercado de proveedores.
          </p>
        </div>

      </main>
    </div>
  );
}