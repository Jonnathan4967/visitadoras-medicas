-- =====================================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS
-- Sistema de Visitadoras Médicas
-- =====================================================

-- 1. TABLA DE PERFILES
-- Extiende la tabla de usuarios de Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  role TEXT CHECK (role IN ('admin', 'visitadora')) DEFAULT 'visitadora',
  zona TEXT,
  telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. TABLA DE VISITAS
CREATE TABLE IF NOT EXISTS public.visitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitadora_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nombre_cliente TEXT NOT NULL,
  direccion TEXT NOT NULL,
  tipo_establecimiento TEXT,
  productos_presentados TEXT[],
  observaciones TEXT,
  foto_url TEXT,
  firma_url TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. TABLA DE COMISIONES
CREATE TABLE IF NOT EXISTS public.comisiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitadora_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  total_visitas INTEGER DEFAULT 0,
  monto_comision DECIMAL(10, 2) DEFAULT 0,
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  estado TEXT CHECK (estado IN ('pendiente', 'pagado')) DEFAULT 'pendiente',
  fecha_pago TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(visitadora_id, mes, anio)
);

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para VISITAS
CREATE POLICY "Visitadoras pueden ver sus propias visitas"
  ON public.visitas FOR SELECT
  USING (visitadora_id = auth.uid());

CREATE POLICY "Admins pueden ver todas las visitas"
  ON public.visitas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Visitadoras pueden crear sus propias visitas"
  ON public.visitas FOR INSERT
  WITH CHECK (visitadora_id = auth.uid());

CREATE POLICY "Visitadoras pueden actualizar sus propias visitas"
  ON public.visitas FOR UPDATE
  USING (visitadora_id = auth.uid());

CREATE POLICY "Visitadoras pueden eliminar sus propias visitas"
  ON public.visitas FOR DELETE
  USING (visitadora_id = auth.uid());

-- Políticas para COMISIONES
CREATE POLICY "Visitadoras pueden ver sus propias comisiones"
  ON public.comisiones FOR SELECT
  USING (visitadora_id = auth.uid());

CREATE POLICY "Admins pueden ver todas las comisiones"
  ON public.comisiones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins pueden gestionar comisiones"
  ON public.comisiones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'visitadora');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_visitas_visitadora_id ON public.visitas(visitadora_id);
CREATE INDEX IF NOT EXISTS idx_visitas_created_at ON public.visitas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comisiones_visitadora_id ON public.comisiones(visitadora_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_mes_anio ON public.comisiones(mes, anio);

-- =====================================================
-- CONFIGURACIÓN DE STORAGE PARA IMÁGENES
-- =====================================================

-- Crear bucket para fotos de visitas
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitas-fotos', 'visitas-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para firmas digitales
INSERT INTO storage.buckets (id, name, public)
VALUES ('firmas', 'firmas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para fotos de visitas
CREATE POLICY "Visitadoras pueden subir fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'visitas-fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos son públicamente visibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'visitas-fotos');

-- Políticas de storage para firmas
CREATE POLICY "Visitadoras pueden subir firmas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'firmas' AND auth.role() = 'authenticated');

CREATE POLICY "Firmas son públicamente visibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firmas');

-- =====================================================
-- DATOS DE PRUEBA (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- =====================================================

-- Nota: Después de crear un usuario administrador desde la interfaz de Supabase,
-- ejecuta esta query reemplazando 'EMAIL_DEL_ADMIN' con el email real:
-- 
-- UPDATE public.profiles 
-- SET role = 'admin', nombre = 'Administrador'
-- WHERE email = 'EMAIL_DEL_ADMIN';
