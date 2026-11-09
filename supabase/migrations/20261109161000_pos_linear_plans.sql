begin;
alter table public.catalogo_precios drop constraint catalogo_precios_servicio_check;
alter table public.catalogo_precios add constraint catalogo_precios_servicio_check check(servicio in ('impresion','engargolado','copias','planos_lineas'));
-- User-approved rates, per linear metre, measured to centimetres (0.01 m).
insert into public.catalogo_precios(servicio,categoria,categoria_slug,variante,variante_slug,formato,formato_slug,min_cantidad,max_cantidad,precio,rango_texto,activo,visible_publico)
values ('planos_lineas','Copias de planos, solo líneas','planos_solo_lineas','Blanco y negro','negro','Metro lineal','metro_lineal',0,null,30,'Por metro lineal',true,false),
('planos_lineas','Copias de planos, solo líneas','planos_solo_lineas','Color','color','Metro lineal','metro_lineal',0,null,60,'Por metro lineal',true,false);
create or replace function public.pos_validate_catalog_sale() returns trigger
language plpgsql security definer set search_path=public as $$
declare item jsonb; rule public.catalogo_precios; qty numeric; matches integer; result jsonb := '[]'::jsonb;
begin
  for item in select value from jsonb_array_elements(new.items) loop
    if item ? 'catalog_rule_id' and item->>'catalog_rule_id' is not null then
      select * into rule from public.catalogo_precios where id=(item->>'catalog_rule_id')::uuid for share;
      if not found or not rule.activo then raise exception 'La tarifa ya no está activa'; end if;
      qty := case when rule.servicio='engargolado' then (item->>'pricing_quantity')::integer else (item->>'qty')::numeric end;
      if rule.servicio<>'planos_lineas' and ((item->>'qty')::numeric<>trunc((item->>'qty')::numeric) or (item->>'qty')::numeric<1) then raise exception 'Cantidad inválida'; end if;
      if qty is null or qty<0.01 or qty<>round(qty,2) or qty<rule.min_cantidad or qty>coalesce(rule.max_cantidad,9999999) then raise exception 'Cantidad fuera de la tarifa'; end if;
      select count(*) into matches from public.catalogo_precios where activo=true and servicio=rule.servicio
        and categoria_slug=rule.categoria_slug and variante_slug=rule.variante_slug and formato_slug=rule.formato_slug
        and qty>=min_cantidad and qty<=coalesce(max_cantidad,9999999);
      if matches<>1 then raise exception 'Tarifas traslapadas; requiere revisión del administrador'; end if;
      if (item->>'unit_cents')::bigint<>round(rule.precio*100)::bigint then raise exception 'El precio cambió. Actualiza el catálogo y revisa la venta antes de cobrar.'; end if;
      item := item || jsonb_build_object('catalog_snapshot',to_jsonb(rule),'pricing_quantity',qty);
    else
      if not public.is_copycenter_admin() then raise exception 'El precio especial requiere autorización del administrador'; end if;
      if (item->>'qty')::numeric<>trunc((item->>'qty')::numeric) or (item->>'qty')::numeric<1 then raise exception 'Cantidad inválida'; end if;
      item := item || jsonb_build_object('special_price_authorized_by',auth.uid());
    end if;
    result := result || jsonb_build_array(item);
  end loop;
  new.items := result;
  return new;
end $$;
notify pgrst,'reload schema';
commit;
