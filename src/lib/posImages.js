import { money, receiptText } from './pos.js';
export function closingText(day, summary, closed = false) {
  const expected = Number(summary.opening) + Number(summary.cash) + Number(summary.movements);
  return ['COPY CENTER 2000', closed ? `CORTE DE CAJA · ${day}` : `RESUMEN PREVIO · ${day}`,
    `Ventas: ${summary.count}`, `Total vendido: ${money(summary.total)} MXN`,
    `Efectivo: ${money(summary.cash)}`, `Tarjeta: ${money(summary.card)}`, `Transferencia: ${money(summary.transfer)}`,
    `Fondo inicial: ${money(summary.opening)}`, `Entradas / retiros: ${money(summary.movements)}`, `Efectivo esperado: ${money(expected)}`,
    closed ? `Efectivo contado: ${money(summary.counted)}` : 'Pendiente de conteo físico y cierre',
    closed ? `Diferencia: ${money(summary.difference)}` : '', 'Mostrador · Horario de México'].filter(Boolean).join('\n');
}
export async function sharePosImage(text, filename) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  const ctx = canvas.getContext('2d');
  ctx.font = '26px Arial';
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    // Wrap long names as well as words, so no customer text can escape the image.
    for (const char of paragraph) {
      if (ctx.measureText(line + char).width > 704) { lines.push(line); line = ''; }
      line += char;
    }
    lines.push(line);
  }
  canvas.height = 112 + lines.length * 42;
  ctx.fillStyle = '#f8f7f3'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#192434'; ctx.font = '26px Arial';
  lines.forEach((line,i) => ctx.fillText(line,48,64+i*42));
  const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  const file = new File([blob],`${filename}.png`,{type:'image/png'});
  if (navigator.canShare?.({files:[file]})) {
    try { await navigator.share({files:[file],title:filename}); return 'Se abrió el menú para compartir. Elige WhatsApp y el destinatario.'; }
    catch(error) { if(error.name==='AbortError') return 'Se canceló el envío. Puedes compartir de nuevo.'; }
  }
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href=url; link.download=file.name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  return 'Imagen descargada. Abre WhatsApp y adjúntala a la conversación.';
}
export const shareReceiptImage = sale => sharePosImage(receiptText(sale),`ticket-${sale.folio}`);
