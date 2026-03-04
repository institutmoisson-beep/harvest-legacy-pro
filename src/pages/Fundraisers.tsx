import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Search, Heart, Users, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Terminé'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${h}h ${m}m ${s}s`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1.5 text-sm font-mono">
      <Clock className="h-4 w-4 text-amber-500" />
      <span className={timeLeft === 'Terminé' ? 'text-destructive' : 'text-amber-600 font-bold'}>{timeLeft}</span>
    </div>
  );
}

export default function Fundraisers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: fundraisers, isLoading } = useQuery({
    queryKey: ['public-fundraisers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fundraisers')
        .select('*')
        .eq('is_public', true)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = fundraisers?.filter((f: any) =>
    f.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">💝 Cagnottes</h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}
        {filtered?.length === 0 && !isLoading && <p className="text-center text-muted-foreground py-8">Aucune cagnotte disponible</p>}

        {filtered?.map((f: any) => {
          const pct = f.goal_amount > 0 ? Math.min(100, (f.current_amount / f.goal_amount) * 100) : 0;
          return (
            <Card key={f.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/fundraisers/${f.id}`)}>
              {f.image_url && (
                <div className="h-40 bg-muted">
                  <img src={f.image_url} alt={f.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-lg">{f.title}</h3>
                {f.description && <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>}

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-primary">{f.current_amount?.toLocaleString()} {f.currency}</span>
                    <span className="text-muted-foreground">sur {f.goal_amount?.toLocaleString()} {f.currency}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(pct)}% atteint</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {f.contributors_count || 0} contributeurs</span>
                  </div>
                  <CountdownTimer endDate={f.end_date} />
                </div>

                <Button className="w-full" size="sm">
                  <Heart className="h-4 w-4 mr-1" /> Participer
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
