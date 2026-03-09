import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Plus, Loader2, Trash2, Edit, ShoppingCart, Calendar, Star } from 'lucide-react';

export default function AdminEnterprises() {
  const { user } = useAuth();
  const { hasAccessLevel, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<any>(null);
  const [selectedEnterprise, setSelectedEnterprise] = useState<any>(null);

  const [form, setForm] = useState({
    name: '', slug: '', short_description: '', description: '', category: 'general',
    logo_url: '', banner_url: '', video_url: '', phone: '', email: '', website: '',
    address: '', city: '', country: 'Cameroun', branding_color: '#2563eb',
    is_active: true, is_featured: false,
  });

  const [productForm, setProductForm] = useState({
    name: '', description: '', price: 0, image_url: '', category: 'general', is_service: false, stock: null as number | null,
  });

  useEffect(() => {
    if (!rolesLoading && !hasAccessLevel(80)) { navigate('/dashboard'); return; }
    if (!rolesLoading) fetchAll();
  }, [rolesLoading]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ents }, { data: ords }, { data: appts }] = await Promise.all([
      (supabase as any).from('enterprises').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('enterprise_orders').select('*').order('created_at', { ascending: false }).limit(50),
      (supabase as any).from('enterprise_appointments').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setEnterprises(ents || []);
    setOrders(ords || []);
    setAppointments(appts || []);
    setLoading(false);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const saveEnterprise = async () => {
    try {
      const data = { ...form, slug: form.slug || generateSlug(form.name), created_by: user?.id };
      if (editingEnterprise) {
        await (supabase as any).from('enterprises').update(data).eq('id', editingEnterprise.id);
        toast({ title: 'Entreprise mise à jour' });
      } else {
        await (supabase as any).from('enterprises').insert(data);
        toast({ title: 'Entreprise créée' });
      }
      setDialogOpen(false);
      setEditingEnterprise(null);
      setForm({ name: '', slug: '', short_description: '', description: '', category: 'general', logo_url: '', banner_url: '', video_url: '', phone: '', email: '', website: '', address: '', city: '', country: 'Cameroun', branding_color: '#2563eb', is_active: true, is_featured: false });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const deleteEnterprise = async (id: string) => {
    if (!confirm('Supprimer cette entreprise?')) return;
    await (supabase as any).from('enterprises').delete().eq('id', id);
    toast({ title: 'Entreprise supprimée' });
    fetchAll();
  };

  const editEnterprise = (ent: any) => {
    setEditingEnterprise(ent);
    setForm({
      name: ent.name, slug: ent.slug, short_description: ent.short_description || '', description: ent.description || '',
      category: ent.category || 'general', logo_url: ent.logo_url || '', banner_url: ent.banner_url || '',
      video_url: ent.video_url || '', phone: ent.phone || '', email: ent.email || '', website: ent.website || '',
      address: ent.address || '', city: ent.city || '', country: ent.country || 'Cameroun',
      branding_color: ent.branding_color || '#2563eb', is_active: ent.is_active, is_featured: ent.is_featured,
    });
    setDialogOpen(true);
  };

  const saveProduct = async () => {
    if (!selectedEnterprise) return;
    try {
      await (supabase as any).from('enterprise_products').insert({
        enterprise_id: selectedEnterprise.id,
        ...productForm,
      });
      toast({ title: 'Produit ajouté' });
      setProductDialogOpen(false);
      setProductForm({ name: '', description: '', price: 0, image_url: '', category: 'general', is_service: false, stock: null });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  if (rolesLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin')}><ArrowLeft className="h-4 w-4 mr-2" /> Admin</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Gestion Entreprises</h1>
        </div>

        <Tabs defaultValue="enterprises">
          <TabsList className="mb-4">
            <TabsTrigger value="enterprises">Entreprises ({enterprises.length})</TabsTrigger>
            <TabsTrigger value="orders">Commandes ({orders.length})</TabsTrigger>
            <TabsTrigger value="appointments">RDV ({appointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="enterprises">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingEnterprise(null); setForm({ name: '', slug: '', short_description: '', description: '', category: 'general', logo_url: '', banner_url: '', video_url: '', phone: '', email: '', website: '', address: '', city: '', country: 'Cameroun', branding_color: '#2563eb', is_active: true, is_featured: false }); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nouvelle entreprise
              </Button>
            </div>

            <div className="grid gap-4">
              {enterprises.map((ent) => (
                <Card key={ent.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {ent.logo_url ? (
                        <img src={ent.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
                      )}
                      <div>
                        <h3 className="font-semibold">{ent.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{ent.city}</span>
                          <Badge variant={ent.is_active ? 'default' : 'secondary'}>{ent.is_active ? 'Actif' : 'Inactif'}</Badge>
                          {ent.is_featured && <Badge className="bg-yellow-500 text-white">Premium</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedEnterprise(ent); setProductDialogOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Produit</Button>
                      <Button size="sm" variant="outline" onClick={() => editEnterprise(ent)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteEnterprise(ent.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead>Méthode</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="font-semibold">{Number(o.total_amount).toLocaleString()} FCFA</TableCell>
                    <TableCell><Badge variant={o.status === 'confirmed' ? 'default' : 'secondary'}>{o.status}</Badge></TableCell>
                    <TableCell>{o.payment_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="appointments">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Date RDV</TableHead><TableHead>Statut</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {appointments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-semibold">{a.appointment_code}</TableCell>
                    <TableCell>{new Date(a.appointment_date).toLocaleString('fr-FR')}</TableCell>
                    <TableCell><Badge>{a.status}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{a.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {/* Enterprise Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingEnterprise ? 'Modifier' : 'Nouvelle'} Entreprise</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description courte</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
              <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Couleur</Label><Input type="color" value={form.branding_color} onChange={(e) => setForm({ ...form, branding_color: e.target.value })} /></div>
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              <div><Label>Bannière URL</Label><Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} /></div>
              <div className="col-span-2"><Label>Vidéo URL</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Site web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Actif</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Premium</Label></div>
            </div>
            <Button onClick={saveEnterprise} className="w-full mt-4">{editingEnterprise ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un produit - {selectedEnterprise?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom *</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
              <div><Label>Prix (FCFA)</Label><Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} /></div>
              <div><Label>Image URL</Label><Input value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} /></div>
              <div className="flex items-center gap-3"><Switch checked={productForm.is_service} onCheckedChange={(v) => setProductForm({ ...productForm, is_service: v })} /><Label>C'est un service</Label></div>
              <Button onClick={saveProduct} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
