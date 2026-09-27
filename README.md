# VíaAlerta - Frontend Web

Plataforma web full stack responsiva para la captura georreferenciada y asignación automatizada de incidentes en la infraestructura vial en Lima Metropolitana. Este repositorio contiene el cliente web correspondiente a la primera etapa de desarrollo (APF1), integrando el portal ciudadano de reporte y el panel de autenticación y control para entidades públicas.

---

## 1. Requisitos Previos

Antes de ejecutar el proyecto, asegúrese de contar con:
- **Node.js**: Versión 18.0.0 o superior instalada.
- **npm**: Gestor de paquetes incluido con Node.js (versión 9 o superior).

---

## 2. Instalación y Ejecución Local

Siga estos comandos en la terminal para clonar y levantar el entorno de desarrollo:

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>

# 2. Ingresar al directorio del proyecto
cd full-stack-viaalerta-frontend

# 3. Instalar las dependencias del proyecto
npm install

# 4. Iniciar el servidor de desarrollo local
npm run dev
```

---

## 3. Tecnologías Utilizadas

- **React 18**: Biblioteca de JavaScript para construir interfaces de usuario reactivas basadas en componentes reutilizables.
- **Vite**: Entorno de desarrollo y empaquetador ultrarrápido basado en módulos ECMAScript nativos (ESM).
- **Tailwind CSS v4 (`@tailwindcss/vite`)**: Framework de CSS utilitario para diseño de interfaz rápido y optimizado, acoplado directamente al ciclo de construcción de Vite.
- **React Router DOM v7**: Gestor de navegación para aplicaciones de una sola página (*Single Page Applications - SPA*), permitiendo rutas públicas y privadas sin recarga del navegador.
- **Lucide React**: Colección de iconos vectoriales SVG ligeros integrados como componentes nativos de React.
- **JSON Web Token (JWT) - Arquitectura Mock**: Mecanismo de autenticación sin estado (*stateless*) simulado para validar credenciales y controlar permisos de acceso en el frontend.

---

## 4. Credenciales de Prueba (Entorno de Desarrollo)

Para acceder al panel protegido (`/dashboard`), utilice cualquiera de las siguientes cuentas simuladas:

- **Operador Municipal (MML):**
  - Correo: `operador@mml.gob.pe`
  - Contraseña: `Password123!`
- **Operador Entidad (Sedapal):**
  - Correo: `admin@sedapal.com.pe`
  - Contraseña: `Password123!`

---

## 5. Estructura del Proyecto

A continuación se detalla la organización de carpetas y la responsabilidad de cada archivo del proyecto:

```text
full-stack-viaalerta-frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── CitizenReportPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── LoginPage.jsx
│   ├── routes/
│   │   └── AppRoutes.jsx
│   ├── services/
│   │   └── authServices.jsx
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
└── vite.config.js
```

### 5.1. Carpeta `public/`
Almacena recursos estáticos que se sirven directamente en la raíz del servidor web sin ser procesados por el compilador de Vite.

- **`favicon.svg`**: Icono vectorial representativo de la aplicación mostrado en la pestaña del navegador.
- **`icons.svg`**: Archivo de recursos gráficos vectoriales auxiliares.

---

### 5.2. Carpeta `src/` (Código Fuente)

Contiene la lógica de negocio, componentes, vistas y estilos de la aplicación.

#### Raíz de `src/`
- **`main.jsx`**: Punto de entrada de la aplicación. Renderiza el componente raíz `App` dentro del elemento `#root` del DOM.
- **`App.jsx`**: Componente principal. Envuelve la jerarquía del sistema con el enrutador (`BrowserRouter`) y el proveedor de autenticación global (`AuthProvider`).
- **`index.css`**: Hoja de estilos global. Contiene la directiva `@import "tailwindcss";` para la carga del motor de estilos.
- **`App.css`**: Reglas de estilo complementarias y ajustes específicos de diseño.

#### Subcarpeta `src/components/`
Componentes de interfaz genéricos y reutilizables.

- **`ProtectedRoute.jsx`**: Interceptor o guardián de rutas (*Route Guard*). Evalúa si existe un token JWT activo en la sesión; si el usuario no está autenticado, lo redirige automáticamente a `/login`.

#### Subcarpeta `src/context/`
Manejo del estado global de la aplicación utilizando React Context API.

- **`AuthContext.jsx`**: Proveedor del estado de autenticación. Administra el usuario activo, el token JWT en memoria, las funciones de inicio y cierre de sesión (`login`, `logout`), y la persistencia en `localStorage`.

#### Subcarpeta `src/pages/`
Vistas completas de la aplicación asociadas a rutas de navegación.

- **`CitizenReportPage.jsx`**: Vista pública dirigida al ciudadano para la captura y envío de incidentes viales.
- **`LoginPage.jsx`**: Formulario de autenticación institucional para operadores de entidades públicas, con validación reactiva y control de errores.
- **`DashboardPage.jsx`**: Panel de control operativo privado donde los operadores gestionan los incidentes asignados a su jurisdicción.

#### Subcarpeta `src/routes/`
Configuración centralizada de la navegación.

- **`AppRoutes.jsx`**: Declara las rutas de la aplicación mediante React Router (`/`, `/login`, `/dashboard`), protegiendo las vistas administrativas con `ProtectedRoute`.

#### Subcarpeta `src/services/`
Capa de abstracción de datos y consumo de servicios.

- **`authServices.jsx`**: Servicio simulado de autenticación. Emula la latencia de red, verifica credenciales contra usuarios predefinidos y genera tokens JWT firmados para pruebas locales.

---

### 5.3. Archivos de Configuración (Raíz del Proyecto)

- **`index.html`**: Estructura base HTML que contiene el contenedor `#root` donde se inyecta la aplicación React.
- **`vite.config.js`**: Archivo de configuración del empaquetador Vite. Registra los plugins `@vitejs/plugin-react` y `@tailwindcss/vite`.
- **`package.json`**: Manifiesto del proyecto que define metadatos, comandos ejecutables (`scripts`) y dependencias instaladas.
- **`package-lock.json`**: Registro inmutable de las versiones exactas instaladas en el árbol de dependencias de npm.
- **`eslint.config.js`**: Configuración de ESLint para asegurar buenas prácticas, sintaxis limpia y prevención de errores en código React.
- **`.gitignore`**: Lista de archivos y directorios excluidos del repositorio Git (tales como `node_modules/`, `dist/` o archivos temporales del sistema operativo).
- **`README.md`**: Documentación técnica general del repositorio.
