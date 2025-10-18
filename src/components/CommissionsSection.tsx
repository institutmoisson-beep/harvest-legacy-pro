import { TrendingUp, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CommissionsSection = () => {
  const levels = [
    { level: 1, percentage: 20, color: "from-accent to-accent-glow" },
    { level: 2, percentage: 18, color: "from-accent/90 to-accent" },
    { level: 3, percentage: 16, color: "from-accent/80 to-accent/90" },
    { level: 4, percentage: 14, color: "from-accent/70 to-accent/80" },
    { level: 5, percentage: 12, color: "from-accent/60 to-accent/70" },
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="commissions">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-40 left-20 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-primary/50 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text-cosmic">Plan de Commissions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gagnez jusqu'à 20 niveaux de profondeur avec des commissions dégressives
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Commission levels */}
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-accent" />
                Structure des Commissions
              </h3>
              <div className="space-y-3">
                {levels.map((item) => (
                  <div key={item.level} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold flex-shrink-0">
                      {item.level}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Niveau {item.level}</span>
                        <span className="text-lg font-bold text-accent">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                          style={{ width: `${item.percentage * 5}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    6-20
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Commissions dégressives jusqu'au niveau 20
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Additional info */}
          <div className="space-y-6">
            <div className="glass-card p-8 rounded-2xl hover:glow-primary transition-all duration-300">
              <Award className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-2xl font-bold mb-3">Commissions sur Commandes</h3>
              <p className="text-muted-foreground mb-4">
                En plus des commissions de parrainage, gagnez <span className="text-accent font-bold">30%</span> du 
                bénéfice net sur chaque commande que vous initiez pour vos clients.
              </p>
              <div className="glass-card p-4 rounded-xl bg-accent/10 border-accent/20">
                <p className="text-sm font-medium mb-2">Exemple concret :</p>
                <p className="text-sm text-muted-foreground">
                  Commande : Sac de riz à <span className="text-accent">17.000 FCFA</span><br />
                  Bénéfice net : <span className="text-accent">500 FCFA</span><br />
                  Votre commission : <span className="text-accent font-bold">150 FCFA (30%)</span>
                </p>
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl hover:glow-secondary transition-all duration-300">
              <Users className="w-12 h-12 text-secondary mb-4" />
              <h3 className="text-2xl font-bold mb-3">Réseau Binaire Illimité</h3>
              <p className="text-muted-foreground mb-4">
                Construisez un réseau sur <span className="text-secondary font-bold">20 niveaux</span> minimum. 
                Plus votre équipe grandit, plus vos revenus augmentent exponentiellement.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Commissions automatiques
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Paiements instantanés
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Suivi en temps réel
                </li>
              </ul>
            </div>

            <Button variant="cosmic" size="xl" className="w-full">
              Commencer Maintenant
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
