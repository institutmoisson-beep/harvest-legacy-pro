import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  earned_at: string;
}

export interface CareerLevelBadgeProps {
  agentId: string;
}

export function CareerLevelBadge({ agentId }: CareerLevelBadgeProps) {
  const [badges, setBadges] = useState<AgentBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [agentId]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_earned_badges')
        .select(`
          earned_at,
          agent_badges:badge_id (
            id,
            name,
            description,
            icon,
            badge_color
          )
        `)
        .eq('agent_id', agentId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      const formattedBadges = (data || [])
        .filter((item: any) => item.agent_badges)
        .map((item: any) => ({
          ...item.agent_badges,
          earned_at: item.earned_at,
        }));

      setBadges(formattedBadges);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Badges & Réalisations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun badge gagné</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-3 rounded-lg border"
                  style={{ borderColor: badge.badge_color + '40' }}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <Badge style={{ backgroundColor: badge.badge_color + '30' }}>
                    {badge.name}
                  </Badge>
                  <p className="text-xs text-center mt-2 line-clamp-2">{badge.description}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
