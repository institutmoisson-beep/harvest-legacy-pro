import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, MapPin, Globe } from 'lucide-react';

interface Assignment {
  id: string;
  user_id: string;
  assignment_type: 'country' | 'city';
  country: string;
  city: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface Location {
  country: string;
  city: string;
}

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
}

export default function GeographicRepresentativesManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'country' | 'city'>('city');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments avec gestion d'erreur améliorée
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('geographic_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      // Fetch user details pour les assignments
      const userIds = [...new Set((assignmentsData || []).map((a: any) => a.user_id))];
      
      if (userIds.length > 0) {
        // Récupérer les profils
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

        const assignmentsWithUsers = (assignmentsData || []).map((assignment: any) => {
          const profile = profilesMap.get(assignment.user_id);
          return {
            ...assignment,
            user_name: profile?.full_name || 'Utilisateur inconnu',
            user_email: '', // Email will be fetched if needed
          };
        });

        setAssignments(assignmentsWithUsers as Assignment[]);
      } else {
        setAssignments([]);
      }

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('african_locations')
        .select('country, city')
        .eq('is_active', true)
        .order('country', { ascending: true })
        .order('city', { ascending: true });

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        throw locationsError;
      }
      
      setLocations((locationsData || []) as Location[]);

      // Fetch tous les utilisateurs pour la sélection
      const { data: allProfilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Filtrer et dédupliquer
      const uniqueUsers = Array.from(
        new Map((allProfilesData || []).map((u: any) => [u.id, u])).values()
      ).filter((u: any) => u.full_name && u.full_name.trim() !== '');

      setUsers(uniqueUsers.map(u => ({ ...u, email: '' })) as UserWithRoles[]);
      
      console.log('Data loaded:', {
        assignments: assignmentsData?.length || 0,
        users: uniqueUsers.length,
        locations: locationsData?.length || 0
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur de chargement",
        description: error.message || "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUser || !selectedCountry) {
      toast({
        title: "Champs manquants",
        description: "Veuillez sélectionner un utilisateur et un pays",
        variant: "destructive",
      });
      return;
    }

    if (assignmentType === 'city' && !selectedCity) {
      toast({
        title: "Champs manquants",
        description: "Veuillez sélectionner une ville",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Adding assignment:', { selectedUser, assignmentType, selectedCountry, selectedCity });
      
      // Insérer l'assignation géographique
      const { error: assignmentError } = await supabase
        .from('geographic_assignments')
        .insert({
          user_id: selectedUser,
          assignment_type: assignmentType,
          country: selectedCountry,
          city: assignmentType === 'city' ? selectedCity : null,
        });

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        throw assignmentError;
      }

      // Assigner le rôle approprié
      const role = assignmentType === 'country' ? 'country_representative' : 'city_representative';
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: role,
        });

      // Ignorer l'erreur si le rôle existe déjà
      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Role error:', roleError);
        // Ne pas bloquer si l'erreur est juste que le rôle existe déjà
      }

      toast({
        title: "✅ Représentant assigné",
        description: `${assignmentType === 'city' ? 'Représentant de ville' : 'Représentant de pays'} assigné avec succès`,
      });

      setOpen(false);
      setSelectedUser('');
      setSelectedCountry('');
      setSelectedCity('');
      await fetchData();
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner le représentant",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, userId: string, assignmentType: string) => {
    try {
      console.log('Removing assignment:', { assignmentId, userId, assignmentType });
      
      const { error: deleteError } = await supabase
        .from('geographic_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Vérifier si l'utilisateur a d'autres assignations du même type
      const { data: otherAssignments } = await supabase
        .from('geographic_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('assignment_type', assignmentType);

      // Si aucune autre assignation, retirer le rôle
      if (!otherAssignments || otherAssignments.length === 0) {
        const role = assignmentType === 'country' ? 'country_representative' : 'city_representative';
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        if (roleError) {
          console.error('Role removal error:', roleError);
          // Ne pas bloquer si l'erreur est juste que le rôle n'existe pas
        }
      }

      toast({
        title: "✅ Assignation supprimée",
        description: "Le représentant a été retiré avec succès",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'assignation",
        variant: "destructive",
      });
    }
  };

  const countries = [...new Set(locations.map(l => l.country))].sort();
  const cities = locations.filter(l => l.country === selectedCountry).map(l => l.city).sort();

  const filteredAssignments = assignments.filter(a =>
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Représentants Géographiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Représentants Géographiques</CardTitle>
            <CardDescription>
              Assignez des représentants pour gérer les commandes par pays ou ville
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assigner un représentant</DialogTitle>
                <DialogDescription>
                  Assignez un utilisateur comme représentant d'une ville ou d'un pays
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Utilisateur</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Type d'assignation</Label>
                  <Select value={assignmentType} onValueChange={(value: 'country' | 'city') => setAssignmentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">Représentant Ville</SelectItem>
                      <SelectItem value="country">Représentant Pays</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Pays</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {assignmentType === 'city' && (
                  <div>
                    <Label>Ville</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={handleAddAssignment} className="w-full">
                  Assigner
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Rechercher par nom, email, pays ou ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun représentant assigné
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.user_name}</TableCell>
                    <TableCell className="text-muted-foreground">{assignment.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.assignment_type === 'country' ? 'default' : 'secondary'}>
                        {assignment.assignment_type === 'country' ? (
                          <><Globe className="h-3 w-3 mr-1" /> Pays</>
                        ) : (
                          <><MapPin className="h-3 w-3 mr-1" /> Ville</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.assignment_type === 'country' ? (
                        <span className="font-medium">{assignment.country}</span>
                      ) : (
                        <span>{assignment.city}, {assignment.country}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAssignment(assignment.id, assignment.user_id, assignment.assignment_type)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
