-- =====================================================
-- ACTUALIZACIÓN: PERMISOS PARA GESTIÓN DE MÉDICOS
-- Script para ejecutar en Supabase SQL Editor
-- =====================================================

-- Este script agrega/actualiza la tabla de médicos y 
-- otorga permisos a las visitadoras para gestionarla

-- =====================================================
-- 1. CREAR/ACTUALIZAR TABLA DE MÉDICOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.medicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  clinica TEXT,
  especialidad TEXT,
  telefono TEXT,
  municipio TEXT,
  direccion TEXT,
  referencia TEXT,
  especial TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- 2. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. ELIMINAR POLÍTICAS ANTIGUAS (si existen)
-- =====================================================

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver médicos activos" ON public.medicos;
DROP POLICY IF EXISTS "Admins pueden ver todos los médicos" ON public.medicos;
DROP POLICY IF EXISTS "Admins pueden insertar médicos" ON public.medicos;
DROP POLICY IF EXISTS "Admins pueden actualizar médicos" ON public.medicos;
DROP POLICY IF EXISTS "Admins pueden eliminar médicos" ON public.medicos;
DROP POLICY IF EXISTS "Todos pueden ver médicos activos" ON public.medicos;
DROP POLICY IF EXISTS "Solo admins gestionan médicos" ON public.medicos;

-- =====================================================
-- 4. CREAR NUEVAS POLÍTICAS CON PERMISOS PARA VISITADORAS
-- =====================================================

-- Política SELECT: Todos los usuarios autenticados pueden VER médicos activos
CREATE POLICY "Usuarios autenticados ven médicos activos"
  ON public.medicos FOR SELECT
  TO authenticated
  USING (activo = true);

-- Política INSERT: Usuarios autenticados pueden AGREGAR médicos
CREATE POLICY "Usuarios autenticados pueden agregar médicos"
  ON public.medicos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política UPDATE: Usuarios autenticados pueden EDITAR médicos
CREATE POLICY "Usuarios autenticados pueden editar médicos"
  ON public.medicos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política DELETE: Usuarios autenticados pueden ELIMINAR (marcar inactivo)
-- Nota: En realidad usamos UPDATE para marcar como inactivo, pero agregamos esta política por si acaso
CREATE POLICY "Usuarios autenticados pueden eliminar médicos"
  ON public.medicos FOR DELETE
  TO authenticated
  USING (true);

-- Política especial para ADMINS: pueden ver TODOS los médicos (incluso inactivos)
CREATE POLICY "Admins ven todos los médicos"
  ON public.medicos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

-- Usar la función existente o crearla si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para médicos
DROP TRIGGER IF EXISTS update_medicos_updated_at ON public.medicos;
CREATE TRIGGER update_medicos_updated_at
  BEFORE UPDATE ON public.medicos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_medicos_nombre ON public.medicos(nombre);
CREATE INDEX IF NOT EXISTS idx_medicos_activo ON public.medicos(activo);
CREATE INDEX IF NOT EXISTS idx_medicos_municipio ON public.medicos(municipio);
CREATE INDEX IF NOT EXISTS idx_medicos_clinica ON public.medicos(clinica);

-- =====================================================
-- 7. FUNCIÓN DE BÚSQUEDA DE MÉDICOS (Mejorada)
-- =====================================================

-- Esta función permite búsquedas más eficientes
CREATE OR REPLACE FUNCTION buscar_medicos(termino TEXT)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  clinica TEXT,
  especialidad TEXT,
  telefono TEXT,
  municipio TEXT,
  direccion TEXT,
  referencia TEXT,
  especial TEXT,
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.nombre,
    m.clinica,
    m.especialidad,
    m.telefono,
    m.municipio,
    m.direccion,
    m.referencia,
    m.especial,
    m.activo
  FROM public.medicos m
  WHERE m.activo = true
    AND (
      m.nombre ILIKE '%' || termino || '%' OR
      m.clinica ILIKE '%' || termino || '%' OR
      m.municipio ILIKE '%' || termino || '%' OR
      m.especialidad ILIKE '%' || termino || '%'
    )
  ORDER BY m.nombre
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. ACTUALIZAR TABLA DE VISITAS (si es necesario)
-- =====================================================

-- Agregar columna medico_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitas' 
    AND column_name = 'medico_id'
  ) THEN
    ALTER TABLE public.visitas 
    ADD COLUMN medico_id UUID REFERENCES public.medicos(id);
    
    CREATE INDEX IF NOT EXISTS idx_visitas_medico_id ON public.visitas(medico_id);
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Para verificar que todo está correcto, ejecuta estas queries:

-- 1. Ver todas las políticas de la tabla médicos:
-- SELECT * FROM pg_policies WHERE tablename = 'medicos';

-- 2. Probar la búsqueda:
-- SELECT * FROM buscar_medicos('');

-- 3. Verificar índices:
-- SELECT * FROM pg_indexes WHERE tablename = 'medicos';

-- =====================================================
-- ¡LISTO!
-- =====================================================

-- Ahora las visitadoras pueden:
-- ✅ Ver médicos activos
-- ✅ Agregar nuevos médicos
-- ✅ Editar médicos existentes
-- ✅ Eliminar médicos (marcar como inactivo)

-- Los administradores pueden:
-- ✅ Todo lo anterior
-- ✅ Ver médicos inactivos
-- ✅ Importar/exportar médicos masivamente
