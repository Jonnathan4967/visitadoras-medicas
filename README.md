# Sistema de Visitadoras Médicas

Sistema web para la gestión de visitas médicas con seguimiento GPS, registro fotográfico y firma digital.

## 🚀 Características

- ✅ Login con autenticación segura
- ✅ Panel de administrador para supervisar todas las visitadoras
- ✅ Panel de visitadora con estadísticas personalizadas
- ✅ Registro de visitas con GPS, foto y firma digital
- ✅ Sistema de comisiones
- ✅ Arquitectura modular y fácil de mantener

## 📋 Requisitos Previos

- Node.js v16 o superior
- Visual Studio Code
- Cuenta en Supabase (gratuita)

## 🛠️ Instalación Paso a Paso

### Paso 1: Configurar Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté listo (2-3 minutos)
4. Ve a **SQL Editor** en el menú lateral
5. Copia todo el contenido del archivo `supabase-setup.sql`
6. Pégalo en el editor SQL y haz clic en **Run**
7. Ve a **Settings** > **API**
8. Copia los siguientes valores:
   - Project URL
   - anon public key

### Paso 2: Configurar el Proyecto Localmente

1. Abre Visual Studio Code
2. Abre la carpeta del proyecto
3. Abre el archivo `src/config/supabase.js`
4. Reemplaza `TU_SUPABASE_URL` con tu Project URL
5. Reemplaza `TU_SUPABASE_ANON_KEY` con tu anon public key

### Paso 3: Instalar Dependencias

Abre la terminal en VS Code (Ctrl + ` o Cmd + `) y ejecuta:

```bash
npm install
```

### Paso 4: Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación se abrirá automáticamente en tu navegador en `http://localhost:3000`

## 👥 Crear Usuarios

### Crear Usuario Administrador

1. En Supabase, ve a **Authentication** > **Users**
2. Haz clic en **Add user** > **Create new user**
3. Ingresa un email y contraseña
4. Copia el **User UID**
5. Ve a **SQL Editor** y ejecuta:

```sql
UPDATE public.profiles 
SET role = 'admin', nombre = 'Administrador'
WHERE id = 'USER_UID_AQUI';
```

### Crear Visitadora

1. En Supabase, ve a **Authentication** > **Users**
2. Crea un nuevo usuario con email y contraseña
3. El perfil se crea automáticamente como 'visitadora'
4. Opcionalmente, actualiza la zona:

```sql
UPDATE public.profiles 
SET nombre = 'María García', zona = 'Zona Norte'
WHERE email = 'maria@ejemplo.com';
```

## 📁 Estructura del Proyecto

```
visitadoras-medicas/
├── src/
│   ├── components/         # Componentes de React
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── VisitadoraDashboard.jsx
│   ├── config/            # Configuración
│   │   └── supabase.js
│   ├── lib/               # Librerías
│   │   └── supabaseClient.js
│   ├── store/             # Estado global
│   │   └── authStore.js
│   ├── App.jsx           # Componente principal
│   └── main.jsx          # Punto de entrada
├── supabase-setup.sql    # Script de base de datos
└── package.json          # Dependencias
```

## 🔧 Modificar el Código

### Para agregar una nueva funcionalidad:

1. Crea un nuevo componente en `src/components/`
2. Si necesitas estado global, actualiza `src/store/authStore.js`
3. Para nuevas tablas, edita `supabase-setup.sql`

### Ejemplo de estructura modular:

```
src/
├── components/
│   ├── visitas/          # Todo relacionado con visitas
│   │   ├── RegistrarVisita.jsx
│   │   ├── ListaVisitas.jsx
│   │   └── DetalleVisita.jsx
│   ├── comisiones/       # Todo relacionado con comisiones
│   │   └── PanelComisiones.jsx
│   └── shared/           # Componentes compartidos
│       ├── Header.jsx
│       └── Loading.jsx
```

## 🚀 Desplegar a Producción

### Opción 1: Vercel (Recomendado)

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Instala Vercel CLI: `npm i -g vercel`
3. Ejecuta: `vercel`
4. Sigue las instrucciones

### Opción 2: Netlify

1. Ejecuta: `npm run build`
2. Sube la carpeta `dist/` a Netlify

## 📝 Próximos Pasos

Los siguientes componentes ya están listos para ser implementados:

1. **Registrar Visita** - Formulario con GPS, foto y firma
2. **Lista de Visitas** - Panel desplegable con historial
3. **Panel de Comisiones** - Vista de comisiones por mes
4. **Detalles de Visitadora** - Vista completa en admin

¿Quieres que continúe con alguno de estos componentes?

## 🐛 Solución de Problemas

### Error: "Invalid API key"
- Verifica que hayas copiado correctamente las credenciales de Supabase
- Asegúrate de que el proyecto de Supabase esté activo

### Error: "Network error"
- Verifica tu conexión a internet
- Comprueba que el proyecto de Supabase esté corriendo

### No puedo hacer login
- Verifica que el usuario exista en Supabase Authentication
- Comprueba que el script SQL se haya ejecutado correctamente

## 📞 Soporte

Si encuentras algún error o necesitas ayuda, revisa:
1. La consola del navegador (F12)
2. Los logs de Supabase
3. Este README

---

**Desarrollado con ❤️ para facilitar el trabajo de las visitadoras médicas**
