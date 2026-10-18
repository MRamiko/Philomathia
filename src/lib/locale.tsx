import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { translate, type Locale } from './strings';
import type { Me } from './data';

export function LocaleProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useLocale() {
  const qc = useQueryClient();
  const me = useQuery<Me>({ queryKey: ['me'], enabled: false });
  const stored = me.data?.profile?.preferred_language;
  const lang: Locale = stored === 'ka' ? 'ka' : 'en';
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    setLang: async (next: Locale) => {
      const current = qc.getQueryData<Me>(['me']);
      if (current) {
        qc.setQueryData<Me>(['me'], { ...current, profile: { ...current.profile, preferred_language: next } });
        const { supabase } = await import('@/integrations/supabase/client');
        const result = await supabase.from('profiles').update({ preferred_language: next }).eq('id', current.uid);
        if (result.error) {
          qc.setQueryData<Me>(['me'], current);
          throw result.error;
        }
      }
    },
  };
}
