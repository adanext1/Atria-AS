import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

export default function Login({ alLoguearse }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Sincronizar tema con la clase global .dark
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      ipcRenderer.send('update-titlebar', { isDark: true });
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      ipcRenderer.send('update-titlebar', { isDark: false });
    }
  };

  useEffect(() => {
    // Si hay un tema guardado en localStorage, respetarlo
    const savedTheme = localStorage.getItem('theme');
    let startingDark = true;
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
      startingDark = true;
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
      startingDark = false;
    } else {
      // Default dark
      document.documentElement.classList.add('dark');
      setIsDark(true);
      startingDark = true;
    }
    ipcRenderer.send('update-titlebar', { isDark: startingDark });
  }, []);

  const manejarLogin = (e) => {
    e.preventDefault();
    if (usuario === 'admin' && password === '1234') {
      alLoguearse();
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden transition-colors duration-700 bg-[#f8fafc] dark:bg-[#020617] font-sans draggable-region">

      {/* Botón flotante para cambiar tema - Movido más abajo para evitar colisión con botones de Windows */}
      <button
        onClick={toggleTheme}
        className="fixed top-14 right-6 z-50 p-3 rounded-2xl bg-black/5 dark:bg-white/10 backdrop-blur-lg border border-black/10 dark:border-white/20 hover:scale-110 transition-all shadow-xl group no-drag"
      >
        <div className="transition-transform group-hover:rotate-12 dark:group-hover:-rotate-12">
          {isDark ? (
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </div>
      </button>

      {/* Orbes flotantes de fondo (Estilo Atria Boost) */}
      <div className="absolute w-[60%] h-[60%] rounded-full blur-[100px] dark:blur-[120px] animate-float-slow bg-blue-400/20 dark:bg-blue-600/10 top-[-10%] left-[-10%] transition-all duration-1000"></div>
      <div className="absolute w-[50%] h-[50%] rounded-full blur-[100px] dark:blur-[110px] animate-float-reverse bg-purple-400/20 dark:bg-indigo-900/10 bottom-[-10%] right-[-10%] transition-all duration-1000"></div>
      <div className="absolute w-[40%] h-[40%] rounded-full blur-[90px] dark:blur-[100px] animate-pulse bg-cyan-300/10 dark:bg-blue-400/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"></div>

      <div className="relative z-10 w-full max-w-lg p-6 animate-fade-in-up">

        {/* Tarjeta Glassmorphic Premium */}
        <div className="backdrop-blur-3xl border rounded-[3rem] p-10 sm:p-14 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 bg-white/70 dark:bg-slate-900/40 border-white/60 dark:border-white/5 relative overflow-hidden group no-drag">

          {/* Brillo dinámico en hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

          <div className="text-center mb-12 relative z-10">
            {/* Logo Box Animado */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] mb-8 shadow-2xl transition-all duration-500 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-cyan-500 shadow-blue-500/30 dark:shadow-blue-600/20 group-hover:scale-110 group-hover:rotate-6">
              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-4 transition-all text-slate-900 dark:text-white group-hover:scale-105 duration-700">
              Atria <span className="text-blue-600 dark:text-blue-500">AS</span>
            </h1>
            <p className="text-md font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 opacity-90">
              Software Administrativo v1.0
            </p>
          </div>

          <form onSubmit={manejarLogin} className="space-y-10 relative z-10">
            <div className="space-y-3 relative group/input">
              <label className="block text-xs font-black uppercase tracking-[0.3em] ml-5 text-slate-500 dark:text-blue-400 group-focus-within/input:text-blue-600 transition-colors">Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-white dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-800 rounded-3xl py-5.5 pl-16 pr-8 outline-none transition-all font-black text-2xl text-slate-800 dark:text-white focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
                  placeholder="admin"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-3 relative group/input">
              <label className="block text-xs font-black uppercase tracking-[0.3em] ml-5 text-slate-500 dark:text-blue-400 group-focus-within/input:text-blue-600 transition-colors">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-white dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-800 rounded-3xl py-5.5 pl-16 pr-8 outline-none transition-all font-black text-2xl text-slate-800 dark:text-white focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="animate-fade-in transition-all bg-red-50 dark:bg-red-500/10 border-2 border-red-100 dark:border-red-500/20 py-4 rounded-2xl">
                <p className="text-red-600 dark:text-red-400 text-sm text-center font-black tracking-wide flex items-center justify-center gap-2">
                  <svg className="w-6 h-6 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              className="group relative w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/30 transition-all transform active:scale-[0.97] text-2xl tracking-widest overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-4">
                ACCEDER
                <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
          </form>

          <div className="mt-14 pt-8 border-t text-center border-slate-200 dark:border-white/5 transition-colors relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">
              © 2026 Atria Business Systems • Todos los derechos reservados
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
