import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, MapPin, CheckCircle2, Truck, ArrowLeft } from 'lucide-react';

interface Row {
  id: string;
  created_at: string;
  delivery_mode: string;
  pickup_code: string | null;
  picked_up_at: string | null;
  status: string;
  pack: { name: string } | null;
  relay: { name: string; address: string; city: string; country: string; phone: string | null } | null;
}

export default function MyRelayDeliveries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Mes livraisons en point relais';
  }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('mlm_pack_purchases')
        .select('id, created_at, delivery_mode, pickup_code, picked_up_at, status, pack:mlm_packs(name), relay:delivery_relay_points(name,address,city,country,phone)')
        .eq('buyer_id', user.id)
        .eq('delivery_mode', 'relay')
        .order('created_at', { ascending: false });
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, [user, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 py-6 px-4">
      <div className="container mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />Mes retraits en point relais</h1>

        {rows.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Aucun retrait en point relais pour le moment.
          </CardContent></Card>
        )}

        {rows.map(r => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{r.pack?.name || 'Pack'}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('fr-FR')}</div>
                </div>
                {r.picked_up_at
                  ? <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Retiré</Badge>
                  : <Badge variant="secondary">En attente de retrait</Badge>}
              </div>

              {r.relay && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="font-semibold flex items-center gap-1"><MapPin className="w-4 h-4 text-primary" />{r.relay.name}</div>
                  <div className="text-muted-foreground">{r.relay.address}, {r.relay.city}, {r.relay.country}</div>
                  {r.relay.phone && <div className="text-muted-foreground">📞 {r.relay.phone}</div>}
                </div>
              )}

              {r.pickup_code && !r.picked_up_at && (
                <div className="rounded-md border-2 border-dashed border-primary p-3 text-center">
                  <div className="text-xs text-muted-foreground">Code de retrait</div>
                  <div className="text-2xl font-black tracking-widest text-primary">{r.pickup_code}</div>
                  <div className="text-xs text-muted-foreground mt-1">Présentez ce code au point relais</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
