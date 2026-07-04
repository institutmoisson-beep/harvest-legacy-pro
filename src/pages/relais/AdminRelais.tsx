import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Banknote, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatFCFA } from '@/lib/currency';

export default function AdminRelais() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRoles();
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<Record<string, any>>({});
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data: ords } = await sb.from('relay_orders').select('*').order('created_at', { ascending: false }).limit(200);
    setOrders(ords || []);
    const partnerIds = [...new Set((ords || []).map((o: any) => o.partner_id))];
    const productIds = [...new Set((ords || []).map((o: any) => o.product_id))];
    if (partnerIds.length) {
      const { data: pts } = await sb.from('relay_partners').select('*').in('id', partnerIds);
      const m: Record<string, any> = {};
      (pts || []).forEach((p: any) => (m[p.id] = p));
      setPartners(m);
    }
    if (productIds.length) {
      const { data: prs } = await sb.from('relay_products').select('*').in('id', productIds);
      const m: Record<string, any> = {};
      (prs || []).forEach((p: any) => (m[p.id] = p));
      setProducts(m);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin()) { navigate('/dashboard'); return; }
    load();
    const sb: any = supabase;
    const ch = sb.channel('admin-relay-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'relay_orders' }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user, authLoading, navigate]);

  const releasePayout = async (orderId: string) => {
    const sb: any = supabase;
    const { error } = await sb.rpc('relay_release_payout', { p_order_id: orderId });
    if (error) toast.error(error.message);
    else { toast.success('Reversement effectué'); load(); }
  };

  const refund = async (orderId: string) => {
    if (!confirm('Confirmer le remboursement de cette commande ?')) return;
    const sb: any = supabase;
    const { error } = await sb.rpc('relay_refund', { p_order_id: orderId, p_reason: 'Décision administrateur' });
    if (error) toast.error(error.message);
    else { toast.success('Commande remboursée'); load(); }
  };

  const pendingPayouts = orders.filter((o) => o.status === 'served' && o.payout_status === 'held');
  const all = orders;

  const Row = ({ o, withPayout }: { o: any; withPayout?: boolean }) => {
    const part = partners[o.partner_id] || {};
    const prod = products[o.product_id] || {};
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 items-center">
            <span className="font-mono text-xs">{o.pickup_code}</span>
            <Badge variant={o.status === 'served' ? 'secondary' : o.status === 'paid_pending' ? 'default' : 'outline'}>
              {o.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">payout: {o.payout_status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {prod.name} · {part.name} · x{o.quantity} · {formatFCFA(Number(o.total_price))}
          </p>
        </div>
        {withPayout && (
          <Button size="sm" onClick={() => releasePayout(o.id)}>
            <Banknote className="h-3 w-3 mr-1" /> Verser
          </Button>
        )}
        {o.status !== 'refunded' && o.payout_status !== 'released' && (
          <Button size="sm" variant="outline" onClick={() => refund(o.id)}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Administration Points Relais</h1>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/relais/partenaires')}>
            Gérer les partenaires
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/relais/stocks')}>
            Gérer les stocks
          </Button>
        </div>

        <Tabs defaultValue="payouts">
          <TabsList>
            <TabsTrigger value="payouts">À verser ({pendingPayouts.length})</TabsTrigger>
            <TabsTrigger value="all">Toutes les commandes ({all.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="payouts" className="mt-4">
            <Card><CardHeader><CardTitle className="text-sm">Commandes servies en attente de reversement</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {loading ? 'Chargement…' : pendingPayouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun reversement en attente</p>
                ) : pendingPayouts.map((o) => <Row key={o.id} o={o} withPayout />)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <Card><CardContent className="p-3 space-y-2">
              {loading ? 'Chargement…' : all.map((o) => <Row key={o.id} o={o} />)}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
