-- Run AFTER deploying pos-notifications and setting Vault secrets:
-- pos_function_url = https://PROJECT.supabase.co/functions/v1/pos-notifications
-- pos_cron_secret = same random value as Edge secret POS_CRON_SECRET
-- Enable pg_cron, pg_net and Vault in Supabase first. Cron uses UTC.
-- Mexico City UTC-6: Mon-Fri 19:25 -> Tue-Sat 01:25 UTC; Sat 14:50 -> Sat 20:50 UTC.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='pos_function_url')
    or not exists(select 1 from vault.decrypted_secrets where name='pos_cron_secret') then
    raise exception 'Primero configura pos_function_url y pos_cron_secret en Vault';
  end if;
end $$;
select cron.schedule('pos-send-notifications','* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='pos_function_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-pos-secret',(select decrypted_secret from vault.decrypted_secrets where name='pos_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$job$);
select cron.schedule('pos-weekday-summary','25 1 * * 2-6', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='pos_function_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-pos-secret',(select decrypted_secret from vault.decrypted_secrets where name='pos_cron_secret')),
    body := '{"daily":true}'::jsonb, timeout_milliseconds := 60000);
$job$);
select cron.schedule('pos-saturday-summary','50 20 * * 6', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='pos_function_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-pos-secret',(select decrypted_secret from vault.decrypted_secrets where name='pos_cron_secret')),
    body := '{"daily":true}'::jsonb, timeout_milliseconds := 60000);
$job$);
