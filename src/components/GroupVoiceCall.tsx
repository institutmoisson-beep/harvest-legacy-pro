import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Phone, PhoneOff, Mic, MicOff, Plus, MonitorUp, MonitorOff, MessageSquare, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface GroupCall {
  id: string;
  name: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  profiles: {
    full_name: string;
  };
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface PeerConnection {
  connection: RTCPeerConnection;
  userId: string;
}

export default function GroupVoiceCall() {
  const [open, setOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<GroupCall | null>(null);
  const [availableCalls, setAvailableCalls] = useState<GroupCall[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newCallName, setNewCallName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const screenPeerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const currentUserIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteScreenRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      currentUserIdRef.current = data.user?.id || null;
    });
  }, []);

  useEffect(() => {
    if (open) {
      fetchAvailableCalls();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeCall) return;

    const participantsChannel = supabase
      .channel(`call-participants-${activeCall.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_call_participants',
        filter: `call_id=eq.${activeCall.id}`
      }, async () => {
        await fetchParticipants(activeCall.id);
      })
      .subscribe();

    const signalsChannel = supabase
      .channel(`call-signals-${activeCall.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_call_signals',
        filter: `call_id=eq.${activeCall.id}`
      }, async (payload: any) => {
        await handleIncomingSignal(payload.new);
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`call-messages-${activeCall.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_call_messages',
        filter: `call_id=eq.${activeCall.id}`
      }, async () => {
        await fetchMessages(activeCall.id);
      })
      .subscribe();

    fetchMessages(activeCall.id);

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [activeCall]);

  const fetchAvailableCalls = async () => {
    const sb: any = supabase;
    const { data } = await sb
      .from('group_voice_calls')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) setAvailableCalls(data);
  };

  const fetchParticipants = async (callId: string) => {
    const sb: any = supabase;
    const { data } = await sb
      .from('group_call_participants')
      .select(`
        id,
        user_id,
        is_muted,
        profiles:user_id (full_name)
      `)
      .eq('call_id', callId)
      .is('left_at', null);
    
    if (data) setParticipants(data);
  };

  const fetchMessages = async (callId: string) => {
    const sb: any = supabase;
    const { data } = await sb
      .from('group_call_messages')
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles:user_id (full_name)
      `)
      .eq('call_id', callId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeCall) return;

    const sb: any = supabase;
    const { error } = await sb
      .from('group_call_messages')
      .insert({
        call_id: activeCall.id,
        user_id: currentUserIdRef.current,
        content: newMessage.trim()
      });

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer le message", variant: "destructive" });
    } else {
      setNewMessage('');
    }
  };

  const createCall = async () => {
    if (!newCallName.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer un nom pour l'appel", variant: "destructive" });
      return;
    }

    const sb: any = supabase;
    const { data, error } = await sb
      .from('group_voice_calls')
      .insert({ name: newCallName })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    setNewCallName('');
    await joinCall(data);
  };

  const joinCall = async (call: GroupCall) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const sb: any = supabase;
      await sb
        .from('group_call_participants')
        .insert({ call_id: call.id, user_id: currentUserIdRef.current! });

      setActiveCall(call);
      setIsInCall(true);
      await fetchParticipants(call.id);

      toast({ title: "Connecté", description: `Vous avez rejoint "${call.name}"` });

      const { data: existingParticipants } = await sb
        .from('group_call_participants')
        .select('user_id')
        .eq('call_id', call.id)
        .neq('user_id', currentUserIdRef.current!)
        .is('left_at', null);

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          await createPeerConnection(participant.user_id, true, false);
        }
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const createPeerConnection = async (targetUserId: string, createOffer: boolean, isScreen: boolean) => {
    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const peerConnection = new RTCPeerConnection(config);
    const stream = isScreen ? screenStreamRef.current : localStreamRef.current;
    
    stream?.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      if (isScreen && remoteScreenRef.current) {
        remoteScreenRef.current.srcObject = event.streams[0];
      } else {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
      }
    };

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate && activeCall) {
        const sb: any = supabase;
        await sb.from('group_call_signals').insert({
          call_id: activeCall.id,
          from_user_id: currentUserIdRef.current!,
          to_user_id: targetUserId,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate, isScreen }
        });
      }
    };

    const connectionMap = isScreen ? screenPeerConnectionsRef : peerConnectionsRef;
    connectionMap.current.set(targetUserId, { connection: peerConnection, userId: targetUserId });

    if (createOffer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      const sb: any = supabase;
      await sb.from('group_call_signals').insert({
        call_id: activeCall!.id,
        from_user_id: currentUserIdRef.current!,
        to_user_id: targetUserId,
        signal_type: isScreen ? 'screen-share-offer' : 'offer',
        signal_data: { sdp: offer.sdp }
      });
    }

    return peerConnection;
  };

  const handleIncomingSignal = async (signal: any) => {
    if (signal.to_user_id !== currentUserIdRef.current) return;

    const isScreen = signal.signal_type.includes('screen-share') || signal.signal_data.isScreen;
    const connectionMap = isScreen ? screenPeerConnectionsRef : peerConnectionsRef;
    let peerConn = connectionMap.current.get(signal.from_user_id);
    
    if (!peerConn && (signal.signal_type === 'offer' || signal.signal_type === 'screen-share-offer')) {
      peerConn = { 
        connection: await createPeerConnection(signal.from_user_id, false, isScreen),
        userId: signal.from_user_id
      };
    }

    if (!peerConn) return;

    if (signal.signal_type === 'offer' || signal.signal_type === 'screen-share-offer') {
      await peerConn.connection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.signal_data.sdp }));
      const answer = await peerConn.connection.createAnswer();
      await peerConn.connection.setLocalDescription(answer);
      
      const sb: any = supabase;
      await sb.from('group_call_signals').insert({
        call_id: activeCall!.id,
        from_user_id: currentUserIdRef.current!,
        to_user_id: signal.from_user_id,
        signal_type: isScreen ? 'screen-share-answer' : 'answer',
        signal_data: { sdp: answer.sdp }
      });
    } else if (signal.signal_type === 'answer' || signal.signal_type === 'screen-share-answer') {
      await peerConn.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.signal_data.sdp }));
    } else if (signal.signal_type === 'ice-candidate') {
      await peerConn.connection.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;

        const sb: any = supabase;
        const { data: existingParticipants } = await sb
          .from('group_call_participants')
          .select('user_id')
          .eq('call_id', activeCall!.id)
          .neq('user_id', currentUserIdRef.current!)
          .is('left_at', null);

        if (existingParticipants) {
          for (const participant of existingParticipants) {
            await createPeerConnection(participant.user_id, true, true);
          }
        }

        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
        toast({ title: "Partage d'écran activé" });
      } catch (error: any) {
        toast({ title: "Erreur", description: "Impossible de partager l'écran", variant: "destructive" });
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenPeerConnectionsRef.current.forEach(peer => peer.connection.close());
    screenPeerConnectionsRef.current.clear();
    setIsScreenSharing(false);
    toast({ title: "Partage d'écran arrêté" });
  };

  const leaveCall = async () => {
    if (activeCall) {
      const sb: any = supabase;
      await sb
        .from('group_call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', activeCall.id)
        .eq('user_id', currentUserIdRef.current!);
    }

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionsRef.current.forEach(peer => peer.connection.close());
    peerConnectionsRef.current.clear();

    if (isScreenSharing) {
      stopScreenShare();
    }

    setActiveCall(null);
    setIsInCall(false);
    setParticipants([]);
    setMessages([]);
    
    toast({ title: "Déconnecté", description: "Vous avez quitté l'appel" });
  };

  const toggleMute = async () => {
    if (localStreamRef.current && activeCall) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      const sb: any = supabase;
      await sb
        .from('group_call_participants')
        .update({ is_muted: !audioTrack.enabled })
        .eq('call_id', activeCall.id)
        .eq('user_id', currentUserIdRef.current!);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Appel Groupe</span>
          {isInCall && (
            <span className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl md:text-2xl">
            {isInCall ? activeCall?.name : 'Appels Vocaux de Groupe'}
          </DialogTitle>
        </DialogHeader>

        {isInCall ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="text-xs sm:text-sm">
                {participants.length} participant{participants.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {isScreenSharing && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={remoteScreenRef}
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="participants" className="text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs sm:text-sm">
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Chat
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="participants">
                <ScrollArea className="h-[150px] sm:h-[200px]">
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-card">
                        <span className="text-xs sm:text-sm">{(p.profiles as any)?.full_name || 'Utilisateur'}</span>
                        {p.is_muted && <MicOff className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="chat">
                <div className="space-y-2">
                  <ScrollArea className="h-[150px] sm:h-[200px] pr-2">
                    <div className="space-y-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col p-2 rounded-lg ${msg.user_id === currentUserIdRef.current ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}>
                          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">
                            {(msg.profiles as any)?.full_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs sm:text-sm">{msg.content}</span>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="text-xs sm:text-sm"
                    />
                    <Button onClick={sendMessage} size="icon" className="shrink-0">
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button onClick={toggleMute} variant="outline" size="sm" className="w-full">
                {isMuted ? <MicOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> : <Mic className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{isMuted ? 'Activer' : 'Couper'}</span>
              </Button>
              <Button onClick={toggleScreenShare} variant="outline" size="sm" className="w-full">
                {isScreenSharing ? <MonitorOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> : <MonitorUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">Écran</span>
              </Button>
              <Button onClick={leaveCall} variant="destructive" size="sm" className="col-span-2 w-full">
                <PhoneOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Quitter
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'appel..."
                  value={newCallName}
                  onChange={(e) => setNewCallName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createCall()}
                  className="text-xs sm:text-sm"
                />
                <Button onClick={createCall} size="icon" className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] sm:h-[350px]">
              <div className="space-y-2">
                {availableCalls.map(call => (
                  <div key={call.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs sm:text-sm">{call.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {new Date(call.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button onClick={() => joinCall(call)} size="sm" className="ml-2 shrink-0">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-[10px] sm:text-xs">Rejoindre</span>
                    </Button>
                  </div>
                ))}
                {availableCalls.length === 0 && (
                  <div className="text-center text-xs sm:text-sm text-muted-foreground py-8">
                    Aucun appel actif. Créez-en un!
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
