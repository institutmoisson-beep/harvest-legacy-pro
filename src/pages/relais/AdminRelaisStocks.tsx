import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRelaisStocks() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRoles();
  const [rows, setRows] = useState<any[]>([]);
  const [partners, setPartners] = useState<Record<string, any>>({});
  const [products, setProducts] = useState<Record<string, any>>({});
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const [{ data: stocks }, { data: pts }, { data: prs }] = await Promise.all([
      sb.from('relay_stocks').select('*').order('quantity'),
      sb.from('relay_partners').select('*'),
      sb.from('relay_products').select('*'),
    ]);
    const pm: Record<string, any> = {}; (pts || []).forEach((p: any) => pm[p.id] = p);
    const rm: Record<string, any> = {}; (prs || []).forEach((p: any) => rm[p.id] = p);
    setPartners(pm);
    setProducts(rm);
    setRows(stocks || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin()) { navigate('/dashboard'); return; }
    load();
  }, [user, authLoading, navigate]);

  const saveQty = async (row: any) => {
    const q = edits[row.id];
    if (q === undefined) return;
    const sb: any = supabase;
    const { error } = await sb.from('relay_stocks').update({ quantity: q }).eq('id', row.id);
    if (error) toast.error(error.message);
    else { toast.success('Stock mis à jour'); load(); }
  };

  const lowStock = rows.filter((r) => {
    const p = partners[r.partner_id];
    return p && r.quantity < (p.low_stock_threshold ?? 5);
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/relais')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Stocks Relais</h1>

        {lowStock.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Alertes stock bas ({lowStock.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {lowStock.map((r) => (
                <div key={r.id} className="flex justify-between">
                  <span>{products[r.product_id]?.name || '—'} @ {partners[r.partner_id]?.name || '—'}</span>
                  <Badge variant="destructive">{r.quantity} restants</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">Tous les stocks ({rows.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? 'Chargement…' : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun stock enregistré</p>
            ) : rows.map((r) => {
              const p = partners[r.partner_id] || {};
              const prod = products[r.product_id] || {};
              const threshold = p.low_stock_threshold ?? 5;
              const isLow = r.quantity < threshold;
              return (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded border border-border text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{prod.name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.name} · seuil {threshold}</p>
                  </div>
                  <Input
                    type="number"
                    className="w-20"
                    defaultValue={r.quantity}
                    onChange={(e) => setEdits({ ...edits, [r.id]: Number(e.target.value) })}
                  />
                  <Badge variant={isLow ? 'destructive' : 'outline'}>{r.quantity}</Badge>
                  <Button size="sm" variant="outline" onClick={() => saveQty(r)}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
