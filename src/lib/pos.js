export const PAYMENT_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
export const money = cents => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cents || 0) / 100);
export function businessDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function cents(value) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Escribe un importe válido, con máximo dos decimales.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100000000) throw new Error('Importe fuera del límite permitido.');
  return amount;
}
export function normalizePhone(value) {
  let digits = String(value).replace(/[\s()+-]/g, '');
  if (digits.length === 10) digits = `52${digits}`;
  if (!/^\d{10,15}$/.test(digits)) throw new Error('Escribe un teléfono válido con clave de país.');
  return digits;
}
export function receiptText(sale) {
  return ['COPY CENTER 2000', `Ticket de venta #${sale.folio}`, sale.day,
    sale.customer_name ? `Cliente: ${sale.customer_name}` : '',
    ...sale.items.map(i => `${i.name} · ${i.qty} × ${money(i.unit_cents)} = ${money(i.qty * i.unit_cents)}`),
    `TOTAL: ${money(sale.total_cents)} MXN`, `Pago: ${PAYMENT_LABELS[sale.payment]}`,
    sale.payment === 'cash' ? `Recibido: ${money(sale.received_cents)} · Cambio: ${money(sale.received_cents - sale.total_cents)}` : '',
    'Gracias por tu compra. Este ticket no es una factura fiscal.'].filter(Boolean).join('\n');
}
export function whatsappUrl(phone, text) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}
export function downloadText(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
