import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Send, Search, ArrowLeft, Plus, User } from 'lucide-react';
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
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

const normalizeMSNCode = (raw: string) => {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (/^\d+$/.test(trimmed)) return `MSN${trimmed}`;
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
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatCode, setNewChatCode] = useState('');
  const [searchingNew, setSearchingNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchContacts = async () => {
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('to_user_id')
      .eq('from_user_id', user?.id || '');

    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('from_user_id')
      .eq('to_user_id', user?.id || '');

    const contactIds = new Set<string>();
    sentMessages?.forEach(m => contactIds.add(m.to_user_id));
    receivedMessages?.forEach(m => contactIds.add(m.from_user_id));
    contactIds.delete(user?.id || '');

    if (contactIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', Array.from(contactIds));

      // Get last message & unread count for each contact
      const enriched: Contact[] = [];
      for (const p of profiles || []) {
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('content, created_at')
          .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${p.id}),and(from_user_id.eq.${p.id},to_user_id.eq.${user?.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('from_user_id', p.id)
          .eq('to_user_id', user?.id || '')
          .eq('read', false);

        enriched.push({
          ...p,
          lastMessage: lastMsgs?.[0]?.content,
          lastMessageTime: lastMsgs?.[0]?.created_at,
          unreadCount: count || 0,
        });
      }

      enriched.sort((a, b) => {
        const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tb - ta;
      });

      setContacts(enriched);
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

  const startNewChat = async () => {
    if (!newChatCode.trim()) return;
    setSearchingNew(true);
    try {
      const normalized = normalizeMSNCode(newChatCode);

      let { data } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .ilike('referral_code', normalized)
        .single();

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
          setContacts(prev => [{ ...data!, unreadCount: 0 }, ...prev]);
        }
        setSelectedContact(data);
        setNewChatCode('');
        setShowNewChat(false);
      } else {
        toast({ title: 'Introuvable', description: 'Aucun utilisateur trouvé avec ce code MSN', variant: 'destructive' });
      }
    } finally {
      setSearchingNew(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // New chat dialog
  const NewChatDialog = () => (
    <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Nouvelle Discussion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground text-center">
            Entrez le code Moissonneur de la personne avec qui vous souhaitez discuter
          </p>
          <Input
            placeholder="Ex: MSN501596"
            value={newChatCode}
            onChange={(e) => setNewChatCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && startNewChat()}
            className="h-14 text-center text-xl font-mono tracking-wider"
            autoFocus
          />
          <Button onClick={startNewChat} disabled={searchingNew || !newChatCode.trim()} className="w-full h-12">
            <MessageCircle className="h-5 w-5 mr-2" />
            {searchingNew ? 'Recherche...' : 'Démarrer la Discussion'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <NewChatDialog />

      {/* Mobile */}
      <div className="md:hidden">
        {selectedContact ? (
          <div className="flex flex-col h-[100dvh]">
            <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedContact(null); fetchContacts(); }} className="shrink-0">
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Envoyez votre premier message
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                    msg.from_user_id === user?.id
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 text-right">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-border bg-card flex gap-2 items-end">
              <Textarea
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
            <div className="p-3 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h1 className="text-lg font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Messages
                  </h1>
                </div>
                <Button size="icon" onClick={() => setShowNewChat(true)} className="shrink-0 rounded-full bg-primary text-primary-foreground h-10 w-10">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {contacts.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Appuyez sur <strong>+</strong> pour démarrer une discussion</p>
                  </div>
                )}
                {contacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                          {getInitials(contact.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {(contact.unreadCount ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{contact.full_name}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(contact.lastMessageTime)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{contact.lastMessage || contact.referral_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
              </Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="h-7 w-7 text-primary" /> Messagerie
              </h1>
            </div>
            <Button onClick={() => setShowNewChat(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nouvelle Discussion
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 h-[600px]">
            <Card className="col-span-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Discussions</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="divide-y divide-border">
                    {contacts.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        <p>Cliquez sur "Nouvelle Discussion" pour commencer</p>
                      </div>
                    )}
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                          selectedContact?.id === contact.id ? 'bg-primary/10' : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                              {getInitials(contact.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {(contact.unreadCount ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{contact.full_name}</p>
                            <span className="text-[10px] text-muted-foreground">{formatTime(contact.lastMessageTime)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{contact.lastMessage || contact.referral_code}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

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
                          <div key={msg.id} className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                              msg.from_user_id === user?.id
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}>
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
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
                  <p className="text-sm">Sélectionnez une discussion ou créez-en une nouvelle</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
