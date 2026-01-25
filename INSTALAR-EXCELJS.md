# 📦 Instalación de ExcelJS para Reportes con Colores

## ⚠️ IMPORTANTE: Instalar ExcelJS

El nuevo sistema de reportes usa **ExcelJS** en lugar de SheetJS para tener colores y estilos profesionales.

### 1️⃣ Instalar ExcelJS

```bash
npm install exceljs
```

### 2️⃣ Reemplazar carpeta src

Copia la carpeta `src-CON-EXCELJS` del ZIP y reemplaza tu carpeta `src` actual.

### 3️⃣ Iniciar el proyecto

```bash
npm run dev
```

## ✨ ¿Qué incluye el nuevo sistema?

### 📊 Excel con Colores Profesionales

**Hoja de Visitas:**
- 🔵 Encabezado azul (#1565C0) con texto blanco
- 📋 Tabla con filas alternas (blanco/gris)
- 📐 Bordes en todas las celdas
- 📏 Columnas auto-ajustadas

**Hoja de Comisiones:**
- 🟢 Encabezado verde (#2E7D32) con texto blanco
- 💰 Formato de moneda (Q #,##0.00)
- 📊 Fila de TOTALES con fondo verde oscuro
- ✓ Estados con símbolos (✓ Pagado / ○ Pendiente)

### 📄 3 Opciones de Exportación

1. **Exportar a Excel (Completo)**
   - Visitas + Comisiones
   - Con todos los colores y estilos

2. **Exportar a PDF (Completo)**
   - Visitas + Comisiones
   - Firmas incluidas como imágenes

3. **Solo Comisiones (Excel)**
   - Reporte exclusivo de comisiones
   - Con totales y resumen

## 🔧 Correcciones Incluidas

✅ Query corregido: usa `comisiones_mensuales` (antes usaba `comisiones`)
✅ Cálculo correcto: USG + Especial + EKG = Total
✅ Filtrado por estado: Pagado vs Pendiente
✅ Nombres de médicos incluidos

## 🎨 Ejemplo del Excel

```
╔═══════════════════════════════════════════╗
║   REPORTE DE COMISIONES (Verde)           ║
╠═══════════════════════════════════════════╣
║ Fecha: 25 de enero de 2026                ║
║ Visitadora: Irma Yolanda                  ║
╚═══════════════════════════════════════════╝

┌────────────────────────────────────────────┐
│ Médico │ Mes │ Año │ USG  │ Especial │... │ (Verde oscuro)
├────────────────────────────────────────────┤
│ Dr. X  │ Ene │2026 │Q150.00│ Q100.00  │... │ (Blanco)
│ Dr. Y  │ Ene │2026 │Q200.00│ Q0.00    │... │ (Verde claro)
├────────────────────────────────────────────┤
│ TOTALES:           │ Q1,250.00            │ (Verde muy oscuro)
└────────────────────────────────────────────┘
```

## 🚀 ¡Todo Listo!

Ahora tus reportes se verán **profesionales** con:
- ✅ Colores corporativos
- ✅ Bordes limpios
- ✅ Formato de moneda
- ✅ Filas alternas
- ✅ Totales destacados

**Disponible en:**
- Panel Visitadora → Reportes
- Panel Admin → Reportes (con selector)
