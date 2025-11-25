# 💼 Système de Domaines d'Emploi - Documentation

## 📋 Vue d'ensemble
Un système complet permettant aux utilisateurs de sélectionner et d'afficher leurs domaines d'emploi professionnels sur la plateforme Moissonneur.

---

## ✨ Fonctionnalités Implémentées

### 1. **Base de Données**
- ✅ Table `job_domains`: 59 domaines d'emploi prédéfinis
- ✅ Table `user_job_profiles`: Associations utilisateur-domaines
- ✅ Row Level Security (RLS) pour sécuriser l'accès
- ✅ Indexes pour optimiser les performances
- ��� Triggers pour mettre à jour les timestamps

### 2. **Composants Frontend**

#### `JobDomainSelector` (src/components/dashboard/JobDomainSelector.tsx)
- Interface pour sélectionner les domaines d'emploi
- Recherche et filtrage par catégorie
- Affichage des domaines actuels
- Suppression des domaines
- Gestion complète des domaines utilisateur

#### `UserJobDomainBadges` (src/components/dashboard/UserJobDomainBadges.tsx)
- Affichage des domaines avec badges
- Tooltips pour les informations détaillées
- Support du domaine primaire
- Limitation de l'affichage avec compteur "+X"

### 3. **Pages Admin**

#### `AdminJobDomains` (src/pages/AdminJobDomains.tsx)
- **Onglet Domaines d'Emploi**:
  - Création/Modification/Suppression de domaines
  - Recherche et filtrage
  - Affichage des utilisateurs par domaine
  - Gestion des catégories
  - Gestion de l'ordre d'affichage
  
- **Onglet Associations Utilisateurs**:
  - Vue de toutes les associations domaine-utilisateur
  - Informations détaillées
  - Historique des sélections

### 4. **Profil Utilisateur**
- Intégration du `JobDomainSelector` dans la page Profile
- Les utilisateurs peuvent ajouter/modifier/supprimer leurs domaines d'emploi

---

## 🎯 Domaines d'Emploi Disponibles (59)

### Services Juridiques & Administration (4)
- ⚖️ Juriste Moissonneur
- 👨‍⚖️ Avocat Moissonneur
- 📜 Notaire Moissonneur
- 📋 Consultant Administratif Moissonneur

### Sécurité (3)
- 🛡️ Moissonneur Security
- 👮 Garde de Sécurité Moissonneur
- 🔐 Expert en Cybersécurité Moissonneur

### Éducation (4)
- 🎓 Enseignant Moissonneur
- 👨‍🏫 Formateur Professionnel Moissonneur
- 📚 Coach Académique Moissonneur
- ✍️ Développeur de Cours Moissonneur

### Informatique & Technologie (6)
- 💻 Informaticien Moissonneur
- 🌐 Développeur Web Moissonneur
- 📱 Développeur Mobile Moissonneur
- 🖥️ Administrateur Réseau Moissonneur
- 🗄️ Spécialiste Base de Données Moissonneur
- 🎨 Graphiste Web Moissonneur

### Mécanique & Réparation (5)
- 🔧 Mécanicien Moissonneur
- ⚡ Électricien Moissonneur
- 🔌 Technicien Électronique Moissonneur
- 🚰 Plombier Moissonneur
- 🪵 Charpentier Moissonneur

### Santé & Bien-être (6)
- 👨‍⚕️ Médecin Moissonneur
- ⚕️ Infirmier Moissonneur
- 💊 Pharmacien Moissonneur
- 🧘 Thérapeute Moissonneur
- 🥗 Nutritionniste Moissonneur
- 🦷 Dentiste Moissonneur

### Commerce & Vente (4)
- 🛒 Vendeur Moissonneur
- 🏪 Vendeur Spécialisé Moissonneur
- 💼 Commercial Moissonneur
- 📊 Négociant Moissonneur

### Transport & Logistique (4)
- 🚗 Chauffeur Moissonneur
- 🚲 Coursier Moissonneur
- 📦 Logisticien Moissonneur
- ⚙️ Agent de Port Moissonneur

### Arts & Culture (5)
- 🎭 Artiste Moissonneur
- 🎵 Musicien Moissonneur
- 📷 Photographe Moissonneur
- 🎬 Vidéographe Moissonneur
- 🖌️ Illustrateur Moissonneur

### Gastronomie (4)
- 👨‍🍳 Chef Cuisinier Moissonneur
- 🍰 Pâtissier Moissonneur
- 🥐 Boulanger Moissonneur
- ☕ Barista Moissonneur

### Services à la Personne (5)
- ✂️ Coiffeur Moissonneur
- 💄 Esthéticien Moissonneur
- 💆 Massothérapeute Moissonneur
- 🧹 Nettoyeur Professionnel Moissonneur
- 👶 Gardien d'Enfants Moissonneur

### Gestion & Finances (5)
- 📐 Comptable Moissonneur
- 💹 Expert-Comptable Moissonneur
- 💰 Consultant Financier Moissonneur
- 📋 Agent d'Assurance Moissonneur
- 🏠 Gestionnaire Immobilier Moissonneur

### Autres (4)
- 🧠 Consultant Général Moissonneur
- 🌍 Traducteur Moissonneur
- 🚀 Entrepreneur Moissonneur
- ❤️ Bénévole Moissonneur

---

## 🚀 Guide d'Utilisation

### Pour les Utilisateurs
1. Accéder à **Profil** dans le menu utilisateur
2. Cliquer sur **"Ajouter un domaine"** dans la section "Mes Domaines d'Emploi"
3. Rechercher ou filtrer par catégorie
4. Cliquer sur **"Ajouter"** pour confirmer
5. Le domaine s'affiche dans votre profil avec un badge

### Pour les Administrateurs
1. Accéder au **Dashboard Administrateur**
2. Cliquer sur **"Domaines d'Emploi"** (nouvelle carte)
3. **Onglet Domaines d'Emploi**:
   - Remplir le formulaire pour créer/modifier un domaine
   - Utiliser la recherche pour filtrer les domaines
   - Voir le nombre d'utilisateurs par domaine
   - Modifier ou supprimer des domaines

4. **Onglet Associations Utilisateurs**:
   - Consulter toutes les associations utilisateur-domaine
   - Voir le domaine primaire
   - Historique des sélections

---

## 🔒 Sécurité

### Policies RLS (Row Level Security)
- ✅ Les utilisateurs ne peuvent voir que leurs propres domaines
- ✅ Les administrateurs peuvent gérer tous les domaines
- ✅ Les domaines inactifs ne sont pas visibles aux utilisateurs standards
- ✅ Seul le propriétaire peut modifier/supprimer ses domaines

### Permissions
- **Utilisateurs standards**: Peuvent voir/créer/modifier/supprimer leurs propres domaines
- **Administrateurs**: Accès complet à la gestion des domaines et associations
- **Super Admins**: Contrôle total du système

---

## 📱 Intégration avec d'autres Composants

### UserJobDomainBadges
Utilisable dans n'importe quel profil utilisateur:
```tsx
import UserJobDomainBadges from '@/components/dashboard/UserJobDomainBadges';

<UserJobDomainBadges 
  userId={userId} 
  variant="secondary"
  showLabel={true}
  maxDisplay={3}
/>
```

---

## 🔧 Routes Disponibles

- `/profile` - Gestion des domaines d'emploi de l'utilisateur
- `/admin/job-domains` - Gestion administrative complète
- `/admin` - Lien rapide vers la gestion des domaines

---

## 📊 Structure de Données

### Table: job_domains
```sql
- id (UUID)
- name (TEXT UNIQUE) - Nom du domaine
- category (TEXT) - Catégorie
- description (TEXT) - Description détaillée
- emoji (TEXT) - Emoji du domaine
- icon (TEXT) - Icône (optionnel)
- is_active (BOOLEAN) - Activation
- display_order (INTEGER) - Ordre d'affichage
- created_at, updated_at (TIMESTAMPTZ)
```

### Table: user_job_profiles
```sql
- id (UUID)
- user_id (UUID) - Référence à l'utilisateur
- job_domain_id (UUID) - Référence au domaine
- selected_at (TIMESTAMPTZ) - Date de sélection
- is_primary (BOOLEAN) - Domaine principal
- created_at, updated_at (TIMESTAMPTZ)
```

---

## ✅ Checklist d'Implémentation

- ✅ Migration de base de données appliquée
- ✅ 59 domaines d'emploi créés
- ✅ Composant JobDomainSelector
- ✅ Composant UserJobDomainBadges
- ✅ Page AdminJobDomains
- ✅ Intégration dans Profile.tsx
- ✅ Routes configurées
- ✅ RLS et sécurité
- ✅ Indexes de performance
- ✅ Lien dans AdminDashboard

---

## 🎨 Prochaines Étapes Possibles

1. **Affichage public**: Montrer les domaines d'emploi dans les profils publics
2. **Recherche avancée**: Filtrer les utilisateurs par domaines d'emploi
3. **Badges spéciaux**: Badges à débloquer pour certains domaines
4. **Certification**: Système de certification pour certains domaines
5. **Statistiques**: Dashboard avec statistiques par domaine
6. **Notifications**: Alertes pour les utilisateurs avec domaines spécifiques

---

## 📞 Support

Pour toute question ou modification, consultez la documentation du code:
- `src/components/dashboard/JobDomainSelector.tsx`
- `src/pages/AdminJobDomains.tsx`
- `supabase/migrations/20251121140000_add_job_domains.sql`
