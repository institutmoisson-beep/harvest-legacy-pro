import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  is_active: boolean;
}

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (paymentMethodId: string, paymentMethodName: string) => void;
  disabled?: boolean;
}

export default function PaymentMethodSelector({ 
  value, 
  onChange, 
  disabled = false 
}: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setPaymentMethods(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des moyens de paiement:', err);
      setError('Impossible de charger les moyens de paiement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Moyen de paiement</Label>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="payment-method">Moyen de paiement *</Label>
      <RadioGroup value={value} onValueChange={(val) => {
        const method = paymentMethods.find(m => m.id === val);
        if (method) {
          onChange(val, method.name);
        }
      }} disabled={disabled}>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Card 
              key={method.id} 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                value === method.id ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem 
                  value={method.id} 
                  id={`payment-${method.id}`}
                  disabled={disabled}
                  className="mt-1"
                />
                <label 
                  htmlFor={`payment-${method.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{method.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Information spécifique à chaque méthode */}
              {value === method.id && method.name !== 'cash_on_delivery' && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  {method.name === 'wave' && (
                    <p>💡 Un lien Wave sera envoyé au client pour effectuer le paiement</p>
                  )}
                  {method.name === 'lygos' && (
                    <p>💡 Un code QR Lygos sera généré pour le paiement</p>
                  )}
                  {method.name === 'coinpayments' && (
                    <p>💡 Une adresse cryptocurrency sera fournie au client pour le paiement</p>
                  )}
                </div>
              )}

              {value === method.id && method.name === 'cash_on_delivery' && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  <p>✅ Le client paiera au moment de la livraison</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
