import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PAYMENT_LABELS, money, cents, businessDay, normalizePhone, receiptText, whatsappUrl, downloadText } from '../lib/pos';
import './PointOfSale.css';
import { resolveCatalogRule, isLinearService } from '../lib/catalogRule';
import { closingText, sharePosImage, shareReceiptImage, downloadReceiptJpg, downloadReceiptPdf } from '../lib/posImages';
import PosSearch from './PosSearch';
import PosPaymentFields from './PosPaymentFields';
import {blankPayment,validatePayment} from '../lib/posPayments';
import PosPending from './PosPending';

const blankItem = () => ({ name: '', qty: '1', price: '' });
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
const ADMIN_ACCESS={admin:true,permissions:{sell:true,open:true,close:true,move:true,history:true}};
export default function PointOfSale({access=ADMIN_ACCESS}) {
  const permissions=access.permissions||{};
  const [view,setView]=useState('sale');
  const [pendingLocked,setPendingLocked]=useState(false);
  const [day, setDay] = useState(businessDay);
  const [snapshot, setSnapshot] = useState(null);
  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState(blankPayment);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [opening, setOpening] = useState('0');
  const [counted, setCounted] = useState('');
  const [movement, setMovement] = useState('');
  const [reason, setReason] = useState('');
  const [direction, setDirection] = useState('out');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const locked = useRef(false);
  const saleRequest = useRef(null);
  const moveRequest = useRef(null);
  const readVersion = useRef(0);
  const reloadCatalog = useCallback(async () => {
    const { data, error } = await supabase.from('catalogo_precios').select('*').eq('activo',true).order('min_cantidad');
    setCatalogError(error ? 'No se pudo cargar el catálogo. Reintenta actualizarlo.' : '');
    if (!error) setCatalog(data || []);
  }, []);
  useEffect(() => { reloadCatalog(); }, [reloadCatalog]);

  const load = useCallback(async () => {
    const version = ++readVersion.current;
    setLoading(true);
    try {
      const results = await Promise.all([
        supabase.from('pos_days').select('*').eq('day', day).maybeSingle(),
        rpc('pos_summary', { p_day: day }),
        supabase.from('pos_sales').select('*').eq('day', day).order('created_at', { ascending: false }).limit(200),
        supabase.from('pos_movements').select('*').eq('day', day).order('created_at', { ascending: false }).limit(100),
        supabase.from('pos_notifications').select('id,status,last_error,event_key').order('created_at', { ascending: false }).limit(20),
      ]);
      for (const r of results) if (r?.error) throw r.error;
      if (version === readVersion.current) setSnapshot({ day, box: results[0].data, summary: results[1], sales: results[2].data, movements: results[3].data, notifications: results[4].data });
    } catch (e) {
      if (version === readVersion.current) { setSnapshot(null); setError(`No se pudo cargar la caja: ${e.message}. Si es la primera instalación, activa la migración de caja en Supabase.`); }
    } finally { if (version === readVersion.current) setLoading(false); }
  }, [day]);
  useEffect(() => { const counter = readVersion; setError(''); setConfirmClose(false); setCounted(''); load(); return () => { counter.current++; }; }, [load]);
  const run = async action => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); await load(); } catch (e) { setError(e.message || 'No se pudo completar la operación.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const current = snapshot?.day === day ? snapshot : null;
  const box = current?.box;
  const summary = box?.closing_summary || current?.summary;
  const expected = summary ? Number(summary.opening) + Number(summary.cash) + Number(summary.movements) : 0;
  const canSell = box && !box.closed_at && day === businessDay() && permissions.sell;
  const pricedItems = items.map(item => {
    if (!item.catalogKey) return item;
    const quote = resolveCatalogRule(catalog,item.catalogKey,item.catalogKey.servicio === 'engargolado' ? item.pages : item.qty);
    return {...item, price: quote.row ? (quote.unit_cents/100).toFixed(2) : '', billedQty:quote.billedQty, wasteCm:quote.wasteCm, pricingError:quote.error, catalog_rule_id:quote.row?.id};
  });
  let total = 0;
  try { total = pricedItems.reduce((sum, item) => sum + Math.round(cents(item.price || '0') * Number(item.billedQty ?? item.qty)), 0); } catch { /* Invalid edits are validated on submit. */ }
  const updateItem = (index, key, value) => setItems(previous => previous.map((item, i) => i === index ? { ...item, [key]: value } : item));
  function sell(event) {
    event.preventDefault();
    run(async () => {
      if (!saleRequest.current) {
        if (pricedItems.some(item=>item.pricingError)) throw new Error('Resuelve las partidas sin tarifa antes de cobrar.');
        const lines = pricedItems.map(item => ({ name: item.name.trim(), qty: Number(item.billedQty ?? item.qty), ...(item.billedQty !== undefined ? {actual_m:Number(item.qty)} : {}), unit_cents: cents(item.price),
          ...(item.catalog_rule_id ? {catalog_rule_id:item.catalog_rule_id,pricing_quantity:Number(item.catalogKey.servicio==='engargolado'?item.pages:item.qty)} : {}) }));
        if (lines.some(i => !i.name || !Number.isFinite(i.qty) || i.qty < 0.01 || i.qty!==Math.round(i.qty*100)/100 || i.qty > 100000 || i.unit_cents < 1)) throw new Error('Revisa descripción, cantidad y precio de cada partida.');
        const amount = lines.reduce((sum, i) => sum + Math.round(i.qty * i.unit_cents), 0);
        const tendered = validatePayment(amount,payment);
        if(payment.deposit&&!name.trim())throw new Error('Escribe el nombre del cliente para identificar su saldo.');
        saleRequest.current = {p_id:crypto.randomUUID(),p_items:lines,p_payments:tendered.payments,p_cash_received:tendered.received,p_deposit:payment.deposit,p_name:name.trim(),p_phone:phone.trim()?normalizePhone(phone):''};
      }
      // Preserve both ID and payload on ambiguous network failures: retry cannot double-charge.
      let saved;
      try { saved = await rpc('pos_checkout', saleRequest.current); }
      catch (e) {
        // PostgreSQL validation errors are definitive rollbacks; allow correction.
        if (/^(22|23|P0001)/.test(e.code || '')) saleRequest.current = null;
        throw e;
      }
      saleRequest.current = null; setReceipt(saved); setItems([]); setPayment(blankPayment()); setName(''); setPhone('');
      setNotice(`Venta #${saved.folio} guardada. Ya puedes compartir la imagen por WhatsApp.`);
    });
  }
  const frozen = busy || Boolean(saleRequest.current);
  return <section className="pos" aria-label="Caja y ventas">
    <header className="pos-header"><div><h2>Punto de venta</h2><p>Mostrador · MXN</p></div>
      <div className="pos-actions">{(view==='history'||view==='cash')&&permissions.history&&<label>Consultar día<input type="date" value={day} max={businessDay()} disabled={busy||pendingLocked} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label>}
        <button type="button" disabled={busy || loading||pendingLocked} onClick={()=>Promise.all([load(),reloadCatalog()])}>Actualizar</button></div></header>
    <nav className="pos-tabs" aria-label="Secciones del punto de venta">{[['sale','Vender'],['pending','Saldos pendientes'],['history','Tickets'],['cash','Caja y corte']].map(([key,label])=><button type="button" key={key} aria-pressed={view===key} disabled={busy||pendingLocked||Boolean(saleRequest.current)} onClick={()=>{setView(key);if(key==='sale'||key==='pending')setDay(businessDay());}}>{label}</button>)}</nav>
    {error && <p role="alert" className="pos-error">{error}</p>}
    {notice && <p role="status" className="pos-success">{notice}</p>}
    {loading && <p role="status">Cargando caja…</p>}
    {!loading && current && <>
      {!box && day === businessDay() && permissions.open && <form className="pos-opening" onSubmit={e => { e.preventDefault(); run(async () => { await rpc('pos_open', { p_opening: cents(opening) }); setNotice('Caja abierta. Ya puedes registrar ventas.'); }); }}>
        <div><h3>Abre la caja del día</h3><p>Cuenta el fondo inicial antes de la primera venta.</p></div>
        <label>Fondo inicial ($)<input type="number" min="0" max="1000000" step="0.01" required value={opening} onChange={e => setOpening(e.target.value)} /></label>
        <button className="pos-primary" disabled={busy}>Abrir caja</button></form>}
      {!box && day !== businessDay() && <p>No se abrió una caja en esta fecha.</p>}
      {!box && day===businessDay() && !permissions.open && <p>Pide a una persona autorizada que abra la caja de hoy.</p>}
      {view==='pending'&&permissions.sell&&<PosPending onLockChange={setPendingLocked} canCollect={canSell} onReceipt={saved=>{setReceipt(saved);setNotice(`Abono guardado en el ticket #${saved.folio}. Saldo pendiente: ${money(saved.balance_cents)}.`);}} onUpdated={load}/>}
      {box && <>
        {view==='cash'&&<div className="pos-summary" aria-label="Resumen del día">{[['Ventas', summary.count], ['Total vendido', money(summary.total)], ['Cobrado hoy', money(summary.collected??(Number(summary.cash)+Number(summary.card)+Number(summary.transfer)))], ['Efectivo cobrado', money(summary.cash)], ['Tarjeta', money(summary.card)], ['Transferencia', money(summary.transfer)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
        {box.closed_at&&<p className="pos-help">Caja cerrada. El corte está guardado y no admite más ventas.</p>}
        {!permissions.sell&&view==='sale'&&<p>Tu cuenta no tiene permiso para cobrar ventas.</p>}
        <div className="pos-layout pos-simple-layout">
          <div>{canSell && view==='sale' && <form onSubmit={sell}>
            <PosSearch catalog={catalog} disabled={frozen||items.length>=50} onAdd={item=>setItems(previous=>[...previous,item])}/>
            {catalogError&&<p role="alert">{catalogError} <button type="button" onClick={reloadCatalog}>Reintentar</button></p>}
            <fieldset disabled={frozen}><legend className="sr-only">Artículos de la venta</legend>
              {!items.length&&<p className="pos-empty">Busca un servicio y pulsa Agregar para comenzar.</p>}
              {pricedItems.map((item,i)=><div className="pos-cart-line" key={i}>
                <div className="pos-cart-name">{item.catalogKey?<strong>{item.name}</strong>:<label>Servicio especial<input required maxLength={120} value={item.name} onChange={e=>updateItem(i,'name',e.target.value)}/></label>}
                  {item.catalogKey?.servicio==='engargolado'&&<label>Hojas por engargolado<input type="number" min="1" max="100000" value={item.pages} onChange={e=>updateItem(i,'pages',e.target.value)}/></label>}</div>
                <label>{isLinearService(item.catalogKey)?'Largo en metros':'Cantidad'}<input required type="number" min={isLinearService(item.catalogKey)?"0.01":"1"} max="100000" step={isLinearService(item.catalogKey)?"0.01":"1"} value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)}/></label>
                {item.catalogKey?<div className="pos-line-amount"><span>{isLinearService(item.catalogKey)?'Precio por metro':'Precio unitario'}</span><strong>{item.pricingError?'—':money(Math.round(Number(item.price)*100))}</strong></div>:<label>Precio unitario ($)<input required type="number" min="0.01" max="1000000" step="0.01" value={item.price} onChange={e=>updateItem(i,'price',e.target.value)}/></label>}
                {item.billedQty !== undefined && <small>{item.wasteCm} cm de desperdicio · {item.billedQty.toFixed(2)} m facturados · IVA incluido en el total</small>}
                <div className="pos-line-amount"><span>Total</span><strong>{item.pricingError?'—':money(Math.round(Math.round(Number(item.price)*100)*Number(item.billedQty ?? item.qty)))}</strong></div>
                <button type="button" aria-label={`Quitar partida ${i+1}`} onClick={()=>setItems(items.filter((_,index)=>index!==i))}>Quitar</button>
                {item.pricingError&&<p role="alert" className="pos-line-error">{item.pricingError}</p>}
              </div>)}
              {access.admin&&<details><summary>Servicio especial con precio autorizado</summary><button type="button" disabled={items.length>=50} onClick={()=>setItems([...items,blankItem()])}>Agregar servicio especial</button></details>}
              <details open={payment.deposit||undefined}><summary>Datos del cliente {payment.deposit?'(nombre obligatorio)':'(opcional)'}</summary>
              <div className="pos-pair"><label>{payment.deposit?'Nombre del cliente':'Cliente (opcional)'}<input required={payment.deposit} maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
                <label>WhatsApp del cliente (opcional)<input type="tel" placeholder="771 123 4567" value={phone} onChange={e => setPhone(e.target.value)} /></label></div>
              </details>
              <PosPaymentFields total={total} value={payment} onChange={setPayment}/>
            </fieldset>
            <div className="pos-total"><strong>Total {money(total)}</strong></div>
            {saleRequest.current && <p role="status">La operación está pendiente de confirmar. Reintenta con los mismos datos para evitar duplicarla.</p>}
            <button className="pos-primary" disabled={busy || !items.length || pricedItems.some(item=>item.pricingError)}>{busy ? 'Guardando…' : saleRequest.current ? 'Reintentar confirmar venta' : 'Confirmar pago y guardar venta'}</button>
          </form>}
          {receipt && view!=='cash' && <div className="pos-receipt"><h3>Ticket #{receipt.folio}</h3><pre>{receiptText(receipt)}</pre><div className="pos-actions">
            <a className="pos-button" href={receipt.customer_phone ? whatsappUrl(receipt.customer_phone, receiptText(receipt)) : `https://wa.me/?text=${encodeURIComponent(receiptText(receipt))}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>
            <button disabled={busy} onClick={()=>run(async()=>setNotice(await downloadReceiptJpg(receipt)))}>Descargar JPG</button>
            <button disabled={busy} onClick={()=>run(async()=>setNotice(await downloadReceiptPdf(receipt)))}>Descargar PDF</button>
            <button disabled={busy} onClick={()=>run(async()=>setNotice(await shareReceiptImage(receipt)))}>Compartir imagen</button>
            <button onClick={() => setReceipt(null)}>Ocultar</button></div><p className="pos-help">WhatsApp abrirá el ticket preparado. Pulsa Enviar en la conversación para entregarlo.</p></div>}
          </div>
          {view==='cash'&&<aside className="pos-close"><h3>Corte de caja</h3><dl><div><dt>Fondo inicial</dt><dd>{money(summary.opening)}</dd></div><div><dt>Cobros en efectivo</dt><dd>{money(summary.cash)}</dd></div><div><dt>Entradas / retiros</dt><dd>{money(summary.movements)}</dd></div><div><dt>Efectivo esperado</dt><dd>{money(expected)}</dd></div></dl>
            {box.closed_at ? <><dl><div><dt>Efectivo contado</dt><dd>{money(summary.counted)}</dd></div><div><dt>Diferencia</dt><dd>{money(summary.difference)}</dd></div></dl><button onClick={() => downloadText(`corte-${day}.txt`, closingText(day,summary,true))}>Descargar corte</button></> : permissions.close ? <form onSubmit={e => { e.preventDefault(); if (!confirmClose) { setConfirmClose(true); return; } run(async () => { await rpc('pos_close', { p_day: day, p_counted: cents(counted) }); setConfirmClose(false); setNotice('Corte guardado. Ya puedes compartir su imagen por WhatsApp.'); }); }}>
              <label>Efectivo contado ($)<input required type="number" min="0" max="1000000" step="0.01" value={counted} disabled={busy} onChange={e => { setCounted(e.target.value); setConfirmClose(false); }} /></label>
              {counted !== '' && <p>Diferencia: {money(Math.round(Number(counted) * 100) - expected)}</p>}
              {confirmClose && <p role="alert">Al cerrar ya no podrás agregar ventas a esta fecha. Confirma que terminaste de cobrar y contar.</p>}
              <button className="pos-primary" disabled={busy}>{confirmClose ? 'Confirmar cierre definitivo' : 'Revisar y cerrar caja'}</button>{confirmClose && <button type="button" onClick={() => setConfirmClose(false)}>Seguir trabajando</button>}
            </form>:<p className="pos-help">Solo una persona con permiso para cerrar caja puede guardar el corte.</p>}
            <div className="pos-actions"><button disabled={busy} onClick={()=>run(async()=>setNotice(await sharePosImage(closingText(day,summary,Boolean(box.closed_at)),`corte-${day}`)))}>Compartir imagen del {box.closed_at?'corte':'resumen'}</button>
            <a className="pos-button" href={whatsappUrl('527712368040',closingText(day,summary,Boolean(box.closed_at)))} target="_blank" rel="noreferrer">Abrir WhatsApp del propietario</a></div>
            <p className="pos-help">Envía la captura a +52 771 236 8040: lunes a viernes 19:25; sábados 14:50. El envío es manual. En computadora, descarga la imagen y adjúntala en WhatsApp.</p>
          </aside>}
        </div>
        {view==='cash' && box && !box.closed_at && permissions.move && day===businessDay() && <details className="pos-movements"><summary>Registrar entrada o retiro de efectivo</summary><form onSubmit={e => { e.preventDefault(); run(async () => {
          if (!moveRequest.current) { const amount = cents(movement); if (!amount) throw new Error('El importe debe ser mayor que cero.'); moveRequest.current = { p_id: crypto.randomUUID(), p_amount: amount * (direction === 'out' ? -1 : 1), p_reason: reason }; }
          try { await rpc('pos_move', moveRequest.current); } catch (e) { if (/^(22|23|P0001)/.test(e.code || '')) moveRequest.current = null; throw e; }
          moveRequest.current = null; setMovement(''); setReason(''); setNotice('Movimiento guardado.');
        }); }}><fieldset disabled={busy || Boolean(moveRequest.current)} className="pos-pair"><label>Tipo<select value={direction} onChange={e => setDirection(e.target.value)}><option value="out">Retiro / gasto</option><option value="in">Entrada de efectivo</option></select></label><label>Importe ($)<input required type="number" min="0.01" max="1000000" step="0.01" value={movement} onChange={e => setMovement(e.target.value)} /></label><label>Motivo<input required minLength={3} maxLength={200} value={reason} onChange={e => setReason(e.target.value)} /></label></fieldset><button disabled={busy}>{moveRequest.current ? 'Reintentar movimiento' : 'Guardar movimiento'}</button></form></details>}
        {view==='cash' && current.movements.length > 0 && <details><summary>Movimientos del día ({current.movements.length})</summary><ul>{current.movements.map(m => <li key={m.id}>{m.reason}: {money(m.amount_cents)}</li>)}</ul></details>}
        {view==='history'&&<><h3 className="pos-history-title">{access.admin?'Ventas del día':'Mis ventas del día'}</h3>
        {!current.sales.length ? <p>Aún no hay ventas registradas en esta caja.</p> : <div className="pos-table-wrap"><table><caption>Últimas 200 ventas. El corte incluye todas las ventas del día.</caption><thead><tr><th>Ticket</th><th>Hora</th><th>Detalle</th><th>Pago</th><th>Total</th><th>Saldo</th><th>Comprobante</th></tr></thead><tbody>{current.sales.map(sale => <tr key={sale.id}><td>#{sale.folio}</td><td>{new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }).format(new Date(sale.created_at))}</td><td>{sale.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</td><td>{PAYMENT_LABELS[sale.payment]}</td><td>{money(sale.total_cents)}</td><td>{money(sale.balance_cents)}</td><td><button disabled={busy} onClick={() => run(async()=>setReceipt(await rpc('pos_receipt',{p_id:sale.id})))}>Ver ticket</button></td></tr>)}</tbody></table></div>}</>}
      </>}
      {access.admin&&view==='cash'&&<details className="pos-notifications"><summary>Últimos avisos preparados</summary><p className="pos-help">Comparte las imágenes desde cada ticket o desde el corte. La página no puede confirmar el envío manual en WhatsApp.</p><ul>{current.notifications.map(n => <li key={n.id}>{n.event_key.startsWith('sale:') ? 'Venta' : n.event_key.startsWith('close:') ? 'Corte' : n.event_key.startsWith('payment:')?'Abono':'Resumen'}: {{ pending: 'Preparado para compartir', processing: 'Procesando', accepted: 'Aceptado por WhatsApp', failed: 'Falló el envío' }[n.status]}{n.last_error ? ` · ${n.last_error}` : ''}</li>)}</ul>{!current.notifications.length && <p>Los avisos aparecerán al registrar una venta o un corte.</p>}</details>}
    </>}
  </section>;
}
