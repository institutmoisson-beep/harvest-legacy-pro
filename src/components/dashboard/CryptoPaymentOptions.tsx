import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function CryptoPaymentOptions() {
  const [cryptoSettings, setCryptoSettings] = useState<any[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchCryptoSettings();
  }, []);

  const fetchCryptoSettings = async () => {
    const { data } = await (supabase.from as any)('crypto_payment_settings')
      .select('*')
      .eq('is_active', true);

    setCryptoSettings(data || []);
  };

  const copyAddress = (address: string, currency: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(currency);
    toast({ title: 'Copié!', description: `Adresse ${currency} copiée` });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (cryptoSettings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options de paiement Crypto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cryptoSettings.map(crypto => (
          <div key={crypto.id} className="p-3 bg-accent/5 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{crypto.currency}</h4>
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                Crypto
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-background rounded text-xs font-mono overflow-hidden text-ellipsis">
                {crypto.wallet_address}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyAddress(crypto.wallet_address, crypto.currency)}
              >
                {copiedAddress === crypto.currency ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Envoyez vos {crypto.currency} à cette adresse et contactez l'admin pour confirmation
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
