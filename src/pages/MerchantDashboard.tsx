import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, UserPlus, Users, DollarSign, TrendingUp, Ban, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MerchantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      checkMerchantRole();
      fetchMerchantData();
    }
  }, [user]);

  const checkMerchantRole = async () => {
    const { data: roles } = await (supabase.from as any)('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'merchant')
      .maybeSingle();

    if (!roles) {
      toast({ title: 'Accès refusé', description: 'Rôle marchand requis', variant: 'destructive' });
      navigate('/dashboard');
    }
  };

  const fetchMerchantData = async () => {
    setLoading(true);
    await Promise.all([fetchAgents(), fetchCommissions(), fetchTransactions()]);
    setLoading(false);
  };

  const fetchAgents = async () => {
    try {
      const { data: merchant } = await (supabase.from as any)('merchants')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!merchant?.id) return;

      const { data: merchantAgents } = await (supabase.from as any)('merchant_agents')
        .select('*')
        .eq('merchant_id', merchant.id);

      if (merchantAgents && merchantAgents.length > 0) {
        const { data: allProfiles } = await supabase.from('profiles').select('*');
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        
        const agentProfiles = allProfiles?.filter((p: any) => {
          const authUser = authUsers?.find((u: any) => u.id === p.id);
          return merchantAgents.some((ma: any) => ma.email === authUser?.email);
        }) || [];

        const agentIds = agentProfiles.map((p: any) => p.id);
        const { data: wallets } = await supabase.from('wallets').select('*').in('user_id', agentIds);

        const agentsWithData = merchantAgents.map((ma: any) => {
          const profile = agentProfiles.find((p: any) => {
            const authUser = authUsers?.find((u: any) => u.id === p.id);
            return authUser?.email === ma.email;
          });
          return { ...ma, profile, wallet: wallets?.find((w: any) => w.user_id === profile?.id) };
        });

        setAgents(agentsWithData);
      }
    } catch (error) {
      console.error('Fetch agents error:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data: merchant } = await (supabase.from as any)('merchants').select('id').eq('user_id', user?.id).maybeSingle();
      if (!merchant?.id) return;
      const { data } = await (supabase.from as any)('agent_commissions').select('*').order('created_at', { ascending: false }).limit(50);
      setCommissions(data || []);
    } catch (error) {
      console.error('Fetch commissions error:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: merchant } = await (supabase.from as any)('merchants').select('id').eq('user_id', user?.id).maybeSingle();
      if (!merchant?.id) return;
      const { data } = await (supabase.from as any)('agent_transactions').select('*').order('created_at', { ascending: false }).limit(100);
      setTransactions(data || []);
    } catch (error) {
      console.error('Fetch transactions error:', error);
    }
  };

  const createAgent = async () => {
    if (!newAgent.email || !newAgent.password || !newAgent.full_name || !newAgent.phone) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAgent.email,
        password: newAgent.password,
        options: {
          data: {
            full_name: newAgent.full_name,
            phone: newAgent.phone,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assign agent role
        await (supabase.from as any)('user_roles').insert({
          user_id: authData.user.id,
          role: 'agent',
        });

        // Link to merchant
        await (supabase.from as any)('merchant_agents').insert({
          merchant_id: user?.id,
          agent_id: authData.user.id,
        });

        toast({ title: 'Succès', description: 'Agent créé avec succès' });
        setCreateDialogOpen(false);
        setNewAgent({ email: '', password: '', full_name: '', phone: '' });
        fetchAgents();
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    const { error } = await (supabase.from as any)('merchant_agents')
      .update({ is_active: !currentStatus })
      .eq('merchant_id', user?.id)
      .eq('agent_id', agentId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: `Agent ${!currentStatus ? 'activé' : 'bloqué'}` });
      fetchAgents();
    }
  };

  const sendMSN = async (agentId: string, amount: number) => {
    if (amount <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    try {
      const { data: agentWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', agentId)
        .single();

      if (agentWallet) {
        await supabase
          .from('wallets')
          .update({ balance: Number(agentWallet.balance) + amount })
          .eq('user_id', agentId);

        await supabase.from('agent_transactions').insert({
          agent_id: agentId,
          member_id: user?.id,
          transaction_type: 'deposit',
          amount,
          description: 'Envoi MSN par marchand',
        } as any);

        toast({ title: 'Succès', description: `${amount} MSN envoyés` });
        fetchAgents();
        fetchTransactions();
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const withdrawMSN = async (agentId: string, amount: number) => {
    if (amount <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    try {
      const { data: agentWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', agentId)
        .single();

      if (agentWallet && Number(agentWallet.balance) >= amount) {
        await supabase
          .from('wallets')
          .update({ balance: Number(agentWallet.balance) - amount })
          .eq('user_id', agentId);

        await supabase.from('agent_transactions').insert({
          agent_id: agentId,
          member_id: user?.id,
          transaction_type: 'withdrawal',
          amount,
          description: 'Retrait MSN par marchand',
        } as any);

        toast({ title: 'Succès', description: `${amount} MSN retirés` });
        fetchAgents();
        fetchTransactions();
      } else {
        toast({ title: 'Erreur', description: 'Solde insuffisant', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au tableau de bord
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold gradient-text-primary">Tableau de bord Marchand</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer un agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau compte agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <Input
                  value={newAgent.full_name}
                  onChange={(e) => setNewAgent({ ...newAgent, full_name: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  placeholder="agent@example.com"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={createAgent} className="w-full">Créer l'agent</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commissions totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCommissions.toFixed(4)} MSN</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agents actifs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.map(agent => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{agent.profile?.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{agent.profile?.phone}</p>
                    <p className="text-sm text-muted-foreground">Code: {agent.profile?.referral_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${agent.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {agent.is_active ? 'Actif' : 'Bloqué'}
                    </span>
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={() => toggleAgentStatus(agent.agent_id, agent.is_active)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Solde</p>
                    <p className="text-2xl font-bold">{agent.wallet?.balance?.toFixed(4) || 0} MSN</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const amount = prompt('Montant à envoyer (MSN):');
                        if (amount) sendMSN(agent.agent_id, parseFloat(amount));
                      }}
                    >
                      Envoyer MSN
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const amount = prompt('Montant à retirer (MSN):');
                        if (amount) withdrawMSN(agent.agent_id, parseFloat(amount));
                      }}
                    >
                      Retirer MSN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Historique des commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {commissions.map(commission => (
                  <div key={commission.id} className="flex justify-between items-center p-3 bg-accent/5 rounded">
                    <div>
                      <p className="font-medium">{commission.commission_type === 'withdrawal' ? 'Retrait' : 'Transfert'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(commission.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{commission.commission_amount.toFixed(4)} MSN</p>
                      <p className="text-xs text-muted-foreground">
                        Frais: {commission.transaction_fee.toFixed(4)} MSN
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transactions des agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-3 bg-accent/5 rounded">
                    <div>
                      <p className="font-medium">{tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className={`font-bold ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(4)} MSN
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
