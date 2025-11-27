import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PaymentConfirmationProps {
  paymentMethod: string;
  paymentMethodName: string;
  amount: number;
  orderId: string;
  customerPhone?: string;
  transactionId?: string;
}

export default function PaymentConfirmation({
  paymentMethod,
  paymentMethodName,
  amount,
  orderId,
  customerPhone,
  transactionId,
}: PaymentConfirmationProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Le texte a été copié dans le presse-papiers",
    });
  };

  const getPaymentLink = () => {
    if (paymentMethod === 'wave') {
      return 'https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/';
    }
    return null;
  };

  return (
    <Card className="glass-card border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Commande créée avec succès
        </CardTitle>
        <CardDescription>
          Numéro de commande: {orderId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Détails de la commande */}
        <div className="space-y-2 p-3 bg-white rounded-lg border">
          <p className="text-sm">
            <span className="font-semibold">Montant:</span> {amount.toLocaleString()} FCFA
          </p>
          <p className="text-sm">
            <span className="font-semibold">Moyen de paiement:</span> {paymentMethodName}
          </p>
          <p className="text-sm">
            <span className="font-semibold">N° Commande:</span> {orderId}
          </p>
        </div>

        {/* Instructions selon le moyen de paiement */}
        {paymentMethod === 'cash_on_delivery' && (
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <p className="font-semibold mb-2">Paiement à la livraison</p>
              <p>Le client pourra payer au moment de la réception du colis.</p>
              <p className="mt-2 text-sm">
                Statut: <Badge variant="outline" className="mt-1">En attente de livraison</Badge>
              </p>
            </AlertDescription>
          </Alert>
        )}

        {paymentMethod === 'wave' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 space-y-3">
              <p className="font-semibold">Lien de paiement Wave</p>
              <p className="text-sm">
                Partagez ce lien avec le client pour qu'il puisse effectuer le paiement:
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-white p-2 rounded text-xs break-all">
                  {getPaymentLink()}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(getPaymentLink() || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <a
                  href={getPaymentLink() || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full" size="sm" variant="default">
                    📱 Ouvrir lien Wave
                  </Button>
                </a>
              </div>
              {customerPhone && (
                <p className="text-xs">
                  💡 Envoyez ce lien au client: <strong>{customerPhone}</strong>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {paymentMethod === 'lygos' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 space-y-3">
              <p className="font-semibold">Code QR Lygos</p>
              <p className="text-sm">
                Un code QR a été généré pour que le client puisse scanner et payer avec Lygos.
              </p>
              <div className="bg-white p-4 rounded flex justify-center">
                <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Code QR Lygos</span>
                </div>
              </div>
              <p className="text-xs">
                💡 Code de paiement: <code className="bg-white px-2 py-1 rounded">{transactionId}</code>
              </p>
            </AlertDescription>
          </Alert>
        )}

        {paymentMethod === 'coinpayments' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 space-y-3">
              <p className="font-semibold">Paiement en Cryptomonnaie</p>
              <p className="text-sm">
                Un lien de paiement crypto a été généré. Le client peut payer en Bitcoin ou autre cryptomonnaie.
              </p>
              <div className="space-y-2 bg-white p-3 rounded text-xs">
                <p>
                  <span className="font-semibold">Montant:</span> {(amount / 655000).toFixed(8)} BTC
                </p>
                <p>
                  <span className="font-semibold">ID Transaction:</span> {transactionId}
                </p>
              </div>
              <p className="text-xs">
                💡 Le paiement sera confirmé après les confirmations blockchain (généralement 10-30 minutes)
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            Envoyer au client
          </Button>
          <Button className="flex-1" variant="cosmic">
            Voir la commande
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
