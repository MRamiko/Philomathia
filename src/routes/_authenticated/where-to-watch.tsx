import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shell, Loading, ItemRow, WhereToBuy } from '@/components/phi';
import { WhereToWatch } from '@/components/where-to-watch';
import { useLocale } from '@/lib/locale';
import { useMe, useItems } from '@/lib/data';

export const Route = createFileRoute('/_authenticated/where-to-watch')({
  head: () => ({ meta: [{ title: 'Where to watch and buy · Philomathia' }, { name: 'description', content: 'Streaming options for your liked films and shop prices and stock for your liked books.' }, { property: 'og:title', content: 'Where to watch and buy · Philomathia' }, { property: 'og:description', content: 'Streaming options, prices and stock for the titles you liked.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: WhereToWatchPage,
});

const PAGE = 20;

function WhereToWatchPage() {
  const { t, lang } = useLocale();
  const me = useMe();
  const items = useItems();
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'film' | 'book'>('film');
  const stocked = useQuery({ queryKey: ['stocked-books'], queryFn: async () => { const r = await supabase.from('shop_stock').select('item_id').gt('quantity', 0); if (r.error) throw r.error; return [...new Set((r.data ?? []).map(x => x.item_id))]; } });
  if (me.error || items.error) return <Shell><p role="alert" className="error">{t('Could not load.')}</p><button className="btn" onClick={() => { void me.refetch(); void items.refetch(); }}>{t('Retry')}</button></Shell>;
  if (!me.data || !items.data) return <Shell><Loading /></Shell>;
  const byId = new Map(items.data.map(i => [i.id, i]));
  const seen = new Set<string>();
  const liked = [...me.data.swipes].reverse().filter(s => s.action === 'like' && !seen.has(s.item_id) && seen.add(s.item_id)).map(s => byId.get(s.item_id)).filter(Boolean) as typeof items.data;
  const likedIds = new Set(liked.map(i => i.id));
  const list = tab === 'film' ? liked.filter(i => i.media_type === 'film') : [...liked.filter(i => i.media_type === 'book'), ...((stocked.data ?? []).filter(id => !likedIds.has(id)).map(id => byId.get(id)).filter(Boolean) as typeof items.data)];
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = list.slice(current * PAGE, current * PAGE + PAGE);
  return (
    <Shell>
      <h1 className="h1">{t('Where to watch and buy')}</h1>
      <p className="small muted">{t('Streaming options for films and shop prices and stock for books you liked.')}</p>
      <div className="toggle" role="group" aria-label={t('Films') + ' / ' + t('Books')}>
        <button className={tab === 'film' ? 'active' : ''} aria-pressed={tab === 'film'} onClick={() => { setTab('film'); setPage(0); }}>{t('Films')}</button>
        <button className={tab === 'book' ? 'active' : ''} aria-pressed={tab === 'book'} onClick={() => { setTab('book'); setPage(0); }}>{t('Books')}</button>
      </div>
      {!list.length ? <p className="muted">{t('Like titles in Discover to see where to watch or buy them.')}</p> : slice.map(item => (
        <section key={item.id} className="box stack" data-testid="wtw-item">
          <ItemRow item={item} lang={lang} />
          {item.media_type === 'film' ? <WhereToWatch itemId={item.id} /> : <WhereToBuy itemId={item.id} />}
        </section>
      ))}
      {pages > 1 && <div className="between">
        <button className="btn" disabled={current === 0} onClick={() => setPage(current - 1)}>{t('Previous')}</button>
        <span className="small muted">{t('Page {page} of {pages}', { page: current + 1, pages })}</span>
        <button className="btn" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>{t('Next')}</button>
      </div>}
      <Link to="/discover" search={{ tag: undefined }} className="btn btn-block">{t('Back to Discover')}</Link>
    </Shell>
  );
}
