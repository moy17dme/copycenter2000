begin;
alter table public.catalogo_precios add column ancho_rollo_cm integer;
alter table public.catalogo_precios drop constraint catalogo_precios_iva_modo_check;
alter table public.catalogo_precios add check (iva_modo in ('pendiente','incluido','exento','adicional'));
update public.catalogo_precios set
  ancho_rollo_cm=(substring(formato from '^Ancho ([0-9]+[.][0-9]+) m$')::numeric * 100)::integer,
  iva_modo='adicional', min_largo_m=0.01
where servicio='mimaki_uv';
alter table public.catalogo_precios add check (servicio<>'mimaki_uv' or
  (ancho_rollo_cm is not null and ancho_rollo_cm>4 and iva_modo='adicional' and min_largo_m is not null and min_largo_m=0.01));
create or replace function public.pos_validate_catalog_sale() returns trigger
language plpgsql security definer set search_path=public as $$
declare item jsonb; rule public.catalogo_precios; qty numeric; actual numeric; expected_cents bigint; matches integer; result jsonb := '[]'::jsonb;
begin
  for item in select value from jsonb_array_elements(new.items) loop
    if item ? 'catalog_rule_id' and item->>'catalog_rule_id' is not null then
      select * into rule from public.catalogo_precios where id=(item->>'catalog_rule_id')::uuid for share;
      if not found or not rule.activo then raise exception 'La tarifa ya no está activa'; end if;
      qty := case when rule.servicio='engargolado' then (item->>'pricing_quantity')::integer else (item->>'qty')::numeric end;
      if rule.servicio not in ('planos_lineas','mimaki_uv') and ((item->>'qty')::numeric<>trunc((item->>'qty')::numeric) or (item->>'qty')::numeric<1) then raise exception 'Cantidad inválida'; end if;
      if rule.min_largo_m is not null and qty<rule.min_largo_m then raise exception 'El largo no cubre el mínimo de producción de % metros',rule.min_largo_m; end if;
      if qty is null or qty<0.01 or qty<>round(qty,2) or qty<rule.min_cantidad or qty>coalesce(rule.max_cantidad,9999999) then raise exception 'Cantidad fuera de la tarifa'; end if;
      select count(*) into matches from public.catalogo_precios where activo=true and servicio=rule.servicio
        and categoria_slug=rule.categoria_slug and variante_slug=rule.variante_slug and formato_slug=rule.formato_slug
        and qty>=min_cantidad and qty<=coalesce(max_cantidad,9999999);
      if matches<>1 then raise exception 'Tarifas traslapadas; requiere revisión del administrador'; end if;
      expected_cents := round(rule.precio*100);
      if rule.servicio='mimaki_uv' then
        actual := (item->>'actual_m')::numeric;
        if actual is null or actual not between 0.01 and 100000 or actual<>round(actual,2)
          or qty<>(actual + case when actual<0.50 then 0.30 else 0 end) then
          raise exception 'Revisa el largo real y facturado de la tirada UV';
        end if;
        expected_cents := round(expected_cents * 1.16);
        item := item || jsonb_build_object('actual_m',actual,'waste_m',qty-actual,'iva_porcentaje',16);
      end if;
      if (item->>'unit_cents')::bigint<>expected_cents then raise exception 'El precio cambió. Actualiza el catálogo y revisa la venta antes de cobrar.'; end if;
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
