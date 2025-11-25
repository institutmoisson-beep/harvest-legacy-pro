import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserJobDomainBadgesProps {
  userId: string;
  variant?: 'default' | 'secondary';
  showLabel?: boolean;
  maxDisplay?: number;
}

interface UserJobProfile {
  id: string;
  job_domain_id: string;
  is_primary: boolean;
  job_domains: {
    id: string;
    name: string;
    category: string;
    emoji: string | null;
    description: string | null;
  };
}

export default function UserJobDomainBadges({
  userId,
  variant = 'secondary',
  showLabel = false,
  maxDisplay = 3,
}: UserJobDomainBadgesProps) {
  const [jobProfiles, setJobProfiles] = useState<UserJobProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserJobProfiles();
  }, [userId]);

  const fetchUserJobProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_job_profiles')
        .select(
          `
          id,
          job_domain_id,
          is_primary,
          job_domains (
            id,
            name,
            category,
            emoji,
            description
          )
        `
        )
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setJobProfiles(data || []);
    } catch (error) {
      console.error('Error fetching user job profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (jobProfiles.length === 0) {
    return null;
  }

  const displayedProfiles = jobProfiles.slice(0, maxDisplay);
  const hiddenCount = jobProfiles.length - displayedProfiles.length;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {displayedProfiles.map((profile) => (
          <Tooltip key={profile.id}>
            <TooltipTrigger asChild>
              <Badge variant={variant} className="cursor-help">
                <span className="mr-1">
                  {profile.job_domains?.emoji || '💼'}
                </span>
                {showLabel ? profile.job_domains?.name : profile.job_domains?.category}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="text-sm">
                <p className="font-semibold">
                  {profile.job_domains?.emoji} {profile.job_domains?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile.job_domains?.category}
                </p>
                {profile.job_domains?.description && (
                  <p className="text-xs mt-1">
                    {profile.job_domains.description}
                  </p>
                )}
                {profile.is_primary && (
                  <p className="text-xs font-semibold mt-1 text-primary">
                    Domaine principal
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="text-sm space-y-1">
                {jobProfiles.slice(maxDisplay).map((profile) => (
                  <p key={profile.id}>
                    {profile.job_domains?.emoji} {profile.job_domains?.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
