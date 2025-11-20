import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingCart, TrendingUp, Calendar } from "lucide-react";

interface CareerMetrics {
  totalReferrals: number;
  totalOrders: number;
  validatedOrders: number;
  monthlySales: number;
  teamSize: number;
  accountAgeDays: number;
}

interface CareerProgressSectionProps {
  userId: string;
}

type CareerLevel = "semeur" | "cultivateur" | "recolteur" | "gestionnaire" | "superviseur" | "coordinateur" | "directeur" | "gouverneur" | "ambassadeur" | "guide";

const LEVEL_REQUIREMENTS: Record<CareerLevel, { referrals: number; orders: number; description?: string }> = {
  semeur: { referrals: 5, orders: 15, description: "Niveau de départ" },
  cultivateur: { referrals: 15, orders: 45, description: "x3 progression" },
  recolteur: { referrals: 20, orders: 60, description: "x4 progression" },
  gestionnaire: { referrals: 30, orders: 90, description: "x6 progression" },
  superviseur: { referrals: 50, orders: 150, description: "x10 progression" },
  coordinateur: { referrals: 60, orders: 180, description: "x12 progression" },
  directeur: { referrals: 75, orders: 225, description: "x15 - Bonus fixe mensuel" },
  gouverneur: { referrals: 100, orders: 300, description: "x20 - Bonus fixe + Prime" },
  ambassadeur: { referrals: 125, orders: 375, description: "x25 - Bonus + Prime + Accompagnement" },
  guide: { referrals: 150, orders: 450, description: "x30 - Administrateur Général" },
};

const LEVEL_NAMES: Record<CareerLevel, string> = {
  semeur: "Semeur",
  cultivateur: "Cultivateur",
  recolteur: "Récolteur",
  gestionnaire: "Gestionnaire",
  superviseur: "Superviseur",
  coordinateur: "Coordinateur",
  directeur: "Directeur",
  gouverneur: "Gouverneur",
  ambassadeur: "Ambassadeur",
  guide: "Guide Moissonneur",
};

export const CareerProgressSection = ({ userId }: CareerProgressSectionProps) => {
  const [careerLevel, setCareerLevel] = useState<CareerLevel>("semeur");
  const [metrics, setMetrics] = useState<CareerMetrics>({
    totalReferrals: 0,
    totalOrders: 0,
    validatedOrders: 0,
    monthlySales: 0,
    teamSize: 0,
    accountAgeDays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareerData();
    
    // Subscribe to orders changes to auto-update career level
    const ordersChannel = supabase
      .channel('orders-career-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `broker_id=eq.${userId}`
      }, () => {
        // Trigger career level recalculation
        updateCareerLevel();
      })
      .subscribe();

    // Subscribe to referrals changes to auto-update career level
    const referralsChannel = supabase
      .channel('referrals-career-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'referrals',
        filter: `referrer_id=eq.${userId}`
      }, () => {
        // Trigger career level recalculation
        updateCareerLevel();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(referralsChannel);
    };
  }, [userId]);

  const updateCareerLevel = async () => {
    try {
      await supabase.rpc('update_user_career_level', { p_user_id: userId });
      fetchCareerData();
    } catch (error) {
      console.error('Error updating career level:', error);
    }
  };

  const fetchCareerData = async () => {
    try {
      // Fetch user profile with career level
      const { data: profile } = await supabase
        .from("profiles")
        .select("career_level, created_at")
        .eq("id", userId)
        .single();

      if (profile) {
        setCareerLevel(profile.career_level as CareerLevel);
        
        // Calculate account age
        const accountAge = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Fetch referrals count
        const { count: referralsCount } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", userId)
          .eq("level", 1);

        // Fetch orders count
        const { count: ordersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("broker_id", userId);

        // Fetch validated orders count
        const { count: validatedCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("broker_id", userId)
          .in("status", ["validated", "completed"]);

        // Fetch monthly sales (convert MSN to FCFA: 1 MSN = 750 FCFA)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        setMetrics({
          totalReferrals: referralsCount || 0,
          totalOrders: ordersCount || 0,
          validatedOrders: validatedCount || 0,
          monthlySales: 0,
          teamSize: 0,
          accountAgeDays: accountAge,
        });

        // Vérifier automatiquement si l'utilisateur a atteint les critères du niveau suivant
        // et mettre à jour son niveau de carrière
        const levels: CareerLevel[] = ["semeur", "cultivateur", "recolteur", "gestionnaire", "superviseur", "coordinateur", "directeur", "gouverneur", "ambassadeur", "guide"];
        const currentIndex = levels.indexOf(profile.career_level as CareerLevel);
        const nextLevelName = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
        
        if (nextLevelName) {
          const nextRequirements = LEVEL_REQUIREMENTS[nextLevelName];
          // Si les critères sont atteints, mettre à jour automatiquement
          if ((referralsCount || 0) >= nextRequirements.referrals && 
              (validatedCount || 0) >= nextRequirements.orders) {
            await updateCareerLevel();
          }
        }
      }
    } catch (error) {
      console.error("Error fetching career data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextLevel = (): CareerLevel | null => {
    const levels: CareerLevel[] = ["semeur", "cultivateur", "recolteur", "gestionnaire", "superviseur", "coordinateur", "directeur", "gouverneur", "ambassadeur", "guide"];
    const currentIndex = levels.indexOf(careerLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  };

  const nextLevel = getNextLevel();
  const currentRequirements = LEVEL_REQUIREMENTS[careerLevel];
  const nextRequirements = nextLevel ? LEVEL_REQUIREMENTS[nextLevel] : null;

  const calculateProgress = () => {
    if (!nextRequirements) return 100;

    const referralsProgress = (metrics.totalReferrals / nextRequirements.referrals) * 100;
    const ordersProgress = (metrics.validatedOrders / nextRequirements.orders) * 100;

    return Math.min(100, (referralsProgress + ordersProgress) / 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de Carrière</CardTitle>
          <CardDescription>Chargement de votre progression...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan de Carrière Moissonneur</CardTitle>
        <CardDescription>Suivez votre progression et débloquez de nouveaux niveaux</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level Badge */}
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-2xl font-bold text-primary">{LEVEL_NAMES[careerLevel]}</h3>
          <p className="text-sm text-muted-foreground mt-1">Niveau actuel</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{metrics.totalReferrals}</div>
            <div className="text-xs text-muted-foreground">Parrainages directs</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{metrics.validatedOrders}</div>
            <div className="text-xs text-muted-foreground">Commandes validées</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevel && nextRequirements && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">🎯 Objectif suivant</span>
              <span className="text-lg font-bold text-primary">{LEVEL_NAMES[nextLevel]}</span>
            </div>
            
            <Progress value={calculateProgress()} className="h-3" />
            
            <div className="space-y-3 text-sm">
              {nextRequirements.description && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-3">
                  <p className="text-xs font-semibold text-primary text-center">
                    {nextRequirements.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-background/50 rounded border">
                <span className="font-medium">Parrainages directs:</span>
                <span className={`font-bold text-lg ${metrics.totalReferrals >= nextRequirements.referrals ? 'text-green-600' : 'text-destructive'}`}>
                  {metrics.totalReferrals} / {nextRequirements.referrals}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded border">
                <span className="font-medium">Commandes validées:</span>
                <span className={`font-bold text-lg ${metrics.validatedOrders >= nextRequirements.orders ? 'text-green-600' : 'text-destructive'}`}>
                  {metrics.validatedOrders} / {nextRequirements.orders}
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs font-semibold text-destructive text-center">
                ⚠️ TOUS les objectifs doivent être atteints pour passer au niveau suivant
              </p>
            </div>
          </div>
        )}

        {!nextLevel && (
          <div className="text-center p-6 bg-gradient-to-br from-yellow-500/10 to-purple-500/10 rounded-lg">
            <p className="text-lg font-semibold">🎉 Guide Moissonneur Atteint!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vous avez atteint le sommet du plan de carrière Moissonneur
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};