-- Copy Center 2000 - one-use counter tickets for copies/scans/binding.
-- Idempotent migration. Apply from Supabase CLI or SQL Editor.

create table if not exists public.copy_tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  used boolean not null default false,
  servicio text,
  descripcion text,
  cantidad integer,
  precio_unit numeric(10,2),
  total numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.copy_tickets
  add column if not exists expires_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists redeemed_by uuid references auth.users(id) on delete set null,
  add column if not exists redeemed_order_id uuid references public.orders(id) on delete set null;

update public.copy_tickets
set expires_at = created_at + interval '4 hours'
where expires_at is null;

alter table public.copy_tickets
  alter column expires_at set default (now() + interval '4 hours');

create index if not exists copy_tickets_code_idx on public.copy_tickets (code);
create index if not exists copy_tickets_open_idx on public.copy_tickets (used, expires_at);
create index if not exists copy_tickets_redeemed_order_idx on public.copy_tickets (redeemed_order_id);

alter table public.copy_tickets enable row level security;

create or replace function public.is_copycenter_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
$$;

drop policy if exists "admin full access" on public.copy_tickets;
drop policy if exists "authenticated read" on public.copy_tickets;
drop policy if exists "authenticated update used" on public.copy_tickets;
drop policy if exists "copy_tickets_admin_all" on public.copy_tickets;

create policy "copy_tickets_admin_all" on public.copy_tickets
  for all
  using (public.is_copycenter_admin())
  with check (public.is_copycenter_admin());

create or replace function public.normalize_copy_ticket_code(ticket_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(btrim(coalesce(ticket_code, '')), '\s+', '', 'g'));
$$;

create or replace function public.validate_copy_ticket(ticket_code text)
returns table (
  valid boolean,
  reason text,
  code text,
  servicio text,
  descripcion text,
  cantidad integer,
  precio_unit numeric,
  total numeric,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_copy_ticket_code(ticket_code);
  ticket record;
begin
  if normalized = '' then
    return query select false, 'Ingresa el codigo del ticket.', null::text, null::text, null::text, null::integer, null::numeric, null::numeric, null::timestamptz;
    return;
  end if;

  select t.code, t.used, t.servicio, t.descripcion, t.cantidad, t.precio_unit, t.total, t.created_at, t.expires_at
  into ticket
  from public.copy_tickets t
  where t.code = normalized
  limit 1;

  if not found then
    return query select false, 'Codigo no encontrado. Pide uno al administrador.', null::text, null::text, null::text, null::integer, null::numeric, null::numeric, null::timestamptz;
    return;
  end if;

  if ticket.used then
    return query select false, 'Este codigo ya fue utilizado.', ticket.code, null::text, null::text, null::integer, null::numeric, null::numeric, ticket.expires_at;
    return;
  end if;

  if coalesce(ticket.expires_at, ticket.created_at + interval '4 hours') <= now() then
    return query select false, 'El codigo expiro. Solicita uno nuevo.', ticket.code, null::text, null::text, null::integer, null::numeric, null::numeric, ticket.expires_at;
    return;
  end if;

  return query select true, null::text, ticket.code, ticket.servicio, ticket.descripcion, ticket.cantidad, ticket.precio_unit, ticket.total, ticket.expires_at;
end;
$$;

create or replace function public.redeem_copy_ticket(ticket_code text, ticket_order_id uuid default null)
returns table (
  valid boolean,
  reason text,
  code text,
  servicio text,
  descripcion text,
  cantidad integer,
  precio_unit numeric,
  total numeric,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_copy_ticket_code(ticket_code);
  ticket record;
  existing record;
begin
  if normalized = '' then
    return query select false, 'Ingresa el codigo del ticket.', null::text, null::text, null::text, null::integer, null::numeric, null::numeric, null::timestamptz;
    return;
  end if;

  update public.copy_tickets t
  set
    used = true,
    used_at = now(),
    redeemed_by = auth.uid(),
    redeemed_order_id = ticket_order_id
  where t.code = normalized
    and t.used = false
    and coalesce(t.expires_at, t.created_at + interval '4 hours') > now()
  returning t.code, t.servicio, t.descripcion, t.cantidad, t.precio_unit, t.total, t.expires_at
  into ticket;

  if found then
    return query select true, null::text, ticket.code, ticket.servicio, ticket.descripcion, ticket.cantidad, ticket.precio_unit, ticket.total, ticket.expires_at;
    return;
  end if;

  select t.code, t.used, t.created_at, t.expires_at
  into existing
  from public.copy_tickets t
  where t.code = normalized
  limit 1;

  if not found then
    return query select false, 'Codigo no encontrado. Pide uno al administrador.', null::text, null::text, null::text, null::integer, null::numeric, null::numeric, null::timestamptz;
  elsif existing.used then
    return query select false, 'Este codigo ya fue utilizado.', existing.code, null::text, null::text, null::integer, null::numeric, null::numeric, existing.expires_at;
  else
    return query select false, 'El codigo expiro. Solicita uno nuevo.', existing.code, null::text, null::text, null::integer, null::numeric, null::numeric, existing.expires_at;
  end if;
end;
$$;

grant execute on function public.validate_copy_ticket(text) to anon, authenticated;
grant execute on function public.redeem_copy_ticket(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
