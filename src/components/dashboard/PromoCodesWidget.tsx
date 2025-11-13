import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tag, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PromoCodesWidget() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoCodes();
    
    const channel = supabase
      .channel('promo-codes-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_promo_codes' }, () => {
        fetchPromoCodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPromoCodes = async () => {
    const { data } = await (supabase.from as any)('admin_promo_codes')
      .select('*')
      .eq('is_active', true)
      .gte('expiry_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (data) setPromoCodes(data);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: 'Copié!', description: 'Code promo copié' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (promoCodes.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5" />
          Codes Promo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{promo.site_name}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-7 px-2"
                >
                  <a href={promo.redirect_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {promo.promo_code}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCode(promo.promo_code)}
                  className="h-7 w-7 p-0"
                >
                  {copiedCode === promo.promo_code ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Expire le {new Date(promo.expiry_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
