# Système de Permissions - État Actuel et Fonctionnement

## ✅ Système Opérationnel

Le système complet de gestion des rôles et permissions est maintenant **pleinement fonctionnel** et déployé.

## Architecture Déployée

### 1. Tables Créées

#### `permissions`
- Stocke toutes les permissions disponibles
- Structure: id, module, action, name, description, created_at
- **44 permissions** pré-configurées sur 8 modules

#### `role_permissions`
- Lie les rôles aux permissions
- Structure: id, role, permission_id, created_at
- **Toutes les attributions par défaut** configurées

### 2. Vue Créée

#### `users_with_roles`
- Vue SQL pour consulter facilement les utilisateurs avec leurs rôles
- Retourne: id, full_name, referral_code, phone, created_at, roles (JSON), max_access_level

### 3. Fonctions RPC Disponibles

#### `get_user_permissions(_user_id uuid)`
```typescript
// Utilisation dans le code
const { data } = await supabase.rpc('get_user_permissions', {
  _user_id: user.id
});
```

#### `get_role_permissions(_role app_role)`
```typescript
// Utilisation dans le code
const { data } = await supabase.rpc('get_role_permissions', {
  _role: 'admin'
});
```

#### `has_permission(_user_id uuid, _module text, _action text)`
```sql
-- Utilisation dans RLS
CREATE POLICY "..." ON table
USING (has_permission(auth.uid(), 'orders', 'validate'));
```

### 4. Hooks React Disponibles

#### `usePermissions()`
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { 
    permissions,        // Liste des permissions
    loading,           // État de chargement
    hasPermission,     // Vérifier une permission
    hasAnyPermission,  // Vérifier plusieurs (OU)
    hasAllPermissions, // Vérifier plusieurs (ET)
    refetch           // Recharger les permissions
  } = usePermissions();
  
  if (hasPermission('orders', 'validate')) {
    // Utilisateur peut valider les commandes
  }
}
```

#### `useUserRoles()`
```typescript
import { useUserRoles } from '@/hooks/useUserRoles';

function MyComponent() {
  const {
    roles,            // Liste des rôles
    loading,          // État de chargement
    maxAccessLevel,   // Niveau d'accès maximum
    hasRole,          // Vérifier un rôle spécifique
    hasAccessLevel,   // Vérifier niveau minimum
    isSuperAdmin,     // Est super admin?
    isAdmin,          // Est admin (80+)?
    refetch          // Recharger les rôles
  } = useUserRoles();
}
```

### 5. Composants de Protection

#### `<PermissionGuard>`
```typescript
import { PermissionGuard } from '@/components/PermissionGuard';

<PermissionGuard 
  module="orders" 
  action="validate"
  showAlert={true}  // Afficher un message si pas de permission
  fallback={<div>Non autorisé</div>}  // Composant alternatif
>
  <Button>Valider</Button>
</PermissionGuard>
```

#### `<MultiPermissionGuard>`
```typescript
import { MultiPermissionGuard } from '@/components/PermissionGuard';

<MultiPermissionGuard
  permissions={[
    { module: 'finances', action: 'view' },
    { module: 'finances', action: 'manage_wallets' }
  ]}
  requireAll={false}  // false = OU, true = ET
>
  <FinancesDashboard />
</MultiPermissionGuard>
```

## Modules et Permissions Configurés

### 📦 Commandes (orders)
- ✅ view, create, update, delete, validate

### 🎲 Tontines (tontines)
- ✅ view, create, manage, delete

### 🏪 Boutiques (shops)
- ✅ view, create, manage, validate

### 💰 Finances (finances)
- ✅ view, manage_wallets, manage_commissions, manage_treasury, manage_promo_codes

### 👥 Utilisateurs (users)
- ✅ view, manage, manage_roles, view_audit

### 📈 Investissements (investments)
- ✅ view, create, manage

### 🤝 Agents (agents)
- ✅ view, manage

### ⚙️ Système (system)
- ✅ manage_permissions, view_logs, manage_settings

## Attribution des Permissions par Rôle

### 🔴 Super Admin (admin - 100)
✅ **TOUTES LES PERMISSIONS** - Contrôle total du système

### 🟠 Admin Opérationnel (operational_admin - 90)
✅ Toutes sauf `system.manage_permissions`

### 🟡 Manager Financier (financier - 80)
✅ Finances (toutes), Orders/Shops/Users/Investments/Agents (view only)

### 🟢 Manager Tontine (tontine_manager - 75)
✅ Tontines (toutes), Users (view + manage)

### 🔵 Modérateur (moderator - 70)
✅ Shops/Orders/Users (view, validate, manage)

### 🟣 Marchand (merchant - 60)
✅ Shops (view, create), Orders (view, create)

### 🟦 Agent (agent - 50)
✅ Orders (view, create), Agents/Users (view only)

### 🟩 Utilisateur (user/moissonneur - 30)
✅ Orders/Tontines/Shops/Investments (view), Orders (create)

### ⚫ Développeur (developer - 10)
✅ System (view_logs only)

## Interface de Gestion Super Admin

Le Super Administrateur (picelvus@gmail.com) a accès à trois onglets exclusifs dans le dashboard:

### 1. 👥 Gestion des Rôles
- Voir tous les utilisateurs et leurs rôles
- Ajouter/Retirer des rôles
- Rechercher et filtrer
- Visualiser les niveaux d'accès

### 2. 🔐 Gestion des Permissions
- Configurer les permissions pour chaque rôle
- Vue par module (accordéon)
- Sauvegarder les modifications
- Interface intuitive avec checkboxes

### 3. 📋 Logs d'Audit
- Voir tous les changements de rôles/permissions
- Filtrer par utilisateur, action, table
- Voir IP et user agent
- Statistiques en temps réel
- Historique complet

## Sécurité Implémentée

### RLS (Row Level Security)
✅ Activé sur `permissions` et `role_permissions`
✅ Super admins: accès complet
✅ Autres utilisateurs: lecture seule

### Fonctions SECURITY DEFINER
✅ Toutes les fonctions utilisent `SECURITY DEFINER`
✅ `SET search_path = public` pour éviter les injections

### Protection du Super Admin
✅ Impossible de supprimer le rôle de picelvus@gmail.com
✅ Impossible de downgrader son access_level
✅ Trigger de protection active

### Audit Automatique
✅ Tous les changements sont tracés
✅ IP et User Agent enregistrés
✅ Old data / New data conservés

## Comment Utiliser

### Pour Protéger une Route
```typescript
import { useUserRoles } from '@/hooks/useUserRoles';

function AdminPage() {
  const { hasAccessLevel, loading } = useUserRoles();
  
  if (loading) return <Loader />;
  
  if (!hasAccessLevel(80)) {
    return <Navigate to="/dashboard" />;
  }
  
  return <AdminContent />;
}
```

### Pour Protéger une Action
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function OrdersList() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          {order.name}
          {hasPermission('orders', 'validate') && (
            <Button onClick={() => validate(order.id)}>
              Valider
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Pour Protéger au Niveau Base de Données
```sql
-- Créer une policy RLS
CREATE POLICY "Only users with permission can update"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_permission(auth.uid(), 'orders', 'update')
);
```

## Troubleshooting

### Erreur "Impossible de charger les permissions"
✅ **RÉSOLU** - Les tables et fonctions sont maintenant créées
- La migration a créé toutes les structures nécessaires
- Les fonctions RPC sont disponibles
- Les permissions par défaut sont insérées

### Le super admin ne peut pas gérer les rôles
✅ **RÉSOLU** - Protection et permissions configurées
- picelvus@gmail.com a le rôle admin (niveau 100)
- Toutes les permissions sont assignées
- L'interface est accessible

### Les utilisateurs ne voient pas leurs permissions
- Vérifier que l'utilisateur est authentifié
- Vérifier qu'il a au moins un rôle assigné
- Consulter les logs d'audit pour voir l'historique

## Maintenance

### Ajouter une Nouvelle Permission
```sql
INSERT INTO public.permissions (module, action, name, description)
VALUES ('new_module', 'new_action', 'Nom', 'Description');
```

### Assigner une Permission à un Rôle
```sql
INSERT INTO public.role_permissions (role, permission_id)
VALUES ('admin', 'permission-uuid-here');
```

### Voir les Permissions d'un Utilisateur
```sql
SELECT * FROM get_user_permissions('user-uuid-here');
```

## Prochaines Évolutions

- [ ] Permissions temporaires avec expiration
- [ ] Délégation de permissions
- [ ] Permissions personnalisées par organisation
- [ ] Workflow d'approbation pour changements sensibles
- [ ] Export/Import de configurations
- [ ] Interface de visualisation des dépendances de permissions

## Support

Pour toute question ou problème:
1. Consulter les logs d'audit
2. Vérifier les RLS policies
3. Tester les fonctions RPC directement
4. Consulter la documentation complète dans `SYSTEME_PERMISSIONS.md` et `SYSTEME_ROLES.md`
