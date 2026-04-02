import { Button } from "@/components/ui/button";
import { Sparkles, Users, TrendingUp, MessageCircle, Send, Heart, Shield, Briefcase, Globe } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full glow-primary animate-pulse">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium gradient-text-cosmic">
              Ensemble, nous récoltons l'avenir
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-text-cosmic">Les Moissonneurs</span>
          </h1>

          {/* Vision Statement */}
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Notre vision est simple mais puissante : <span className="text-primary font-semibold">se mettre ensemble</span> pour 
            créer de la richesse, bâtir des emplois, s'entraider et se protéger mutuellement. 
            Chaque Moissonneur est un maillon essentiel d'une chaîne de solidarité et de prospérité.
          </p>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des milliers de personnes ont déjà relevé le défi. Un père de famille a pu financer 
            l'éducation de ses enfants. Une jeune entrepreneure a lancé son commerce grâce au réseau. 
            <span className="text-accent font-semibold"> Votre histoire de réussite commence ici.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="cosmic"
              size="xl"
              className="w-full sm:w-auto"
              onClick={() => window.location.href = '/auth'}
            >
              <Users className="w-5 h-5" />
              Devenir Moissonneur
            </Button>
            <Button
              variant="glass"
              size="xl"
              className="w-full sm:w-auto"
              onClick={() => window.location.href = '#vision'}
            >
              <Heart className="w-5 h-5" />
              Notre Vision
            </Button>
            <Button
              variant="cosmic"
              size="xl"
              className="w-full sm:w-auto"
              onClick={() => window.location.href = '/orders-dashboard'}
            >
              <Send className="w-5 h-5" />
              Initier une Commande
            </Button>
          </div>

          {/* Social Media Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white border-green-600"
              onClick={() => window.open('https://chat.whatsapp.com/CskEjfoIc660rXnbx7T0oz?mode=wwt', '_blank')}
            >
              <MessageCircle className="w-5 h-5" />
              Rejoindre WhatsApp
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
              onClick={() => window.open('https://t.me/+1zoaiLGzw0UzMjc8', '_blank')}
            >
              <Send className="w-5 h-5" />
              Rejoindre Telegram
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {[
              { label: "Moissonneurs Actifs", value: "10,000+", icon: Users },
              { label: "Commissions Versées", value: "5M FCFA", icon: TrendingUp },
              { label: "Niveaux de Réseau", value: "20+", icon: Sparkles },
            ].map((stat, index) => (
              <div key={index} className="glass-card p-6 rounded-xl hover:glow-primary transition-all duration-300">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl font-bold gradient-text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
