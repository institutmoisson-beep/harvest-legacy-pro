import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { MessageCircle, Send, Search, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  full_name: string;
  referral_code: string;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages();
      markAsRead();

      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `to_user_id=eq.${user?.id}`
        }, () => fetchMessages())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedContact]);

  const fetchContacts = async () => {
    // Get direct referrals and referrer
    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_id, referrer_id')
      .or(`referrer_id.eq.${user?.id},referred_id.eq.${user?.id}`)
      .eq('level', 1);

    const contactIds = Array.from(new Set(
      referrals?.flatMap(r => [r.referred_id, r.referrer_id])
        .filter(id => id !== user?.id)
    ));

    if (contactIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', contactIds);

      setContacts(profiles || []);
    }
  };

  const fetchMessages = async () => {
    if (!selectedContact) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${selectedContact.id}),and(from_user_id.eq.${selectedContact.id},to_user_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const markAsRead = async () => {
    if (!selectedContact) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('to_user_id', user?.id)
      .eq('from_user_id', selectedContact.id)
      .eq('read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const { error } = await supabase.from('messages').insert({
      from_user_id: user?.id,
      to_user_id: selectedContact.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message', variant: 'destructive' });
    } else {
      setNewMessage('');
      fetchMessages();
    }
  };

  const searchContact = async () => {
    if (!searchCode.trim()) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code')
      .eq('referral_code', searchCode.toUpperCase())
      .single();

    if (data && !contacts.find(c => c.id === data.id)) {
      setContacts([...contacts, data]);
      setSelectedContact(data);
    } else if (data) {
      setSelectedContact(data);
    } else {
      toast({ title: 'Introuvable', description: 'Code moissonneur invalide' });
    }
    setSearchCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>
        <h1 className="text-3xl font-bold gradient-text-cosmic mb-6 flex items-center gap-2">
          <MessageCircle className="h-8 w-8" />
          Messagerie Moissonneurs
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Contacts List */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="Code Moissonneur"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
                <Button size="icon" onClick={searchContact}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 ${
                      selectedContact?.id === contact.id
                        ? 'bg-primary/20'
                        : 'hover:bg-accent/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/20" />
                      <div>
                        <p className="font-medium">{contact.full_name}</p>
                        <p className="text-xs text-muted-foreground">{contact.referral_code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedContact ? selectedContact.full_name : 'Sélectionner un contact'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedContact ? (
                <>
                  <ScrollArea className="h-[400px] mb-4">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.from_user_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent/20'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
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
                      className="resize-none"
                      rows={2}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                  Sélectionnez un contact pour commencer à discuter
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
