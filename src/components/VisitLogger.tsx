import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DEBOUNCE_MS = 1500;

export default function VisitLogger() {
  const location = useLocation();
  const lastLoggedRef = useRef<{ path: string; ts: number } | null>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem('visit_session') || crypto.randomUUID();
    localStorage.setItem('visit_session', sessionId);

    const now = Date.now();
    if (
      lastLoggedRef.current &&
      lastLoggedRef.current.path === location.pathname &&
      now - lastLoggedRef.current.ts < DEBOUNCE_MS
    ) {
      return; // avoid duplicate logs on quick re-renders
    }

    const log = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const sb: any = supabase;
        await (sb.from as any)('visits').insert({
          session_id: sessionId,
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          user_id: user?.id || null,
        });
        lastLoggedRef.current = { path: location.pathname, ts: now };
      } catch {
        // swallow errors so UX stays smooth
      }
    };

    log();
  }, [location.pathname]);

  return null;
}
