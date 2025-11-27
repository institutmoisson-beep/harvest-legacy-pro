# Guide d'intégration des moyens de paiement

## 📋 Vue d'ensemble

Le système supporte 4 moyens de paiement pour les commandes:

1. **Paiement à la livraison** (Cash on Delivery)
2. **Wave Paiement** (Wave Money)
3. **Lygos Paiement** (Lygos)
4. **Cryptomonnaie** (CoinPayments - Bitcoin, etc.)

## 🗄️ Structure de base de données

### Tables créées

#### `payment_methods`
Stocke les configurations des moyens de paiement:
```sql
- id (UUID)
- name (VARCHAR): 'cash_on_delivery', 'wave', 'lygos', 'coinpayments'
- display_name (VARCHAR)
- description (TEXT)
- icon (TEXT): emoji ou URL
- is_active (BOOLEAN)
- config (JSONB): configuration spécifique
```

#### `payment_transactions`
Enregistre chaque transaction de paiement:
```sql
- id (UUID)
- order_id (UUID) - référence à la commande
- user_id (UUID) - l'utilisateur qui paie
- payment_method_id (UUID)
- amount (DECIMAL)
- currency (VARCHAR): 'FCFA', 'BTC', etc.
- status (VARCHAR): 'pending', 'processing', 'completed', 'failed', 'cancelled'
- external_transaction_id (VARCHAR): ID du fournisseur de paiement
- payment_details (JSONB): détails supplémentaires
- error_message (TEXT)
```

#### Colonne ajoutée à `orders`
- `payment_method_id (UUID)`: référence au moyen de paiement choisi

## 🎯 Composants principaux

### 1. PaymentMethodSelector
Composant de sélection des moyens de paiement dans le formulaire d'initiation de commande.

**Lieu:** `src/components/payment/PaymentMethodSelector.tsx`

**Utilisation:**
```tsx
<PaymentMethodSelector
  value={paymentMethodId}
  onChange={(methodId, methodName) => {
    setPaymentMethodId(methodId);
    setPaymentMethodName(methodName);
  }}
  disabled={loading}
/>
```

### 2. PaymentConfirmation
Affiche la confirmation de la commande avec les instructions de paiement spécifiques.

**Lieu:** `src/components/payment/PaymentConfirmation.tsx`

### 3. PaymentStatusBadge
Badge pour afficher le statut d'une transaction.

**Lieu:** `src/components/payment/PaymentStatusBadge.tsx`

### 4. PaymentHistoryDashboard
Tableau de bord avec l'historique des transactions et statistiques.

**Lieu:** `src/components/dashboard/PaymentHistoryDashboard.tsx`

## 🔧 Service de paiement

**Lieu:** `src/services/paymentService.ts`

Fonctions disponibles:
- `generateWavePaymentLink()` - Génère le lien de paiement Wave
- `generateLygosQRCode()` - Génère un code QR Lygos
- `generateCoinPaymentsAddress()` - Génère une adresse crypto
- `createPaymentTransaction()` - Crée une transaction
- `updatePaymentStatus()` - Met à jour le statut
- `getUserPaymentTransactions()` - Récupère l'historique
- `checkPaymentStatus()` - Vérifie le statut actuel
- `notifyPaymentStatusChange()` - Envoie une notification

## 🌐 Webhooks (Edge Functions)

Trois Edge Functions gèrent les webhooks des fournisseurs:

### 1. Wave Webhook
**Chemin:** `supabase/functions/payment-webhook-wave/`

**URL du webhook:** `https://votre-app/functions/v1/payment-webhook-wave`

**Données attendues:**
```json
{
  "transactionId": "...",
  "status": "SUCCESSFUL|PENDING|FAILED|CANCELLED",
  "amount": 1500,
  "currency": "XAF"
}
```

### 2. Lygos Webhook
**Chemin:** `supabase/functions/payment-webhook-lygos/`

**URL du webhook:** `https://votre-app/functions/v1/payment-webhook-lygos`

**Données attendues:**
```json
{
  "paymentId": "...",
  "status": "COMPLETED|PENDING|FAILED|CANCELLED",
  "amount": 1500
}
```

### 3. CoinPayments Webhook
**Chemin:** `supabase/functions/payment-webhook-coinpayments/`

**URL du webhook:** `https://votre-app/functions/v1/payment-webhook-coinpayments`

**Données attendues:**
```json
{
  "txn_id": "...",
  "status": "0|1|2|-1",
  "amount": 0.0005,
  "currency": "BTC",
  "received": 0.00045
}
```

## 📝 Utilisation dans OrdersSection

Le formulaire `OrdersSection` a été modifié pour inclure:

1. **Sélecteur de moyen de paiement** - Les 4 options apparaissent sous forme de cartes cliquables
2. **Création de transaction** - Une transaction est créée automatiquement à la création de la commande
3. **Validation** - Le moyen de paiement est obligatoire pour créer une commande

**Fichier modifié:** `src/components/dashboard/OrdersSection.tsx`

## 🔐 Clés d'API (Variables d'environnement)

À configurer dans Supabase:

```env
# Wave
WAVE_MERCHANT_ID=M_ci_txFrj6YmGYT2
WAVE_API_URL=https://pay.wave.com/m/M_ci_txFrj6YmGYT2

# Lygos
LYGOS_API_ID=lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c
LYGOS_API_URL=https://api.lygos.com

# CoinPayments
COINPAYMENTS_CLIENT_ID=3c672fcda81649908790a70d863a6b2e
COINPAYMENTS_SECRET=RRFISUA7pF7z52oDFEOASw5uQIgpXPixX9F7GT1tnm4=
COINPAYMENTS_API_URL=https://a-api.coinpayments.net
```

## 🚀 Flux de paiement

### 1. Initiation d'une commande
1. L'utilisateur remplit le formulaire dans OrdersSection
2. Sélectionne un moyen de paiement
3. Clique sur "Créer la commande"

### 2. Création
1. La commande est enregistrée dans la table `orders`
2. Une transaction est créée dans `payment_transactions`
3. Un message de confirmation s'affiche selon le moyen choisi

### 3. Traitement du paiement
- **Cash on Delivery**: Aucun traitement immédiat, attente de la livraison
- **Wave**: Lien envoyé au client
- **Lygos**: Code QR généré
- **CoinPayments**: Adresse crypto fournie

### 4. Confirmation du paiement
1. Le fournisseur envoie un webhook à l'endpoint Edge Function
2. La transaction est mise à jour avec le statut
3. La commande est marquée comme "paid" si réussi
4. Une notification est envoyée à l'utilisateur

## 📊 Suivi et rapports

Pour voir l'historique des paiements:
1. Aller à `PaymentHistoryDashboard`
2. Voir les statistiques (complétées, en attente, échouées)
3. Consulter le tableau détaillé des transactions

## 🧪 Test des webhooks

Pour tester les webhooks localement, utiliser une tool comme:
- **ngrok** - Pour exposer votre localhost à internet
- **Postman** - Pour simuler les requêtes webhook
- **curl** - Pour faire des requêtes simples

Exemple avec curl:
```bash
curl -X POST \
  https://votre-app/functions/v1/payment-webhook-wave \
  -H 'Content-Type: application/json' \
  -d '{
    "transactionId": "test-123",
    "status": "SUCCESSFUL",
    "amount": 1500,
    "currency": "XAF"
  }'
```

## 🐛 Dépannage

### Transaction non trouvée
- Vérifier que l'ID de transaction correspond dans la BD
- S'assurer que l'UUID est correct

### Paiement en attente
- Vérifier les logs de la fonction Edge
- S'assurer que le webhook a été envoyé

### Erreur de conversion de devise
- Vérifier les taux de change utilisés
- 1 MSN = 750 FCFA (voir OrdersSection)
- 1 BTC = ~655,000 FCFA (voir PaymentConfirmation)

## 📞 Support

Pour toute question sur l'implémentation:
1. Consulter le code source des composants
2. Vérifier les logs Supabase
3. Tester manuellement les webhooks

---

**Dernière mise à jour:** 2024
**Version:** 1.0
