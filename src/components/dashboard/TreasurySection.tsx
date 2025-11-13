import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Wallet } from 'lucide-react';

export default function TreasurySection() {
  const [treasury, setTreasury] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTreasury();
  }, []);

  const fetchTreasury = async () => {
    const { data } = await (supabase.from as any)('treasury')
      .select('*')
      .eq('id', 1)
      .single();
    setTreasury(data);
    setLoading(false);
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Caisse - Frais collectés
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold gradient-text-primary">
          {treasury?.amount?.toLocaleString() || 0} FCFA
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Dernière mise à jour: {treasury?.last_updated ? new Date(treasury.last_updated).toLocaleString() : '-'}
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Frais de retrait (0.60%):</span>
            <span className="font-semibold">40% aux agents</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de transfert (0.50%):</span>
            <span className="font-semibold">40% aux agents</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de dépôt:</span>
            <span className="font-semibold text-green-600">0%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
