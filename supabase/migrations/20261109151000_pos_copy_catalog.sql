-- Import existing public COPIAS tariffs from src/data/priceList.js, without inventing missing ranges.
-- Existing catalog rows are never overwritten. 5000-9999 B/N remains unpriced, as in the source.
begin;
-- Expand the legacy allowed services without changing or deleting existing rows.
alter table public.catalogo_precios drop constraint if exists catalogo_precios_servicio_check;
alter table public.catalogo_precios add constraint catalogo_precios_servicio_check
  check (servicio in ('impresion','engargolado','copias'));
insert into public.catalogo_precios(id,servicio,categoria,categoria_slug,variante,variante_slug,formato,formato_slug,min_cantidad,max_cantidad,precio,rango_texto,activo)
select gen_random_uuid(),v.*,case when v.max_cantidad is null then v.min_cantidad||' en adelante' else v.min_cantidad||' a '||v.max_cantidad end,true from (values
('copias','Copias','copias','B/N','negro','Carta','carta',1,99,1),
('copias','Copias','copias','B/N','negro','Oficio','oficio',1,99,1.5),
('copias','Copias','copias','B/N','negro','Doble Carta','doble_carta',1,99,6),
('copias','Copias','copias','B/N','negro','Carta','carta',100,499,0.7),
('copias','Copias','copias','B/N','negro','Oficio','oficio',100,499,1),
('copias','Copias','copias','B/N','negro','Doble Carta','doble_carta',100,499,6),
('copias','Copias','copias','B/N','negro','Carta','carta',500,999,0.7),
('copias','Copias','copias','B/N','negro','Oficio','oficio',500,999,0.9),
('copias','Copias','copias','B/N','negro','Doble Carta','doble_carta',500,999,5.5),
('copias','Copias','copias','B/N','negro','Carta','carta',1000,4999,0.7),
('copias','Copias','copias','B/N','negro','Oficio','oficio',1000,4999,0.9),
('copias','Copias','copias','B/N','negro','Doble Carta','doble_carta',1000,4999,5),
('copias','Copias','copias','B/N','negro','Carta','carta',10000,49999,0.6),
('copias','Copias','copias','B/N','negro','Oficio','oficio',10000,49999,0.9),
('copias','Copias','copias','B/N','negro','Doble Carta','doble_carta',10000,49999,4.5),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',1,49,8),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',1,49,10),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',1,49,15),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',50,99,7.5),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',50,99,9.5),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',50,99,14.5),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',100,499,7),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',100,499,9.2),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',100,499,14),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',500,999,6.5),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',500,999,9),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',500,999,13.5),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',1000,4999,6),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',1000,4999,8.6),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',1000,4999,13),
('copias','Copias','copias','Color láser','color_laser','Carta','carta',5000,9999999,5.5),
('copias','Copias','copias','Color láser','color_laser','Oficio','oficio',5000,9999999,8.2),
('copias','Copias','copias','Color láser','color_laser','Doble Carta','doble_carta',5000,9999999,12.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',1,49,3),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',1,49,4),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',1,49,12),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',50,99,2.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',50,99,3.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',50,99,11.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',100,499,2),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',100,499,3),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',100,499,11),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',500,999,2.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',500,999,3),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',500,999,10.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',1000,4999,2),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',1000,4999,2.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',1000,4999,10),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Carta','carta',5000,9999999,1.8),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Oficio','oficio',5000,9999999,2.5),
('copias','Copias','copias','Color inyección','color_inyeccion_de_tinta','Doble Carta','doble_carta',5000,9999999,9.5)
) as v(servicio,categoria,categoria_slug,variante,variante_slug,formato,formato_slug,min_cantidad,max_cantidad,precio)
where not exists(select 1 from public.catalogo_precios c where c.servicio=v.servicio and c.categoria_slug=v.categoria_slug and c.variante_slug=v.variante_slug and c.formato_slug=v.formato_slug and c.min_cantidad=v.min_cantidad and c.max_cantidad is not distinct from v.max_cantidad);
notify pgrst,'reload schema';
commit;
