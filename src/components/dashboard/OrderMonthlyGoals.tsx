import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, ShoppingCart, DollarSign, TrendingUp, Trophy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrderMonthlyGoalsProps {
  userId: string;
}

interface Goal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  reward_amount: number;
  reward_claimed: boolean;
}

const goalConfig: Record<string, { label: string; icon: any; color: string; format: (v: number) => string }> = {
  orders_count: {
    label: 'Nombre de Commandes',
    icon: ShoppingCart,
    color: 'hsl(var(--primary))',
    format: (v) => v.toString()
  },
  orders_value: {
    label: 'Valeur des Commandes',
    icon: TrendingUp,
    color: 'hsl(var(--secondary))',
    format: (v) => `${v.toLocaleString()} FCFA`
  },
  profit_total: {
    label: 'Profits Totaux',
    icon: DollarSign,
    color: 'hsl(var(--accent))',
    format: (v) => `${v.toLocaleString()} FCFA`
  }
};

export default function OrderMonthlyGoals({ userId }: OrderMonthlyGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchGoals();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('order-goals')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'order_monthly_goals',
          filter: `broker_id=eq.${userId}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            toast({
              title: '🎯 Objectif Commandes Atteint!',
              description: `Bravo! Vous avez gagné ${payload.new.reward_amount} FCFA!`,
            });
          }
          fetchGoals();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchGoals = async () => {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const { data, error } = await supabase
        .from('order_monthly_goals')
        .select('*')
        .eq('broker_id', userId)
        .eq('month', currentMonth.toISOString().split('T')[0])
        .order('goal_type');

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching order goals:', error);
    } finally {
      setLoading(false);
    }
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Objectifs Commandes du Mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucun objectif pour ce mois
            </p>
          ) : (
            goals.map((goal) => {
              const config = goalConfig[goal.goal_type];
              if (!config) return null;
              
              const Icon = config.icon;
              const progressPercent = Math.min(goal.progress_percentage || 0, 100);

              return (
                <div key={goal.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: config.color }} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{config.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {config.format(goal.current_value)} / {config.format(goal.target_value)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {goal.status === 'completed' ? (
                        <Badge variant="secondary" className="gap-1">
                          <Trophy className="h-3 w-3" />
                          Complété
                        </Badge>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold" style={{ color: config.color }}>
                            {progressPercent.toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Récompense: {goal.reward_amount.toLocaleString()} FCFA
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Progress 
                    value={progressPercent} 
                    className="h-3"
                    style={{
                      // @ts-ignore
                      '--progress-background': config.color
                    }}
                  />
                  
                  {goal.status === 'completed' && goal.reward_claimed && (
                    <p className="text-xs text-secondary flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      Récompense de {goal.reward_amount.toLocaleString()} FCFA créditée
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
