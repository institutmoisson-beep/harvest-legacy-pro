-- Table pour les domaines d'emploi disponibles
CREATE TABLE IF NOT EXISTS public.job_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les profils professionnels des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_job_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_domain_id UUID NOT NULL REFERENCES public.job_domains(id),
  selected_at TIMESTAMPTZ DEFAULT now(),
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_domain_id)
);

-- Enable RLS
ALTER TABLE public.job_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_domains
CREATE POLICY "Everyone can view active job domains"
ON public.job_domains FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage job domains"
ON public.job_domains FOR ALL
USING (has_access_level(auth.uid(), 90));

-- RLS Policies for user_job_profiles
CREATE POLICY "Users can view own job profiles"
ON public.user_job_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their job profiles"
ON public.user_job_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their job profiles"
ON public.user_job_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their job profiles"
ON public.user_job_profiles FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all job profiles"
ON public.user_job_profiles FOR ALL
USING (has_access_level(auth.uid(), 90));

CREATE POLICY "Users can view profiles with job domains"
ON public.user_job_profiles FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_job_profiles_user_id ON public.user_job_profiles(user_id);
CREATE INDEX idx_user_job_profiles_job_domain_id ON public.user_job_profiles(job_domain_id);
CREATE INDEX idx_job_domains_active ON public.job_domains(is_active);

-- Trigger to update updated_at
CREATE TRIGGER trigger_job_domains_updated_at
BEFORE UPDATE ON public.job_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_user_job_profiles_updated_at
BEFORE UPDATE ON public.user_job_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial job domains (50+ items)
INSERT INTO public.job_domains (name, category, description, emoji, display_order) VALUES
-- Services Juridiques & Administration
('Juriste Moissonneur', 'Services Juridiques', 'Services juridiques et conseil légal', '⚖️', 1),
('Avocat Moissonneur', 'Services Juridiques', 'Assistance juridique et représentation légale', '👨‍⚖️', 2),
('Notaire Moissonneur', 'Services Juridiques', 'Services notariaux et authentification', '📜', 3),
('Consultant Administratif Moissonneur', 'Services Juridiques', 'Conseil en administration et conformité', '📋', 4),

-- Sécurité & Protection
('Moissonneur Security', 'Sécurité', 'Services de sécurité et protection', '🛡️', 5),
('Garde de Sécurité Moissonneur', 'Sécurité', 'Service de surveillance et protection', '👮', 6),
('Expert en Cybersécurité Moissonneur', 'Sécurité', 'Protection numérique et sécurité informatique', '🔐', 7),

-- Éducation & Formation
('Enseignant Moissonneur', 'Éducation', 'Services d''enseignement et formation', '🎓', 8),
('Formateur Professionnel Moissonneur', 'Éducation', 'Formation et développement des compétences', '👨‍🏫', 9),
('Coach Académique Moissonneur', 'Éducation', 'Soutien académique et tutorat', '📚', 10),
('Développeur de Cours Moissonneur', 'Éducation', 'Création de contenu pédagogique', '✍️', 11),

-- Informatique & Technologie
('Informaticien Moissonneur', 'Informatique', 'Services informatiques et support technique', '💻', 12),
('Développeur Web Moissonneur', 'Informatique', 'Développement web et applications', '🌐', 13),
('Développeur Mobile Moissonneur', 'Informatique', 'Développement d''applications mobiles', '📱', 14),
('Administrateur Réseau Moissonneur', 'Informatique', 'Gestion et administration de réseaux', '🖥️', 15),
('Spécialiste Base de Données Moissonneur', 'Informatique', 'Gestion et optimisation de bases de données', '🗄️', 16),
('Graphiste Web Moissonneur', 'Informatique', 'Design graphique et interface utilisateur', '🎨', 17),

-- Mécanique & Réparation
('Mécanicien Moissonneur', 'Mécanique', 'Réparation et entretien automobile', '🔧', 18),
('Électricien Moissonneur', 'Mécanique', 'Services électriques et électriques', '⚡', 19),
('Technicien Électronique Moissonneur', 'Mécanique', 'Réparation d''appareils électroniques', '🔌', 20),
('Plombier Moissonneur', 'Mécanique', 'Services de plomberie et tuyauterie', '🚰', 21),
('Charpentier Moissonneur', 'Mécanique', 'Travaux de menuiserie et charpente', '🪵', 22),

-- Santé & Bien-être
('Médecin Moissonneur', 'Santé', 'Services médicaux et consultation', '👨‍⚕️', 23),
('Infirmier Moissonneur', 'Santé', 'Services infirmiers et soins', '⚕️', 24),
('Pharmacien Moissonneur', 'Santé', 'Services pharmaceutiques et conseils', '💊', 25),
('Thérapeute Moissonneur', 'Santé', 'Thérapie et bien-être', '🧘', 26),
('Nutritionniste Moissonneur', 'Santé', 'Conseil nutritionnel et diététique', '🥗', 27),
('Dentiste Moissonneur', 'Santé', 'Services dentaires et orthodontie', '🦷', 28),

-- Commerce & Vente
('Vendeur Moissonneur', 'Commerce', 'Services de vente et conseil client', '🛒', 29),
('Vendeur Spécialisé Moissonneur', 'Commerce', 'Vente de produits spécialisés', '🏪', 30),
('Commercial Moissonneur', 'Commerce', 'Gestion commerciale et prospection', '💼', 31),
('Négociant Moissonneur', 'Commerce', 'Négoce et commerce intermédiaire', '📊', 32),

-- Transport & Logistique
('Chauffeur Moissonneur', 'Transport', 'Services de transport et livraison', '🚗', 33),
('Coursier Moissonneur', 'Transport', 'Service de messagerie et transport léger', '🚲', 34),
('Logisticien Moissonneur', 'Transport', 'Gestion et optimisation logistique', '📦', 35),
('Agent de Port Moissonneur', 'Transport', 'Service portuaire et manutention', '⚙️', 36),

-- Arts & Culture
('Artiste Moissonneur', 'Arts', 'Services artistiques et création', '🎭', 37),
('Musicien Moissonneur', 'Arts', 'Services musicaux et composition', '🎵', 38),
('Photographe Moissonneur', 'Arts', 'Services photographiques', '📷', 39),
('Vidéographe Moissonneur', 'Arts', 'Production vidéo et montage', '🎬', 40),
('Illustrateur Moissonneur', 'Arts', 'Illustration et dessin', '🖌️', 41),

-- Gastronomie
('Chef Cuisinier Moissonneur', 'Gastronomie', 'Préparation culinaire et catering', '👨‍🍳', 42),
('Pâtissier Moissonneur', 'Gastronomie', 'Pâtisserie et confiserie', '🍰', 43),
('Boulanger Moissonneur', 'Gastronomie', 'Boulangerie et viennoiserie', '🥐', 44),
('Barista Moissonneur', 'Gastronomie', 'Service de café et boissons', '☕', 45),

-- Services à la Personne
('Coiffeur Moissonneur', 'Services Personnels', 'Coiffure et soins capillaires', '✂️', 46),
('Esthéticien Moissonneur', 'Services Personnels', 'Services d''esthétique et beauté', '💄', 47),
('Massothérapeute Moissonneur', 'Services Personnels', 'Massage et thérapies corporelles', '💆', 48),
('Nettoyeur Professionnel Moissonneur', 'Services Personnels', 'Nettoyage et entretien', '🧹', 49),
('Gardien d''Enfants Moissonneur', 'Services Personnels', 'Garde et éducation d''enfants', '👶', 50),

-- Gestion & Finances
('Comptable Moissonneur', 'Gestion', 'Services comptables et fiscaux', '📐', 51),
('Expert-Comptable Moissonneur', 'Gestion', 'Audit et conseil comptable', '💹', 52),
('Consultant Financier Moissonneur', 'Gestion', 'Conseil en investissement et finance', '💰', 53),
('Agent d''Assurance Moissonneur', 'Gestion', 'Services d''assurance et protection', '📋', 54),
('Gestionnaire Immobilier Moissonneur', 'Gestion', 'Gestion immobilière et location', '🏠', 55),

-- Autres
('Consultant Général Moissonneur', 'Autres', 'Conseil en gestion et stratégie', '🧠', 56),
('Traducteur Moissonneur', 'Autres', 'Services de traduction et interprétation', '🌍', 57),
('Entrepreneur Moissonneur', 'Autres', 'Création et gestion d''entreprise', '🚀', 58),
('Bénévole Moissonneur', 'Autres', 'Engagement bénévole et solidaire', '❤️', 59);
