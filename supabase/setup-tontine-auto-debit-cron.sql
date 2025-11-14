-- Configuration du cron job pour le débit automatique des tontines
-- À exécuter manuellement dans l'éditeur SQL Supabase

-- Créer le cron job qui s'exécute tous les jours à 9h du matin
SELECT cron.schedule(
  'tontine-auto-debit-daily',
  '0 9 * * *', -- Tous les jours à 9h00
  $$
  SELECT
    net.http_post(
        url:='https://swefwubntyyfqaerlwym.supabase.co/functions/v1/tontine-auto-debit',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Pour vérifier que le cron job est bien créé:
-- SELECT * FROM cron.job WHERE jobname = 'tontine-auto-debit-daily';

-- Pour désactiver le cron job:
-- SELECT cron.unschedule('tontine-auto-debit-daily');

-- Pour réactiver avec une nouvelle fréquence (exemple: toutes les 6 heures):
-- SELECT cron.schedule(
--   'tontine-auto-debit-daily',
--   '0 */6 * * *',
--   $$...(même contenu)...$$
-- );