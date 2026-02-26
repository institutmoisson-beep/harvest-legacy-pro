import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw } from 'lucide-react';

interface Settings {
  id: string;
  routing_method: string;
  max_queue_size: number;
  max_wait_seconds: number;
  auto_abandon_seconds: number;
  inactive_agent_timeout_seconds: number;
  vip_priority_boost: number;
}

export default function CallCenterSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase.from('call_center_settings').select('*').limit(1).single();
    if (data) setSettings(data);
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('call_center_settings').update({
        routing_method: settings.routing_method,
        max_queue_size: settings.max_queue_size,
        max_wait_seconds: settings.max_wait_seconds,
        auto_abandon_seconds: settings.auto_abandon_seconds,
        inactive_agent_timeout_seconds: settings.inactive_agent_timeout_seconds,
        vip_priority_boost: settings.vip_priority_boost,
      }).eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Configuration sauvegardée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const detectInactive = async () => {
    try {
      const { error } = await supabase.rpc('detect_inactive_agents');
      if (error) throw error;
      toast({ title: 'Détection effectuée', description: 'Les agents inactifs ont été passés hors ligne' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  if (!settings) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>⚙️ Configuration du Centre d'Appel</CardTitle>
        <CardDescription>Paramètres de routage, file d'attente et gestion des agents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Méthode de routage</Label>
            <Select
              value={settings.routing_method}
              onValueChange={v => setSettings({ ...settings, routing_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">🔄 Round Robin (tour par tour)</SelectItem>
                <SelectItem value="least_busy">📊 Least Busy (moins chargé)</SelectItem>
                <SelectItem value="priority">⭐ Priorité (grade + VIP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Taille max. file d'attente</Label>
            <Input
              type="number"
              value={settings.max_queue_size}
              onChange={e => setSettings({ ...settings, max_queue_size: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Attente max. (secondes)</Label>
            <Input
              type="number"
              value={settings.max_wait_seconds}
              onChange={e => setSettings({ ...settings, max_wait_seconds: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Auto-abandon (secondes)</Label>
            <Input
              type="number"
              value={settings.auto_abandon_seconds}
              onChange={e => setSettings({ ...settings, auto_abandon_seconds: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Timeout agent inactif (secondes)</Label>
            <Input
              type="number"
              value={settings.inactive_agent_timeout_seconds}
              onChange={e => setSettings({ ...settings, inactive_agent_timeout_seconds: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Boost priorité VIP</Label>
            <Input
              type="number"
              value={settings.vip_priority_boost}
              onChange={e => setSettings({ ...settings, vip_priority_boost: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Sauvegarder
          </Button>
          <Button variant="outline" onClick={detectInactive}>
            <RefreshCw className="h-4 w-4 mr-2" /> Détecter agents inactifs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
