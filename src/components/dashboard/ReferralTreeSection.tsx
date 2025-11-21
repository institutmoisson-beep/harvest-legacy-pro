import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, XCircle, ChevronDown, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  full_name: string;
  referral_code: string;
  created_at: string;
  level: number;
  is_active: boolean;
}

interface ReferralTreeSectionProps {
  userId: string;
}

export default function ReferralTreeSection({ userId }: ReferralTreeSectionProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    try {
      // Fetch all referrals where user is the referrer
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          level,
          referred_id,
          created_at
        `)
        .eq('referrer_id', userId)
        .order('level', { ascending: true })
        .order('created_at', { ascending: false });

      if (referralError) throw referralError;

      if (referralData && referralData.length > 0) {
        // Get profile details for all referred users
        const referredIds = referralData.map(r => r.referred_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, referral_code, created_at')
          .in('id', referredIds);

        if (profilesError) throw profilesError;

        // Check if users are active (have made at least one order)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('broker_id')
          .in('broker_id', referredIds);

        if (ordersError) throw ordersError;

        const activeUserIds = new Set(ordersData?.map(o => o.broker_id) || []);

        // Combine data
        const formattedReferrals = referralData.map(ref => {
          const profile = profilesData?.find(p => p.id === ref.referred_id);
          return {
            id: ref.referred_id,
            full_name: profile?.full_name || 'Utilisateur',
            referral_code: profile?.referral_code || 'N/A',
            created_at: profile?.created_at || ref.created_at,
            level: ref.level,
            is_active: activeUserIds.has(ref.referred_id)
          };
        });

        setReferrals(formattedReferrals);
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

  const groupByLevel = (referrals: Referral[]) => {
    const grouped: { [key: number]: Referral[] } = {};
    referrals.forEach(ref => {
      if (!grouped[ref.level]) {
        grouped[ref.level] = [];
      }
      grouped[ref.level].push(ref);
    });
    return grouped;
  };

  const filteredReferrals = referrals.filter(ref => 
    ref.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ref.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const groupedReferrals = groupByLevel(filteredReferrals);
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.is_active).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Arbre de Parrainage
            </div>
            <CollapsibleTrigger asChild>
              <button className="p-2 hover:bg-accent/10 rounded-lg transition-colors">
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
              </button>
            </CollapsibleTrigger>
          </CardTitle>
          <CardDescription>
            {totalReferrals} filleul{totalReferrals > 1 ? 's' : ''} au total • {activeReferrals} actif{activeReferrals > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {referrals.length > 0 && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom ou code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            {loading ? (
              <p className="text-center text-muted-foreground">Chargement...</p>
            ) : referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun filleul pour le moment</p>
            <p className="text-sm text-muted-foreground mt-2">
              Partagez votre lien de parrainage pour développer votre réseau
            </p>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun filleul trouvé pour "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedReferrals).sort((a, b) => parseInt(a) - parseInt(b)).map(level => (
              <div key={level} className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">
                  Niveau {level} ({groupedReferrals[parseInt(level)].length})
                </h3>
                <div className="grid gap-3">
                  {groupedReferrals[parseInt(level)].map(referral => (
                    <div
                      key={referral.id}
                      className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{referral.full_name}</p>
                          {referral.is_active ? (
                            <CheckCircle className="h-4 w-4 text-secondary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Code: {referral.referral_code}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Inscrit le {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          referral.is_active 
                            ? 'bg-secondary/20 text-secondary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {referral.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
