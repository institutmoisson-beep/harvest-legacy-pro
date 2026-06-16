import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import { formatFCFA } from '@/lib/currency';
import { generateRelayReceipt } from '@/lib/documents/relayReceipt';
import { useAuth } from '@/hooks/useAuth';

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  paid_pending: { label: 'Payé — En attente de retrait', variant: 'default' },
  served: { label: 'Servi / Livré', variant: 'secondary' },
  refunded: { label: 'Remboursé', variant: 'outline' },
  expired: { label: 'Expiré', variant: 'destructive' },
};

export default function TicketDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!orderId) return;
    const sb: any = supabase;
    const load = async () => {
      const { data: o } = await sb.from('relay_orders').select('*').eq('id', orderId).maybeSingle();
      if (!o) return;
      setOrder(o);
      const [{ data: p }, { data: pt }] = await Promise.all([
        sb.from('relay_products').select('*').eq('id', o.product_id).maybeSingle(),
        sb.from('relay_partners').select('*').eq('id', o.partner_id).maybeSingle(),
      ]);
      setProduct(p);
      setPartner(pt);
      if (o.status === 'paid_pending') {
        const url = await QRCode.toDataURL(o.qr_token, { width: 320, margin: 1 });
        setQrUrl(url);
      }
    };
    load();
    const channel = sb.channel(`relay-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relay_orders', filter: `id=eq.${orderId}` },
        (payload: any) => setOrder(payload.new))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [orderId]);

  if (!order) return <div className="p-6 text-center text-muted-foreground">Chargement…</div>;
  const st = STATUS_LABEL[order.status];
  const isActive = order.status === 'paid_pending';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/relais/mes-tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Mes tickets
        </Button>

        <Card>
          <CardContent className="p-5 space-y-4 text-center">
            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
            {product?.photo_url && (
              <img src={product.photo_url} alt="" className="h-40 w-full object-cover rounded-lg" />
            )}
            <h1 className="text-xl font-bold">{product?.name}</h1>
            <p className="text-sm text-muted-foreground">{partner?.name}</p>

            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span>Quantité</span><span>x{order.quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total payé</span><span className="font-bold">{formatFCFA(Number(order.total_price))}</span>
            </div>

            {isActive && qrUrl && (
              <div className="space-y-2">
                <img src={qrUrl} alt="QR" className="mx-auto rounded-lg border border-border" />
                <p className="text-xs text-muted-foreground">Présentez ce QR au partenaire</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Code de retrait (secours)</p>
              <p className="font-mono text-2xl font-bold tracking-wider">{order.pickup_code}</p>
            </div>

            {!isActive && (
              <p className="text-xs text-destructive">⚠️ Ce ticket n'est plus utilisable.</p>
            )}

            <Button variant="outline" className="w-full" onClick={() => {
              if (product && partner && user) {
                generateRelayReceipt(order, product, partner, {
                  full_name: (user as any).user_metadata?.full_name || user.email || '—',
                  email: user.email || '',
                });
              }
            }}>
              <Download className="h-4 w-4 mr-2" /> Télécharger le reçu PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
