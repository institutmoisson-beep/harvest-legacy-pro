import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Sprout, Film, Cpu, Building2, Loader2, TrendingUp, Calendar } from 'lucide-react';

type Project = {
  id: string;
  title: string;
  category: string;
  description: string;
  global_target: number;
  share_price: number;
  total_shares: number;
  shares_sold: number;
  estimated_roi: number;
  end_date: string | null;
  status: string;
  cover_image: string | null;
};

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  cinema: { label: 'Cinéma', icon: Film, color: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
  agrobusiness: { label: 'Agrobusiness', icon: Sprout, color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  tech: { label: 'Tech', icon: Cpu, color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' },
  immobilier: { label: 'Immobilier', icon: Building2, color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  autre: { label: 'Autre', icon: Sprout, color: 'bg-muted text-foreground border-border' },
};

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function MoissonGrenier() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Le Grenier des Moissonneurs — Investissements Partagés';
    (async () => {
      const { data } = await (supabase as any)
        .from('moisson_projects')
        .select('*')
        .in('status', ['collecte', 'production', 'distribution'])
        .order('created_at', { ascending: false });
      setProjects(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <header className="relative overflow-hidden border-b border-border bg-gradient-to-r from-emerald-600/10 via-amber-500/10 to-rose-500/10">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <Badge className="mb-3 bg-emerald-600/15 text-emerald-700 border-emerald-500/30">GIE · ONG Institut Moisson</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Le Grenier des Moissonneurs</h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl">
            Investissez ensemble dans des projets à fort impact — cinéma, agrobusiness, tech — portés par le GIE et l'ONG. Achetez des parts, suivez le projet, recevez vos dividendes.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun projet en cours. Revenez bientôt.</CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((p) => {
              const meta = CATEGORY_META[p.category] || CATEGORY_META.autre;
              const Icon = meta.icon;
              const progress = p.total_shares > 0 ? (p.shares_sold / p.total_shares) * 100 : 0;
              return (
                <Card key={p.id} className="overflow-hidden border-border/60 hover:border-primary/40 transition-all hover:shadow-xl group">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {p.cover_image && (
                      <img src={p.cover_image} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={`${meta.color} border backdrop-blur`}><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                      <Badge className="bg-background/80 text-foreground backdrop-blur border-border">{p.status}</Badge>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Badge className="bg-amber-500 text-white border-0 shadow-lg">
                        <TrendingUp className="w-3 h-3 mr-1" /> +{p.estimated_roi}% estimés
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.shares_sold} / {p.total_shares} parts</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Prix d'une part</div>
                        <div className="font-semibold">{formatFCFA(p.share_price)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <div className="text-xs text-muted-foreground">Objectif</div>
                        <div className="font-semibold">{formatFCFA(p.global_target)}</div>
                      </div>
                    </div>
                    {p.end_date && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        Clôture le {new Date(p.end_date).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/grenier/${p.id}`}>Soutenir ce projet</Link>
                    </Button>
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
