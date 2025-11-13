import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Phone, PhoneOff, Mic, MicOff, Plus, MonitorUp, MonitorOff, MessageSquare, Send, Video, VideoOff, Circle } from 'lucide-react';
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const screenPeerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const currentUserIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteScreenRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

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
    if (localVideoRef.current && localStreamRef.current && isVideoEnabled) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isVideoEnabled]);

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      });
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
          await createPeerConnection(participant.user_id, true, 'audio');
        }
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const createPeerConnection = async (targetUserId: string, createOffer: boolean, type: 'audio' | 'screen' | 'video') => {
    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const peerConnection = new RTCPeerConnection(config);
    let stream: MediaStream | null = null;

    if (type === 'screen') {
      stream = screenStreamRef.current;
    } else {
      stream = localStreamRef.current;
    }
    
    stream?.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream!);
    });

    peerConnection.ontrack = (event) => {
      if (type === 'screen' && remoteScreenRef.current) {
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
          signal_data: { candidate: event.candidate, type }
        });
      }
    };

    const connectionMap = type === 'screen' ? screenPeerConnectionsRef : peerConnectionsRef;
    connectionMap.current.set(targetUserId, { connection: peerConnection, userId: targetUserId });

    if (createOffer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      const sb: any = supabase;
      const signalType = type === 'screen' ? 'screen-share-offer' : type === 'video' ? 'video-offer' : 'offer';
      await sb.from('group_call_signals').insert({
        call_id: activeCall!.id,
        from_user_id: currentUserIdRef.current!,
        to_user_id: targetUserId,
        signal_type: signalType,
        signal_data: { sdp: offer.sdp }
      });
    }

    return peerConnection;
  };

  const handleIncomingSignal = async (signal: any) => {
    if (signal.to_user_id !== currentUserIdRef.current) return;

    const type = signal.signal_data.type || 'audio';
    const isScreen = signal.signal_type.includes('screen-share');
    const isVideo = signal.signal_type.includes('video');
    const connectionMap = isScreen ? screenPeerConnectionsRef : peerConnectionsRef;
    let peerConn = connectionMap.current.get(signal.from_user_id);
    
    if (!peerConn && (signal.signal_type.includes('offer'))) {
      peerConn = { 
        connection: await createPeerConnection(signal.from_user_id, false, isScreen ? 'screen' : isVideo ? 'video' : 'audio'),
        userId: signal.from_user_id
      };
    }

    if (!peerConn) return;

    if (signal.signal_type.includes('offer')) {
      await peerConn.connection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.signal_data.sdp }));
      const answer = await peerConn.connection.createAnswer();
      await peerConn.connection.setLocalDescription(answer);
      
      const sb: any = supabase;
      const answerType = isScreen ? 'screen-share-answer' : isVideo ? 'video-answer' : 'answer';
      await sb.from('group_call_signals').insert({
        call_id: activeCall!.id,
        from_user_id: currentUserIdRef.current!,
        to_user_id: signal.from_user_id,
        signal_type: answerType,
        signal_data: { sdp: answer.sdp }
      });
    } else if (signal.signal_type.includes('answer')) {
      await peerConn.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.signal_data.sdp }));
    } else if (signal.signal_type === 'ice-candidate') {
      await peerConn.connection.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
    }
  };

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          const sb: any = supabase;
          const { data: existingParticipants } = await sb
            .from('group_call_participants')
            .select('user_id')
            .eq('call_id', activeCall!.id)
            .neq('user_id', currentUserIdRef.current!)
            .is('left_at', null);

          if (existingParticipants) {
            for (const participant of existingParticipants) {
              await createPeerConnection(participant.user_id, true, 'video');
            }
          }
        }
        
        setIsVideoEnabled(true);
        toast({ title: "Caméra activée" });
      } catch (error: any) {
        toast({ title: "Erreur", description: "Impossible d'activer la caméra", variant: "destructive" });
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current?.removeTrack(videoTrack);
      }
      setIsVideoEnabled(false);
      toast({ title: "Caméra désactivée" });
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
            await createPeerConnection(participant.user_id, true, 'screen');
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

  const startRecording = async () => {
    if (!localStreamRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, options);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await saveRecording();
      };

      mediaRecorderRef.current.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      toast({ title: "Enregistrement démarré" });
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de démarrer l'enregistrement", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "Enregistrement arrêté" });
    }
  };

  const saveRecording = async () => {
    if (recordedChunksRef.current.length === 0 || !activeCall) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
    const fileName = `${currentUserIdRef.current}/${activeCall.id}-${Date.now()}.webm`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const sb: any = supabase;
      const { error: dbError } = await sb
        .from('call_recordings')
        .insert({
          call_id: activeCall.id,
          recorded_by: currentUserIdRef.current,
          file_path: fileName,
          duration_seconds: duration,
          file_size_bytes: blob.size
        });

      if (dbError) throw dbError;

      toast({ title: "Succès", description: "Enregistrement sauvegardé" });
    } catch (error: any) {
      toast({ title: "Erreur", description: "Échec de la sauvegarde", variant: "destructive" });
    }
  };

  const leaveCall = async () => {
    if (isRecording) {
      stopRecording();
    }

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
    setIsVideoEnabled(false);
    
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
          <span className="hidden sm:inline">Appel</span>
          {isInCall && (
            <span className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isInCall ? activeCall?.name : 'Appels de Groupe'}
          </DialogTitle>
        </DialogHeader>

        {isInCall ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="text-xs">
                {participants.length} participant{participants.length > 1 ? 's' : ''}
              </Badge>
              {isRecording && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  <Circle className="h-2 w-2 mr-1 fill-current" />
                  REC
                </Badge>
              )}
            </div>

            {isVideoEnabled && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {isScreenSharing && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={remoteScreenRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="participants" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="participants">
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-card">
                        <span className="text-xs">{(p.profiles as any)?.full_name || 'Utilisateur'}</span>
                        {p.is_muted && <MicOff className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="chat">
                <div className="space-y-2">
                  <ScrollArea className="h-[120px] pr-2">
                    <div className="space-y-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col p-2 rounded-lg ${msg.user_id === currentUserIdRef.current ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}>
                          <span className="text-[9px] font-semibold text-muted-foreground">
                            {(msg.profiles as any)?.full_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs">{msg.content}</span>
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
                      className="text-xs"
                    />
                    <Button onClick={sendMessage} size="icon" className="shrink-0 h-8 w-8">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Button onClick={toggleMute} variant="outline" size="sm">
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Button onClick={toggleVideo} variant="outline" size="sm">
                {isVideoEnabled ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              </Button>
              <Button onClick={toggleScreenShare} variant="outline" size="sm">
                {isScreenSharing ? <MonitorOff className="h-3 w-3" /> : <MonitorUp className="h-3 w-3" />}
              </Button>
              <Button 
                onClick={isRecording ? stopRecording : startRecording} 
                variant={isRecording ? "destructive" : "outline"} 
                size="sm"
              >
                <Circle className={`h-3 w-3 ${isRecording ? 'fill-current' : ''}`} />
              </Button>
              <Button onClick={leaveCall} variant="destructive" size="sm" className="col-span-2">
                <PhoneOff className="h-3 w-3 mr-1" />
                <span className="text-xs">Quitter</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nom de l'appel..."
                value={newCallName}
                onChange={(e) => setNewCallName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createCall()}
                className="text-xs"
              />
              <Button onClick={createCall} size="icon" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {availableCalls.map(call => (
                  <div key={call.id} className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{call.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(call.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button onClick={() => joinCall(call)} size="sm" className="ml-2 shrink-0 h-7">
                      <Phone className="h-3 w-3 mr-1" />
                      <span className="text-[10px]">Rejoindre</span>
                    </Button>
                  </div>
                ))}
                {availableCalls.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
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
