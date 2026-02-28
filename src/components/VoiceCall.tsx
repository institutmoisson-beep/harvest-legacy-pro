import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const CALL_CENTER_CODES = new Set(['MSN6161', 'MSN9191']);

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';
type CallMode = 'audio' | 'video';

interface VoiceCallProps {
  prefilledCode?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  quickDialMode?: CallMode;
}

export default function VoiceCall({
  prefilledCode,
  triggerLabel = 'Appel',
  triggerClassName,
  quickDialMode,
}: VoiceCallProps = {}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [calleeCode, setCalleeCode] = useState(prefilledCode || '');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callMode, setCallMode] = useState<CallMode>('audio');
  const [callerName, setCallerName] = useState('');
  const [incomingHasVideo, setIncomingHasVideo] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const processedCandidates = useRef<Set<string>>(new Set());
  const seenIncomingSessions = useRef<Set<string>>(new Set());
  const isCleaningUp = useRef(false);
  const ringTimer = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (prefilledCode) setCalleeCode(prefilledCode.toUpperCase());
  }, [prefilledCode]);

  const stopRingtone = useCallback(() => {
    if (ringTimer.current) {
      window.clearInterval(ringTimer.current);
      ringTimer.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const playTone = () => {
        const now = ctx.currentTime;
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'sine';
        o1.frequency.value = 880;
        g1.gain.setValueAtTime(0.0001, now);
        g1.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        o1.connect(g1).connect(ctx.destination);
        o1.start(now);
        o1.stop(now + 0.2);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.value = 660;
        g2.gain.setValueAtTime(0.0001, now + 0.22);
        g2.gain.exponentialRampToValueAtTime(0.12, now + 0.25);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        o2.connect(g2).connect(ctx.destination);
        o2.start(now + 0.22);
        o2.stop(now + 0.42);
      };

      playTone();
      ringTimer.current = window.setInterval(playTone, 1500);
    } catch {
      // Silent fallback if browser blocks autoplay.
    }

    if (navigator.vibrate) navigator.vibrate([250, 120, 250, 800]);
  }, [stopRingtone]);

  const notifyIncomingCall = useCallback((name: string) => {
    toast({
      title: '📞 Appel entrant',
      description: `${name} vous appelle`,
    });

    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('Appel entrant', {
        body: `${name} vous appelle sur Les Moissonneurs`,
      });
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const cleanup = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    stopRingtone();

    if (peerConnection.current) {
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;

    pendingCandidates.current = [];
    processedCandidates.current.clear();
    isCleaningUp.current = false;
  }, [stopRingtone]);

  const closeCallUI = useCallback(() => {
    setActiveCallId(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setIsOpen(false);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIncomingHasVideo(false);
  }, []);

  const endCallById = useCallback(async (callId?: string | null) => {
    const targetCallId = callId ?? activeCallId;
    cleanup();
    closeCallUI();

    if (!targetCallId) return;

    await supabase.from('call_sessions').update({ status: 'ended' }).eq('id', targetCallId);
    await supabase
      .from('call_center_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('call_session_id', targetCallId)
      .in('status', ['waiting', 'connecting', 'connected']);
    await supabase
      .from('call_center_agents')
      .update({ active_call_id: null, status: 'available' })
      .eq('active_call_id', targetCallId);
  }, [activeCallId, cleanup, closeCallUI]);

  const endCall = useCallback(async () => {
    await endCallById(activeCallId);
  }, [activeCallId, endCallById]);

  const createPeerConnection = useCallback((callId: string, role: 'caller' | 'callee') => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      if (remoteAudio.current) {
        remoteAudio.current.srcObject = stream;
        remoteAudio.current.play().catch(() => {});
      }

      const hasVideoTrack = stream.getVideoTracks().length > 0;
      if (hasVideoTrack && remoteVideo.current) {
        remoteVideo.current.srcObject = stream;
        remoteVideo.current.play().catch(() => {});
        setCallMode('video');
      }
    };

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;

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
            ice_candidates: [...existing, { from: role, candidate: event.candidate.toJSON() }] as any,
          })
          .eq('id', callId);
      } catch (err) {
        console.error('Error sending ICE candidate:', err);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        toast({ title: 'Appel terminé', description: 'La connexion a été perdue' });
        endCallById(callId);
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [endCallById]);

  useEffect(() => {
    if (!user) return;

    const handleIncomingSession = async (session: any) => {
      if (session.status !== 'pending' || session.callee_id !== user.id) return;
      if (seenIncomingSessions.current.has(session.id)) return;
      seenIncomingSessions.current.add(session.id);

      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('full_name, referral_code')
        .eq('id', session.caller_id)
        .single();

      const name = callerProfile?.full_name || callerProfile?.referral_code || 'Moissonneur';
      const hasVideo = Boolean((session.offer as any)?.sdp?.includes?.('m=video'));

      setCallerName(name);
      setIncomingHasVideo(hasVideo);
      setIncomingCall(session);
      startRingtone();
      notifyIncomingCall(name);
    };

    const channel = supabase
      .channel(`voice-call-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          await handleIncomingSession(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
        },
        async (payload) => {
          const session = payload.new;

          if (session.caller_id !== user.id && session.callee_id !== user.id) return;

          if (session.status === 'pending' && session.callee_id === user.id) {
            await handleIncomingSession(session);
          }

          if (session.status === 'ended' || session.status === 'rejected') {
            if (session.status === 'rejected' && session.caller_id === user.id) {
              toast({ title: 'Appel rejeté', description: 'Le destinataire a refusé l\'appel' });
            }
            if (activeCallId === session.id || incomingCall?.id === session.id) {
              cleanup();
              closeCallUI();
            }
            return;
          }

          if (session.status === 'accepted' && session.caller_id === user.id && peerConnection.current) {
            try {
              if (session.answer && peerConnection.current.signalingState === 'have-local-offer') {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(session.answer as unknown as RTCSessionDescriptionInit)
                );

                for (const candidate of pendingCandidates.current) {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];
                setCallStatus('connected');
                stopRingtone();
              }
            } catch (err) {
              console.error('Error setting remote description (caller):', err);
            }
          }

          if (session.ice_candidates && peerConnection.current) {
            const candidates = session.ice_candidates as any[];
            const myRole = session.caller_id === user.id ? 'caller' : 'callee';

            for (const entry of candidates) {
              if (entry.from === myRole || !entry.candidate) continue;

              const key = JSON.stringify(entry.candidate);
              if (processedCandidates.current.has(key)) continue;
              processedCandidates.current.add(key);

              try {
                if (peerConnection.current.remoteDescription) {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(entry.candidate));
                } else {
                  pendingCandidates.current.push(entry.candidate);
                }
              } catch {
                // Ignore duplicate candidate errors
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeCallId, incomingCall, cleanup, closeCallUI, notifyIncomingCall, startRingtone, stopRingtone]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const resolveCallee = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();

    if (CALL_CENTER_CODES.has(normalized)) {
      const { data: availableAgents } = await supabase
        .from('call_center_agents')
        .select('id, user_id, is_vip_handler')
        .eq('status', 'available')
        .order('is_vip_handler', { ascending: normalized === 'MSN6161' })
        .order('updated_at', { ascending: true })
        .limit(1);

      const agent = availableAgents?.[0];
      if (agent?.user_id) {
        return {
          calleeId: agent.user_id,
          agentId: agent.id,
          isCenterCall: true,
        };
      }

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .gte('access_level', 80)
        .limit(1);

      const adminUserId = adminRoles?.[0]?.user_id;
      if (adminUserId) {
        return {
          calleeId: adminUserId,
          isCenterCall: true,
        };
      }

      throw new Error('Aucun agent centre d\'appel disponible pour le moment');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', normalized)
      .single();

    if (!profile) {
      throw new Error('Code moissonneur invalide');
    }

    if (profile.id === user?.id) {
      throw new Error('Vous ne pouvez pas vous appeler vous-même');
    }

    return {
      calleeId: profile.id,
      isCenterCall: false,
    };
  }, [user?.id]);

  const setupLocalMedia = useCallback(async (mode: CallMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video:
        mode === 'video'
          ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
    });

    localStream.current = stream;
    if (mode === 'video' && localVideo.current) {
      localVideo.current.srcObject = stream;
      localVideo.current.muted = true;
      localVideo.current.play().catch(() => {});
    }

    return stream;
  }, []);

  const initiateCall = async (mode: CallMode) => {
    if (!calleeCode.trim()) {
      toast({ title: 'Erreur', description: 'Entrez un code Moissonneur', variant: 'destructive' });
      return;
    }

    try {
      setCallMode(mode);
      setCallStatus('calling');
      setIsOpen(true);

      const stream = await setupLocalMedia(mode);
      const target = await resolveCallee(calleeCode);

      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user?.id,
          callee_id: target.calleeId,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !session) throw error || new Error('Impossible de créer la session');

      setActiveCallId(session.id);

      if (target.isCenterCall && user?.id) {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('referral_code, full_name')
          .eq('id', user.id)
          .single();

        await supabase.from('call_center_queue').insert({
          call_session_id: session.id,
          caller_id: user.id,
          caller_code: callerProfile?.referral_code || 'UNKNOWN',
          caller_name: callerProfile?.full_name || null,
          status: 'connecting',
          wait_start_at: new Date().toISOString(),
          assigned_agent_id: target.agentId,
          priority: calleeCode.toUpperCase() === 'MSN9191' ? 10 : 5,
          is_vip: false,
        });

        if (target.agentId) {
          await supabase
            .from('call_center_agents')
            .update({ status: 'busy', active_call_id: session.id, last_active_at: new Date().toISOString() })
            .eq('id', target.agentId);
        }
      }

      const pc = createPeerConnection(session.id, 'caller');
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('call_sessions').update({ offer: offer as any }).eq('id', session.id);

      setCallStatus('ringing');

      window.setTimeout(async () => {
        const { data: latest } = await supabase
          .from('call_sessions')
          .select('status')
          .eq('id', session.id)
          .single();

        if (latest?.status === 'pending') {
          toast({ title: 'Pas de réponse', description: 'Le destinataire ne répond pas' });
          await endCallById(session.id);
        }
      }, 30000);
    } catch (error: any) {
      cleanup();
      closeCallUI();

      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Accès micro/caméra refusé',
          description: 'Autorisez le micro et la caméra pour passer des appels',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erreur', description: error.message || 'Impossible de passer l\'appel', variant: 'destructive' });
      }
    }
  };

  const acceptCall = async (mode: CallMode) => {
    if (!incomingCall) return;

    try {
      stopRingtone();
      setCallMode(mode);
      setIsOpen(true);

      const stream = await setupLocalMedia(mode);
      setActiveCallId(incomingCall.id);

      const { data: freshSession } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', incomingCall.id)
        .single();

      if (!freshSession?.offer) {
        throw new Error('Pas d\'offre d\'appel trouvée');
      }

      const hasVideoInOffer = Boolean((freshSession.offer as any)?.sdp?.includes?.('m=video'));
      setIncomingHasVideo(hasVideoInOffer);

      const pc = createPeerConnection(incomingCall.id, 'callee');
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(
        new RTCSessionDescription(freshSession.offer as unknown as RTCSessionDescriptionInit)
      );

      if (freshSession.ice_candidates) {
        const candidates = freshSession.ice_candidates as any[];
        for (const entry of candidates) {
          if (entry.from !== 'caller' || !entry.candidate) continue;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(entry.candidate));
          } catch {
            // Ignore
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase
        .from('call_sessions')
        .update({ answer: answer as any, status: 'accepted' })
        .eq('id', incomingCall.id);

      await supabase
        .from('call_center_queue')
        .update({ status: 'connected', connected_at: new Date().toISOString() })
        .eq('call_session_id', incomingCall.id)
        .in('status', ['waiting', 'connecting']);

      await supabase
        .from('call_center_agents')
        .update({ status: 'busy', active_call_id: incomingCall.id, last_active_at: new Date().toISOString() })
        .eq('user_id', user?.id || '');

      setIncomingCall(null);
      setCallStatus('connected');
    } catch (error: any) {
      cleanup();
      closeCallUI();
      if (error.name === 'NotAllowedError') {
        toast({ title: 'Accès micro/caméra refusé', description: 'Autorisez les permissions pour répondre', variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    stopRingtone();

    await supabase.from('call_sessions').update({ status: 'rejected' }).eq('id', incomingCall.id);
    await supabase
      .from('call_center_queue')
      .update({ status: 'abandoned', completed_at: new Date().toISOString(), abandon_reason: 'Call rejected' })
      .eq('call_session_id', incomingCall.id)
      .in('status', ['waiting', 'connecting']);

    setIncomingCall(null);
  };

  const toggleMute = () => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!localStream.current) return;
    localStream.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
  };

  return (
    <>
      <Button
        onClick={() => {
          if (quickDialMode) {
            if (prefilledCode) setCalleeCode(prefilledCode.toUpperCase());
            initiateCall(quickDialMode);
            return;
          }
          setIsOpen(true);
        }}
        variant="outline"
        size="sm"
        className={triggerClassName || 'w-full sm:w-auto'}
      >
        <Phone className="h-4 w-4 mr-2" />
        {triggerLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && callStatus === 'idle') setIsOpen(false); }}>
        <DialogContent className="w-screen max-w-none h-[100dvh] sm:h-auto sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-6 pb-3 border-b border-border/60">
            <DialogTitle className="text-xl flex items-center justify-between gap-2">
              <span>Appel Moissonneur</span>
              <span className="text-sm font-normal text-muted-foreground">
                {callMode === 'video' ? 'Vidéo' : 'Audio'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5 pb-8 max-h-[calc(100dvh-88px)] sm:max-h-[75vh] overflow-y-auto">
            {callStatus === 'idle' && (
              <>
                <Input
                  placeholder="Code Moissonneur (ex: ABC123 ou MSN6161)"
                  value={calleeCode}
                  onChange={(e) => setCalleeCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') initiateCall('audio'); }}
                  className="text-base h-12"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={() => initiateCall('audio')} className="w-full h-14 text-base">
                    <Phone className="h-5 w-5 mr-2" />
                    Appel audio
                  </Button>
                  <Button onClick={() => initiateCall('video')} variant="secondary" className="w-full h-14 text-base">
                    <Video className="h-5 w-5 mr-2" />
                    Appel vidéo
                  </Button>
                </div>
              </>
            )}

            {(callStatus === 'calling' || callStatus === 'ringing') && (
              <div className="text-center py-10">
                <Phone className="h-20 w-20 mx-auto mb-5 animate-pulse text-primary" />
                <p className="text-2xl font-semibold mb-2">
                  {callStatus === 'calling' ? 'Connexion...' : 'Ça sonne...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Code: {calleeCode}</p>
                <Button onClick={endCall} variant="destructive" className="mt-6 h-12 px-8 text-base">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="space-y-4">
                {callMode === 'video' ? (
                  <div className="relative rounded-xl border border-border overflow-hidden bg-muted/30">
                    <video ref={remoteVideo} autoPlay playsInline className="w-full aspect-video object-cover bg-black" />
                    <video
                      ref={localVideo}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-3 right-3 w-28 h-20 rounded-md object-cover border border-border bg-black"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <Phone className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-lg font-semibold">En communication</p>
                  </div>
                )}

                <div className="flex gap-3 justify-center mt-2">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    className="rounded-full h-16 w-16 p-0"
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>

                  {callMode === 'video' && (
                    <Button
                      onClick={toggleVideo}
                      variant={isVideoEnabled ? 'outline' : 'secondary'}
                      size="lg"
                      className="rounded-full h-16 w-16 p-0"
                    >
                      {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    </Button>
                  )}

                  <Button
                    onClick={endCall}
                    variant="destructive"
                    size="lg"
                    className="rounded-full h-16 w-16 p-0"
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

      {incomingCall && (
        <Dialog open={!!incomingCall} onOpenChange={() => rejectCall()}>
          <DialogContent className="w-[96vw] max-w-sm">
            <DialogHeader>
              <DialogTitle>📞 Appel entrant</DialogTitle>
            </DialogHeader>
            <div className="text-center py-6 space-y-4">
              <PhoneIncoming className="h-16 w-16 mx-auto animate-bounce text-primary" />
              <div>
                <p className="text-xl font-semibold mb-1">{callerName}</p>
                <p className="text-sm text-muted-foreground">vous appelle {incomingHasVideo ? 'en vidéo' : 'en audio'}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <Button
                  onClick={() => acceptCall('audio')}
                  className="h-14"
                  title="Répondre en audio"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => acceptCall('video')}
                  variant="secondary"
                  className="h-14"
                  title="Répondre en vidéo"
                >
                  <Video className="h-5 w-5" />
                </Button>
                <Button
                  onClick={rejectCall}
                  variant="destructive"
                  className="h-14"
                  title="Refuser"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
