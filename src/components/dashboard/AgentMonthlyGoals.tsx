import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, Activity, Trophy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AgentMonthlyGoalsProps {
  agentId: string;
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

const goalConfig: Record<string, { label: string; icon: any; color: string; unit: string }> = {
  transactions: {
    label: 'Transactions',
    icon: Activity,
    color: 'hsl(var(--primary))',
    unit: ''
  },
  volume: {
    label: 'Volume Total',
    icon: TrendingUp,
    color: 'hsl(var(--secondary))',
    unit: ' MSN'
  },
  commissions: {
    label: 'Commissions',
    icon: DollarSign,
    color: 'hsl(var(--accent))',
    unit: ' MSN'
  }
};

export default function AgentMonthlyGoals({ agentId }: AgentMonthlyGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchGoals();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('agent-goals')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agent_monthly_goals',
          filter: `agent_id=eq.${agentId}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            toast({
              title: '🎯 Objectif Atteint!',
              description: `Félicitations! Vous avez gagné ${payload.new.reward_amount} FCFA!`,
            });
          }
          fetchGoals();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [agentId]);

  const fetchGoals = async () => {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const { data, error } = await supabase
        .from('agent_monthly_goals' as any)
        .select('*')
        .eq('agent_id', agentId)
        .eq('month', currentMonth.toISOString().split('T')[0])
        .order('goal_type');

      if (error) throw error;
      setGoals((data as any) || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
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
          Objectifs Mensuels
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
                          {goal.current_value.toLocaleString()}{config.unit} / {goal.target_value.toLocaleString()}{config.unit}
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
