import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Target, Star, TrendingUp } from 'lucide-react';

interface AgentBonusSystemProps {
  agentId: string;
}

interface BonusTier {
  tier_level: number;
  tier_name: string;
  min_transactions: number;
  max_transactions: number | null;
  bonus_amount: number;
  badge_icon: string;
}

interface BonusAward {
  award_month: string;
  transactions_count: number;
  tier_name: string;
  bonus_amount: number;
  awarded_at: string;
}

export default function AgentBonusSystem({ agentId }: AgentBonusSystemProps) {
  const [tiers, setTiers] = useState<BonusTier[]>([]);
  const [awards, setAwards] = useState<BonusAward[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState(0);
  const [currentTier, setCurrentTier] = useState<BonusTier | null>(null);
  const [nextTier, setNextTier] = useState<BonusTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchData();
    }
  }, [agentId]);

  const fetchData = async () => {
    try {
      // Fetch bonus tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('agent_bonus_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // Fetch bonus awards
      const { data: awardsData, error: awardsError } = await supabase
        .from('agent_monthly_bonus_awards')
        .select('*')
        .eq('agent_id', agentId)
        .order('award_month', { ascending: false })
        .limit(6);

      if (awardsError) throw awardsError;
      setAwards(awardsData || []);

      // Get current month transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transData, error: transError } = await supabase
        .from('agent_transactions')
        .select('id', { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      if (transError) throw transError;
      const count = transData?.length || 0;
      setMonthlyTransactions(count);

      // Determine current and next tier
      if (tiersData && tiersData.length > 0) {
        const current = tiersData.find(
          t => count >= t.min_transactions && (!t.max_transactions || count <= t.max_transactions)
        );
        setCurrentTier(current || null);

        if (current) {
          const next = tiersData.find(t => t.tier_level === current.tier_level + 1);
          setNextTier(next || null);
        } else {
          setNextTier(tiersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching bonus data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressToNextTier = () => {
    if (!nextTier) return 100;
    const progress = (monthlyTransactions / nextTier.min_transactions) * 100;
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

  return (
    <div className="space-y-6">
      {/* Current Progress */}
      <Card className="glass-card border-2 border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonus Mensuel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transactions ce mois</p>
              <p className="text-4xl font-bold">{monthlyTransactions}</p>
            </div>
            {currentTier && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Bonus actuel</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{currentTier.badge_icon}</span>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {currentTier.bonus_amount} MSN
                    </p>
                    <p className="text-xs text-muted-foreground">{currentTier.tier_name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {nextTier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Prochain niveau: {nextTier.tier_name} {nextTier.badge_icon}
                </span>
                <span className="font-medium">
                  {monthlyTransactions}/{nextTier.min_transactions}
                </span>
              </div>
              <Progress value={getProgressToNextTier()} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                Plus que {Math.max(0, nextTier.min_transactions - monthlyTransactions)} transactions 
                pour débloquer {nextTier.bonus_amount} MSN
              </p>
            </div>
          )}

          {!nextTier && currentTier && (
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-primary">
                Vous êtes au niveau maximum ! 👑
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Bonus Tiers */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Paliers de Bonus Mensuels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {tiers.map((tier) => {
              const isAchieved = monthlyTransactions >= tier.min_transactions;
              const isCurrent = currentTier?.tier_level === tier.tier_level;

              return (
                <div
                  key={tier.tier_level}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/10 scale-105'
                      : isAchieved
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-border opacity-60'
                  }`}
                >
                  <div className="text-center space-y-2">
                    <div className="text-4xl">{tier.badge_icon}</div>
                    <p className="font-semibold text-sm">{tier.tier_name}</p>
                    <div className="text-2xl font-bold text-primary">
                      {tier.bonus_amount} MSN
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tier.min_transactions}
                      {tier.max_transactions ? ` - ${tier.max_transactions}` : '+'}
                      {' '}trans
                    </div>
                    {isAchieved && (
                      <Badge variant="default" className="text-xs">
                        Débloqué ✓
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Award History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historique des Bonus
          </CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun bonus reçu pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {awards.map((award, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(award.award_month).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {award.transactions_count} transactions • {award.tier_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">
                      +{award.bonus_amount} MSN
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(award.awarded_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
