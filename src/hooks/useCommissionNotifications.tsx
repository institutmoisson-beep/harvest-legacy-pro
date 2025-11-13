import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface CommissionNotification {
  agent_id: string;
  commission_amount: number;
  transaction_type: string;
  tier_name: string;
}

export const useCommissionNotifications = (agentId: string | undefined) => {
  useEffect(() => {
    if (!agentId) return;

    // Subscribe to new commission earnings
    const channel = supabase
      .channel('commission_earnings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_commission_earnings',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const commission = payload.new as any;
          
          toast({
            title: "💰 Commission Gagnée !",
            description: (
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-bold text-lg">
                    +{Number(commission.commission_amount).toFixed(2)} MSN
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {commission.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'} 
                    {commission.tier_name ? ` • Palier ${commission.tier_name}` : ''}
                  </p>
                </div>
              </div>
            ),
            duration: 5000,
          });

          // Play notification sound (optional)
          if (typeof Audio !== 'undefined') {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzWP1vLTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUAkPVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8LViFQxKpu/xu2ohBzWR1/LTgjMGHm7A7+OZUA0PVanl8A==');
            audio.play().catch(() => {
              // Ignore audio play errors
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);
};
