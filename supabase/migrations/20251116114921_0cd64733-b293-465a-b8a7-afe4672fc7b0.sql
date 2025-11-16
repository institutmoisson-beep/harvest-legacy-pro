-- Étape 1: Ajouter les nouveaux rôles pour les représentants géographiques
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'country_representative' AND enumtypid = 'public.app_role'::regtype) THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE ''country_representative''';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'city_representative' AND enumtypid = 'public.app_role'::regtype) THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE ''city_representative''';
  END IF;
END $$;