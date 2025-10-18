import logo from "@/assets/logo.png";
import { Facebook, Twitter, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12 mt-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Les Moissonneurs" className="w-12 h-12" />
              <span className="text-2xl font-bold gradient-text-cosmic">
                Les Moissonneurs
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-md">
              Depuis les âges anciens, guidant des civilisations vers la prospérité. 
              Rejoignez l'héritage et construisez votre empire.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:glow-primary transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:glow-primary transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:glow-primary transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:glow-primary transition-all">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">Navigation</h3>
            <ul className="space-y-2">
              <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">À Propos</a></li>
              <li><a href="#network" className="text-muted-foreground hover:text-primary transition-colors">Le Réseau</a></li>
              <li><a href="#commissions" className="text-muted-foreground hover:text-primary transition-colors">Commissions</a></li>
              <li><a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">Légal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Mentions légales</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">CGV</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Les Moissonneurs. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};
