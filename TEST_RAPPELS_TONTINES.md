# Guide de Test - Rappels Automatiques Tontines

## 📋 Prérequis

1. **Cron Job configuré** : Exécutez le fichier `supabase/setup-tontine-cron.sql` dans l'éditeur SQL Supabase
2. **Edge Function déployée** : La fonction `tontine-auto-reminder` est déployée automatiquement
3. **Extensions activées** : pg_cron et pg_net doivent être actifs (déjà fait dans votre projet)

## 🧪 Méthode de Test 1 : Test Manuel Immédiat

### Via Supabase Dashboard

1. Allez sur : https://supabase.com/dashboard/project/swefwubntyyfqaerlwym/functions/tontine-auto-reminder/logs

2. Cliquez sur l'onglet "Invoke"

3. Envoyez une requête POST vide : `{}`

4. Vérifiez les logs pour voir :
   - Nombre de tontines actives trouvées
   - Nombre de notifications créées
   - Détails des rappels envoyés

### Via Code Frontend

Ajoutez ce bouton temporaire dans votre Dashboard pour tester :

```typescript
const testReminders = async () => {
  const { data, error } = await supabase.functions.invoke('tontine-auto-reminder', {
    body: { test: true }
  });
  
  if (error) {
    toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
  } else {
    toast({ title: 'Succès', description: 'Rappels envoyés! Vérifiez les notifications' });
  }
};
```

## 🧪 Méthode de Test 2 : Test avec Données Réelles

### Préparer des données de test

1. **Créer une tontine de test** :
   - Allez sur `/tontines`
   - Créez une nouvelle tontine
   - Date de début : **Dans 3 jours** (pour tester le rappel J-3)

2. **Ajouter des participants** :
   - Rejoignez la tontine avec votre compte principal
   - Si possible, créez un 2e compte de test pour rejoindre aussi

3. **Vérifier la schedule** :
   ```sql
   SELECT * FROM tontine_payment_schedule 
   WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '4 days'
   ORDER BY due_date;
   ```

4. **Déclencher manuellement** :
   - Invoquez la fonction depuis le dashboard Supabase
   - Ou attendez l'exécution automatique à 8h du matin

5. **Vérifier les notifications** :
   ```sql
   SELECT * FROM notifications 
   WHERE type = 'tontine' 
   AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

## 🧪 Méthode de Test 3 : Forcer une Date de Test

### Modifier temporairement la date d'échéance

```sql
-- Mettre une échéance à dans 2 jours pour tester
UPDATE tontine_payment_schedule 
SET due_date = NOW() + INTERVAL '2 days'
WHERE tontine_id = 'VOTRE_TONTINE_ID'
AND cycle_number = 1;
```

Puis invoquez la fonction et vérifiez les notifications.

## ✅ Vérifications

### 1. Les notifications sont créées
```sql
SELECT 
  n.title,
  n.message,
  n.type,
  n.created_at,
  p.full_name as recipient
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'tontine'
ORDER BY n.created_at DESC
LIMIT 20;
```

### 2. Le cron job est actif
```sql
SELECT * FROM cron.job 
WHERE jobname = 'tontine-auto-reminder-daily';
```

### 3. Les logs de l'edge function
Consultez : https://supabase.com/dashboard/project/swefwubntyyfqaerlwym/functions/tontine-auto-reminder/logs

### 4. Frontend affiche les notifications
- Allez sur `/notifications` 
- Vérifiez que les nouveaux rappels apparaissent
- Testez le filtre "Tontines"

## 🔄 Fréquence du Cron Job

Par défaut : **Tous les jours à 8h00 du matin**

Pour modifier :
```sql
-- Exécuter toutes les 12 heures
SELECT cron.schedule(
  'tontine-auto-reminder-daily',
  '0 */12 * * *',
  $$ ... (même contenu) $$
);

-- Exécuter toutes les heures (test)
SELECT cron.schedule(
  'tontine-auto-reminder-daily',
  '0 * * * *',
  $$ ... (même contenu) $$
);
```

## 📊 Résultats Attendus

Quand la fonction s'exécute, elle doit :
1. ✅ Parcourir toutes les tontines actives
2. ✅ Identifier les échéances J-3 et J-1
3. ✅ Créer une notification pour chaque participant concerné
4. ✅ Ne pas créer de doublons (vérifie les 24 dernières heures)
5. ✅ Logger le nombre de notifications envoyées

## 🐛 Dépannage

### Les notifications ne sont pas créées

1. Vérifiez les logs de la fonction
2. Vérifiez que les RLS policies sur `notifications` permettent l'insertion
3. Vérifiez que `tontine_payment_schedule` contient des données

### Le cron job ne s'exécute pas

1. Vérifiez qu'il est bien créé : `SELECT * FROM cron.job;`
2. Vérifiez les logs : `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Testez manuellement la fonction d'abord

### Notifications push PWA ne fonctionnent pas

1. Allez sur `/install` pour activer les notifications
2. Autorisez les notifications dans le navigateur
3. Testez avec le bouton "Notification de test"
4. Note : iOS Safari a des limitations pour les PWA notifications

## 🎯 Production

Pour la production, assurez-vous que :
- Le cron job est bien configuré
- Les edge functions sont déployées
- Les utilisateurs ont activé les notifications sur `/install`
- Les politiques RLS sont correctes
