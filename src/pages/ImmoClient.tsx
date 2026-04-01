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
import { ArrowLeft, MapPin, Send, Building, Calendar, Users, Wallet, Star, MessageSquare, Phone, Loader2 } from 'lucide-react';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'room', label: 'Chambre' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'villa', label: 'Villa' },
  { value: 'house', label: 'Maison' },
  { value: 'residence', label: 'Résidence' },
];

export default function ImmoClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('explore');
  const [listings, setListings] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New offer form
  const [offerForm, setOfferForm] = useState({
    city: '', country: 'Mali', check_in: '', check_out: '', guests: 1,
    proposed_budget: '', property_type_wanted: 'apartment', message: '', amenities_wanted: [] as string[],
  });

  useEffect(() => { if (!user) navigate('/auth'); }, [user]);
  useEffect(() => { fetchData(); }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [listingsRes, offersRes, bookingsRes] = await Promise.all([
      (supabase as any).from('immo_listings').select('*, profiles:host_id(full_name, referral_code)').eq('is_active', true).order('created_at', { ascending: false }).limit(50),
      user ? (supabase as any).from('immo_offers').select('*').eq('client_id', user.id).order('created_at', { ascending: false }) : { data: [] },
      user ? (supabase as any).from('immo_bookings').select('*, immo_listings(title, address, city, images)').eq('client_id', user.id).order('created_at', { ascending: false }) : { data: [] },
    ]);
    setListings(listingsRes.data || []);
    setMyOffers(offersRes.data || []);
    setMyBookings(bookingsRes.data || []);

    // Fetch responses for my offers
    if (offersRes.data?.length) {
      const offerIds = offersRes.data.map((o: any) => o.id);
      const { data: resps } = await (supabase as any).from('immo_offer_responses')
        .select('*, immo_listings(title, address, city, images, host_id, profiles:host_id(full_name, referral_code))')
        .in('offer_id', offerIds);
      setResponses(resps || []);
    }
    setLoading(false);
  }, [user]);

  const submitOffer = async () => {
    if (!user) return;
    if (!offerForm.city || !offerForm.check_in || !offerForm.check_out || !offerForm.proposed_budget) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('immo_offers').insert({
      client_id: user.id, city: offerForm.city, country: offerForm.country,
      check_in: offerForm.check_in, check_out: offerForm.check_out,
      guests: offerForm.guests, proposed_budget: parseFloat(offerForm.proposed_budget),
      property_type_wanted: offerForm.property_type_wanted, message: offerForm.message,
      amenities_wanted: offerForm.amenities_wanted,
    });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Offre envoyée', description: 'Les résidences vont recevoir votre proposition.' });
    setOfferForm({ city: '', country: 'Mali', check_in: '', check_out: '', guests: 1, proposed_budget: '', property_type_wanted: 'apartment', message: '', amenities_wanted: [] });
    setTab('my-offers');
    fetchData();
  };

  const acceptResponse = async (response: any) => {
    if (!user) return;
    try {
      // Check wallet
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
      const totalMSN = response.proposed_price / 750;
      if (!wallet || Number(wallet.balance) < totalMSN) {
        toast({ title: 'Solde insuffisant', description: `Rechargez votre portefeuille. Nécessaire: ${totalMSN.toFixed(2)} MSN`, variant: 'destructive' });
        return;
      }

      // Find the offer
      const offer = myOffers.find(o => o.id === response.offer_id);
      if (!offer) return;

      // Debit wallet
      await supabase.rpc('decrement_wallet_balance', { p_user_id: user.id, p_amount: totalMSN });

      // Create booking
      const { data: booking, error } = await (supabase as any).from('immo_bookings').insert({
        offer_id: response.offer_id, response_id: response.id, listing_id: response.listing_id,
        client_id: user.id, host_id: response.host_id,
        check_in: offer.check_in, check_out: offer.check_out, guests: offer.guests,
        total_price: response.proposed_price, payment_status: 'paid', booking_status: 'confirmed',
        platform_commission: response.proposed_price * 0.1,
      }).select().single();

      if (error) { await supabase.rpc('increment_wallet_balance', { p_user_id: user.id, p_amount: totalMSN }); throw error; }

      // Update offer and response status
      await (supabase as any).from('immo_offers').update({ status: 'confirmed' }).eq('id', response.offer_id);
      await (supabase as any).from('immo_offer_responses').update({ status: 'accepted' }).eq('id', response.id);

      // Record transaction
      await (supabase as any).from('wallet_transactions').insert({
        from_user_id: user.id, to_user_id: user.id, amount: totalMSN,
        transaction_type: 'withdrawal', description: `MSN Immo - Réservation #${booking.id}`, status: 'completed',
      });

      toast({ title: '✅ Réservation confirmée!', description: 'Votre séjour a été réservé et payé.' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: 'En attente', accepted: 'Acceptée', refused: 'Refusée', expired: 'Expirée', cancelled: 'Annulée', confirmed: 'Confirmée', completed: 'Terminée' };
    return map[s] || s;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">🏠 MSN Immo</h1>
            <p className="text-sm text-muted-foreground">Trouvez un logement selon votre budget</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="explore">Explorer</TabsTrigger>
            <TabsTrigger value="new-offer">Proposer</TabsTrigger>
            <TabsTrigger value="my-offers">Mes offres</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="host">Propriétaire</TabsTrigger>
          </TabsList>

          {/* EXPLORE LISTINGS */}
          <TabsContent value="explore" className="space-y-4 mt-4">
            {listings.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune résidence disponible pour le moment.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              {listings.map(l => (
                <Card key={l.id} className="overflow-hidden">
                  {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-full h-48 object-cover" />}
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-bold text-lg">{l.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {l.city}, {l.country}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span><Users className="h-3 w-3 inline mr-1" />{l.max_guests} pers.</span>
                      <span>{l.bedrooms} ch.</span>
                      <span>{l.bathrooms} sdb.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-primary">{Number(l.price_per_night).toLocaleString()} FCFA/nuit</span>
                      {l.rating_avg > 0 && <Badge variant="secondary"><Star className="h-3 w-3 mr-1" />{Number(l.rating_avg).toFixed(1)}</Badge>}
                    </div>
                    <Badge>{PROPERTY_TYPES.find(t => t.value === l.property_type)?.label}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* NEW OFFER */}
          <TabsContent value="new-offer" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Proposer votre budget</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Ville *</Label><Input placeholder="Bamako" value={offerForm.city} onChange={e => setOfferForm({...offerForm, city: e.target.value})} /></div>
                  <div><Label>Pays</Label><Input value={offerForm.country} onChange={e => setOfferForm({...offerForm, country: e.target.value})} /></div>
                  <div><Label>Date d'arrivée *</Label><Input type="date" value={offerForm.check_in} onChange={e => setOfferForm({...offerForm, check_in: e.target.value})} /></div>
                  <div><Label>Date de départ *</Label><Input type="date" value={offerForm.check_out} onChange={e => setOfferForm({...offerForm, check_out: e.target.value})} /></div>
                  <div><Label>Nombre de personnes</Label><Input type="number" min={1} value={offerForm.guests} onChange={e => setOfferForm({...offerForm, guests: parseInt(e.target.value) || 1})} /></div>
                  <div><Label>Budget proposé (FCFA) *</Label><Input type="number" placeholder="25000" value={offerForm.proposed_budget} onChange={e => setOfferForm({...offerForm, proposed_budget: e.target.value})} /></div>
                  <div>
                    <Label>Type de logement</Label>
                    <Select value={offerForm.property_type_wanted} onValueChange={v => setOfferForm({...offerForm, property_type_wanted: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Message / commentaires</Label><Textarea placeholder="Précisez vos souhaits..." value={offerForm.message} onChange={e => setOfferForm({...offerForm, message: e.target.value})} /></div>
                <Button onClick={submitOffer} className="w-full" size="lg"><Send className="h-4 w-4 mr-2" /> Envoyer l'offre aux résidences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MY OFFERS */}
          <TabsContent value="my-offers" className="space-y-4 mt-4">
            {myOffers.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune offre envoyée.</p>}
            {myOffers.map(offer => {
              const offerResponses = responses.filter(r => r.offer_id === offer.id);
              return (
                <Card key={offer.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{offer.city}, {offer.country}</h3>
                        <p className="text-sm text-muted-foreground">{offer.check_in} → {offer.check_out} · {offer.guests} pers.</p>
                      </div>
                      <Badge variant={offer.status === 'pending' ? 'secondary' : offer.status === 'confirmed' ? 'default' : 'outline'}>
                        {statusLabel(offer.status)}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-primary">{Number(offer.proposed_budget).toLocaleString()} FCFA</p>
                    {offer.message && <p className="text-sm text-muted-foreground">{offer.message}</p>}

                    {offerResponses.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <h4 className="text-sm font-semibold">Réponses reçues ({offerResponses.length})</h4>
                        {offerResponses.map(resp => (
                          <div key={resp.id} className="p-3 rounded-lg border bg-card/50 space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">{resp.immo_listings?.title}</p>
                                <p className="text-xs text-muted-foreground">{resp.immo_listings?.address}, {resp.immo_listings?.city}</p>
                              </div>
                              <span className="text-lg font-bold text-primary">{Number(resp.proposed_price).toLocaleString()} FCFA</span>
                            </div>
                            {resp.message && <p className="text-sm">{resp.message}</p>}
                            {resp.status === 'pending' && offer.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => acceptResponse(resp)}><Wallet className="h-3 w-3 mr-1" /> Accepter & Payer</Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  const code = resp.immo_listings?.profiles?.referral_code;
                                  if (code) navigate(`/messages?code=${code}`);
                                }}><MessageSquare className="h-3 w-3 mr-1" /> Contacter</Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* BOOKINGS */}
          <TabsContent value="bookings" className="space-y-4 mt-4">
            {myBookings.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune réservation.</p>}
            {myBookings.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{b.immo_listings?.title}</h3>
                      <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{b.immo_listings?.city}</p>
                    </div>
                    <Badge>{b.booking_status === 'confirmed' ? 'Confirmée' : b.booking_status === 'completed' ? 'Terminée' : b.booking_status}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span><Calendar className="h-3 w-3 inline mr-1" />{b.check_in} → {b.check_out}</span>
                    <span><Users className="h-3 w-3 inline mr-1" />{b.guests} pers.</span>
                  </div>
                  <p className="text-lg font-bold text-primary">{Number(b.total_price).toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
