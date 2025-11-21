import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, MapPin } from 'lucide-react';

interface RelayPoint {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

export default function AdminDeliveryRelaysManager() {
  const [relays, setRelays] = useState<RelayPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRelay, setNewRelay] = useState({
    name: '',
    type: 'shop',
    address: '',
    city: '',
    country: '',
    phone: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchRelays();
  }, []);

  const fetchRelays = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_relay_points')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRelays(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddRelay = async () => {
    if (!newRelay.name || !newRelay.address || !newRelay.city) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('delivery_relay_points').insert({
        name: newRelay.name,
        type: newRelay.type,
        address: newRelay.address,
        city: newRelay.city,
        country: newRelay.country || 'Côte d\'Ivoire',
        phone: newRelay.phone,
        latitude: newRelay.latitude ? parseFloat(newRelay.latitude) : null,
        longitude: newRelay.longitude ? parseFloat(newRelay.longitude) : null,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Point relais ajouté avec succès',
      });

      setNewRelay({
        name: '',
        type: 'shop',
        address: '',
        city: '',
        country: '',
        phone: '',
        latitude: '',
        longitude: '',
      });

      fetchRelays();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRelay = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce point relais ?')) return;

    try {
      const { error } = await supabase
        .from('delivery_relay_points')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Point relais supprimé',
      });

      fetchRelays();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_relay_points')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Statut mis à jour',
      });

      fetchRelays();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Ajouter un Point Relais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom du point relais *</Label>
              <Input
                value={newRelay.name}
                onChange={(e) => setNewRelay({ ...newRelay, name: e.target.value })}
                placeholder="Ex: Boutique Cocody"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={newRelay.type} onValueChange={(value) => setNewRelay({ ...newRelay, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Boutique</SelectItem>
                  <SelectItem value="moissonneur_box">Box Moissonneur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Adresse *</Label>
              <Input
                value={newRelay.address}
                onChange={(e) => setNewRelay({ ...newRelay, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>

            <div>
              <Label>Ville *</Label>
              <Input
                value={newRelay.city}
                onChange={(e) => setNewRelay({ ...newRelay, city: e.target.value })}
                placeholder="Abidjan"
              />
            </div>

            <div>
              <Label>Pays</Label>
              <Input
                value={newRelay.country}
                onChange={(e) => setNewRelay({ ...newRelay, country: e.target.value })}
                placeholder="Côte d'Ivoire"
              />
            </div>

            <div>
              <Label>Téléphone</Label>
              <Input
                value={newRelay.phone}
                onChange={(e) => setNewRelay({ ...newRelay, phone: e.target.value })}
                placeholder="+225..."
              />
            </div>

            <div>
              <Label>Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={newRelay.latitude}
                onChange={(e) => setNewRelay({ ...newRelay, latitude: e.target.value })}
                placeholder="5.345317"
              />
            </div>

            <div>
              <Label>Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={newRelay.longitude}
                onChange={(e) => setNewRelay({ ...newRelay, longitude: e.target.value })}
                placeholder="-4.024429"
              />
            </div>
          </div>

          <Button onClick={handleAddRelay} disabled={loading} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter le Point Relais
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points Relais Actifs ({relays.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relays.map((relay) => (
                  <TableRow key={relay.id}>
                    <TableCell className="font-medium">{relay.name}</TableCell>
                    <TableCell>
                      {relay.type === 'shop' && '🏪 Boutique'}
                      {relay.type === 'moissonneur_box' && '📦 Box Moissonneur'}
                      {relay.type === 'partner' && '🤝 Partenaire'}
                    </TableCell>
                    <TableCell>{relay.address}</TableCell>
                    <TableCell>{relay.city}</TableCell>
                    <TableCell>{relay.phone}</TableCell>
                    <TableCell>
                      <Button
                        variant={relay.is_active ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleStatus(relay.id, relay.is_active)}
                      >
                        {relay.is_active ? 'Actif' : 'Inactif'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRelay(relay.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
