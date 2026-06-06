import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Loader2, Wheat, TrendingUp } from 'lucide-react';
import { generateGrenierReceipt } from '@/lib/documents/grenierReceipt';
import { toast } from '@/hooks/use-toast';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)) + ' FCFA';

export default function MesInvestissementsGrenier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Mes investissements — Le Grenier';
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const [{ data: invs }, { data: prof }] = await Promise.all([
        (supabase as any)
          .from('moisson_community_investments')
          .select('*, moisson_projects(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        (supabase as any).from('profiles').select('*').eq('id', user.id).maybeSingle(),
      ]);
      setItems(invs || []);
      setProfile(prof);
      setLoading(false);
    })();
  }, [user, navigate]);

  const download = (inv: any) => {
    const project = inv.moisson_projects;
    if (!project) {
      toast({ title: 'Projet introuvable', variant: 'destructive' });
      return;
    }
    generateGrenierReceipt(
      inv,
      project,
      {
        full_name: profile?.full_name,
        email: profile?.email || user?.email,
        phone: profile?.phone,
        id_moissonneur: profile?.id_moissonneur,
      },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/grenier')} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour au Grenier
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-amber-500/15">
            <Wheat className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mes parts d'actions</h1>
            <p className="text-sm text-muted-foreground">Historique complet — téléchargez vos reçus à tout moment.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun investissement pour le moment.
              <div className="mt-4">
                <Button asChild><Link to="/grenier">Explorer les projets</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((inv) => {
              const p = inv.moisson_projects || {};
              const gain = Number(inv.total_amount_invested) * (Number(p.estimated_roi || 0) / 100);
              return (
                <Card key={inv.id} className="border-border/60 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">{p.title || 'Projet'}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(inv.created_at || inv.investment_date).toLocaleString('fr-FR')} · Réf GR-{inv.id.slice(0,8).toUpperCase()}
                        </div>
                      </div>
                      <Badge className="bg-amber-500 text-white border-0">
                        <TrendingUp className="w-3 h-3 mr-1" /> +{p.estimated_roi || 0}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Parts</div>
                        <div className="font-bold">{inv.shares_purchased}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Montant</div>
                        <div className="font-bold">{formatFCFA(inv.total_amount_invested)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Gain estimé</div>
                        <div className="font-bold text-emerald-600">+{formatFCFA(gain)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Paiement</div>
                        <div className="font-bold">Wallet</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={() => download(inv)} className="gap-2">
                        <Download className="w-4 h-4" /> Télécharger le reçu PDF
                      </Button>
                      {p.id && (
                        <Button variant="outline" asChild>
                          <Link to={`/grenier/${p.id}`}>Voir le projet</Link>
                        </Button>
                      )}
                    </div>
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
