import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Star, Target, Zap } from 'lucide-react';
import { useOrdersData } from '@/hooks/useOrdersData';

interface OrdersBadgesProps {
  userId: string;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

function OrdersBadgesComponent({ userId }: OrdersBadgesProps) {
  const { orders, loading } = useOrdersData(userId);

  const badges = useMemo(() => {
    const completed = orders?.filter(o => o.status === 'completed') || [];
    const totalProfit = completed.reduce((sum, o) => sum + Number(o.profit), 0);

    return [
      {
        id: 'first_order',
        name: 'Première Commande',
        description: 'Créer votre première commande',
        icon: Star,
        color: 'hsl(var(--accent))',
        earned: (orders?.length || 0) >= 1,
        progress: Math.min(orders?.length || 0, 1),
        target: 1
      },
      {
        id: 'beginner',
        name: 'Débutant',
        description: 'Compléter 5 commandes',
        icon: Target,
        color: 'hsl(var(--primary))',
        earned: completed.length >= 5,
        progress: Math.min(completed.length, 5),
        target: 5
      },
      {
        id: 'professional',
        name: 'Professionnel',
        description: 'Compléter 25 commandes',
        icon: Award,
        color: 'hsl(var(--secondary))',
        earned: completed.length >= 25,
        progress: Math.min(completed.length, 25),
        target: 25
      },
      {
        id: 'expert',
        name: 'Expert',
        description: 'Compléter 100 commandes',
        icon: Trophy,
        color: '#FFD700',
        earned: completed.length >= 100,
        progress: Math.min(completed.length, 100),
        target: 100
      },
      {
        id: 'millionaire',
        name: 'Millionnaire',
        description: 'Gagner 1,000,000 FCFA en profits',
        icon: Zap,
        color: 'hsl(var(--secondary))',
        earned: totalProfit >= 1000000,
        progress: Math.min(totalProfit, 1000000),
        target: 1000000
      }
    ];
  }, [orders]);

  if (loading) {
    return (
      <Card className="glass-card mb-8">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Badges & Réalisations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            const progressPercent = badge.target 
              ? Math.min((badge.progress! / badge.target) * 100, 100)
              : 0;

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  badge.earned
                    ? 'border-secondary bg-secondary/10'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-3 rounded-full ${
                      badge.earned ? 'bg-secondary/20' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: badge.earned ? badge.color : 'hsl(var(--muted-foreground))' }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{badge.name}</h4>
                      {badge.earned && (
                        <Badge variant="secondary" className="text-xs">
                          Débloqué
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {badge.description}
                    </p>
                    {!badge.earned && badge.target && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progression</span>
                          <span>{badge.progress} / {badge.target}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-secondary h-2 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(OrdersBadgesComponent);
