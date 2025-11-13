-- Trigger pour créer automatiquement le schedule de paiement lors de la création d'une tontine

CREATE OR REPLACE FUNCTION public.create_tontine_payment_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cycle_date DATE;
  i INT;
BEGIN
  -- Générer le schedule pour tous les cycles (max_participants cycles)
  FOR i IN 1..NEW.max_participants LOOP
    -- Calculer la date d'échéance selon la fréquence
    CASE NEW.frequency
      WHEN 'daily' THEN
        cycle_date := NEW.start_date::DATE + (i - 1) * INTERVAL '1 day';
      WHEN 'weekly' THEN
        cycle_date := NEW.start_date::DATE + (i - 1) * INTERVAL '7 days';
      WHEN 'monthly' THEN
        cycle_date := NEW.start_date::DATE + (i - 1) * INTERVAL '1 month';
      ELSE
        cycle_date := NEW.start_date::DATE + (i - 1) * INTERVAL '1 month';
    END CASE;

    -- Insérer dans le schedule
    INSERT INTO public.tontine_payment_schedule (
      tontine_id,
      cycle_number,
      due_date,
      amount,
      status
    ) VALUES (
      NEW.id,
      i,
      cycle_date,
      NEW.amount,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table tontines
DROP TRIGGER IF EXISTS trigger_create_payment_schedule ON public.tontines;

CREATE TRIGGER trigger_create_payment_schedule
AFTER INSERT ON public.tontines
FOR EACH ROW
EXECUTE FUNCTION public.create_tontine_payment_schedule();

-- Générer le schedule pour les tontines existantes qui n'en ont pas
DO $$
DECLARE
  tontine_record RECORD;
  cycle_date DATE;
  i INT;
BEGIN
  FOR tontine_record IN 
    SELECT * FROM public.tontines 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tontine_payment_schedule 
      WHERE tontine_id = tontines.id
    )
  LOOP
    FOR i IN 1..tontine_record.max_participants LOOP
      CASE tontine_record.frequency
        WHEN 'daily' THEN
          cycle_date := tontine_record.start_date::DATE + (i - 1) * INTERVAL '1 day';
        WHEN 'weekly' THEN
          cycle_date := tontine_record.start_date::DATE + (i - 1) * INTERVAL '7 days';
        WHEN 'monthly' THEN
          cycle_date := tontine_record.start_date::DATE + (i - 1) * INTERVAL '1 month';
        ELSE
          cycle_date := tontine_record.start_date::DATE + (i - 1) * INTERVAL '1 month';
      END CASE;

      INSERT INTO public.tontine_payment_schedule (
        tontine_id,
        cycle_number,
        due_date,
        amount,
        status
      ) VALUES (
        tontine_record.id,
        i,
        cycle_date,
        tontine_record.amount,
        'pending'
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
