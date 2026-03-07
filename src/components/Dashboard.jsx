export default function Dashboard({ alCerrarSesion, modoOscuro, toggleTema, irAConfiguracion, irAProveedores, irAClientes, irABoveda, irAImportador, irAlCorreo, irAApps, irAProductos, irAPrecios }) {
  return (
    <div className="min-h-screen p-4 md:p-8 font-sans max-w-[1800px] mx-auto relative overflow-x-hidden">

      {/* Elementos decorativos de fondo (Glassmorphism orbs) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 fixed">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float-reverse delay-1000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float-slow delay-2000"></div>
      </div>

      {/* GRID DE MÓDULOS PRINCIPALES */}
      <main className="animate-fade-in-up delay-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 relative z-10">

        {/* 1. CARD: IMPORTADOR (LA NUEVA ESTRELLA) */}
        <div onClick={irAImportador} className="group bg-gradient-to-br from-blue-600/90 to-indigo-700/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-6 rounded-3xl shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.6)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors duration-500"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-white/20 p-4 rounded-xl text-white backdrop-blur-md group-hover:scale-110 shadow-lg shadow-black/5 transition-transform duration-300 border border-white/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <span className="text-white/70 group-hover:text-white transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Centro de Importación</h3>
          <p className="text-sm text-blue-50 leading-relaxed relative z-10 drop-shadow-sm">
            Sube tus archivos XML y PDF. El sistema extraerá los datos, creará proveedores nuevos y organizará todo automáticamente.
          </p>
        </div>

        {/* CARD: PROVEEDORES */}
        <div onClick={irAProveedores} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-all duration-300 shadow-sm border border-purple-100/50 dark:border-purple-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Directorio Proveedores</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Consulta y administra las razones sociales, RFCs y el histórico de compras agrupadas por empresa.
          </p>
        </div>

        {/* CARD: CLIENTES */}
        <div onClick={irAClientes} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-cyan-50 dark:bg-cyan-500/10 p-4 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20 transition-all duration-300 shadow-sm border border-cyan-100/50 dark:border-cyan-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Directorio Clientes</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Administra a los clientes a los que les facturas, revisa sus pagos y estados de cuenta históricos.
          </p>
        </div>

        {/* CARD: HISTÓRICO DE FACTURAS */}
        <div onClick={irABoveda} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-all duration-300 shadow-sm border border-emerald-100/50 dark:border-emerald-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Bóveda de Facturas</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Explora todos tus comprobantes organizados por mes y año. Busca por folio o filtra por validaciones.
          </p>
        </div>

        {/* TARJETA: BUZÓN DE CORREOS */}
        <div onClick={irAlCorreo} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-all duration-300 shadow-sm border border-blue-100/50 dark:border-blue-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Buzón Inteligente</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Conecta tu correo. El sistema escaneará facturas (XML/PDF), las filtrará y tú decides qué importar a Proveedores o Clientes.
          </p>
        </div>

        {/* CARD: CONFIGURACIÓN */}
        <div onClick={irAConfiguracion} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-110 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-all duration-300 shadow-sm border border-orange-100/50 dark:border-orange-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-orange-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Configuración</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Ajusta tu RFC, las rutas de almacenamiento local y tus preferencias de validación del SAT.
          </p>
        </div>

        {/* CARD: CENTRO DE APPS */}
        <div onClick={irAApps} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-pink-50 dark:bg-pink-500/10 p-4 rounded-xl text-pink-600 dark:text-pink-400 group-hover:scale-110 group-hover:bg-pink-100 dark:group-hover:bg-pink-500/20 transition-all duration-300 shadow-sm border border-pink-100/50 dark:border-pink-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-pink-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Centro de Apps</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Instala y administra mini-herramientas, utilidades extra y extensiones para potenciar tu sistema.
          </p>
        </div>

        {/* NUEVA CARD: PRODUCTOS E IA */}
        <div onClick={irAProductos} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-teal-50 dark:bg-teal-500/10 p-4 rounded-xl text-teal-600 dark:text-teal-400 group-hover:scale-110 group-hover:bg-teal-100 dark:group-hover:bg-teal-500/20 transition-all duration-300 shadow-sm border border-teal-100/50 dark:border-teal-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-teal-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Centro de Productos</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Catálogo maestro y homologación avanzada de productos mediante análisis semántico.
          </p>
        </div>

        {/* OCTAVA CARD: INTELIGENCIA DE PRECIOS */}
        <div onClick={irAPrecios} className="group bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all duration-300 shadow-sm border border-indigo-100/50 dark:border-indigo-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
            </div>
            <span className="text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors">
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 relative z-10">Analítica de Precios</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed relative z-10">
            Compara y traza la evolución histórica del costo de tus insumos en el mercado de proveedores.
          </p>
        </div>

      </main>
    </div>
  );
}