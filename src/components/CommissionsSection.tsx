import { TrendingUp, Users, Award, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    name: "Aminata K.",
    role: "Moissonneur depuis 8 mois",
    quote: "Grâce aux Moissonneurs, j'ai pu ouvrir ma boutique de cosmétiques. Le réseau m'a soutenue financièrement et moralement.",
  },
  {
    name: "Jean-Paul M.",
    role: "Père de famille, 3 enfants",
    quote: "Les commissions de parrainage m'ont permis de payer la scolarité de mes enfants. Aujourd'hui, mon équipe compte 45 membres.",
  },
  {
    name: "Fatou D.",
    role: "Conductrice MSN Transport",
    quote: "Je suis devenue conductrice sur la plateforme. Je gagne ma vie dignement tout en aidant la communauté à se déplacer.",
  },
];

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
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-40 left-20 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-primary/50 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Vision Section */}
        <div className="text-center mb-20" id="vision">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text-cosmic">Notre Vision</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            Les Moissonneurs, c'est le pari audacieux de prouver que <span className="text-primary font-semibold">l'union fait la force</span>. 
            Nous croyons qu'en mettant nos ressources, nos compétences et notre énergie ensemble, 
            nous pouvons créer une économie solidaire où personne n'est laissé pour compte.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Créer de la Richesse</h3>
              <p className="text-sm text-muted-foreground">Commissions, commerce, services — chaque membre génère des revenus pour lui et son réseau.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-4xl mb-3">👷</div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Créer des Emplois</h3>
              <p className="text-sm text-muted-foreground">Conducteurs, livreurs, agents, hôtes — le réseau offre des métiers concrets et accessibles.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-bold text-lg mb-2 text-foreground">S'entraider & Se Protéger</h3>
              <p className="text-sm text-muted-foreground">Cagnottes, fonds d'urgence, soutien communautaire — ensemble, on est plus forts.</p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-center mb-10">
            <span className="gradient-text-cosmic">Ils ont relevé le défi</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl hover:glow-primary transition-all duration-300">
                <Quote className="w-8 h-8 text-primary/40 mb-3" />
                <p className="text-muted-foreground italic mb-4 leading-relaxed">"{t.quote}"</p>
                <div className="border-t border-border/50 pt-3">
                  <p className="font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission Levels */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text-cosmic">Plan de Commissions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gagnez jusqu'à 20 niveaux de profondeur avec des commissions dégressives
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
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

          <div className="space-y-6">
            <div className="glass-card p-8 rounded-2xl hover:glow-primary transition-all duration-300">
              <Award className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-2xl font-bold mb-3">Commissions sur Commandes</h3>
              <p className="text-muted-foreground mb-4">
                Gagnez <span className="text-accent font-bold">30%</span> du 
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
              <h3 className="text-2xl font-bold mb-3">Le Défi Collectif</h3>
              <p className="text-muted-foreground mb-4">
                Rejoignez <span className="text-secondary font-bold">10 000+ Moissonneurs</span> qui 
                ont déjà choisi de bâtir ensemble. Transport, immobilier, marketplace — un écosystème entier à votre portée.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Commissions automatiques sur 20 niveaux
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Emplois créés au sein du réseau
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Protection et entraide communautaire
                </li>
              </ul>
            </div>

            <Button variant="cosmic" size="xl" className="w-full" onClick={() => window.location.href = '/auth'}>
              Relever le Défi Maintenant
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
