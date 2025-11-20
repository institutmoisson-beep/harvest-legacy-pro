-- Ajouter les nouvelles valeurs de career_level à l'enum existant
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'semeur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'cultivateur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'recolteur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'gestionnaire';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'superviseur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'coordinateur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'directeur';
ALTER TYPE public.career_level ADD VALUE IF NOT EXISTS 'ambassadeur';

-- Note: 'gouverneur' et 'guide' existent déjà dans l'enum