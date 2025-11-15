# Système de Permissions Granulaires - Les Moissonneurs

## Vue d'ensemble

Le système de permissions granulaires permet de définir précisément ce que chaque rôle peut faire dans l'application. Au lieu d'un simple niveau d'accès numérique, chaque rôle possède un ensemble de permissions spécifiques pour différents modules.

## Architecture

### Tables

#### `permissions`
Contient toutes les permissions disponibles dans le système.

```sql
- id: UUID (Primary Key)
- module: TEXT (orders, tontines, shops, finances, users, investments, agents, system)
- action: TEXT (view, create, update, delete, validate, manage, etc.)
- name: TEXT (Nom lisible de la permission)
- description: TEXT (Description détaillée)
- created_at: TIMESTAMP
```

#### `role_permissions`
Table de liaison entre les rôles et les permissions.

```sql
- id: UUID (Primary Key)
- role: app_role (Référence au rôle)
- permission_id: UUID (Référence à la permission)
- created_at: TIMESTAMP
```

## Modules et Actions

### 1. Commandes (orders)
- **view**: Voir toutes les commandes
- **view_own**: Voir uniquement ses propres commandes
- **create**: Créer de nouvelles commandes
- **update**: Modifier les commandes
- **delete**: Supprimer des commandes
- **validate**: Valider ou rejeter les commandes
- **manage**: Gestion complète

### 2. Tontines (tontines)
- **view**: Voir toutes les tontines
- **view_own**: Voir uniquement ses tontines
- **create**: Créer des tontines
- **update**: Modifier les tontines
- **delete**: Supprimer des tontines
- **draw**: Effectuer les tirages
- **manage**: Gestion complète

### 3. Boutiques (shops)
- **view**: Voir toutes les boutiques
- **view_own**: Voir sa propre boutique
- **create**: Créer des boutiques
- **update**: Modifier les boutiques
- **delete**: Supprimer des boutiques
- **validate**: Valider les boutiques
- **manage**: Gestion complète

### 4. Finances (finances)
- **view**: Voir toutes les transactions
- **view_own**: Voir ses propres transactions
- **deposit**: Effectuer des dépôts
- **withdraw**: Effectuer des retraits
- **transfer**: Effectuer des transferts
- **validate**: Valider les transactions
- **treasury**: Gérer le trésor
- **manage**: Gestion complète

### 5. Utilisateurs (users)
- **view**: Voir tous les utilisateurs
- **create**: Créer des utilisateurs
- **update**: Modifier les utilisateurs
- **delete**: Supprimer des utilisateurs
- **roles**: Gérer les rôles
- **manage**: Gestion complète

### 6. Investissements (investments)
- **view**: Voir tous les investissements
- **view_own**: Voir ses propres investissements
- **create**: Créer des investissements
- **update**: Modifier les investissements
- **delete**: Supprimer des investissements
- **payout**: Effectuer les paiements
- **manage**: Gestion complète

### 7. Agents (agents)
- **view**: Voir les agents
- **create**: Créer des agents
- **update**: Modifier les agents
- **delete**: Supprimer des agents
- **commissions**: Gérer les commissions
- **manage**: Gestion complète

### 8. Système (system)
- **settings**: Modifier les paramètres
- **analytics**: Voir les analyses
- **logs**: Voir les logs
- **promocodes**: Gérer les codes promo
- **manage**: Gestion complète

## Fonctions SQL

### `has_permission(_user_id, _module, _action)`
Vérifie si un utilisateur a une permission spécifique.

```sql
SELECT has_permission(auth.uid(), 'orders', 'validate');
-- Retourne: true ou false
```

### `get_user_permissions(_user_id)`
Retourne toutes les permissions d'un utilisateur.

```sql
SELECT * FROM get_user_permissions(auth.uid());
-- Retourne: Liste de toutes les permissions
```

### `get_role_permissions(_role)`
Retourne toutes les permissions d'un rôle spécifique.

```sql
SELECT * FROM get_role_permissions('moissonneur'::app_role);
-- Retourne: Liste des permissions du rôle
```

## Attribution des Permissions par Rôle

### Super Admin (Niveau 100)
✅ **TOUTES** les permissions

### Admin / Operational Admin (Niveau 90)
✅ Commandes: Toutes
✅ Tontines: Toutes
✅ Boutiques: Toutes
✅ Finances: Toutes sauf treasury
✅ Utilisateurs: Toutes
✅ Investissements: Toutes
✅ Agents: Toutes
✅ Système: analytics, settings, promocodes
❌ Système: manage, logs

### Financial Manager / Financier (Niveau 80)
✅ Finances: Toutes incluant treasury
✅ Investissements: Toutes
✅ Système: analytics, promocodes
❌ Autres modules

### Tontine Manager (Niveau 75)
✅ Tontines: Toutes incluant draw
✅ Utilisateurs: view, update
✅ Système: analytics
❌ Autres modules

### Moderator (Niveau 70)
✅ Commandes: view, update, validate
✅ Boutiques: view, update, validate
✅ Utilisateurs: view, update
❌ Autres actions

### Shop Manager / Merchant (Niveau 60)
✅ Boutiques: view_own, update
✅ Commandes: view_own, create
✅ Finances: view_own
❌ Autres modules

### Relay Agent / Agent (Niveau 50)
✅ Commandes: view_own, create
✅ Finances: view_own, deposit, withdraw
✅ Agents: view
❌ Autres modules

### Moissonneur / User (Niveau 30)
✅ Commandes: view_own, create
✅ Tontines: view, view_own, create
✅ Boutiques: view_own
✅ Finances: view_own, transfer
✅ Investissements: view_own, create
✅ Agents: view (ses propres stats)
❌ Actions administratives

### Developer (Niveau 10)
✅ Système: logs, analytics
❌ Tous les autres modules

## Utilisation dans le Code

### Hook React

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return <Loader />;
  
  return (
    <>
      {hasPermission('orders', 'create') && (
        <Button>Créer une commande</Button>
      )}
      
      {hasPermission('orders', 'validate') && (
        <Button>Valider</Button>
      )}
    </>
  );
}
```

### Vérifications Multiples

```typescript
const { hasAnyPermission, hasAllPermissions } = usePermissions();

// Vérifie si l'utilisateur a AU MOINS une des permissions
if (hasAnyPermission([
  { module: 'orders', action: 'view' },
  { module: 'orders', action: 'view_own' }
])) {
  // Afficher la liste des commandes
}

// Vérifie si l'utilisateur a TOUTES les permissions
if (hasAllPermissions([
  { module: 'finances', action: 'view' },
  { module: 'finances', action: 'validate' }
])) {
  // Afficher le panneau de validation financière
}
```

### Dans les Politiques RLS

```sql
-- Exemple: Seuls les utilisateurs avec permission peuvent voir toutes les commandes
CREATE POLICY "Users with view permission can see all orders"
ON orders FOR SELECT
USING (
  has_permission(auth.uid(), 'orders', 'view')
  OR 
  (has_permission(auth.uid(), 'orders', 'view_own') AND broker_id = auth.uid())
);
```

## Interface de Gestion

Le composant `PermissionsManager` dans le tableau de bord admin permet de:
1. Voir toutes les permissions disponibles par module
2. Sélectionner un rôle et voir ses permissions actuelles
3. Activer/désactiver des permissions pour un rôle
4. Sauvegarder les changements

### Workflow de Modification

1. Accéder au tableau de bord admin
2. Naviguer vers "Gestion des Permissions"
3. Sélectionner un rôle dans les onglets
4. Cocher/décocher les permissions désirées par module
5. Cliquer sur "Enregistrer"

## Sécurité

### Row Level Security
- Toutes les tables de permissions sont protégées par RLS
- Seuls les Super Admins (niveau 100) peuvent modifier les permissions
- Tous les utilisateurs peuvent voir les permissions (pour affichage UI)

### Security Definer Functions
Toutes les fonctions de vérification utilisent `SECURITY DEFINER` et `SET search_path = public` pour:
- Éviter les injections SQL
- Garantir la cohérence des données
- Éviter les récursions infinies dans les politiques RLS

### Audit
Pour implémenter un audit des changements de permissions:

```sql
-- À ajouter si nécessaire
CREATE TABLE permission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role,
  permission_id UUID,
  action TEXT, -- 'added' ou 'removed'
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT now()
);
```

## Avantages du Système

1. **Granularité**: Contrôle précis des permissions par action et module
2. **Flexibilité**: Facile d'ajouter de nouvelles permissions
3. **Maintenabilité**: Permissions centralisées et faciles à gérer
4. **Sécurité**: Protection RLS et fonctions security definer
5. **UX**: Interface intuitive pour la gestion des permissions
6. **Performance**: Vérifications optimisées avec index sur les FK

## Évolutions Futures

- [ ] Permissions temporaires avec date d'expiration
- [ ] Groupes de permissions (presets)
- [ ] Permissions conditionnelles (basées sur des règles métier)
- [ ] Logs d'audit automatiques
- [ ] Export/Import de configurations de permissions
- [ ] Permissions par organisation/équipe
- [ ] Héritage de permissions entre rôles
