import { Heart, Sprout, Users, Star } from "lucide-react";
import communityImg from "@/assets/community-unity.jpg";

const stories = [
  {
    icon: Sprout,
    name: "Awa, 34 ans — Maman entrepreneure",
    quote: "Grâce aux Moissonneurs, j'ai pu ouvrir mon petit commerce et payer l'école de mes trois enfants. Aujourd'hui, j'aide à mon tour d'autres femmes à se lancer.",
    badge: "Niveau Récolteur",
  },
  {
    icon: Users,
    name: "Ibrahim, 27 ans — Étudiant devenu mentor",
    quote: "J'ai commencé avec zéro franc. En invitant mes amis, j'ai bâti une équipe de 60 personnes. Mes commissions financent mes études et celles de ma sœur.",
    badge: "Niveau Cultivateur",
  },
  {
    icon: Heart,
    name: "Famille Koné — Solidarité villageoise",
    quote: "Quand mon père est tombé malade, la cagnotte des Moissonneurs et le fonds commun ont couvert les frais d'hospitalisation. On n'était plus seuls.",
    badge: "Soutien Communautaire",
  },
  {
    icon: Star,
    name: "Marie, 41 ans — Propriétaire MSN Immo",
    quote: "J'ai mis ma chambre en location sur la plateforme. En 6 mois, j'ai assez économisé pour acheter un nouveau terrain. Les Moissonneurs créent vraiment de la richesse.",
    badge: "Niveau Gestionnaire",
  },
];

export const MoissonneursStoriesSection = () => {
  return (
    <section className="py-24 relative" id="vision">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="gradient-text-cosmic">L'Esprit Moissonneur</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Plus qu'un réseau : une famille. Nous nous serrons les coudes pour créer ensemble
            de la richesse, des opportunités, et nous protéger mutuellement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
          <div className="relative rounded-3xl overflow-hidden glow-primary">
            <img
              src={communityImg}
              alt="Communauté Moissonneurs unie dans la solidarité"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold gradient-text-primary">Ensemble, on va plus loin</h3>
              <p className="text-muted-foreground leading-relaxed">
                Chaque Moissonneur est un maillon d'une chaîne de solidarité. En achetant un pack,
                en initiant une commande, en parrainant un proche, vous créez des revenus pour vous
                <span className="text-primary font-semibold"> et pour toute votre lignée jusqu'à 20 niveaux</span>.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold gradient-text-primary">Un filet de sécurité collectif</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cagnotte commune, fonds Moissonneur, transport, immobilier, emploi. Quand l'un de
                nous traverse une épreuve, la communauté répond présent. C'est ça, la vraie richesse.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stories.map((story, i) => (
            <div key={i} className="glass-card p-6 rounded-2xl hover:glow-primary transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <story.icon className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-foreground">{story.name}</p>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">"{story.quote}"</p>
                  <span className="inline-block text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    {story.badge}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
