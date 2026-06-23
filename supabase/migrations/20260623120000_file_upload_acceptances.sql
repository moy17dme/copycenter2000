-- Registros legales de aceptacion de terminos y anexos por archivo.

begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_acceptance_method text;

comment on column public.profiles.terms_accepted_at is
  'Fecha/hora en que el usuario acepto terminos al crear cuenta.';
comment on column public.profiles.terms_version is
  'Version de terminos aceptada al crear cuenta.';
comment on column public.profiles.terms_acceptance_method is
  'Metodo de aceptacion registrado por la aplicacion.';

create table if not exists public.file_upload_acceptances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  file_size bigint,
  file_sha256 text not null,
  terms_version text not null,
  contract_version text not null,
  accepted_statement text not null,
  contract_text text not null,
  accepted_by_name text,
  accepted_by_email text,
  customer_phone text,
  client_accepted_at timestamptz,
  accepted_at timestamptz not null default now(),
  client_timezone text,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now(),
  constraint file_upload_acceptances_sha256_hex
    check (file_sha256 ~ '^[a-f0-9]{64}$'),
  constraint file_upload_acceptances_storage_path_shape
    check (storage_path ~ '^orders/[0-9a-f-]{36}/[A-Za-z0-9._/-]+$')
);

create index if not exists file_upload_acceptances_order_idx
  on public.file_upload_acceptances(order_id);
create index if not exists file_upload_acceptances_user_idx
  on public.file_upload_acceptances(user_id, created_at desc);
create index if not exists file_upload_acceptances_hash_idx
  on public.file_upload_acceptances(file_sha256);

alter table public.file_upload_acceptances enable row level security;
revoke all on public.file_upload_acceptances from anon, authenticated;
grant select on public.file_upload_acceptances to authenticated;

drop policy if exists "file_upload_acceptances_owner_select"
  on public.file_upload_acceptances;
drop policy if exists "file_upload_acceptances_admin_select"
  on public.file_upload_acceptances;

create policy "file_upload_acceptances_owner_select"
  on public.file_upload_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "file_upload_acceptances_admin_select"
  on public.file_upload_acceptances
  for select
  to authenticated
  using (public.is_copycenter_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  accepted_at timestamptz;
  accepted_terms boolean;
begin
  accepted_terms :=
    lower(coalesce(new.raw_user_meta_data->>'terms_accepted', '')) = 'true';

  if accepted_terms then
    begin
      accepted_at := nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz;
    exception when others then
      accepted_at := now();
    end;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    whatsapp,
    address,
    role,
    terms_accepted_at,
    terms_version,
    terms_acceptance_method
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    'customer',
    accepted_at,
    nullif(new.raw_user_meta_data->>'terms_version', ''),
    nullif(new.raw_user_meta_data->>'terms_acceptance_method', '')
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone),
    whatsapp = coalesce(excluded.whatsapp, profiles.whatsapp),
    address = coalesce(excluded.address, profiles.address),
    terms_accepted_at = coalesce(excluded.terms_accepted_at, profiles.terms_accepted_at),
    terms_version = coalesce(excluded.terms_version, profiles.terms_version),
    terms_acceptance_method =
      coalesce(excluded.terms_acceptance_method, profiles.terms_acceptance_method);

  return new;
end;
$$;

notify pgrst, 'reload schema';

commit;
