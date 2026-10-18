import { createFileRoute, Link } from '@tanstack/react-router';
import { Shell, Loading, ItemRow } from '@/components/phi';
import { useLocale } from '@/lib/locale';
import { useMe, useItems } from '@/lib/data';
import { useTaste } from '@/lib/taste';
import { facetLabel } from '@/lib/facets';
import { MotionList } from '@/components/motion';

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Philomathia" }, { name: "description", content: "Your swiped titles, taste traits and learning progress." }, { property: "og:title", content: "Dashboard · Philomathia" }, { property: "og:description", content: "Your swiped titles, taste traits and learning progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

const STAGES = [
  { at: 0, label: 'Getting to know you' },
  { at: 15, label: 'Learning your taste' },
  { at: 40, label: 'Taste tuned' },
] as const;

function Dashboard() {
  const { t, lang } = useLocale();
  const me = useMe();
  const items = useItems();
  const taste = useTaste();

  if (me.error || items.error || taste.error) {
    return <Shell><p role="alert" className="error">{t('Could not load.')}</p><button className="btn" onClick={() => { me.refetch(); items.refetch(); taste.refetch(); }}>{t('Retry')}</button></Shell>;
  }
  if (!me.data || !items.data || taste.isPending) return <Shell><Loading /></Shell>;

  const count = me.data.swipes.length;
  const stage = [...STAGES].reverse().find(s => count >= s.at) ?? STAGES[0];
  const byId = new Map(items.data.map(i => [i.id, i]));
  const liked = me.data.swipes.filter(s => s.action === 'like').map(s => byId.get(s.item_id)).filter(Boolean) as typeof items.data;
  const passed = me.data.swipes.filter(s => s.action === 'pass').map(s => byId.get(s.item_id)).filter(Boolean) as typeof items.data;
  const traits = taste.data?.traits ?? [];

  return (
    <Shell>
      <h1 className="h1">{t('Dashboard')}</h1>

      <section className="box stack">
        <h2 className="h2">{t('Progress')}</h2>
        <span className="small muted">{t(stage.label)} · {count} {t('swipes')}</span>
        <div className="learning-meter" role="img" aria-label={`${t(stage.label)} · ${count} ${t('swipes')}`}>
          {STAGES.map(s => <span key={s.at} className={count >= s.at ? 'complete' : ''} />)}
        </div>
        {taste.data?.portrait ? (
          <><strong>{taste.data.portrait.archetype}</strong><p className="small">{taste.data.portrait.summary}</p></>
        ) : (
          <p className="small muted">{t('Your taste is still taking shape. Each choice helps reveal what matters to you.')}</p>
        )}
      </section>

      <section className="box stack">
        <h2 className="h2">{t('Taste traits')}</h2>
        {traits.length ? (
          <div className="row">
            {traits.slice(0, 20).map(trait => (
              <span key={trait.facet + trait.value + trait.media_type} className={`chip trait-chip ${trait.stance === 'exploring' ? 'exploring' : ''}`}>{t(facetLabel(trait.value))}</span>
            ))}
          </div>
        ) : (
          <p className="small muted">{t('Like or pass a few titles in Discover and your traits will appear here.')}</p>
        )}
      </section>

      <section className="stack">
        <h2 className="h2">{t('Liked')}</h2>
        {liked.length ? (
          <MotionList scope="dash-liked" className="stack">{liked.map(item => <ItemRow key={item.id} item={item} lang={lang} />)}</MotionList>
        ) : <p className="small muted">{t('Nothing liked yet.')}</p>}
      </section>

      <section className="stack">
        <h2 className="h2">{t('Passed')}</h2>
        {passed.length ? (
          <MotionList scope="dash-passed" className="stack">{passed.map(item => <ItemRow key={item.id} item={item} lang={lang} />)}</MotionList>
        ) : <p className="small muted">{t('No passes.')}</p>}
      </section>

      <Link to="/discover" search={{ tag: undefined }} className="btn btn-block">{t('Back to Discover')}</Link>
    </Shell>
  );
}
