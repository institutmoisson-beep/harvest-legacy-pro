import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { QrCode, Download, Eye, EyeOff } from 'lucide-react';

export default function UserQRCode() {
  const { user } = useAuth();
  const [qrData, setQrData] = useState<string>('');
  const [secretCode, setSecretCode] = useState<string>('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchQRCode();
    }
  }, [user]);

  const fetchQRCode = async () => {
    try {
      const { data, error } = await supabase
        .from('user_qr_codes' as any)
        .select('qr_data, secret_code')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setQrData((data as any).qr_data);
        setSecretCode((data as any).secret_code);
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `moissonneur-qr-${user?.id}.png`;
      link.href = url;
      link.click();
    }
  };

  if (loading) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Mon QR Code Moissonneur
        </CardTitle>
        <CardDescription>
          Votre code QR et code secret pour les transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
          <div className="text-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
              alt="QR Code"
              className="mx-auto"
              id="qr-canvas"
            />
            <p className="mt-2 text-xs text-muted-foreground">Scannez ce code chez un agent</p>
          </div>
        </div>

        {/* Secret Code */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-semibold mb-2">Code Secret</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold font-mono">
              {showSecret ? secretCode : '••••••'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Gardez ce code confidentiel
          </p>
        </div>

        {/* Download Button */}
        <Button onClick={downloadQRCode} variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Télécharger le QR Code
        </Button>

        <div className="p-3 bg-accent/10 border border-accent/20 rounded text-xs space-y-1">
          <p className="font-semibold">Utilisation</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Présentez ce QR code à un agent pour retirer</li>
            <li>• Le code secret valide votre identité</li>
            <li>• Ne partagez jamais votre code secret</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
