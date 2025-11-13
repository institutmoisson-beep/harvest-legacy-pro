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

type CareerLevel = "novice" | "actif" | "zonal" | "principal" | "gouverneur" | "comte" | "general" | "royal_8" | "royal_9" | "guide";

const LEVEL_REQUIREMENTS: Record<CareerLevel, { referrals: number; orders: number; teamSize?: number; sales?: number; accountAge?: number }> = {
  novice: { referrals: 0, orders: 0, accountAge: 0 },
  actif: { referrals: 4, orders: 5, accountAge: 30 },
  zonal: { referrals: 15, orders: 15, teamSize: 20 },
  principal: { referrals: 15, orders: 15, sales: 250000 },
  gouverneur: { referrals: 15, orders: 15, teamSize: 3 },
  comte: { referrals: 15, orders: 15, teamSize: 5 },
  general: { referrals: 15, orders: 15, teamSize: 8 },
  royal_8: { referrals: 15, orders: 15, teamSize: 10 },
  royal_9: { referrals: 15, orders: 15, teamSize: 15 },
  guide: { referrals: 15, orders: 15, teamSize: 20, sales: 250000 },
};

export const CareerProgressSection = ({ userId }: CareerProgressSectionProps) => {
  const [careerLevel, setCareerLevel] = useState<CareerLevel>("novice");
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

    return () => { supabase.removeChannel(ordersChannel); };
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

        // Fetch monthly sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: salesData } = await supabase
          .from("orders")
          .select("purchase_price, quantity")
          .eq("broker_id", userId)
          .in("status", ["validated", "completed"])
          .gte("created_at", thirtyDaysAgo.toISOString());

        const totalSales = salesData?.reduce(
          (sum, order) => sum + (order.purchase_price * order.quantity),
          0
        ) || 0;

        // Fetch team size (referrals with orders)
        const { data: teamData } = await supabase
          .from("referrals")
          .select("referred_id")
          .eq("referrer_id", userId)
          .eq("level", 1);

        const referredIds = teamData?.map(r => r.referred_id) || [];
        
        let activeTeamSize = 0;
        if (referredIds.length > 0) {
          const { count } = await supabase
            .from("orders")
            .select("broker_id", { count: "exact", head: true })
            .in("broker_id", referredIds);
          activeTeamSize = count || 0;
        }

        setMetrics({
          totalReferrals: referralsCount || 0,
          totalOrders: ordersCount || 0,
          validatedOrders: validatedCount || 0,
          monthlySales: totalSales,
          teamSize: activeTeamSize,
          accountAgeDays: accountAge,
        });
      }
    } catch (error) {
      console.error("Error fetching career data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextLevel = (): CareerLevel | null => {
    const levels: CareerLevel[] = ["novice", "actif", "zonal", "principal", "gouverneur", "comte", "general", "royal_8", "royal_9", "guide"];
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
    
    let additionalProgress = 100;
    if (nextRequirements.teamSize) {
      additionalProgress = Math.min(additionalProgress, (metrics.teamSize / nextRequirements.teamSize) * 100);
    }
    if (nextRequirements.sales) {
      additionalProgress = Math.min(additionalProgress, (metrics.monthlySales / nextRequirements.sales) * 100);
    }
    if (nextRequirements.accountAge) {
      additionalProgress = Math.min(additionalProgress, (metrics.accountAgeDays / nextRequirements.accountAge) * 100);
    }

    return Math.min(100, (referralsProgress + ordersProgress + additionalProgress) / 3);
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
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-xl font-bold capitalize">{careerLevel}</h3>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{metrics.totalReferrals}</div>
            <div className="text-xs text-muted-foreground">Parrainages</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{metrics.validatedOrders}</div>
            <div className="text-xs text-muted-foreground">Commandes validées</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{metrics.teamSize}</div>
            <div className="text-xs text-muted-foreground">Équipe active</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{(metrics.monthlySales / 1000).toFixed(0)}k</div>
            <div className="text-xs text-muted-foreground">Ventes (30j)</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevel && nextRequirements && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Prochain niveau</span>
              <span className="text-lg font-bold capitalize">{nextLevel}</span>
            </div>
            
            <Progress value={calculateProgress()} className="h-2" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parrainages requis:</span>
                <span className="font-medium">{metrics.totalReferrals} / {nextRequirements.referrals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commandes validées:</span>
                <span className="font-medium">{metrics.validatedOrders} / {nextRequirements.orders}</span>
              </div>
              {nextRequirements.teamSize && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Équipe active:</span>
                  <span className="font-medium">{metrics.teamSize} / {nextRequirements.teamSize}</span>
                </div>
              )}
              {nextRequirements.sales && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventes mensuelles:</span>
                  <span className="font-medium">{metrics.monthlySales.toLocaleString()} / {nextRequirements.sales.toLocaleString()} FCFA</span>
                </div>
              )}
              {nextRequirements.accountAge && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ancienneté:</span>
                  <span className="font-medium">{metrics.accountAgeDays} / {nextRequirements.accountAge} jours</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!nextLevel && (
          <div className="text-center p-6 bg-gradient-to-br from-yellow-500/10 to-purple-500/10 rounded-lg">
            <p className="text-lg font-semibold">🎉 Niveau Maximum Atteint!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vous êtes au sommet de la hiérarchie des Moissonneurs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};