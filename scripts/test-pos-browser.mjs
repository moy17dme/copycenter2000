// Run pnpm dev on port 5173 first, then pnpm test:pos:browser.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true});
  let box = null; const sales = []; let firstSale = true;
  const members=[];window.__invites=0;
  const catalog=[{id:'30000000-0000-0000-0000-000000000001',servicio:'copias',categoria:'Copias',categoria_slug:'copias',variante:'B/N',variante_slug:'negro',formato:'Carta',formato_slug:'carta',min_cantidad:1,max_cantidad:99,precio:1,activo:true},
    {id:'30000000-0000-0000-0000-000000000002',servicio:'copias',categoria:'Copias',categoria_slug:'copias',variante:'B/N',variante_slug:'negro',formato:'Carta',formato_slug:'carta',min_cantidad:100,max_cantidad:499,precio:0.7,activo:true}];
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const summary = () => ({ count: sales.length, total: sales.reduce((s,v)=>s+v.total_cents,0), cash: sales.reduce((s,v)=>s+(v.payment==='cash'?v.total_cents:0),0), card:0,transfer:0,opening:box?.opening_cents||0,movements:0 });
  window.__posSales = sales;
  window.__copycenter2000_supabase_client__ = {
    functions:{async invoke(){window.__invites++;return {data:{message:'Invitación ficticia enviada'}};}},
    from(table) {
      const query = { select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},maybeSingle(){return this;},
        then(resolve) { resolve({ data:table==='pos_team'?members:table==='catalogo_precios'?catalog:table==='pos_days'?box:table==='pos_sales'?sales:[],error:null }); } }; return query;
    },
    async rpc(name,p) {
      if(name==='pos_save_member'){const member={id:p.p_id||'fixture-member',email:p.p_email,display_name:p.p_name,role:p.p_role,enabled:p.p_enabled,permissions:p.p_permissions};const index=members.findIndex(m=>m.id===member.id);if(index<0)members.push(member);else members[index]=member;return {data:member};}
      if(name==='pos_summary') return {data:summary()};
      if(name==='pos_open') { box={day,opening_cents:p.p_opening}; return {data:box}; }
      if(name==='pos_sell') {
        let sale=sales.find(s=>s.id===p.p_id);
        if(!sale) { sale={id:p.p_id,folio:sales.length+1,day,items:p.p_items,payment:p.p_payment,received_cents:p.p_received,customer_phone:p.p_phone,customer_name:p.p_name,total_cents:p.p_items.reduce((s,i)=>s+i.qty*i.unit_cents,0),created_at:new Date().toISOString()}; sales.push(sale); }
        if(firstSale){firstSale=false;return {error:{message:'Conexión interrumpida'}};}
        return {data:sale};
      }
      if(name==='pos_close') { const s=summary(); box={...box,closed_at:new Date().toISOString(),closing_summary:{...s,expected:s.opening+s.cash,counted:p.p_counted,difference:p.p_counted-s.opening-s.cash}}; return {data:box.closing_summary}; }
      return {data:null};
    }
  };
});
await page.route('http://127.0.0.1:5173/*-validation', route=>route.fulfill({ contentType:'text/html',body:`<!doctype html><html lang="es"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0;background:#101827"><div id="root" style="padding:24px;max-width:1300px;margin:auto"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
await import('/@vite/client'); const {default:React}=await import('/node_modules/.vite/deps/react.js'); const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js'); const {default:POS}=await import(location.pathname==='/team-validation'?'/src/components/PosTeam.jsx':'/src/components/PointOfSale.jsx'); await import('/src/index.css'); ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(POS,{access:window.__posAccess}));
</script></body></html>` }));
try {
  await page.goto('http://127.0.0.1:5173/pos-validation');
  await page.getByLabel('Fondo inicial ($)', {exact:true}).fill('100');
  await page.getByRole('button',{name:'Abrir caja',exact:true}).click();
  await page.getByLabel('¿Qué vas a vender?').fill('copais');
  await page.getByRole('button',{name:/Copias · B\/N · Carta/}).click();
  await page.getByLabel('Cantidad a agregar').fill('3');
  await page.getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByLabel('Cantidad',{exact:true}).fill('100');
  assert.match(await page.locator('.pos-cart-line').innerText(),/\$70\.00/);
  await page.getByLabel('Cantidad',{exact:true}).fill('3');
  await page.getByLabel('Efectivo recibido ($)').fill('5');
  await page.getByText('Datos del cliente (opcional)',{exact:true}).click();
  await page.getByLabel('WhatsApp del cliente (opcional)').fill('7712368040');
  await page.getByRole('button',{name:'Confirmar pago y guardar venta'}).click();
  await page.getByRole('button',{name:'Reintentar confirmar venta'}).click();
  await page.getByRole('heading',{name:'Ticket #1',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__posSales.length),1);
  assert.match(await page.locator('.pos-receipt pre').innerText(),/Cambio: \$2\.00/);
  assert.match(await page.getByRole('link',{name:'Compartir por WhatsApp'}).getAttribute('href'),/^https:\/\/wa.me\/527712368040\?text=/);
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Compartir imagen',exact:true}).click();
  const download=await downloadEvent;
  assert.match(download.suggestedFilename(),/ticket-1\.png$/);
  await mkdir('outputs/pos-validation',{recursive:true});
  await page.screenshot({path:'outputs/pos-validation/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:'outputs/pos-validation/mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Caja y corte',exact:true}).click();
  await page.getByLabel('Efectivo contado ($)').fill('102');
  await page.getByRole('button',{name:'Revisar y cerrar caja'}).click();
  await page.getByRole('button',{name:'Confirmar cierre definitivo'}).click();
  await page.getByRole('button',{name:'Descargar corte'}).waitFor();
  const closeImageEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Compartir imagen del corte'}).click();
  assert.match((await closeImageEvent).suggestedFilename(),/corte-.*\.png$/);
  assert.equal(await page.getByRole('button',{name:'Confirmar pago y guardar venta'}).count(),0);
  assert.match(await page.locator('.pos-close').innerText(),/-\$1\.00/);
  await page.addInitScript(()=>{window.__posAccess={admin:false,permissions:{sell:true,open:true,close:false,move:false,history:false}};});
  await page.reload();
  await page.getByRole('button',{name:'Abrir caja',exact:true}).click();
  assert.equal(await page.getByText('Servicio especial con precio autorizado',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Caja y corte',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Revisar y cerrar caja'}).count(),0);
  assert.equal(await page.getByLabel('Consultar día').count(),0);
  await page.goto('http://127.0.0.1:5173/team-validation');
  await page.getByRole('button',{name:'Agregar empleado'}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Empleado ficticio');
  await page.getByLabel('Correo del empleado').fill('ficticio@example.invalid');
  assert.equal(await page.getByLabel('Cerrar caja y hacer corte').isChecked(),false);
  await page.getByRole('button',{name:'Guardar empleado'}).click();
  await page.getByText('Pendiente de cuenta',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__invites),0);
  await page.getByRole('button',{name:'Enviar invitación'}).click();
  await page.getByText('Invitación ficticia enviada',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__invites),1);
  await page.getByRole('button',{name:'Editar permisos'}).click();
  await page.getByLabel('Acceso activo').uncheck();
  await page.getByRole('button',{name:'Guardar empleado'}).click();
  await page.getByText('Desactivado',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: opening, ambiguous network retry, one sale, change, WhatsApp link, mobile overflow, closing and no page errors. Mock transport; database tested separately.');
} catch (error) {
  console.error({ errors, body: (await page.locator('body').innerText()).slice(0, 1500) });
  throw error;
} finally { await browser.close(); }
