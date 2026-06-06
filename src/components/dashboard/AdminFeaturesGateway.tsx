import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Phone, Truck, Car, Building, Building2, Package, Ticket, Heart,
  Wallet, CreditCard, Megaphone, Users, UserCog, Lock, MapPin, ShoppingCart,
  FileText, BarChart3, Coins, Database, Bell, Settings, ShoppingBag,
  Briefcase, Globe, Layers, Activity, Wheat, IdCard, ScanLine,
} from 'lucide-react';

interface Item {
  label: string;
  icon: any;
  route: string;
  description?: string;
}

interface Group {
  title: string;
  color: string;
  items: Item[];
}

const GROUPS: Group[] = [
  {
    title: 'Vue d\'ensemble',
    color: 'from-violet-600 to-purple-700',
    items: [
      { label: 'Super Admin', icon: Shield, route: '/level-admin', description: 'Contrôle total' },
      { label: 'Admin Dashboard', icon: BarChart3, route: '/admin', description: 'Vue admin standard' },
      { label: 'Gestionnaire de tâches', icon: Layers, route: '/level-admin?tab=hub' },
      { label: 'Audit & Logs', icon: Activity, route: '/level-admin?tab=audit' },
    ],
  },
  {
    title: 'Communication',
    color: 'from-emerald-500 to-emerald-700',
    items: [
      { label: 'Centre d\'Appel', icon: Phone, route: '/admin/call-center' },
      { label: 'Canal de diffusion', icon: Megaphone, route: '/level-admin?tab=broadcast' },
      { label: 'Notifications', icon: Bell, route: '/notifications' },
    ],
  },
  {
    title: 'Finances',
    color: 'from-emerald-600 to-teal-700',
    items: [
      { label: 'Trésorerie', icon: Wallet, route: '/level-admin?tab=treasury' },
      { label: 'Transactions', icon: CreditCard, route: '/level-admin?tab=transactions' },
      { label: 'Crédits & Épargnes', icon: Coins, route: '/admin/credits' },
      { label: 'Fonds Moissonneur', icon: Database, route: '/level-admin?tab=fund' },
      { label: 'Paiements', icon: CreditCard, route: '/admin/payments' },
    ],
  },
  {
    title: 'Commerce',
    color: 'from-amber-500 to-orange-600',
    items: [
      { label: 'Packs MLM', icon: Package, route: '/admin/packs' },
      { label: 'Marketplace', icon: ShoppingBag, route: '/marketplace' },
      { label: 'Commandes', icon: ShoppingCart, route: '/level-admin?tab=orders' },
      { label: 'Codes Promo', icon: Ticket, route: '/level-admin?tab=promo' },
    ],
  },
  {
    title: 'Livraison & Transport',
    color: 'from-blue-500 to-indigo-600',
    items: [
      { label: 'Livraisons', icon: Truck, route: '/admin/deliveries' },
      { label: 'Points Relais', icon: MapPin, route: '/level-admin?tab=delivery' },
      { label: 'Transport / VTC', icon: Car, route: '/admin/transport' },
    ],
  },
  {
    title: 'Communauté',
    color: 'from-pink-500 to-rose-600',
    items: [
      { label: 'Événements', icon: Ticket, route: '/admin/events' },
      { label: 'Cagnottes', icon: Heart, route: '/admin/fundraisers' },
      { label: 'MSN Immo', icon: Building, route: '/admin/immo' },
      { label: 'Entreprises', icon: Building2, route: '/admin/enterprises' },
      { label: 'Métiers / Domaines', icon: Briefcase, route: '/admin/job-domains' },
      { label: 'Le Grenier (Invest.)', icon: Wheat, route: '/level-admin?tab=grenier', description: 'Projets communautaires' },
      { label: 'Vérifier Moissonneur', icon: ScanLine, route: '/verifier', description: 'Scanner QR membre' },
      { label: 'Ma Carte', icon: IdCard, route: '/ma-carte', description: 'Carte digitale' },
    ],
  },
  {
    title: 'Membres & Sécurité',
    color: 'from-slate-600 to-slate-800',
    items: [
      { label: 'Membres', icon: Users, route: '/level-admin?tab=members' },
      { label: 'Rôles', icon: UserCog, route: '/level-admin?tab=roles' },
      { label: 'Permissions', icon: Lock, route: '/level-admin?tab=permissions' },
      { label: 'Représentants Géo', icon: Globe, route: '/level-admin?tab=geographic' },
    ],
  },
];

export default function AdminFeaturesGateway() {
  const navigate = useNavigate();
  const total = GROUPS.reduce((s, g) => s + g.items.length, 0);

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Gestionnaire de fonctionnalités
          </CardTitle>
          <Badge variant="secondary">{total} modules</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Accès centralisé à toutes les fonctionnalités administratives.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
              {g.title}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.route + it.label}
                    onClick={() => navigate(it.route)}
                    className={`text-left rounded-xl p-4 text-white shadow-md hover:shadow-xl hover:scale-[1.03] transition-all bg-gradient-to-br ${g.color}`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="text-sm font-semibold leading-tight">{it.label}</div>
                    {it.description && (
                      <div className="text-[10px] opacity-80 mt-1">{it.description}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
