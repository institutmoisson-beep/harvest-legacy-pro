import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Building, MapPin, Check, X, Eye, Loader2 } from 'lucide-react';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartement' }, { value: 'studio', label: 'Studio' },
  { value: 'room', label: 'Chambre' }, { value: 'hotel', label: 'Hôtel' },
  { value: 'villa', label: 'Villa' }, { value: 'house', label: 'Maison' }, { value: 'residence', label: 'Résidence' },
];

export default function ImmoHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('listings');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewListing, setShowNewListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: '', description: '', property_type: 'apartment', address: '', city: '', country: 'Mali',
    price_per_night: '', max_guests: 2, bedrooms: 1, bathrooms: 1, amenities: [] as string[],
    check_in_time: '14:00', check_out_time: '11:00', rules: '', cancellation_policy: 'flexible',
  });
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responsePrice, setResponsePrice] = useState('');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => { if (!user) navigate('/auth'); }, [user]);
  useEffect(() => { fetchData(); }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [listingsRes, bookingsRes] = await Promise.all([
      (supabase as any).from('immo_listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false }),
      (supabase as any).from('immo_bookings').select('*, immo_listings(title)').eq('host_id', user.id).order('created_at', { ascending: false }),
    ]);
    setMyListings(listingsRes.data || []);
    setMyBookings(bookingsRes.data || []);

    // Fetch incoming offers matching my listings cities
    const cities = (listingsRes.data || []).map((l: any) => l.city);
    if (cities.length > 0) {
      const { data: offers } = await (supabase as any).from('immo_offers')
        .select('*, profiles:client_id(full_name, referral_code)')
        .eq('status', 'pending')
        .in('city', cities)
        .order('created_at', { ascending: false });
      setIncomingOffers(offers || []);
    }
    setLoading(false);
  }, [user]);

  const createListing = async () => {
    if (!user) return;
    if (!listingForm.title || !listingForm.address || !listingForm.city || !listingForm.price_per_night) {
      toast({ title: 'Erreur', description: 'Remplissez les champs obligatoires', variant: 'destructive' }); return;
    }
    const { error } = await (supabase as any).from('immo_listings').insert({
      host_id: user.id, ...listingForm, price_per_night: parseFloat(listingForm.price_per_night),
    });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Annonce créée!' });
    setShowNewListing(false);
    setListingForm({ title: '', description: '', property_type: 'apartment', address: '', city: '', country: 'Mali', price_per_night: '', max_guests: 2, bedrooms: 1, bathrooms: 1, amenities: [], check_in_time: '14:00', check_out_time: '11:00', rules: '', cancellation_policy: 'flexible' });
    fetchData();
  };

  const respondToOffer = async (offerId: string, listingId: string) => {
    if (!user || !responsePrice) return;
    const { error } = await (supabase as any).from('immo_offer_responses').insert({
      offer_id: offerId, listing_id: listingId, host_id: user.id,
      proposed_price: parseFloat(responsePrice), message: responseMessage,
    });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Réponse envoyée!' });
    setRespondingTo(null); setResponsePrice(''); setResponseMessage('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/immo')}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-2xl font-bold">🏠 MSN Immo - Hôte</h1><p className="text-sm text-muted-foreground">Gérez vos propriétés et offres</p></div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="listings">Mes annonces</TabsTrigger>
            <TabsTrigger value="offers">Offres reçues ({incomingOffers.length})</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-4 mt-4">
            <Button onClick={() => setShowNewListing(!showNewListing)}><Plus className="h-4 w-4 mr-2" /> Nouvelle annonce</Button>

            {showNewListing && (
              <Card>
                <CardHeader><CardTitle>Créer une annonce</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Titre *</Label><Input value={listingForm.title} onChange={e => setListingForm({...listingForm, title: e.target.value})} placeholder="Belle chambre au centre" /></div>
                    <div><Label>Type</Label>
                      <Select value={listingForm.property_type} onValueChange={v => setListingForm({...listingForm, property_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Adresse *</Label><Input value={listingForm.address} onChange={e => setListingForm({...listingForm, address: e.target.value})} /></div>
                    <div><Label>Ville *</Label><Input value={listingForm.city} onChange={e => setListingForm({...listingForm, city: e.target.value})} placeholder="Bamako" /></div>
                    <div><Label>Prix/nuit (FCFA) *</Label><Input type="number" value={listingForm.price_per_night} onChange={e => setListingForm({...listingForm, price_per_night: e.target.value})} /></div>
                    <div><Label>Capacité max</Label><Input type="number" min={1} value={listingForm.max_guests} onChange={e => setListingForm({...listingForm, max_guests: parseInt(e.target.value) || 1})} /></div>
                    <div><Label>Chambres</Label><Input type="number" min={0} value={listingForm.bedrooms} onChange={e => setListingForm({...listingForm, bedrooms: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Salles de bain</Label><Input type="number" min={0} value={listingForm.bathrooms} onChange={e => setListingForm({...listingForm, bathrooms: parseInt(e.target.value) || 0})} /></div>
                  </div>
                  <div><Label>Description</Label><Textarea value={listingForm.description} onChange={e => setListingForm({...listingForm, description: e.target.value})} /></div>
                  <div><Label>Règlement</Label><Textarea value={listingForm.rules} onChange={e => setListingForm({...listingForm, rules: e.target.value})} placeholder="Pas d'animaux, etc." /></div>
                  <div className="flex gap-2">
                    <Button onClick={createListing}>Créer l'annonce</Button>
                    <Button variant="outline" onClick={() => setShowNewListing(false)}>Annuler</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {myListings.map(l => (
              <Card key={l.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{l.title}</h3>
                      <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{l.address}, {l.city}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={l.is_active ? 'default' : 'secondary'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Badge variant={l.is_verified ? 'default' : 'outline'}>{l.is_verified ? 'Vérifiée' : 'Non vérifiée'}</Badge>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary mt-2">{Number(l.price_per_night).toLocaleString()} FCFA/nuit</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="offers" className="space-y-4 mt-4">
            {incomingOffers.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune offre reçue.</p>}
            {incomingOffers.map(offer => (
              <Card key={offer.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{offer.profiles?.full_name || 'Client'}</h3>
                      <p className="text-sm text-muted-foreground">Code: {offer.profiles?.referral_code}</p>
                    </div>
                    <Badge variant="secondary">{offer.city}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>📅 {offer.check_in} → {offer.check_out}</span>
                    <span>👥 {offer.guests} personnes</span>
                    <span>🏠 {PROPERTY_TYPES.find(t => t.value === offer.property_type_wanted)?.label}</span>
                    <span className="text-lg font-bold text-primary">💰 {Number(offer.proposed_budget).toLocaleString()} FCFA</span>
                  </div>
                  {offer.message && <p className="text-sm bg-muted p-2 rounded">{offer.message}</p>}

                  {respondingTo === offer.id ? (
                    <div className="space-y-2 border-t pt-2">
                      <Label>Votre prix proposé (FCFA)</Label>
                      <Input type="number" value={responsePrice} onChange={e => setResponsePrice(e.target.value)} placeholder={String(offer.proposed_budget)} />
                      <Label>Message</Label>
                      <Textarea value={responseMessage} onChange={e => setResponseMessage(e.target.value)} placeholder="Bienvenue chez nous..." />
                      <Select onValueChange={(listingId) => respondToOffer(offer.id, listingId)}>
                        <SelectTrigger><SelectValue placeholder="Choisir une propriété et envoyer" /></SelectTrigger>
                        <SelectContent>
                          {myListings.filter(l => l.is_active && l.city === offer.city).map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title} - {Number(l.price_per_night).toLocaleString()} FCFA/nuit</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>Annuler</Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => { setRespondingTo(offer.id); setResponsePrice(String(offer.proposed_budget)); }}>
                      <Check className="h-3 w-3 mr-1" /> Répondre à cette offre
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4 mt-4">
            {myBookings.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune réservation.</p>}
            {myBookings.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-bold">{b.immo_listings?.title}</h3>
                    <Badge>{b.booking_status}</Badge>
                  </div>
                  <p className="text-sm">{b.check_in} → {b.check_out} · {b.guests} pers.</p>
                  <p className="text-lg font-bold text-primary">{Number(b.total_price).toLocaleString()} FCFA</p>
                  <p className="text-xs text-muted-foreground">Commission: {Number(b.platform_commission).toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
