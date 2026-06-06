import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import CurrencySelector from '@/components/CurrencySelector';
import {
  LayoutDashboard, Store, Wallet, Package, MessageSquare, LogIn, UserPlus,
  Truck, Phone, Settings2, Users, Sparkles, Radio, Wheat, IdCard, ScanLine,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const items = (logged: boolean) => [
  !logged && { to: '/auth', label: 'Connexion', icon: LogIn, color: 'from-emerald-500 to-emerald-600' },
  !logged && { to: '/auth?signup=1', label: 'Créer un compte', icon: UserPlus, color: 'from-violet-500 to-violet-600' },
  { to: '/dashboard', label: 'Mon tableau de bord', icon: LayoutDashboard, color: 'from-emerald-500 to-emerald-700' },
  { to: '/canal', label: 'Canal Officiel', icon: Radio, color: 'from-violet-600 to-purple-700' },
  { to: '/marketplace', label: 'Marketplace boutiques', icon: Store, color: 'from-violet-500 to-violet-700' },
  { to: '/packs', label: 'Packs MSN Meno', icon: Package, color: 'from-amber-500 to-orange-600' },
  { to: '/my-shop', label: 'Ma boutique', icon: Store, color: 'from-pink-500 to-rose-600' },
  { to: '/dashboard?tab=wallet', label: 'Mon portefeuille', icon: Wallet, color: 'from-emerald-600 to-emerald-800' },
  { to: '/community-delivery', label: 'Livraisons & relais', icon: Truck, color: 'from-blue-500 to-indigo-600' },
  { to: '/messages', label: 'Messages MSN', icon: MessageSquare, color: 'from-cyan-500 to-blue-600' },
  { to: '/enterprises', label: 'Annuaire entreprises', icon: Users, color: 'from-slate-600 to-slate-800' },
  { to: '/support', label: 'Centre d\'appel', icon: Phone, color: 'from-violet-600 to-purple-700' },
  { to: '/profile', label: 'Paramètres compte', icon: Settings2, color: 'from-gray-600 to-gray-800' },
].filter(Boolean) as Array<{ to: string; label: string; icon: any; color: string }>;

interface Props {
  trigger?: React.ReactNode;
}

export default function MemberHubSheet({ trigger }: Props) {
  const { user } = useAuth();
  const list = items(!!user);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            size="lg"
            className="text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #00A859, #7C3AED)' }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Espace Gestionnaire
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Espace Gestionnaire</SheetTitle>
        </SheetHeader>

        <div className="mt-4 mb-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Devise d'affichage</div>
          <CurrencySelector />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 pb-6">
          {list.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className="group rounded-xl p-3 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all"
                style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                }}
              >
                <div className={`rounded-xl p-3 bg-gradient-to-br ${it.color} h-full flex flex-col gap-2`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-semibold leading-tight">{it.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
