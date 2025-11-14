# Badges PWA et Raccourcis - Documentation

## 🎯 Vue d'ensemble

Le système intègre maintenant deux fonctionnalités PWA avancées :
1. **Badges de notification** sur l'icône de l'app installée
2. **Raccourcis rapides** pour accéder directement aux sections importantes

## 📱 Badges de Notification

### Fonctionnement

Les badges affichent automatiquement le nombre de notifications non lues directement sur l'icône de l'application installée, même quand l'app est fermée.

### Caractéristiques

- ✅ **Mise à jour en temps réel** : Le badge se met à jour automatiquement quand vous recevez de nouvelles notifications
- 🔔 **Synchronisation** : Le nombre affiché correspond exactement aux notifications non lues
- 🔄 **Actualisation intelligente** : 
  - Mise à jour quand l'app devient visible
  - Mise à jour quand la fenêtre reçoit le focus
  - Mise à jour en temps réel via Supabase Realtime
- 🗑️ **Effacement automatique** : Le badge disparaît quand toutes les notifications sont lues

### Support Navigateurs

- ✅ **Chrome/Edge** (Android, Windows, macOS) : Support complet
- ✅ **Samsung Internet** : Support complet
- ⚠️ **Safari** (iOS/macOS) : Support limité
- ⚠️ **Firefox** : Pas encore supporté

### Comment ça marche

Le système utilise l'API Badge native du navigateur :

```typescript
// Définir un badge avec un nombre
navigator.setAppBadge(5); // Affiche "5" sur l'icône

// Effacer le badge
navigator.clearAppBadge();
```

### Utilisation pour les développeurs

Le hook `usePWABadge` est automatiquement actif dans toute l'application :

```typescript
import { usePWABadge } from '@/hooks/usePWABadge';

function MyComponent() {
  const { 
    setBadge,                    // Définir manuellement le badge
    clearBadge,                  // Effacer le badge
    updateBadgeFromNotifications, // Mettre à jour depuis les notifications
    isBadgeSupported             // Vérifier si supporté
  } = usePWABadge();

  // Le badge se met à jour automatiquement
  // Mais vous pouvez aussi le faire manuellement :
  
  // Définir un badge
  await setBadge(10);
  
  // Effacer le badge
  await clearBadge();
  
  // Mettre à jour depuis la base de données
  await updateBadgeFromNotifications();
}
```

### Configuration

Le badge est configuré pour :
- Compter uniquement les notifications **non lues** (`read = false`)
- Se mettre à jour en temps réel via Supabase Realtime
- S'effacer automatiquement quand le compteur atteint 0

## 🚀 Raccourcis PWA

### Raccourcis Disponibles

L'application propose 4 raccourcis rapides accessibles depuis l'icône installée :

1. **📊 Tableau de bord**
   - URL : `/dashboard`
   - Accès direct au dashboard principal

2. **💰 Portefeuille**
   - URL : `/dashboard#wallet`
   - Accès direct à la section portefeuille

3. **📦 Commandes**
   - URL : `/orders-dashboard`
   - Gestion des commandes

4. **👨‍💼 Agent Dashboard**
   - URL : `/agent-dashboard`
   - Tableau de bord agent

### Comment accéder aux raccourcis

#### Sur Android
1. Appuyez longuement sur l'icône de l'app
2. Un menu contextuel s'affiche avec les raccourcis
3. Appuyez sur le raccourci désiré

#### Sur Windows (Chrome/Edge)
1. Clic droit sur l'icône de l'app dans la barre des tâches
2. Les raccourcis apparaissent dans le menu
3. Cliquez sur le raccourci désiré

#### Sur macOS (Chrome/Edge)
1. Clic droit sur l'icône dans le Dock
2. Les raccourcis sont dans le menu
3. Cliquez pour ouvrir

### Configuration des raccourcis

Les raccourcis sont définis dans `vite.config.ts` :

```typescript
shortcuts: [
  {
    name: 'Tableau de bord',        // Nom complet
    short_name: 'Dashboard',        // Nom court
    description: 'Accéder au tableau de bord principal',
    url: '/dashboard',              // URL de destination
    icons: [{ 
      src: '/pwa-192x192.png', 
      sizes: '192x192' 
    }]
  },
  // ... autres raccourcis
]
```

### Ajouter des raccourcis personnalisés

Pour ajouter un nouveau raccourci, modifiez `vite.config.ts` :

```typescript
{
  name: 'Mon Nouveau Raccourci',
  short_name: 'Nouveau',
  description: 'Description du raccourci',
  url: '/ma-nouvelle-page',
  icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
}
```

**Limites :**
- Maximum recommandé : 4 raccourcis (limite de certains OS)
- Icônes : PNG recommandé, 192x192px minimum
- URLs : Doivent être relatives au domaine de l'app

## 🎨 Personnalisation

### Changer les icônes des raccourcis

1. Créez vos icônes personnalisées (192x192px recommandé)
2. Placez-les dans le dossier `public/`
3. Modifiez le chemin dans `shortcuts.icons`

### Adapter les descriptions

Modifiez les champs `description` dans le manifest pour expliquer clairement chaque raccourci.

## 📊 Statistiques et Monitoring

### Vérifier le support Badge API

```typescript
if ('setAppBadge' in navigator) {
  console.log('✅ Badge API supportée');
} else {
  console.log('⚠️ Badge API non supportée');
}
```

### Logs automatiques

Le système log automatiquement :
- ✅ Quand le badge est mis à jour
- 📬 Le nombre de notifications non lues
- 🔔 Les changements de notifications en temps réel
- ⚠️ Les erreurs de mise à jour

## 🐛 Dépannage

### Le badge ne s'affiche pas

1. **Vérifiez le navigateur** : Utilisez Chrome/Edge sur Android/Windows/macOS
2. **L'app est-elle installée ?** : Les badges ne fonctionnent que pour les apps installées
3. **Consultez la console** : Les logs indiquent si l'API est supportée
4. **Vérifiez les permissions** : Certains OS nécessitent des permissions spéciales

### Les raccourcis n'apparaissent pas

1. **Réinstallez l'app** : Les raccourcis sont chargés à l'installation
2. **Vérifiez le manifest** : Consultez `vite.config.ts`
3. **Limite du système** : Certains OS limitent le nombre de raccourcis
4. **Cache navigateur** : Videz le cache et réinstallez

### Le badge n'est pas à jour

1. **Ouvrez l'app** : Le badge se met à jour quand l'app est active
2. **Vérifiez la connexion** : La mise à jour nécessite une connexion
3. **Realtime actif ?** : Vérifiez que Supabase Realtime fonctionne

## 🔒 Sécurité et Permissions

### Badge API
- ❌ Aucune permission utilisateur requise
- ✅ Fonctionne en arrière-plan
- 🔒 Contrôlée par le navigateur

### Raccourcis
- ❌ Aucune permission spéciale requise
- ✅ Définis au moment de l'installation
- 🔒 Ne peuvent pas exécuter de code malveillant

## 🚀 Évolutions Futures

- [ ] Notifications push avec actions directes
- [ ] Badges animés (si supporté)
- [ ] Raccourcis dynamiques basés sur l'historique
- [ ] Raccourcis contextuels (géolocalisation)
- [ ] Support iOS Safari amélioré

## 📞 Support

- Les logs sont disponibles dans la console du navigateur
- Les erreurs sont capturées silencieusement pour ne pas perturber l'expérience
- Le système se désactive automatiquement si non supporté
