import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye } from 'lucide-react';
import { formatFCFA } from '@/lib/currency';

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  paid_pending: { label: 'Payé — En attente de retrait', variant: 'default' },
  served: { label: 'Servi / Livré', variant: 'secondary' },
  refunded: { label: 'Remboursé', variant: 'outline' },
  expired: { label: 'Expiré', variant: 'destructive' },
};

export default function MesTickets() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [partners, setPartners] = useState<Record<string, any>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const sb: any = supabase;
      const { data: ords } = await sb.from('relay_orders').select('*')
        .eq('client_id', user.id).order('created_at', { ascending: false });
      setOrders(ords || []);
      const productIds = [...new Set((ords || []).map((o: any) => o.product_id))];
      const partnerIds = [...new Set((ords || []).map((o: any) => o.partner_id))];
      if (productIds.length) {
        const { data: prods } = await sb.from('relay_products').select('*').in('id', productIds);
        const map: Record<string, any> = {};
        (prods || []).forEach((p: any) => (map[p.id] = p));
        setProducts(map);
      }
      if (partnerIds.length) {
        const { data: parts } = await sb.from('relay_partners').select('*').in('id', partnerIds);
        const map: Record<string, any> = {};
        (parts || []).forEach((p: any) => (map[p.id] = p));
        setPartners(map);
      }
    })();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/relais')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Catalogue
        </Button>
        <h1 className="text-2xl font-bold">Mes tickets Points Relais</h1>

        {orders.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucun ticket pour le moment.
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => {
              const prod = products[o.product_id] || {};
              const part = partners[o.partner_id] || {};
              const st = STATUS_LABEL[o.status] || { label: o.status, variant: 'outline' };
              return (
                <Card key={o.id} className="cursor-pointer hover:border-primary/50"
                      onClick={() => navigate(`/relais/ticket/${o.id}`)}>
                  <CardContent className="p-3 flex gap-3 items-center">
                    {prod.photo_url && (
                      <img src={prod.photo_url} alt="" className="h-16 w-16 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{prod.name || 'Produit'}</h3>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{part.name}</p>
                      <p className="text-xs">
                        <span className="font-mono">{o.pickup_code}</span> · {formatFCFA(Number(o.total_price))} · x{o.quantity}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
