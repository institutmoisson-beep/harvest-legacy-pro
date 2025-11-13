import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Gift, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AchievementBadgesProps {
  userId: string;
}

export default function AchievementBadges({ userId }: AchievementBadgesProps) {
  const [badges, setBadges] = useState<any[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to badge updates
    const channel = supabase
      .channel('badges-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'user_earned_badges',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchData();
        toast({ 
          title: '🏆 Nouveau Badge!', 
          description: 'Vous avez gagné un nouveau badge de réussite!' 
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all badges
    const { data: allBadges } = await (supabase.from as any)('achievement_badges')
      .select('*')
      .order('requirement_value', { ascending: true });

    // Fetch user's earned badges
    const { data: earned } = await (supabase.from as any)('user_earned_badges')
      .select(`
        *,
        achievement_badges (*)
      `)
      .eq('user_id', userId);

    // Fetch user statistics
    const stats = await fetchUserStats();

    setBadges(allBadges || []);
    setEarnedBadges(earned || []);
    setUserStats(stats);
    setLoading(false);
  };

  const fetchUserStats = async () => {
    // Investment stats
    const { data: investments } = await supabase
      .from('investment_products')
      .select('investment_amount')
      .eq('investor_id', userId);

    const totalInvested = investments?.reduce((sum, inv) => sum + Number(inv.investment_amount), 0) || 0;

    // Shop sales stats
    const { data: shopSettings } = await (supabase.from as any)('shop_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let totalShopSales = 0;
    if (shopSettings) {
      const { data: orders } = await (supabase.from as any)('shop_orders')
        .select('total_amount')
        .eq('shop_id', shopSettings.id)
        .eq('order_status', 'confirmed');

      totalShopSales = orders?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
    }

    // Referral stats
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', userId)
      .eq('level', 1);

    const referralsCount = referrals?.length || 0;

    // Tontine stats
    const { data: tontineParticipations } = await supabase
      .from('tontine_participants')
      .select('tontine_id')
      .eq('user_id', userId);

    const tontineCycles = tontineParticipations?.length || 0;

    return {
      investment_total: totalInvested,
      shop_sales: totalShopSales,
      referrals_count: referralsCount,
      tontine_cycles: tontineCycles
    };
  };

  const hasBadge = (badgeId: string) => {
    return earnedBadges.some(e => e.badge_id === badgeId);
  };

  const getProgress = (badge: any) => {
    if (!userStats) return 0;

    const currentValue = userStats[badge.requirement_type] || 0;
    const targetValue = badge.requirement_value;
    
    return Math.min((currentValue / targetValue) * 100, 100);
  };

  const claimReward = async (earnedBadgeId: string) => {
    const { error } = await (supabase.from as any)('user_earned_badges')
      .update({ reward_claimed: true })
      .eq('id', earnedBadgeId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Récompense réclamée!' });
      fetchData();
    }
  };

  const checkBadges = async () => {
    try {
      const { error } = await (supabase.rpc as any)('check_and_award_achievement_badges', {
        p_user_id: userId
      });

      if (error) throw error;

      toast({ title: 'Succès', description: 'Badges vérifiés et mis à jour' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Chargement...</CardContent></Card>;
  }

  const earnedCount = earnedBadges.length;
  const totalBadges = badges.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Vos Badges de Réussite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{earnedCount}/{totalBadges}</p>
              <p className="text-sm text-muted-foreground">Badges débloqués</p>
            </div>
            <Button onClick={checkBadges}>
              <Star className="w-4 h-4 mr-2" />
              Vérifier les badges
            </Button>
          </div>
          <Progress value={(earnedCount / totalBadges) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Badges Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const earned = hasBadge(badge.id);
          const earnedBadge = earnedBadges.find(e => e.badge_id === badge.id);
          const progress = getProgress(badge);

          return (
            <Card 
              key={badge.id}
              className={`relative ${earned ? 'border-yellow-500 bg-yellow-500/5' : 'opacity-75'}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="text-4xl"
                    style={{ filter: earned ? 'none' : 'grayscale(100%)' }}
                  >
                    {badge.icon}
                  </div>
                  {earned ? (
                    <Badge className="bg-yellow-500">
                      <Trophy className="w-3 h-3 mr-1" />
                      Gagné
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Lock className="w-3 h-3 mr-1" />
                      Verrouillé
                    </Badge>
                  )}
                </div>

                <h3 className="font-semibold mb-2">{badge.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{badge.description}</p>

                {!earned && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progression</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                  </div>
                )}

                {earned && badge.reward_amount > 0 && (
                  <div className="mt-4">
                    {!earnedBadge?.reward_claimed ? (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => claimReward(earnedBadge.id)}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Réclamer {badge.reward_amount} MSN
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center">
                        Récompense réclamée
                      </Badge>
                    )}
                  </div>
                )}

                {earned && earnedBadge && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Gagné le {new Date(earnedBadge.earned_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
