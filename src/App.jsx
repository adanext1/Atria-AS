import { useState } from 'react';
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
import ModuloPrecios from './components/ModuloPrecios'; // <--- IMPORTACIÓN DE PRECIOS

function App() {
  const [estaLogueado, setEstaLogueado] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);

  const [pantallaActual, setPantallaActual] = useState('dashboard');

  // ¡NUEVO! Estado para saber qué proveedor le pasaremos al formulario
  const [proveedorEditando, setProveedorEditando] = useState(null);

  const [proveedorViendo, setProveedorViendo] = useState(null);

  return (
    <div className={`${modoOscuro ? 'dark' : ''} min-h-screen transition-colors duration-300`}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">

        {!estaLogueado ? (
          <Login alLoguearse={() => setEstaLogueado(true)} />
        ) : (
          pantallaActual === 'dashboard' ? (
            <Dashboard
              alCerrarSesion={() => setEstaLogueado(false)} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
              irAConfiguracion={() => setPantallaActual('configuracion')}
              irAProveedores={() => setPantallaActual('proveedores')}
              irABoveda={() => setPantallaActual('boveda')}
              irAImportador={() => setPantallaActual('importador')}
              irAlCorreo={() => setPantallaActual('modulo-correos')}
              irAApps={() => setPantallaActual('centro-apps')}
              irAProductos={() => setPantallaActual('modulo-productos')}
              irAPrecios={() => setPantallaActual('modulo-precios')} // <--- CONEXIÓN DE PRECIOS
            />
          ) : pantallaActual === 'configuracion' ? (
            <Configuracion
              alVolver={() => setPantallaActual('dashboard')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
            />
          ) : pantallaActual === 'proveedores' ? (
            <Proveedores
              alVolver={() => setPantallaActual('dashboard')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
              irANuevoProveedor={() => {
                setProveedorEditando(null);
                setPantallaActual('formulario-proveedor');
              }}
              irAEditarProveedor={(prov) => {
                setProveedorEditando(prov);
                setPantallaActual('formulario-proveedor');
              }}
              irADetalleProveedor={(prov) => {
                setProveedorViendo(prov);
                setPantallaActual('detalle-proveedor');
              }}
            />
          ) : pantallaActual === 'formulario-proveedor' ? (
            <FormularioProveedor
              alVolver={() => setPantallaActual('proveedores')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
              proveedorAEditar={proveedorEditando}
            />
          ) : pantallaActual === 'detalle-proveedor' ? (
            <DetalleProveedor
              alVolver={() => setPantallaActual('proveedores')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
              proveedor={proveedorViendo}
            />
          ) : pantallaActual === 'boveda' ? (
            <BovedaFacturas
              alVolver={() => setPantallaActual('dashboard')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
            />
          ) : pantallaActual === 'importador' ? (
            <Importador
              alVolver={() => setPantallaActual('dashboard')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
              irAProveedores={() => setPantallaActual('proveedores')}
            />
          ) : pantallaActual === 'modulo-correos' ? (
            <ModuloCorreos
              alVolver={() => setPantallaActual('dashboard')} modoOscuro={modoOscuro} toggleTema={() => setModoOscuro(!modoOscuro)}
            />
          ) : pantallaActual === 'centro-apps' ? ( // <--- RENDERIZADO DE LA NUEVA PANTALLA
            <CentroApps
              volverAlDashboard={() => setPantallaActual('dashboard')}
            />
          ) : pantallaActual === 'modulo-productos' ? (
            <ModuloProductos
              volverAlDashboard={() => setPantallaActual('dashboard')}
            />
          ) : pantallaActual === 'modulo-precios' ? ( // <--- RENDERIZADO DEL MÓDULO DE PRECIOS
            <ModuloPrecios
              volverAlDashboard={() => setPantallaActual('dashboard')}
            />
          ) : null
        )}
      </div>

      {/* ESTA ES NUESTRA BARRA FLOTANTE GLOBAL (Nunca desaparece) */}
      {estaLogueado && <BarraApps />}
    </div>
  );
}

export default App;