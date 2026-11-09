begin;
create table public.pos_team (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check(email=lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  user_id uuid unique references auth.users(id),
  display_name text not null check(length(trim(display_name)) between 1 and 100),
  role text not null check(role in ('designer','assistant')),
  enabled boolean not null default true,
  permissions jsonb not null default '{"sell":true,"open":true,"close":false,"move":false,"history":false}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table public.pos_team_audit (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.pos_team(id),
  actor uuid references auth.users(id),
  at timestamptz not null default now(),
  before_row jsonb,
  after_row jsonb not null
);
alter table public.pos_team enable row level security;
alter table public.pos_team_audit enable row level security;
revoke all on public.pos_team,public.pos_team_audit from public,anon,authenticated;
grant select on public.pos_team,public.pos_team_audit to authenticated;
grant select on public.pos_team to service_role;
create policy pos_team_read on public.pos_team for select to authenticated using(public.is_copycenter_admin() or user_id=auth.uid());
create policy pos_team_audit_read on public.pos_team_audit for select to authenticated using(public.is_copycenter_admin());

create function public.pos_has_permission(p_action text) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_copycenter_admin() or exists(
    select 1 from public.pos_team t join auth.users u on u.id=t.user_id
    where t.user_id=auth.uid() and t.enabled and u.email_confirmed_at is not null
    and lower(u.email)=t.email and (p_action='view' or t.permissions->p_action='true'::jsonb));
$$;

create function public.pos_access() returns jsonb
language plpgsql security definer set search_path=public as $$
declare member public.pos_team; current_email text;
begin
  if auth.uid() is null then return jsonb_build_object('allowed',false); end if;
  if public.is_copycenter_admin() then return jsonb_build_object('allowed',true,'admin',true,'permissions',
    jsonb_build_object('sell',true,'open',true,'close',true,'move',true,'history',true)); end if;
  select lower(email) into current_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if current_email is null then return jsonb_build_object('allowed',false); end if;
  update public.pos_team set user_id=auth.uid() where email=current_email and user_id is null and enabled;
  select * into member from public.pos_team where user_id=auth.uid() and email=current_email and enabled;
  if not found then return jsonb_build_object('allowed',false); end if;
  return jsonb_build_object('allowed',true,'admin',false,'name',member.display_name,'role',member.role,'permissions',member.permissions);
end $$;

create function public.pos_save_member(p_id uuid,p_email text,p_name text,p_role text,p_enabled boolean,p_permissions jsonb)
returns public.pos_team language plpgsql security definer set search_path=public as $$
declare previous public.pos_team; result public.pos_team; account_id uuid; normalized text:=lower(trim(p_email));
begin
  if not public.is_copycenter_admin() or auth.uid() is null then raise exception 'Solo el administrador puede gestionar empleados'; end if;
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' or
    exists(select 1 from jsonb_each(p_permissions) where key not in ('sell','open','close','move','history') or jsonb_typeof(value)<>'boolean') then raise exception 'Permisos inválidos'; end if;
  if p_enabled is null then raise exception 'Estado inválido'; end if;
  select id into account_id from auth.users where lower(email)=normalized;
  if p_id is not null then
    select * into previous from public.pos_team where id=p_id for update;
    if not found then raise exception 'Empleado no encontrado'; end if;
    if previous.email<>normalized then raise exception 'El correo no se puede cambiar. Desactiva este acceso y autoriza el nuevo correo.'; end if;
    update public.pos_team set display_name=trim(p_name),role=p_role,enabled=p_enabled,permissions=p_permissions,
      updated_at=now(),updated_by=auth.uid() where id=p_id returning * into result;
  else
    insert into public.pos_team(email,user_id,display_name,role,enabled,permissions,updated_by)
      values(normalized,account_id,trim(p_name),p_role,p_enabled,p_permissions,auth.uid()) returning * into result;
  end if;
  insert into public.pos_team_audit(team_id,actor,before_row,after_row)
    values(result.id,auth.uid(),case when p_id is not null then to_jsonb(previous) else null end,to_jsonb(result));
  return result;
end $$;

create policy pos_days_staff on public.pos_days for select to authenticated using(public.pos_has_permission('view') and (day=(now() at time zone 'America/Mexico_City')::date or public.pos_has_permission('history')));
create policy pos_sales_staff on public.pos_sales for select to authenticated using(public.pos_has_permission('view') and created_by=auth.uid() and (day=(now() at time zone 'America/Mexico_City')::date or public.pos_has_permission('history')));
create policy pos_movements_staff on public.pos_movements for select to authenticated using(public.pos_has_permission('view') and (created_by=auth.uid() or public.pos_has_permission('move') or public.pos_has_permission('close')) and (day=(now() at time zone 'America/Mexico_City')::date or public.pos_has_permission('history')));
create policy catalog_staff_read on public.catalogo_precios for select to authenticated using(activo=true and public.pos_has_permission('view'));
revoke all on function public.pos_has_permission(text),public.pos_access(),public.pos_save_member(uuid,text,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.pos_has_permission(text),public.pos_access(),public.pos_save_member(uuid,text,text,text,boolean,jsonb) to authenticated,service_role;

-- Existing transaction bodies are retained below with action-specific authorization.

create or replace function public.pos_summary(p_day date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.pos_has_permission('view') then raise exception 'Acceso denegado'; end if;
  if p_day<>(now() at time zone 'America/Mexico_City')::date and not public.pos_has_permission('history') then raise exception 'Sin permiso para consultar otros días'; end if;
  select jsonb_build_object('count',count(*),'total',coalesce(sum(total_cents),0),
    'cash',coalesce(sum(total_cents) filter(where payment='cash'),0),
    'card',coalesce(sum(total_cents) filter(where payment='card'),0),
    'transfer',coalesce(sum(total_cents) filter(where payment='transfer'),0)) into result
    from public.pos_sales where day=p_day;
  return result || jsonb_build_object('opening',coalesce((select opening_cents from public.pos_days where day=p_day),0),
    'movements',coalesce((select sum(amount_cents) from public.pos_movements where day=p_day),0));
end $$;

create or replace function public.pos_open(p_opening bigint) returns public.pos_days
language plpgsql security definer set search_path = public as $$
declare result public.pos_days; today date := (now() at time zone 'America/Mexico_City')::date;
begin
  if not public.pos_has_permission('open') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  insert into public.pos_days(day,opening_cents,opened_by) values(today,p_opening,auth.uid()) on conflict(day) do nothing;
  select * into result from public.pos_days where day=today;
  return result;
end $$;

create or replace function public.pos_sell(p_id uuid, p_items jsonb, p_payment text, p_received bigint, p_name text default '', p_phone text default '') returns public.pos_sales
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Mexico_City')::date;
  d public.pos_days; result public.pos_sales; item jsonb; total bigint := 0; qty numeric; price numeric; detail text := '';
begin
  if not public.pos_has_permission('sell') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  select * into result from public.pos_sales where id=p_id;
  if found then
    if result.created_by<>auth.uid() and not public.is_copycenter_admin() then raise exception 'Venta de otro empleado'; end if;
    return result;
  end if;
  if d.day is null or d.closed_at is not null then raise exception 'Abre la caja del día antes de cobrar; una caja cerrada no admite ventas.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Partidas inválidas'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Agrega entre 1 y 50 partidas'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    qty := (item->>'qty')::numeric; price := (item->>'unit_cents')::numeric;
    if qty is null or price is null or qty not between 1 and 100000 or qty<>trunc(qty)
      or price not between 1 and 100000000 or price<>trunc(price)
      or length(trim(coalesce(item->>'name',''))) not between 1 and 120 then raise exception 'Partida inválida'; end if;
    total := total + (qty * price)::bigint;
    detail := detail || (item->>'name') || ' x' || qty || ' $' || to_char(qty*price/100,'FM999999990.00') || '; ';
  end loop;
  if total > 100000000 then raise exception 'El total excede el límite permitido'; end if;
  if p_payment is null or p_payment not in ('cash','card','transfer') then raise exception 'Forma de pago inválida'; end if;
  if p_payment='cash' and (p_received is null or p_received < total or p_received>100000000) then raise exception 'El efectivo recibido no cubre el total'; end if;
  if length(coalesce(p_name,''))>120 or (coalesce(p_phone,'')<>'' and p_phone !~ '^[0-9]{10,15}$') then raise exception 'Datos del cliente inválidos'; end if;
  insert into public.pos_sales(id,day,items,total_cents,payment,received_cents,customer_name,customer_phone,created_by)
    values(p_id,today,p_items,total,p_payment,case when p_payment='cash' then p_received else total end,coalesce(p_name,''),coalesce(p_phone,''),auth.uid()) returning * into result;
  insert into public.pos_notifications(event_key,message) values('sale:'||p_id,
    'Venta #'||result.folio||' | '||today||' | '||detail||'Total MXN $'||to_char(total/100.0,'FM999999990.00')||' | '||p_payment);
  return result;
end $$;

create or replace function public.pos_move(p_id uuid,p_amount bigint,p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Mexico_City')::date; d public.pos_days;
begin
  if not public.pos_has_permission('move') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  if exists(select 1 from public.pos_movements where id=p_id) then return; end if;
  if d.day is null or d.closed_at is not null then raise exception 'La caja no está abierta'; end if;
  insert into public.pos_movements(id,day,amount_cents,reason,created_by) values(p_id,today,p_amount,trim(p_reason),auth.uid());
end $$;

create or replace function public.pos_close(p_day date,p_counted bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d public.pos_days; s jsonb; expected bigint;
begin
  if not public.pos_has_permission('close') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  if p_day<>(now() at time zone 'America/Mexico_City')::date and not public.pos_has_permission('history') then raise exception 'Sin permiso para consultar otros días'; end if;
  select * into d from public.pos_days where day=p_day for update;
  if d.day is null then raise exception 'Caja no encontrada'; end if;
  if d.closed_at is not null then return d.closing_summary; end if;
  if p_counted is null or p_counted not between 0 and 100000000 then raise exception 'Conteo inválido'; end if;
  s := public.pos_summary(p_day);
  expected := (s->>'opening')::bigint + (s->>'cash')::bigint + (s->>'movements')::bigint;
  s := s || jsonb_build_object('expected',expected,'counted',p_counted,'difference',p_counted-expected);
  update public.pos_days set closed_at=now(),closed_by=auth.uid(),counted_cents=p_counted,closing_summary=s where day=p_day;
  insert into public.pos_notifications(event_key,message) values('close:'||p_day,
    'Corte '||p_day||' | Ventas: '||(s->>'count')||' | Total MXN $'||to_char((s->>'total')::numeric/100,'FM999999990.00')||
    ' | Efectivo esperado $'||to_char(expected/100.0,'FM999999990.00')||' | Contado $'||to_char(p_counted/100.0,'FM999999990.00')||
    ' | Diferencia $'||to_char((p_counted-expected)/100.0,'FM999999990.00')) on conflict(event_key) do nothing;
  return s;
end $$;

-- profiles uses auth.users for email; never copy it into a nonexistent column.
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
