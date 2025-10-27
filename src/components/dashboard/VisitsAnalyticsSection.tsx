import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export default function VisitsAnalyticsSection() {
  const [liveCount, setLiveCount] = useState(0);
  const [dayCount, setDayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [yearCount, setYearCount] = useState(0);

  const fetchCounts = async () => {
    const sb: any = supabase;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const dayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const yearStart = startOfYear(now).toISOString();

    const [{ count: live }, { count: day }, { count: week }, { count: month }, { count: year }] = await Promise.all([
      sb.from('visits' as any).select('*', { count: 'exact', head: true }).gte('created_at', fiveMinutesAgo),
      sb.from('visits' as any).select('*', { count: 'exact', head: true }).gte('created_at', dayStart),
      sb.from('visits' as any).select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      sb.from('visits' as any).select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      sb.from('visits' as any).select('*', { count: 'exact', head: true }).gte('created_at', yearStart),
    ]);

    setLiveCount(live || 0);
    setDayCount(day || 0);
    setWeekCount(week || 0);
    setMonthCount(month || 0);
    setYearCount(year || 0);
  };

  useEffect(() => {
    fetchCounts();

    const channel = supabase
      .channel('visits-analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visits' }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Analytique des visites</CardTitle>
        <CardDescription>Live, jour, semaine, mois, année</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="text-sm text-muted-foreground">Live (5 min)</div>
            <div className="text-2xl font-bold">{liveCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-accent/10">
            <div className="text-sm text-muted-foreground">Aujourd'hui</div>
            <div className="text-2xl font-bold">{dayCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-secondary/10">
            <div className="text-sm text-muted-foreground">Semaine</div>
            <div className="text-2xl font-bold">{weekCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="text-sm text-muted-foreground">Mois</div>
            <div className="text-2xl font-bold">{monthCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-accent/10">
            <div className="text-sm text-muted-foreground">Année</div>
            <div className="text-2xl font-bold">{yearCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
