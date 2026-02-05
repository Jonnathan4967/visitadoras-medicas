# 🚀 GUÍA RÁPIDA DE INSTALACIÓN

## Para empezar AHORA MISMO:

### 1️⃣ Abrir en Visual Studio Code
- Abre VS Code
- File > Open Folder
- Selecciona la carpeta `visitadoras-medicas`

### 2️⃣ Instalar Dependencias
Abre la terminal integrada (Ctrl + ` o menú Terminal > New Terminal) y ejecuta:

```bash
npm install
```

Espera 1-2 minutos mientras se instalan las dependencias.

### 3️⃣ Configurar Supabase (5 minutos)

**En otra pestaña del navegador:**

1. Ve a https://supabase.com
2. Crea cuenta (puedes usar Google)
3. Click en "New Project"
4. Elige un nombre (ej: visitadoras-medicas)
5. Crea una contraseña fuerte
6. Selecciona región más cercana
7. Click "Create new project"
8. ESPERA 2-3 minutos

**Cuando esté listo:**

9. En el menú lateral, click "SQL Editor"
10. En VS Code, abre el archivo `supabase-setup.sql`
11. Copia TODO el contenido
12. Pégalo en el SQL Editor de Supabase
13. Click "Run" (botón verde)
14. ¡Listo! Verás "Success. No rows returned"

### 4️⃣ Conectar el Proyecto

En Supabase:
1. Ve a Settings (⚙️ abajo en el menú lateral)
2. Click en "API"
3. Verás dos cosas importantes:

**Copia estos valores:**
- Project URL (algo como https://xxxxx.supabase.co)
- anon public key (una clave larga)

En VS Code:
1. Abre `src/config/supabase.js`
2. Reemplaza `TU_SUPABASE_URL` con tu Project URL
3. Reemplaza `TU_SUPABASE_ANON_KEY` con tu anon public key
4. Guarda el archivo (Ctrl + S)

### 5️⃣ Iniciar la Aplicación

En la terminal de VS Code:

```bash
npm run dev
```

¡Se abrirá automáticamente en tu navegador!

### 6️⃣ Crear tu Primer Usuario

**Para crear un ADMINISTRADOR:**

En Supabase:
1. Click "Authentication" en el menú
2. Click "Users"
3. Click "Add user" > "Create new user"
4. Email: admin@tuempresa.com
5. Password: (algo seguro)
6. ✅ Auto Confirm User
7. Click "Create user"
8. COPIA el User UID que aparece

Ahora:
1. Ve a "SQL Editor"
2. Pega esto (reemplaza USER_UID_AQUI con el UID que copiaste):

```sql
UPDATE public.profiles 
SET role = 'admin', nombre = 'Administrador Principal'
WHERE id = 'USER_UID_AQUI';
```

3. Click "Run"

**Para crear una VISITADORA:**

Repite los pasos pero:
- Usa un email diferente
- NO ejecutes el UPDATE (se crea automáticamente como visitadora)
- Opcionalmente actualiza su nombre y zona:

```sql
UPDATE public.profiles 
SET nombre = 'María García', zona = 'Zona Norte'
WHERE email = 'maria@ejemplo.com';
```

### 7️⃣ ¡LISTO! 🎉

Ahora puedes:
- Ir a http://localhost:3000
- Hacer login con el usuario que creaste
- Ver el dashboard

---

## ⚡ Comandos Rápidos

```bash
# Iniciar servidor de desarrollo
npm run dev

# Detener servidor
Ctrl + C (en la terminal)

# Compilar para producción
npm run build
```

## 🆘 Problemas Comunes

**"Cannot find module"**
→ Ejecuta: `npm install`

**"Invalid API key"**
→ Revisa que copiaste bien las credenciales en `src/config/supabase.js`

**No puedo hacer login**
→ Ve a Supabase > Authentication > Users y verifica que el usuario existe

**La página no carga**
→ Asegúrate de haber ejecutado el script SQL en Supabase

---

## 📱 Siguiente Paso

Una vez que tengas esto funcionando, te mostraré cómo agregar:
- ✅ Registro de visitas con GPS
- ✅ Captura de fotos
- ✅ Firma digital
- ✅ Panel de comisiones

¡Avísame cuando esté funcionando y continuamos! 🚀
