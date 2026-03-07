import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface Pricing {
  id: string;
  vehicle_type: string;
  service_class: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  min_fare: number;
  night_multiplier: number;
  night_start_hour: number;
  night_end_hour: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  strike_multiplier: number;
  peak_hour_multiplier: number;
  peak_start_hour: number;
  peak_end_hour: number;
  peak_evening_start: number;
  peak_evening_end: number;
  is_strike_active: boolean;
  is_active: boolean;
}

const vehicleLabels: Record<string, string> = { moto: '🏍️ Moto', vehicule: '🚗 Véhicule', mini_remorque: '🚛 Mini Remorque', remorque: '🚚 Remorque' };
const classLabels: Record<string, string> = { standard: 'Standard', vip: 'VIP', vvip: 'VVIP' };

export default function AdminPricingManager() {
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPricing = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('transport_pricing').select('*').order('vehicle_type').order('service_class');
    setPricing(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPricing(); }, []);

  const updatePricing = async (id: string, updates: Partial<Pricing>) => {
    setSaving(id);
    const { error } = await (supabase as any).from('transport_pricing').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Tarif mis à jour' }); fetchPricing(); }
    setSaving(null);
  };

  const updateField = (id: string, field: string, value: any) => {
    setPricing(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tarification dynamique</h2>
      </div>

      <div className="grid gap-4">
        {pricing.map(p => (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {vehicleLabels[p.vehicle_type] || p.vehicle_type}
                <Badge variant="outline">{classLabels[p.service_class] || p.service_class}</Badge>
                {p.is_strike_active && <Badge variant="destructive">GRÈVE ACTIVE</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Tarif de base (FCFA)</Label><Input type="number" value={p.base_fare} onChange={e => updateField(p.id, 'base_fare', +e.target.value)} /></div>
                <div><Label className="text-xs">Prix/km (FCFA)</Label><Input type="number" value={p.price_per_km} onChange={e => updateField(p.id, 'price_per_km', +e.target.value)} /></div>
                <div><Label className="text-xs">Prix/min (FCFA)</Label><Input type="number" value={p.price_per_minute} onChange={e => updateField(p.id, 'price_per_minute', +e.target.value)} /></div>
                <div><Label className="text-xs">Tarif minimum (FCFA)</Label><Input type="number" value={p.min_fare} onChange={e => updateField(p.id, 'min_fare', +e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Mult. nuit (×)</Label><Input type="number" step="0.1" value={p.night_multiplier} onChange={e => updateField(p.id, 'night_multiplier', +e.target.value)} /></div>
                <div><Label className="text-xs">Mult. weekend (×)</Label><Input type="number" step="0.1" value={p.weekend_multiplier} onChange={e => updateField(p.id, 'weekend_multiplier', +e.target.value)} /></div>
                <div><Label className="text-xs">Mult. grève (×)</Label><Input type="number" step="0.1" value={p.strike_multiplier} onChange={e => updateField(p.id, 'strike_multiplier', +e.target.value)} /></div>
                <div><Label className="text-xs">Mult. heure pointe (×)</Label><Input type="number" step="0.1" value={p.peak_hour_multiplier} onChange={e => updateField(p.id, 'peak_hour_multiplier', +e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Nuit début (h)</Label><Input type="number" value={p.night_start_hour} onChange={e => updateField(p.id, 'night_start_hour', +e.target.value)} /></div>
                <div><Label className="text-xs">Nuit fin (h)</Label><Input type="number" value={p.night_end_hour} onChange={e => updateField(p.id, 'night_end_hour', +e.target.value)} /></div>
                <div><Label className="text-xs">Pointe matin (début)</Label><Input type="number" value={p.peak_start_hour} onChange={e => updateField(p.id, 'peak_start_hour', +e.target.value)} /></div>
                <div><Label className="text-xs">Pointe matin (fin)</Label><Input type="number" value={p.peak_end_hour} onChange={e => updateField(p.id, 'peak_end_hour', +e.target.value)} /></div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={p.is_strike_active} onCheckedChange={v => updateField(p.id, 'is_strike_active', v)} />
                  <Label className="text-xs">Grève active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={p.is_active} onCheckedChange={v => updateField(p.id, 'is_active', v)} />
                  <Label className="text-xs">Tarif actif</Label>
                </div>
                <Button size="sm" onClick={() => updatePricing(p.id, {
                  base_fare: p.base_fare, price_per_km: p.price_per_km, price_per_minute: p.price_per_minute,
                  min_fare: p.min_fare, night_multiplier: p.night_multiplier, night_start_hour: p.night_start_hour,
                  night_end_hour: p.night_end_hour, weekend_multiplier: p.weekend_multiplier,
                  holiday_multiplier: p.holiday_multiplier, strike_multiplier: p.strike_multiplier,
                  peak_hour_multiplier: p.peak_hour_multiplier, peak_start_hour: p.peak_start_hour,
                  peak_end_hour: p.peak_end_hour, peak_evening_start: p.peak_evening_start,
                  peak_evening_end: p.peak_evening_end, is_strike_active: p.is_strike_active, is_active: p.is_active
                })} disabled={saving === p.id}>
                  {saving === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
