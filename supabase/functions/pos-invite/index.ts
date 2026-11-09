import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePreflight,isAllowedOrigin,jsonResponse,readJsonObject,isUuid,checkRateLimit,rateLimitResponse } from '../_shared/httpSecurity.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return handlePreflight(req);
  if(req.method!=='POST')return jsonResponse(req,{error:'Método no permitido'},405);
  if(!isAllowedOrigin(req))return jsonResponse(req,{error:'Origen no permitido'},403);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return jsonResponse(req,{error:'Inicia sesión'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return jsonResponse(req,{error:'Sesión inválida'},401);
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data:allowed,error:permissionError}=await caller.rpc('is_copycenter_admin');
  if(permissionError||!allowed)return jsonResponse(req,{error:'Solo el administrador puede invitar empleados'},403);
  const rate=await checkRateLimit(admin,`pos-invite:${user.id}`,5,600);
  if(!rate.allowed)return rateLimitResponse(req,rate);
  const body=await readJsonObject(req);
  if(body.error||!isUuid(body.data?.memberId))return jsonResponse(req,{error:'Empleado inválido'},400);
  const {data:member,error}=await admin.from('pos_team').select('*').eq('id',body.data.memberId).single();
  if(error||!member?.enabled)return jsonResponse(req,{error:'El acceso del empleado no está activo'},400);
  if(member.user_id)return jsonResponse(req,{message:'Esta persona ya tiene cuenta. Puede iniciar sesión en /pos o recuperar su contraseña.'});
  const {data:invite,error:inviteError}=await admin.auth.admin.inviteUserByEmail(member.email,{
    redirectTo:'https://copycenter2000.com/reset-password',data:{full_name:member.display_name},
  });
  if(inviteError)return jsonResponse(req,{error:'No se pudo enviar la invitación. Si ya tiene cuenta, pídele iniciar sesión con su correo autorizado; de lo contrario, intenta más tarde.'},502);
  // No role is granted through user metadata. pos_access binds only a verified email.
  return jsonResponse(req,{message:'Invitación enviada. El empleado debe abrir su correo, crear su contraseña e ingresar a /pos.',invited:Boolean(invite.user)});
});
