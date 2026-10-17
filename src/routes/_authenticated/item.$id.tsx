import { useLocale } from "@/lib/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Chips, Loading, Poster, Shell, WhereToBuy } from "@/components/phi";
import { deleteLog, descOf, titleOf, lengthOf, saveLog, useItems, useMe, useRefresh, yearOf } from "@/lib/data";
import type { Item } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/item/$id")({
  head: () => ({ meta: [{ title: "Title · Philomathia" }, { name: "description", content: "Details, your diary entry and where to buy." }] }),
  component: ItemPage,
});

const RATINGS = Array.from({ length: 10 }, (_, k) => (k + 1) / 2);

function ItemPage() {
  const { t, lang: appLang } = useLocale();
  const { id } = Route.useParams();
  const items = useItems();
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

  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  if (!item) return <Shell><p>{t('Not found.')}<Link to="/search">{t('Search')}</Link></p></Shell>;

  const title = titleOf(item, lang);
  const desc = descOf(item, lang);
  const fellBack = lang === "ka" && (!item.title_ka || !item.description_ka);
  const footer = item.source === "seed" ? t("Sample data for demo") : `${t("Source")}: ${item.source}`;

  async function save() {
  const { t, lang: appLang } = useLocale();
    await saveLog(me.data!.uid, item!, prev, { status, rating: rating ? Number(rating) : null, review: review || null });
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Shell footer={footer}>
      <div className="stack">
        <Poster item={item} size="lg" />
        <h1 className="h1">{title}</h1>
        {item.original_title && item.original_title !== title && <div className="muted small">{item.original_title}</div>}
        <div className="muted small">{yearOf(item.year)} · {item.creator} · {t(item.media_type)} · {lengthOf(item)}{item.is_georgian ? ` · ${t("Georgia")}` : ""}</div>
        {item.isbn && <div className="muted small">ISBN {item.isbn}</div>}
        <p>{desc || t("No description available.")}</p>
        {fellBack && <p className="muted small">{t('No Georgian text stored yet; showing English.')}</p>}
        <Chips tags={item.genres} />
        <Chips tags={item.mood_tags} />

        {item.trailer_key && (trailer ? (
          <iframe width="100%" height="200" src={`https://www.youtube-nocookie.com/embed/${item.trailer_key}`} title={t('Trailer')} allow="encrypted-media" allowFullScreen style={{ border: 0 }} />
        ) : <button className="btn" onClick={() => setTrailer(true)}>{t('Watch trailer')}</button>)}
        {item.media_type === "book" && <Teaser item={item} weights={me.data.weights} />}

        <div className="box stack">
          <strong>{t('My diary')}</strong>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="want">{t(item.media_type === "film" ? "Want to watch" : "Want to read")}</option>
            <option value="in_progress">{t('In progress')}</option>
            <option value="seen">{t('Done')}</option>
          </select>
          <select className="input" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">{t('No rating')}</option>
            {RATINGS.map((r) => <option key={r} value={r}>{r} / 5</option>)}
          </select>
          <textarea className="input" rows={3} placeholder={t('Review (optional)')} value={review} onChange={(e) => setReview(e.target.value)} />
          <div className="row">
            <button className="btn btn-primary" onClick={save}>{t('Save')}</button>
            {prev && <button className="btn" onClick={async () => { await deleteLog(item, prev); await refresh(); }}>{t('Remove')}</button>}
            {saved && <span className="ok small">{t('Saved')}</span>}
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
    <div className="stack">
      <div className="teaser">
        {frame <= 3 ? <div key={frame} className={paused ? "" : "fade"}>{frames[frame]}</div> : <span className="muted">{t('The end')}</span>}
      </div>
      <div className="row">
        <button className="btn btn-sm" onClick={() => { setPaused(false); setFrame(0); }}>{t('Replay')}</button>
        <button className="btn btn-sm" disabled={frame > 3} onClick={() => setPaused((p) => !p)}>{paused ? t('Play') : t('Pause')}</button>
      </div>
      <span className="muted small">{t('Generated summary, not an official trailer')}</span>
    </div>
  );
}
