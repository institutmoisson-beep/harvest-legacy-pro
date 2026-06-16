import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wallet, Loader2 } from 'lucide-react';
import { formatFCFA } from '@/lib/currency';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function RelaisProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const sb: any = supabase;
      const { data: p } = await sb.from('relay_products').select('*').eq('id', productId).maybeSingle();
      if (!p) return;
      setProduct(p);
      const { data: pt } = await sb.from('relay_partners').select('*').eq('id', p.partner_id).maybeSingle();
      setPartner(pt);
      if (!p.is_service) {
        const { data: st } = await sb.from('relay_stocks').select('quantity')
          .eq('product_id', p.id).eq('partner_id', p.partner_id).maybeSingle();
        setStock(st?.quantity ?? 0);
      }
    })();
  }, [productId]);

  const buy = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!product) return;
    setBusy(true);
    try {
      const sb: any = supabase;
      const { data, error } = await sb.rpc('relay_purchase', {
        p_product_id: product.id,
        p_quantity: qty,
        p_booking_date: bookingDate || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success('Paiement effectué ! Ticket généré.');
      navigate(`/relais/ticket/${row.order_id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'achat');
    } finally {
      setBusy(false);
    }
  };

  if (!product) {
    return <div className="p-6 text-center text-muted-foreground">Chargement…</div>;
  }

  const total = Number(product.price_fcfa) * qty;
  const needsBooking = product.service_type === 'room_booking' || product.service_type === 'meal';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <Card className="overflow-hidden">
          {product.photo_url && (
            <img src={product.photo_url} alt={product.name} className="w-full h-64 object-cover" />
          )}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
              <Badge>{product.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{product.description || '—'}</p>
            {partner && (
              <p className="text-xs text-muted-foreground">
                Partenaire : <span className="font-medium">{partner.name}</span> — {partner.city || partner.address || ''}
              </p>
            )}
            {stock !== null && (
              <Badge variant={stock > 0 ? 'secondary' : 'destructive'}>
                Stock : {stock}
              </Badge>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground">Quantité</label>
                <Input type="number" min={1} max={stock ?? 99}
                  value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              {needsBooking && (
                <div>
                  <label className="text-xs text-muted-foreground">Date / Heure</label>
                  <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total à payer</span>
              <span className="text-xl font-bold text-primary">{formatFCFA(total)}</span>
            </div>

            <Button onClick={buy} disabled={busy || (stock !== null && stock < qty)} className="w-full h-12">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
              Payer avec mon portefeuille
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Paiement uniquement via votre portefeuille MSN. Un QR code sécurisé sera généré.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
