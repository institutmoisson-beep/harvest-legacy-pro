## Demande

Cinq chantiers liés à la professionnalisation et la communication :

1. **Documents PDF auto-générés à l'achat d'un pack MLM** : reçu de paiement, contrat de garantie, contrat de livraison (15 j max), signés numériquement « Oniel Celvus — Directeur Général ».
2. **Code unique de commande** à présenter au point relais (déjà partiellement via `pickup_code`, on l'unifie et on l'imprime sur les documents).
3. **Contrat d'adhésion communautaire** téléchargeable par tout utilisateur, pré-signé par le DG, à contre-signer.
4. **Hub Admin (Gestionnaire de tâches)** dans Level Admin : page unique qui regroupe et liste tout ce que l'admin doit administrer avec badges « à traiter » (commandes en attente, retraits, crédits, packs, événements, relais, etc.).
5. **Canal de diffusion Admin → Utilisateurs** : l'admin publie messages, images, liens (Zoom…) ; chaque utilisateur a sa « Boîte Canal » avec historique.

---

## 1. Génération de documents PDF

### Stack
- Librairie : `jspdf` + `jspdf-autotable` (déjà légères, côté client, pas de Edge function nécessaire).
- Police signature : Google Font script `Great Vibes` (chargée via CSS pour rendu d'aperçu) — pour le PDF, on dessine le nom en italique cursive via la police « italic » intégrée de jsPDF + tracé manuel d'un trait de signature.
- Logo Moissonneur + couleurs Moov (vert #00A859 / violet #7C3AED).

### Module `src/lib/documents/`
- `generateReceipt(purchase, user, pack)` → PDF reçu de paiement.
- `generateWarrantyContract(purchase, user, pack)` → contrat de garantie produit.
- `generateDeliveryContract(purchase, user, pack, relay?)` → contrat de livraison sous 15 jours, mentionne mode (domicile/relais) + adresse + code retrait.
- `generateMembershipContract(user)` → contrat d'adhésion communautaire.
- `drawSignature(pdf, x, y)` → composant signature DG réutilisable : nom « Oniel Celvus » en cursive, titre « Directeur Général », date, paraphe stylisé.

### Intégration
- Après succès du RPC `purchase_mlm_pack` dans `MLMPackDetail.tsx` :
  - Affichage écran de confirmation avec 3 boutons « Télécharger reçu / contrat garantie / contrat livraison ».
  - Stockage du `pickup_code` retourné côté UI pour le mettre sur tous les documents.
- Sur `Profile.tsx` : bouton « Télécharger mon contrat d'adhésion ».
- Sur `MyRelayDeliveries.tsx` : bouton « Re-télécharger les documents » par commande.

### Code unique
- Réutilisation de `pickup_code` (déjà généré par `set_delivery_codes` / `generate_pickup_code`) comme référence unique sur tous les documents, qu'il s'agisse d'une livraison à domicile ou en relais. Pour les livraisons domicile sans code existant, on en génère un côté frontend (`MSN-<8 chars hex>`) et on stocke dans `mlm_pack_purchases.tracking_code`.

### Migration mineure
- Ajout colonne `tracking_code TEXT` sur `mlm_pack_purchases` (génération auto par trigger si null à l'insert).

---

## 2. Hub Admin « Gestionnaire de tâches »

### Nouveau composant : `src/components/dashboard/AdminTaskHub.tsx`
- Grille de cartes regroupées par catégorie :
  - **Finances** : retraits en attente, transactions à approuver, demandes de crédit
  - **MLM** : achats packs en attente, livraisons relais à préparer
  - **Marketplace** : commandes à valider, produits à modérer
  - **Communauté** : événements à approuver, cagnottes à activer
  - **Transport / Immo** : courses, biens à valider
  - **Diffusion** : nouveau message canal
- Chaque carte affiche un badge avec compteur (requêtes count à Supabase) + lien direct vers l'onglet correspondant.
- Auto-refresh toutes les 30 s.

### Intégration
- Nouvel onglet `<TabsTrigger value="hub">🧭 Gestionnaire</TabsTrigger>` placé en première position dans `src/pages/LevelAdmin.tsx`, défaut actif.
- Mêmes compteurs aussi affichés sur `AdminDashboard.tsx`.

---

## 3. Canal de diffusion Admin → Utilisateurs

### Backend (migration)
- Table `broadcast_channel_messages` :
  - `id`, `author_id` (admin), `title`, `body TEXT`, `image_url TEXT NULL`, `link_url TEXT NULL`, `link_label TEXT NULL`, `category TEXT` (info / réunion / annonce), `published_at TIMESTAMPTZ`, `created_at`.
- Table `broadcast_channel_reads` :
  - `message_id`, `user_id`, `read_at`. Unique (message_id, user_id).
- RLS :
  - SELECT : tous les utilisateurs authentifiés.
  - INSERT / UPDATE / DELETE : `has_access_level(auth.uid(), 80)`.
  - Lectures : utilisateur ne peut insérer/voir que ses propres `broadcast_channel_reads`.

### Frontend
- Nouvelle page `src/pages/BroadcastChannel.tsx` (route `/canal`) — liste chronologique des messages, badge « Non lu », bouton « Marquer lu », vignette image, bouton « Rejoindre » pour les liens (Zoom…).
- Bouton flottant dans `Index.tsx` + raccourci dans le `MemberHubSheet` + entrée dans la navbar utilisateur (avec compteur non-lus).
- Composant admin `src/components/dashboard/BroadcastChannelAdmin.tsx` :
  - Formulaire : titre, corps, upload image (bucket Supabase `broadcast`), lien + libellé, catégorie, programmation `published_at`.
  - Liste des messages publiés avec édition / suppression.
- Ajout d'un onglet « 📢 Canal » dans LevelAdmin.

### Storage
- Bucket public `broadcast` pour les images uploadées.

### Real-time
- Subscription Realtime `broadcast_channel_messages` pour faire apparaître les nouveaux messages sans refresh + déclencher notification navigateur.

---

## Fichiers principaux touchés / créés

### Création
- `src/lib/documents/pdfBase.ts` — helpers communs (entête, footer, signature DG).
- `src/lib/documents/receipt.ts`
- `src/lib/documents/warrantyContract.ts`
- `src/lib/documents/deliveryContract.ts`
- `src/lib/documents/membershipContract.ts`
- `src/components/documents/PackDocumentsActions.tsx` — boutons regroupés.
- `src/components/dashboard/AdminTaskHub.tsx`
- `src/components/dashboard/BroadcastChannelAdmin.tsx`
- `src/pages/BroadcastChannel.tsx`
- Migration SQL : `tracking_code`, tables broadcast, RLS, bucket storage.

### Modification
- `src/pages/MLMPackDetail.tsx` — écran post-achat avec 3 documents.
- `src/pages/Profile.tsx` — bouton contrat d'adhésion.
- `src/pages/MyRelayDeliveries.tsx` — re-téléchargement documents.
- `src/pages/LevelAdmin.tsx` — onglets « Gestionnaire » + « Canal », nouveau défaut.
- `src/components/home/MemberHubSheet.tsx` — entrée Canal.
- `src/App.tsx` — route `/canal`.
- `src/components/Navbar.tsx` — icône canal + badge non-lus (si présente).

### Dépendances à ajouter
- `jspdf`, `jspdf-autotable`.

---

## Hors périmètre

- Pas de signature numérique cryptographique réelle (PKI / e-IDAS) : signature visuelle uniquement, comme demandé.
- Pas de programmation différée de messages (publish_at est stocké mais l'envoi est immédiat ; champ prévu pour évolution).
- Pas de notifications push iOS dédiées (réutilise le système existant Web Notification API).
- Aucune suppression de module existant.
