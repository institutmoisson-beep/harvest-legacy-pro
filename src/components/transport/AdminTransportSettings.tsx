import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Key } from 'lucide-react';

export default function AdminTransportSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('transport_settings').select('*').order('setting_key');
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSetting = async (id: string, value: string) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, setting_value: value } : s));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const s of settings) {
      await (supabase as any).from('transport_settings')
        .update({ setting_value: s.setting_value, updated_at: new Date().toISOString() })
        .eq('id', s.id);
    }
    toast({ title: '✅ Paramètres sauvegardés' });
    setSaving(false);
  };

  const addSetting = async (key: string, value: string, desc: string) => {
    await (supabase as any).from('transport_settings').upsert(
      { setting_key: key, setting_value: value, description: desc },
      { onConflict: 'setting_key' }
    );
    fetchSettings();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Clés API & Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {settings.map(s => (
            <div key={s.id}>
              <Label className="text-sm font-medium">{s.setting_key}</Label>
              {s.description && <p className="text-xs text-muted-foreground mb-1">{s.description}</p>}
              <Input value={s.setting_value} onChange={e => updateSetting(s.id, e.target.value)} />
            </div>
          ))}
          <Button onClick={saveAll} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder tous les paramètres
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ajouter un paramètre</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addSetting(fd.get('key') as string, fd.get('value') as string, fd.get('desc') as string);
            (e.target as HTMLFormElement).reset();
          }} className="space-y-3">
            <div><Label>Clé</Label><Input name="key" required placeholder="ex: google_maps_api_key" /></div>
            <div><Label>Valeur</Label><Input name="value" required /></div>
            <div><Label>Description</Label><Input name="desc" placeholder="Description optionnelle" /></div>
            <Button type="submit">Ajouter</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
