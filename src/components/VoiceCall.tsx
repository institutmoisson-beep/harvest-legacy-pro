import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Delete,
  Circle,
  Dot,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CALL_CENTER_CODES = new Set(['MSN6161', 'MSN9191']);
const CALL_CENTER_ALIASES: Record<string, string> = {
  '6161': 'MSN6161',
  '9191': 'MSN9191',
  '*6161': 'MSN6161',
  '*9191': 'MSN9191',
};

const DIAL_PAD_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected';
type CallMode = 'audio' | 'video';

interface VoiceCallProps {
  prefilledCode?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  quickDialMode?: CallMode;
  listenIncoming?: boolean;
}

const normalizeDialCode = (raw: string) => {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, '');
  return CALL_CENTER_ALIASES[normalized] || normalized;
};

export default function VoiceCall({
  prefilledCode,
  triggerLabel = 'Appel',
  triggerClassName,
  quickDialMode,
  listenIncoming = true,
}: VoiceCallProps = {}) {
  const { user } = useAuth();

  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [calleeCode, setCalleeCode] = useState(prefilledCode ? normalizeDialCode(prefilledCode) : '');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callMode, setCallMode] = useState<CallMode>('audio');
  const [callerName, setCallerName] = useState('');
  const [incomingHasVideo, setIncomingHasVideo] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(0);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (prefilledCode) setCalleeCode(normalizeDialCode(prefilledCode));
  }, [prefilledCode]);

  useEffect(() => {
    if (!connectedAt) return;
    const id = window.setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [connectedAt]);

  const callDuration = useMemo(() => {
    if (!connectedAt) return '00:00';
    const seconds = Math.floor((Date.now() - connectedAt) / 1000);
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [connectedAt, clockTick]);

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
        g1.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        o1.connect(g1).connect(ctx.destination);
        o1.start(now);
        o1.stop(now + 0.2);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.value = 660;
        g2.gain.setValueAtTime(0.0001, now + 0.22);
        g2.gain.exponentialRampToValueAtTime(0.14, now + 0.26);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.43);
        o2.connect(g2).connect(ctx.destination);
        o2.start(now + 0.22);
        o2.stop(now + 0.43);
      };

      playTone();
      ringTimer.current = window.setInterval(playTone, 1500);
    } catch {
      // Autoplay may block sound in some browsers; notification+vibration remain active.
    }

    if (navigator.vibrate) navigator.vibrate([220, 110, 220, 900]);
  }, [stopRingtone]);

  const stopRecording = useCallback((download = true) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    if (!download) {
      recordedChunksRef.current = [];
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

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
    stopRecording(false);

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
    setConnectedAt(null);
    isCleaningUp.current = false;
  }, [stopRecording, stopRingtone]);

  const closeCallUI = useCallback(() => {
    setActiveCallId(null);
    setCallStatus('idle');
    setIncomingCall(null);
    setIsDialerOpen(false);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIncomingHasVideo(false);
    setConnectedAt(null);
  }, []);

  const endCallById = useCallback(
    async (callId?: string | null) => {
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
    },
    [activeCallId, cleanup, closeCallUI]
  );

  const endCall = useCallback(async () => {
    await endCallById(activeCallId);
  }, [activeCallId, endCallById]);

  const createPeerConnection = useCallback(
    (callId: string, role: 'caller' | 'callee') => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        if (remoteAudio.current) {
          remoteAudio.current.srcObject = stream;
          remoteAudio.current.play().catch(() => {});
        }

        if (stream.getVideoTracks().length > 0 && remoteVideo.current) {
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
    },
    [endCallById]
  );

  useEffect(() => {
    if (!user || !listenIncoming) return;

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
                setConnectedAt(Date.now());
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
  }, [
    user,
    listenIncoming,
    activeCallId,
    incomingCall,
    cleanup,
    closeCallUI,
    notifyIncomingCall,
    startRingtone,
    stopRingtone,
  ]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const resolveCallee = useCallback(
    async (code: string) => {
      const normalized = normalizeDialCode(code);

      if (CALL_CENTER_CODES.has(normalized)) {
        let agentQuery = supabase
          .from('call_center_agents')
          .select('id, user_id, is_vip_handler')
          .eq('status', 'available');

        if (user?.id) {
          agentQuery = agentQuery.neq('user_id', user.id);
        }

        const { data: availableAgents } = await agentQuery
          .order('is_vip_handler', { ascending: normalized === 'MSN6161' })
          .order('updated_at', { ascending: true })
          .limit(1);

        const agent = availableAgents?.[0];
        if (agent?.user_id) {
          return {
            calleeId: agent.user_id,
            agentId: agent.id,
            isCenterCall: true,
            normalizedCode: normalized,
          };
        }

        let adminQuery = supabase.from('user_roles').select('user_id').gte('access_level', 80);
        if (user?.id) {
          adminQuery = adminQuery.neq('user_id', user.id);
        }

        const { data: adminRoles } = await adminQuery.limit(1);

        const adminUserId = adminRoles?.[0]?.user_id;
        if (adminUserId) {
          return {
            calleeId: adminUserId,
            isCenterCall: true,
            normalizedCode: normalized,
          };
        }

        throw new Error('Aucun agent centre d\'appel disponible. Un administrateur doit désigner un agent actif.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('referral_code', normalized)
        .single();

      if (!profile) {
        throw new Error('Code Moissonneur invalide');
      }

      if (profile.id === user?.id) {
        throw new Error('Vous ne pouvez pas vous appeler vous-même');
      }

      return {
        calleeId: profile.id,
        isCenterCall: false,
        normalizedCode: normalized,
      };
    },
    [user?.id]
  );

  const setupLocalMedia = useCallback(async (mode: CallMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: mode === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
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
      const normalizedCode = normalizeDialCode(calleeCode);
      setCalleeCode(normalizedCode);
      setCallMode(mode);
      setCallStatus('calling');
      setIsDialerOpen(false);

      const stream = await setupLocalMedia(mode);
      const target = await resolveCallee(normalizedCode);

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
          priority: target.normalizedCode === 'MSN9191' ? 10 : 5,
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

      await pc.setRemoteDescription(new RTCSessionDescription(freshSession.offer as unknown as RTCSessionDescriptionInit));

      if (freshSession.ice_candidates) {
        const candidates = freshSession.ice_candidates as any[];
        for (const entry of candidates) {
          if (entry.from !== 'caller' || !entry.candidate) continue;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(entry.candidate));
          } catch {
            // ignore duplicated candidates
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from('call_sessions').update({ answer: answer as any, status: 'accepted' }).eq('id', incomingCall.id);

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
      setConnectedAt(Date.now());
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
    setIsMuted((v) => !v);
  };

  const toggleVideo = () => {
    if (!localStream.current) return;
    localStream.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoEnabled((v) => !v);
  };

  const toggleRecording = () => {
    if (!localStream.current) {
      toast({ title: 'Erreur', description: 'Aucun flux à enregistrer', variant: 'destructive' });
      return;
    }

    if (isRecording) {
      stopRecording(true);
      toast({ title: 'Enregistrement arrêté', description: 'Le fichier a été téléchargé.' });
      return;
    }

    try {
      const preferedMime =
        callMode === 'video' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : '';

      recordedChunksRef.current = [];

      const recorder = preferedMime
        ? new MediaRecorder(localStream.current, { mimeType: preferedMime })
        : new MediaRecorder(localStream.current);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;

        const blob = new Blob(recordedChunksRef.current, {
          type: callMode === 'video' ? 'video/webm' : 'audio/webm',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `appel-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      toast({ title: 'Enregistrement lancé' });
    } catch {
      toast({ title: 'Erreur', description: 'Enregistrement non supporté sur cet appareil', variant: 'destructive' });
    }
  };

  const appendDialChar = (char: string) => {
    setCalleeCode((prev) => (prev + char).slice(0, 16));
  };

  const removeDialChar = () => {
    setCalleeCode((prev) => prev.slice(0, -1));
  };

  const priorityCallVisible = Boolean(incomingCall) || callStatus !== 'idle';

  return (
    <>
      <Button
        onClick={() => {
          if (quickDialMode) {
            if (prefilledCode) setCalleeCode(normalizeDialCode(prefilledCode));
            initiateCall(quickDialMode);
            return;
          }
          setIsDialerOpen(true);
        }}
        variant="outline"
        size="sm"
        className={triggerClassName || 'w-full sm:w-auto'}
      >
        <Phone className="h-4 w-4 mr-2" />
        {triggerLabel}
      </Button>

      <Dialog open={isDialerOpen && !priorityCallVisible} onOpenChange={setIsDialerOpen}>
        <DialogContent className="w-screen max-w-none h-[100dvh] sm:h-auto sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-border/60">
            <DialogTitle className="text-base text-center">Composeur d'appel</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-6 pt-4 space-y-4 bg-background">
            <Input
              placeholder="Code Moissonneur / 6161 / 9191"
              value={calleeCode}
              onChange={(e) => setCalleeCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') initiateCall('audio');
              }}
              className="h-14 text-center text-2xl font-mono tracking-widest"
            />

            <div className="grid grid-cols-3 gap-3">
              {DIAL_PAD_KEYS.map((keyItem) => (
                <Button
                  key={keyItem.digit}
                  type="button"
                  variant="outline"
                  onClick={() => appendDialChar(keyItem.digit)}
                  className="h-16 rounded-2xl flex flex-col items-center justify-center"
                >
                  <span className="text-xl font-semibold leading-none">{keyItem.digit}</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-1">{keyItem.letters || <Dot className="h-3 w-3" />}</span>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <Button variant="ghost" className="h-12" onClick={() => setCalleeCode('')}>
                Effacer
              </Button>
              <Button className="h-12" onClick={() => initiateCall('audio')}>
                <Phone className="h-5 w-5 mr-2" />
                Appeler
              </Button>
              <Button variant="ghost" className="h-12" onClick={removeDialChar}>
                <Delete className="h-5 w-5" />
              </Button>
            </div>

            <Button variant="secondary" className="w-full h-12" onClick={() => initiateCall('video')}>
              <Video className="h-5 w-5 mr-2" />
              Appel vidéo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {priorityCallVisible && (
        <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm px-4 py-6 sm:px-6 sm:py-8 flex flex-col justify-between">
          {incomingCall ? (
            <div className="h-full flex flex-col justify-between">
              <div className="text-center mt-6">
                <PhoneIncoming className="h-20 w-20 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Appel entrant</p>
                <p className="text-3xl font-bold mt-2">{callerName}</p>
                <p className="text-base text-muted-foreground mt-2">
                  {incomingHasVideo ? 'Appel vidéo' : 'Appel audio'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button onClick={rejectCall} variant="destructive" className="h-16 rounded-2xl text-base">
                  <PhoneOff className="h-5 w-5 mr-2" />
                  Refuser
                </Button>
                <Button onClick={() => acceptCall(incomingHasVideo ? 'video' : 'audio')} className="h-16 rounded-2xl text-base">
                  <Phone className="h-5 w-5 mr-2" />
                  Décrocher
                </Button>
              </div>

              <Button onClick={() => acceptCall('video')} variant="secondary" className="h-14 rounded-2xl mb-2">
                <Video className="h-5 w-5 mr-2" />
                Répondre en vidéo
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between">
              {(callStatus === 'calling' || callStatus === 'ringing') && (
                <div className="text-center mt-10">
                  <Phone className="h-24 w-24 mx-auto mb-5 animate-pulse text-primary" />
                  <p className="text-3xl font-bold">{callStatus === 'calling' ? 'Connexion…' : 'Sonnerie…'}</p>
                  <p className="text-base text-muted-foreground mt-3">{calleeCode}</p>
                </div>
              )}

              {callStatus === 'connected' && (
                <div className="space-y-4 mt-2">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">En communication</p>
                    <p className="text-3xl font-bold mt-2">{callDuration}</p>
                    <p className="text-sm text-muted-foreground mt-2">Code: {calleeCode}</p>
                  </div>

                  {callMode === 'video' ? (
                    <div className="relative rounded-2xl border border-border overflow-hidden bg-muted/30">
                      <video ref={remoteVideo} autoPlay playsInline className="w-full aspect-video object-cover bg-muted" />
                      <video
                        ref={localVideo}
                        autoPlay
                        playsInline
                        muted
                        className="absolute bottom-3 right-3 w-28 h-20 rounded-xl object-cover border border-border bg-muted"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border p-8 text-center bg-card/50">
                      <Phone className="h-10 w-10 mx-auto text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Audio en cours</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? 'destructive' : 'outline'}
                  className="h-14 rounded-2xl"
                >
                  {isMuted ? <MicOff className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                  {isMuted ? 'Muet' : 'Micro'}
                </Button>

                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? 'outline' : 'secondary'}
                  className="h-14 rounded-2xl"
                  disabled={callMode !== 'video'}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5 mr-2" /> : <VideoOff className="h-5 w-5 mr-2" />}
                  Caméra
                </Button>

                <Button
                  onClick={toggleRecording}
                  variant={isRecording ? 'destructive' : 'outline'}
                  className="h-14 rounded-2xl"
                  disabled={callStatus !== 'connected'}
                >
                  {isRecording ? <Circle className="h-5 w-5 mr-2 fill-current" /> : <Circle className="h-5 w-5 mr-2" />}
                  {isRecording ? 'REC' : 'Enregistrer'}
                </Button>

                <Button onClick={endCall} variant="destructive" className="h-14 rounded-2xl">
                  <PhoneOff className="h-5 w-5 mr-2" />
                  Couper
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <audio ref={remoteAudio} autoPlay playsInline />
    </>
  );
}
