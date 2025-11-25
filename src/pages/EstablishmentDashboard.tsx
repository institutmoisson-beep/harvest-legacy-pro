import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, QrCode, Copy, Loader2, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

interface Establishment {
  id: string;
  name: string;
  description?: string;
  location: string;
  phone?: string;
  email?: string;
  establishment_type: string;
  qr_code_slug: string;
  is_active: boolean;
}

const establishmentSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  location: z.string().min(2, 'La localisation est requise'),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  establishment_type: z.enum(['restaurant', 'maquis', 'boutique', 'cafe', 'bar', 'autre']),
});

export default function EstablishmentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    phone: '',
    email: '',
    establishment_type: 'restaurant' as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchEstablishments();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') return error.message;
      if ('code' in error && typeof error.code === 'string') return `Erreur (${error.code})`;
      if ('hint' in error && typeof error.hint === 'string') return error.hint;
    }
    return 'Une erreur est survenue lors du chargement des établissements';
  };

  const fetchEstablishments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstablishments(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des établissements:', error);
      toast({
        title: 'Erreur',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 20) +
      '-' +
      Math.random().toString(36).substring(2, 8);
  };

  const handleCreateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = establishmentSchema.parse(formData);
      const qrSlug = generateQRSlug(validated.name);

      const { data, error } = await supabase
        .from('establishments')
        .insert({
          user_id: user?.id,
          name: validated.name,
          description: validated.description,
          location: validated.location,
          phone: validated.phone,
          email: validated.email,
          establishment_type: validated.establishment_type,
          qr_code_slug: qrSlug,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Établissement créé avec succès',
      });

      setFormData({
        name: '',
        description: '',
        location: '',
        phone: '',
        email: '',
        establishment_type: 'restaurant',
      });
      setIsCreateOpen(false);
      fetchEstablishments();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Erreur lors de la création:', error);
        toast({
          title: 'Erreur',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    }
  };

  const copyQRUrl = (slug: string) => {
    const url = `${window.location.origin}/menu/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copié!',
      description: 'URL du QR code copiée',
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic mb-2">
              🏪 Mes Établissements
            </h1>
            <p className="text-muted-foreground">
              Gérez vos menus et générez des QR codes pour vos clients
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un établissement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un établissement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEstablishment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'établissement *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Restaurant Delicious"
                    required
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type d'établissement *</Label>
                  <select
                    id="type"
                    value={formData.establishment_type}
                    onChange={(e) => setFormData({ ...formData, establishment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="maquis">Maquis</option>
                    <option value="boutique">Boutique</option>
                    <option value="cafe">Café</option>
                    <option value="bar">Bar</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localisation *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Yaoundé, Cameroun"
                    required
                  />
                  {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@restaurant.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre établissement..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Créer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Establishments Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : establishments.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore créé d'établissement
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                Créer votre premier établissement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {establishments.map((est) => (
              <Card key={est.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {est.name}
                        <Badge variant={est.is_active ? 'default' : 'secondary'}>
                          {est.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {est.establishment_type}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEstablishment(est)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {est.description && (
                    <p className="text-sm text-muted-foreground">{est.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {est.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{est.location}</span>
                      </div>
                    )}
                    {est.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{est.phone}</span>
                      </div>
                    )}
                    {est.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{est.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                        {est.qr_code_slug}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyQRUrl(est.qr_code_slug)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      URL du menu: /menu/{est.qr_code_slug}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(`/establish/${est.id}/menu`)}
                    >
                      Gérer le menu
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => window.open(`/menu/${est.qr_code_slug}`, '_blank')}
                    >
                      Aperçu
                    </Button>
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
