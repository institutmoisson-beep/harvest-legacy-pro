import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  broker_id: string;
  customer_name: string;
  product_name: string;
  purchase_price: number;
  profit: number;
  status: string;
  created_at: string;
  broker_code: string;
  quantity: number;
}

interface OrdersDataCache {
  orders: Order[];
  lastFetch: number;
  kpis: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalProfit: number;
    successRate: number;
  };
}

const CACHE_DURATION = 30000; // 30 seconds
const ordersCache = new Map<string, OrdersDataCache>();

export function useOrdersData(userId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalProfit: 0,
    successRate: 0
  });
  const subscriptionRef = useRef<any>(null);

  const calculateKPIs = useCallback((data: Order[]) => {
    const pending = data.filter(o => o.status === 'pending');
    const completed = data.filter(o => o.status === 'completed');
    const totalProfit = completed.reduce((sum, o) => sum + Number(o.profit), 0);
    const successRate = data.length > 0 ? (completed.length / data.length) * 100 : 0;

    return {
      totalOrders: data.length,
      pendingOrders: pending.length,
      completedOrders: completed.length,
      totalProfit,
      successRate
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!userId) return;

    try {
      const cached = ordersCache.get(userId);
      const now = Date.now();

      if (cached && (now - cached.lastFetch) < CACHE_DURATION) {
        setOrders(cached.orders);
        setKpis(cached.kpis);
        setLoading(false);
        return;
      }

      const { data: fetchedOrders } = await supabase
        .from('orders')
        .select('id,broker_id,customer_name,product_name,purchase_price,profit,status,created_at,broker_code,quantity')
        .eq('broker_id', userId)
        .order('created_at', { ascending: false });

      const ordersData = (fetchedOrders || []) as Order[];
      const calculatedKPIs = calculateKPIs(ordersData);

      ordersCache.set(userId, {
        orders: ordersData,
        lastFetch: now,
        kpis: calculatedKPIs
      });

      setOrders(ordersData);
      setKpis(calculatedKPIs);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, calculateKPIs]);

  useEffect(() => {
    if (!userId) return;

    fetchOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel(`user-orders-${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders', 
          filter: `broker_id=eq.${userId}` 
        }, 
        () => {
          ordersCache.delete(userId);
          fetchOrders();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId, fetchOrders]);

  return { orders, kpis, loading };
}
