import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Trash2, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Member {
  id: string;
  full_name: string;
  phone: string;
  referral_code: string;
  balance: number;
  role: string;
}

export default function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [operationType, setOperationType] = useState<'credit' | 'debit'>('credit');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, referral_code');

      if (profileError) throw profileError;

      const membersWithDetails = await Promise.all(
        profiles.map(async (profile) => {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', profile.id)
            .single();

          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            full_name: profile.full_name,
            phone: profile.phone || 'N/A',
            referral_code: profile.referral_code,
            balance: wallet?.balance || 0,
            role: roles?.[0]?.role || 'user'
          };
        })
      );

      setMembers(membersWithDetails);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember || !newRole) {
      toast({ title: 'Erreur', description: 'Sélectionnez un membre et un rôle', variant: 'destructive' });
      return;
    }

    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedMember);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedMember, role: newRole } as any);

      if (error) throw error;

      toast({ title: 'Succès', description: 'Rôle modifié avec succès' });
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleWalletOperation = async () => {
    if (!selectedMember || !amount) {
      toast({ title: 'Erreur', description: 'Sélectionnez un membre et un montant', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', selectedMember)
        .single();

      if (!wallet) throw new Error('Portefeuille introuvable');

      const newBalance = operationType === 'credit' 
        ? wallet.balance + amountNum 
        : wallet.balance - amountNum;

      if (newBalance < 0) {
        toast({ title: 'Erreur', description: 'Solde insuffisant', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', selectedMember);

      if (error) throw error;

      toast({ 
        title: 'Succès', 
        description: `Portefeuille ${operationType === 'credit' ? 'crédité' : 'débité'} avec succès` 
      });
      
      setAmount('');
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(memberId);
      if (error) throw error;

      toast({ title: 'Succès', description: 'Membre supprimé avec succès' });
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des Membres
        </CardTitle>
        <CardDescription>
          Modifier les rôles, gérer les portefeuilles et supprimer des membres
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Role Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Changer le rôle
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Membre</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.referral_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nouveau rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="marchand">Marchand</SelectItem>
                  <SelectItem value="representant">Représentant</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="financier">Financier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleChangeRole}>Changer le rôle</Button>
        </div>

        {/* Wallet Operations Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Opérations sur le portefeuille</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Type d'opération</Label>
              <Select value={operationType} onValueChange={(v) => setOperationType(v as 'credit' | 'debit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Créditer</SelectItem>
                  <SelectItem value="debit">Débiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (MSN)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleWalletOperation} className="w-full">
                {operationType === 'credit' ? 'Créditer' : 'Débiter'}
              </Button>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Solde (MSN)</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.full_name}</TableCell>
                  <TableCell>{member.referral_code}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
