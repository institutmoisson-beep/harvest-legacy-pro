import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CallSession {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  ice_candidates?: RTCIceCandidateInit[];
}

export default function VoiceCall() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [calleeCode, setCalleeCode] = useState('');
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    const channel = supabase
      .channel('call-signaling')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${user.id}`
      }, async (payload) => {
        const session = payload.new as CallSession;
        if (session.status === 'pending') {
          setIncomingCall(session);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions',
        filter: `caller_id=eq.${user.id}`
      }, async (payload) => {
        const session = payload.new as CallSession;
        if (session.status === 'accepted' && session.answer && peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(session.answer));
          setCallStatus('connected');
        } else if (session.status === 'rejected') {
          endCall();
          toast({ title: 'Appel rejeté', description: 'Le destinataire a rejeté l\'appel' });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Get local audio stream
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current!));
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'accéder au microphone', variant: 'destructive' });
      throw error;
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const initiateCall = async () => {
    if (!calleeCode) {
      toast({ title: 'Erreur', description: 'Entrez un code Moissonneur', variant: 'destructive' });
      return;
    }

    try {
      setCallStatus('calling');

      // Find callee by referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', calleeCode.toUpperCase())
        .single();

      if (!profile) {
        toast({ title: 'Introuvable', description: 'Code moissonneur invalide', variant: 'destructive' });
        setCallStatus('idle');
        return;
      }

      const pc = await setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Create call session
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user?.id,
          callee_id: profile.id,
          offer: offer as any,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setActiveCall(session as any);
      setCallStatus('ringing');

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate && session) {
          const { data: existingSession } = await supabase
            .from('call_sessions')
            .select('ice_candidates')
            .eq('id', session.id)
            .single();

          const candidates = (existingSession?.ice_candidates as any[]) || [];
          await supabase
            .from('call_sessions')
            .update({
              ice_candidates: [...candidates, event.candidate.toJSON()] as any
            })
            .eq('id', session.id);
        }
      };

    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setCallStatus('idle');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      setCallStatus('connected');
      const pc = await setupPeerConnection();

      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase
          .from('call_sessions')
          .update({
            answer: answer as any,
            status: 'accepted'
          })
          .eq('id', incomingCall.id);

        setActiveCall(incomingCall);
        setIncomingCall(null);

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            const { data: existingSession } = await supabase
              .from('call_sessions')
              .select('ice_candidates')
              .eq('id', incomingCall.id)
              .single();

            const candidates = (existingSession?.ice_candidates as any[]) || [];
            await supabase
              .from('call_sessions')
              .update({
                ice_candidates: [...candidates, event.candidate.toJSON()] as any
              })
              .eq('id', incomingCall.id);
          }
        };
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      endCall();
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

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (activeCall) {
      supabase
        .from('call_sessions')
        .update({ status: 'ended' })
        .eq('id', activeCall.id);
    }

    setActiveCall(null);
    setCallStatus('idle');
    setIsOpen(false);
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
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <Phone className="h-4 w-4 mr-2" />
        Appel
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appel Moissonneur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {callStatus === 'idle' && (
              <>
                <Input
                  placeholder="Code Moissonneur"
                  value={calleeCode}
                  onChange={(e) => setCalleeCode(e.target.value.toUpperCase())}
                />
                <Button onClick={initiateCall} className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler
                </Button>
              </>
            )}

            {callStatus === 'ringing' && (
              <div className="text-center py-8">
                <Phone className="h-16 w-16 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-lg font-semibold">Appel en cours...</p>
                <Button onClick={endCall} variant="destructive" className="mt-4">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="text-center py-8">
                <Phone className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold">En communication</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={toggleMute} variant="outline">
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button onClick={endCall} variant="destructive">
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Raccrocher
                  </Button>
                </div>
              </div>
            )}
          </div>

          <audio ref={remoteAudio} autoPlay />
        </DialogContent>
      </Dialog>

      {/* Incoming call modal */}
      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => rejectCall()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Appel entrant</DialogTitle>
            </DialogHeader>
            <div className="text-center py-8">
              <PhoneIncoming className="h-16 w-16 mx-auto mb-4 animate-bounce text-primary" />
              <p className="text-lg font-semibold mb-4">Un moissonneur vous appelle</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={acceptCall} variant="default">
                  <Phone className="h-4 w-4 mr-2" />
                  Accepter
                </Button>
                <Button onClick={rejectCall} variant="destructive">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}