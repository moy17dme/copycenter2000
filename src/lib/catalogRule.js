export const isLinearService = key => ['planos_lineas','mimaki_uv'].includes(key?.servicio);
// Shared catalog range selection for storefront and POS. No prices live here.
export function resolveCatalogRule(rows, key, quantity, { legacyFirstMatch = false } = {}) {
  const qty = Number(quantity);
  if (isLinearService(key) ? !/^\d+(\.\d{1,2})?$/.test(String(quantity)) || qty<0.01 || qty>100000 : !Number.isInteger(qty) || qty < 1) return { error: 'Cantidad inválida' };
  const matches = rows.filter(row => row.activo !== false &&
    row.servicio === key.servicio && row.categoria_slug === key.categoria_slug &&
    row.variante_slug === key.variante_slug && row.formato_slug === key.formato_slug &&
    qty >= Number(row.min_cantidad ?? 0) && qty <= Number(row.max_cantidad ?? 9999999));
  if (!matches.length) return { error: 'Sin tarifa aprobada para esta cantidad' };
  if (matches.length > 1 && !legacyFirstMatch) return { error: 'Rangos de precio traslapados. Requiere revisión del administrador.' };
  const row = matches[0];
  if(qty<Number(row.min_largo_m||0))return {error:`El mínimo es ${row.min_largo_m} m para este material.`};
  const price = Number(row.precio);
  if (!Number.isFinite(price) || price <= 0) return { error: 'Precio pendiente de aprobación' };
  return { row, unit_cents: Math.round(price * 100) };
}
export function catalogGroups(rows) {
  return [...new Map(rows.filter(row => row.activo !== false).map(row => {
    const key = JSON.stringify([row.servicio,row.categoria_slug,row.variante_slug,row.formato_slug]);
    const service={copias:'Copias',impresion:'Impresión',engargolado:'Engargolado',planos_lineas:'Copias de planos · Solo líneas',mimaki_uv:'Mimaki UV'}[row.servicio]||row.servicio;
    const variant={negro:'B/N',color_laser:'Color láser',color_inyeccion_de_tinta:'Color inyección',metalico:'Metálico',plastico:'Plástico'}[row.variante_slug]||row.variante;
    return [key, { ...row, key, label: [service,row.servicio==='mimaki_uv'?row.categoria:'',variant,row.formato_slug==='servicio'?'':row.formato,row.servicio==='impresion'?row.categoria:''].filter(Boolean).join(' · ') }];
  })).values()];
}
const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/copais/g,'copias');
export function searchCatalog(groups,query){
  const tokens=normalize(query).trim().split(/\s+/).filter(Boolean);
  return groups.filter(group=>tokens.every(token=>normalize(`${group.label} ${group.servicio} ${group.variante} ${group.categoria}`).includes(token)))
    .sort((a,b)=>(a.formato_slug==='carta'?-1:0)-(b.formato_slug==='carta'?-1:0)||a.label.localeCompare(b.label,'es'));
}
