import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Copy, CheckCircle, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PromoCodesDisplay() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoCodes();
    
    // Subscribe to changes
    const channel = supabase
      .channel('promo-codes')
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
      .order('created_at', { ascending: false });
    
    if (data) setPromoCodes(data);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: 'Copié!', description: 'Code promo copié dans le presse-papier' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (promoCodes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Codes Promo Disponibles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {promoCodes.map((promo) => (
            <Card key={promo.id} className="border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{promo.site_name}</h4>
                      {promo.description && (
                        <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                      {promo.promo_code}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(promo.promo_code)}
                    >
                      {copiedCode === promo.promo_code ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Expire le {new Date(promo.expiry_date).toLocaleDateString('fr-FR')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={promo.redirect_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Visiter
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
