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
      
      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('geographic_assignments' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch user details for assignments
      const assignmentsWithUsers = await Promise.all(
        ((assignmentsData || []) as any[]).map(async (assignment: any) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', assignment.user_id)
            .single();

          const { data: authData } = await supabase.auth.admin.getUserById(assignment.user_id);

          return {
            ...assignment,
            user_name: userData?.full_name,
            user_email: authData?.user?.email,
          };
        })
      );

      setAssignments(assignmentsWithUsers as Assignment[]);

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('african_locations' as any)
        .select('country, city')
        .eq('is_active', true)
        .order('country', { ascending: true })
        .order('city', { ascending: true });

      if (locationsError) throw locationsError;
      setLocations(((locationsData || []) as any) as Location[]);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      // Get emails from auth
      const usersWithEmails = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: authData } = await supabase.auth.admin.getUserById(user.id);
          return {
            ...user,
            email: authData?.user?.email || '',
          };
        })
      );

      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUser || !selectedCountry) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur et un pays",
        variant: "destructive",
      });
      return;
    }

    if (assignmentType === 'city' && !selectedCity) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une ville",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('geographic_assignments' as any)
        .insert({
          user_id: selectedUser,
          assignment_type: assignmentType,
          country: selectedCountry,
          city: assignmentType === 'city' ? selectedCity : null,
        });

      if (error) throw error;

      // Assign role
      const role = assignmentType === 'country' ? 'country_representative' : 'city_representative';
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: role as any,
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      toast({
        title: "Succès",
        description: "Représentant assigné avec succès",
      });

      setOpen(false);
      setSelectedUser('');
      setSelectedCountry('');
      setSelectedCity('');
      fetchData();
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
      const { error } = await supabase
        .from('geographic_assignments' as any)
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Check if user has other assignments of this type
      const { data: otherAssignments } = await supabase
        .from('geographic_assignments' as any)
        .select('id')
        .eq('user_id', userId)
        .eq('assignment_type', assignmentType);

      // If no other assignments, remove the role
      if (!otherAssignments || otherAssignments.length === 0) {
        const role = assignmentType === 'country' ? 'country_representative' : 'city_representative';
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as any);
      }

      toast({
        title: "Succès",
        description: "Assignation supprimée",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'assignation",
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
