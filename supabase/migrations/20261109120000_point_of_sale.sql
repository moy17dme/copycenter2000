-- Counter sales are a separate ledger from online orders. All money is MXN cents.
begin;
create table public.pos_days (
  day date primary key,
  opening_cents bigint not null check (opening_cents between 0 and 100000000),
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  counted_cents bigint check (counted_cents between 0 and 100000000),
  closing_summary jsonb
);
create table public.pos_sales (
  id uuid primary key,
  folio bigint generated always as identity unique,
  day date not null references public.pos_days(day),
  items jsonb not null,
  total_cents bigint not null check(total_cents > 0),
  payment text not null check(payment in ('cash','card','transfer')),
  received_cents bigint not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.pos_sales(day, created_at);
create table public.pos_movements (
  id uuid primary key,
  day date not null references public.pos_days(day),
  amount_cents bigint not null check(amount_cents <> 0 and abs(amount_cents) <= 100000000),
  reason text not null check(length(reason) between 3 and 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.pos_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  message text not null,
  status text not null default 'pending' check(status in ('pending','processing','accepted','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  provider_id text,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.pos_days enable row level security;
alter table public.pos_sales enable row level security;
alter table public.pos_movements enable row level security;
alter table public.pos_notifications enable row level security;
revoke all on public.pos_days, public.pos_sales, public.pos_movements, public.pos_notifications from public, anon, authenticated;
grant select on public.pos_days, public.pos_sales, public.pos_movements, public.pos_notifications to authenticated;
grant all on public.pos_days, public.pos_sales, public.pos_movements, public.pos_notifications to service_role;
create policy pos_days_admin on public.pos_days for select to authenticated using(public.is_copycenter_admin());
create policy pos_sales_admin on public.pos_sales for select to authenticated using(public.is_copycenter_admin());
create policy pos_movements_admin on public.pos_movements for select to authenticated using(public.is_copycenter_admin());
create policy pos_notifications_admin on public.pos_notifications for select to authenticated using(public.is_copycenter_admin());

create function public.pos_summary(p_day date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_copycenter_admin() then raise exception 'Acceso denegado'; end if;
  select jsonb_build_object('count',count(*),'total',coalesce(sum(total_cents),0),
    'cash',coalesce(sum(total_cents) filter(where payment='cash'),0),
    'card',coalesce(sum(total_cents) filter(where payment='card'),0),
    'transfer',coalesce(sum(total_cents) filter(where payment='transfer'),0)) into result
    from public.pos_sales where day=p_day;
  return result || jsonb_build_object('opening',coalesce((select opening_cents from public.pos_days where day=p_day),0),
    'movements',coalesce((select sum(amount_cents) from public.pos_movements where day=p_day),0));
end $$;

create function public.pos_open(p_opening bigint) returns public.pos_days
language plpgsql security definer set search_path = public as $$
declare result public.pos_days; today date := (now() at time zone 'America/Mexico_City')::date;
begin
  if not public.is_copycenter_admin() or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  insert into public.pos_days(day,opening_cents,opened_by) values(today,p_opening,auth.uid()) on conflict(day) do nothing;
  select * into result from public.pos_days where day=today;
  return result;
end $$;

create function public.pos_sell(p_id uuid, p_items jsonb, p_payment text, p_received bigint, p_name text default '', p_phone text default '') returns public.pos_sales
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Mexico_City')::date;
  d public.pos_days; result public.pos_sales; item jsonb; total bigint := 0; qty numeric; price numeric; detail text := '';
begin
  if not public.is_copycenter_admin() or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  select * into result from public.pos_sales where id=p_id;
  if found then return result; end if;
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

create function public.pos_move(p_id uuid,p_amount bigint,p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Mexico_City')::date; d public.pos_days;
begin
  if not public.is_copycenter_admin() or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  if exists(select 1 from public.pos_movements where id=p_id) then return; end if;
  if d.day is null or d.closed_at is not null then raise exception 'La caja no está abierta'; end if;
  insert into public.pos_movements(id,day,amount_cents,reason,created_by) values(p_id,today,p_amount,trim(p_reason),auth.uid());
end $$;

create function public.pos_close(p_day date,p_counted bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d public.pos_days; s jsonb; expected bigint;
begin
  if not public.is_copycenter_admin() or auth.uid() is null then raise exception 'Acceso denegado'; end if;
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

-- Called only by the scheduled worker. Summaries remain distinct from physical cash counts.
create function public.pos_enqueue_daily() returns void
language plpgsql security definer set search_path = public as $$
declare d public.pos_days; s jsonb;
begin
  for d in select * from public.pos_days where day = (now() at time zone 'America/Mexico_City')::date
    and not exists(select 1 from public.pos_notifications where event_key='daily:'||day) order by day limit 30 loop
    s := public.pos_summary(d.day);
    insert into public.pos_notifications(event_key,message) values('daily:'||d.day,
      'Resumen previo al cierre '||d.day||' | Ventas hasta ahora: '||(s->>'count')||' | Total MXN $'||to_char((s->>'total')::numeric/100,'FM999999990.00')||
      ' | Efectivo $'||to_char((s->>'cash')::numeric/100,'FM999999990.00')||' | Tarjeta $'||to_char((s->>'card')::numeric/100,'FM999999990.00')||
      ' | Transferencia $'||to_char((s->>'transfer')::numeric/100,'FM999999990.00')||
      case when d.closed_at is null then ' | Pendiente contar y cerrar caja' else ' | Caja cerrada' end) on conflict(event_key) do nothing;
  end loop;
end $$;

create function public.pos_claim_notifications() returns setof public.pos_notifications
language sql security definer set search_path = public as $$
  update public.pos_notifications set status='processing',attempts=attempts+1,available_at=now()+interval '5 minutes'
  where id in (select id from public.pos_notifications where status in ('pending','processing')
    and available_at<=now() and attempts<5 order by created_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.pos_summary(date),public.pos_open(bigint),public.pos_sell(uuid,jsonb,text,bigint,text,text),public.pos_move(uuid,bigint,text),public.pos_close(date,bigint),public.pos_enqueue_daily(),public.pos_claim_notifications() from public,anon,authenticated;
grant execute on function public.pos_summary(date),public.pos_open(bigint),public.pos_sell(uuid,jsonb,text,bigint,text,text),public.pos_move(uuid,bigint,text),public.pos_close(date,bigint) to authenticated,service_role;
grant execute on function public.pos_enqueue_daily(),public.pos_claim_notifications() to service_role;
notify pgrst, 'reload schema';
commit;
