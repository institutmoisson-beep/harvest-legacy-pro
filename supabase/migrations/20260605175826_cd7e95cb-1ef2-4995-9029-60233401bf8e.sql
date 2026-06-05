
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_moissonneur text UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS est_souverain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verification_token_idx ON public.profiles(verification_token);

DO $$
DECLARE
  r record;
  seq int := 1;
  yr text := to_char(now(), 'YYYY');
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE id_moissonneur IS NULL ORDER BY created_at LOOP
    UPDATE public.profiles
      SET id_moissonneur = 'MS-' || yr || '-' || lpad(seq::text, 4, '0')
      WHERE id = r.id;
    seq := seq + 1;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.assign_id_moissonneur()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_seq int;
BEGIN
  IF NEW.id_moissonneur IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(id_moissonneur, '^MS-\d{4}-', ''), '')::int), 0) + 1
      INTO next_seq
      FROM public.profiles
      WHERE id_moissonneur LIKE 'MS-' || yr || '-%';
    NEW.id_moissonneur := 'MS-' || yr || '-' || lpad(next_seq::text, 4, '0');
  END IF;
  IF NEW.verification_token IS NULL THEN
    NEW.verification_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_id_moissonneur ON public.profiles;
CREATE TRIGGER trg_assign_id_moissonneur
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_id_moissonneur();

CREATE OR REPLACE FUNCTION public.verify_moissonneur(_token uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  id_moissonneur text,
  avatar_url text,
  est_souverain boolean,
  career_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.id_moissonneur, p.avatar_url, p.est_souverain, p.career_level::text
  FROM public.profiles p
  WHERE p.verification_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_moissonneur(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_est_souverain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.profiles SET est_souverain = true WHERE id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_souverain ON public.mlm_pack_purchases;
CREATE TRIGGER trg_sync_souverain
  AFTER INSERT OR UPDATE ON public.mlm_pack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.sync_est_souverain();

UPDATE public.profiles p
  SET est_souverain = true
  WHERE EXISTS (
    SELECT 1 FROM public.mlm_pack_purchases mp
    WHERE mp.buyer_id = p.id AND mp.status = 'completed'
  );
