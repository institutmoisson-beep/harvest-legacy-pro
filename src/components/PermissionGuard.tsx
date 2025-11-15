import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PermissionGuardProps {
  children: ReactNode;
  module: string;
  action: string;
  fallback?: ReactNode;
  showAlert?: boolean;
}

/**
 * Composant pour protéger l'accès à des éléments UI basé sur les permissions
 * 
 * @example
 * <PermissionGuard module="orders" action="create">
 *   <Button>Créer une commande</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  children, 
  module, 
  action, 
  fallback = null,
  showAlert = false 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  if (!hasPermission(module, action)) {
    if (showAlert) {
      return (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas la permission nécessaire pour accéder à cette fonctionnalité.
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiPermissionGuardProps {
  children: ReactNode;
  permissions: Array<{ module: string; action: string }>;
  requireAll?: boolean;
  fallback?: ReactNode;
  showAlert?: boolean;
}

/**
 * Composant pour protéger l'accès avec plusieurs permissions
 * 
 * @example
 * <MultiPermissionGuard 
 *   permissions={[
 *     { module: 'orders', action: 'view' },
 *     { module: 'orders', action: 'update' }
 *   ]}
 *   requireAll={true}
 * >
 *   <OrdersManager />
 * </MultiPermissionGuard>
 */
export function MultiPermissionGuard({
  children,
  permissions,
  requireAll = false,
  fallback = null,
  showAlert = false
}: MultiPermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    if (showAlert) {
      return (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
