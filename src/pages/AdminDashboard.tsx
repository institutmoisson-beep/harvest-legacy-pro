import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, TrendingUp, Users, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminTransactionsSection from '@/components/dashboard/AdminTransactionsSection';
import VisitsAnalyticsSection from '@/components/dashboard/VisitsAnalyticsSection';

interface Order {
  id: string;
  customer_name: string;
  product_name: string;
  purchase_price: number;
  profit: number;
  status: string;
  created_at: string;
  broker_code: string;
}

interface UserWallet {
  user_id: string;
  balance: number;
  full_name: string;
  referral_code: string;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalBalance: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const checkAdminAccess = async () => {
      try {
        // Check if user has admin or financier role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        const hasAccess = roles?.some(r => r.role === 'admin' || r.role === 'financier');
        
        if (!hasAccess) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas les permissions nécessaires",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
        await fetchData();
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch all wallets with user info
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select(`
          user_id,
          balance,
          profiles(
            full_name,
            referral_code
          )
        `);

      if (walletsError) throw walletsError;
      
      const formattedWallets = walletsData?.map((w: any) => ({
        user_id: w.user_id,
        balance: w.balance,
        full_name: w.profiles?.full_name || 'Utilisateur',
        referral_code: w.profiles?.referral_code || 'N/A',
      })) || [];
      
      setWallets(formattedWallets);

      // Fetch all transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          amount,
          transaction_type,
          description,
          created_at,
          from_profile:from_user_id (full_name),
          to_profile:to_user_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      const formattedTransactions = transactionsData?.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        transaction_type: t.transaction_type,
        description: t.description,
        created_at: t.created_at,
        from_user_name: t.from_profile?.full_name,
        to_user_name: t.to_profile?.full_name,
      })) || [];

      setTransactions(formattedTransactions);

      // Calculate stats
      const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.profit), 0) || 0;
      const totalBalance = walletsData?.reduce((sum, wallet) => sum + Number(wallet.balance), 0) || 0;

      setStats({
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        totalUsers: walletsData?.length || 0,
        totalBalance,
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic flex items-center gap-2">
              <Shield className="h-10 w-10" />
              Super Dashboard Admin
            </h1>
            <p className="text-muted-foreground mt-2">Vue d'ensemble complète</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Mon Dashboard
            </Button>
            <Button onClick={signOut} variant="outline">
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Total Commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold gradient-text-primary">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Revenus Totaux</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold gradient-text-cosmic">
                {stats.totalRevenue.toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Total Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Solde Total MSN</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold gradient-text-secondary">
                {stats.totalBalance.toFixed(2)} MSN
              </p>
              <p className="text-sm text-muted-foreground">
                {(stats.totalBalance * 750).toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Visits Analytics */}
        <div className="mb-8">
          <VisitsAnalyticsSection />
        </div>

        {/* Orders Table */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Toutes les commandes
            </CardTitle>
            <CardDescription>Liste de toutes les commandes initiées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell className="max-w-xs truncate">{order.product_name}</TableCell>
                      <TableCell>{order.purchase_price.toLocaleString()} FCFA</TableCell>
                      <TableCell className="text-secondary">{order.profit.toLocaleString()} FCFA</TableCell>
                      <TableCell className="font-mono text-sm">{order.broker_code}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'completed' ? 'bg-secondary/20 text-secondary' :
                          order.status === 'pending' ? 'bg-accent/20 text-accent' :
                          order.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('approve-order', {
                                    body: { orderId: order.id, action: 'approve' }
                                  });
                                  
                                  if (error) {
                                    console.error('Edge function error:', error);
                                    throw new Error(error.message || 'Erreur lors de l\'approbation');
                                  }
                                  
                                  if (data?.error) {
                                    console.error('Function returned error:', data.error);
                                    throw new Error(data.error);
                                  }

                                  toast({
                                    title: "Commande approuvée",
                                    description: "Les commissions ont été distribuées",
                                  });
                                  await fetchData();
                                } catch (error: any) {
                                  console.error('Approve order error:', error);
                                  toast({
                                    title: "Erreur d'approbation",
                                    description: error.message || "Impossible d'approuver la commande",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke('approve-order', {
                                    body: { orderId: order.id, action: 'reject' }
                                  });
                                  
                                  if (error) {
                                    console.error('Edge function error:', error);
                                    throw new Error(error.message || 'Erreur lors du rejet');
                                  }
                                  
                                  if (data?.error) {
                                    console.error('Function returned error:', data.error);
                                    throw new Error(data.error);
                                  }

                                  toast({
                                    title: "Commande rejetée",
                                  });
                                  await fetchData();
                                } catch (error: any) {
                                  console.error('Reject order error:', error);
                                  toast({
                                    title: "Erreur de rejet",
                                    description: error.message || "Impossible de rejeter la commande",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Wallets Table */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Portefeuilles des membres
            </CardTitle>
            <CardDescription>Soldes de tous les utilisateurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Solde MSN</TableHead>
                    <TableHead>Solde FCFA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => (
                    <TableRow key={wallet.user_id}>
                      <TableCell>{wallet.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{wallet.referral_code}</TableCell>
                      <TableCell className="font-bold">{wallet.balance.toFixed(2)} MSN</TableCell>
                      <TableCell>{(wallet.balance * 750).toLocaleString()} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Transaction Approvals */}
        <AdminTransactionsSection />

        {/* Transactions Table */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Transactions récentes
            </CardTitle>
            <CardDescription>Les 50 dernières transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>À</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.transaction_type === 'deposit' ? 'bg-secondary/20 text-secondary' :
                          transaction.transaction_type === 'withdrawal' ? 'bg-destructive/20 text-destructive' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {transaction.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.from_user_name || '-'}</TableCell>
                      <TableCell>{transaction.to_user_name || '-'}</TableCell>
                      <TableCell className="font-bold">{transaction.amount.toFixed(2)} MSN</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
