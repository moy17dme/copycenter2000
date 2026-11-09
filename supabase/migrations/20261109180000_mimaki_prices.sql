begin;
alter table public.catalogo_precios add column min_largo_m numeric check(min_largo_m>0);
alter table public.catalogo_precios drop constraint catalogo_precios_servicio_check;
alter table public.catalogo_precios add constraint catalogo_precios_servicio_check check(servicio in ('impresion','engargolado','copias','planos_lineas','mimaki_uv'));
-- Owner requested only Mimaki prices; no competitor rates or extras are imported.
insert into public.catalogo_precios(servicio,categoria,categoria_slug,variante,variante_slug,formato,formato_slug,min_cantidad,max_cantidad,precio,rango_texto,activo,visible_publico,iva_modo,min_largo_m) values
('mimaki_uv','Vinil blanco brillante','vinil_brillante','CMYK','vinil_brillante','Ancho 1.50 m','metro_lineal',0,null,250,'Por metro lineal',true,true,'incluido',0.5),
('mimaki_uv','Vinil blanco mate','vinil_mate','CMYK','vinil_mate','Ancho 1.50 m','metro_lineal',0,null,250,'Por metro lineal',true,true,'incluido',0.5),
('mimaki_uv','Vinil transparente','transparente','CMYK','transparente','Ancho 1.50 m','metro_lineal',0,null,250,'Por metro lineal',true,true,'incluido',0.5),
('mimaki_uv','Vinil microperforado','microperforado','CMYK','microperforado','Ancho 1.50 m','metro_lineal',0,null,260,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Tela canvas','canvas','CMYK','canvas','Ancho 1.50 m','metro_lineal',0,null,405,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Tela para roll-up','roll_up','CMYK','roll_up','Ancho 0.85 m','metro_lineal',0,null,250,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Floor graphics','floor_graphics','CMYK','floor_graphics','Ancho 1.25 m','metro_lineal',0,null,330,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil estático transparente','estatico','CMYK','estatico','Ancho 1.50 m','metro_lineal',0,null,300,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Papel tapiz','tapiz','CMYK','tapiz','Ancho 1.35 m','metro_lineal',0,null,405,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Papel para póster','poster','CMYK','poster','Ancho 1.25 m','metro_lineal',0,null,350,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil transparente','transparente_blanco','CMYK + base blanca','transparente_blanco','Ancho 1.50 m','metro_lineal',0,null,350,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil transparente','transparente_barniz','CMYK + barniz','transparente_barniz','Ancho 1.50 m','metro_lineal',0,null,370,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil transparente','transparente_blanco_barniz','CMYK + blanco + barniz','transparente_blanco_barniz','Ancho 1.50 m','metro_lineal',0,null,470,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil transparente','transparente_58','Impresión','transparente_58','Ancho 0.58 m','metro_lineal',0,null,120,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Vinil transparente','transparente_corte_52','Impresión y corte','transparente_corte_52','Ancho 0.52 m','metro_lineal',0,null,145,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Tornasol','tornasol_58','Impresión','tornasol_58','Ancho 0.58 m','metro_lineal',0,null,180,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Tornasol','tornasol_corte_50','Impresión y corte','tornasol_corte_50','Ancho 0.50 m','metro_lineal',0,null,200,'Por metro lineal',true,true,'incluido',0.01),
('mimaki_uv','Tornasol','tornasol_blanco_50','Impresión, corte y blanco','tornasol_blanco_50','Ancho 0.50 m','metro_lineal',0,null,245,'Por metro lineal',true,true,'incluido',0.01);
create or replace function public.pos_validate_catalog_sale() returns trigger
language plpgsql security definer set search_path=public as $$
declare item jsonb; rule public.catalogo_precios; qty numeric; matches integer; result jsonb := '[]'::jsonb;
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
