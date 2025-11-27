import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Calendar, User, Database, Activity, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ACTION_COLORS = {
  INSERT: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
};

const TABLE_LABELS: Record<string, string> = {
  role_permissions: 'Permissions de Rôle',
  user_roles: 'Rôles Utilisateur',
  permissions: 'Permissions',
  user_roles_access: 'Accès Utilisateur',
};

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('audit_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, tableFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500) as any;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      let errorMessage = 'Impossible de charger les journaux d\'audit';

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if (error.message && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error.code && typeof error.code === 'string') {
          errorMessage = `Erreur (${error.code})`;
        } else if (error.details) {
          const details = error.details;
          if (typeof details === 'string') {
            errorMessage = details;
          } else if (typeof details === 'object') {
            errorMessage = JSON.stringify(details);
          }
        }
      }

      console.error('Error fetching audit logs:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (tableFilter !== 'all') {
      filtered = filtered.filter((log) => log.table_name === tableFilter);
    }

    setFilteredLogs(filtered);
  };

  const getChangeSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      return 'Nouvel enregistrement créé';
    }
    if (log.action === 'DELETE') {
      return 'Enregistrement supprimé';
    }
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changes = Object.keys(log.new_data).filter(
        (key) => JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])
      );
      return `Champs modifiés: ${changes.join(', ')}`;
    }
    return 'Modification effectuée';
  };

  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Journal d'Audit - Historique des Modifications
        </CardTitle>
        <CardDescription>
          Traçabilité complète de tous les changements de permissions et rôles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (email, IP, ID)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="INSERT">Création</SelectItem>
                <SelectItem value="UPDATE">Modification</SelectItem>
                <SelectItem value="DELETE">Suppression</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les tables</SelectItem>
                {uniqueTables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {TABLE_LABELS[table] || table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{logs.length}</div>
                <p className="text-xs text-muted-foreground">Total événements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">
                  {logs.filter((l) => l.action === 'INSERT').length}
                </div>
                <p className="text-xs text-muted-foreground">Créations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-500">
                  {logs.filter((l) => l.action === 'UPDATE').length}
                </div>
                <p className="text-xs text-muted-foreground">Modifications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">
                  {logs.filter((l) => l.action === 'DELETE').length}
                </div>
                <p className="text-xs text-muted-foreground">Suppressions</p>
              </CardContent>
            </Card>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[600px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun log trouvé avec ces critères
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <Card key={log.id} className="border-l-4" style={{
                    borderLeftColor: log.action === 'INSERT' ? 'hsl(var(--success))' :
                      log.action === 'DELETE' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
                  }}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={ACTION_COLORS[log.action as keyof typeof ACTION_COLORS]}>
                                {log.action}
                              </Badge>
                              <span className="font-semibold">
                                {TABLE_LABELS[log.table_name] || log.table_name}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getChangeSummary(log)}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(log.created_at), 'PPp', { locale: fr })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{log.user_email || 'Système'}</span>
                          </div>
                          {log.ip_address && (
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-xs">{log.ip_address}</span>
                            </div>
                          )}
                          {log.record_id && (
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-xs truncate">{log.record_id}</span>
                            </div>
                          )}
                        </div>

                        {log.user_agent && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">
                              Détails techniques
                            </summary>
                            <div className="mt-2 p-2 bg-muted rounded font-mono text-xs break-all">
                              {log.user_agent}
                            </div>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
