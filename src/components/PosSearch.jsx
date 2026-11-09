import { useMemo, useRef, useState } from 'react';
import { catalogGroups, resolveCatalogRule, searchCatalog } from '../lib/catalogRule';
import { money } from '../lib/pos';
export default function PosSearch({catalog,disabled,onAdd}){
  const [query,setQuery]=useState(''),[selected,setSelected]=useState(null),[qty,setQty]=useState('1'),[pages,setPages]=useState('1');
  const input=useRef(null);
  const groups=useMemo(()=>catalogGroups(catalog),[catalog]);
  const results=query.trim()?searchCatalog(groups,query):[];
  const quote=selected?resolveCatalogRule(catalog,selected,selected.servicio==='engargolado'?pages:qty):{};
  const valid=quote.row&&Number.isInteger(Number(qty))&&Number(qty)>0&&Number(qty)<=100000;
  function add(){
    if(!valid||disabled)return;
    onAdd({name:selected.label.slice(0,120),qty,price:(quote.unit_cents/100).toFixed(2),catalogKey:selected,pages});
    setSelected(null);setQuery('');setQty('1');setPages('1');input.current?.focus();
  }
  return <div className="pos-search"><label htmlFor="pos-service-search">¿Qué vas a vender?</label>
    <input id="pos-service-search" ref={input} type="search" autoComplete="off" placeholder="Busca copias, impresión, engargolado…" value={query} disabled={disabled} onChange={e=>{setQuery(e.target.value);setSelected(null);}} onKeyDown={e=>{if(e.key==='Escape'){setQuery('');setSelected(null);}if(e.key==='Enter'){e.preventDefault();if(!selected&&results.length)setSelected(results[0]);else add();}}}/>
    {query&&!selected&&<div className="pos-search-results" aria-label="Servicios encontrados">{!results.length?<p>No hay coincidencias. Prueba con otro servicio o tamaño.</p>:results.slice(0,12).map(group=><button type="button" key={group.key} disabled={disabled} onClick={()=>{setSelected(group);setQty('1');setPages('1');}}>{group.label}<span>Elegir</span></button>)}{results.length>12&&<p>Escribe el tamaño o tipo de color para afinar la búsqueda.</p>}</div>}
    {selected&&<div className="pos-selected"><strong>{selected.label}</strong><div className="pos-add-line">
      <label>Cantidad a agregar<input autoFocus type="number" min="1" max="100000" step="1" value={qty} disabled={disabled} onChange={e=>setQty(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/></label>
      {selected.servicio==='engargolado'&&<label>Hojas por engargolado<input type="number" min="1" max="100000" value={pages} disabled={disabled} onChange={e=>setPages(e.target.value)}/></label>}
      <div><span>Precio unitario</span><strong>{quote.row?money(quote.unit_cents):'Sin tarifa'}</strong></div><div><span>Total</span><strong>{valid?money(quote.unit_cents*Number(qty)):'—'}</strong></div>
      <button type="button" className="pos-primary" disabled={disabled||!valid} onClick={add}>Agregar</button></div>
      {quote.error&&<p role="alert" className="pos-line-error">{quote.error}</p>}
    </div>}
  </div>;
}
