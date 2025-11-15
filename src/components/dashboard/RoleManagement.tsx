import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserCog, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UserWithRoles {
  id: string;
  full_name: string;
  referral_code: string;
  phone: string | null;
  created_at: string;
  roles: Array<{ role: string; access_level: number }>;
  max_access_level: number;
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

export default function RoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users_with_roles' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;

      setUsers((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addRoleToUser = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setIsAddingRole(true);
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: selectedRole as any,
        } as any);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Rôle ${ROLE_DEFINITIONS[selectedRole as keyof typeof ROLE_DEFINITIONS]?.label} attribué avec succès`,
      });

      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter le rôle',
        variant: 'destructive',
      });
    } finally {
      setIsAddingRole(false);
    }
  };

  const removeRoleFromUser = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Rôle retiré avec succès',
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le rôle',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <UserCog className="w-6 h-6" />
              Gestion des Rôles
            </CardTitle>
            <CardDescription>
              Gérer les rôles et niveaux d'accès des utilisateurs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, code ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Niveau Max</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {user.referral_code}
                    </code>
                  </TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((roleObj, idx) => {
                          const roleInfo = ROLE_DEFINITIONS[roleObj.role as keyof typeof ROLE_DEFINITIONS];
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className={`${roleInfo?.color} text-white`}
                              >
                                {roleInfo?.label || roleObj.role}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => removeRoleFromUser(user.id, roleObj.role)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground text-sm">Aucun rôle</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {user.max_access_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (!open) {
                        setSelectedUser(null);
                        setSelectedRole('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Ajouter un rôle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter un rôle à {user.full_name}</DialogTitle>
                          <DialogDescription>
                            Sélectionnez le rôle à attribuer à cet utilisateur
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Rôle</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`${def.color} text-white`}>
                                        {def.level}
                                      </Badge>
                                      {def.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              setSelectedUser(null);
                              setSelectedRole('');
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={addRoleToUser}
                            disabled={!selectedRole || isAddingRole}
                          >
                            {isAddingRole ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Shield className="w-4 h-4 mr-2" />
                            )}
                            Attribuer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun utilisateur trouvé
          </div>
        )}
      </CardContent>
    </Card>
  );
}
