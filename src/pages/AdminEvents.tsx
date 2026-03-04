import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Ticket, Trash2, Eye, Users, QrCode } from 'lucide-react';

const emptyEvent = { title: '', description: '', image_url: '', location: '', event_date: '', event_end_date: '', category: 'general', status: 'draft', max_capacity: '' };
const emptyTicket = { name: '', tier: 'standard', price: '', quantity_available: '100', description: '', payment_link: '', benefits: '' };

export default function AdminEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [eventForm, setEventForm] = useState<any>({ ...emptyEvent });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTickets, setShowTickets] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<any>({ ...emptyTicket });
  const [showPurchases, setShowPurchases] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('events')
        .select('*, ticket_types(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['event-purchases', showPurchases],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ticket_purchases')
        .select('*, ticket_types(name, tier)')
        .eq('event_id', showPurchases)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!showPurchases,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...eventForm,
        max_capacity: eventForm.max_capacity ? Number(eventForm.max_capacity) : null,
        created_by: user?.id,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('events').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('events').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setShowForm(false);
      setEditingId(null);
      setEventForm({ ...emptyEvent });
      toast({ title: editingId ? "Événement mis à jour" : "Événement créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const addTicketMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('ticket_types').insert({
        event_id: showTickets,
        name: ticketForm.name || ticketForm.tier,
        tier: ticketForm.tier,
        price: Number(ticketForm.price) || 0,
        quantity_available: Number(ticketForm.quantity_available) || 100,
        description: ticketForm.description || null,
        payment_link: ticketForm.payment_link || null,
        benefits: ticketForm.benefits ? ticketForm.benefits.split(',').map((b: string) => b.trim()) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      setTicketForm({ ...emptyTicket });
      toast({ title: "Type de billet ajouté" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('ticket_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      toast({ title: "Billet supprimé" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const { error } = await (supabase as any).from('ticket_purchases')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('id', purchaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-purchases'] });
      toast({ title: "Check-in confirmé ✓" });
    },
  });

  const statusColor: Record<string, string> = { draft: 'bg-muted', published: 'bg-green-500/15 text-green-600', cancelled: 'bg-destructive/15 text-destructive', completed: 'bg-blue-500/15 text-blue-600' };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">🎫 Gestion Événements</h1>
        <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setEventForm({ ...emptyEvent }); }}>
          <Plus className="h-4 w-4 mr-1" /> Créer
        </Button>
      </div>

      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}

        {events?.map((ev: any) => {
          const totalSold = ev.ticket_types?.reduce((s: number, t: any) => s + (t.quantity_sold || 0), 0) || 0;
          const totalRevenue = ev.ticket_types?.reduce((s: number, t: any) => s + (t.quantity_sold || 0) * t.price, 0) || 0;
          return (
            <Card key={ev.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold">{ev.title}</h3>
                    <p className="text-xs text-muted-foreground">{ev.location} · {new Date(ev.event_date).toLocaleDateString('fr')}</p>
                  </div>
                  <Badge className={statusColor[ev.status] || ''}>{ev.status}</Badge>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                  <span>{ev.ticket_types?.length || 0} types</span>
                  <span>·</span>
                  <span>{totalSold} vendus</span>
                  <span>·</span>
                  <span>{totalRevenue.toLocaleString()} FCFA</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(ev.id); setEventForm(ev); setShowForm(true); }}>Modifier</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowTickets(ev.id)}>
                    <Ticket className="h-3 w-3 mr-1" /> Billets
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPurchases(ev.id)}>
                    <Users className="h-3 w-3 mr-1" /> Achats
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/events/${ev.id}`)}>
                    <Eye className="h-3 w-3 mr-1" /> Voir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Event Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Modifier' : 'Créer'} un événement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Lieu</Label><Input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Date début *</Label><Input type="datetime-local" value={eventForm.event_date?.slice(0, 16) || ''} onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })} /></div>
              <div><Label>Date fin</Label><Input type="datetime-local" value={eventForm.event_end_date?.slice(0, 16) || ''} onChange={e => setEventForm({ ...eventForm, event_end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Capacité max</Label><Input type="number" value={eventForm.max_capacity} onChange={e => setEventForm({ ...eventForm, max_capacity: e.target.value })} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={eventForm.status} onValueChange={v => setEventForm({ ...eventForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !eventForm.title || !eventForm.event_date}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Types Dialog */}
      <Dialog open={!!showTickets} onOpenChange={() => setShowTickets(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Types de billets</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {events?.find((e: any) => e.id === showTickets)?.ticket_types?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-bold text-sm">{t.name} ({t.tier?.toUpperCase()})</p>
                  <p className="text-xs text-muted-foreground">{t.price.toLocaleString()} FCFA · {t.quantity_sold || 0}/{t.quantity_available}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteTicketMutation.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-bold text-sm">Ajouter un type</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nom</Label><Input value={ticketForm.name} onChange={e => setTicketForm({ ...ticketForm, name: e.target.value })} placeholder="Ex: Early Bird" /></div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={ticketForm.tier} onValueChange={v => setTicketForm({ ...ticketForm, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="vvip">VVIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prix (FCFA)</Label><Input type="number" value={ticketForm.price} onChange={e => setTicketForm({ ...ticketForm, price: e.target.value })} /></div>
                <div><Label>Quantité</Label><Input type="number" value={ticketForm.quantity_available} onChange={e => setTicketForm({ ...ticketForm, quantity_available: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Input value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} /></div>
              <div><Label>Avantages (séparés par virgule)</Label><Input value={ticketForm.benefits} onChange={e => setTicketForm({ ...ticketForm, benefits: e.target.value })} placeholder="Accès backstage, Boissons incluses" /></div>
              <div><Label>Lien de paiement (optionnel)</Label><Input value={ticketForm.payment_link} onChange={e => setTicketForm({ ...ticketForm, payment_link: e.target.value })} placeholder="https://pay.example.com/..." /></div>
              <Button className="w-full" onClick={() => addTicketMutation.mutate()} disabled={addTicketMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchases Dialog */}
      <Dialog open={!!showPurchases} onOpenChange={() => setShowPurchases(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Achats ({purchases?.length || 0})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {purchases?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-bold text-sm">{p.buyer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.ticket_types?.tier?.toUpperCase()} · {p.quantity}x · {p.total_amount.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs font-mono text-primary">{p.ticket_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.checked_in ? (
                    <Badge className="bg-green-500/15 text-green-600">✓</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => checkinMutation.mutate(p.id)}>
                      <QrCode className="h-3 w-3 mr-1" /> Check-in
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {purchases?.length === 0 && <p className="text-center text-muted-foreground py-4">Aucun achat</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
