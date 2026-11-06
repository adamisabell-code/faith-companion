-- Runs the check-in sender every 10 minutes.
-- One-time setup, in the Supabase dashboard:
--   1. Integrations (or Database → Extensions): enable pg_cron and pg_net.
--   2. Edge Functions → Secrets: add CRON_SECRET (any long random string).
--   3. Replace the two placeholders below, then run this file in the SQL Editor.
--      <PROJECT-REF>  your 20-letter project ref
--      <CRON_SECRET>  the same value you saved as the CRON_SECRET secret

-- Store the secret in Vault so it isn't visible in the job definition.
select vault.create_secret('<CRON_SECRET>', 'checkin_cron_secret')
where not exists (select 1 from vault.secrets where name = 'checkin_cron_secret');

select cron.unschedule('send-checkins') where exists (select 1 from cron.job where jobname = 'send-checkins');

select cron.schedule(
  'send-checkins',
  '*/10 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-checkins',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'checkin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
  $$
);
