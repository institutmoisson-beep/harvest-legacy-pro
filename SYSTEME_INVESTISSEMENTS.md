# Système d'Investissements Automatisé

## Vue d'ensemble

Le système d'investissements permet aux utilisateurs d'investir dans des produits agricoles et de recevoir automatiquement leur capital + gains après une période définie.

## Fonctionnalités

### 1. Périodes d'investissement disponibles

- **Deux jours** (48h) - nouveau minimum
- **Semaine** (7 jours)
- **Deux semaines** (14 jours)
- **Mensuel** (30 jours)
- **Deux mois** (60 jours)
- **Six mois** (180 jours)

**Note:** La période "quotidien" a été retirée. Le minimum est maintenant "deux jours".

### 2. Calcul des gains

- Bénéfice sur vente: **16%** du prix d'achat
- Part de l'investisseur: **46%** du bénéfice
- **Résultat final: 7.36%** de rendement total (46% de 16%)

**Exemple:**
- Investissement: 100,000 FCFA
- Bénéfice total: 16,000 FCFA (16%)
- Gain investisseur: 7,360 FCFA (46% de 16,000)
- Retour total: 107,360 FCFA (capital + gains)

### 3. Traitement automatique des paiements

Le système vérifie **toutes les 2 heures** si des investissements sont dus pour paiement.

#### Critères de paiement automatique:

1. **Vérification du temps écoulé:**
   - Calcul précis en heures depuis la création de l'investissement
   - Prise en compte de l'heure exacte d'investissement
   - Exemple: Investi le 14/11/2025 à 14h30 → Paiement après 48h exactes (16/11/2025 à 14h30)

2. **Processus de paiement:**
   - Calcul automatique du capital + gains
   - Conversion FCFA → MSN (1 MSN = 750 FCFA)
   - Crédit du portefeuille de l'investisseur
   - Enregistrement dans l'historique
   - Notification à l'investisseur
   - Changement du statut à "completed"

### 4. Historique des paiements

Chaque paiement est enregistré dans la table `investment_payment_history` avec:

- **Type de paiement:**
  - `earnings` - Les gains générés
  - `capital_return` - Le retour du capital investi

- **Informations enregistrées:**
  - ID de l'investissement
  - ID de l'investisseur
  - Montant payé (en MSN)
  - Statut du paiement
  - Date et heure du paiement

### 5. Visualisation pour l'investisseur

Les utilisateurs peuvent voir:

1. **Leurs investissements actifs et complétés:**
   - Nom du produit
   - Montant investi
   - Gains totaux reçus
   - Date et heure exacte de création
   - Période de paiement choisie
   - Statut (Actif/Complété)

2. **Historique complet des paiements:**
   - Liste chronologique de tous les paiements
   - Séparation capital/gains
   - Montants en MSN et FCFA
   - Dates de chaque transaction

3. **Analytics détaillées:**
   - Total investi
   - Total des gains
   - ROI (Return on Investment)
   - Graphiques d'évolution

## Configuration technique

### Tables Supabase

#### `investment_products`
```sql
- id: UUID
- investor_id: UUID
- product_name: TEXT
- investment_amount: NUMERIC (FCFA)
- payout_frequency: TEXT
- investor_earnings: NUMERIC (FCFA)
- total_profit: NUMERIC (FCFA)
- status: TEXT (active/completed)
- last_payout_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

#### `investment_payment_history`
```sql
- id: UUID
- investment_id: UUID
- investor_id: UUID
- payment_type: TEXT (earnings/capital_return)
- amount_paid: NUMERIC (MSN)
- payment_status: TEXT
- created_at: TIMESTAMPTZ
```

### Edge Function: `investment-payout`

- **Déclenchement:** Cron job toutes les 2 heures
- **Fréquences gérées:** two_days, weekly, two_weeks, monthly, two_months, six_months
- **Logique:**
  1. Récupère tous les investissements actifs
  2. Calcule le temps écoulé en heures exactes
  3. Vérifie si le seuil est atteint (48h, 168h, etc.)
  4. Traite le paiement si dû
  5. Met à jour tous les enregistrements

### Cron Jobs

```sql
-- Vérification toutes les 2 heures pour tous les types
'0 */2 * * *' -- two_days, two_weeks, two_months, six_months
'5 0 * * 1'   -- weekly (lundi 00:05)
'10 0 1 * *'  -- monthly (1er du mois 00:10)
```

## Notifications

Les investisseurs reçoivent une notification automatique quand:

1. **Investissement créé avec succès**
2. **Paiement effectué:**
   - Titre: "💰 Investissement Complété"
   - Message: Détails du capital et gains reçus
   - Type: `investment`

## Sécurité

- **RLS (Row Level Security)** activé sur toutes les tables
- Les utilisateurs ne voient que leurs propres investissements
- Les admins ont accès à tous les investissements
- Les paiements ne peuvent être créés que par le système (edge function)

## Super Dashboard Admin

Les administrateurs peuvent voir dans le Super Dashboard:

1. Section Codes Promo (AdminPromoCodesManager)
2. Analytics des tontines (AdminTontineAnalytics)
3. Tous les composants de gestion sans duplication

**Note:** Les duplications dans le Super Dashboard ont été corrigées. Chaque section apparaît maintenant une seule fois.

## Améliorations futures possibles

- Support de paiements partiels réguliers
- Réinvestissement automatique des gains
- Système de bonus pour gros investisseurs
- Alertes avant échéance des investissements
