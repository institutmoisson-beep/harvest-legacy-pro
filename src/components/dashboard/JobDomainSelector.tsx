import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search, X, Plus } from 'lucide-react';

interface JobDomain {
  id: string;
  name: string;
  category: string;
  description: string | null;
  emoji: string | null;
  is_active: boolean;
}

interface UserJobProfile {
  id: string;
  job_domain_id: string;
  job_domain?: JobDomain;
}

export default function JobDomainSelector() {
  const { user } = useAuth();
  const [jobDomains, setJobDomains] = useState<JobDomain[]>([]);
  const [userJobDomains, setUserJobDomains] = useState<UserJobProfile[]>([]);
  const [filteredDomains, setFilteredDomains] = useState<JobDomain[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (user) {
      fetchJobDomains();
      fetchUserJobDomains();
    }
  }, [user]);

  useEffect(() => {
    filterDomains();
  }, [searchTerm, selectedCategory, jobDomains]);

  const fetchJobDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('job_domains')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setJobDomains(data || []);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set((data || []).map((d) => d.category))
      ).sort();
      setCategories(uniqueCategories);
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

  const fetchUserJobDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('user_job_profiles')
        .select(
          `
          id,
          job_domain_id,
          job_domains (
            id,
            name,
            category,
            description,
            emoji,
            is_active
          )
        `
        )
        .eq('user_id', user?.id);

      if (error) throw error;
      setUserJobDomains(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filterDomains = () => {
    let filtered = jobDomains;

    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    // Filter out already selected domains
    const selectedIds = userJobDomains.map((ujd) => ujd.job_domain_id);
    filtered = filtered.filter((d) => !selectedIds.includes(d.id));

    setFilteredDomains(filtered);
  };

  const handleAddJobDomain = async (jobDomainId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_job_profiles').insert({
        user_id: user.id,
        job_domain_id: jobDomainId,
        is_primary: userJobDomains.length === 0,
      });

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Domaine d\'emploi ajouté à votre profil',
      });

      setSearchTerm('');
      setSelectedCategory('');
      setShowSelector(false);
      fetchUserJobDomains();
      fetchJobDomains();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveJobDomain = async (userJobProfileId: string) => {
    try {
      const { error } = await supabase
        .from('user_job_profiles')
        .delete()
        .eq('id', userJobProfileId);

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Domaine d\'emploi supprimé',
      });

      fetchUserJobDomains();
      fetchJobDomains();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>💼 Mes Domaines d'Emploi</span>
          {!showSelector && (
            <Button
              onClick={() => setShowSelector(true)}
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un domaine
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Domaines actuels */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Vos domaines sélectionnés</h3>
          {userJobDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun domaine d'emploi sélectionné. Ajoutez-en un pour enrichir votre profil!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userJobDomains.map((ujd) => (
                <div key={ujd.id} className="relative">
                  <Badge variant="secondary" className="pl-2 pr-6 py-1">
                    <span className="mr-2">
                      {(ujd.job_domains as any)?.emoji || '💼'}
                    </span>
                    {(ujd.job_domains as any)?.name}
                  </Badge>
                  <button
                    onClick={() => handleRemoveJobDomain(ujd.id)}
                    className="absolute -right-2 -top-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/90 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sélecteur */}
        {showSelector && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-3">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un domaine d'emploi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtres par catégorie */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">
                  Catégories
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                  >
                    Tous
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Domaines disponibles */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun domaine disponible
                </p>
              ) : (
                filteredDomains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{domain.emoji || '💼'}</span>
                        <div>
                          <p className="font-medium text-sm">{domain.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {domain.category}
                          </p>
                        </div>
                      </div>
                      {domain.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-9">
                          {domain.description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAddJobDomain(domain.id)}
                      size="sm"
                      className="ml-2 flex-shrink-0"
                    >
                      Ajouter
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setShowSelector(false);
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
