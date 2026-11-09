import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {money} from '../lib/pos';
import PosPaymentFields from './PosPaymentFields';
import {blankPayment,validatePayment} from '../lib/posPayments';

export default function PosPending({canCollect,onReceipt,onUpdated,onLockChange}) {
  const [query,setQuery]=useState(''),[sales,setSales]=useState([]),[selected,setSelected]=useState(null);
  const [payment,setPayment]=useState(blankPayment),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const request=useRef(null),locked=useRef(false),version=useRef(0);
  const load=useCallback(async()=>{
    const current=++version.current;setLoading(true);
    const {data,error}=await supabase.rpc('pos_pending',{p_query:query});
    if(current!==version.current)return;
    setLoading(false);if(error){setError(error.message);setSales([]);}else setSales(data||[]);
  },[query]);
  useEffect(()=>{const timer=setTimeout(load,250);const ref=version;return()=>{clearTimeout(timer);ref.current++;};},[load]);
  async function collect(event){
    event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);onLockChange(true);setError('');
    try{
      if(!request.current){const result=validatePayment(Number(selected.balance_cents),payment);request.current={p_id:crypto.randomUUID(),p_sale:selected.id,p_payments:result.payments,p_cash_received:result.received};}
      const {data,error}=await supabase.rpc('pos_pay',request.current);
      if(error){if(/^(22|23|P0001)/.test(error.code||''))request.current=null;throw error;}
      request.current=null;onLockChange(false);setSelected(null);setPayment(blankPayment());onReceipt(data);await load();await onUpdated();
    }catch(e){setError(e.message||'No se pudo confirmar el abono.');}
    finally{locked.current=false;setBusy(false);onLockChange(Boolean(request.current));}
  }
  const frozen=busy||Boolean(request.current);
  return <section className="pos-pending" aria-label="Saldos pendientes"><h3>Saldos pendientes</h3>
    <p>Busca al cliente o el número de ticket. Los abonos se registran en la caja de hoy.</p>
    <label>Buscar saldo<input type="search" placeholder="Nombre, teléfono o número de ticket" value={query} disabled={frozen} onChange={e=>setQuery(e.target.value)}/></label>
    {error&&<p role="alert" className="pos-error">{error}</p>}
    {loading?<p role="status">Buscando saldos…</p>:<>
      {!sales.length&&<p>No hay saldos pendientes para esta búsqueda.</p>}
      <div className="pos-pending-list">{sales.map(sale=><button type="button" disabled={frozen} aria-pressed={selected?.id===sale.id} key={sale.id} onClick={()=>{setSelected(sale);setPayment(blankPayment());setError('');}}><span>#{sale.folio} · {sale.customer_name}<small>{sale.day} · Total {money(sale.total_cents)} · Abonado {money(sale.paid_cents)}</small></span><strong>Saldo {money(sale.balance_cents)}</strong></button>)}</div>
      {sales.length===200&&<p>Se muestran 200 tickets. Escribe el cliente o folio para encontrar otros.</p>}
    </>}
    {selected&&<form onSubmit={collect} className="pos-collect"><h3>Abonar al ticket #{selected.folio} · {selected.customer_name}</h3><p>Saldo pendiente: <strong>{money(selected.balance_cents)}</strong></p>
      {!canCollect&&<p>Necesitas abrir la caja de hoy y tener permiso para cobrar.</p>}
      <fieldset disabled={frozen||!canCollect}><legend className="sr-only">Nuevo abono</legend><PosPaymentFields total={Number(selected.balance_cents)} value={payment} onChange={setPayment} settlement/></fieldset>
      {request.current&&<p role="status">Falta confirmar este abono. Reintenta con los mismos datos para evitar duplicarlo.</p>}
      <button className="pos-primary" disabled={busy||!canCollect}>{busy?'Guardando…':request.current?'Reintentar confirmar abono':'Confirmar abono'}</button>
      <button type="button" disabled={frozen} onClick={()=>setSelected(null)}>Cancelar</button>
    </form>}
  </section>;
}
