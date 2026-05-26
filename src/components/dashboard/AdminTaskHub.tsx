import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, ShoppingCart, Package, CreditCard, Calendar, HeartHandshake,
  Car, Home, Megaphone, Truck, FileText, Users, Loader2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Task {
  key: string;
  label: string;
  icon: any;
  category: string;
  tab?: string;
  count: number;
  color: string;
}

interface Props { onNavigate?: (tab: string) => void; }

export default function AdminTaskHub({ onNavigate }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const head = (q: any) => q.select('*', { count: 'exact', head: true });
    const safeCount = async (p: Promise<any>) => {
      try { const { count } = await p; return count || 0; } catch { return 0; }
    };

    const [
      withdrawals, transactions, credits, packPurchases, relayDeliveries,
      orders, events, fundraisers, rides, immo, unreadCanal,
    ] = await Promise.all([
      safeCount(head(sb.from('wallet_transactions')).eq('status', 'pending').eq('transaction_type', 'withdrawal')),
      safeCount(head(sb.from('wallet_transactions')).eq('status', 'pending')),
      safeCount(head(sb.from('credit_requests')).eq('status', 'pending')),
      safeCount(head(sb.from('mlm_pack_purchases')).eq('status', 'pending')),
      safeCount(head(sb.from('mlm_pack_purchases')).eq('delivery_mode', 'relay').is('picked_up_at', null)),
      safeCount(head(sb.from('orders')).eq('status', 'pending')),
      safeCount(head(sb.from('events')).eq('status', 'pending')),
      safeCount(head(sb.from('fundraisers')).eq('status', 'pending')),
      safeCount(head(sb.from('rides')).eq('status', 'pending')),
      safeCount(head(sb.from('properties')).eq('status', 'pending')),
      safeCount(head(sb.from('broadcast_channel_messages'))),
    ]);

    setTasks([
      { key: 'wd', label: 'Retraits à approuver', icon: Wallet, category: 'Finances', tab: 'treasury', count: withdrawals, color: 'from-emerald-500 to-emerald-700' },
      { key: 'tx', label: 'Transactions en attente', icon: CreditCard, category: 'Finances', tab: 'transactions', count: transactions, color: 'from-emerald-600 to-teal-700' },
      { key: 'cr', label: 'Demandes de crédit', icon: FileText, category: 'Finances', tab: 'credits', count: credits, color: 'from-violet-500 to-violet-700' },
      { key: 'pk', label: 'Achats packs en attente', icon: Package, category: 'MLM', tab: 'orders', count: packPurchases, color: 'from-amber-500 to-orange-600' },
      { key: 'rl', label: 'Livraisons relais à préparer', icon: Truck, category: 'MLM', tab: 'delivery', count: relayDeliveries, color: 'from-blue-500 to-indigo-600' },
      { key: 'od', label: 'Commandes marketplace', icon: ShoppingCart, category: 'Marketplace', tab: 'orders', count: orders, color: 'from-pink-500 to-rose-600' },
      { key: 'ev', label: 'Événements à modérer', icon: Calendar, category: 'Communauté', tab: 'events', count: events, color: 'from-cyan-500 to-blue-600' },
      { key: 'fr', label: 'Cagnottes à valider', icon: HeartHandshake, category: 'Communauté', tab: 'fundraisers', count: fundraisers, color: 'from-rose-500 to-pink-700' },
      { key: 'rd', label: 'Courses VTC', icon: Car, category: 'Transport', count: rides, color: 'from-slate-600 to-slate-800' },
      { key: 'im', label: 'Biens immo à valider', icon: Home, category: 'Immobilier', count: immo, color: 'from-stone-600 to-stone-800' },
      { key: 'bc', label: 'Messages du canal', icon: Megaphone, category: 'Diffusion', tab: 'broadcast', count: unreadCanal, color: 'from-violet-600 to-purple-700' },
    ]);
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const grouped = tasks.reduce((acc, t) => { (acc[t.category] ||= []).push(t); return acc; }, {} as Record<string, Task[]>);
  const totalPending = tasks.reduce((s, t) => s + (t.count || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Gestionnaire de tâches</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalPending} en attente</Badge>
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && tasks.length === 0 ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">{cat}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {list.map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.key}
                          onClick={() => t.tab && onNavigate?.(t.tab)}
                          className={`text-left rounded-xl p-4 text-white shadow-md hover:shadow-xl hover:scale-[1.03] transition-all bg-gradient-to-br ${t.color} ${t.tab ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                        >
                          <div className="flex items-start justify-between">
                            <Icon className="w-5 h-5" />
                            <span className="text-2xl font-black">{t.count}</span>
                          </div>
                          <div className="mt-3 text-sm font-semibold leading-tight">{t.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
