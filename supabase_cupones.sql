-- ══════════════════════════════════════════════════════════════════════
-- Tabla de cupones de descuento — Copy Center 2000
-- Pega este SQL en el Editor SQL de Supabase y ejecuta
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.cupones (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- Código (siempre MAYÚSCULAS)
  type        text not null check (type in ('percent', 'fixed')),
                                              -- percent = %, fixed = MXN fijo
  value       numeric(10,2) not null,         -- % o monto en MXN
  description text,                           -- Texto que ve el cliente
  min_order   numeric(10,2) default null,     -- Monto mínimo del pedido
  max_uses    integer default null,           -- null = ilimitado
  uses        integer not null default 0,     -- Contador de usos
  active      boolean not null default true,
  expires_at  timestamptz default null,       -- null = sin expiración
  created_at  timestamptz not null default now()
);

-- RLS: solo admins pueden crear/modificar cupones
alter table public.cupones enable row level security;

-- Cualquier usuario autenticado (o anónimo) puede leer cupones activos
create policy "cupones_read" on public.cupones
  for select using (active = true);

-- Solo el rol service_role (admin) puede insertar/actualizar/borrar
create policy "cupones_admin_write" on public.cupones
  for all using (auth.role() = 'service_role');

-- ── Ejemplos de cupones para probar ────────────────────────────────────
insert into public.cupones (code, type, value, description, max_uses) values
  ('BIENVENIDO10', 'percent', 10,   '10% de descuento en tu primer pedido', 100),
  ('VERANO50',     'fixed',   50,   '$50 de descuento',                      50),
  ('PROMO15',      'percent', 15,   '15% de descuento — Promoción especial', 200);
