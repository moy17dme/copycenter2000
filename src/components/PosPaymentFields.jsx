import { PAYMENT_LABELS, money } from '../lib/pos';
import {paymentAmounts} from '../lib/posPayments';

export default function PosPaymentFields({total,value,onChange,settlement=false}) {
  const set=(key,next)=>onChange({...value,[key]:next});
  let preview;try{preview=paymentAmounts(total,value);}catch{/* Validate on submit. */}
  return <div className="pos-payments">
    <div className="pos-pair">
      <label>{settlement?'¿Cuánto vas a cobrar?':'Tipo de cobro'}<select value={value.deposit?'deposit':'full'} onChange={e=>set('deposit',e.target.value==='deposit')}>
        <option value="full">{settlement?'Liquidar saldo':'Pago completo'}</option><option value="deposit">{settlement?'Abonar una parte':'Anticipo · dejar saldo pendiente'}</option>
      </select></label>
      <label>Forma de pago<select value={value.method} onChange={e=>set('method',e.target.value)}>{Object.entries(PAYMENT_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    {value.method==='mixed'?<div className="pos-pair">{['cash','card','transfer'].map(method=><label key={method}>{PAYMENT_LABELS[method]} a aplicar ($)<input type="number" min="0" max="1000000" step="0.01" value={value[method]} placeholder="0.00" onChange={e=>set(method,e.target.value)}/></label>)}</div>
      :value.deposit&&<label>{settlement?'Importe del abono ($)':'Anticipo a cobrar ($)'}<input required type="number" min="0.01" max={total/100} step="0.01" value={value.amount} onChange={e=>set('amount',e.target.value)}/></label>}
    {(value.method==='cash'||(value.method==='mixed'&&Number(value.cash)>0))&&<label>Efectivo recibido ($)<input type="number" min="0" max="1000000" step="0.01" value={value.received} placeholder="Déjalo vacío si entrega el importe exacto" onChange={e=>set('received',e.target.value)}/></label>}
    {preview&&<div className="pos-payment-preview" aria-live="polite"><span>Cobrar ahora <strong>{money(preview.paid)}</strong></span><span>Saldo después del pago <strong>{money(preview.balance)}</strong></span>{preview.change>=0&&preview.received>0&&<span>Cambio <strong>{money(preview.change)}</strong></span>}</div>}
    <p className="pos-help">Confirma el pago antes de guardar. Tarjeta y transferencia se cobran fuera del punto de venta.</p>
  </div>;
}
