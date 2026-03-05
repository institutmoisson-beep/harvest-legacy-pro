import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Ticket, ArrowLeft, Search, Clock, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const EVENT_CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'concert', label: '🎵 Concert' },
  { value: 'football', label: '⚽ Football' },
  { value: 'gala', label: '✨ Gala' },
  { value: 'festival', label: '🎉 Festival' },
  { value: 'conference', label: '🎤 Conférence' },
  { value: 'sport', label: '🏆 Sport' },
  { value: 'theatre', label: '🎭 Théâtre' },
  { value: 'cinema', label: '🎬 Cinéma' },
  { value: 'general', label: '📅 Général' },
];

function EventCountdown({ date }: { date: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(date).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('En cours / Passé'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}j ${h}h`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [date]);

  const isPast = new Date(date).getTime() <= Date.now();

  return (
    <span className={`flex items-center gap-1 text-xs font-mono font-bold ${isPast ? 'text-muted-foreground' : 'text-amber-600'}`}>
      <Clock className="h-3 w-3" /> {timeLeft}
    </span>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: events, isLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('events')
        .select('*, ticket_types(*)')
        .eq('status', 'published')
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = events?.filter((e: any) => {
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || e.category === category;
    return matchSearch && matchCategory;
  });

  const tierColor: Record<string, string> = {
    standard: 'bg-muted text-muted-foreground',
    vip: 'bg-amber-500/15 text-amber-600',
    vvip: 'bg-purple-500/15 text-purple-600',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">🎫 Événements</h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un événement..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {EVENT_CATEGORIES.map(c => (
            <Button
              key={c.value}
              size="sm"
              variant={category === c.value ? 'default' : 'outline'}
              className="shrink-0 text-xs"
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}
        {filtered?.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-8">Aucun événement disponible</p>
        )}

        {filtered?.map((event: any) => {
          const minPrice = event.ticket_types?.length
            ? Math.min(...event.ticket_types.map((t: any) => t.price))
            : 0;
          return (
            <Card key={event.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/events/${event.id}`)}>
              {event.image_url && (
                <div className="h-40 bg-muted">
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-lg flex-1">{event.title}</h3>
                  <EventCountdown date={event.event_date} />
                </div>
                {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(event.event_date), 'dd MMM yyyy · HH:mm', { locale: fr })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {event.ticket_types?.map((t: any) => (
                      <Badge key={t.id} variant="secondary" className={tierColor[t.tier] || ''}>
                        {t.tier?.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                  <span className="font-bold text-primary">
                    {minPrice > 0 ? `À partir de ${minPrice.toLocaleString()} FCFA` : 'Gratuit'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
