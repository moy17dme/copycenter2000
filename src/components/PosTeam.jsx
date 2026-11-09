import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './PointOfSale.css';
const defaults={sell:true,open:true,close:false,move:false,history:false};
const permissionLabels={sell:'Registrar ventas',open:'Abrir caja',close:'Cerrar caja y hacer corte',move:'Registrar entradas y retiros',history:'Consultar días anteriores'};
const blank=()=>({id:null,email:'',display_name:'',role:'assistant',enabled:true,permissions:{...defaults}});
export default function PosTeam(){
  const [members,setMembers]=useState([]),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);const {data,error}=await supabase.from('pos_team').select('*').order('display_name');
    if(error)setError(error.message);else setMembers(data||[]);setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  async function save(event){
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const {error}=await supabase.rpc('pos_save_member',{p_id:draft.id,p_email:draft.email,p_name:draft.display_name,p_role:draft.role,p_enabled:draft.enabled,p_permissions:draft.permissions});
      if(error)throw error;
      setDraft(null);setNotice('Acceso guardado. Si aún no tiene cuenta, envía la invitación desde su fila.');await load();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function invite(member){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try {const {data,error}=await supabase.functions.invoke('pos-invite',{body:{memberId:member.id}});
      if(error||data?.error)throw new Error(data?.error||error.message);
      setNotice(data.message||'Invitación solicitada. El empleado debe revisar su correo.');await load();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="pos"><header className="pos-header"><div><h2>Empleados</h2><p className="pos-help">Cada persona usa su propia cuenta. Tú decides qué puede hacer.</p></div><button className="pos-primary" disabled={busy} onClick={()=>{setDraft(blank());setError('');}}>Agregar empleado</button></header>
    {error&&<p className="pos-error" role="alert">{error}</p>}{notice&&<p className="pos-success" role="status">{notice}</p>}
    {draft&&<form className="pos-team-form" onSubmit={save}><h3>{draft.id?'Editar empleado':'Nuevo empleado'}</h3><fieldset disabled={busy}>
      <div className="pos-pair"><label>Nombre<input required maxLength={100} value={draft.display_name} onChange={e=>setDraft({...draft,display_name:e.target.value})}/></label><label>Correo del empleado<input required type="email" readOnly={Boolean(draft.id)} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label></div>
      <label>Puesto<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}><option value="assistant">Auxiliar</option><option value="designer">Diseñador</option></select></label>
      <div className="pos-permissions">{Object.entries(permissionLabels).map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(draft.permissions[key])} onChange={e=>setDraft({...draft,permissions:{...draft.permissions,[key]:e.target.checked}})}/>{label}</label>)}
      <label><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Acceso activo</label></div>
      <p className="pos-help">Los empleados no pueden editar precios, dar descuentos, borrar ventas ni administrar usuarios. Ven sus propios tickets; el corte muestra los totales de la caja compartida.</p>
      <div className="pos-actions"><button className="pos-primary">{busy?'Guardando…':'Guardar empleado'}</button><button type="button" onClick={()=>setDraft(null)}>Cancelar</button></div>
    </fieldset></form>}
    {loading?<p role="status">Cargando empleados…</p>:!members.length?<p>No hay empleados registrados. Usa «Agregar empleado» cuando estés listo.</p>:<div className="pos-table-wrap"><table><thead><tr><th>Empleado</th><th>Puesto</th><th>Acceso</th><th>Acciones</th></tr></thead><tbody>{members.map(member=><tr key={member.id}><td><strong>{member.display_name}</strong><br/>{member.email}</td><td>{member.role==='designer'?'Diseñador':'Auxiliar'}</td><td>{!member.enabled?'Desactivado':member.user_id?'Cuenta vinculada':'Pendiente de cuenta'}</td><td><div className="pos-actions"><button disabled={busy} onClick={()=>setDraft({...member,permissions:{...member.permissions}})}>Editar permisos</button>{member.enabled&&!member.user_id&&<button disabled={busy} onClick={()=>invite(member)}>Enviar invitación</button>}</div></td></tr>)}</tbody></table></div>}
    <p className="pos-help">Entrada para empleados: <a href="/pos">copycenter2000.com/pos</a>. Desactivar el acceso conserva sus ventas y bloquea nuevas operaciones. La primera autorización no envía correos; «Enviar invitación» lo hace cuando tú lo indicas.</p>
  </section>;
}
