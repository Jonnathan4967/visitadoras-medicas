-- =====================================================
-- ACTUALIZAR TABLA COMISIONES_MENSUALES
-- Para que funcione con el sistema de configuración
-- =====================================================

-- Verificar si la tabla existe y agregarle las columnas necesarias
DO $$ 
BEGIN
  -- Agregar columna medico_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comisiones_mensuales' 
    AND column_name = 'medico_id'
  ) THEN
    ALTER TABLE public.comisiones_mensuales 
    ADD COLUMN medico_id UUID REFERENCES public.medicos(id);
  END IF;

  -- Agregar columna mes si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comisiones_mensuales' 
    AND column_name = 'mes'
  ) THEN
    ALTER TABLE public.comisiones_mensuales 
    ADD COLUMN mes INTEGER;
  END IF;

  -- Agregar columna anio si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comisiones_mensuales' 
    AND column_name = 'anio'
  ) THEN
    ALTER TABLE public.comisiones_mensuales 
    ADD COLUMN anio INTEGER;
  END IF;

  -- Agregar columna estado si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comisiones_mensuales' 
    AND column_name = 'estado'
  ) THEN
    ALTER TABLE public.comisiones_mensuales 
    ADD COLUMN estado TEXT DEFAULT 'pendiente';
  END IF;
END $$;

-- Verificar estructura actual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comisiones_mensuales'
ORDER BY ordinal_position;
