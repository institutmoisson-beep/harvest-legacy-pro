# Exemples d'Utilisation du Système de Permissions

Ce document présente des exemples concrets d'utilisation du système de permissions granulaires dans l'application Les Moissonneurs.

## 1. Utilisation du Hook `usePermissions`

### Exemple de base

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';

function OrdersPage() {
  const { hasPermission, loading } = usePermissions();

  if (loading) return <Loader />;

  return (
    <div>
      <h1>Gestion des Commandes</h1>
      
      {/* Afficher le bouton seulement si l'utilisateur peut créer des commandes */}
      {hasPermission('orders', 'create') && (
        <Button onClick={handleCreateOrder}>
          Créer une commande
        </Button>
      )}

      {/* Afficher le bouton de validation seulement pour ceux qui peuvent valider */}
      {hasPermission('orders', 'validate') && (
        <Button onClick={handleValidate}>
          Valider les commandes
        </Button>
      )}
    </div>
  );
}
```

### Vérifications multiples

```typescript
function FinancesPage() {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  // Afficher la page si l'utilisateur a AU MOINS une permission financière
  const canAccessFinances = hasAnyPermission([
    { module: 'finances', action: 'view' },
    { module: 'finances', action: 'view_own' }
  ]);

  // Afficher le panneau de validation si l'utilisateur a TOUTES ces permissions
  const canValidateTransactions = hasAllPermissions([
    { module: 'finances', action: 'view' },
    { module: 'finances', action: 'validate' }
  ]);

  if (!canAccessFinances) {
    return <AccessDenied />;
  }

  return (
    <div>
      <TransactionsList />
      
      {canValidateTransactions && (
        <ValidationPanel />
      )}
    </div>
  );
}
```

## 2. Utilisation du Composant `PermissionGuard`

### Protection simple

```typescript
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';

function TontinesManagement() {
  return (
    <div>
      <h1>Gestion des Tontines</h1>
      
      {/* Ce bouton sera visible seulement pour ceux qui peuvent créer des tontines */}
      <PermissionGuard module="tontines" action="create">
        <Button onClick={handleCreate}>
          Créer une tontine
        </Button>
      </PermissionGuard>

      {/* Ce bouton sera visible seulement pour ceux qui peuvent effectuer des tirages */}
      <PermissionGuard module="tontines" action="draw">
        <Button onClick={handleDraw}>
          Effectuer un tirage
        </Button>
      </PermissionGuard>
    </div>
  );
}
```

### Avec fallback personnalisé

```typescript
function ShopsPage() {
  return (
    <div>
      <PermissionGuard 
        module="shops" 
        action="view"
        fallback={
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Accès limité</AlertTitle>
            <AlertDescription>
              Vous pouvez uniquement voir votre propre boutique.
            </AlertDescription>
          </Alert>
        }
      >
        <AllShopsList />
      </PermissionGuard>
      
      {/* Toujours afficher sa propre boutique */}
      <PermissionGuard module="shops" action="view_own">
        <MyShop />
      </PermissionGuard>
    </div>
  );
}
```

### Avec alerte d'accès refusé

```typescript
function AdminSettings() {
  return (
    <PermissionGuard 
      module="system" 
      action="settings"
      showAlert={true}
    >
      <SettingsPanel />
    </PermissionGuard>
  );
}
```

## 3. Utilisation du Composant `MultiPermissionGuard`

### Exiger toutes les permissions

```typescript
import { MultiPermissionGuard } from '@/components/PermissionGuard';

function OrdersValidationPanel() {
  return (
    <MultiPermissionGuard
      permissions={[
        { module: 'orders', action: 'view' },
        { module: 'orders', action: 'validate' }
      ]}
      requireAll={true}
      showAlert={true}
    >
      <div>
        <h2>Validation des Commandes</h2>
        <OrdersToValidate />
        <ValidationControls />
      </div>
    </MultiPermissionGuard>
  );
}
```

### Exiger au moins une permission

```typescript
function FinancialOperations() {
  return (
    <MultiPermissionGuard
      permissions={[
        { module: 'finances', action: 'deposit' },
        { module: 'finances', action: 'withdraw' },
        { module: 'finances', action: 'transfer' }
      ]}
      requireAll={false} // Au moins une des permissions suffit
    >
      <FinancialActionsPanel />
    </MultiPermissionGuard>
  );
}
```

## 4. Protection au Niveau des Routes

### Avec React Router

```typescript
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

function ProtectedRoute({ 
  children, 
  module, 
  action 
}: { 
  children: ReactNode; 
  module: string; 
  action: string; 
}) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <LoadingPage />;
  }

  if (!hasPermission(module, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Utilisation dans le routeur
<Route 
  path="/admin/users" 
  element={
    <ProtectedRoute module="users" action="manage">
      <UsersManagement />
    </ProtectedRoute>
  } 
/>
```

## 5. Protection Conditionnelle dans les Composants

### Affichage conditionnel de colonnes dans un tableau

```typescript
function OrdersTable() {
  const { hasPermission } = usePermissions();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N°</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Montant</TableHead>
          
          {/* Afficher la colonne d'actions seulement si autorisé */}
          {(hasPermission('orders', 'update') || hasPermission('orders', 'validate')) && (
            <TableHead>Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => (
          <TableRow key={order.id}>
            <TableCell>{order.id}</TableCell>
            <TableCell>{order.customer}</TableCell>
            <TableCell>{order.amount}</TableCell>
            
            {(hasPermission('orders', 'update') || hasPermission('orders', 'validate')) && (
              <TableCell>
                {hasPermission('orders', 'update') && (
                  <Button size="sm" onClick={() => handleEdit(order)}>
                    Modifier
                  </Button>
                )}
                {hasPermission('orders', 'validate') && (
                  <Button size="sm" onClick={() => handleValidate(order)}>
                    Valider
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## 6. Vérification Backend dans les Edge Functions

### Dans une Edge Function

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Récupérer l'utilisateur authentifié
  const authHeader = req.headers.get('Authorization')!;
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Non autorisé' }),
      { status: 401 }
    );
  }

  // Vérifier la permission
  const { data: hasPermission } = await supabaseClient
    .rpc('has_permission', {
      _user_id: user.id,
      _module: 'orders',
      _action: 'validate'
    });

  if (!hasPermission) {
    return new Response(
      JSON.stringify({ error: 'Permission refusée' }),
      { status: 403 }
    );
  }

  // Procéder à l'opération...
  // ...
});
```

## 7. Affichage Dynamique de Menu

### Menu de navigation basé sur les permissions

```typescript
function NavigationMenu() {
  const { hasPermission } = usePermissions();

  const menuItems = [
    {
      label: 'Commandes',
      path: '/orders',
      permission: { module: 'orders', action: 'view_own' }
    },
    {
      label: 'Tontines',
      path: '/tontines',
      permission: { module: 'tontines', action: 'view' }
    },
    {
      label: 'Boutiques',
      path: '/shops',
      permission: { module: 'shops', action: 'view' }
    },
    {
      label: 'Finances',
      path: '/finances',
      permission: { module: 'finances', action: 'view_own' }
    },
    {
      label: 'Administration',
      path: '/admin',
      permission: { module: 'system', action: 'manage' }
    }
  ];

  return (
    <nav>
      {menuItems.map(item => {
        if (!hasPermission(item.permission.module, item.permission.action)) {
          return null;
        }
        
        return (
          <NavLink key={item.path} to={item.path}>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
```

## 8. Formulaires avec Champs Conditionnels

```typescript
function OrderForm() {
  const { hasPermission } = usePermissions();

  return (
    <form onSubmit={handleSubmit}>
      {/* Champs visibles par tous */}
      <Input name="customer" label="Client" />
      <Input name="product" label="Produit" />
      <Input name="quantity" label="Quantité" />
      
      {/* Champs visibles seulement pour ceux qui peuvent gérer les prix */}
      {hasPermission('orders', 'manage') && (
        <>
          <Input name="purchase_price" label="Prix d'achat" />
          <Input name="selling_price" label="Prix de vente" />
          <Input name="profit" label="Marge" disabled />
        </>
      )}
      
      {/* Statut modifiable seulement par les validateurs */}
      {hasPermission('orders', 'validate') && (
        <Select name="status" label="Statut">
          <option value="pending">En attente</option>
          <option value="validated">Validé</option>
          <option value="rejected">Rejeté</option>
        </Select>
      )}
      
      <Button type="submit">
        {hasPermission('orders', 'create') ? 'Créer' : 'Soumettre'}
      </Button>
    </form>
  );
}
```

## Bonnes Pratiques

1. **Vérifier côté client ET serveur**: Toujours valider les permissions côté serveur même si l'UI cache les boutons
2. **Utiliser les guards pour les sections**: Préférer `PermissionGuard` pour des sections complètes
3. **Utiliser le hook pour les boutons**: Utiliser `usePermissions` pour des contrôles granulaires
4. **Combiner permissions et rôles**: Utiliser les deux systèmes ensemble pour plus de flexibilité
5. **Feedback utilisateur**: Toujours informer l'utilisateur pourquoi il ne peut pas accéder à quelque chose
6. **Performance**: Les vérifications de permissions sont mises en cache, n'hésitez pas à les utiliser souvent
7. **Cohérence**: Maintenir les mêmes noms de modules et actions partout dans l'application

## Dépannage

### La permission ne fonctionne pas
- Vérifier que l'utilisateur est bien authentifié
- Vérifier que le rôle a bien la permission dans la base de données
- Vérifier l'orthographe du module et de l'action
- Consulter les logs de la console pour les erreurs

### Les permissions ne se mettent pas à jour
- Appeler `refetch()` du hook après un changement de rôle
- Vérifier que le composant est bien monté après l'authentification
- Recharger la page pour forcer une nouvelle récupération

### Conflit entre niveau d'accès et permissions
- Le système de permissions est indépendant du niveau d'accès
- Utiliser l'un ou l'autre selon le contexte
- Les deux peuvent coexister pour plus de contrôle
