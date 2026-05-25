import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CurrencyRate,
  formatInCurrency,
  fcfaToMsn,
  formatMSN,
} from '@/lib/currency';

interface Ctx {
  rates: CurrencyRate[];
  current: CurrencyRate | null;
  setCurrency: (code: string) => Promise<void>;
  format: (fcfa: number) => string;
  formatWithMsn: (fcfa: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'preferred_currency';

const FALLBACK: CurrencyRate = { code: 'XOF', name: 'FCFA', symbol: 'FCFA', rate_to_fcfa: 1 };

export const UserCurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [rates, setRates] = useState<CurrencyRate[]>([FALLBACK]);
  const [current, setCurrent] = useState<CurrencyRate>(FALLBACK);
  const [loading, setLoading] = useState(true);

  // Charge taux
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('currency_rates')
        .select('code,name,symbol,rate_to_fcfa')
        .eq('is_active', true);
      if (data && data.length) setRates(data as CurrencyRate[]);
    })();
  }, []);

  // Charge préférence
  useEffect(() => {
    (async () => {
      setLoading(true);
      let code: string | null = localStorage.getItem(STORAGE_KEY);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .maybeSingle();
        if ((data as any)?.preferred_currency) code = (data as any).preferred_currency;
      }
      if (code) {
        const r = rates.find(x => x.code === code);
        if (r) setCurrent(r);
      }
      setLoading(false);
    })();
  }, [user, rates]);

  const setCurrency = useCallback(async (code: string) => {
    const r = rates.find(x => x.code === code) || FALLBACK;
    setCurrent(r);
    localStorage.setItem(STORAGE_KEY, code);
    if (user) {
      await supabase.from('profiles').update({ preferred_currency: code } as any).eq('id', user.id);
    }
  }, [rates, user]);

  const format = useCallback((fcfa: number) => formatInCurrency(fcfa, current), [current]);
  const formatWithMsn = useCallback(
    (fcfa: number) => `${formatInCurrency(fcfa, current)} · ${formatMSN(fcfaToMsn(fcfa))}`,
    [current]
  );

  return (
    <CurrencyContext.Provider value={{ rates, current, setCurrency, format, formatWithMsn, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useUserCurrency = (): Ctx => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback sans provider : affichage en FCFA
    return {
      rates: [FALLBACK],
      current: FALLBACK,
      setCurrency: async () => {},
      format: (f: number) => formatInCurrency(f, FALLBACK),
      formatWithMsn: (f: number) => `${formatInCurrency(f, FALLBACK)} · ${formatMSN(fcfaToMsn(f))}`,
      loading: false,
    };
  }
  return ctx;
};
