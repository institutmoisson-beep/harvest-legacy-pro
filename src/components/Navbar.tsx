import { Button } from "@/components/ui/button";
import { Menu, User, LogIn, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Les Moissonneurs" className="w-10 h-10" />
            <span className="text-xl font-bold gradient-text-cosmic hidden sm:block">
              Les Moissonneurs
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-foreground/80 hover:text-primary transition-colors">
              À Propos
            </a>
            <a href="#network" className="text-foreground/80 hover:text-primary transition-colors">
              Le Réseau
            </a>
            <a href="#commissions" className="text-foreground/80 hover:text-primary transition-colors">
              Commissions
            </a>
            <a href="#contact" className="text-foreground/80 hover:text-primary transition-colors">
              Contact
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex"
                  onClick={() => navigate('/dashboard')}
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="w-4 h-4" />
                  Connexion
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Inscription</span>
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
