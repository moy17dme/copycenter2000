-- Copy Center 2000 security hardening.
-- Closes privilege escalation, unsafe anonymous writes, coupon enumeration,
-- unrestricted file uploads, and adds an atomic API rate limiter.

begin;

alter table public.orders
  add column if not exists pricing_summary jsonb,
  add column if not exists coupon_code text,
  add column if not exists billing_info jsonb,
  add column if not exists file_paths jsonb default '[]'::jsonb;

create table if not exists public.cupones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  description text,
  min_order numeric(10,2),
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.cupones enable row level security;

-- Atomic fixed-window limiter used by triggers and trusted server functions.
create table if not exists public.api_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (rate_key, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket_start timestamptz;
  current_count integer;
  safe_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
  safe_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
begin
  if p_key is null or char_length(p_key) < 3 or char_length(p_key) > 200 then
    raise exception 'invalid rate limit key' using errcode = '22023';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / safe_window) * safe_window
  );

  insert into public.api_rate_limits (rate_key, window_start, request_count)
  values (p_key, bucket_start, 1)
  on conflict (rate_key, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into current_count;

  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_start < now() - interval '2 days';
  end if;

  return query select
    current_count <= safe_limit,
    greatest(safe_limit - current_count, 0),
    greatest(
      1,
      ceil(extract(epoch from (bucket_start + make_interval(secs => safe_window) - now())))::integer
    );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

-- Privileged roles are server-managed. Users may edit their profile details,
-- but never their id or role.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if session_user in ('postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id or new.role is distinct from old.role then
    raise exception 'profile privileged fields are server-managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.is_copycenter_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
$$;

revoke all on function public.is_copycenter_admin() from public;
grant execute on function public.is_copycenter_admin() to authenticated, service_role;

-- Phone-to-email lookup leaks account identifiers and enables enumeration.
do $$
begin
  if to_regprocedure('public.get_email_by_phone(text)') is not null then
    execute 'revoke all on function public.get_email_by_phone(text) from public, anon, authenticated';
  end if;
end
$$;

-- Anonymous order creation is an unbounded database write surface.
drop policy if exists "guests_insert" on public.orders;
drop policy if exists "customers_insert_own" on public.orders;
create policy "customers_insert_own" on public.orders
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and payment_status = 'pending'
    and status = 'pending_payment'
    and payment_method in ('transfer', 'mercadopago')
  );

drop policy if exists "customers_update_own" on public.orders;
create policy "customers_update_own" on public.orders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.orders
  drop constraint if exists orders_customer_name_length,
  drop constraint if exists orders_customer_phone_length,
  drop constraint if exists orders_customer_email_length,
  drop constraint if exists orders_notes_length,
  drop constraint if exists orders_items_shape,
  drop constraint if exists orders_file_paths_shape;

alter table public.orders
  add constraint orders_customer_name_length
    check (customer_name is null or char_length(customer_name) between 1 and 120) not valid,
  add constraint orders_customer_phone_length
    check (customer_phone is null or char_length(customer_phone) <= 32) not valid,
  add constraint orders_customer_email_length
    check (customer_email is null or char_length(customer_email) <= 254) not valid,
  add constraint orders_notes_length
    check (notes is null or char_length(notes) <= 5000) not valid,
  add constraint orders_items_shape
    check (
      jsonb_typeof(items) = 'array'
      and jsonb_array_length(items) between 1 and 50
      and pg_column_size(items) <= 262144
    ) not valid,
  add constraint orders_file_paths_shape
    check (
      file_paths is null
      or (
        jsonb_typeof(file_paths) = 'array'
        and jsonb_array_length(file_paths) <= 50
        and pg_column_size(file_paths) <= 32768
      )
    ) not valid;

create or replace function public.protect_order_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  path_value text;
  insert_allowed boolean;
begin
  if session_user in ('postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role'
     or public.is_copycenter_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'authenticated order owner required' using errcode = '42501';
    end if;
    if new.payment_status <> 'pending'
       or new.status <> 'pending_payment'
       or new.payment_method not in ('transfer', 'mercadopago') then
      raise exception 'invalid initial payment state' using errcode = '42501';
    end if;
    select r.allowed into insert_allowed
    from public.consume_api_rate_limit(
      'order:create:' || auth.uid()::text,
      20,
      3600
    ) r;
    if not coalesce(insert_allowed, false) then
      raise exception 'order creation rate limit exceeded' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.user_id is distinct from auth.uid() or new.user_id is distinct from old.user_id then
    raise exception 'order owner cannot be changed' using errcode = '42501';
  end if;

  if new.payment_method is distinct from old.payment_method
     or new.payment_status is distinct from old.payment_status
     or new.pricing_summary is distinct from old.pricing_summary
     or new.coupon_code is distinct from old.coupon_code
     or new.customer_name is distinct from old.customer_name
     or new.customer_phone is distinct from old.customer_phone
     or new.customer_email is distinct from old.customer_email
     or new.items is distinct from old.items
     or new.notes is distinct from old.notes
     or new.billing_info is distinct from old.billing_info
     or new.admin_notes is distinct from old.admin_notes
     or new.estimated_ready_at is distinct from old.estimated_ready_at then
    raise exception 'protected order fields cannot be changed by customer'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled'
       or old.status <> 'pending_payment'
       or lower(coalesce(old.payment_status, '')) in
          ('approved', 'paid', 'confirmed', 'success', 'succeeded') then
      raise exception 'invalid customer status transition' using errcode = '42501';
    end if;
  end if;

  if new.file_paths is distinct from old.file_paths and new.file_paths is not null then
    for path_value in select jsonb_array_elements_text(new.file_paths)
    loop
      if path_value !~ ('^orders/' || old.id::text || '/[A-Za-z0-9._/-]+$') then
        raise exception 'invalid order file path' using errcode = '42501';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_order_security_fields on public.orders;
create trigger protect_order_security_fields
  before insert or update on public.orders
  for each row execute function public.protect_order_security_fields();

drop policy if exists "customers_insert_history" on public.order_status_history;
create policy "customers_insert_history" on public.order_status_history
  for insert
  to authenticated
  with check (
    status = 'cancelled'
    and char_length(coalesce(message, '')) <= 250
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- Coupon codes must be checked by exact code, not listed from the public table.
drop policy if exists "cupones_read" on public.cupones;
revoke select on public.cupones from anon, authenticated;

create or replace function public.validate_coupon(
  coupon_code text,
  order_subtotal numeric
)
returns table (
  valid boolean,
  reason text,
  code text,
  type text,
  value numeric,
  description text,
  min_order numeric,
  discount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(btrim(coalesce(coupon_code, '')));
  subtotal numeric := greatest(coalesce(order_subtotal, 0), 0);
  coupon public.cupones%rowtype;
  request_allowed boolean;
begin
  if auth.uid() is null then
    return query select false, 'Inicia sesion para validar cupones.',
      null::text, null::text, null::numeric, null::text, null::numeric, null::numeric;
    return;
  end if;

  select r.allowed into request_allowed
  from public.consume_api_rate_limit(
    'coupon:validate:' || auth.uid()::text,
    30,
    600
  ) r;
  if not coalesce(request_allowed, false) then
    return query select false, 'Demasiados intentos. Espera antes de probar otro cupon.',
      null::text, null::text, null::numeric, null::text, null::numeric, null::numeric;
    return;
  end if;

  if normalized !~ '^[A-Z0-9_-]{3,32}$' then
    return query select false, 'Cupon no valido.', null::text, null::text,
      null::numeric, null::text, null::numeric, null::numeric;
    return;
  end if;

  select c.* into coupon
  from public.cupones c
  where c.code = normalized and c.active = true
  limit 1;

  if not found
     or (coupon.expires_at is not null and coupon.expires_at <= now())
     or (coupon.max_uses is not null and coupon.uses >= coupon.max_uses) then
    return query select false, 'Cupon no encontrado, inactivo o agotado.',
      null::text, null::text, null::numeric, null::text, null::numeric, null::numeric;
    return;
  end if;

  if coupon.min_order is not null and subtotal < coupon.min_order then
    return query select false, 'El pedido no alcanza el monto minimo del cupon.',
      null::text, null::text, null::numeric, null::text, coupon.min_order, null::numeric;
    return;
  end if;

  return query select
    true,
    null::text,
    coupon.code,
    coupon.type,
    coupon.value,
    coupon.description,
    coupon.min_order,
    case
      when coupon.type = 'percent'
        then round(subtotal * (coupon.value / 100), 2)
      else least(coupon.value, subtotal)
    end;
end;
$$;

revoke all on function public.validate_coupon(text, numeric) from public, anon;
grant execute on function public.validate_coupon(text, numeric) to authenticated, service_role;

-- Copy tickets are no longer anonymously enumerable/redeemable.
do $$
begin
  if to_regprocedure('public.validate_copy_ticket(text)') is not null then
    execute 'revoke execute on function public.validate_copy_ticket(text) from anon';
  end if;
  if to_regprocedure('public.redeem_copy_ticket(text,uuid)') is not null then
    execute 'revoke execute on function public.redeem_copy_ticket(text, uuid) from anon';
  end if;
end
$$;

-- Private order storage: clients can read their own files, but cannot upload
-- directly. The service-role Edge Function validates file signatures first.
drop policy if exists "authed_upload" on storage.objects;
drop policy if exists "owner_read" on storage.objects;
drop policy if exists "admins_storage" on storage.objects;
drop policy if exists "order_files_insert" on storage.objects;
drop policy if exists "order_files_admin_select" on storage.objects;
drop policy if exists "order_files_owner_insert" on storage.objects;
drop policy if exists "order_files_owner_select" on storage.objects;
drop policy if exists "order_files_admin_all" on storage.objects;
drop policy if exists "order_files_admin_update" on storage.objects;
drop policy if exists "order_files_admin_delete" on storage.objects;

create policy "order_files_owner_select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'order-files'
    and (storage.foldername(name))[1] = 'orders'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[2]
        and o.user_id = auth.uid()
    )
  );

create policy "order_files_admin_select" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'order-files' and public.is_copycenter_admin());

create policy "order_files_admin_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'order-files' and public.is_copycenter_admin())
  with check (bucket_id = 'order-files' and public.is_copycenter_admin());

create policy "order_files_admin_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'order-files' and public.is_copycenter_admin());

notify pgrst, 'reload schema';
commit;
