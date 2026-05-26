import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShoppingCart, TrendingUp, Package, Wallet, MapPin, Phone, Store, Home } from 'lucide-react';
import { showBrowserNotification } from '@/utils/pushNotifications';
import { formatPriceWithMSN, formatFCFA, fcfaToMsn, formatMSN } from '@/lib/currency';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import RelayPointPicker from '@/components/relay/RelayPointPicker';
import PackDocumentsActions from '@/components/documents/PackDocumentsActions';

interface Pack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  benefit_amount: number;
  images: string[] | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  partner_image_url: string | null;
  base_commission_percentage: number;
  decay_rate: number;
  max_levels: number;
}

export default function MLMPackDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const { format: fmt } = useUserCurrency();

  // Livraison
  const [mode, setMode] = useState<'address' | 'relay'>('address');
  const [relayId, setRelayId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDone, setPurchaseDone] = useState<null | {
    purchase: any; buyer: any; relay: any;
  }>(null);

  useEffect(() => {
    document.title = pack ? `${pack.name} — Pack Moissonneur` : 'Pack Moissonneur';
  }, [pack]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from('mlm_packs').select('*').eq('id', id).maybeSingle();
      setPack(data as Pack);
      if (user) {
        const [{ data: w }, { data: profile }] = await Promise.all([
          supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
        ]);
        setBalance(Number(w?.balance ?? 0));
        if (profile?.phone) setPhone(profile.phone);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const buy = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!pack) return;
    if (mode === 'relay') {
      if (!relayId) {
        toast({ title: 'Point relais requis', description: 'Sélectionnez un point relais pour le retrait.', variant: 'destructive' });
        return;
      }
    } else {
      if (address.trim().length < 5) {
        toast({ title: 'Adresse requise', description: 'Renseignez une adresse de livraison complète.', variant: 'destructive' });
        return;
      }
      if (phone.trim().length < 6) {
        toast({ title: 'Téléphone requis', description: 'Renseignez un numéro de téléphone valide.', variant: 'destructive' });
        return;
      }
    }
    setBuying(true);
    const { data, error } = await (supabase as any).rpc('purchase_mlm_pack', {
      p_pack_id: pack.id,
      p_delivery_address: mode === 'address' ? address.trim() : null,
      p_delivery_city: mode === 'address' ? (city.trim() || null) : null,
      p_delivery_phone: mode === 'address' ? phone.trim() : null,
      p_delivery_notes: notes.trim() || null,
      p_delivery_mode: mode,
      p_relay_point_id: mode === 'relay' ? relayId : null,
    });
    setBuying(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    const r = Array.isArray(data) ? data[0] : data;
    if (!r?.success) {
      toast({ title: 'Achat impossible', description: r?.message || 'Erreur', variant: 'destructive' });
      if (r?.message?.toLowerCase().includes('solde')) setTimeout(() => navigate('/dashboard'), 1500);
      return;
    }
    // Récupérer la commande créée pour les documents
    const { data: latest } = await (supabase as any)
      .from('mlm_pack_purchases')
      .select('id, tracking_code, pickup_code, delivery_mode, delivery_address, delivery_city, delivery_phone, delivery_notes, created_at, relay:delivery_relay_points(name,address,city,country,phone)')
      .eq('buyer_id', user.id)
      .eq('pack_id', pack.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, phone, id_number')
      .eq('id', user.id)
      .maybeSingle();

    setPurchaseDone({
      purchase: latest || { id: r?.purchase_id || 'n/a', tracking_code: null, pickup_code: r?.pickup_code },
      buyer: { ...prof, email: user.email },
      relay: latest?.relay || null,
    });

    if (mode === 'relay' && r?.pickup_code) {
      toast({ title: '✅ Pack acheté', description: `Code de retrait : ${r.pickup_code}` });
      showBrowserNotification('Pack acheté', `Code de retrait : ${r.pickup_code}`);
    } else {
      toast({ title: '✅ Pack acheté', description: `${pack.name} sera livré à l'adresse renseignée.` });
      showBrowserNotification('Pack acheté', `${pack.name} — ${fmt(pack.price)}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!pack) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <Package className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">Pack introuvable.</p>
      <Button onClick={() => navigate('/packs')}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
    </div>
  );

  const lvl = (n: number) => (pack.benefit_amount * pack.base_commission_percentage * Math.pow(pack.decay_rate, n - 1)) / 100;
  const insufficient = balance !== null && balance < pack.price;
  const priceMsn = fcfaToMsn(pack.price);

  if (purchaseDone) {
    const ref = purchaseDone.purchase?.tracking_code || purchaseDone.purchase?.pickup_code || purchaseDone.purchase?.id?.slice(0, 8);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
        <div className="container mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-700">✓</div>
                <h1 className="text-2xl font-bold">Achat confirmé</h1>
                <p className="text-muted-foreground">Téléchargez vos documents officiels signés par le Directeur Général.</p>
                <div className="rounded-md border-2 border-dashed border-primary p-3 inline-block">
                  <div className="text-xs text-muted-foreground">Code unique de commande</div>
                  <div className="text-xl font-black tracking-widest text-primary">{ref}</div>
                </div>
              </div>
              <PackDocumentsActions
                purchase={purchaseDone.purchase}
                buyer={purchaseDone.buyer}
                pack={{ name: pack.name, price: pack.price, benefit_amount: pack.benefit_amount, description: pack.description }}
                relay={purchaseDone.relay}
              />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" variant="outline" onClick={() => navigate('/mes-livraisons')}>Mes livraisons</Button>
                <Button className="flex-1" onClick={() => navigate('/packs')}>Autres packs</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/packs')}><ArrowLeft className="w-4 h-4 mr-2" />Tous les packs</Button>


        <Card className="overflow-hidden">
          {pack.images && pack.images.length > 0 && (
            <div>
              <img src={pack.images[activeImg]} alt={pack.name} className="w-full h-64 md:h-96 object-cover" />
              {pack.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {pack.images.map((u, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`flex-shrink-0 rounded border-2 ${i === activeImg ? 'border-primary' : 'border-transparent'}`}>
                      <img src={u} className="w-16 h-16 object-cover rounded" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{pack.name}</h1>
                {pack.partner_name && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {pack.partner_logo_url && <img src={pack.partner_logo_url} className="w-6 h-6 rounded object-cover" />}
                    Par {pack.partner_name}
                  </div>
                )}
              </div>
              <div className="text-right">
                <Badge className="text-base px-3 py-1">{fmt(pack.price)}</Badge>
                <div className="text-xs text-muted-foreground mt-1">{formatFCFA(pack.price)} · {formatMSN(priceMsn)}</div>
              </div>
            </div>

            {pack.description && <p className="text-muted-foreground whitespace-pre-line">{pack.description}</p>}

            {pack.partner_image_url && (
              <img src={pack.partner_image_url} alt={pack.partner_name || ''} className="w-full max-h-64 object-cover rounded-lg" />
            )}

            <div className="rounded-lg bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <TrendingUp className="w-5 h-5" /> Bénéfice : {formatPriceWithMSN(pack.benefit_amount)}
              </div>
              <div className="text-sm">Commission niveau 1 : <strong>{formatPriceWithMSN(lvl(1))}</strong> ({pack.base_commission_percentage}%)</div>
              <div className="text-sm">Décroissance : {((1 - pack.decay_rate) * 100).toFixed(0)}% par niveau · jusqu'au niveau {pack.max_levels}</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="rounded bg-background p-2 text-center text-xs">
                    <div className="text-muted-foreground">N{n}</div>
                    <div className="font-semibold">{formatFCFA(lvl(n))}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Livraison */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Mode de livraison</div>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${mode==='address'?'border-primary bg-primary/5':''}`}>
                  <RadioGroupItem value="address" />
                  <Home className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Livraison à domicile</span>
                </label>
                <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${mode==='relay'?'border-primary bg-primary/5':''}`}>
                  <RadioGroupItem value="relay" />
                  <Store className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Retrait en point relais</span>
                </label>
              </RadioGroup>

              {mode === 'address' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="addr">Adresse complète *</Label>
                    <Input id="addr" placeholder="Rue, quartier, point de repère…"
                           value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" placeholder="Abidjan, Dakar…"
                             value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone *</Label>
                      <Input id="phone" placeholder="+225 …"
                             value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea id="notes" rows={2} placeholder="Instructions pour le livreur…"
                              value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </>
              ) : (
                <RelayPointPicker value={relayId} onChange={setRelayId} />
              )}
            </div>

            {user && balance !== null && (
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Solde portefeuille</span>
                <span className={`font-semibold ${insufficient ? 'text-destructive' : 'text-primary'}`}>
                  {fmt(balance)} · {formatMSN(fcfaToMsn(balance))}
                </span>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={buy} disabled={buying}>
              {buying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              {insufficient ? 'Recharger & Acheter' : `Acheter — ${fmt(pack.price)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
