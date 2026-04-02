import { Network, Wallet, TrendingUp, Users, ShoppingCart, Shield, Heart, Briefcase } from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Heart,
      title: "Entraide & Solidarité",
      description: "Participez aux cagnottes communautaires, aidez un membre en difficulté. La solidarité est notre force première.",
      gradient: "from-primary to-primary-glow",
    },
    {
      icon: Briefcase,
      title: "Création d'Emplois",
      description: "Devenez chauffeur, livreur, agent commercial ou hôte immobilier. Le réseau crée des opportunités concrètes pour tous.",
      gradient: "from-secondary to-secondary-glow",
    },
    {
      icon: Shield,
      title: "Protection Mutuelle",
      description: "Un réseau qui veille sur chacun. Fonds d'urgence, soutien logistique et accompagnement dans les moments difficiles.",
      gradient: "from-accent to-accent-glow",
    },
    {
      icon: Network,
      title: "Réseau Multi-niveaux",
      description: "Construisez un réseau sur 20 niveaux. Chaque membre que vous parrainez renforce toute la communauté.",
      gradient: "from-primary via-secondary to-accent",
    },
    {
      icon: Wallet,
      title: "Portefeuille MSN",
      description: "Gérez vos revenus en temps réel. Transférez, payez des produits, rechargez et retirez en toute sécurité.",
      gradient: "from-secondary to-accent",
    },
    {
      icon: ShoppingCart,
      title: "Marketplace & Services",
      description: "Boutiques en ligne, transport, immobilier, billetterie — un écosystème complet pour créer et consommer ensemble.",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="network">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text-cosmic">Un Écosystème Complet</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Bien plus qu'un réseau — une communauté qui crée de la richesse, des emplois et de la solidarité
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
