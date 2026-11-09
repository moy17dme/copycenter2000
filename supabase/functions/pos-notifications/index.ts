import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Scheduler-only endpoint. Deploy with --no-verify-jwt; a dedicated secret is checked here.
const env = (name: string) => (Deno.env.get(name) || '').trim();
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = env('POS_CRON_SECRET');
  if (!secret || req.headers.get('x-pos-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.daily === true) {
    const { error } = await db.rpc('pos_enqueue_daily');
    if (error) return Response.json({ error: 'daily_summary_failed' }, { status: 500 });
  }
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  const contentSid = env('POS_WHATSAPP_CONTENT_SID');
  const from = env('TWILIO_WHATSAPP_FROM');
  const service = env('TWILIO_MESSAGING_SERVICE_SID');
  const to = env('POS_NOTIFY_WHATSAPP_TO');
  if (!sid || !token || !contentSid || (!from && !service) || !/^\+\d{10,15}$/.test(to)) {
    return Response.json({ error: 'Configure POS WhatsApp secrets and approved template. Messages remain queued.' }, { status: 503 });
  }
  // Surface exhausted leases instead of leaving them permanently in 'processing'.
  const { error: expiredError } = await db.from('pos_notifications').update({ status: 'failed', last_error: 'Se agotaron los intentos; revisar en Twilio antes de reenviar.' })
    .eq('status', 'processing').gte('attempts', 5).lte('available_at', new Date().toISOString());
  if (expiredError) return Response.json({ error: 'lease_cleanup_failed' }, { status: 500 });
  const { data: jobs, error } = await db.rpc('pos_claim_notifications');
  if (error) return Response.json({ error: 'queue_unavailable' }, { status: 500 });
  const results = await Promise.all((jobs || []).map(async (job: { id: string; message: string; attempts: number }) => {
    const params = new URLSearchParams({ To: `whatsapp:${to}`, ContentSid: contentSid,
      ContentVariables: JSON.stringify({ '1': job.message.replace(/\s+/g, ' ').slice(0, 1000) }) });
    if (service) params.set('MessagingServiceSid', service); else params.set('From', from);
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: 'POST', headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params, signal: AbortSignal.timeout(20000),
      });
      const payload = await response.json();
      if (!response.ok || !payload.sid) throw new Error(`Twilio ${response.status}: ${String(payload.code || 'request_failed')}`);
      const { error: saveError } = await db.from('pos_notifications').update({ status: 'accepted', provider_id: payload.sid, last_error: null }).eq('id', job.id).eq('attempts', job.attempts);
      if (saveError) return { id: job.id, ok: false, error: 'provider_accepted_but_save_failed' };
      return { id: job.id, ok: true };
    } catch (error) {
      const { error: saveError } = await db.from('pos_notifications').update({ status: job.attempts >= 5 ? 'failed' : 'pending',
        available_at: new Date(Date.now() + 60000 * 2 ** job.attempts).toISOString(), last_error: String(error).slice(0, 250),
      }).eq('id', job.id).eq('attempts', job.attempts);
      return { id: job.id, ok: false, ...(saveError ? { error: 'retry_save_failed' } : {}) };
    }
  }));
  return Response.json({ results });
});
