# 💳 Guide Complet de Configuration des Paiements

## 📋 Table des matières
1. Variables d'environnement Supabase
2. Configuration des webhooks
3. Tests des webhooks
4. Troubleshooting

---

## 1️⃣ Variables d'environnement Supabase

### Accès aux variables d'environnement

1. Allez sur [console.supabase.com](https://console.supabase.com)
2. Sélectionnez votre projet
3. Allez à **Paramètres** → **Variables d'environnement**
4. Ajoutez les variables suivantes:

### Variables à configurer

#### Wave Paiement
```env
WAVE_WEBHOOK_SECRET=votre_secret_wave
WAVE_MERCHANT_ID=M_ci_txFrj6YmGYT2
WAVE_API_URL=https://pay.wave.com/m/M_ci_txFrj6YmGYT2
```

#### Lygos
```env
LYGOS_SECRET=votre_secret_lygos
LYGOS_API_ID=lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c
LYGOS_API_URL=https://api.lygos.com
```

#### CoinPayments
```env
COINPAYMENTS_CLIENT_ID=3c672fcda81649908790a70d863a6b2e
COINPAYMENTS_SECRET=RRFISUA7pF7z52oDFEOASw5uQIgpXPixX9F7GT1tnm4=
COINPAYMENTS_API_URL=https://a-api.coinpayments.net
```

---

## 2️⃣ Configuration des Webhooks

### Structure générale d'un webhook

Tous les webhooks sont des Edge Functions Supabase et utilisent cette URL:
```
https://votre-projet.supabase.co/functions/v1/payment-webhook-{provider}
```

### 🌊 Wave Paiement

**Lien d'administration:** https://wave.com/dashboard/settings

**Étapes:**
1. Connectez-vous à votre compte Wave
2. Allez à **Paramètres** → **Webhooks** ou **Notifications**
3. Cliquez sur **Ajouter un webhook**
4. URL du webhook:
   ```
   https://votre-projet.supabase.co/functions/v1/payment-webhook-wave
   ```
5. Sélectionnez les événements:
   - Transaction complétée ✅
   - Transaction échouée ❌
   - Transaction annulée ⚠️

6. Copiez votre secret Wave et mettez-le dans `WAVE_WEBHOOK_SECRET`

**Format du webhook Wave:**
```json
{
  "transactionId": "wave-txn-123456",
  "status": "SUCCESSFUL|PENDING|FAILED|CANCELLED",
  "amount": 1500,
  "currency": "XAF",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 💳 Lygos

**Lien d'administration:** https://dashboard.lygos.com/settings

**Étapes:**
1. Connectez-vous à Lygos Dashboard
2. Allez à **Paramètres** → **Webhooks** ou **Configuration API**
3. Ajoutez une nouvelle URL de webhook:
   ```
   https://votre-projet.supabase.co/functions/v1/payment-webhook-lygos
   ```
4. Configurez les événements:
   - Paiement complété
   - Paiement échoué
   - Paiement en attente

5. Sauvegardez votre secret et mettez-le dans `LYGOS_SECRET`

**Format du webhook Lygos:**
```json
{
  "paymentId": "lygos-pay-123456",
  "status": "COMPLETED|PENDING|FAILED|CANCELLED",
  "amount": 1500,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### ₿ CoinPayments

**Lien d'administration:** https://www.coinpayments.net/index.php?cmd=acct_settings&tab=api

**Étapes:**
1. Connectez-vous à CoinPayments
2. Allez à **Account Settings** → **Notifications**
3. Trouvez la section **IPN Settings**
4. Mettez à jour l'URL IPN:
   ```
   https://votre-projet.supabase.co/functions/v1/payment-webhook-coinpayments
   ```
5. Copiez votre secret API et mettez-le dans `COINPAYMENTS_SECRET`

**Format du webhook CoinPayments:**
```json
{
  "txn_id": "abc123def456",
  "status": "0|1|2|-1",
  "amount": "0.00022",
  "currency": "BTC",
  "received": "0.00022",
  "amountf": "0.00022000",
  "receivedf": "0.00022000",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 3️⃣ Tests des Webhooks

### Test via l'interface

1. Allez à **Admin Paiements** dans le dashboard
2. Cliquez sur **Test des Webhooks**
3. Entrez un ID de transaction (optionnel)
4. Cliquez sur le bouton de test du fournisseur

### Test via curl

**Wave:**
```bash
curl -X POST \
  https://votre-projet.supabase.co/functions/v1/payment-webhook-wave \
  -H 'Content-Type: application/json' \
  -d '{
    "transactionId": "wave-test-123",
    "status": "SUCCESSFUL",
    "amount": 1500,
    "currency": "XAF"
  }'
```

**Lygos:**
```bash
curl -X POST \
  https://votre-projet.supabase.co/functions/v1/payment-webhook-lygos \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentId": "lygos-test-123",
    "status": "COMPLETED",
    "amount": 1500
  }'
```

**CoinPayments:**
```bash
curl -X POST \
  https://votre-projet.supabase.co/functions/v1/payment-webhook-coinpayments \
  -H 'Content-Type: application/json' \
  -d '{
    "txn_id": "btc-test-123",
    "status": "1",
    "amount": "0.00022",
    "currency": "BTC",
    "received": "0.00022"
  }'
```

---

## 4️⃣ Checklist de Configuration

### ✅ Avant de mettre en production

- [ ] Variables d'environnement Supabase configurées
- [ ] Webhooks Wave ajoutés et testés
- [ ] Webhooks Lygos ajoutés et testés
- [ ] Webhooks CoinPayments ajoutés et testés
- [ ] Logs des Edge Functions vérifiés
- [ ] Test de bout en bout: créer commande → paiement → confirmation
- [ ] Notifications testées
- [ ] Statuts de commande correctement mis à jour
- [ ] Sécurité: vérifier que les secrets ne sont pas exposés

### 📊 Vérifier la configuration

1. Allez à **Admin Paiements** → **Historique des Transactions**
2. Créez une commande de test
3. Testez chaque moyen de paiement
4. Vérifiez que les transactions apparaissent avec le bon statut
5. Vérifiez que les notifications sont envoyées

---

## 5️⃣ Dépannage

### Erreur: "Transaction non trouvée"

**Cause:** L'ID de transaction ne correspond pas

**Solution:**
1. Vérifier que l'ID envoyé au webhook est correct
2. Vérifier que la transaction existe dans la BD
3. Consulter les logs Supabase

### Erreur: "Données manquantes"

**Cause:** Le webhook n'a pas envoyé tous les champs requis

**Solution:**
1. Vérifier le format du webhook selon le fournisseur
2. S'assurer que `transactionId` ou `paymentId` est présent
3. S'assurer que `status` est présent

### Webhook non déclenché

**Cause:** Le webhook n'est pas configuré ou incorrect

**Solution:**
1. Vérifier l'URL du webhook dans les paramètres du fournisseur
2. Vérifier que l'URL est exacte: `https://votre-projet.supabase.co/functions/v1/payment-webhook-{provider}`
3. Tester avec curl pour vérifier que l'endpoint répond
4. Vérifier les logs Supabase

### Logs Supabase

Pour voir les logs des Edge Functions:

1. Allez à **Supabase Console** → **Functions**
2. Sélectionnez la fonction `payment-webhook-wave` (ou autre)
3. Cliquez sur **Logs**
4. Cherchez les erreurs

---

## 6️⃣ Variables d'environnement à jour

Voici l'état actuel des variables configurées dans Supabase:

### Données stockées (provisoire pendant les tests)

Ces données sont sécurisées dans Supabase:
- WAVE_MERCHANT_ID ✅
- LYGOS_API_ID ✅
- COINPAYMENTS_CLIENT_ID ✅
- COINPAYMENTS_SECRET ✅

### À ajouter après validation

Une fois les webhooks testés:
- WAVE_WEBHOOK_SECRET
- LYGOS_SECRET

---

## 7️⃣ Support et Ressources

### Documentation officielle
- [Wave Documentation](https://wave.com/docs)
- [Lygos Documentation](https://docs.lygos.com)
- [CoinPayments Documentation](https://www.coinpayments.net/help)

### Contacts support
- Wave: support@wave.com
- Lygos: support@lygos.com
- CoinPayments: support@coinpayments.net

---

**Status:** ✅ Système opérationnel
**Dernière mise à jour:** 2024
**Version:** 1.0 Production-Ready
