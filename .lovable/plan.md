
## Demande

Trois chantiers en un :

1. **Conversion multi-devises** — l'utilisateur choisit sa monnaie locale d'affichage ; les soldes, prix, MSN se convertissent automatiquement dans toute l'application.
2. **Bouton "Espace Membre / Gestionnaire"** sur la page d'accueil — accès rapide à la marketplace, aux commandes MSN Meno, à la connexion, etc.
3. **Système de points relais de livraison** (type Jumia Delivery) — l'admin crée et gère les relais par pays/ville, peut transformer une boutique, un maquis ou tout autre espace en point relais. Lors d'une commande ou d'un achat de pack, l'utilisateur sélectionne pays → ville → point relais, puis vient récupérer.

---

## 1. Conversion multi-devises

### Backend
- Nouvelle table `currency_rates` (code, name, symbol, rate_to_fcfa, is_active, updated_at) — base FCFA.
- Seed initial : FCFA (1), EUR (~655), USD (~600), GBP, NGN, GHS, MAD, CAD, MSN (fixé à 750).
- Préférence utilisateur stockée dans `profiles.preferred_currency` (TEXT, défaut 'FCFA').

### Frontend
- `src/lib/currency.ts` enrichi avec `convertFromFCFA(amount, currency)` et `formatInCurrency(amount, currency)`.
- Hook `useUserCurrency()` qui lit la préférence + les taux Supabase (cache localStorage, refresh 1×/jour) et expose `format(fcfa)`.
- Composant `<Price value={fcfa} />` réutilisable. On remplace les `formatFCFA(...)` les plus visibles (wallet, packs, marketplace, dashboard) par `<Price>`.
- Sélecteur de devise dans le profil utilisateur + raccourci dans la barre supérieure.
- Synchronisation API ouverte : edge function `sync-exchange-rates` qui interroge `https://open.er-api.com/v6/latest/XOF` (gratuit, sans clé) et met à jour `currency_rates`. Bouton de refresh manuel dans l'admin.

---

## 2. Bouton "Espace Membre" sur l'accueil

- Bouton flottant + entrée explicite dans le hero de `src/pages/Index.tsx` ouvrant un panneau (Sheet) "Espace Gestionnaire" avec :
  - Connexion / Inscription
  - Marketplace des boutiques
  - Commandes MSN Meno (lien direct vers `/marketplace?msn=true` ou page dédiée)
  - Mes packs / Mon portefeuille / Tableau de bord
  - Mes commandes & livraisons
- Présent aussi en CTA principal au-dessus du fold.

---

## 3. Points relais de livraison

### Backend
La table `delivery_relay_points` existe déjà (vue dans `AdminDeliveryRelaysManager`). On la complète :
- Ajout colonnes : `host_user_id` (uuid, propriétaire boutique/maquis), `host_type` ('shop' | 'maquis' | 'partner' | 'moissonneur_box' | 'other'), `opening_hours` (jsonb), `description` (text).
- Nouvelle table `relay_deliveries` (purchase_id, relay_point_id, status: `assigned|in_transit|arrived|picked_up`, pickup_code, arrived_at, picked_up_at).
- Trigger de génération automatique du `pickup_code` (réutilise `generate_pickup_code`).
- RLS : lecture publique des relais actifs ; admin gère ; hôte voit ses propres relais ; client voit ses propres `relay_deliveries`.

### Migration / RPC
- Mise à jour de `purchase_mlm_pack` : nouveaux paramètres `p_delivery_mode` ('address' | 'relay'), `p_relay_point_id` ; si mode relais, on crée une ligne `relay_deliveries` et on stocke le `pickup_code` retourné.
- RPC `convert_shop_to_relay(p_shop_id, p_host_type)` pour l'admin : crée un relais depuis une boutique existante (reprend adresse, GPS, téléphone, image).

### Frontend
- **Admin** :
  - `AdminDeliveryRelaysManager` enrichi : filtres pays/ville, bouton "Transformer une boutique/maquis en relais" (sélection dans la liste des shops + maquis existants), édition horaires.
- **Client (achat de pack ou commande marketplace)** :
  - Composant `RelayPointPicker` : sélection cascade Pays → Ville → Point relais (carte + liste, distance si géoloc). Affiche le nom, type (🏪 🍽️ 📦), adresse, horaires.
  - Sur `MLMPackDetail.tsx` : toggle "Livraison à domicile" / "Retrait en point relais" ; si relais, on cache l'adresse et on affiche le picker.
  - Après achat : page de confirmation avec code de retrait (à présenter au relais).
- **Mes livraisons** : page `/mes-livraisons` qui liste les `relay_deliveries` de l'utilisateur avec statut et code.

---

## Détails techniques

- API taux de change : **open.er-api.com** (gratuit, illimité, pas de clé) ; fallback statique si l'appel échoue.
- Tous les libellés en français.
- Couleurs : palette Moov (vert #00A859, violet #7C3AED, noir, blanc) déjà appliquée.
- MSN reste affiché en complément (parité fixe 1 MSN = 750 FCFA) — la devise choisie remplace seulement FCFA dans l'UI principale.
- Aucune suppression de module existant.

---

## Fichiers principaux touchés

- **Migration SQL** : `currency_rates`, `profiles.preferred_currency`, extension `delivery_relay_points`, table `relay_deliveries`, RPC `purchase_mlm_pack` (v2), RPC `convert_shop_to_relay`, RLS.
- **Edge function** : `supabase/functions/sync-exchange-rates/index.ts`.
- **Nouveaux** : `src/hooks/useUserCurrency.tsx`, `src/components/Price.tsx`, `src/components/CurrencySelector.tsx`, `src/components/relay/RelayPointPicker.tsx`, `src/pages/MyRelayDeliveries.tsx`, `src/components/home/MemberHubSheet.tsx`.
- **Modifiés** : `src/lib/currency.ts`, `src/pages/Index.tsx`, `src/pages/Profile.tsx`, `src/pages/MLMPackDetail.tsx`, `src/pages/MLMPacks.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Marketplace.tsx`, `src/components/dashboard/AdminDeliveryRelaysManager.tsx`, `src/App.tsx` (route `/mes-livraisons`).

---

## Hors périmètre

- Pas d'intégration directe avec l'API Jumia (closed source) — on construit notre propre réseau de relais, comme demandé en alternative.
- Pas de paiement réel des frais de livraison aux relais (peut être ajouté plus tard).
