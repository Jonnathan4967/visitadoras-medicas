-- =====================================================
-- AGREGAR COLUMNAS DE UBICACIÓN GPS A TABLA MÉDICOS
-- =====================================================

-- Este script agrega las columnas de latitud y longitud
-- a la tabla de médicos para guardar ubicaciones GPS

-- Agregar columna de latitud si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medicos' 
    AND column_name = 'latitud'
  ) THEN
    ALTER TABLE public.medicos 
    ADD COLUMN latitud DECIMAL(10, 8);
    
    RAISE NOTICE 'Columna latitud agregada correctamente';
  ELSE
    RAISE NOTICE 'Columna latitud ya existe';
  END IF;
END $$;

-- Agregar columna de longitud si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medicos' 
    AND column_name = 'longitud'
  ) THEN
    ALTER TABLE public.medicos 
    ADD COLUMN longitud DECIMAL(11, 8);
    
    RAISE NOTICE 'Columna longitud agregada correctamente';
  ELSE
    RAISE NOTICE 'Columna longitud ya existe';
  END IF;
END $$;

-- Crear índice para mejorar búsquedas por ubicación (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_medicos_ubicacion 
ON public.medicos(latitud, longitud) 
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver estructura actualizada de la tabla
SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'medicos'
ORDER BY ordinal_position;

-- =====================================================
-- ¡LISTO!
-- =====================================================

-- Ahora los médicos pueden tener coordenadas GPS guardadas
-- Las visitadoras pueden:
-- ✅ Capturar la ubicación actual del consultorio
-- ✅ Ver las coordenadas guardadas
-- ✅ Abrir la ubicación en Google Maps para navegar
