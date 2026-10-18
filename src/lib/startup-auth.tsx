import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { bootMark, initializeDiagnostics } from './startup-diagnostics';
type AuthState = { status: 'checking' | 'ready' | 'error'; session: Session | null; retry: () => void };
const AuthContext = createContext<AuthState>({ status: 'checking', session: null, retry: () => {} });
export function StartupAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'retry'>>({ status: 'checking', session: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    initializeDiagnostics();
    let alive = true;
    let version = 0;
    bootMark('[AUTH] session check started');
    const timer = window.setTimeout(() => { if (alive) setState(old => old.status === 'checking' ? { ...old, status: 'error' } : old); }, 8000);
    const checkVersion = version;
    // No route loader waits for this check. The shell has already rendered.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || checkVersion !== version) return;
      clearTimeout(timer);
      if (error) { setState({ status: 'error', session: null }); return; }
      bootMark(`[AUTH] session resolved (${data.session ? 'present' : 'absent'})`);
      setState({ status: 'ready', session: data.session });
    }).catch(() => { if (alive) setState({ status: 'error', session: null }); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never start or await backend work inside the auth client's lock.
      window.setTimeout(() => { if (!alive) return; version++; clearTimeout(timer); setState({ status: 'ready', session }); bootMark(`[AUTH] session resolved (${session ? 'present' : 'absent'})`); }, 0);
    });
    return () => { alive = false; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, [attempt]);
  return <AuthContext.Provider value={{ ...state, retry: () => { setState(old => ({ ...old, status: 'checking' })); setAttempt(n => n + 1); } }}>{children}</AuthContext.Provider>;
}
export const useStartupAuth = () => useContext(AuthContext);