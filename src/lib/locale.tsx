import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { translate, type Locale } from './strings';

let current: Locale = 'en';
const listeners = new Set<() => void>();

export function setLocaleLang(lang: string) {
  const next: Locale = lang === 'ka' ? 'ka' : 'en';
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useLocale() {
  const lang = useSyncExternalStore(subscribe, () => current, () => 'en' as Locale);
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    setLang: async (next: Locale) => {
      const previous = current;
      setLocaleLang(next);
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const result = await supabase.from('profiles').update({ preferred_language: next }).eq('id', uid);
      if (result.error) {
        setLocaleLang(previous);
        throw result.error;
      }
    },
  };
}
