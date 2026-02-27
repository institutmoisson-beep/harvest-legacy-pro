import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, User, MessageCircle, Bell, Download, Coins, TrendingUp, 
  ShoppingBag, Store, Users, ShoppingCart, CreditCard, Phone, AlertCircle,
  MapPin, LogOut
} from 'lucide-react';
import VoiceCall from '@/components/VoiceCall';
import { useState } from 'react';

interface DashboardGatewayProps {
  hasAdminAccess: boolean;
  hasMerchantRole: boolean;
  onSignOut: () => void;
}

const CALL_CENTER_LINES = [
  { code: 'MSN6161', label: 'Commandes & Services', icon: ShoppingCart, color: 'bg-primary/15 text-primary' },
  { code: 'MSN9191', label: 'Réclamations & Support', icon: AlertCircle, color: 'bg-destructive/15 text-destructive' },
];

const MENU_ITEMS = [
  { icon: User, label: 'Profil', route: '/profile', always: true },
  { icon: MessageCircle, label: 'Support', route: '/support', always: true },
  { icon: Bell, label: 'Notifications', route: '/notifications', always: true },
  { icon: MessageCircle, label: 'Messages', route: '/messages', always: true },
  { icon: Coins, label: 'Investissements', route: '/investments', always: true },
  { icon: TrendingUp, label: 'Investisseur', route: '/investor-dashboard', always: true },
  { icon: Coins, label: 'Tontines', route: '/tontines', always: true },
  { icon: TrendingUp, label: 'Dashboard Tontine', route: '/tontine-dashboard', always: true },
  { icon: ShoppingBag, label: 'Ma Boutique', route: '/my-shop', always: true },
  { icon: CreditCard, label: 'Achat à crédit', route: '/credit-request', always: true },
  { icon: Coins, label: 'Mes épargnes', route: '/my-savings', always: true },
  { icon: Store, label: 'QR Menu', route: '/establish', always: true },
  { icon: Users, label: 'Agent', route: '/agent', always: true },
  { icon: ShoppingCart, label: 'Commandes', route: '/orders-dashboard', always: true },
  { icon: ShoppingBag, label: 'Proposer', route: '/proposer', always: true },
  { icon: Download, label: 'Installer App', route: '/install', always: true },
  { icon: MapPin, label: 'Livraison', route: '/community-delivery', always: true },
];

export default function DashboardGateway({ hasAdminAccess, hasMerchantRole, onSignOut }: DashboardGatewayProps) {
  const navigate = useNavigate();
  const [selectedCallCode, setSelectedCallCode] = useState<string | null>(null);

  const allItems = [
    ...(hasAdminAccess ? [{ icon: Shield, label: 'Admin', route: '/admin', always: true }] : []),
    ...(hasMerchantRole ? [{ icon: Store, label: 'Marchand', route: '/merchant', always: true }] : []),
    ...MENU_ITEMS,
  ];

  return (
    <div className="space-y-4">
      {/* Centre d'Appel */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Centre d'Appel
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CALL_CENTER_LINES.map((line) => (
              <button
                key={line.code}
                onClick={() => setSelectedCallCode(line.code === selectedCallCode ? null : line.code)}
                className={`p-3 rounded-xl border transition-all text-left ${
                  selectedCallCode === line.code
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg ${line.color} flex items-center justify-center mb-1.5`}>
                  <line.icon className="h-4 w-4" />
                </div>
                <p className="font-bold text-xs text-foreground">{line.code}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{line.label}</p>
              </button>
            ))}
          </div>
          <VoiceCall prefilledCode={selectedCallCode || undefined} />
        </CardContent>
      </Card>

      {/* Menu Passerelle */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Menu</h3>
          <div className="grid grid-cols-4 gap-2">
            {allItems.map((item) => (
              <button
                key={item.route + item.label}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2">
                  {item.label}
                </span>
              </button>
            ))}
            <button
              onClick={onSignOut}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-destructive/10 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-[10px] font-medium text-destructive text-center leading-tight">
                Déconnexion
              </span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
