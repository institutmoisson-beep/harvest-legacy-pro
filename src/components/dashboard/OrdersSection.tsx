import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OrdersSectionProps {
  userId: string;
  brokerCode: string;
}

export default function OrdersSection({ userId, brokerCode }: OrdersSectionProps) {
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [profit, setProfit] = useState('');
  const [geographicZone, setGeographicZone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!customerName || !productName || !purchasePrice || !quantity || !profit) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .insert({
          broker_id: userId,
          broker_code: brokerCode,
          customer_name: customerName,
          product_name: productName,
          purchase_price: parseFloat(purchasePrice),
          quantity: parseInt(quantity),
          profit: parseFloat(profit),
          geographic_zone: geographicZone || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Commande créée",
        description: "La commande a été initiée avec succès",
      });

      // Reset form
      setCustomerName('');
      setProductName('');
      setPurchasePrice('');
      setQuantity('1');
      setProfit('');
      setGeographicZone('');
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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" />
          Initier une commande
        </CardTitle>
        <CardDescription>Créez une nouvelle commande pour un client</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nom du client *</Label>
          <Input
            id="customerName"
            placeholder="Jean Dupont"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brokerCode">Code Moissonneur</Label>
          <Input
            id="brokerCode"
            value={brokerCode}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Description du produit *</Label>
          <Textarea
            id="productName"
            placeholder="Décrivez le produit..."
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Prix d'achat (FCFA) *</Label>
            <Input
              id="purchasePrice"
              type="number"
              placeholder="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profit">Profit (FCFA) *</Label>
          <Input
            id="profit"
            type="number"
            placeholder="0"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="geographicZone">Zone de livraison</Label>
          <Input
            id="geographicZone"
            placeholder="Exemple: Douala, Bonapriso"
            value={geographicZone}
            onChange={(e) => setGeographicZone(e.target.value)}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full" variant="cosmic">
          <Plus className="h-4 w-4 mr-2" />
          Créer la commande
        </Button>
      </CardContent>
    </Card>
  );
}