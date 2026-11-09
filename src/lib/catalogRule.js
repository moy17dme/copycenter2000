// Shared catalog range selection for storefront and POS. No prices live here.
export function resolveCatalogRule(rows, key, quantity, { legacyFirstMatch = false } = {}) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) return { error: 'Cantidad inválida' };
  const matches = rows.filter(row => row.activo !== false &&
    row.servicio === key.servicio && row.categoria_slug === key.categoria_slug &&
    row.variante_slug === key.variante_slug && row.formato_slug === key.formato_slug &&
    qty >= Number(row.min_cantidad ?? 0) && qty <= Number(row.max_cantidad ?? 9999999));
  if (!matches.length) return { error: 'Sin tarifa aprobada para esta cantidad' };
  if (matches.length > 1 && !legacyFirstMatch) return { error: 'Rangos de precio traslapados. Requiere revisión del administrador.' };
  const row = matches[0];
  const price = Number(row.precio);
  if (!Number.isFinite(price) || price <= 0) return { error: 'Precio pendiente de aprobación' };
  return { row, unit_cents: Math.round(price * 100) };
}
export function catalogGroups(rows) {
  return [...new Map(rows.filter(row => row.activo !== false).map(row => {
    const key = JSON.stringify([row.servicio,row.categoria_slug,row.variante_slug,row.formato_slug]);
    return [key, { ...row, key, label: [row.servicio,row.categoria,row.variante,row.formato].filter(Boolean).join(' · ') }];
  })).values()];
}
