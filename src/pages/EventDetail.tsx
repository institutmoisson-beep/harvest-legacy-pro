import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Calendar, MapPin, ArrowLeft, Ticket, Users, Minus, Plus, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('events')
        .select('*, ticket_types(*)')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!eventId,
  });

  const tierConfig: Record<string, { bg: string; border: string; label: string }> = {
    standard: { bg: 'bg-muted/50', border: 'border-border', label: '🎟️ Standard' },
    vip: { bg: 'bg-amber-500/5', border: 'border-amber-500/30', label: '⭐ VIP' },
    vvip: { bg: 'bg-purple-500/5', border: 'border-purple-500/30', label: '👑 VVIP' },
  };

  const handlePurchase = async () => {
    if (!user) { toast({ title: "Connectez-vous", variant: "destructive" }); return; }
    if (!buyerName.trim()) { toast({ title: "Nom requis", variant: "destructive" }); return; }
    setPurchasing(true);
    try {
      const total = selectedTicket.price * qty;

      // If there's a payment link, redirect
      if (selectedTicket.payment_link) {
        window.open(selectedTicket.payment_link, '_blank');
      }

      const { data, error } = await (supabase as any).from('ticket_purchases').insert({
        ticket_type_id: selectedTicket.id,
        event_id: eventId,
        user_id: user.id,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        quantity: qty,
        total_amount: total,
        payment_method: selectedTicket.payment_link ? 'external' : 'wallet',
        payment_status: selectedTicket.payment_link ? 'pending' : 'completed',
      }).select('ticket_code').single();

      if (error) throw error;

      // Update quantity sold
      await (supabase as any).from('ticket_types')
        .update({ quantity_sold: selectedTicket.quantity_sold + qty })
        .eq('id', selectedTicket.id);

      setPurchaseSuccess(data.ticket_code);
      setSelectedTicket(null);
      toast({ title: "🎉 Billet acheté!", description: `Code: ${data.ticket_code}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center">Événement non trouvé</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1 truncate">{event.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {event.image_url && (
          <div className="h-48 sm:h-64">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{event.title}</h2>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(event.event_date), 'EEEE dd MMMM yyyy · HH:mm', { locale: fr })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
              {event.max_capacity && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.max_capacity} places
                </span>
              )}
            </div>
            {event.description && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}
          </div>

          {purchaseSuccess && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
                <div>
                  <p className="font-bold">Billet confirmé!</p>
                  <p className="text-2xl font-mono font-bold text-primary">{purchaseSuccess}</p>
                  <p className="text-xs text-muted-foreground">Présentez ce code à l'entrée</p>
                </div>
              </CardContent>
            </Card>
          )}

          <h3 className="font-bold text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Billets disponibles
          </h3>

          <div className="space-y-3">
            {event.ticket_types?.sort((a: any, b: any) => a.price - b.price).map((ticket: any) => {
              const config = tierConfig[ticket.tier] || tierConfig.standard;
              const remaining = ticket.quantity_available - (ticket.quantity_sold || 0);
              const soldOut = remaining <= 0;
              return (
                <Card key={ticket.id} className={`${config.bg} border ${config.border} ${soldOut ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-base">{config.label}</p>
                        {ticket.name !== ticket.tier && <p className="text-sm text-muted-foreground">{ticket.name}</p>}
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {ticket.price > 0 ? `${ticket.price.toLocaleString()} FCFA` : 'Gratuit'}
                      </p>
                    </div>
                    {ticket.description && <p className="text-xs text-muted-foreground mb-2">{ticket.description}</p>}
                    {ticket.benefits?.length > 0 && (
                      <ul className="text-xs text-muted-foreground mb-3 space-y-1">
                        {ticket.benefits.map((b: string, i: number) => <li key={i}>✓ {b}</li>)}
                      </ul>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{remaining} restant{remaining > 1 ? 's' : ''}</span>
                      <Button size="sm" disabled={soldOut} onClick={() => { setSelectedTicket(ticket); setQty(1); }}>
                        {soldOut ? 'Épuisé' : 'Acheter'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acheter un billet</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-bold">{selectedTicket.name} - {selectedTicket.tier?.toUpperCase()}</p>
                <p className="text-primary font-bold">{selectedTicket.price.toLocaleString()} FCFA / billet</p>
              </div>

              <div className="space-y-2">
                <Label>Votre nom</Label>
                <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nom complet" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+225..." />
              </div>

              <div className="space-y-2">
                <Label>Quantité</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="text-xl font-bold w-8 text-center">{qty}</span>
                  <Button variant="outline" size="icon" onClick={() => setQty(Math.min(10, qty + 1))}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">
                  {(selectedTicket.price * qty).toLocaleString()} FCFA
                </p>
              </div>

              {selectedTicket.payment_link && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Redirection vers le paiement externe
                </p>
              )}

              <Button className="w-full h-12" onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? 'Traitement...' : 'Confirmer l\'achat'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
