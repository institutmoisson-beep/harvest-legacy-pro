import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Search, ArrowLeft, Phone, Video, User } from 'lucide-react';
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

/** Resolve a MSN code input to a normalized form for DB lookup */
const normalizeMSNCode = (raw: string) => {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  // If digits only, prepend MSN
  if (/^\d+$/.test(trimmed)) return `MSN${trimmed}`;
  // Already has MSN prefix
  if (trimmed.startsWith('MSN')) return trimmed;
  return trimmed;
};

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchContacts();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages();
      markAsRead();

      const channel = supabase
        .channel(`messages-${selectedContact.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.from_user_id === selectedContact.id && msg.to_user_id === user?.id) ||
            (msg.from_user_id === user?.id && msg.to_user_id === selectedContact.id)
          ) {
            setMessages(prev => [...prev, msg]);
            if (msg.from_user_id === selectedContact.id) markAsRead();
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedContact?.id]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchContacts = async () => {
    // Get all users we've exchanged messages with
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('to_user_id')
      .eq('from_user_id', user?.id || '');

    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('from_user_id')
      .eq('to_user_id', user?.id || '');

    // Also get referrals
    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_id, referrer_id')
      .or(`referrer_id.eq.${user?.id},referred_id.eq.${user?.id}`)
      .eq('level', 1);

    const contactIds = new Set<string>();
    sentMessages?.forEach(m => contactIds.add(m.to_user_id));
    receivedMessages?.forEach(m => contactIds.add(m.from_user_id));
    referrals?.forEach(r => {
      if (r.referred_id !== user?.id) contactIds.add(r.referred_id);
      if (r.referrer_id !== user?.id) contactIds.add(r.referrer_id);
    });
    contactIds.delete(user?.id || '');

    if (contactIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', Array.from(contactIds));

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
    }
  };

  const searchContact = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);

    try {
      const normalized = normalizeMSNCode(searchCode);

      // Try exact match
      let { data } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .ilike('referral_code', normalized)
        .single();

      // Try partial match if not found
      if (!data) {
        const { data: partial } = await supabase
          .from('profiles')
          .select('id, full_name, referral_code')
          .ilike('referral_code', `%${normalized.replace('MSN', '')}`)
          .single();
        data = partial;
      }

      if (data) {
        if (data.id === user?.id) {
          toast({ title: 'Info', description: 'Vous ne pouvez pas vous envoyer un message' });
          return;
        }
        if (!contacts.find(c => c.id === data!.id)) {
          setContacts(prev => [data!, ...prev]);
        }
        setSelectedContact(data);
        setSearchCode('');
      } else {
        toast({ title: 'Introuvable', description: 'Aucun utilisateur trouvé avec ce code MSN', variant: 'destructive' });
      }
    } finally {
      setSearching(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: show contact list or chat */}
      <div className="md:hidden">
        {selectedContact ? (
          <div className="flex flex-col h-[100dvh]">
            {/* Mobile chat header */}
            <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
              <Button variant="ghost" size="icon" onClick={() => setSelectedContact(null)} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {getInitials(selectedContact.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedContact.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedContact.referral_code}</p>
              </div>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Envoyez votre premier message
                </div>
              )}
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                      msg.from_user_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 text-right">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-border bg-card flex gap-2 items-end">
              <Textarea
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="resize-none text-base min-h-[40px] max-h-[120px]"
                rows={1}
              />
              <Button onClick={sendMessage} size="icon" className="shrink-0 h-10 w-10 rounded-full" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[100dvh]">
            {/* Mobile contacts header */}
            <div className="p-3 border-b border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Messages
                </h1>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Code MSN ex: MSN501596"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && searchContact()}
                  className="text-base"
                />
                <Button size="icon" onClick={searchContact} disabled={searching} className="shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact list */}
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {contacts.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Recherchez un utilisateur par code MSN pour démarrer</p>
                  </div>
                )}
                {contacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                        {getInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contact.full_name}</p>
                      <p className="text-xs text-muted-foreground">{contact.referral_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            Messagerie
          </h1>

          <div className="grid grid-cols-3 gap-4 h-[600px]">
            {/* Contacts */}
            <Card className="col-span-1 flex flex-col">
              <CardHeader className="pb-3 space-y-3">
                <CardTitle className="text-sm">Contacts</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Code MSN"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && searchContact()}
                    className="text-sm"
                  />
                  <Button size="icon" onClick={searchContact} disabled={searching} className="shrink-0">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="divide-y divide-border">
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                          selectedContact?.id === contact.id ? 'bg-primary/10' : 'hover:bg-accent/50'
                        }`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                            {getInitials(contact.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{contact.full_name}</p>
                          <p className="text-xs text-muted-foreground">{contact.referral_code}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="col-span-2 flex flex-col">
              {selectedContact ? (
                <>
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {getInitials(selectedContact.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm">{selectedContact.full_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{selectedContact.referral_code}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                    <ScrollArea className="flex-1 p-4">
                      <div ref={scrollRef} className="space-y-2">
                        {messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                                msg.from_user_id === user?.id
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className="text-[10px] opacity-60 mt-0.5 text-right">
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="p-3 border-t border-border flex gap-2 items-end">
                      <Textarea
                        placeholder="Votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="resize-none text-sm"
                        rows={2}
                      />
                      <Button onClick={sendMessage} size="icon" className="shrink-0 h-10 w-10 rounded-full" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">Recherchez un code MSN pour démarrer</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
