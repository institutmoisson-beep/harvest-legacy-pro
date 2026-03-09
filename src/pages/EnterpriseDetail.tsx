import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart, Calendar, MapPin, Phone, Globe, Star, Loader2, Wallet, Building2, Play } from 'lucide-react';

export default function EnterpriseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);

  useEffect(() => {
    if (slug) fetchEnterprise();
  }, [slug]);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    setWalletBalance(Number(data?.balance) || 0);
  };

  const fetchEnterprise = async () => {
    setLoading(true);
    const { data: ent } = await (supabase as any).from('enterprises').select('*').eq('slug', slug).eq('is_active', true).single();
    if (!ent) { navigate('/enterprises'); return; }
    setEnterprise(ent);

    const [{ data: prods }, { data: pics }, { data: revs }] = await Promise.all([
      (supabase as any).from('enterprise_products').select('*').eq('enterprise_id', ent.id).eq('is_active', true).order('created_at'),
      (supabase as any).from('enterprise_photos').select('*').eq('enterprise_id', ent.id).order('display_order'),
      (supabase as any).from('enterprise_reviews').select('*').eq('enterprise_id', ent.id).order('created_at', { ascending: false }),
    ]);
    setProducts(prods || []);
    setPhotos(pics || []);
    setReviews(revs || []);
    setLoading(false);
  };

  const handleBuyProduct = async (product: any) => {
    if (!user) { navigate('/auth'); return; }
    setProcessing(true);
    try {
      const totalMSN = product.price / 750;
      if (walletBalance < totalMSN) {
        toast({ title: 'Solde insuffisant', description: 'Rechargez votre portefeuille', variant: 'destructive' });
        return;
      }

      const { error: debitError } = await supabase.rpc('decrement_wallet_balance', { p_user_id: user.id, p_amount: totalMSN });
      if (debitError) throw debitError;

      await (supabase as any).from('enterprise_orders').insert({
        enterprise_id: enterprise.id,
        product_id: product.id,
        user_id: user.id,
        quantity: 1,
        total_amount: product.price,
        status: 'confirmed',
        payment_method: 'wallet',
      });

      await (supabase as any).from('wallet_transactions').insert({
        from_user_id: user.id, to_user_id: user.id, amount: totalMSN,
        transaction_type: 'withdrawal',
        description: `Achat entreprise: ${product.name} - ${enterprise.name}`,
        status: 'completed',
      });

      toast({ title: '✅ Achat réussi!', description: `${totalMSN.toFixed(2)} MSN débités` });
      await fetchWallet();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAppointment = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!appointmentDate) { toast({ title: 'Erreur', description: 'Choisissez une date', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      const code = 'RDV' + Math.floor(100000 + Math.random() * 900000);
      await (supabase as any).from('enterprise_appointments').insert({
        enterprise_id: enterprise.id,
        user_id: user.id,
        appointment_code: code,
        product_id: selectedProduct?.id || null,
        appointment_date: new Date(appointmentDate).toISOString(),
        notes: appointmentNotes,
        status: 'scheduled',
      });

      toast({ title: '✅ Rendez-vous créé!', description: `Code: ${code}. Présentez ce code en entreprise.` });
      setAppointmentDialogOpen(false);
      setAppointmentDate('');
      setAppointmentNotes('');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!enterprise) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-56 md:h-72 bg-muted">
        {enterprise.banner_url ? (
          <img src={enterprise.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: enterprise.branding_color + '15' }}>
            <Building2 className="h-20 w-20 opacity-20" style={{ color: enterprise.branding_color }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <Button variant="ghost" className="absolute top-4 left-4 bg-background/50" onClick={() => navigate('/enterprises')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
        {/* Header */}
        <div className="flex items-end gap-4 mb-8">
          {enterprise.logo_url && (
            <div className="w-24 h-24 rounded-2xl border-4 border-background bg-background overflow-hidden shadow-lg">
              <img src={enterprise.logo_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{enterprise.name}</h1>
              {enterprise.is_featured && <Badge className="bg-yellow-500 text-white">Premium</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
              {enterprise.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{enterprise.city}, {enterprise.country}</span>}
              {avgRating && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{avgRating} ({reviews.length} avis)</span>}
              <Badge variant="outline">{enterprise.category}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {enterprise.description && (
              <Card><CardContent className="pt-6"><p className="whitespace-pre-wrap">{enterprise.description}</p></CardContent></Card>
            )}

            {/* Video */}
            {enterprise.video_url && (
              <Card><CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Play className="h-4 w-4" /> Vidéo</h3>
                <video controls className="w-full rounded-lg" src={enterprise.video_url} />
              </CardContent></Card>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <Card><CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Galerie</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {photos.map((p: any) => (
                    <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={p.image_url} alt={p.caption || ''} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            )}

            {/* Products */}
            <Card><CardHeader><CardTitle>Produits & Services</CardTitle></CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucun produit disponible</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((prod: any) => (
                      <Card key={prod.id} className="overflow-hidden">
                        {prod.image_url && (
                          <div className="h-40 bg-muted"><img src={prod.image_url} alt="" className="w-full h-full object-cover" /></div>
                        )}
                        <CardContent className="p-4 space-y-2">
                          <h4 className="font-semibold">{prod.name}</h4>
                          {prod.description && <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">{Number(prod.price).toLocaleString()} FCFA</span>
                            {prod.is_service && <Badge variant="secondary">Service</Badge>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1" onClick={() => handleBuyProduct(prod)} disabled={processing}>
                              <ShoppingCart className="h-3 w-3" /> Acheter
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelectedProduct(prod); setAppointmentDialogOpen(true); }}>
                              <Calendar className="h-3 w-3" /> RDV
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Wallet */}
            {user && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1"><Wallet className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Mon Portefeuille</span></div>
                  <p className="text-2xl font-bold text-primary">{walletBalance.toFixed(2)} MSN</p>
                  <p className="text-xs text-muted-foreground">{(walletBalance * 750).toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            )}

            {/* Contact */}
            <Card><CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">Contact</h3>
              {enterprise.phone && <p className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{enterprise.phone}</p>}
              {enterprise.email && <p className="text-sm">{enterprise.email}</p>}
              {enterprise.website && <a href={enterprise.website} target="_blank" rel="noopener" className="text-sm flex items-center gap-2 text-primary"><Globe className="h-4 w-4" />{enterprise.website}</a>}
              {enterprise.address && <p className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{enterprise.address}</p>}
            </CardContent></Card>

            {/* Book appointment */}
            <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2"><Calendar className="h-4 w-4" /> Prendre rendez-vous</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Prendre rendez-vous</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {selectedProduct && <p className="text-sm text-muted-foreground">Pour: {selectedProduct.name}</p>}
                  <div><Label>Date et heure</Label><Input type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} /></div>
                  <div><Label>Notes</Label><Textarea placeholder="Détails supplémentaires..." value={appointmentNotes} onChange={(e) => setAppointmentNotes(e.target.value)} /></div>
                  <Button onClick={handleAppointment} disabled={processing} className="w-full">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />} Confirmer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {!user && <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Connectez-vous</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
