import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {money} from '../lib/pos';

export default function MimakiPrices(){
  const [prices,setPrices]=useState([]);
  const [status,setStatus]=useState('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    async function load(){
      setStatus('loading');
      try {
        const {data,error}=await supabase.from('catalogo_precios')
          .select('id,categoria,variante,ancho_rollo_cm,precio,iva_modo')
          .eq('servicio','mimaki_uv').eq('activo',true).eq('visible_publico',true).order('categoria');
        if(error || !data || data.some(row=>row.iva_modo!=='adicional' || !(row.ancho_rollo_cm>4))) throw new Error();
        if(alive){setPrices(data);setStatus('ready');}
      } catch { if(alive){setPrices([]);setStatus('error');} }
    }
    load();
    return()=>{alive=false;};
  },[attempt]);
  return <section id="mimaki" className="my-12 rounded-xl border border-border bg-secondary/35 p-5 sm:p-8" aria-labelledby="mimaki-heading">
    <p className="text-sm font-semibold text-sky-300">Impresión UV · Mimaki UJV 200</p>
    <h2 id="mimaki-heading" className="mt-2 text-2xl font-bold text-white">Materiales y precios por metro lineal</h2>
    <p className="mt-3 text-slate-300">Precios en MXN, por metro lineal, con material incluido, más IVA. Cada metro lineal corresponde al ancho indicado.</p>
    <p className="mt-4 text-xs text-slate-400 sm:hidden">Desliza la tabla para ver los anchos y precios.</p>
    <div className="mt-6 overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Tabla de precios Mimaki">
      <table className="w-full min-w-[620px] text-left text-sm">
        <caption className="sr-only">Tarifas de impresión Mimaki por material, acabado y ancho</caption>
        <thead className="bg-slate-800 text-slate-200"><tr>{['Material','Impresión / acabado','Ancho imprimible','Precio por metro + IVA'].map(label=><th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody>{prices.map(item=><tr key={item.id} className="border-t border-border text-slate-200"><th scope="row" className="px-4 py-3 font-medium">{item.categoria}</th><td className="px-4 py-3">{item.variante}</td><td className="whitespace-nowrap px-4 py-3">{item.ancho_rollo_cm-4} cm</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{money(item.precio*100)}</td></tr>)}</tbody>
      </table>
    </div>
    {status==='error'&&<p role="alert">No pudimos verificar los precios. <button onClick={()=>setAttempt(value=>value+1)}>Reintentar</button></p>}
    {status==='loading'&&<p role="status">Consultando precios…</p>}
    {status==='ready'&&!prices.length&&<p className="mt-4 text-slate-300">Consulta disponibilidad y cotización con nosotros.</p>}
    <div className="mt-5 space-y-2 text-sm leading-6 text-slate-300">
      <p>El ancho imprimible descuenta 2 cm por lado. Para cada tirada del mismo material y acabado, suma el largo que ocupan todas las piezas. Si ocupa menos de 50 cm, cobramos 30 cm adicionales de material a la tarifa de impresión una sola vez. Desde 50 cm cobramos el largo real.</p>
      <p>Blanco: una capa de cobertura normal. Barniz: sin relieve pronunciado. Doble blanco, cobertura total o relieve se cotizan según el trabajo.</p>
      <p>El corte está incluido únicamente en las opciones que lo indican; cortes menores de 5 cm requieren cotización. Diseño, instalación, laminado y estructura de roll-up se cotizan aparte.</p>
      <p>Confirmamos material, ancho útil y acabado antes de producir. Para floor graphics, revisamos la protección y resistencia al deslizamiento requeridas.</p>
    </div>
    <a href="https://wa.me/527712368040?text=Hola%2C%20quiero%20cotizar%20una%20impresi%C3%B3n%20Mimaki%20UV." target="_blank" rel="noreferrer" className="btn-blue mt-6 inline-flex">Cotizar impresión UV</a>
  </section>;
}
