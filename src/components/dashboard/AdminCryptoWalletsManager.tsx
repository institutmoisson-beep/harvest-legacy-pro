import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Bitcoin } from 'lucide-react';

interface CryptoWallet {
  id: number;
  coin: string;
  address: string;
  created_at: string | null;
}

const CRYPTO_CURRENCIES = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'USDT_TRC20', label: 'USDT (TRC20)' },
  { value: 'SOL', label: 'Solana (SOL)' },
  { value: 'BNB', label: 'Binance Coin (BNB)' },
];

export default function AdminCryptoWalletsManager() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [newWallet, setNewWallet] = useState({
    coin: '',
    address: '',
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crypto_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!newWallet.coin || !newWallet.address) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('crypto_addresses')
        .insert([{
          coin: newWallet.coin,
          address: newWallet.address,
        }]);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Adresse crypto ajoutée avec succès',
      });

      setNewWallet({ coin: '', address: '' });
      fetchWallets();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse crypto ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('crypto_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Adresse crypto supprimée avec succès',
      });

      fetchWallets();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyLabel = (coin: string) => {
    return CRYPTO_CURRENCIES.find(c => c.value === coin)?.label || coin;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5" />
          Gestion des Adresses Crypto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulaire d'ajout */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold">Ajouter une nouvelle adresse</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coin">Cryptomonnaie</Label>
              <Select
                value={newWallet.coin}
                onValueChange={(value) => setNewWallet({ ...newWallet, coin: value })}
              >
                <SelectTrigger id="coin">
                  <SelectValue placeholder="Sélectionner une crypto" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse du portefeuille</Label>
              <Input
                id="address"
                type="text"
                placeholder="Adresse crypto"
                value={newWallet.address}
                onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleAddWallet} disabled={loading} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter l'adresse
          </Button>
        </div>

        {/* Liste des adresses */}
        <div className="space-y-3">
          <h3 className="font-semibold">Adresses configurées ({wallets.length})</h3>
          {loading && wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune adresse crypto configurée</p>
          ) : (
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{getCurrencyLabel(wallet.coin)}</p>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {wallet.address}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteWallet(wallet.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
