import { useAction } from "@/lib/use-action";
import { useLocale } from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Chips, Loading, Poster, Shell, WhereToBuy } from "@/components/phi";
import { deleteLog, descOf, titleOf, lengthOf, saveLog, useItems, useMe, useRefresh, yearOf } from "@/lib/data";
import type { Item } from "@/lib/recommend";
import { Presence } from '@/components/motion';

export const Route = createFileRoute("/_authenticated/item/$id")({
  head: () => ({ meta: [{ title: "Title · Philomathia" }, { name: "description", content: "Details, your diary entry and where to buy." }, { property: "og:title", content: "Title · Philomathia" }, { property: "og:description", content: "Details, your diary entry and where to buy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ItemPage,
});

const RATINGS = Array.from({ length: 10 }, (_, k) => (k + 1) / 2);

function ItemPage() {
  const { t, lang: appLang } = useLocale();
  const action=useAction();
  const { id } = Route.useParams();
  const items = useItems(id);
  const me = useMe();
  const refresh = useRefresh();
  const item = items.data?.find((i) => i.id === id);
  const prev = me.data?.logs.find((l) => l.item_id === id);
  const lang = appLang;
  const [status, setStatus] = useState("want");
  const [rating, setRating] = useState<string>("");
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [trailer, setTrailer] = useState(false);


  useEffect(() => {
    if (prev) { setStatus(prev.status); setRating(prev.rating?.toString() ?? ""); setReview(prev.review ?? ""); }
  }, [prev?.id]);

  if (items.error || me.error) return <Shell><p role="alert" className="error">{t("Could not load.")}</p><button className="btn" onClick={()=>{items.refetch();me.refetch();}}>{t("Retry")}</button></Shell>;
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  if (!item) return <Shell><p>{t('Not found.')}<Link to="/search">{t('Search')}</Link></p></Shell>;

  const title = titleOf(item, lang);
  const desc = descOf(item, lang);
  const fellBack = lang === "ka" && (!item.title_ka?.trim() || !item.description_ka?.trim());
  const footer = `${t("Source")}: ${item.source}${item.source==='seed'?' · '+t('Sample data for demo'):''}`;

  async function save() {
    if(!me.data||!item)return;
    await saveLog(me.data.uid, item, prev, { status, rating: rating ? Number(rating) : null, review: review || null });
    await refresh();
    setSaved(true);
  }

  return (
    <Shell footer={footer}>
      <div className="stack">
        {action.error&&<p role="alert" className="error">{action.error}</p>}
        <Poster item={item} size="lg" />
        <h1 className="h1">{title}</h1>
        {item.original_title && item.original_title !== title && <div className="muted small">{item.original_title}</div>}
        <div className="muted small">{yearOf(item.year)} · {item.creator} · {t(item.media_type)} · {lengthOf(item, appLang)}{item.is_georgian ? ` · ${t("Georgia")}` : ""}</div>
        {item.isbn && <div className="muted small">ISBN {item.isbn}</div>}
        {item.image_source==='openlibrary' && item.openlibrary_key && <a className="muted small" href={`https://openlibrary.org${item.openlibrary_key}`} target="_blank" rel="noreferrer">{t('Cover: Open Library')}</a>}
        <p>{desc || t("No description available.")}</p>
        {fellBack && <p className="muted small">{t('No Georgian text stored yet; showing English.')}</p>}
        <Chips tags={item.genres} />
        <Chips tags={item.mood_tags} />

        {item.trailer_key && (trailer ? (
          <iframe width="100%" height="200" src={`https://www.youtube-nocookie.com/embed/${item.trailer_key}`} title={t('Trailer')} allow="encrypted-media" allowFullScreen style={{ border: 0 }} />
        ) : <button className="btn" onClick={() => setTrailer(true)}>{t('Watch trailer')}</button>)}
        {item.media_type === "film" && !item.trailer_key && <p className="muted">{t("No trailer available.")}</p>}
        {item.media_type === "book" && <Teaser item={item} weights={me.data.weights} />}

        <div className="box stack">
          <strong>{t('My diary')}</strong>
          <select className="input" aria-label={t("Status")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="want">{t(item.media_type === "film" ? "Want to watch" : "Want to read")}</option>
            <option value="in_progress">{t('In progress')}</option>
            <option value="seen">{t('Done')}</option>
          </select>
          <select className="input" aria-label={t("Rating")} value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">{t('No rating')}</option>
            {RATINGS.map((r) => <option key={r} value={r}>{r} / 5</option>)}
          </select>
          {rating && <span key={rating} className="rating-selected" aria-hidden="true">★ {rating} / 5</span>}
          <textarea className="input" rows={3} placeholder={t('Review (optional)')} value={review} onChange={(e) => setReview(e.target.value)} />
          <div className="row">
            <button className="btn btn-primary" disabled={action.busy} onClick={()=>action.run(save,undefined,()=>setSaved(false))}>{t('Save')}</button>
            {prev && <button className="btn" disabled={action.busy} onClick={()=>action.run(async()=>{await deleteLog(item,prev);await refresh();})}>{t('Remove')}</button>}
            {saved && <Presence className="snackbar" autoClose={2000} onExit={() => setSaved(false)}>{() => <span role="status">{t('Saved ✓')}</span>}</Presence>}
          </div>
        </div>
        {item.media_type === "book" && <WhereToBuy itemId={item.id} />}
      </div>
    </Shell>
  );
}

function Teaser({ item, weights }: { item: Item; weights: Record<string, number> }) {
  const { t, lang: appLang } = useLocale();
  const [frame, setFrame] = useState(-1);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (frame < 0 || frame > 3 || paused) return;
    const t = setTimeout(() => setFrame((f) => f + 1), 3000);
    return () => clearTimeout(t);
  }, [frame, paused]);
  const matched = [...item.genres, ...item.mood_tags].filter((t) => (weights[t.toLowerCase()] ?? 0) > 0);
  const suit = matched.length ? t("Who it might suit: readers drawn to {tags}", {tags:matched.slice(0,3).map(k=>t(k)).join(", ")}) : t("Who it might suit: readers who enjoy {tags} books", {tags:item.mood_tags.slice(0,3).map(k=>t(k)).join(", ")});
  const frames = [
    (descOf(item,appLang).match(/[^.!?]+[.!?]/)?.[0] ?? descOf(item,appLang)).trim(),
    [...item.genres, ...item.mood_tags].map(k=>t(k)).join(" · "),
    `${item.creator}, ${yearOf(item.year)}`,
    suit,
  ];
  if (frame < 0) return <button className="btn" onClick={() => setFrame(0)}>{t('Teaser')}</button>;
  return (
    <Presence historyEntry className="drawer-bg" onExit={() => setFrame(-1)}>{close => <>
    <div className="drawer-dismiss" onClick={close}/>
    <div className="drawer stack" role="dialog" aria-modal="true" aria-label={t('Teaser')}>
    <button className="btn icon-btn" aria-label={t('Close')} onClick={close}>✕</button>
    <Poster item={item} size="lg" />
      <div className={`teaser-progress ${paused ? 'paused' : ''}`} aria-hidden="true">{[0,1,2,3].map(n=><div key={n} className={`teaser-segment ${n < frame ? 'complete' : n === frame ? 'current' : ''}`}><span/></div>)}</div>
      <div className="teaser">
        {frame <= 3 ? <div key={frame} className={paused ? "" : "fade"}>{frames[frame]}</div> : <span className="muted">{t('The end')}</span>}
      </div>
      <div className="row">
        <button className="btn btn-sm" onClick={() => { setPaused(false); setFrame(0); }}>{t('Replay')}</button>
        <button className="btn btn-sm" disabled={frame > 3} onClick={() => setPaused((p) => !p)}>{paused ? t('Play') : t('Pause')}</button>
      </div>
      <span className="muted small">{t('Generated summary, not an official trailer')}</span>
    </div>
    </>}</Presence>
  );
}
