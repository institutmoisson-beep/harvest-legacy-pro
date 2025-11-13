-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ===================================================
-- CRON JOBS POUR LES INVESTISSEMENTS
-- ===================================================

-- 1. Paiements quotidiens (00:01 tous les jours)
SELECT cron.schedule(
  'daily-investment-payouts',
  '1 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://swefwubntyyfqaerlwym.supabase.co/functions/v1/investment-payout',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  );
  $$
);

-- 2. Paiements hebdomadaires (00:05 tous les lundis)
SELECT cron.schedule(
  'weekly-investment-payouts',
  '5 0 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://swefwubntyyfqaerlwym.supabase.co/functions/v1/investment-payout',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  );
  $$
);

-- 3. Paiements mensuels (00:10 le 1er de chaque mois)
SELECT cron.schedule(
  'monthly-investment-payouts',
  '10 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://swefwubntyyfqaerlwym.supabase.co/functions/v1/investment-payout',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
    body := '{"frequency": "monthly"}'::jsonb
  );
  $$
);

-- ===================================================
-- CRON JOBS POUR LES TONTINES
-- ===================================================

-- 4. Débit automatique des tontines (00:15 tous les jours)
SELECT cron.schedule(
  'tontine-auto-debit',
  '15 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://swefwubntyyfqaerlwym.supabase.co/functions/v1/tontine-auto-debit',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 5. Tirages automatiques des tontines (00:20 tous les jours)
SELECT cron.schedule(
  'tontine-auto-draw',
  '20 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://swefwubntyyfqaerlwym.supabase.co/functions/v1/tontine-draw',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);