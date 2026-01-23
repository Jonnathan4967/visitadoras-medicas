-- =====================================================
-- TABLA DE CONFIGURACIÓN DE COMISIONES POR MÉDICO
-- =====================================================

-- Esta tabla guarda la configuración de las 3 comisiones
-- que se pueden configurar por cada médico

CREATE TABLE IF NOT EXISTS public.comisiones_configuracion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Comisión USG
  porcentaje_usg DECIMAL(5, 2) DEFAULT 0,
  monto_base_usg DECIMAL(10, 2) DEFAULT 0,
  
  -- Comisión Especial
  porcentaje_especial DECIMAL(5, 2) DEFAULT 0,
  monto_base_especial DECIMAL(10, 2) DEFAULT 0,
  
  -- Comisión EKG/PAP/LABS
  porcentaje_ekg DECIMAL(5, 2) DEFAULT 0,
  monto_base_ekg DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.comisiones_configuracion ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Usuarios autenticados pueden ver configuraciones
CREATE POLICY "Usuarios autenticados ven configuraciones"
  ON public.comisiones_configuracion FOR SELECT
  TO authenticated
  USING (true);

-- Usuarios autenticados pueden crear configuraciones
CREATE POLICY "Usuarios autenticados crean configuraciones"
  ON public.comisiones_configuracion FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuarios autenticados pueden actualizar configuraciones
CREATE POLICY "Usuarios autenticados actualizan configuraciones"
  ON public.comisiones_configuracion FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Usuarios autenticados pueden eliminar configuraciones
CREATE POLICY "Usuarios autenticados eliminan configuraciones"
  ON public.comisiones_configuracion FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

CREATE TRIGGER update_comisiones_configuracion_updated_at
  BEFORE UPDATE ON public.comisiones_configuracion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_comisiones_config_medico 
ON public.comisiones_configuracion(medico_id);

-- =====================================================
-- FUNCIÓN PARA CALCULAR COMISIONES DE UN MÉDICO
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_comisiones_medico(p_medico_id UUID)
RETURNS TABLE (
  tipo_comision TEXT,
  porcentaje DECIMAL(5, 2),
  monto_base DECIMAL(10, 2),
  comision_calculada DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'USG' as tipo_comision,
    porcentaje_usg as porcentaje,
    monto_base_usg as monto_base,
    (monto_base_usg * porcentaje_usg / 100) as comision_calculada
  FROM public.comisiones_configuracion
  WHERE medico_id = p_medico_id
  
  UNION ALL
  
  SELECT 
    'Especial' as tipo_comision,
    porcentaje_especial as porcentaje,
    monto_base_especial as monto_base,
    (monto_base_especial * porcentaje_especial / 100) as comision_calculada
  FROM public.comisiones_configuracion
  WHERE medico_id = p_medico_id
  
  UNION ALL
  
  SELECT 
    'EKG/PAP/LABS' as tipo_comision,
    porcentaje_ekg as porcentaje,
    monto_base_ekg as monto_base,
    (monto_base_ekg * porcentaje_ekg / 100) as comision_calculada
  FROM public.comisiones_configuracion
  WHERE medico_id = p_medico_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VISTA PARA VER COMISIONES CON INFORMACIÓN DEL MÉDICO
-- =====================================================

CREATE OR REPLACE VIEW vista_comisiones_medicos_config AS
SELECT 
  cc.id,
  cc.medico_id,
  m.nombre as medico_nombre,
  m.clinica,
  m.municipio,
  cc.porcentaje_usg,
  cc.monto_base_usg,
  (cc.monto_base_usg * cc.porcentaje_usg / 100) as comision_usg,
  cc.porcentaje_especial,
  cc.monto_base_especial,
  (cc.monto_base_especial * cc.porcentaje_especial / 100) as comision_especial,
  cc.porcentaje_ekg,
  cc.monto_base_ekg,
  (cc.monto_base_ekg * cc.porcentaje_ekg / 100) as comision_ekg,
  (
    (cc.monto_base_usg * cc.porcentaje_usg / 100) +
    (cc.monto_base_especial * cc.porcentaje_especial / 100) +
    (cc.monto_base_ekg * cc.porcentaje_ekg / 100)
  ) as total_comisiones,
  cc.created_at,
  cc.updated_at
FROM public.comisiones_configuracion cc
JOIN public.medicos m ON cc.medico_id = m.id
WHERE m.activo = true;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver estructura de la tabla
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'comisiones_configuracion'
ORDER BY ordinal_position;

-- Probar la función de cálculo (reemplaza con un UUID real)
-- SELECT * FROM calcular_comisiones_medico('UUID_DE_MEDICO_AQUI');

-- Ver políticas
SELECT * FROM pg_policies WHERE tablename = 'comisiones_configuracion';

-- =====================================================
-- ¡LISTO!
-- =====================================================

-- Ahora puedes:
-- ✅ Configurar las 3 comisiones por cada médico
-- ✅ Calcular automáticamente el valor de cada comisión
-- ✅ Ver el total de comisiones por médico
-- ✅ Tanto admin como visitadoras pueden gestionar
