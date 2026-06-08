-- ══════════════════════════════════════════════════════════════════════
-- Migración Copy Center 2000 — ejecuta en Supabase SQL Editor
-- Un solo bloque, copia y pega todo de una vez
-- Es seguro ejecutarlo varias veces (idempotente)
-- ══════════════════════════════════════════════════════════════════════

-- 1. Columnas nuevas en orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code  text             default null,
  ADD COLUMN IF NOT EXISTS discount     numeric(10,2)    not null default 0,
  ADD COLUMN IF NOT EXISTS file_paths   jsonb            default '[]'::jsonb;

-- 2. Políticas de Storage para el bucket "order-files"
--    Eliminar primero si ya existen para que sea idempotente
DROP POLICY IF EXISTS "order_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "order_files_admin_select" ON storage.objects;

-- Permitir subida de archivos (el código usa service_role pero esto es respaldo)
CREATE POLICY "order_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'order-files');

-- Permitir que cualquier usuario autenticado genere URLs firmadas y descargue
CREATE POLICY "order_files_admin_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-files');
