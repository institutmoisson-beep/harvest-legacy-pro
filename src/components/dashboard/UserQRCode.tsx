import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UserQRCode() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if QR code exists
      const { data: existingQR } = await supabase
        .from('user_qr_codes')
        .select('qr_code_data')
        .eq('user_id', user.id)
        .single();

      if (existingQR) {
        setQrCode(existingQR.qr_code_data);
      } else {
        // Generate new QR code data
        const qrData = `MSN-${user.id.substring(0, 8)}`;
        
        const { error } = await supabase
          .from('user_qr_codes')
          .insert({ user_id: user.id, qr_code_data: qrData });

        if (error) throw error;
        setQrCode(qrData);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Votre Code QR
        </CardTitle>
        <CardDescription>
          Partagez ce code pour des transactions rapides
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-lg">
          <div className="text-2xl font-mono font-bold text-center text-black">
            {qrCode}
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Scannez ce code avec l'application Moissonneur
        </p>
      </CardContent>
    </Card>
  );
}
