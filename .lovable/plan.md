# Plan : MLM basé sur le bénéfice des packs

## 1. Base de données (migration Supabase)

**Nouvelle table `mlm_packs`** :
- name, description, price, benefit_amount (bénéfice défini par l'admin)
- images (array d'URLs depuis le bucket storage)
- partner_name, partner_logo_url, partner_image_url
- is_active, created_by, timestamps

**Nouvelle table `mlm_pack_commission_levels`** :
- pack_id, level (1 à ∞), percentage
- L'admin définit le % du niveau 1 ; les niveaux suivants suivent une décroissance configurable (taux de décroissance par pack)
- Champs : base_percentage (niveau 1), decay_rate, max_levels (par défaut illimité, on peut capper à 20-50 par perf)

**Nouvelle table `mlm_pack_purchases`** :
- pack_id, buyer_id, price_paid, benefit_amount, status
- Débit du portefeuille via `decrement_wallet_balance`

**Nouvelle table `mlm_pack_commissions`** :
- purchase_id, beneficiary_id (le parrain), level, percentage, amount
- Trigger qui, à l'achat, remonte la chaîne `profiles.referred_by` et distribue les commissions calculées sur `benefit_amount`

**Storage bucket `mlm-packs`** public pour images/logos partenaires.

**RLS** :
- Packs : lecture publique des actifs, écriture admin uniquement
- Achats : utilisateur voit les siens, admin voit tout
- Commissions : utilisateur voit ses propres gains, admin voit tout

## 2. Pages Admin

**`src/pages/AdminMLMPacks.tsx`** (route `/admin/mlm-packs`) :
- CRUD packs (nom, prix, bénéfice, description, partenaire, logos, images multiples via upload)
- Éditeur de structure de commissions (% niveau 1 + taux décroissance + nb niveaux)
- Aperçu calcul : "À ce pack, niveau 1 = X FCFA, niveau 2 = Y FCFA…"
- Liste des achats récents + commissions distribuées

Lien dans `AdminDashboard.tsx` et `DashboardGateway.tsx` (section admin).

## 3. Pages Utilisateur

**`src/pages/MLMPacks.tsx`** (route `/packs`) :
- Grille des packs actifs avec carrousel d'images, prix, bénéfice mis en avant, partenaire
- Bouton "Acheter avec mon portefeuille" → débit + création purchase + trigger commissions
- Redirection vers recharge si solde insuffisant
- Notification navigateur sur achat + sur réception de commission

**`src/pages/MyMLMCommissions.tsx`** (optionnel, intégré dans Dashboard) :
- Historique des commissions reçues par pack/niveau

Lien dans `DashboardGateway.tsx` (menu utilisateur).

## 4. Refonte page d'accueil

`src/components/HeroSection.tsx` et `HowItWorksSection.tsx` :
- Renforcer l'esprit d'entraide, solidarité, opportunités collectives
- Ajouter une section "Histoires de Moissonneurs" avec témoignages captivants (parcours réels : père de famille, jeune entrepreneure, agriculteur, étudiante)
- Imagerie de communauté (réutiliser hero-background existant + nouveaux visuels générés)
- Mettre en avant les packs comme levier de richesse collective

Nouvelle section `MoissonneursStoriesSection.tsx` avec 3-4 récits courts et impactants.

## 5. Détails techniques

- Calcul commission : `commission_level_n = benefit_amount * (base_percentage * decay_rate^(n-1)) / 100`
- Décroissance configurable par pack (ex: 0.85 = -15% par niveau)
- Capping à 20 niveaux par défaut pour éviter l'explosion des inserts (l'utilisateur a parlé d'"infini" mais on plafonne raisonnablement avec valeur configurable)
- Trigger PL/pgSQL `distribute_pack_commissions` exécuté après insert sur `mlm_pack_purchases` (status completed)

## Question avant exécution

Le nombre de niveaux est dit "infini". Je propose de plafonner à **20 niveaux** (cohérent avec les 20 niveaux déjà mis en avant sur le site) avec un % décroissant configurable par pack. OK pour toi ?
