import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTaste } from '@/lib/taste';
import { useMe } from '@/lib/data';
import { facetLabel } from '@/lib/facets';
import { useLocale } from '@/lib/locale';
import { Button } from './auth-form';
import { Presence } from './motion';
import { Icon } from './icons';

const STAGES = [
  { at: 0, label: 'Getting to know you' },
  { at: 15, label: 'Learning your taste' },
  { at: 40, label: 'Taste tuned' },
] as const;

export function TasteCard() {
  const { t } = useLocale();
  const me = useMe();
  const taste = useTaste();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<{ facet: string; value: string } | null>(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  async function override(stance: 'love' | 'avoid' | null) {
    if (!selected || !me.data) return;
    setError('');
    try {
      const result = stance
        ? await supabase.from('user_taste_overrides').upsert({ user_id: me.data.uid, facet: selected.facet, value: selected.value, stance })
        : await supabase.from('user_taste_overrides').delete().eq('user_id', me.data.uid).eq('facet', selected.facet).eq('value', selected.value);
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ['taste'] });
      window.dispatchEvent(new Event('phi-taste-changed'));
      setSelected(null);
    } catch {
      setError(t('Could not save your preference. Please retry.'));
    }
  }

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await taste.refetch();
    } finally {
      setRetrying(false);
    }
  }

  const groups = [
    ['Defining', (tr: any) => tr.defining],
    ['You lean toward', (tr: any) => !tr.defining && ['loves', 'leans_toward'].includes(tr.stance)],
    ['You lean away', (tr: any) => ['avoids', 'leans_away'].includes(tr.stance)],
    ['Still exploring', (tr: any) => tr.stance === 'exploring'],
  ] as const;
  const count = me.data?.swipes.length ?? 0;
  const stage = [...STAGES].reverse().find(s => count >= s.at) ?? STAGES[0];
  const traits = taste.data?.traits ?? [];
  const portrait = taste.data?.portrait;

  return (
    <section className="box stack">
      <h2 className="h2">{t('Your taste')}</h2>
      {taste.isPending && (
        <div className="loading-surfaces" aria-label={t('Loading…')}>
          <span className="loading-surface" />
          <span className="loading-surface" />
        </div>
      )}
      {taste.error && !taste.isPending && (
        <p className="error" role="alert">
          {t('Could not load your taste.')}
          <Button disabled={retrying} onClick={retry}>{t(retrying ? 'Loading…' : 'Retry')}</Button>
        </p>
      )}
      {taste.data && (
        <>
          {portrait ? (
            <>
              <strong>{portrait.archetype}</strong>
              <p>{portrait.summary}</p>
            </>
          ) : (
            <p>{t('Your taste is still taking shape. Each choice helps reveal what matters to you.')}</p>
          )}
          <span className="small muted">{t(stage.label)}</span>
          <div className="learning-meter" role="img" aria-label={`${t(stage.label)} · ${count} ${t('swipes')}`}>
            {STAGES.map(s => <span key={s.at} className={count >= s.at ? 'complete' : ''} />)}
          </div>
          {groups.map(([label, match]) => {
            const values = traits.filter(match).slice(0, 6);
            return values.length ? (
              <div className="stack" key={label}>
                <strong className="small">{label === 'Defining' && <Icon name="spark" />}{t(label)}</strong>
                <div className="row">
                  {values.map(trait => (
                    <Button key={trait.facet + trait.value + trait.media_type} className={`chip trait-chip ${trait.stance === 'exploring' ? 'exploring' : ''}`} data-facet={trait.facet} onClick={() => setSelected(trait)}>{facetLabel(trait.value)}</Button>
                  ))}
                </div>
              </div>
            ) : null;
          })}
          {!traits.length && <p className="small muted">{t('Like or pass a few titles in Discover and your traits will appear here.')}</p>}
        </>
      )}
      {selected && (
        <Presence historyEntry className="drawer-bg" onExit={() => setSelected(null)}>{close => <>
          <div className="drawer-dismiss" onClick={close} />
          <div className="drawer stack" role="dialog" aria-modal="true" aria-label={facetLabel(selected.value)}>
            <div className="between"><h2 className="h2">{facetLabel(selected.value)}</h2><Button className="icon-btn" aria-label={t('Close')} onClick={close}><Icon name="close" /></Button></div>
            <p>{traits.some(tr => tr.facet === selected.facet && tr.value === selected.value && tr.defining) ? t('You liked this trait across at least three genres.') : t('This pattern comes from your choices among the titles you have been shown.')}</p>
            {error && <p className="error">{error}</p>}
            <Button className="btn-primary" onClick={() => override('love')}>{t('More of this')}</Button>
            <Button onClick={() => override(null)}>{t('Neutral')}</Button>
            <Button onClick={() => override('avoid')}>{t('Less of this')}</Button>
            <Button className="btn-text" onClick={() => override(null)}>{t('Reset')}</Button>
            <Link className="btn" to="/discover" search={{ tag: undefined, facet: selected.facet, value: selected.value }} onClick={close}>{t('Show me these')}</Link>
          </div>
        </>}</Presence>
      )}
    </section>
  );
}
