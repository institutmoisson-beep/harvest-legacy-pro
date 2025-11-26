import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Loader2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  response?: any;
  error?: string;
  timestamp?: string;
}

export default function PaymentWebhookTester() {
  const [waveResult, setWaveResult] = useState<TestResult>({ status: 'idle' });
  const [lygosResult, setLygosResult] = useState<TestResult>({ status: 'idle' });
  const [coinpaymentsResult, setCoinpaymentsResult] = useState<TestResult>({ status: 'idle' });
  const [transactionId, setTransactionId] = useState('');

  const testWebhook = async (
    provider: 'wave' | 'lygos' | 'coinpayments',
    payload: any,
    setter: (result: TestResult) => void
  ) => {
    setter({ status: 'testing' });

    try {
      const functionUrl = `/functions/v1/payment-webhook-${provider}`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setter({
          status: 'success',
          response: data,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Test réussi',
          description: `Le webhook ${provider} a été traité avec succès`,
        });
      } else {
        setter({
          status: 'error',
          error: data.error || 'Erreur inconnue',
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Erreur',
          description: data.error || 'Erreur lors du test',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setter({
        status: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Erreur de connexion',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  const testWave = () => {
    const payload = {
      transactionId: transactionId || 'wave-test-' + Date.now(),
      status: 'SUCCESSFUL',
      amount: 1500,
      currency: 'XAF',
      timestamp: new Date().toISOString(),
    };
    testWebhook('wave', payload, setWaveResult);
  };

  const testLygos = () => {
    const payload = {
      paymentId: transactionId || 'lygos-test-' + Date.now(),
      status: 'COMPLETED',
      amount: 1500,
      timestamp: new Date().toISOString(),
    };
    testWebhook('lygos', payload, setLygosResult);
  };

  const testCoinPayments = () => {
    const payload = {
      txn_id: transactionId || 'btc-test-' + Date.now(),
      status: '1', // 1 = successful
      amount: '0.00022',
      currency: 'BTC',
      received: '0.00022',
      amountf: '0.00022000',
      receivedf: '0.00022000',
      timestamp: new Date().toISOString(),
    };
    testWebhook('coinpayments', payload, setCoinpaymentsResult);
  };

  const copyUrl = (provider: string) => {
    const url = `${window.location.origin}/functions/v1/payment-webhook-${provider}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'URL copiée',
      description: 'L\'URL du webhook a été copiée',
    });
  };

  const ResultDisplay = ({ result, provider }: { result: TestResult; provider: string }) => {
    if (result.status === 'idle') {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Cliquez sur "Tester le webhook" pour commencer</p>
        </div>
      );
    }

    if (result.status === 'testing') {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {result.status === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ Webhook traité avec succès
            </AlertDescription>
          </Alert>
        )}

        {result.status === 'error' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              ❌ Erreur: {result.error}
            </AlertDescription>
          </Alert>
        )}

        {result.timestamp && (
          <p className="text-xs text-muted-foreground">
            Heure: {new Date(result.timestamp).toLocaleString('fr-FR')}
          </p>
        )}

        {result.response && (
          <div className="bg-gray-50 p-3 rounded border text-sm font-mono text-xs overflow-auto max-h-48">
            <pre>{JSON.stringify(result.response, null, 2)}</pre>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-2">URL du webhook pour {provider}:</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-gray-100 p-2 rounded text-xs break-all">
              {window.location.origin}/functions/v1/payment-webhook-{provider}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyUrl(provider)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Test des Webhooks de Paiement</CardTitle>
        <CardDescription>
          Testez les webhooks avant de les configurer chez les fournisseurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration du test */}
        <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900">Configuration du test</p>
          <Input
            placeholder="ID de transaction (optionnel - généré automatiquement si vide)"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-blue-700">
            💡 Laissez vide pour générer un ID unique à chaque test
          </p>
        </div>

        {/* Onglets des tests */}
        <Tabs defaultValue="wave" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wave">
              📱 Wave
            </TabsTrigger>
            <TabsTrigger value="lygos">
              💳 Lygos
            </TabsTrigger>
            <TabsTrigger value="coinpayments">
              ₿ CoinPayments
            </TabsTrigger>
          </TabsList>

          {/* Wave */}
          <TabsContent value="wave" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Test Wave Paiement</p>
              <p className="text-xs text-muted-foreground">
                Simule un paiement réussi via Wave Money
              </p>
            </div>
            <ResultDisplay result={waveResult} provider="wave" />
            <Button
              onClick={testWave}
              disabled={waveResult.status === 'testing'}
              className="w-full"
            >
              {waveResult.status === 'testing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                '📱 Tester le webhook Wave'
              )}
            </Button>
          </TabsContent>

          {/* Lygos */}
          <TabsContent value="lygos" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Test Lygos Paiement</p>
              <p className="text-xs text-muted-foreground">
                Simule un paiement complété via Lygos
              </p>
            </div>
            <ResultDisplay result={lygosResult} provider="lygos" />
            <Button
              onClick={testLygos}
              disabled={lygosResult.status === 'testing'}
              className="w-full"
            >
              {lygosResult.status === 'testing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                '💳 Tester le webhook Lygos'
              )}
            </Button>
          </TabsContent>

          {/* CoinPayments */}
          <TabsContent value="coinpayments" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Test CoinPayments (Bitcoin)</p>
              <p className="text-xs text-muted-foreground">
                Simule un paiement r��ussi en cryptomonnaie
              </p>
            </div>
            <ResultDisplay result={coinpaymentsResult} provider="coinpayments" />
            <Button
              onClick={testCoinPayments}
              disabled={coinpaymentsResult.status === 'testing'}
              className="w-full"
            >
              {coinpaymentsResult.status === 'testing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                '₿ Tester le webhook CoinPayments'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Instructions pour configurer les webhooks:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li><strong>Wave:</strong> Allez à Paramètres &gt; Webhooks et ajoutez l'URL Wave</li>
              <li><strong>Lygos:</strong> Allez à Dashboard &gt; Configuration &gt; Webhooks</li>
              <li><strong>CoinPayments:</strong> Allez à Account &gt; Notifications &gt; IPN Settings</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
