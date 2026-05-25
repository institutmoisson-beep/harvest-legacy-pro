import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, Store } from 'lucide-react';

interface Relay {
  id: string;
  name: string;
  type: string;
  host_type: string | null;
  address: string;
  city: string;
  country: string;
  phone: string | null;
  opening_hours: any;
}

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

const HOST_ICON: Record<string, string> = {
  shop: '🏪',
  maquis: '🍽️',
  partner: '🤝',
  moissonneur_box: '📦',
  other: '📍',
};

export default function RelayPointPicker({ value, onChange }: Props) {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('delivery_relay_points')
        .select('id,name,type,host_type,address,city,country,phone,opening_hours')
        .eq('is_active', true)
        .order('country').order('city').order('name');
      setRelays((data || []) as Relay[]);
      setLoading(false);
    })();
  }, []);

  const countries = useMemo(() => Array.from(new Set(relays.map(r => r.country).filter(Boolean))), [relays]);
  const cities = useMemo(
    () => Array.from(new Set(relays.filter(r => r.country === country).map(r => r.city).filter(Boolean))),
    [relays, country]
  );
  const filtered = useMemo(
    () => relays.filter(r => (!country || r.country === country) && (!city || r.city === city)),
    [relays, country, city]
  );

  const selected = relays.find(r => r.id === value);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des points relais…</div>;

  if (relays.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
        Aucun point relais disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Pays</Label>
          <Select value={country} onValueChange={(v) => { setCountry(v); setCity(''); onChange(null); }}>
            <SelectTrigger><SelectValue placeholder="Choisir un pays" /></SelectTrigger>
            <SelectContent>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ville</Label>
          <Select value={city} onValueChange={(v) => { setCity(v); onChange(null); }} disabled={!country}>
            <SelectTrigger><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
            <SelectContent>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Point relais</Label>
        <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border p-2">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {country ? 'Aucun relais dans cette zone.' : 'Sélectionnez d\'abord un pays.'}
            </div>
          )}
          {filtered.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r.id)}
              className={`w-full text-left rounded-md border p-3 transition hover:bg-accent ${value === r.id ? 'border-primary bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none mt-0.5">{HOST_ICON[r.host_type || r.type] || '📍'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{r.address}, {r.city}
                  </div>
                  {r.phone && <div className="text-xs text-muted-foreground">📞 {r.phone}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold"><Store className="w-4 h-4 text-primary" /> Retrait à : {selected.name}</div>
          <div className="text-muted-foreground mt-1">{selected.address}, {selected.city}, {selected.country}</div>
        </div>
      )}
    </div>
  );
}
