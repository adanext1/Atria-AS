import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Configuracion from './components/Configuracion';
import Proveedores from './components/Proveedores';
import FormularioProveedor from './components/FormularioProveedor';
import DetalleProveedor from './components/DetalleProveedor';
import BovedaFacturas from './components/BovedaFacturas';
import Importador from './components/Importador';
import ModuloCorreos from './components/BuzonInteligente/index';
import CentroApps from './components/CentroApps';
import BarraApps from './components/BarraApps';
import ModuloProductos from './components/ModuloProductos';
import ModuloPrecios from './components/ModuloPrecios';
import Clientes from './components/Clientes';
import DetalleCliente from './components/DetalleCliente';
import NavegacionGlobal from './components/NavegacionGlobal'; // <--- IMPORTACIÓN DE NAVBAR GLOBAL

function App() {
  const [estaLogueado, setEstaLogueado] = useState(false);

  // El control del modoOscuro ya es manejado globalmente por Login para el theme. Aquí lo leeremos del documento para el estado de App
  const [modoOscuro, setModoOscuro] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const [modoRendimiento, setModoRendimiento] = useState(() => {
    return localStorage.getItem('modo-rendimiento') === 'true';
  });

  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [proveedorViendo, setProveedorViendo] = useState(null);

  // Unificamos el manejo del tema para sincronizar el estado reactivo
  const toggleTema = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setModoOscuro(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setModoOscuro(true);
    }
  };

  // Escuchar si hay cambios de tema desde fuera de app
  useEffect(() => {
    const checkTema = setInterval(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark !== modoOscuro) setModoOscuro(isDark);
    }, 500);
    return () => clearInterval(checkTema);
  }, [modoOscuro]);

  const toggleRendimiento = () => {
    const nuevoModo = !modoRendimiento;
    setModoRendimiento(nuevoModo);
    localStorage.setItem('modo-rendimiento', nuevoModo);
  };

  useEffect(() => {
    if (modoRendimiento) {
      document.body.classList.add('modo-rendimiento');
    } else {
      document.body.classList.remove('modo-rendimiento');
    }
  }, [modoRendimiento]);


  const cambiarPantalla = (nuevaPantalla) => {
    setPantallaActual(nuevaPantalla);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir arriba siempre al cambiar
  };

  return (
    <div className={`${modoOscuro ? 'dark' : ''} min-h-screen transition-colors duration-300`}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 relative">

        {!estaLogueado ? (
          <Login alLoguearse={() => setEstaLogueado(true)} />
        ) : (
          <>
            <NavegacionGlobal
              pantallaActual={pantallaActual}
              cambiarPantalla={cambiarPantalla}
              modoOscuro={modoOscuro}
              toggleTema={toggleTema}
              modoRendimiento={modoRendimiento}
              toggleRendimiento={toggleRendimiento}
              alCerrarSesion={() => setEstaLogueado(false)}
            />
            {/* INICIA CONDICIONAL DE PANTALLAS */}
            {pantallaActual === 'dashboard' ? (
              <Dashboard
                alCerrarSesion={() => setEstaLogueado(false)} modoOscuro={modoOscuro} toggleTema={toggleTema}
                irAConfiguracion={() => cambiarPantalla('configuracion')}
                irAProveedores={() => cambiarPantalla('proveedores')}
                irAClientes={() => cambiarPantalla('clientes')}
                irABoveda={() => cambiarPantalla('boveda')}
                irAImportador={() => cambiarPantalla('importador')}
                irAlCorreo={() => cambiarPantalla('modulo-correos')}
                irAApps={() => cambiarPantalla('centro-apps')}
                irAProductos={() => cambiarPantalla('modulo-productos')}
                irAPrecios={() => cambiarPantalla('modulo-precios')}
              />
            ) : pantallaActual === 'configuracion' ? (
              <Configuracion
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
              />
            ) : pantallaActual === 'proveedores' ? (
              <Proveedores
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                irANuevoProveedor={() => {
                  setProveedorEditando(null);
                  cambiarPantalla('formulario-proveedor');
                }}
                irAEditarProveedor={(prov) => {
                  setProveedorEditando(prov);
                  cambiarPantalla('formulario-proveedor');
                }}
                irADetalleProveedor={(prov) => {
                  setProveedorViendo(prov);
                  cambiarPantalla('detalle-proveedor');
                }}
              />
            ) : pantallaActual === 'formulario-proveedor' ? (
              <FormularioProveedor
                alVolver={() => cambiarPantalla('proveedores')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                proveedorAEditar={proveedorEditando}
              />
            ) : pantallaActual === 'detalle-proveedor' ? (
              <DetalleProveedor
                alVolver={() => cambiarPantalla('proveedores')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                proveedor={proveedorViendo}
              />
            ) : pantallaActual === 'clientes' ? (
              <Clientes
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                irADetalleCliente={(cli) => {
                  setProveedorViendo(cli);
                  cambiarPantalla('detalle-cliente');
                }}
              />
            ) : pantallaActual === 'detalle-cliente' ? (
              <DetalleCliente
                alVolver={() => cambiarPantalla('clientes')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                cliente={proveedorViendo}
              />
            ) : pantallaActual === 'boveda' ? (
              <BovedaFacturas
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
              />
            ) : pantallaActual === 'importador' ? (
              <Importador
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
                irAProveedores={() => cambiarPantalla('proveedores')}
                irAClientes={() => cambiarPantalla('clientes')}
              />
            ) : pantallaActual === 'modulo-correos' ? (
              <ModuloCorreos
                alVolver={() => cambiarPantalla('dashboard')} modoOscuro={modoOscuro} toggleTema={toggleTema}
              />
            ) : pantallaActual === 'centro-apps' ? (
              <CentroApps
                volverAlDashboard={() => cambiarPantalla('dashboard')}
              />
            ) : pantallaActual === 'modulo-productos' ? (
              <ModuloProductos
                volverAlDashboard={() => cambiarPantalla('dashboard')}
              />
            ) : pantallaActual === 'modulo-precios' ? (
              <ModuloPrecios
                volverAlDashboard={() => cambiarPantalla('dashboard')}
              />
            ) : null}
          </>
        )}
      </div>

      {estaLogueado && <BarraApps />}
    </div>
  );
}

export default App;