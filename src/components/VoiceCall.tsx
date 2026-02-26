import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';

export default function VoiceCall() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [calleeCode, setCalleeCode] = useState('');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callerName, setCallerName] = useState('');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const isCleaningUp = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    if (peerConnection.current) {
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }

    pendingCandidates.current = [];
    isCleaningUp.current = false;
  }, []);

  const endCall = useCallback(async () => {
    const callId = activeCallId;
    cleanup();
    setActiveCallId(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setIsOpen(false);
    setIsMuted(false);

    if (callId) {
      await supabase
        .from('call_sessions')
        .update({ status: 'ended' })
        .eq('id', callId);
    }
  }, [activeCallId, cleanup]);

  // Listen for incoming calls & call updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`voice-call-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${user.id}`,
      }, async (payload) => {
        const session = payload.new;
        if (session.status === 'pending') {
          // Get caller name
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('full_name, referral_code')
            .eq('id', session.caller_id)
            .single();

          setCallerName(callerProfile?.full_name || callerProfile?.referral_code || 'Moissonneur');
          setIncomingCall(session);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions',
      }, async (payload) => {
        const session = payload.new;

        // Only handle sessions we're part of
        if (session.caller_id !== user.id && session.callee_id !== user.id) return;

        if (session.status === 'ended' || session.status === 'rejected') {
          if (session.status === 'rejected' && session.caller_id === user.id) {
            toast({ title: 'Appel rejeté', description: 'Le destinataire a refusé l\'appel' });
          }
          if (activeCallId === session.id || incomingCall?.id === session.id) {
            cleanup();
            setActiveCallId(null);
            setCallStatus('idle');
            setIncomingCall(null);
            setIsOpen(false);
          }
          return;
        }

        // Caller receives answer
        if (session.status === 'accepted' && session.caller_id === user.id && peerConnection.current) {
          try {
            if (session.answer && peerConnection.current.signalingState === 'have-local-offer') {
              await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(session.answer as unknown as RTCSessionDescriptionInit)
              );
              // Add any pending ICE candidates
              for (const candidate of pendingCandidates.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
              }
              pendingCandidates.current = [];
              setCallStatus('connected');
            }
          } catch (err) {
            console.error('Error setting remote description (caller):', err);
          }
        }

        // Process ICE candidates from the other party
        if (session.ice_candidates && peerConnection.current) {
          const candidates = session.ice_candidates as any[];
          const myRole = session.caller_id === user.id ? 'caller' : 'callee';

          for (const entry of candidates) {
            if (entry.from !== myRole && entry.candidate) {
              try {
                if (peerConnection.current.remoteDescription) {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(entry.candidate));
                } else {
                  pendingCandidates.current.push(entry.candidate);
                }
              } catch (err) {
                // Ignore duplicate candidate errors
              }
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeCallId, incomingCall, cleanup]);

  const createPeerConnection = (callId: string, role: 'caller' | 'callee') => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
        remoteAudio.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          const { data: current } = await supabase
            .from('call_sessions')
            .select('ice_candidates')
            .eq('id', callId)
            .single();

          const existing = (current?.ice_candidates as any[]) || [];
          await supabase
            .from('call_sessions')
            .update({
              ice_candidates: [
                ...existing,
                { from: role, candidate: event.candidate.toJSON() },
              ] as any,
            })
            .eq('id', callId);
        } catch (err) {
          console.error('Error sending ICE candidate:', err);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        toast({ title: 'Appel terminé', description: 'La connexion a été perdue' });
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  // CRITICAL: getUserMedia called directly in click handler
  const initiateCall = async () => {
    if (!calleeCode.trim()) {
      toast({ title: 'Erreur', description: 'Entrez un code Moissonneur', variant: 'destructive' });
      return;
    }

    try {
      setCallStatus('calling');

      // Get microphone FIRST (must be in direct click handler)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.current = stream;

      // Find callee
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', calleeCode.toUpperCase())
        .single();

      if (!profile) {
        stream.getTracks().forEach(t => t.stop());
        localStream.current = null;
        toast({ title: 'Introuvable', description: 'Code moissonneur invalide', variant: 'destructive' });
        setCallStatus('idle');
        return;
      }

      if (profile.id === user?.id) {
        stream.getTracks().forEach(t => t.stop());
        localStream.current = null;
        toast({ title: 'Erreur', description: 'Vous ne pouvez pas vous appeler vous-même', variant: 'destructive' });
        setCallStatus('idle');
        return;
      }

      // Create session first to get callId
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user?.id,
          callee_id: profile.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !session) throw error || new Error('Failed to create session');

      setActiveCallId(session.id);

      // Create peer connection
      const pc = createPeerConnection(session.id, 'caller');

      // Add tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create and set offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Save offer to session
      await supabase
        .from('call_sessions')
        .update({ offer: offer as any })
        .eq('id', session.id);

      setCallStatus('ringing');

      // Auto-timeout after 30s
      setTimeout(() => {
        if (callStatus === 'ringing') {
          toast({ title: 'Pas de réponse', description: 'Le destinataire ne répond pas' });
          endCall();
        }
      }, 30000);

    } catch (error: any) {
      cleanup();
      if (error.name === 'NotAllowedError') {
        toast({ title: 'Microphone refusé', description: 'Autorisez l\'accès au microphone pour passer des appels', variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: error.message || 'Impossible de passer l\'appel', variant: 'destructive' });
      }
      setCallStatus('idle');
    }
  };

  // CRITICAL: getUserMedia called directly in click handler
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      // Get microphone FIRST (direct click handler)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.current = stream;

      setActiveCallId(incomingCall.id);

      // Get the latest session data with offer
      const { data: freshSession } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', incomingCall.id)
        .single();

      if (!freshSession?.offer) {
        throw new Error('Pas d\'offre d\'appel trouvée');
      }

      const pc = createPeerConnection(incomingCall.id, 'callee');

      // Add tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Set remote description (caller's offer)
      await pc.setRemoteDescription(
        new RTCSessionDescription(freshSession.offer as unknown as RTCSessionDescriptionInit)
      );

      // Add any existing ICE candidates from caller
      if (freshSession.ice_candidates) {
        const candidates = freshSession.ice_candidates as any[];
        for (const entry of candidates) {
          if (entry.from === 'caller' && entry.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(entry.candidate));
            } catch (err) {
              // Ignore
            }
          }
        }
      }

      // Create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      await supabase
        .from('call_sessions')
        .update({
          answer: answer as any,
          status: 'accepted',
        })
        .eq('id', incomingCall.id);

      setIncomingCall(null);
      setCallStatus('connected');

    } catch (error: any) {
      cleanup();
      if (error.name === 'NotAllowedError') {
        toast({ title: 'Microphone refusé', description: 'Autorisez l\'accès au microphone', variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
      setCallStatus('idle');
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'rejected' })
      .eq('id', incomingCall.id);

    setIncomingCall(null);
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto">
        <Phone className="h-4 w-4 mr-2" />
        Appel
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && callStatus === 'idle') setIsOpen(false); }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Appel Moissonneur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-2">
            {callStatus === 'idle' && (
              <>
                <Input
                  placeholder="Code Moissonneur (ex: ABC123)"
                  value={calleeCode}
                  onChange={(e) => setCalleeCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') initiateCall(); }}
                  className="text-base"
                />
                <Button onClick={initiateCall} className="w-full h-12">
                  <Phone className="h-5 w-5 mr-2" />
                  Appeler
                </Button>
              </>
            )}

            {(callStatus === 'calling' || callStatus === 'ringing') && (
              <div className="text-center py-8">
                <Phone className="h-16 w-16 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-lg font-semibold">
                  {callStatus === 'calling' ? 'Connexion...' : 'Ça sonne...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Code: {calleeCode}</p>
                <Button onClick={endCall} variant="destructive" className="mt-4">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-semibold">En communication</p>
                <div className="flex gap-3 justify-center mt-6">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    className="rounded-full h-14 w-14 p-0"
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    size="lg"
                    className="rounded-full h-14 w-14 p-0"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <audio ref={remoteAudio} autoPlay playsInline />
        </DialogContent>
      </Dialog>

      {/* Incoming call modal */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => rejectCall()}>
          <DialogContent className="w-[95vw] max-w-sm">
            <DialogHeader>
              <DialogTitle>📞 Appel entrant</DialogTitle>
            </DialogHeader>
            <div className="text-center py-6">
              <PhoneIncoming className="h-16 w-16 mx-auto mb-4 animate-bounce text-primary" />
              <p className="text-lg font-semibold mb-1">{callerName}</p>
              <p className="text-sm text-muted-foreground mb-6">vous appelle</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={acceptCall}
                  className="rounded-full h-14 w-14 p-0 bg-primary hover:bg-primary/90"
                >
                  <Phone className="h-6 w-6" />
                </Button>
                <Button
                  onClick={rejectCall}
                  variant="destructive"
                  className="rounded-full h-14 w-14 p-0"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
