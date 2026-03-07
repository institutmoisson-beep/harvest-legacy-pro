import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MapPin, Clock, DollarSign, Car } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-600' },
  accepted: { label: 'Acceptée', color: 'bg-blue-500/10 text-blue-600' },
  driver_arriving: { label: 'Chauffeur en route', color: 'bg-indigo-500/10 text-indigo-600' },
  in_progress: { label: 'En cours', color: 'bg-green-500/10 text-green-600' },
  completed: { label: 'Terminée', color: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Annulée', color: 'bg-red-500/10 text-red-600' },
};

export default function AdminRidesMonitor() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });

  const fetchRides = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('transport_rides')
      .select('*').order('created_at', { ascending: false }).limit(100);
    const r = data || [];
    setRides(r);
    setStats({
      total: r.length,
      active: r.filter((x: any) => ['pending', 'accepted', 'driver_arriving', 'in_progress'].includes(x.status)).length,
      completed: r.filter((x: any) => x.status === 'completed').length,
      revenue: r.filter((x: any) => x.status === 'completed').reduce((s: number, x: any) => s + (x.final_fare || 0), 0)
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchRides();
    const channel = (supabase as any).channel('admin-rides').on(
      'postgres_changes', { event: '*', schema: 'public', table: 'transport_rides' }, () => fetchRides()
    ).subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><Car className="h-6 w-6 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total courses</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><MapPin className="h-6 w-6 mx-auto mb-1 text-green-500" /><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">En cours</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" /><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Terminées</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><DollarSign className="h-6 w-6 mx-auto mb-1 text-yellow-500" /><p className="text-2xl font-bold">{stats.revenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Revenus FCFA</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Toutes les courses</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map(r => {
                  const st = statusLabels[r.status] || { label: r.status, color: '' };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), 'dd/MM HH:mm', { locale: fr })}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{r.pickup_address}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{r.dropoff_address}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.vehicle_type} · {r.service_class}</Badge></TableCell>
                      <TableCell className="text-xs">{r.distance_km ? `${r.distance_km} km` : '—'}</TableCell>
                      <TableCell className="font-medium">{(r.final_fare || r.estimated_fare || 0).toLocaleString()} F</TableCell>
                      <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
