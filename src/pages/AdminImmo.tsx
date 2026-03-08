import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Building, Check, X, Eye, Loader2, TrendingUp, Users, Wallet } from 'lucide-react';

export default function AdminImmo() {
  const { user } = useAuth();
  const { hasAccessLevel, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!rolesLoading && !hasAccessLevel(80)) { navigate('/dashboard'); return; }
    if (!rolesLoading) fetchData();
  }, [user, rolesLoading]);

  const fetchData = async () => {
    setLoading(true);
    const [l, o, b, t] = await Promise.all([
      (supabase as any).from('immo_listings').select('*, profiles:host_id(full_name, referral_code)').order('created_at', { ascending: false }).limit(100),
      (supabase as any).from('immo_offers').select('*, profiles:client_id(full_name, referral_code)').order('created_at', { ascending: false }).limit(100),
      (supabase as any).from('immo_bookings').select('*, immo_listings(title, city)').order('created_at', { ascending: false }).limit(100),
      (supabase as any).from('immo_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setListings(l.data || []); setOffers(o.data || []); setBookings(b.data || []); setTransactions(t.data || []);
    setLoading(false);
  };

  const toggleListingVerification = async (id: string, current: boolean) => {
    await (supabase as any).from('immo_listings').update({ is_verified: !current }).eq('id', id);
    toast({ title: current ? 'Vérification retirée' : 'Annonce vérifiée ✅' });
    fetchData();
  };

  const toggleListingActive = async (id: string, current: boolean) => {
    await (supabase as any).from('immo_listings').update({ is_active: !current }).eq('id', id);
    toast({ title: current ? 'Annonce désactivée' : 'Annonce activée' });
    fetchData();
  };

  if (loading || rolesLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.platform_commission || 0), 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-2xl font-bold">🏠 Admin MSN Immo</h1><p className="text-sm text-muted-foreground">Gestion de la plateforme immobilière</p></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Annonces</p><p className="text-2xl font-bold">{listings.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Offres</p><p className="text-2xl font-bold">{offers.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Réservations</p><p className="text-2xl font-bold">{bookings.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Commissions</p><p className="text-2xl font-bold text-primary">{totalRevenue.toLocaleString()} FCFA</p></CardContent></Card>
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="listings">Annonces</TabsTrigger>
            <TabsTrigger value="offers">Offres</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            <Card><CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Titre</TableHead><TableHead>Hôte</TableHead><TableHead>Ville</TableHead>
                  <TableHead>Prix/nuit</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {listings.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.title}</TableCell>
                      <TableCell>{l.profiles?.full_name}<br/><span className="text-xs text-muted-foreground">{l.profiles?.referral_code}</span></TableCell>
                      <TableCell>{l.city}</TableCell>
                      <TableCell>{Number(l.price_per_night).toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={l.is_active ? 'default' : 'secondary'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                          <Badge variant={l.is_verified ? 'default' : 'outline'}>{l.is_verified ? '✓ Vérifiée' : 'Non vérifiée'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => toggleListingVerification(l.id, l.is_verified)}>
                            {l.is_verified ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleListingActive(l.id, l.is_active)}>
                            {l.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="offers" className="mt-4">
            <Card><CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Client</TableHead><TableHead>Ville</TableHead><TableHead>Dates</TableHead>
                  <TableHead>Budget</TableHead><TableHead>Statut</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {offers.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{o.profiles?.full_name}<br/><span className="text-xs text-muted-foreground">{o.profiles?.referral_code}</span></TableCell>
                      <TableCell>{o.city}</TableCell>
                      <TableCell className="text-sm">{o.check_in} → {o.check_out}</TableCell>
                      <TableCell className="font-bold">{Number(o.proposed_budget).toLocaleString()} FCFA</TableCell>
                      <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-4">
            <Card><CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Propriété</TableHead><TableHead>Dates</TableHead>
                  <TableHead>Total</TableHead><TableHead>Commission</TableHead><TableHead>Statut</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{b.immo_listings?.title} - {b.immo_listings?.city}</TableCell>
                      <TableCell className="text-sm">{b.check_in} → {b.check_out}</TableCell>
                      <TableCell className="font-bold">{Number(b.total_price).toLocaleString()} FCFA</TableCell>
                      <TableCell className="text-primary font-bold">{Number(b.platform_commission).toLocaleString()} FCFA</TableCell>
                      <TableCell><Badge>{b.booking_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <Card><CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Montant</TableHead><TableHead>Commission</TableHead>
                  <TableHead>Statut</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.transaction_type}</TableCell>
                      <TableCell className="font-bold">{Number(t.amount).toLocaleString()} FCFA</TableCell>
                      <TableCell>{Number(t.commission_amount).toLocaleString()} FCFA</TableCell>
                      <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
