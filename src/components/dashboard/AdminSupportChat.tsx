import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Send, Plus, User, Shield, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminSupportChatProps {
  userId: string;
  isAdmin?: boolean;
}

export default function AdminSupportChat({ userId, isAdmin = false }: AdminSupportChatProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-chat')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'admin_chat_conversations'
      }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_chat_messages'
      }, (payload) => {
        if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
          fetchMessages(selectedConversation.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchConversations = async () => {
    let query = (supabase.from as any)('admin_chat_conversations')
      .select(`
        *,
        profiles!admin_chat_conversations_user_id_fkey(full_name)
      `)
      .order('last_message_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data } = await query;

    if (data) {
      setConversations(data);
      
      // Auto-select first conversation if none selected
      if (!selectedConversation && data.length > 0) {
        setSelectedConversation(data[0]);
      }
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await (supabase.from as any)('admin_chat_messages')
      .select(`
        *,
        profiles!admin_chat_messages_sender_id_fkey(full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const createConversation = async () => {
    if (!newSubject.trim()) {
      toast({ title: 'Erreur', description: 'Le sujet est requis', variant: 'destructive' });
      return;
    }

    const { data, error } = await (supabase.from as any)('admin_chat_conversations')
      .insert({
        user_id: userId,
        subject: newSubject,
        priority: newPriority,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Conversation créée' });
      setNewConversationOpen(false);
      setNewSubject('');
      setNewPriority('normal');
      fetchConversations();
      setSelectedConversation(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const { error } = await (supabase.from as any)('admin_chat_messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: userId,
        message: newMessage,
        is_admin: isAdmin
      });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setNewMessage('');
      fetchMessages(selectedConversation.id);
    }
  };

  const updateConversationStatus = async (status: string) => {
    if (!selectedConversation) return;

    const { error } = await (supabase.from as any)('admin_chat_conversations')
      .update({ status })
      .eq('id', selectedConversation.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      fetchConversations();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Ouvert</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">En cours</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Résolu</Badge>;
      case 'closed':
        return <Badge variant="outline">Fermé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Haute</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normale</Badge>;
      case 'low':
        return <Badge variant="outline">Basse</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Conversations List */}
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {isAdmin ? 'Tous les tickets' : 'Mes conversations'}
          </CardTitle>
          {!isAdmin && (
            <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Sujet</label>
                    <Input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Décrivez votre problème..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priorité</label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createConversation} className="w-full">
                    Créer la conversation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm line-clamp-1">{conv.subject}</h4>
                      {getStatusBadge(conv.status)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityBadge(conv.priority)}
                      {isAdmin && conv.profiles && (
                        <span className="text-xs text-muted-foreground">
                          {conv.profiles.full_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.last_message_at).toLocaleString('fr-FR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="md:col-span-2">
        {selectedConversation ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{selectedConversation.subject}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedConversation.status)}
                    {getPriorityBadge(selectedConversation.priority)}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateConversationStatus('in_progress')}
                    >
                      En cours
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => updateConversationStatus('resolved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Résoudre
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] mb-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${msg.sender_id === userId ? 'order-2' : 'order-1'}`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                          {msg.is_admin ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium">
                            {msg.profiles?.full_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR')}
                          </span>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          msg.sender_id === userId 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Écrivez votre message..."
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez une conversation</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
