import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, User, LogIn, LogOut, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRoles();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: "/marketplace", label: "Marketplace" },
    { href: "#about", label: "À Propos" },
    { href: "#network", label: "Le Réseau" },
    { href: "#commissions", label: "Commissions" },
    { href: "#contact", label: "Contact" },
  ];

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
            {navLinks.map((link) =>
              link.to ? (
                <Link key={link.label} to={link.to} className="text-foreground/80 hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className="text-foreground/80 hover:text-primary transition-colors">
                  {link.label}
                </a>
              )
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/dashboard')}>
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
                {(user?.email === 'picelvus@gmail.com' || isSuperAdmin()) && (
                  <Button variant="default" size="sm" onClick={() => navigate('/level-admin')}>
                    Level Admin
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/auth')}>
                  <LogIn className="w-4 h-4" />
                  Connexion
                </Button>
                <Button variant="default" size="sm" onClick={() => navigate('/auth')}>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Inscription</span>
                </Button>
              </>
            )}

            {/* Mobile Menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="gradient-text-cosmic">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {navLinks.map((link) =>
                    link.to ? (
                      <Link
                        key={link.label}
                        to={link.to}
                        className="text-foreground/80 hover:text-primary transition-colors text-lg py-2"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        className="text-foreground/80 hover:text-primary transition-colors text-lg py-2"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </a>
                    )
                  )}
                  <hr className="border-border" />
                  {user ? (
                    <>
                      <Button variant="outline" className="justify-start" onClick={() => { navigate('/dashboard'); setOpen(false); }}>
                        <User className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => { signOut(); setOpen(false); }}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="justify-start" onClick={() => { navigate('/auth'); setOpen(false); }}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Connexion
                      </Button>
                      <Button variant="default" className="justify-start" onClick={() => { navigate('/auth'); setOpen(false); }}>
                        <User className="w-4 h-4 mr-2" />
                        Inscription
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
