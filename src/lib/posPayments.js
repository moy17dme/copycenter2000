import {cents} from './pos.js';

export const blankPayment = () => ({method:'cash',deposit:false,amount:'',cash:'',card:'',transfer:'',received:''});
export function paymentAmounts(total,value) {
  const amount = value.deposit ? cents(value.amount||'0') : total;
  const payments=value.method==='mixed'
    ? ['cash','card','transfer'].map(method=>({method,amount_cents:cents(value[method]||'0')})).filter(p=>p.amount_cents>0)
    : [{method:value.method,amount_cents:amount}];
  const paid=payments.reduce((sum,p)=>sum+p.amount_cents,0);
  const cash=payments.find(p=>p.method==='cash')?.amount_cents||0;
  const received=cash ? (value.received===''?cash:cents(value.received)) : 0;
  return {payments,paid,received,change:received-cash,balance:total-paid};
}
export function validatePayment(total,value) {
  const result=paymentAmounts(total,value);
  if(result.paid<=0)throw new Error('Escribe un pago mayor que cero.');
  if(result.balance<0)throw new Error('Los importes aplicados exceden el saldo. Escribe los billetes entregados en Efectivo recibido.');
  if(!value.deposit&&result.balance!==0)throw new Error('El pago no cubre el total. Elige Anticipo para dejar saldo pendiente.');
  if(result.change<0)throw new Error('El efectivo recibido no cubre la parte en efectivo.');
  return result;
}
