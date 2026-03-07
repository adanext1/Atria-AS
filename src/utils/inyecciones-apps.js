// src/utils/inyecciones-apps.js

// Este archivo contiene los scripts en texto plano que inyectaremos en los webviews.

export const inyeccionesPorApp = {
   // WhatsApp ("wa" es el idBase definido en BarraApps.jsx)
   wa: {
      // 1. Script para limpiar inyecciones previas (cuando el usuario APAGA el modo Boost)
      apagar: `
      (function() {
        console.log("ERP: Desactivando Modo Boost de WhatsApp...");
        
        // 1. Eliminar nuestro botón falso si existe
        const botonERP = document.getElementById('erp-wa-btn');
        if (botonERP) botonERP.remove();
        
        // 2. Eliminar nuestros estilos inyectados
        const estiloERP = document.getElementById('erp-wa-styles');
        if (estiloERP) estiloERP.remove();
        
        // 3. Detener cualquier bucle de lectura que hayamos dejado
        if (window.erpInterval) {
          clearInterval(window.erpInterval);
          window.erpInterval = null;
        }
      })();
    `,

      // 2. Script principal del "Modo Boost" (encender)
      // 2. Script principal del "Modo Boost" dinámico (recibe la data como un array en formato string)
      encender: (proveedoresStr = "[]") => `
      (function() {
        console.log("ERP: Activando Modo Boost de WhatsApp!");
        const proveedoresERP = ${proveedoresStr};

        if (!document.getElementById('erp-wa-styles')) {
          const style = document.createElement('style');
          style.id = 'erp-wa-styles';
          style.textContent = \`
            .erp-badge-container { display: flex; gap: 4px; margin-left: 8px; align-items: center; }
            .erp-badge { border-radius: 3px; padding: 2px 5px; font-size: 10px; font-weight: 500; font-family: inherit; line-height: 1; cursor: default; }
            .erp-type-prov { background: rgba(0, 168, 132, 0.15); color: #00a884; }
            .erp-type-cli { background: rgba(83, 189, 235, 0.15); color: #53bdeb; }
            .erp-debt-bad { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .erp-debt-good { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .erp-visit { background: rgba(134, 150, 160, 0.15); color: #8696a0; }
            @keyframes erp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            .erp-visit-today { animation: erp-blink 3s infinite; background: rgba(59, 130, 246, 0.2); color: #3b82f6; font-weight: bold; border: 1px solid rgba(59, 130, 246, 0.3); }
          \`;
          document.head.appendChild(style);
        }

        let intentosExtras = 0;
        const inyectarUI = setInterval(() => {
          intentosExtras++;
          
          if (!document.getElementById('erp-wa-btn')) {
            // Ubicamos el menú principal izquierdo buscando botones clave
            const botones = Array.from(document.querySelectorAll('div[role="button"]'));
            const botonNuevaEtiqueta = botones.find(b => b.querySelector('[data-icon="new-chat-outline"]') || b.querySelector('path')); 
            
            let contenedorTitulo = null;

            // WhatsApp usa SVG para su título en versiones nuevas.
            const iconWhatsApp = document.querySelector('[aria-label="WhatsApp"]');
            
            if (iconWhatsApp) {
               let actual = iconWhatsApp;
               while(actual && actual !== document.body) {
                  const estilos = window.getComputedStyle(actual);
                  if(estilos.display === 'flex' && estilos.flexDirection === 'row') {
                     contenedorTitulo = actual;
                     break;
                  }
                  actual = actual.parentNode;
               }
               if (!contenedorTitulo) contenedorTitulo = iconWhatsApp.parentNode;
            }

            if (!contenedorTitulo) {
               const headers = document.querySelectorAll('header');
               contenedorTitulo = headers.length > 1 ? headers[1] : headers[0];
            }

            if (contenedorTitulo) {
               const miBoton = document.createElement('div');
               miBoton.id = 'erp-wa-btn';
               miBoton.innerHTML = '<span style="background: linear-gradient(90deg, #ff007f, #7f00ff); color:white; padding:4px 12px; border-radius:12px; font-weight:900; font-size:11px; font-family: sans-serif; cursor:pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-transform: uppercase; letter-spacing: 0.5px;" title="Conectado al ERP Atria">✨ Atria Mejorado</span>';
               
               miBoton.style.display = 'inline-flex';
               miBoton.style.alignItems = 'center';
               miBoton.style.marginLeft = '12px'; 
               miBoton.style.marginRight = 'auto'; 
               miBoton.style.zIndex = '9999';
               
               miBoton.onclick = () => { alert('¡Integración WhatsApp ↔ Atria ERP conectada! Proveedores sincronizados: ' + proveedoresERP.length); };

               if(window.getComputedStyle(contenedorTitulo).display !== 'flex'){
                  contenedorTitulo.style.display = 'flex';
                  contenedorTitulo.style.alignItems = 'center';
               }

               if (contenedorTitulo.children.length > 0) {
                  contenedorTitulo.insertBefore(miBoton, contenedorTitulo.children[1] || contenedorTitulo.firstChild);
               } else {
                  contenedorTitulo.appendChild(miBoton);
               }

               clearInterval(inyectarUI);
            }
          }

          if (intentosExtras > 20) clearInterval(inyectarUI);
        }, 1000);

        // MOTOR DE ESCANEO: Cruza la UI con la BDD del ERP
        if (!window.erpInterval) {
           window.erpInterval = setInterval(() => {
              // Buscar todos los spans que tengan atributo 'title'
              const chatTitles = Array.from(document.querySelectorAll('span[title]'));
              const headerSpans = Array.from(document.querySelectorAll('#main header span[dir="auto"]'));
              
              [...chatTitles, ...headerSpans].forEach(span => {
                 // Evitar iterar sobre chats ya analizados o el mismo span multiple veces
                 if (span.hasAttribute('data-erp-scanned')) return;
                 // Ignorar nuestro propio botón
                 if (span.className === 'erp-supplier-badge') return;
                 
                 const nombreChat = span.getAttribute('title') || span.textContent;
                 if (!nombreChat) return;

                 const normChat = nombreChat.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();

                 // Buscar el proveedor
                 const match = proveedoresERP.find(p => {
                    if (!p.nombre) return false;
                    const fn = p.nombre.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
                    // Búsqueda estricta (exacta) en lugar de '.includes()' para evitar falsos positivos
                    // (ej. que "Alejandro" machee con cualquier contacto llamado Alejandro)
                    return fn === normChat;
                 });

                 if (match) {
                    span.setAttribute('data-erp-scanned', 'true');
                    
                    // Asegurar que no metamos duplicados si Whatsapp recicla el DOM
                    // Buscamos si ya existe el contenedor de nuestros badges
                    if (!span.parentNode.querySelector('.erp-badge-container') && !span.parentNode.querySelector('.erp-supplier-badge')) {
                       // Hacemos el contenedor flex para poder forzar el layout
                       const wrap = span.parentNode;
                       wrap.style.display = 'flex';
                       wrap.style.alignItems = 'center';
                       wrap.style.overflow = 'visible';
                       
                       const container = document.createElement('div');
                       container.className = 'erp-badge-container';
                       
                       // 1. Badge de Tipo (Proveedor / Cliente)
                       const typeBadge = document.createElement('span');
                       // Por defecto si no dice cliente, asumimos proveedor
                       const isProveedor = match.tipo !== 'Cliente';
                       typeBadge.className = \`erp-badge \${isProveedor ? 'erp-type-prov' : 'erp-type-cli'}\`;
                       typeBadge.textContent = isProveedor ? '🏢 Prov' : '👤 Cli';
                       typeBadge.title = 'Sincronizado con Atria ERP: ' + match.nombre;
                       container.appendChild(typeBadge);
                       
                       // 2. Badge de Deuda (Monto)
                       if (match.deudaActual !== undefined) {
                          const tieneDeuda = Number(match.deudaActual) > 0;
                          // A los clientes tal vez no aplique la alerta visual verde de "Sin Deuda" si solo nos interesan los cobros
                          if (tieneDeuda || isProveedor) { 
                             const debtBadge = document.createElement('span');
                             debtBadge.className = \`erp-badge \${tieneDeuda ? 'erp-debt-bad' : 'erp-debt-good'}\`;
                             debtBadge.textContent = tieneDeuda ? \`$-\${Math.floor(Number(match.deudaActual))}\` : '✅ Al día';
                             debtBadge.title = tieneDeuda ? 'Saldo pendiente según ERP' : 'Sin saldo pendiente';
                             container.appendChild(debtBadge);
                          }
                       }
                       
                       // 3. Badge de Visitas
                       if (match.diasVisita && match.diasVisita.trim() !== '') {
                          const visitBadge = document.createElement('span');
                          
                          // Lógica para detectar si la visita es HOY
                          const diasAbrevMap = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
                          const hoyStr = diasAbrevMap[new Date().getDay()];
                          const visitaNorm = match.diasVisita.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
                          const esHoy = visitaNorm.includes(hoyStr.toLowerCase());
                          
                          if (esHoy) {
                             visitBadge.className = 'erp-badge erp-visit-today';
                             visitBadge.textContent = '📍 HOY';
                          } else {
                             visitBadge.className = 'erp-badge erp-visit';
                             // Extrae solo los primeros 3 caracteres del primer dia
                             const primerDia = match.diasVisita.split(',')[0].trim().substring(0,3);
                             visitBadge.textContent = \`📍 \${primerDia}\`;
                          }
                          
                          visitBadge.title = 'Días de visita marcados en el ERP: ' + match.diasVisita;
                          container.appendChild(visitBadge);
                       }
                       
                       // 4. Botón de Tiendita POS
                       if (isProveedor) {
                           const cartBtn = document.createElement('button');
                           cartBtn.className = 'erp-badge';
                           cartBtn.style.cssText = 'background: #00a884; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-left: 2px; padding: 2px 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
                           cartBtn.innerHTML = '🛒 POS';
                           cartBtn.title = 'Abrir Tiendita Atria';
                           cartBtn.onclick = (e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               console.log('ATRIA_POS_OPEN||' + JSON.stringify(match));
                           };
                           container.appendChild(cartBtn);
                       }
                       
                       // Insertamos la etiqueta al lado del nombre
                       if (span.nextSibling) {
                          wrap.insertBefore(container, span.nextSibling);
                       } else {
                          wrap.appendChild(container);
                       }
                    }
                 } else {
                    // Marcar como escaneado pero sin resultados
                    span.setAttribute('data-erp-scanned', 'failed');
                 }
              });
           }, 2500); // 2.5 segs
        }

      })();
    `
   }
};
