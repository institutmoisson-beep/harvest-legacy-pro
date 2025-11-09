import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, Trophy, Wallet, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function TontineDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tontine, setTontine] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [paymentData, setPaymentData] = useState({
    payment_method: 'orange_money',
    payment_contact: '',
  });

  useEffect(() => {
    if (id) {
      fetchTontineData();

      const channel = supabase
        .channel(`tontine-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tontine_messages', filter: `tontine_id=eq.${id}` }, () => fetchMessages())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tontine_drawings', filter: `tontine_id=eq.${id}` }, () => fetchDrawings())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  const fetchTontineData = async () => {
    await Promise.all([fetchTontine(), fetchParticipants(), fetchDrawings(), fetchMessages()]);
  };

  const fetchTontine = async () => {
    const { data } = await supabase.from('tontines').select('*').eq('id', id).single();
    setTontine(data);
  };

  const fetchParticipants = async () => {
    const { data: parts } = await supabase
      .from('tontine_participants')
      .select('*')
      .eq('tontine_id', id);

    if (parts && parts.length > 0) {
      const userIds = parts.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', userIds);

      const participantsWithProfiles = parts.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.id === p.user_id),
      }));

      setParticipants(participantsWithProfiles);
    }
  };

  const fetchDrawings = async () => {
    const { data: draws } = await supabase
      .from('tontine_drawings')
      .select('*')
      .eq('tontine_id', id)
      .order('cycle_number', { ascending: false });

    if (draws && draws.length > 0) {
      const userIds = draws.map(d => d.winner_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', userIds);

      const drawingsWithProfiles = draws.map(d => ({
        ...d,
        winner_profile: profiles?.find(p => p.id === d.winner_id),
      }));

      setDrawings(drawingsWithProfiles);
    }
  };

  const fetchMessages = async () => {
    const { data: msgs } = await supabase
      .from('tontine_messages')
      .select('*')
      .eq('tontine_id', id)
      .order('created_at', { ascending: true });

    if (msgs && msgs.length > 0) {
      const userIds = msgs.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const messagesWithProfiles = msgs.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id),
      }));

      setMessages(messagesWithProfiles);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('tontine_messages').insert({
      tontine_id: id,
      user_id: user?.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setNewMessage('');
      fetchMessages();
    }
  };

  const submitPayment = async () => {
    if (!paymentData.payment_contact) {
      toast({ title: 'Erreur', description: 'Veuillez renseigner votre contact de paiement', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('tontine_payments').insert({
      tontine_id: id,
      user_id: user?.id,
      cycle_number: tontine?.current_cycle || 1,
      amount: tontine?.amount,
      payment_method: paymentData.payment_method,
      payment_contact: paymentData.payment_contact,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Paiement soumis pour validation' });
      setPaymentData({ payment_method: 'orange_money', payment_contact: '' });
    }
  };

  if (!tontine) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/tontines')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-bold gradient-text-cosmic mb-6">{tontine.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info & Actions */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Montant:</span>
                  <p className="font-bold">{tontine.amount.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Participants:</span>
                  <p className="font-bold">{participants.length}/{tontine.max_participants}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cycle actuel:</span>
                  <p className="font-bold">{tontine.current_cycle}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fréquence:</span>
                  <p className="font-bold">{tontine.frequency === 'monthly' ? 'Mensuel' : tontine.frequency === 'weekly' ? 'Hebdomadaire' : 'Quotidien'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange_money">Orange Money</SelectItem>
                      <SelectItem value="mtn_money">MTN Money</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                      <SelectItem value="push">PUSH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Numéro de téléphone</Label>
                  <Input
                    placeholder="Ex: 77 123 45 67"
                    value={paymentData.payment_contact}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_contact: e.target.value })}
                  />
                </div>
                <Button onClick={submitPayment} className="w-full">
                  Payer {tontine.amount.toLocaleString()} FCFA
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card className="glass-card lg:col-span-2">
            <Tabs defaultValue="participants">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                  <TabsTrigger value="drawings">Tirages</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="participants">
                <CardContent>
                  <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-2">Transparence totale</h4>
                    <p className="text-sm text-muted-foreground">
                      Tous les participants avec leurs codes Moissonneur pour une transparence complète
                    </p>
                  </div>
                  <ScrollArea className="h-[400px]">
                    {participants.map((p, index) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-accent/5 mb-2 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{p.profile?.full_name}</p>
                            <p className="text-xs font-mono text-primary font-semibold">{p.profile?.referral_code}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.is_paid_current_cycle ? '✓ Payé ce cycle' : '○ En attente de paiement'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.has_received && (
                            <div className="flex items-center gap-1">
                              <Trophy className="h-5 w-5 text-accent" />
                              <span className="text-xs text-accent font-medium">Gagnant</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </TabsContent>

              <TabsContent value="drawings">
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {drawings.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucun tirage effectué</p>
                    ) : (
                      drawings.map(d => (
                        <div key={d.id} className="p-4 rounded-lg bg-accent/10 mb-3">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="h-6 w-6 text-accent" />
                            <div>
                              <p className="font-bold">Cycle {d.cycle_number}</p>
                              <p className="text-sm">{d.winner_profile?.full_name}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {d.amount_won.toLocaleString()} FCFA • {new Date(d.drawn_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </TabsContent>

              <TabsContent value="chat">
                <CardContent>
                  <ScrollArea className="h-[400px] mb-4">
                    {messages.map(msg => (
                      <div key={msg.id} className="mb-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{msg.profile?.full_name}</p>
                            <p className="text-sm bg-accent/10 rounded-lg p-2 mt-1">{msg.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      rows={2}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
