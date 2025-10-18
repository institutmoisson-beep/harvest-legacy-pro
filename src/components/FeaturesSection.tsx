import { Network, Wallet, TrendingUp, Users, ShoppingCart, Eye } from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Network,
      title: "Réseau Binaire MLM",
      description: "Structure de parrainage binaire avec 20 niveaux de profondeur et commissions dégressives automatiques.",
      gradient: "from-primary to-primary-glow",
    },
    {
      icon: Wallet,
      title: "Portefeuille MSN",
      description: "Transférez des MSN entre membres via ID, email ou téléphone. Gérez vos gains en temps réel.",
      gradient: "from-secondary to-secondary-glow",
    },
    {
      icon: ShoppingCart,
      title: "Système de Commandes",
      description: "Créez des fiches de commandes pour vos clients. Gagnez 30% du bénéfice sur chaque commande validée.",
      gradient: "from-accent to-accent-glow",
    },
    {
      icon: Users,
      title: "Arbre Généalogique",
      description: "Visualisez votre réseau complet de filleuls sur 20 niveaux. Suivez la croissance de votre équipe.",
      gradient: "from-primary via-secondary to-accent",
    },
    {
      icon: TrendingUp,
      title: "Commissions Multi-niveaux",
      description: "20% au premier niveau, décroissant progressivement. Gains illimités sur votre réseau.",
      gradient: "from-secondary to-accent",
    },
    {
      icon: Eye,
      title: "Historique Complet",
      description: "Consultez toutes vos transactions, commissions et l'activité de vos filleuls en détail.",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="network">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text-cosmic">Fonctionnalités Puissantes</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Un système MLM complet pour bâtir votre empire de récolte
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card p-8 rounded-2xl hover:glow-primary transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
