import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    queuedActions,
    syncQueuedActions,
    clearCache,
  } = useOfflineSync();

  if (isOnline && queuedActions === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${!isOnline ? 'border-destructive text-destructive' : 'border-warning text-warning'}`}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </span>
          {queuedActions > 0 && (
            <Badge variant="secondary" className="ml-1">
              {queuedActions}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Statut: {isOnline ? '🟢 En ligne' : '🔴 Hors-ligne'}
            </span>
          </div>
          
          {queuedActions > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                {queuedActions} action(s) en attente de synchronisation
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={syncQueuedActions}
                  disabled={!isOnline || isSyncing}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearCache}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {isOnline && queuedActions === 0 && (
            <div className="text-sm text-muted-foreground">
              ✅ Toutes les données sont synchronisées
            </div>
          )}
          
          {!isOnline && (
            <div className="text-sm text-muted-foreground bg-destructive/10 p-2 rounded">
              Mode hors-ligne: vos actions seront automatiquement synchronisées à la reconnexion
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
