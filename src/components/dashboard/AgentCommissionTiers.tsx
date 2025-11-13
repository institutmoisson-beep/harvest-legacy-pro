import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Target } from 'lucide-react';

interface AgentCommissionTiersProps {
  agentId: string;
}

interface Tier {
  tier_name: string;
  tier_level: number;
  min_monthly_transactions: number;
  max_monthly_transactions: number | null;
  commission_rate: number;
  badge_color: string;
}

interface CurrentTier {
  tier_name: string;
  tier_level: number;
  commission_rate: number;
  badge_color: string;
  monthly_transactions: number;
}

export default function AgentCommissionTiers({ agentId }: AgentCommissionTiersProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentTier, setCurrentTier] = useState<CurrentTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchTiers();
      fetchCurrentTier();
    }
  }, [agentId]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_commission_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const fetchCurrentTier = async () => {
    try {
      // Get monthly transaction count
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions, error: transError } = await supabase
        .from('agent_transactions')
        .select('id', { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      if (transError) throw transError;

      const monthlyCount = transactions?.length || 0;

      // Get tier info using the function
      const { data: tierData, error: tierError } = await supabase
        .rpc('get_agent_tier', { p_agent_id: agentId });

      if (tierError) throw tierError;

      if (tierData && tierData.length > 0) {
        setCurrentTier({
          ...tierData[0],
          monthly_transactions: monthlyCount,
        });
      }
    } catch (error) {
      console.error('Error fetching current tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextTier = () => {
    if (!currentTier) return null;
    return tiers.find(t => t.tier_level === currentTier.tier_level + 1);
  };

  const getProgressToNextTier = () => {
    if (!currentTier) return 0;
    const nextTier = getNextTier();
    if (!nextTier) return 100; // Already at max tier
    
    const current = currentTier.monthly_transactions;
    const needed = nextTier.min_monthly_transactions;
    const progress = (current / needed) * 100;
    return Math.min(progress, 100);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  return (
    <div className="space-y-6">
      {/* Current Tier Card */}
      {currentTier && (
        <Card className="glass-card border-2" style={{ borderColor: currentTier.badge_color }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6" style={{ color: currentTier.badge_color }} />
                <span>Palier Actuel</span>
              </div>
              <Badge 
                className="text-lg px-4 py-1"
                style={{ 
                  backgroundColor: currentTier.badge_color,
                  color: '#000'
                }}
              >
                {currentTier.tier_name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taux de commission</p>
                  <p className="text-3xl font-bold" style={{ color: currentTier.badge_color }}>
                    {currentTier.commission_rate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Transactions ce mois</p>
                  <p className="text-3xl font-bold">{currentTier.monthly_transactions}</p>
                </div>
              </div>

              {nextTier && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Prochain palier: {nextTier.tier_name}
                    </span>
                    <span className="font-medium">
                      {currentTier.monthly_transactions}/{nextTier.min_monthly_transactions}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Plus que {nextTier.min_monthly_transactions - currentTier.monthly_transactions} transactions 
                    pour débloquer {nextTier.commission_rate}% de commission
                  </p>
                </div>
              )}

              {!nextTier && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Vous avez atteint le palier maximum !
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tiers Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Tous les Paliers de Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier) => {
              const isCurrentTier = currentTier?.tier_level === tier.tier_level;
              const isUnlocked = currentTier && currentTier.tier_level >= tier.tier_level;

              return (
                <div
                  key={tier.tier_level}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentTier 
                      ? 'shadow-lg scale-105' 
                      : isUnlocked 
                      ? 'opacity-100' 
                      : 'opacity-50'
                  }`}
                  style={{ 
                    borderColor: isCurrentTier ? tier.badge_color : 'hsl(var(--border))',
                    backgroundColor: isCurrentTier ? `${tier.badge_color}10` : 'transparent'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      style={{ 
                        backgroundColor: tier.badge_color,
                        color: '#000'
                      }}
                    >
                      {tier.tier_name}
                    </Badge>
                    {isCurrentTier && (
                      <Trophy className="h-4 w-4" style={{ color: tier.badge_color }} />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: tier.badge_color }}>
                        {tier.commission_rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Taux de commission</p>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>
                          {tier.min_monthly_transactions}
                          {tier.max_monthly_transactions ? ` - ${tier.max_monthly_transactions}` : '+'}
                          {' '}trans/mois
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
