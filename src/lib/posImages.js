import { money, receiptText } from './pos.js';
import logoUrl from '../assets/LOGOcopy-330.webp';
export function closingText(day, summary, closed = false) {
  const expected = Number(summary.opening) + Number(summary.cash) + Number(summary.movements);
  return ['COPY CENTER 2000', closed ? `CORTE DE CAJA · ${day}` : `RESUMEN PREVIO · ${day}`,
    `Ventas: ${summary.count}`, `Total vendido: ${money(summary.total)} MXN`,
    `Total cobrado: ${money(summary.collected??(Number(summary.cash)+Number(summary.card)+Number(summary.transfer)))}`,
    `Efectivo cobrado: ${money(summary.cash)}`, `Tarjeta: ${money(summary.card)}`, `Transferencia: ${money(summary.transfer)}`,
    `Fondo inicial: ${money(summary.opening)}`, `Entradas / retiros: ${money(summary.movements)}`, `Efectivo esperado: ${money(expected)}`,
    closed ? `Efectivo contado: ${money(summary.counted)}` : 'Pendiente de conteo físico y cierre',
    closed ? `Diferencia: ${money(summary.difference)}` : '', 'Mostrador · Horario de México'].filter(Boolean).join('\n');
}
let logoPromise;
function loadLogo() {
  if (!logoPromise) logoPromise = new Promise((resolve,reject)=>{
    const logo=new Image();
    logo.onload=()=>resolve(logo);
    logo.onerror=()=>{logoPromise=null;reject(new Error('No se pudo cargar el logo. Reintenta descargar el ticket.'));};
    logo.src=logoUrl;
  });
  return logoPromise;
}
function wrapLines(text) {
  const ctx=document.createElement('canvas').getContext('2d');
  ctx.font='bold 26px Arial';
  const lines=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const char of paragraph){
      if(ctx.measureText(line+char).width>704){lines.push(line);line='';}
      line+=char;
    }
    lines.push(line);
  }
  return lines;
}
async function renderTicket(lines,footer='') {
  const logo=await loadLogo();
  const canvas=document.createElement('canvas');
  canvas.width=800;canvas.height=280+lines.length*42+(footer?42:0);
  if(canvas.height>30000)throw new Error('Este ticket es muy largo para una imagen. Descárgalo en PDF.');
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const width=420,height=width*logo.naturalHeight/logo.naturalWidth;
  ctx.drawImage(logo,(800-width)/2,28,width,height);
  ctx.strokeStyle='#cf2228';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(48,220);ctx.lineTo(752,220);ctx.stroke();
  ctx.fillStyle='#192434';ctx.font='26px Arial';
  lines.forEach((line,i)=>{
    ctx.font=/^(TOTAL:|ABONADO:|SALDO PENDIENTE:)/.test(line)?'bold 26px Arial':'26px Arial';
    ctx.fillText(line,48,266+i*42);
  });
  if(footer){ctx.font='22px Arial';ctx.fillStyle='#596579';ctx.fillText(footer,48,canvas.height-28);}
  return canvas;
}
function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function imageFile(text,filename,type) {
  const canvas=await renderTicket(wrapLines(text));
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,0.94));
  if(!blob)throw new Error('No se pudo generar la imagen. Prueba descargar el PDF.');
  return new File([blob],filename,{type});
}
async function shareFile(file) {
  if(navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:file.name});return 'Se abrió el menú para compartir. Elige WhatsApp y el destinatario.';}
    catch(error){if(error.name==='AbortError')return 'Se canceló el envío. Puedes compartir de nuevo.';}
  }
  downloadBlob(file,file.name);
  return 'Imagen descargada. Abre WhatsApp y adjúntala a la conversación.';
}
export async function sharePosImage(text,filename) {
  return shareFile(await imageFile(text,`${filename}.png`,'image/png'));
}
export async function shareReceiptImage(sale) {
  return shareFile(await imageFile(receiptText(sale),`ticket-${sale.folio}.jpg`,'image/jpeg'));
}
export async function downloadReceiptJpg(sale) {
  const file=await imageFile(receiptText(sale),`ticket-${sale.folio}.jpg`,'image/jpeg');
  downloadBlob(file,file.name);
  return 'Ticket JPG descargado. Puedes adjuntarlo en WhatsApp.';
}
export async function downloadReceiptPdf(sale) {
  const {jsPDF}=await import('jspdf');
  const pageLines=[[]];
  for(const paragraph of receiptText(sale).split('\n')){
    const group=wrapLines(paragraph);
    if(pageLines.at(-1).length+group.length>38)pageLines.push([]);
    for(const line of group){
      if(pageLines.at(-1).length===38)pageLines.push([]);
      pageLines.at(-1).push(line);
    }
  }
  const pages=pageLines.length;
  let pdf;
  for(let page=0;page<pages;page++){
    const canvas=await renderTicket(pageLines[page],`Ticket #${sale.folio} · Página ${page+1} de ${pages}`);
    const height=Math.max(80,canvas.height/10);
    if(!pdf)pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[80,height],compress:true});
    else pdf.addPage([80,height],'portrait');
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,80,canvas.height/10);
  }
  pdf.setProperties({title:`Ticket #${sale.folio} - Copy Center 2000`,creator:'Copy Center 2000'});
  downloadBlob(pdf.output('blob'),`ticket-${sale.folio}.pdf`);
  return 'Ticket PDF descargado. Puedes imprimirlo o adjuntarlo en WhatsApp.';
}
