import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PAYMENT_LABELS, money, cents, businessDay, normalizePhone, receiptText, whatsappUrl, downloadText } from '../lib/pos';
import './PointOfSale.css';
import { catalogGroups, resolveCatalogRule } from '../lib/catalogRule';
import { closingText, sharePosImage, shareReceiptImage } from '../lib/posImages';

const blankItem = () => ({ name: '', qty: '1', price: '' });
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export default function PointOfSale() {
  const [day, setDay] = useState(businessDay);
  const [snapshot, setSnapshot] = useState(null);
  const [items, setItems] = useState([blankItem()]);
  const [payment, setPayment] = useState('cash');
  const [received, setReceived] = useState('');
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
  const [search, setSearch] = useState('');
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
  const canSell = box && !box.closed_at && day === businessDay();
  const pricedItems = items.map(item => {
    if (!item.catalogKey) return item;
    const quote = resolveCatalogRule(catalog,item.catalogKey,item.catalogKey.servicio === 'engargolado' ? item.pages : item.qty);
    return {...item, price: quote.row ? (quote.unit_cents/100).toFixed(2) : '', pricingError:quote.error, catalog_rule_id:quote.row?.id};
  });
  let total = 0;
  try { total = pricedItems.reduce((sum, item) => sum + cents(item.price || '0') * Number(item.qty), 0); } catch { /* Invalid edits are validated on submit. */ }
  let change = null;
  try { change = cents(received) - total; } catch { /* Empty amount. */ }
  const updateItem = (index, key, value) => setItems(previous => previous.map((item, i) => i === index ? { ...item, [key]: value } : item));
  function sell(event) {
    event.preventDefault();
    run(async () => {
      if (!saleRequest.current) {
        if (pricedItems.some(item=>item.pricingError)) throw new Error('Resuelve las partidas sin tarifa antes de cobrar.');
        const lines = pricedItems.map(item => ({ name: item.name.trim(), qty: Number(item.qty), unit_cents: cents(item.price),
          ...(item.catalog_rule_id ? {catalog_rule_id:item.catalog_rule_id,pricing_quantity:Number(item.catalogKey.servicio==='engargolado'?item.pages:item.qty)} : {}) }));
        if (lines.some(i => !i.name || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 100000 || i.unit_cents < 1)) throw new Error('Revisa descripción, cantidad y precio de cada partida.');
        const amount = lines.reduce((sum, i) => sum + i.qty * i.unit_cents, 0);
        const tendered = payment === 'cash' ? cents(received) : amount;
        if (tendered < amount) throw new Error('El efectivo recibido no cubre el total.');
        saleRequest.current = { p_id: crypto.randomUUID(), p_items: lines, p_payment: payment, p_received: tendered, p_name: name.trim(), p_phone: phone.trim() ? normalizePhone(phone) : '' };
      }
      // Preserve both ID and payload on ambiguous network failures: retry cannot double-charge.
      let saved;
      try { saved = await rpc('pos_sell', saleRequest.current); }
      catch (e) {
        // PostgreSQL validation errors are definitive rollbacks; allow correction.
        if (/^(22|23|P0001)/.test(e.code || '')) saleRequest.current = null;
        throw e;
      }
      saleRequest.current = null; setReceipt(saved); setItems([blankItem()]); setReceived(''); setName(''); setPhone('');
      setNotice(`Venta #${saved.folio} guardada. Ya puedes compartir la imagen por WhatsApp.`);
    });
  }
  const frozen = busy || Boolean(saleRequest.current);
  return <section className="pos" aria-label="Caja y ventas">
    <header className="pos-header"><div><h2>Caja y ventas</h2><p>Mostrador · MXN · Horario de México</p></div>
      <div className="pos-actions"><label>Consultar día<input type="date" value={day} max={businessDay()} disabled={busy} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label>
        <button type="button" disabled={busy || loading} onClick={load}>Actualizar</button></div></header>
    <p className="pos-help">Registra pagos que ya recibiste. Tarjeta y transferencia se confirman fuera de este formulario. Los pedidos en línea se consultan en Pedidos.</p>
    {error && <p role="alert" className="pos-error">{error}</p>}
    {notice && <p role="status" className="pos-success">{notice}</p>}
    {loading && <p role="status">Cargando caja…</p>}
    {!loading && current && <>
      {!box && day === businessDay() && <form className="pos-opening" onSubmit={e => { e.preventDefault(); run(async () => { await rpc('pos_open', { p_opening: cents(opening) }); setNotice('Caja abierta. Ya puedes registrar ventas.'); }); }}>
        <div><h3>Abre la caja del día</h3><p>Cuenta el fondo inicial antes de la primera venta.</p></div>
        <label>Fondo inicial ($)<input type="number" min="0" max="1000000" step="0.01" required value={opening} onChange={e => setOpening(e.target.value)} /></label>
        <button className="pos-primary" disabled={busy}>Abrir caja</button></form>}
      {!box && day !== businessDay() && <p>No se abrió una caja en esta fecha.</p>}
      {box && <>
        <div className="pos-summary" aria-label="Resumen del día">{[['Ventas', summary.count], ['Total vendido', money(summary.total)], ['Efectivo', money(summary.cash)], ['Tarjeta', money(summary.card)], ['Transferencia', money(summary.transfer)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <p className="pos-help">{box.closed_at ? 'Caja cerrada. El corte está guardado y no admite más ventas.' : 'Caja abierta'} · Fondo {money(box.opening_cents)} · Movimientos {money(summary.movements)}</p>
        <div className="pos-layout">
          <div>{canSell && <form onSubmit={sell}>
            <h3>Nueva venta</h3>
            <div className="pos-catalog"><label>Buscar en catálogo<input type="search" placeholder="Impresión, carta, color, engargolado…" value={search} disabled={frozen} onChange={e=>setSearch(e.target.value)} /></label>
              <button type="button" disabled={frozen} onClick={reloadCatalog}>Actualizar catálogo</button>
              {catalogError && <p role="alert">{catalogError}</p>}
              {!catalog.length && !catalogError && <p className="pos-help">Sin tarifas activas disponibles. Un administrador puede capturar un precio especial.</p>}
              <div className="pos-catalog-results">{catalogGroups(catalog).filter(group=>group.label.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).slice(0,8).map(group=><button type="button" key={group.key} disabled={frozen || items.length>=50} onClick={()=>setItems(previous=>[...previous.filter(i=>i.name || i.price || i.catalogKey),{...blankItem(),name:group.label.slice(0,120),catalogKey:group,pages:'1'}])}>{group.label}</button>)}</div>
            </div>
            <fieldset disabled={frozen}><legend className="sr-only">Artículos de la venta</legend>
              {pricedItems.map((item, i) => <div className="pos-line" key={i}>
                <label>Servicio o producto<input required maxLength={120} placeholder="Ej. Copias blanco y negro" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></label>
                <label>Cantidad<input required type="number" min="1" max="100000" step="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></label>
                <label>Precio unitario ($)<input readOnly={Boolean(item.catalogKey)} required type="number" min="0.01" max="1000000" step="0.01" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} /></label>
                <button type="button" aria-label={`Quitar partida ${i + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter((_, index) => index !== i))}>Quitar</button>
                {item.catalogKey?.servicio==='engargolado' && <label>Hojas por engargolado<input required type="number" min="1" max="100000" step="1" value={item.pages} onChange={e=>updateItem(i,'pages',e.target.value)} /></label>}
                {item.pricingError && <p role="alert" className="pos-line-error">{item.pricingError}</p>}
              </div>)}
              <button type="button" disabled={items.length >= 50} onClick={() => setItems([...items, blankItem()])}>+ Precio especial autorizado</button>
              <p className="pos-help">Importes finales del catálogo. El desglose de IVA queda pendiente de confirmar su tratamiento comercial.</p>
              <div className="pos-pair"><label>Cliente (opcional)<input maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
                <label>WhatsApp del cliente (opcional)<input type="tel" placeholder="771 123 4567" value={phone} onChange={e => setPhone(e.target.value)} /></label></div>
              <div className="pos-pair"><label>Forma de pago<select value={payment} onChange={e => setPayment(e.target.value)}>{Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {payment === 'cash' && <label>Efectivo recibido ($)<input required type="number" min="0" max="1000000" step="0.01" value={received} onChange={e => setReceived(e.target.value)} /></label>}</div>
            </fieldset>
            <div className="pos-total"><strong>Total {money(total)}</strong>{payment === 'cash' && change !== null && <span>{change >= 0 ? `Cambio ${money(change)}` : `Faltan ${money(-change)}`}</span>}</div>
            {saleRequest.current && <p role="status">La operación está pendiente de confirmar. Reintenta con los mismos datos para evitar duplicarla.</p>}
            <button className="pos-primary" disabled={busy}>{busy ? 'Guardando…' : saleRequest.current ? 'Reintentar confirmar venta' : 'Confirmar pago y guardar venta'}</button>
          </form>}
          {receipt && <div className="pos-receipt"><h3>Ticket #{receipt.folio}</h3><pre>{receiptText(receipt)}</pre><div className="pos-actions">
            <a className="pos-button" href={receipt.customer_phone ? whatsappUrl(receipt.customer_phone, receiptText(receipt)) : `https://wa.me/?text=${encodeURIComponent(receiptText(receipt))}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>
            <button onClick={() => downloadText(`ticket-${receipt.folio}.txt`, receiptText(receipt))}>Descargar ticket</button>
            <button onClick={()=>run(async()=>setNotice(await shareReceiptImage(receipt)))}>Compartir imagen</button>
            <button onClick={() => setReceipt(null)}>Ocultar</button></div><p className="pos-help">WhatsApp abrirá el ticket preparado. Pulsa Enviar en la conversación para entregarlo.</p></div>}
          </div>
          <aside className="pos-close"><h3>Corte de caja</h3><dl><div><dt>Fondo inicial</dt><dd>{money(summary.opening)}</dd></div><div><dt>Ventas en efectivo</dt><dd>{money(summary.cash)}</dd></div><div><dt>Entradas / retiros</dt><dd>{money(summary.movements)}</dd></div><div><dt>Efectivo esperado</dt><dd>{money(expected)}</dd></div></dl>
            {box.closed_at ? <><dl><div><dt>Efectivo contado</dt><dd>{money(summary.counted)}</dd></div><div><dt>Diferencia</dt><dd>{money(summary.difference)}</dd></div></dl><button onClick={() => downloadText(`corte-${day}.txt`, `COPY CENTER 2000\nCorte ${day}\nVentas: ${summary.count}\nTotal: ${money(summary.total)}\nTarjeta: ${money(summary.card)}\nTransferencia: ${money(summary.transfer)}\nFondo: ${money(summary.opening)}\nVentas efectivo: ${money(summary.cash)}\nMovimientos: ${money(summary.movements)}\nEsperado: ${money(expected)}\nContado: ${money(summary.counted)}\nDiferencia: ${money(summary.difference)}`)}>Descargar corte</button></> : <form onSubmit={e => { e.preventDefault(); if (!confirmClose) { setConfirmClose(true); return; } run(async () => { await rpc('pos_close', { p_day: day, p_counted: cents(counted) }); setConfirmClose(false); setNotice('Corte guardado. Ya puedes compartir su imagen por WhatsApp.'); }); }}>
              <label>Efectivo contado ($)<input required type="number" min="0" max="1000000" step="0.01" value={counted} disabled={busy} onChange={e => { setCounted(e.target.value); setConfirmClose(false); }} /></label>
              {counted !== '' && <p>Diferencia: {money(Math.round(Number(counted) * 100) - expected)}</p>}
              {confirmClose && <p role="alert">Al cerrar ya no podrás agregar ventas a esta fecha. Confirma que terminaste de cobrar y contar.</p>}
              <button className="pos-primary" disabled={busy}>{confirmClose ? 'Confirmar cierre definitivo' : 'Revisar y cerrar caja'}</button>{confirmClose && <button type="button" onClick={() => setConfirmClose(false)}>Seguir trabajando</button>}
            </form>}
            <div className="pos-actions"><button disabled={busy} onClick={()=>run(async()=>setNotice(await sharePosImage(closingText(day,summary,Boolean(box.closed_at)),`corte-${day}`)))}>Compartir imagen del {box.closed_at?'corte':'resumen'}</button>
            <a className="pos-button" href={whatsappUrl('527712368040',closingText(day,summary,Boolean(box.closed_at)))} target="_blank" rel="noreferrer">Abrir WhatsApp del propietario</a></div>
            <p className="pos-help">Envía la captura a +52 771 236 8040: lunes a viernes 19:25; sábados 14:50. El envío es manual. En computadora, descarga la imagen y adjúntala en WhatsApp.</p>
          </aside>
        </div>
        {canSell && <details className="pos-movements"><summary>Registrar entrada o retiro de efectivo</summary><form onSubmit={e => { e.preventDefault(); run(async () => {
          if (!moveRequest.current) { const amount = cents(movement); if (!amount) throw new Error('El importe debe ser mayor que cero.'); moveRequest.current = { p_id: crypto.randomUUID(), p_amount: amount * (direction === 'out' ? -1 : 1), p_reason: reason }; }
          try { await rpc('pos_move', moveRequest.current); } catch (e) { if (/^(22|23|P0001)/.test(e.code || '')) moveRequest.current = null; throw e; }
          moveRequest.current = null; setMovement(''); setReason(''); setNotice('Movimiento guardado.');
        }); }}><fieldset disabled={busy || Boolean(moveRequest.current)} className="pos-pair"><label>Tipo<select value={direction} onChange={e => setDirection(e.target.value)}><option value="out">Retiro / gasto</option><option value="in">Entrada de efectivo</option></select></label><label>Importe ($)<input required type="number" min="0.01" max="1000000" step="0.01" value={movement} onChange={e => setMovement(e.target.value)} /></label><label>Motivo<input required minLength={3} maxLength={200} value={reason} onChange={e => setReason(e.target.value)} /></label></fieldset><button disabled={busy}>{moveRequest.current ? 'Reintentar movimiento' : 'Guardar movimiento'}</button></form></details>}
        {current.movements.length > 0 && <details><summary>Movimientos del día ({current.movements.length})</summary><ul>{current.movements.map(m => <li key={m.id}>{m.reason}: {money(m.amount_cents)}</li>)}</ul></details>}
        <h3 className="pos-history-title">Ventas del día</h3>
        {!current.sales.length ? <p>Aún no hay ventas registradas en esta caja.</p> : <div className="pos-table-wrap"><table><caption>Últimas 200 ventas. El corte incluye todas las ventas del día.</caption><thead><tr><th>Ticket</th><th>Hora</th><th>Detalle</th><th>Pago</th><th>Total</th><th>Comprobante</th></tr></thead><tbody>{current.sales.map(sale => <tr key={sale.id}><td>#{sale.folio}</td><td>{new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }).format(new Date(sale.created_at))}</td><td>{sale.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</td><td>{PAYMENT_LABELS[sale.payment]}</td><td>{money(sale.total_cents)}</td><td><button onClick={() => setReceipt(sale)}>Ver ticket</button></td></tr>)}</tbody></table></div>}
      </>}
      <details className="pos-notifications"><summary>Últimos avisos preparados</summary><p className="pos-help">Comparte las imágenes desde cada ticket o desde el corte. La página no puede confirmar el envío manual en WhatsApp.</p><ul>{current.notifications.map(n => <li key={n.id}>{n.event_key.startsWith('sale:') ? 'Venta' : n.event_key.startsWith('close:') ? 'Corte' : 'Resumen'}: {{ pending: 'Preparado para compartir', processing: 'Procesando', accepted: 'Aceptado por WhatsApp', failed: 'Falló el envío' }[n.status]}{n.last_error ? ` · ${n.last_error}` : ''}</li>)}</ul>{!current.notifications.length && <p>Los avisos aparecerán al registrar una venta o un corte.</p>}</details>
    </>}
  </section>;
}
