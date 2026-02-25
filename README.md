# 🏢 Atria AS (Administrative System)


> 🚧 **ESTADO DEL PROYECTO: EN DESARROLLO ACTIVO (FASE ALPHA)** 🚧
**Atria AS** es un sistema integral de administración, tesorería y control fiscal de escritorio, diseñado bajo una arquitectura *Offline-First*. Su objetivo principal es devolverle el control y la privacidad a las empresas sobre su información financiera, procesando todo localmente sin dependencias de la nube.

## ✨ Características Principales

* 🔒 **100% Local y Privado:** Toda la base de datos (basada en un sistema de archivos JSON de alta velocidad) y el procesamiento ocurren en el disco duro del usuario.
* 📄 **Motor de Procesamiento Fiscal:** Lectura automatizada de archivos XML y PDF. Extracción instantánea de UUIDs, PUE/PPD, desglose de impuestos (IVA, IEPS) y prevención de facturas duplicadas.
* 🧠 **Inteligencia Artificial Integrada:** Incorpora un motor de PLN (Procesamiento de Lenguaje Natural) ejecutado en local mediante `Transformers.js`. Realiza clustering semántico para detectar, agrupar y homologar productos de diferentes proveedores que no cuentan con código de barras.
* 📥 **Buzón Inteligente IMAP:** Sincronización directa con servidores de correo para la descarga automatizada y categorización de comprobantes fiscales.
* 💰 **Tesorería y Cuentas por Pagar:** Gestión de perfiles de proveedores, historial de deudas, abonos y vinculación automática de Notas de Crédito y Recibos Electrónicos de Pago (REP).

## 🛠️ Stack Tecnológico
* **Frontend:** React + Tailwind CSS (Diseño modular e interfaces fluidas).
* **Backend:** Node.js integrado en Electron (`main.cjs`).
* **Base de Datos:** Local File System (`fs-extra`) para máxima portabilidad.
* **Motor IA:** `@xenova/transformers` (Modelo multilingüe MiniLM-L12-v2 en RAM).

## 🗺️ Próximos Pasos (Roadmap) y Tareas Pendientes

El núcleo del sistema (Parseo de XML y clustering con IA) está operativo, pero sigo trabajando en las siguientes implementaciones:

* [ ] **Depuración Continua:** Identificación y corrección de bugs en el manejo de estado de React.
* [ ] **Filtros Avanzados de IA:** Crear una "Lista Blanca" para excluir a proveedores monopólicos de las comparativas de precios.
* [ ] **Auditoría Manual:** Activar la expulsión manual de productos intrusos en los grupos semánticos detectados por la IA.
* [ ] **Analítica Visual:** Construcción del módulo de gráficas para comparar los precios históricos de las materias primas.

---
*Desarrollado para optimizar y automatizar el flujo contable y administrativo.*