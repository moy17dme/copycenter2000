-- =============================================================
-- COPYCENTER2000 — Schema de base de datos
-- Ejecuta este SQL en Supabase > SQL Editor > New query
-- =============================================================

-- 0. Tabla de perfiles de usuario
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text,
  full_name   text,
  phone       text,
  whatsapp    text,
  address     text,
  company     text,
  role        text not null default 'customer',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table profiles enable row level security;

-- Usuarios ven y editan solo su propio perfil
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Admins ven todos los perfiles
create policy "admins_select_profiles" on profiles
  for select using (
    exists (
      select 1 from profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

-- Trigger para crear perfil al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, whatsapp, address, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    'customer'
  )
  on conflict (id) do update set
    email     = coalesce(excluded.email, profiles.email),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone     = coalesce(excluded.phone, profiles.phone),
    whatsapp  = coalesce(excluded.whatsapp, profiles.whatsapp),
    address   = coalesce(excluded.address, profiles.address);
  return new;
end;
$$ language plpgsql security definer;

-- Función para buscar email por número de teléfono (usada en login por teléfono)
-- SECURITY DEFINER permite ejecutarla sin estar autenticado
create or replace function get_email_by_phone(phone_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  found_email text;
begin
  select email into found_email
  from profiles
  where phone = phone_input or whatsapp = phone_input
  limit 1;
  return found_email;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 1. Tabla de pedidos
create table if not exists orders (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete set null,
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  items            jsonb not null default '[]',
  notes            text,
  payment_method   text not null default 'transfer',  -- 'card' | 'transfer'
  payment_status   text not null default 'pending',   -- 'pending' | 'approved'
  status           text not null default 'pending_payment',
  -- pending_payment | payment_approved | in_progress | printing | ready | completed | cancelled
  estimated_ready_at timestamptz,
  admin_notes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 2. Historial de estados del pedido
create table if not exists order_status_history (
  id         uuid default gen_random_uuid() primary key,
  order_id   uuid references orders(id) on delete cascade not null,
  status     text not null,
  message    text,
  created_at timestamptz default now()
);

-- 3. Habilitar RLS
alter table orders enable row level security;
alter table order_status_history enable row level security;

-- 4. Políticas para orders

-- Clientes ven sus propios pedidos
create policy "customers_select_own" on orders
  for select using (auth.uid() = user_id);

-- Clientes crean pedidos (autenticados)
create policy "customers_insert_own" on orders
  for insert with check (auth.uid() = user_id);

-- Pedidos de invitados (sin sesión)
create policy "guests_insert" on orders
  for insert with check (user_id is null);

-- Admins ven y modifican todo
create policy "admins_all" on orders
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 5. Políticas para order_status_history

-- Clientes ven el historial de sus pedidos
create policy "customers_select_history" on order_status_history
  for select using (
    exists (
      select 1 from orders
      where orders.id = order_id
      and orders.user_id = auth.uid()
    )
  );

-- Admins administran el historial
create policy "admins_all_history" on order_status_history
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 6. Función para actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- 7. Verificar que la tabla profiles tenga las columnas necesarias
-- (Si da error "column already exists" es normal, ignóralo)
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists company text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists whatsapp text;

-- =============================================================
-- STORAGE: Crear bucket 'order-files' manualmente en:
-- Supabase Dashboard > Storage > New bucket
-- Nombre: order-files
-- Public: NO (privado)
-- =============================================================

-- 8. Políticas de Storage (ejecuta después de crear el bucket)
insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', false)
on conflict do nothing;

create policy "authed_upload" on storage.objects
  for insert with check (
    bucket_id = 'order-files'
    and auth.role() = 'authenticated'
  );

create policy "owner_read" on storage.objects
  for select using (
    bucket_id = 'order-files'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "admins_storage" on storage.objects
  for all using (
    bucket_id = 'order-files'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
