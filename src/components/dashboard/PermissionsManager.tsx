import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string;
}

interface RolePermission {
  module: string;
  action: string;
  name: string;
  description: string;
  permission_id: string;
}

const ROLE_DEFINITIONS = {
  super_admin: { label: 'Super Administrateur', level: 100, color: 'bg-red-500' },
  operational_admin: { label: 'Administrateur Opérationnel', level: 90, color: 'bg-orange-500' },
  admin: { label: 'Administrateur', level: 90, color: 'bg-orange-500' },
  financial_manager: { label: 'Manager Financier', level: 80, color: 'bg-yellow-500' },
  financier: { label: 'Financier', level: 80, color: 'bg-yellow-500' },
  tontine_manager: { label: 'Manager Tontine/MLM', level: 75, color: 'bg-green-500' },
  moderator: { label: 'Modérateur', level: 70, color: 'bg-blue-500' },
  shop_manager: { label: 'Responsable Boutique', level: 60, color: 'bg-purple-500' },
  merchant: { label: 'Marchand', level: 60, color: 'bg-purple-500' },
  relay_agent: { label: 'Agent Relais', level: 50, color: 'bg-indigo-500' },
  agent: { label: 'Agent', level: 50, color: 'bg-indigo-500' },
  moissonneur: { label: 'Moissonneur', level: 30, color: 'bg-teal-500' },
  user: { label: 'Utilisateur', level: 30, color: 'bg-teal-500' },
  developer: { label: 'Développeur Technique', level: 10, color: 'bg-gray-500' },
};

const MODULE_LABELS: Record<string, string> = {
  orders: 'Commandes',
  tontines: 'Tontines',
  shops: 'Boutiques',
  finances: 'Finances',
  users: 'Utilisateurs',
  investments: 'Investissements',
  agents: 'Agents',
  system: 'Système',
};

export default function PermissionsManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>('moissonneur');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permissions' as any)
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;

      setPermissions((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (role: string) => {
    try {
      const { data, error } = await supabase.rpc('get_role_permissions' as any, {
        _role: role,
      }) as any;

      if (error) throw error;

      setRolePermissions((prev) => ({
        ...prev,
        [role]: data || [],
      }));

      // Update selected permissions set
      const permissionIds = new Set<string>((data || []).map((p: RolePermission) => p.permission_id));
      setSelectedPermissions(permissionIds);
    } catch (error: any) {
      let errorMessage = 'Impossible de récupérer les permissions';

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

      console.error('Error fetching role permissions:', errorMessage);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const saveRolePermissions = async () => {
    try {
      setSaving(true);

      // Get current permissions for this role
      const currentPermissions = rolePermissions[selectedRole] || [];
      const currentIds = new Set(currentPermissions.map((p) => p.permission_id));

      // Determine which to add and which to remove
      const toAdd = Array.from(selectedPermissions).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !selectedPermissions.has(id));

      // Remove permissions
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('role_permissions' as any)
          .delete()
          .eq('role', selectedRole as any)
          .in('permission_id', toRemove as any);

        if (deleteError) throw deleteError;
      }

      // Add permissions
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions' as any)
          .insert(
            toAdd.map((permissionId) => ({
              role: selectedRole as any,
              permission_id: permissionId,
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: 'Succès',
        description: 'Les permissions ont été mises à jour',
      });

      // Refresh permissions for this role
      await fetchRolePermissions(selectedRole);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const groupPermissionsByModule = () => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((permission) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });
    return grouped;
  };

  const groupedPermissions = groupPermissionsByModule();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Gestion des Permissions
            </CardTitle>
            <CardDescription>
              Configuration granulaire des permissions par rôle
            </CardDescription>
          </div>
          <Button onClick={saveRolePermissions} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={setSelectedRole}>
          <TabsList className="flex-wrap h-auto gap-2 mb-6">
            {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Badge className={`${def.color} text-white`}>{def.level}</Badge>
                {def.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(ROLE_DEFINITIONS).map((role) => (
            <TabsContent key={role} value={role}>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Permissions pour {ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS]?.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPermissions.size} permission(s) activée(s)
                    </p>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <AccordionItem key={module} value={module}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span className="font-semibold">
                            {MODULE_LABELS[module] || module}
                          </span>
                          <Badge variant="outline">
                            {modulePermissions.filter((p) => selectedPermissions.has(p.id)).length}/
                            {modulePermissions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {modulePermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                            >
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {permission.name}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                                <Badge variant="secondary" className="mt-2 text-xs">
                                  {permission.action}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
