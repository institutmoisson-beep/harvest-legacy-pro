
# Système "Points Relais Partenaires" (Riz, Attiéké, Resto, Cave, Hôtel)

Module intégré à l'app existante. Réutilise le Wallet MSN, les rôles (`merchant`, `admin`), le système de reçus PDF et le scanner QR déjà présents (`VerifierMoissonneur`, codes alphanumériques type `PKP/DLV/RSV`).

---

## 1. Schéma de base de données (migration Supabase)

Toutes les tables en `public.*` avec `GRANT` + RLS + policies.

### `relay_partners` — Boutiques/Restos/Caves/Hôtels
- `id uuid pk`
- `owner_id uuid` → auth.users (partenaire propriétaire)
- `partner_type text` enum: `alimentation | restaurant | cave | hotel`
- `name text`, `slug text unique`, `description text`
- `address text`, `city text`, `latitude/longitude numeric`
- `phone text`, `cover_url text`, `logo_url text`
- `commission_rate numeric default 10` (% prélevé par la plateforme)
- `is_active bool default true`
- `low_stock_threshold int default 5`
- `created_at/updated_at`

### `relay_products` — Catalogue
- `id uuid pk`, `partner_id uuid` → relay_partners
- `category text` (`riz, attieke, plat, vin, chambre, ...`)
- `name text`, `description text`, `photo_url text`
- `price_fcfa numeric`
- `is_service bool` (true = resto/hôtel, pas de stock physique strict)
- `service_type text` (`product | meal | room_booking`)
- `is_active bool`, `created_at/updated_at`

### `relay_stocks` — Inventaire par boutique
- `id uuid pk`, `partner_id uuid`, `product_id uuid`
- `quantity int default 0`
- `unique(partner_id, product_id)`

### `relay_orders` — Commandes / Réservations
- `id uuid pk`
- `client_id uuid` → auth.users
- `partner_id uuid` → relay_partners
- `product_id uuid` → relay_products
- `quantity int default 1`
- `unit_price numeric`, `total_price numeric`, `commission_amount numeric`, `partner_amount numeric`
- `qr_token text unique` (UUID v4 signé, 64 chars)
- `pickup_code text unique` (ex: `RLP-AB12CD`, code court de secours)
- `status text` enum: `paid_pending | served | refunded | expired`
- `booking_date timestamptz` (pour hôtel/resto avec horaire)
- `served_at timestamptz`, `served_by uuid` (l'agent qui a scanné)
- `payout_status text` enum: `held | released | refunded` default `held`
- `payout_transaction_id uuid` → wallet_transactions
- `created_at/updated_at`

### `relay_stock_movements` — Audit stocks
- `id, partner_id, product_id, order_id, delta int, reason text, created_at`

Réutilisations : `wallets`, `wallet_transactions`, `decrement_wallet_balance`, `increment_wallet_balance`, `treasury` (commissions).

---

## 2. Sécurisation anti double-scan

Le QR encode **uniquement le `qr_token` UUID** (pas d'info métier — opaque). La validation se fait côté serveur via Edge Function avec :

1. `SELECT ... FOR UPDATE` sur `relay_orders` par `qr_token`
2. Refuse si `status != 'paid_pending'` → renvoie 409 `already_served | refunded | expired`
3. Une seule transition possible `paid_pending → served`, garantie par contrainte + verrou ligne
4. Le `qr_token` n'est **jamais réutilisable** : après `served`, toute lecture renvoie un payload "obsolète"
5. RLS : seul un `merchant` rattaché à `partner_id` peut lire et modifier la commande

---

## 3. Fonctions / Edge Functions

### a) `relay_purchase(p_product_id, p_quantity, p_booking_date)` — RPC SQL `SECURITY DEFINER`
```
1. Lock relay_products + relay_stocks (si is_service=false)
2. Vérifie stock >= quantity
3. Calcule total, commission (= total * partner.commission_rate/100), partner_amount
4. PERFORM decrement_wallet_balance(client, total)
5. INSERT wallet_transactions (client → plateforme, type 'relay_order_hold', status 'completed')
6. INSERT relay_orders (status 'paid_pending', payout_status 'held', qr_token = gen_random_uuid(), pickup_code = generate_relay_code())
7. Décrémente stock si produit physique + log relay_stock_movements
8. RETURN order_id, qr_token, pickup_code
```

### b) `relay_scan_serve(p_qr_or_code)` — Edge Function (utilisée par partenaire)
```
1. Authentifie user → vérifie merchant_role + partner ownership
2. SELECT order FOR UPDATE WHERE qr_token = $1 OR pickup_code = upper($1)
3. Si status != 'paid_pending' → 409
4. UPDATE status='served', served_at=now(), served_by=auth.uid()
5. Retourne snapshot commande (photo, nom, qty, client masqué)
```

### c) `relay_release_payout(p_order_id)` — Edge Function admin
```
1. Vérifie role admin (access_level >= 80)
2. Order doit être status='served' && payout_status='held'
3. PERFORM increment_wallet_balance(partner.owner_id, partner_amount)
4. UPDATE treasury += commission_amount
5. INSERT wallet_transactions (plateforme → partner, type 'relay_payout')
6. UPDATE order payout_status='released', payout_transaction_id
```

### d) `relay_refund(p_order_id)` — annulation admin/expiration
- Rembourse wallet client, remet stock, status='refunded'

### e) Trigger alerte stock bas
- AFTER UPDATE sur `relay_stocks` : si `quantity < partner.low_stock_threshold` → INSERT notification destinée aux admins + au owner.

### f) Reçu PDF
Réutilise `src/lib/documents/pdfBase.ts` → `generateRelayReceipt(order, product, partner, client)` avec QR (lib `qrcode`) + `pickup_code` + photo produit + statut.

---

## 4. Arborescence d'écrans

### Client (`/dashboard` menu, ajout dans `DashboardGateway.tsx`)
- `/relais` — Catalogue (onglets : Alimentation / Restaurant / Cave / Hôtel)
- `/relais/partenaire/:slug` — fiche boutique + produits
- `/relais/produit/:id` — détail + bouton "Acheter avec Wallet"
- `/relais/mes-tickets` — liste reçus, badge statut, ouvrir QR plein écran, télécharger PDF
- `/relais/ticket/:orderId` — QR plein écran + code court + détails

### Partenaire (rôle `merchant`, menu + carte dédiée dans `DashboardGateway`)
- `/partenaire/relais` — tableau de bord boutique (CA jour, ventes, alertes stock)
- `/partenaire/relais/scanner` — scanner caméra (lib `html5-qrcode`) + saisie manuelle du code
- `/partenaire/relais/commande/:orderId` — détail post-scan + bouton "Marquer comme servi/livré"
- `/partenaire/relais/produits` — CRUD catalogue + stocks
- `/partenaire/relais/historique` — commandes servies, paiements reçus

### Admin (`/admin` + `AdminFeaturesGateway`)
- `/admin/relais` — temps réel : table commandes (client, produit, partenaire, statut, scanné par, montant)
- `/admin/relais/partenaires` — validation/désactivation partenaires, taux de commission
- `/admin/relais/payouts` — file d'attente reversements `served + held` → bouton "Verser" (appelle `relay_release_payout`)
- `/admin/relais/stocks` — vue globale + alertes stock bas
- `/admin/relais/transactions` — journal wallet_transactions filtré sur les types `relay_*`

---

## 5. Détails techniques

- **QR rendering** : lib `qrcode` (déjà compatible — sinon `bun add qrcode`)
- **QR scanning** : `html5-qrcode` côté partenaire (caméra arrière)
- **Realtime** : `ALTER PUBLICATION supabase_realtime ADD TABLE relay_orders;` pour rafraîchir admin + tickets clients
- **Rôle** : ajouter `merchant` à `relay_partners.owner_id` via flow "Devenir partenaire" (déjà partiellement présent via `MerchantDashboard`)
- **Sécurité PII** : QR n'expose que `qr_token` UUID, pas d'info client
- **i18n** : 100% FR, devise FCFA + équivalent MSN (1 MSN = 750 FCFA, déjà géré dans `currency.ts`)
- **Design tokens** : utiliser `bg-card`, `text-primary`, etc. — aucune couleur hardcodée

---

## 6. Ordre d'implémentation

1. Migration SQL (tables + grants + RLS + RPC `relay_purchase` + triggers)
2. Edge functions `relay-scan-serve` / `relay-release-payout` / `relay-refund`
3. Pages client (catalogue → achat → ticket QR + PDF)
4. Pages partenaire (scanner + validation)
5. Pages admin (dashboard temps réel + payouts + stocks)
6. Branchement dans `DashboardGateway.tsx` et `AdminFeaturesGateway.tsx` (boutons toujours visibles, conformément aux corrections récentes)

Confirme-moi pour que je lance l'implémentation (je peux aussi découper en plusieurs livraisons si tu préfères livrer client → partenaire → admin séparément).
