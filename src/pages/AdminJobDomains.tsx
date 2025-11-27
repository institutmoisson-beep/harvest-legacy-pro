import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit2, Trash2, Search } from 'lucide-react';

interface JobDomain {
  id: string;
  name: string;
  category: string;
  description: string | null;
  emoji: string | null;
  is_active: boolean;
  display_order: number;
}

interface UserJobProfile {
  id: string;
  user_id: string;
  job_domain_id: string;
  selected_at: string;
  is_primary: boolean;
  user?: {
    id: string;
    email: string;
  };
  job_domain?: JobDomain;
}

export default function AdminJobDomains() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobDomains, setJobDomains] = useState<JobDomain[]>([]);
  const [userJobProfiles, setUserJobProfiles] = useState<UserJobProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<JobDomain>>({
    name: '',
    category: '',
    description: '',
    emoji: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchJobDomains();
    fetchUserJobProfiles();
  }, [user, navigate]);

  const fetchJobDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('job_domains')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setJobDomains(data || []);
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

  const fetchUserJobProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_job_profiles')
        .select(
          `
          id,
          user_id,
          job_domain_id,
          selected_at,
          is_primary,
          job_domains (
            id,
            name,
            category,
            description,
            emoji,
            is_active,
            display_order
          )
        `
        )
        .order('selected_at', { ascending: false });

      if (error) throw error;
      setUserJobProfiles(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveJobDomain = async () => {
    if (!formData.name || !formData.category) {
      toast({
        title: 'Erreur',
        description: 'Le nom et la catégorie sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('job_domains')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Succès!',
          description: 'Domaine d\'emploi mis à jour',
        });
      } else {
        const { error } = await supabase
          .from('job_domains')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Succès!',
          description: 'Domaine d\'emploi créé',
        });
      }

      resetForm();
      fetchJobDomains();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteJobDomain = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine d\'emploi?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('job_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Domaine d\'emploi supprimé',
      });

      fetchJobDomains();
      fetchUserJobProfiles();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditJobDomain = (domain: JobDomain) => {
    setEditingId(domain.id);
    setFormData({
      name: domain.name,
      category: domain.category,
      description: domain.description,
      emoji: domain.emoji,
      is_active: domain.is_active,
      display_order: domain.display_order,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      emoji: '',
      is_active: true,
      display_order: 0,
    });
  };

  const filteredDomains = jobDomains.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(
    new Set(jobDomains.map((d) => d.category))
  ).sort();

  const userCountByDomain = userJobProfiles.reduce(
    (acc, ujp) => {
      acc[ujp.job_domain_id] = (acc[ujp.job_domain_id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic">
              💼 Gestion des Domaines d'Emploi
            </h1>
            <p className="text-muted-foreground mt-2">
              Gérez tous les domaines d'emploi disponibles et les associations utilisateurs
            </p>
          </div>
        </div>

        <Tabs defaultValue="domains" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="domains">
              Domaines d'emploi ({jobDomains.length})
            </TabsTrigger>
            <TabsTrigger value="users">
              Associations utilisateurs ({userJobProfiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="domains" className="mt-6 space-y-6">
            {/* Formulaire de création/édition */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? 'Modifier' : 'Ajouter'} un domaine d'emploi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du domaine *</Label>
                    <Input
                      id="name"
                      placeholder="ex: Juriste Moissonneur"
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie *</Label>
                    <Input
                      id="category"
                      placeholder="ex: Services Juridiques"
                      value={formData.category || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      list="categories"
                    />
                    <datalist id="categories">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emoji">Emoji</Label>
                    <Input
                      id="emoji"
                      placeholder="ex: ⚖️"
                      maxLength={2}
                      value={formData.emoji || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, emoji: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_order">Ordre d'affichage</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Description du domaine (optionnel)"
                    value={formData.description || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full p-2 border rounded-md bg-background text-foreground resize-none h-20"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveJobDomain} className="flex-1">
                    {editingId ? 'Mettre à jour' : 'Créer le domaine'}
                  </Button>
                  {editingId && (
                    <Button onClick={resetForm} variant="outline">
                      Annuler
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Liste des domaines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Liste des domaines d'emploi</span>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredDomains.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun domaine trouvé
                    </div>
                  ) : (
                    filteredDomains.map((domain) => (
                      <div
                        key={domain.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {domain.emoji || '💼'}
                            </span>
                            <div>
                              <p className="font-semibold">{domain.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {domain.category} • Ordre: {domain.display_order}
                              </p>
                              {domain.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {domain.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <Badge variant="secondary">
                            {userCountByDomain[domain.id] || 0} utilisateurs
                          </Badge>
                          <Badge variant={domain.is_active ? 'default' : 'destructive'}>
                            {domain.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Button
                            onClick={() => handleEditJobDomain(domain)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteJobDomain(domain.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Associations utilisateurs - Domaines d'emploi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-3 px-4">Utilisateur</th>
                        <th className="text-left py-3 px-4">Domaine</th>
                        <th className="text-left py-3 px-4">Catégorie</th>
                        <th className="text-left py-3 px-4">Primaire</th>
                        <th className="text-left py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userJobProfiles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-muted-foreground">
                            Aucune association
                          </td>
                        </tr>
                      ) : (
                        userJobProfiles.map((ujp) => (
                          <tr key={ujp.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-mono text-xs">
                              {ujp.user_id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span>
                                  {(ujp.job_domains as any)?.emoji || '💼'}
                                </span>
                                {(ujp.job_domains as any)?.name}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {(ujp.job_domains as any)?.category}
                            </td>
                            <td className="py-3 px-4">
                              {ujp.is_primary ? (
                                <Badge>Oui</Badge>
                              ) : (
                                <span className="text-muted-foreground">Non</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(ujp.selected_at).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
