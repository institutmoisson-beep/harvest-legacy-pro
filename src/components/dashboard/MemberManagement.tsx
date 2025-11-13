import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Member {
  id: string;
  full_name: string;
  phone: string | null;
  referral_code: string;
  role?: string;
}

export default function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get direct referrals
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', user.id)
        .eq('level', 1);

      if (referrals && referrals.length > 0) {
        const referredIds = referrals.map(r => r.referred_id);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone, referral_code')
          .in('id', referredIds);

        if (profiles) {
          // Get roles for each member
        const { data: roles } = await (supabase.from as any)('user_roles')
          .select('user_id, role')
          .in('user_id', referredIds);

          const membersWithRoles = profiles.map(profile => ({
            ...profile,
            role: roles?.find(r => r.user_id === profile.id)?.role || 'user'
          }));

          setMembers(membersWithRoles);
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await (supabase.from as any)('user_roles')
        .select('id')
        .eq('user_id', memberId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await (supabase.from as any)('user_roles')
          .update({ role: newRole })
          .eq('user_id', memberId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await (supabase.from as any)('user_roles')
          .insert({ user_id: memberId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: `Rôle changé en ${newRole}`,
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des Membres ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun membre dans votre réseau
            </p>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 glass-card rounded-lg">
                <div>
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="text-sm text-muted-foreground">{member.phone || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Code: {member.referral_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {member.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeRole(member.id, 'moderator')}
                    >
                      Promouvoir
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
