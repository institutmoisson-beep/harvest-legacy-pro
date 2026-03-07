import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Check, X, Star, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  identity_number: string;
  license_number: string;
  license_expiry: string | null;
  rating: number;
  total_rides: number;
  total_earnings: number;
  status: string;
  is_approved: boolean;
  notes: string | null;
  created_at: string;
}

interface VehicleForm {
  vehicle_type: string;
  service_class: string;
  brand: string;
  model: string;
  color: string;
  year: string;
  plate_number: string;
  insurance_number: string;
  insurance_expiry: string;
}

export default function AdminDriversManager() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [driverForm, setDriverForm] = useState({
    email: '', full_name: '', phone: '', identity_number: '', license_number: '',
    license_expiry: '', notes: ''
  });
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({
    vehicle_type: 'vehicule', service_class: 'standard', brand: '', model: '',
    color: '', year: '', plate_number: '', insurance_number: '', insurance_expiry: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('transport_drivers')
      .select('*').order('created_at', { ascending: false });
    if (!error) setDrivers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const addDriver = async () => {
    if (!driverForm.email || !driverForm.full_name || !driverForm.phone || !driverForm.identity_number || !driverForm.license_number) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    // Find user by email
    const { data: profiles } = await (supabase as any).from('profiles')
      .select('id').limit(1);
    // Search in auth via profile
    const { data: allProfiles } = await (supabase as any).rpc('get_all_users_admin');
    const userMatch = allProfiles?.find((u: any) => u.email?.toLowerCase() === driverForm.email.toLowerCase());
    
    if (!userMatch) {
      toast({ title: 'Utilisateur non trouvé', description: 'Aucun compte avec cet email', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const { error } = await (supabase as any).from('transport_drivers').insert({
      user_id: userMatch.id,
      full_name: driverForm.full_name,
      phone: driverForm.phone,
      identity_number: driverForm.identity_number,
      license_number: driverForm.license_number,
      license_expiry: driverForm.license_expiry || null,
      notes: driverForm.notes || null,
      is_approved: true,
      status: 'offline'
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Conducteur ajouté avec succès' });
      setShowAddDriver(false);
      setDriverForm({ email: '', full_name: '', phone: '', identity_number: '', license_number: '', license_expiry: '', notes: '' });
      fetchDrivers();
    }
    setSubmitting(false);
  };

  const addVehicle = async () => {
    if (!showAddVehicle || !vehicleForm.brand || !vehicleForm.model || !vehicleForm.plate_number) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from('transport_vehicles').insert({
      driver_id: showAddVehicle,
      vehicle_type: vehicleForm.vehicle_type,
      service_class: vehicleForm.service_class,
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      color: vehicleForm.color || null,
      year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
      plate_number: vehicleForm.plate_number,
      insurance_number: vehicleForm.insurance_number || null,
      insurance_expiry: vehicleForm.insurance_expiry || null,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Véhicule ajouté' });
      setShowAddVehicle(null);
      setVehicleForm({ vehicle_type: 'vehicule', service_class: 'standard', brand: '', model: '', color: '', year: '', plate_number: '', insurance_number: '', insurance_expiry: '' });
    }
    setSubmitting(false);
  };

  const toggleApproval = async (driverId: string, currentApproval: boolean) => {
    await (supabase as any).from('transport_drivers')
      .update({ is_approved: !currentApproval, approved_at: !currentApproval ? new Date().toISOString() : null })
      .eq('id', driverId);
    fetchDrivers();
    toast({ title: !currentApproval ? '✅ Conducteur approuvé' : '❌ Approbation retirée' });
  };

  const updateStatus = async (driverId: string, status: string) => {
    await (supabase as any).from('transport_drivers').update({ status }).eq('id', driverId);
    fetchDrivers();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'available': return 'bg-green-500/10 text-green-600';
      case 'busy': return 'bg-orange-500/10 text-orange-600';
      case 'suspended': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Conducteurs ({drivers.length})</h2>
        <Dialog open={showAddDriver} onOpenChange={setShowAddDriver}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau conducteur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Ajouter un conducteur</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Email du compte utilisateur *</Label><Input value={driverForm.email} onChange={e => setDriverForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" /></div>
              <div><Label>Nom complet *</Label><Input value={driverForm.full_name} onChange={e => setDriverForm(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>Téléphone *</Label><Input value={driverForm.phone} onChange={e => setDriverForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>N° Pièce d'identité *</Label><Input value={driverForm.identity_number} onChange={e => setDriverForm(p => ({ ...p, identity_number: e.target.value }))} /></div>
              <div><Label>N° Permis de conduire *</Label><Input value={driverForm.license_number} onChange={e => setDriverForm(p => ({ ...p, license_number: e.target.value }))} /></div>
              <div><Label>Expiration du permis</Label><Input type="date" value={driverForm.license_expiry} onChange={e => setDriverForm(p => ({ ...p, license_expiry: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={driverForm.notes} onChange={e => setDriverForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={addDriver} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : drivers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun conducteur enregistré</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Permis</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Approuvé</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.full_name}</TableCell>
                      <TableCell>{d.phone}</TableCell>
                      <TableCell className="text-xs">{d.license_number}</TableCell>
                      <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{d.rating}</div></TableCell>
                      <TableCell>{d.total_rides}</TableCell>
                      <TableCell>
                        <Select value={d.status} onValueChange={v => updateStatus(d.id, v)}>
                          <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Disponible</SelectItem>
                            <SelectItem value="busy">Occupé</SelectItem>
                            <SelectItem value="offline">Hors ligne</SelectItem>
                            <SelectItem value="suspended">Suspendu</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant={d.is_approved ? 'default' : 'outline'} onClick={() => toggleApproval(d.id, d.is_approved)} className="h-7">
                          {d.is_approved ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Dialog open={showAddVehicle === d.id} onOpenChange={o => setShowAddVehicle(o ? d.id : null)}>
                          <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs">+ Véhicule</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Ajouter véhicule — {d.full_name}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div><Label>Type *</Label>
                                  <Select value={vehicleForm.vehicle_type} onValueChange={v => setVehicleForm(p => ({ ...p, vehicle_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="moto">🏍️ Moto</SelectItem>
                                      <SelectItem value="vehicule">🚗 Véhicule</SelectItem>
                                      <SelectItem value="mini_remorque">🚛 Mini Remorque</SelectItem>
                                      <SelectItem value="remorque">🚚 Remorque</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div><Label>Classe</Label>
                                  <Select value={vehicleForm.service_class} onValueChange={v => setVehicleForm(p => ({ ...p, service_class: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="vip">VIP</SelectItem>
                                      <SelectItem value="vvip">VVIP</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div><Label>Marque *</Label><Input value={vehicleForm.brand} onChange={e => setVehicleForm(p => ({ ...p, brand: e.target.value }))} /></div>
                                <div><Label>Modèle *</Label><Input value={vehicleForm.model} onChange={e => setVehicleForm(p => ({ ...p, model: e.target.value }))} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div><Label>Couleur</Label><Input value={vehicleForm.color} onChange={e => setVehicleForm(p => ({ ...p, color: e.target.value }))} /></div>
                                <div><Label>Année</Label><Input type="number" value={vehicleForm.year} onChange={e => setVehicleForm(p => ({ ...p, year: e.target.value }))} /></div>
                              </div>
                              <div><Label>Immatriculation *</Label><Input value={vehicleForm.plate_number} onChange={e => setVehicleForm(p => ({ ...p, plate_number: e.target.value }))} /></div>
                              <div><Label>N° Assurance</Label><Input value={vehicleForm.insurance_number} onChange={e => setVehicleForm(p => ({ ...p, insurance_number: e.target.value }))} /></div>
                              <div><Label>Expiration assurance</Label><Input type="date" value={vehicleForm.insurance_expiry} onChange={e => setVehicleForm(p => ({ ...p, insurance_expiry: e.target.value }))} /></div>
                              <Button onClick={addVehicle} disabled={submitting} className="w-full">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Ajouter véhicule
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
