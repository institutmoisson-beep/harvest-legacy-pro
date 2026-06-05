import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Camera, CheckCircle2, AlertTriangle, XCircle, RotateCcw, Loader2 } from 'lucide-react';

type Status = 'idle' | 'scanning' | 'loading' | 'success' | 'warning' | 'error';

interface Verified {
  id: string;
  full_name: string;
  id_moissonneur: string;
  avatar_url: string | null;
  est_souverain: boolean;
  career_level: string | null;
}

export default function VerifierMoissonneur() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [member, setMember] = useState<Verified | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const verifyToken = async (token: string) => {
    setStatus('loading');
    try {
      const { data, error } = await (supabase as any).rpc('verify_moissonneur', { _token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setErrorMsg('Code inconnu ou invalide. Risque de contrefaçon.');
        setStatus('error');
        return;
      }
      setMember(row);
      setStatus(row.est_souverain ? 'success' : 'warning');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erreur de vérification');
      setStatus('error');
    }
  };

  // Auto-verify if token comes via URL (QR redirect)
  useEffect(() => {
    const t = params.get('token');
    if (t) verifyToken(t);
  }, []);

  const startScan = async () => {
    setMember(null);
    setErrorMsg('');
    setStatus('scanning');
    await new Promise((r) => setTimeout(r, 100));
    try {
      const html5 = new Html5Qrcode(containerId);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          await html5.stop().catch(() => {});
          scannerRef.current = null;
          // Extract token from URL or use raw value
          let token = decoded;
          try {
            const url = new URL(decoded);
            token = url.searchParams.get('token') || decoded;
          } catch {}
          verifyToken(token);
        },
        () => {}
      );
    } catch (e: any) {
      setErrorMsg('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setStatus('error');
    }
  };

  const reset = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setMember(null);
    setErrorMsg('');
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const bgClass =
    status === 'success'
      ? 'from-green-500/20 via-background to-green-500/10'
      : status === 'warning'
      ? 'from-orange-500/20 via-background to-orange-500/10'
      : status === 'error'
      ? 'from-red-500/30 via-background to-red-500/10 animate-pulse'
      : 'from-background via-background to-primary/5';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} py-6 px-4 transition-all duration-500`}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold gradient-text-cosmic">Vérificateur de Communauté</h1>
          <div className="w-16" />
        </div>

        {status === 'idle' && (
          <Card className="p-6 text-center space-y-4">
            <Camera className="h-16 w-16 mx-auto text-primary" />
            <h2 className="text-lg font-semibold">Scannez la carte d'un Moissonneur</h2>
            <p className="text-sm text-muted-foreground">
              Activez votre caméra pour scanner le QR code et vérifier instantanément
              l'authenticité d'un membre de la communauté.
            </p>
            <Button onClick={startScan} size="lg" className="w-full">
              <Camera className="h-5 w-5 mr-2" />
              Activer la caméra
            </Button>
          </Card>
        )}

        {status === 'scanning' && (
          <Card className="p-4 space-y-4">
            <div
              id={containerId}
              className="rounded-xl overflow-hidden bg-black"
              style={{ minHeight: 320 }}
            />
            <p className="text-center text-sm text-muted-foreground">
              Cadrez le QR code dans le viseur…
            </p>
            <Button variant="outline" onClick={reset} className="w-full">
              Annuler
            </Button>
          </Card>
        )}

        {status === 'loading' && (
          <Card className="p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Vérification en cours…</p>
          </Card>
        )}

        {status === 'success' && member && (
          <Card className="p-6 border-green-500 border-2 bg-green-500/5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-20 w-20 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-green-600 tracking-widest">VÉRIFIÉ ✅</p>
              <p className="text-2xl font-bold mt-2">{member.full_name}</p>
              <p className="text-sm text-muted-foreground font-mono">{member.id_moissonneur}</p>
            </div>
            {member.avatar_url && (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                className="w-24 h-24 rounded-full mx-auto border-4 border-green-500 object-cover"
              />
            )}
            <div className="text-center space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                ★ PACK SOUVERAIN ACTIF
              </span>
              {member.career_level && (
                <p className="text-xs text-muted-foreground">Niveau : {member.career_level}</p>
              )}
            </div>
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Scanner un autre
            </Button>
          </Card>
        )}

        {status === 'warning' && member && (
          <Card className="p-6 border-orange-500 border-2 bg-orange-500/5 space-y-4 animate-scale-in">
            <AlertTriangle className="h-20 w-20 text-orange-500 mx-auto" />
            <div className="text-center">
              <p className="text-xs font-bold text-orange-600 tracking-widest">MEMBRE INACTIF</p>
              <p className="text-2xl font-bold mt-2">{member.full_name}</p>
              <p className="text-sm text-muted-foreground font-mono">{member.id_moissonneur}</p>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Ce profil existe mais l'adhésion Souverain n'est pas active.
            </p>
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Scanner un autre
            </Button>
          </Card>
        )}

        {status === 'error' && (
          <Card className="p-6 border-red-500 border-2 bg-red-500/10 space-y-4 animate-scale-in">
            <XCircle className="h-20 w-20 text-red-500 mx-auto animate-pulse" />
            <div className="text-center">
              <p className="text-xs font-bold text-red-600 tracking-widest">ALERTE FRAUDE ❌</p>
              <p className="text-base font-semibold mt-2">{errorMsg}</p>
            </div>
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Réessayer
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
