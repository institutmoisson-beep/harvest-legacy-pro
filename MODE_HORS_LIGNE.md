# Mode Hors-Ligne - Documentation

## 📱 Vue d'ensemble

Le système de mode hors-ligne permet aux utilisateurs de continuer à utiliser l'application Les Moissonneurs même sans connexion internet. Les données sont automatiquement mises en cache et synchronisées dès que la connexion est rétablie.

## 🎯 Fonctionnalités

### 1. Détection Automatique
- ✅ Détection instantanée de la perte/récupération de connexion
- 🔔 Notifications visuelles du statut de connexion
- 📊 Indicateur en temps réel dans l'interface

### 2. Mise en Cache Intelligente
Les données suivantes sont automatiquement mises en cache :
- **Profil utilisateur** : Informations personnelles
- **Portefeuille** : Solde et informations de wallet
- **Transactions** : Historique des 30 derniers jours (max 50)
- **Commandes** : Commandes des 30 derniers jours (max 50)
- **Commissions** : Résumé des commissions gagnées

### 3. File d'Attente de Synchronisation
- 💾 Toutes les actions effectuées hors-ligne sont mises en file d'attente
- 🔄 Synchronisation automatique à la reconnexion
- ⚠️ Gestion des erreurs de synchronisation
- 🔁 Réessais automatiques pour les actions échouées

### 4. Gestion du Cache
- ⏰ Durée de vie du cache : 24 heures par défaut
- 🔄 Rafraîchissement automatique toutes les 5 minutes (en ligne)
- 🗑️ Possibilité de vider manuellement le cache

## 🔧 Utilisation

### Pour les Développeurs

#### Hook `useOfflineSync`
```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

function MyComponent() {
  const {
    isOnline,          // État de connexion (true/false)
    isSyncing,         // Synchronisation en cours
    queuedActions,     // Nombre d'actions en attente
    cacheData,         // Fonction pour mettre en cache
    getCachedData,     // Fonction pour récupérer du cache
    queueAction,       // Ajouter action à la file
    syncQueuedActions, // Synchroniser manuellement
    clearCache,        // Vider le cache
    CACHE_KEYS,        // Clés de cache disponibles
  } = useOfflineSync();
}
```

#### Hook `useOfflineCache`
```typescript
import { useOfflineCache } from '@/hooks/useOfflineCache';

function MyComponent() {
  const {
    isOnline,
    getCachedProfile,
    getCachedWallet,
    getCachedTransactions,
    getCachedOrders,
    getCachedCommissions,
  } = useOfflineCache({ userId: user.id, enabled: true });
  
  // Utiliser les données en cache en mode hors-ligne
  if (!isOnline) {
    const profile = getCachedProfile();
    const wallet = getCachedWallet();
  }
}
```

#### Composant `OfflineIndicator`
```typescript
import OfflineIndicator from '@/components/OfflineIndicator';

// À placer dans la barre de navigation
<OfflineIndicator />
```

### Mettre en Cache des Données

```typescript
// Mettre en cache des données
cacheData('my_custom_key', myData);

// Récupérer des données en cache (max 24h par défaut)
const data = getCachedData('my_custom_key');

// Spécifier une durée de vie personnalisée (en ms)
const recentData = getCachedData('my_key', 60 * 60 * 1000); // 1 heure
```

### Ajouter des Actions à la File d'Attente

```typescript
// Insertion
queueAction('insert', 'table_name', { 
  field1: 'value1',
  field2: 'value2' 
});

// Mise à jour
queueAction('update', 'table_name', { 
  id: 'record_id',
  field1: 'new_value' 
});

// Suppression
queueAction('delete', 'table_name', { 
  id: 'record_id' 
});
```

## 💡 Bonnes Pratiques

### 1. Optimisation du Cache
- Ne mettez en cache que les données essentielles
- Limitez la taille des données mises en cache
- Définissez des durées de vie appropriées

### 2. Gestion des Actions Hors-Ligne
- Validez les données avant de les mettre en file d'attente
- Informez l'utilisateur que l'action sera synchronisée plus tard
- Gérez les conflits potentiels lors de la synchronisation

### 3. Expérience Utilisateur
- Affichez clairement le statut de connexion
- Indiquez quand les données proviennent du cache
- Fournissez un feedback lors de la synchronisation

## 🔒 Sécurité

- Les données sensibles sont stockées dans `localStorage`
- Le cache est automatiquement vidé à la déconnexion
- Les actions en file d'attente sont sécurisées côté serveur

## 🐛 Dépannage

### Le cache ne fonctionne pas
1. Vérifiez que `localStorage` est disponible
2. Vérifiez la limite de stockage du navigateur (5-10 MB)
3. Vérifiez les erreurs dans la console

### La synchronisation échoue
1. Vérifiez la connexion internet
2. Vérifiez les permissions RLS Supabase
3. Consultez les logs de synchronisation dans la console

### Données obsolètes
1. Le cache expire automatiquement après 24h
2. Videz manuellement le cache via `OfflineIndicator`
3. Les données se rafraîchissent automatiquement en ligne

## 📊 Limites Techniques

- **Stockage** : ~5-10 MB par domaine (localStorage)
- **Durée de cache** : 24 heures par défaut
- **File d'attente** : Pas de limite stricte, mais recommandé < 100 actions
- **Navigateurs supportés** : Tous les navigateurs modernes

## 🚀 Évolutions Futures

- [ ] Migration vers IndexedDB pour stockage illimité
- [ ] Compression des données en cache
- [ ] Synchronisation différentielle (delta sync)
- [ ] Support des pièces jointes hors-ligne
- [ ] Résolution intelligente des conflits
- [ ] Préchargement prédictif des données

## 📞 Support

Pour toute question ou problème :
- Consultez la console pour les logs détaillés
- Vérifiez l'indicateur de statut hors-ligne
- Contactez le support technique via l'application
