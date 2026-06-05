import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Download, ScanLine, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface ProfileCard {
  id: string;
  full_name: string;
  avatar_url: string | null;
  id_moissonneur: string;
  verification_token: string;
  est_souverain: boolean;
  career_level: string | null;
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function CarteMoissonneur() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);
  const now = useLiveClock();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url, id_moissonneur, verification_token, est_souverain, career_level')
        .eq('id', user.id)
        .single();
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const verifyUrl = profile
    ? `${window.location.origin}/verify?token=${profile.verification_token}`
    : '';

  const timeStr = now.toLocaleTimeString('fr-FR');
  const dateStr = now.toLocaleDateString('fr-FR');

  const downloadPDF = async () => {
    if (!profile) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
    // Recto
    pdf.setFillColor(15, 15, 18);
    pdf.rect(0, 0, 85.6, 54, 'F');
    pdf.setTextColor(212, 175, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('MOISSONNEUR SOUVERAIN', 42.8, 6, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setTextColor(245, 240, 220);
    pdf.text(profile.full_name || '—', 4, 22);
    pdf.setFontSize(6);
    pdf.setTextColor(200, 180, 120);
    pdf.text(`N° ${profile.id_moissonneur}`, 4, 28);
    pdf.text('VALIDITÉ : PERMANENTE', 4, 33);
    pdf.text(`Statut : ${profile.est_souverain ? 'SOUVERAIN ACTIF' : 'EN COURS'}`, 4, 38);
    pdf.setFontSize(5);
    pdf.text(`Émise le ${dateStr} ${timeStr}`, 4, 50);
    // QR placeholder text (real QR via image would need toDataURL)
    try {
      const svg = document.querySelector('#card-qr svg') as SVGSVGElement | null;
      if (svg) {
        const xml = new XMLSerializer().serializeToString(svg);
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
        // Convert svg to canvas via image
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
          img.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,256,256);
        ctx.drawImage(img, 0, 0, 256, 256);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 62, 18, 20, 20);
      }
    } catch {}

    // Verso
    pdf.addPage([85.6, 54], 'landscape');
    pdf.setFillColor(15, 15, 18);
    pdf.rect(0, 0, 85.6, 54, 'F');
    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(7);
    pdf.text('ACADÉMIE DES MOISSONNEURS', 42.8, 6, { align: 'center' });
    pdf.setFontSize(4.5);
    pdf.setTextColor(220, 210, 180);
    const txt = "Cette carte est strictement personnelle et incessible. Toute reproduction ou usage frauduleux est passible de poursuites. La vérification s'effectue exclusivement via l'application officielle. Le porteur s'engage à respecter la charte communautaire et le règlement intérieur de l'Institut Moisson.";
    const lines = pdf.splitTextToSize(txt, 78);
    pdf.text(lines, 4, 14);
    pdf.setDrawColor(212, 175, 55);
    pdf.setFillColor(40, 35, 20);
    pdf.roundedRect(28, 30, 30, 10, 1, 1, 'FD');
    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(5);
    pdf.text('HOLOGRAMME', 43, 36, { align: 'center' });
    pdf.text('AUTHENTIQUE', 43, 39, { align: 'center' });
    pdf.setFontSize(4);
    pdf.setTextColor(180, 160, 100);
    pdf.text('Signature du titulaire :', 4, 48);
    pdf.line(28, 48, 60, 48);

    pdf.save(`carte-moissonneur-${profile.id_moissonneur}.pdf`);
    toast({ title: 'Carte téléchargée', description: 'PDF recto-verso prêt.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-xl font-bold gradient-text-cosmic">Ma Carte Moissonneur</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/verifier')}>
            <ScanLine className="h-4 w-4 mr-1" /> Scanner
          </Button>
        </div>

        {/* 3D Card Flip */}
        <div className="perspective-1000 mx-auto" style={{ perspective: '1500px' }}>
          <div
            className="relative w-full aspect-[1.586/1] transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* RECTO */}
            <div
              ref={rectoRef}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                background:
                  'linear-gradient(135deg, #0a0a0d 0%, #1a1612 50%, #0a0a0d 100%)',
                border: '2px solid #d4af37',
                boxShadow: '0 25px 60px -15px rgba(212, 175, 55, 0.35)',
              }}
            >
              {/* Filigree pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #d4af37 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, #d4af37 0 1px, transparent 1px 14px)',
                }}
              />
              <div className="relative h-full flex flex-col p-3 sm:p-5 text-[#f5f0dc]">
                <div className="text-center">
                  <p
                    className="text-[10px] sm:text-xs font-bold tracking-[0.25em]"
                    style={{ color: '#d4af37', textShadow: '0 0 8px rgba(212,175,55,0.5)' }}
                  >
                    MOISSONNEUR SOUVERAIN
                  </p>
                  <div className="h-px w-2/3 mx-auto my-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                </div>

                <div className="flex-1 flex items-center gap-3 mt-2">
                  <div
                    className="w-16 h-20 sm:w-20 sm:h-24 rounded-md overflow-hidden flex-shrink-0"
                    style={{ border: '2px solid #d4af37', boxShadow: '0 0 12px rgba(212,175,55,0.4)' }}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3a2f1a] to-[#1a1612] flex items-center justify-center text-2xl text-[#d4af37]">
                        {profile.full_name?.charAt(0) || 'M'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm sm:text-base font-bold truncate" style={{ color: '#f5f0dc' }}>
                      {profile.full_name}
                    </p>
                    <p className="text-[10px] sm:text-xs font-mono" style={{ color: '#d4af37' }}>
                      N° {profile.id_moissonneur}
                    </p>
                    <p className="text-[8px] sm:text-[10px] tracking-widest" style={{ color: '#b8a070' }}>
                      VALIDITÉ : PERMANENTE
                    </p>
                    <p
                      className="inline-block text-[8px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: profile.est_souverain ? 'rgba(212,175,55,0.2)' : 'rgba(120,120,120,0.2)',
                        color: profile.est_souverain ? '#d4af37' : '#999',
                        border: `1px solid ${profile.est_souverain ? '#d4af37' : '#666'}`,
                      }}
                    >
                      {profile.est_souverain ? '★ PACK SOUVERAIN ACTIF' : 'EN COURS D\'ACTIVATION'}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2 mt-1">
                  <div>
                    <div
                      className="text-2xl sm:text-3xl font-serif italic"
                      style={{ color: '#d4af37', textShadow: '0 0 10px rgba(212,175,55,0.5)' }}
                    >
                      Moisson
                    </div>
                    <div className="text-[7px] sm:text-[8px] font-mono mt-1" style={{ color: '#b8a070' }}>
                      🕒 {timeStr} — {dateStr}
                    </div>
                  </div>
                  <div id="card-qr" className="bg-white p-1 rounded">
                    <QRCodeSVG value={verifyUrl} size={56} level="H" />
                  </div>
                </div>
              </div>
            </div>

            {/* VERSO */}
            <div
              ref={versoRef}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background:
                  'linear-gradient(135deg, #0a0a0d 0%, #1a1612 50%, #0a0a0d 100%)',
                border: '2px solid #d4af37',
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #d4af37 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, #d4af37 0 1px, transparent 1px 14px)',
                }}
              />
              <div className="relative h-full flex flex-col p-3 sm:p-4 text-[#f5f0dc]">
                <p
                  className="text-center text-[10px] sm:text-xs font-bold tracking-[0.2em]"
                  style={{ color: '#d4af37' }}
                >
                  ACADÉMIE DES MOISSONNEURS
                </p>
                <div className="h-px w-full my-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

                <p className="text-[8px] sm:text-[9px] font-bold mt-1" style={{ color: '#d4af37' }}>
                  CONDITIONS D'UTILISATION & SÉCURITÉ
                </p>
                <p className="text-[7px] sm:text-[8px] leading-snug mt-1" style={{ color: '#cfc4a0' }}>
                  Cette carte est strictement personnelle et incessible. Toute reproduction
                  ou usage frauduleux est passible de poursuites. La vérification s'effectue
                  exclusivement via l'application officielle. Le porteur s'engage à respecter
                  la charte communautaire de l'Institut Moisson.
                </p>

                <div className="flex-1 flex items-center justify-center my-1">
                  <div
                    className="px-4 py-2 rounded-md text-center"
                    style={{
                      background:
                        'linear-gradient(135deg, #d4af37 0%, #f5e89a 25%, #d4af37 50%, #8b6f1f 75%, #d4af37 100%)',
                      backgroundSize: '200% 200%',
                      animation: 'shimmer 3s ease infinite',
                      boxShadow: '0 0 18px rgba(212,175,55,0.6)',
                    }}
                  >
                    <p className="text-[8px] sm:text-[10px] font-black text-[#1a1612] tracking-wider">
                      HOLOGRAMME AUTHENTIQUE
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-bold text-[#1a1612]">
                      MS · OFFICIEL
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[7px] sm:text-[8px]" style={{ color: '#b8a070' }}>
                    Signature du titulaire :
                  </p>
                  <div
                    className="font-signature italic text-base sm:text-lg pl-2 border-b"
                    style={{ color: '#f5f0dc', borderColor: '#d4af37', fontFamily: 'cursive' }}
                  >
                    {profile.full_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={() => setFlipped(!flipped)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retourner la carte
          </Button>
          <Button onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
          <Button onClick={() => navigate('/verifier')} variant="secondary">
            <ScanLine className="h-4 w-4 mr-2" />
            Vérifier un membre
          </Button>
        </div>

        <Card className="p-4 bg-card/60">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Sécurité anti-fraude</p>
              <p>
                L'horloge en temps réel affichée sur la carte prouve qu'il s'agit de
                l'application authentique et non d'une capture d'écran. Tout vérificateur
                doit scanner le QR code via l'outil officiel pour confirmer l'identité.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
