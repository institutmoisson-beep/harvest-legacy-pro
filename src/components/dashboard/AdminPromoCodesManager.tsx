import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';

export default function AdminPromoCodesManager() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    promo_code: '',
    site_name: '',
    redirect_url: '',
    expiry_date: '',
    description: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    const { data } = await (supabase.from as any)('admin_promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setPromoCodes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.promo_code || !formData.site_name || !formData.redirect_url || !formData.expiry_date) {
      toast({ title: 'Erreur', description: 'Tous les champs requis', variant: 'destructive' });
      return;
    }

    const { error } = await (supabase.from as any)('admin_promo_codes')
      .insert({
        ...formData,
        is_active: true,
      });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Code promo créé!' });
      setOpen(false);
      setFormData({ promo_code: '', site_name: '', redirect_url: '', expiry_date: '', description: '' });
      fetchPromoCodes();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await (supabase.from as any)('admin_promo_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      fetchPromoCodes();
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Supprimer ce code promo?')) return;

    const { error } = await (supabase.from as any)('admin_promo_codes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Code promo supprimé' });
      fetchPromoCodes();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Codes Promo</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Code Promo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="promo_code">Code Promo *</Label>
                <Input
                  id="promo_code"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="PROMO2024"
                />
              </div>
              <div>
                <Label htmlFor="site_name">Nom du Site *</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                  placeholder="Amazon, AliExpress..."
                />
              </div>
              <div>
                <Label htmlFor="redirect_url">URL de Redirection *</Label>
                <Input
                  id="redirect_url"
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Date d'Expiration *</Label>
                <Input
                  id="expiry_date"
                  type="datetime-local"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du code promo..."
                />
              </div>
              <Button type="submit" className="w-full">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {promoCodes.map((promo) => (
            <Card key={promo.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                        {promo.promo_code}
                      </Badge>
                      <Badge variant="outline">{promo.site_name}</Badge>
                      {new Date(promo.expiry_date) < new Date() && (
                        <Badge variant="destructive">Expiré</Badge>
                      )}
                    </div>
                    {promo.description && (
                      <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expire: {new Date(promo.expiry_date).toLocaleDateString('fr-FR')}
                      </span>
                      <a
                        href={promo.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Lien
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(promo.id, promo.is_active)}
                    >
                      {promo.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePromo(promo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {promoCodes.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucun code promo</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
