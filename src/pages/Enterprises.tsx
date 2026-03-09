import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MapPin, Star, Building2, ArrowLeft } from 'lucide-react';

export default function Enterprises() {
  const navigate = useNavigate();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchEnterprises(); }, []);

  const fetchEnterprises = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('enterprises').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    setEnterprises(data || []);
    setLoading(false);
  };

  const filtered = enterprises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Tableau de bord
          </Button>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" /> Annuaire Entreprises
          </h1>
          <p className="text-muted-foreground mb-6">Découvrez les stands et services des entreprises partenaires</p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Aucune entreprise trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ent) => (
              <Card key={ent.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/enterprise/${ent.slug}`)}>
                <div className="relative h-40 bg-muted">
                  {ent.banner_url ? (
                    <img src={ent.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: ent.branding_color + '20' }}>
                      <Building2 className="h-12 w-12 opacity-30" style={{ color: ent.branding_color }} />
                    </div>
                  )}
                  {ent.is_featured && <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">⭐ Premium</Badge>}
                  {ent.logo_url && (
                    <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl border-2 border-background bg-background overflow-hidden shadow">
                      <img src={ent.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <CardContent className="pt-8 pb-4 space-y-2">
                  <h3 className="font-bold text-lg">{ent.name}</h3>
                  {ent.short_description && <p className="text-sm text-muted-foreground line-clamp-2">{ent.short_description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {ent.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ent.city}</span>}
                    <Badge variant="outline" className="text-[10px]">{ent.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
