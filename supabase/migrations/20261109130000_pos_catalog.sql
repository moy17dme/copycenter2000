begin;
alter table public.catalogo_precios add column if not exists visible_publico boolean not null default true;
alter table public.catalogo_precios add column if not exists iva_modo text not null default 'pendiente'
  check (iva_modo in ('pendiente','incluido','exento'));
-- Tax treatment requires commercial approval. Never silently add tax to legacy prices.
create table public.catalogo_precios_history (
  id bigint generated always as identity primary key,
  price_id uuid not null,
  actor uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  before_row jsonb,
  after_row jsonb not null
);
alter table public.catalogo_precios_history enable row level security;
revoke all on public.catalogo_precios_history from public,anon,authenticated;
grant select on public.catalogo_precios_history to authenticated;
create policy catalog_history_admin on public.catalogo_precios_history for select to authenticated using(public.is_copycenter_admin());
create index on public.catalogo_precios_history(price_id,changed_at desc);
create function public.audit_catalog_price() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.precio is null or new.precio<=0 or new.precio>1000000 then raise exception 'Precio inválido'; end if;
  if new.min_cantidad is null or new.min_cantidad<0 or (new.max_cantidad is not null and new.max_cantidad<new.min_cantidad) then raise exception 'Rango inválido'; end if;
  insert into public.catalogo_precios_history(price_id,actor,before_row,after_row)
    values(new.id,auth.uid(),case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end $$;
create trigger catalog_price_audit after insert or update on public.catalogo_precios for each row execute function public.audit_catalog_price();
drop policy if exists catalogo_precios_public_read on public.catalogo_precios;
create policy catalogo_precios_public_read on public.catalogo_precios for select to anon,authenticated using(activo=true and visible_publico=true);
create policy catalogo_precios_admin_read on public.catalogo_precios for select to authenticated using(public.is_copycenter_admin());
create policy catalogo_precios_admin_update on public.catalogo_precios for update to authenticated using(public.is_copycenter_admin()) with check(public.is_copycenter_admin());
create policy catalogo_precios_admin_insert on public.catalogo_precios for insert to authenticated with check(public.is_copycenter_admin());
grant select,insert,update on public.catalogo_precios to authenticated;
grant select on public.catalogo_precios to anon;

create function public.pos_validate_catalog_sale() returns trigger
language plpgsql security definer set search_path=public as $$
declare item jsonb; rule public.catalogo_precios; qty integer; matches integer; result jsonb := '[]'::jsonb;
begin
  for item in select value from jsonb_array_elements(new.items) loop
    if item ? 'catalog_rule_id' and item->>'catalog_rule_id' is not null then
      select * into rule from public.catalogo_precios where id=(item->>'catalog_rule_id')::uuid for share;
      if not found or not rule.activo then raise exception 'La tarifa ya no está activa'; end if;
      qty := case when rule.servicio='engargolado' then (item->>'pricing_quantity')::integer else (item->>'qty')::integer end;
      if qty is null or qty<1 or qty<rule.min_cantidad or qty>coalesce(rule.max_cantidad,9999999) then raise exception 'Cantidad fuera de la tarifa'; end if;
      select count(*) into matches from public.catalogo_precios where activo=true and servicio=rule.servicio
        and categoria_slug=rule.categoria_slug and variante_slug=rule.variante_slug and formato_slug=rule.formato_slug
        and qty>=min_cantidad and qty<=coalesce(max_cantidad,9999999);
      if matches<>1 then raise exception 'Tarifas traslapadas; requiere revisión del administrador'; end if;
      if (item->>'unit_cents')::bigint<>round(rule.precio*100)::bigint then raise exception 'El precio cambió. Actualiza el catálogo y revisa la venta antes de cobrar.'; end if;
      item := item || jsonb_build_object('catalog_snapshot',to_jsonb(rule),'pricing_quantity',qty);
    else
      if not public.is_copycenter_admin() then raise exception 'El precio especial requiere autorización del administrador'; end if;
      item := item || jsonb_build_object('special_price_authorized_by',auth.uid());
    end if;
    result := result || jsonb_build_array(item);
  end loop;
  new.items := result;
  return new;
end $$;
create trigger pos_catalog_snapshot before insert on public.pos_sales for each row execute function public.pos_validate_catalog_sale();
revoke all on function public.audit_catalog_price(), public.pos_validate_catalog_sale() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
