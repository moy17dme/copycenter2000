// pnpm dev, then pnpm exec node scripts/test-password-recovery.mjs
// All auth traffic is intercepted. No email or password is changed remotely.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { recoveryLocation, verifyRecoverySession } from '../src/lib/passwordRecovery.js';
const uid='00000000-0000-0000-0000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'recovery-test@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z',identities:[]};
const token=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'fake-signature'].map((x,i)=>i===2?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
const session={access_token:token,refresh_token:'fake-refresh-token',expires_in:3600,token_type:'bearer',user};
assert.equal(recoveryLocation(new URL('https://example.invalid/#type=recovery&access_token=test')).implicit,true);
await assert.rejects(()=>verifyRecoverySession({auth:{getSession:async()=>({data:{session:null}})}}),/enlace/);
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const mode of ['implicit','pkce','expired','missing']) {
    const context=await browser.newContext();const page=await context.newPage();
    let exchanges=0,updates=0;
    await page.route('https://*.supabase.co/**',async route=>{
      const url=new URL(route.request().url()); let body=[];
      if(url.pathname.endsWith('/user')) {body=user;if(route.request().method()==='PUT')updates++;}
      if(url.pathname.endsWith('/token')) {body=session;exchanges++;}
      if(url.pathname.endsWith('/recover')) body={};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    if(mode==='pkce') {
      await page.goto('http://127.0.0.1:5173/reset-password');
      await page.evaluate(async()=>{
        const {supabase}=await import('/src/lib/supabaseClient.js');
        await supabase.auth.resetPasswordForEmail('recovery-test@example.invalid',{redirectTo:location.origin+'/reset-password'});
      });
      await page.goto('http://127.0.0.1:5173/reset-password?code=fake-one-time-code');
    } else if(mode==='implicit') {
      const hash=new URLSearchParams({access_token:token,refresh_token:session.refresh_token,expires_in:'3600',token_type:'bearer',type:'recovery'});
      await page.goto('http://127.0.0.1:5173/#'+hash);
    } else {
      await page.goto('http://127.0.0.1:5173/reset-password'+(mode==='expired'?'#error=access_denied&error_description=Enlace%20vencido':''));
    }
    if(['implicit','pkce'].includes(mode)){
      await page.getByRole('heading',{name:'Nueva contraseña'}).waitFor();
      assert.equal(new URL(page.url()).pathname,'/reset-password');
      await page.getByLabel('Nueva contraseña',{exact:true}).fill('Fictitious-test-only-123!');
      await page.getByLabel('Confirmar contraseña').fill('Fictitious-test-only-123!');
      await page.getByRole('button',{name:'Guardar contraseña'}).click();
      await page.getByText('¡Contraseña actualizada!',{exact:true}).waitFor();
      assert.equal(updates,1);assert.equal(exchanges,mode==='pkce'?1:0);
    } else {
      await page.getByText(mode==='expired'?'Enlace vencido':/El enlace no es válido o ya venció/).waitFor();
      assert.equal(await page.getByRole('button',{name:'Guardar contraseña'}).count(),0);
    }
    console.log(`${mode}: passed`);await context.close();
  }
} finally {await browser.close();}
