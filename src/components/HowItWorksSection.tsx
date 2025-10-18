import { UserPlus, Link2, DollarSign, TrendingUp } from "lucide-react";

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Inscription Gratuite",
      description: "Créez votre compte Moissonneur avec vos informations de base. Recevez instantanément votre code de parrainage unique.",
      number: "01",
    },
    {
      icon: Link2,
      title: "Partagez Votre Lien",
      description: "Distribuez votre lien de parrainage. Chaque nouveau membre rejoint votre réseau binaire automatiquement.",
      number: "02",
    },
    {
      icon: DollarSign,
      title: "Créez des Commandes",
      description: "Initiez des fiches de commandes pour vos clients. Gagnez 30% du bénéfice net sur chaque vente validée.",
      number: "03",
    },
    {
      icon: TrendingUp,
      title: "Gagnez des Commissions",
      description: "Recevez 20% au niveau 1, décroissant jusqu'à 20 niveaux. Plus votre réseau grandit, plus vous gagnez.",
      number: "04",
    },
  ];

  return (
    <section className="py-24 relative" id="about">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text-cosmic">Comment Ça Marche</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Rejoignez les Moissonneurs en 4 étapes simples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary to-secondary opacity-30 -translate-x-1/2 z-0" />
              )}

              <div className="glass-card p-8 rounded-2xl hover:glow-primary transition-all duration-300 relative z-10 h-full">
                {/* Number badge */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-lg glow-primary">
                  {step.number}
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mb-6">
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
