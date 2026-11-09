begin;
alter table public.pos_sales drop constraint pos_sales_payment_check;
alter table public.pos_sales add constraint pos_sales_payment_check check(payment in ('cash','card','transfer','mixed'));
alter table public.pos_sales add column paid_cents bigint not null default 0 check(paid_cents>=0 and paid_cents<=total_cents);
alter table public.pos_sales add column balance_cents bigint generated always as (total_cents-paid_cents) stored;
create table public.pos_payment_batches (
  id uuid primary key,
  sale_id uuid not null references public.pos_sales(id),
  day date not null references public.pos_days(day),
  cash_received_cents bigint not null check(cash_received_cents between 0 and 100000000),
  change_cents bigint not null check(change_cents between 0 and cash_received_cents),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.pos_payments (
  batch_id uuid not null references public.pos_payment_batches(id),
  method text not null check(method in ('cash','card','transfer')),
  amount_cents bigint not null check(amount_cents between 1 and 100000000),
  primary key(batch_id,method)
);
create index on public.pos_payment_batches(sale_id,created_at);
create index on public.pos_payment_batches(day);
create index on public.pos_sales(created_at) where balance_cents>0;
-- Existing sales were fully paid. Preserve their actual dates and cash change.
insert into public.pos_payment_batches(id,sale_id,day,cash_received_cents,change_cents,created_by,created_at)
select id,id,day,case when payment='cash' then received_cents else 0 end,
  case when payment='cash' then received_cents-total_cents else 0 end,created_by,created_at from public.pos_sales;
insert into public.pos_payments(batch_id,method,amount_cents) select id,payment,total_cents from public.pos_sales;
update public.pos_sales set paid_cents=total_cents;
alter table public.pos_payment_batches enable row level security;
alter table public.pos_payments enable row level security;
revoke all on public.pos_payment_batches,public.pos_payments from public,anon,authenticated;
grant select on public.pos_payment_batches,public.pos_payments to authenticated;

create function public.pos_can_read_sale(p_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.pos_has_permission('view') and exists(select 1 from public.pos_sales s where s.id=p_id and
    (public.is_copycenter_admin() or (s.created_by=auth.uid() and
      (public.pos_has_permission('history') or s.day=(now() at time zone 'America/Mexico_City')::date or s.balance_cents>0
       or exists(select 1 from public.pos_payment_batches b where b.sale_id=s.id and b.day=(now() at time zone 'America/Mexico_City')::date)))));
$$;
drop policy pos_sales_staff on public.pos_sales;
create policy pos_sales_staff on public.pos_sales for select to authenticated using(public.pos_can_read_sale(id));
create policy pos_batches_read on public.pos_payment_batches for select to authenticated using(public.pos_can_read_sale(sale_id));
create policy pos_payments_read on public.pos_payments for select to authenticated using(exists(select 1 from public.pos_payment_batches b where b.id=batch_id));

create function public.pos_receipt(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.pos_can_read_sale(p_id) then raise exception 'Acceso denegado'; end if;
  select to_jsonb(s) || jsonb_build_object('payments',coalesce((
    select jsonb_agg(to_jsonb(b)||jsonb_build_object('methods',(select jsonb_agg(to_jsonb(p) order by method) from public.pos_payments p where p.batch_id=b.id)) order by b.created_at,b.id)
    from public.pos_payment_batches b where b.sale_id=s.id),'[]'::jsonb)) into result from public.pos_sales s where id=p_id;
  return result;
end $$;

-- Private transaction helper. Callers lock today's register, then the sale.
create function public.pos_apply_payment(p_id uuid,p_sale uuid,p_payments jsonb,p_cash_received bigint) returns void
language plpgsql security definer set search_path=public as $$
declare s public.pos_sales; part jsonb; amount numeric; total bigint:=0; cash bigint:=0; methods text[]:='{}';
  today date:=(now() at time zone 'America/Mexico_City')::date;
begin
  select * into s from public.pos_sales where id=p_sale for update;
  if jsonb_typeof(p_payments) is distinct from 'array' then raise exception 'Pagos inválidos'; end if;
  if jsonb_array_length(p_payments) not between 1 and 3 then raise exception 'Agrega entre uno y tres medios de pago'; end if;
  for part in select value from jsonb_array_elements(p_payments) loop
    amount:=(part->>'amount_cents')::numeric;
    if part->>'method' is null or part->>'method' not in ('cash','card','transfer') or part->>'method'=any(methods)
      or amount is null or amount not between 1 and 100000000 or amount<>trunc(amount) then raise exception 'Importe o medio de pago inválido'; end if;
    methods:=array_append(methods,part->>'method'); total:=total+amount::bigint;
    if part->>'method'='cash' then cash:=amount::bigint; end if;
  end loop;
  if total>s.balance_cents then raise exception 'El abono excede el saldo pendiente'; end if;
  if p_cash_received is null or p_cash_received not between cash and 100000000 or (cash=0 and p_cash_received<>0) then raise exception 'El efectivo recibido no cubre la parte en efectivo'; end if;
  insert into public.pos_payment_batches(id,sale_id,day,cash_received_cents,change_cents,created_by)
    values(p_id,p_sale,today,p_cash_received,p_cash_received-cash,auth.uid());
  insert into public.pos_payments(batch_id,method,amount_cents)
    select p_id,value->>'method',(value->>'amount_cents')::bigint from jsonb_array_elements(p_payments);
  update public.pos_sales set paid_cents=paid_cents+total,
    payment=(select case when count(distinct p.method)>1 then 'mixed' else min(p.method) end from public.pos_payments p join public.pos_payment_batches b on b.id=p.batch_id where b.sale_id=p_sale)
    where id=p_sale;
end $$;

create function public.pos_checkout(p_id uuid,p_items jsonb,p_payments jsonb,p_cash_received bigint,p_deposit boolean default false,p_name text default '',p_phone text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
declare today date:=(now() at time zone 'America/Mexico_City')::date; d public.pos_days; s public.pos_sales;
  item jsonb; qty numeric; price numeric; total bigint:=0;
begin
  if not public.pos_has_permission('sell') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  select * into s from public.pos_sales where id=p_id;
  if found then
    if s.created_by<>auth.uid() and not public.is_copycenter_admin() then raise exception 'Venta de otro empleado'; end if;
    return public.pos_receipt(p_id);
  end if;
  if d.day is null or d.closed_at is not null then raise exception 'Abre la caja del día antes de cobrar; una caja cerrada no admite ventas.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Partidas inválidas'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Agrega entre 1 y 50 partidas'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    qty:=(item->>'qty')::numeric; price:=(item->>'unit_cents')::numeric;
    if qty is null or price is null or qty not between 0.01 and 100000 or qty<>round(qty,2)
      or price not between 1 and 100000000 or price<>trunc(price)
      or length(trim(coalesce(item->>'name',''))) not between 1 and 120 then raise exception 'Partida inválida'; end if;
    -- Fractional quantities are authorized only by the catalog trigger for linear metres.
    if qty<>trunc(qty) and not (item ? 'catalog_rule_id') then raise exception 'Cantidad inválida'; end if;
    total:=total+round(qty*price)::bigint;
  end loop;
  if total not between 1 and 100000000 then raise exception 'El total excede el límite permitido'; end if;
  if p_deposit is null or length(coalesce(p_name,''))>120 or (coalesce(p_phone,'')<>'' and p_phone !~ '^[0-9]{10,15}$') then raise exception 'Datos del cliente inválidos'; end if;
  if p_deposit and length(trim(coalesce(p_name,'')))=0 then raise exception 'Escribe el nombre del cliente para identificar su saldo'; end if;
  insert into public.pos_sales(id,day,items,total_cents,payment,received_cents,customer_name,customer_phone,created_by)
    values(p_id,today,p_items,total,'mixed',p_cash_received,trim(coalesce(p_name,'')),coalesce(p_phone,''),auth.uid());
  perform public.pos_apply_payment(p_id,p_id,p_payments,p_cash_received);
  select * into s from public.pos_sales where id=p_id;
  if not p_deposit and s.balance_cents<>0 then raise exception 'El pago no cubre el total. Elige Anticipo para dejar saldo pendiente.'; end if;
  insert into public.pos_notifications(event_key,message) values('sale:'||p_id,
    'Venta #'||s.folio||' | Total $'||to_char(total/100.0,'FM999999990.00')||' | Cobrado $'||to_char(s.paid_cents/100.0,'FM999999990.00')||' | Saldo $'||to_char(s.balance_cents/100.0,'FM999999990.00'));
  return public.pos_receipt(p_id);
end $$;

create function public.pos_pay(p_id uuid,p_sale uuid,p_payments jsonb,p_cash_received bigint) returns jsonb
language plpgsql security definer set search_path=public as $$
declare today date:=(now() at time zone 'America/Mexico_City')::date; d public.pos_days; s public.pos_sales; prior public.pos_payment_batches;
begin
  if not public.pos_has_permission('sell') or auth.uid() is null then raise exception 'Acceso denegado'; end if;
  select * into d from public.pos_days where day=today for update;
  select * into s from public.pos_sales where id=p_sale for update;
  if not found or (s.created_by<>auth.uid() and not public.is_copycenter_admin()) then raise exception 'Venta no encontrada o de otro empleado'; end if;
  select * into prior from public.pos_payment_batches where id=p_id;
  if found then
    if prior.sale_id<>p_sale then raise exception 'Identificador de pago ya utilizado'; end if;
    return public.pos_receipt(p_sale);
  end if;
  if d.day is null or d.closed_at is not null then raise exception 'Abre la caja de hoy antes de recibir un abono'; end if;
  perform public.pos_apply_payment(p_id,p_sale,p_payments,p_cash_received);
  select * into s from public.pos_sales where id=p_sale;
  insert into public.pos_notifications(event_key,message) values('payment:'||p_id,'Abono a ticket #'||s.folio||' | Saldo $'||to_char(s.balance_cents/100.0,'FM999999990.00'));
  return public.pos_receipt(p_sale);
end $$;

-- Keep older clients compatible while recording every receipt in the ledger.
create or replace function public.pos_sell(p_id uuid,p_items jsonb,p_payment text,p_received bigint,p_name text default '',p_phone text default '') returns public.pos_sales
language plpgsql security definer set search_path=public as $$
declare total bigint; result public.pos_sales;
begin
  if p_payment is null or p_payment not in ('cash','card','transfer') then raise exception 'Forma de pago inválida'; end if;
  select sum(round((value->>'qty')::numeric*(value->>'unit_cents')::numeric)) into total from jsonb_array_elements(p_items);
  perform public.pos_checkout(p_id,p_items,jsonb_build_array(jsonb_build_object('method',p_payment,'amount_cents',total)),case when p_payment='cash' then p_received else 0 end,false,p_name,p_phone);
  select * into result from public.pos_sales where id=p_id;
  return result;
end $$;

create or replace function public.pos_summary(p_day date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; collected jsonb;
begin
  if not public.pos_has_permission('view') then raise exception 'Acceso denegado'; end if;
  if p_day<>(now() at time zone 'America/Mexico_City')::date and not public.pos_has_permission('history') then raise exception 'Sin permiso para consultar otros días'; end if;
  select jsonb_build_object('count',count(*),'total',coalesce(sum(total_cents),0)) into result from public.pos_sales where day=p_day;
  select jsonb_build_object('cash',coalesce(sum(p.amount_cents) filter(where method='cash'),0),
    'card',coalesce(sum(p.amount_cents) filter(where method='card'),0),'transfer',coalesce(sum(p.amount_cents) filter(where method='transfer'),0),
    'collected',coalesce(sum(p.amount_cents),0)) into collected from public.pos_payments p join public.pos_payment_batches b on b.id=p.batch_id where b.day=p_day;
  return result||collected||jsonb_build_object('opening',coalesce((select opening_cents from public.pos_days where day=p_day),0),
    'movements',coalesce((select sum(amount_cents) from public.pos_movements where day=p_day),0));
end $$;

create function public.pos_pending(p_query text default '') returns setof public.pos_sales
language sql stable security definer set search_path=public as $$
  select s.* from public.pos_sales s where public.pos_has_permission('sell') and (public.is_copycenter_admin() or s.created_by=auth.uid())
    and s.balance_cents>0 and (coalesce(p_query,'')='' or strpos(lower(s.customer_name||' '||s.customer_phone||' '||s.folio),lower(trim(p_query)))>0)
    order by s.created_at limit 200;
$$;
revoke all on function public.pos_apply_payment(uuid,uuid,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.pos_can_read_sale(uuid),public.pos_receipt(uuid),public.pos_checkout(uuid,jsonb,jsonb,bigint,boolean,text,text),public.pos_pay(uuid,uuid,jsonb,bigint),public.pos_pending(text) from public,anon,authenticated;
grant execute on function public.pos_can_read_sale(uuid),public.pos_receipt(uuid),public.pos_checkout(uuid,jsonb,jsonb,bigint,boolean,text,text),public.pos_pay(uuid,uuid,jsonb,bigint),public.pos_pending(text) to authenticated;
notify pgrst,'reload schema';
commit;
