import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Chips, Loading, Poster, Shell, WhereToBuy } from "@/components/phi";
import { deleteLog, lengthOf, saveLog, useItems, useMe, useRefresh, yearOf } from "@/lib/data";
import type { Item } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/item/$id")({
  head: () => ({ meta: [{ title: "Title · Philomathia" }, { name: "description", content: "Details, your diary entry and where to buy." }] }),
  component: ItemPage,
});

const RATINGS = Array.from({ length: 10 }, (_, k) => (k + 1) / 2);

function ItemPage() {
  const { id } = Route.useParams();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const item = items.data?.find((i) => i.id === id);
  const prev = me.data?.logs.find((l) => l.item_id === id);
  const [lang, setLang] = useState<"en" | "ka">("en");
  const [status, setStatus] = useState("want");
  const [rating, setRating] = useState<string>("");
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [trailer, setTrailer] = useState(false);

  useEffect(() => { if (me.data) setLang(me.data.profile.preferred_language as "en" | "ka"); }, [me.data?.profile.preferred_language]);
  useEffect(() => {
    if (prev) { setStatus(prev.status); setRating(prev.rating?.toString() ?? ""); setReview(prev.review ?? ""); }
  }, [prev?.id]);

  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  if (!item) return <Shell><p>Not found. <Link to="/search">Search</Link></p></Shell>;

  const title = lang === "ka" && item.title_ka ? item.title_ka : item.title_en;
  const desc = lang === "ka" && item.description_ka ? item.description_ka : item.description_en;
  const fellBack = lang === "ka" && (!item.title_ka || !item.description_ka);
  const footer = item.source === "seed" ? "Sample data for demo" : `Source: ${item.source}`;

  async function save() {
    await saveLog(me.data!.uid, item!, prev, { status, rating: rating ? Number(rating) : null, review: review || null });
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Shell footer={footer}>
      <div className="stack">
        <div className="toggle" style={{ alignSelf: "flex-end", width: 100 }}>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "ka" ? "on" : ""} onClick={() => setLang("ka")}>KA</button>
        </div>
        <Poster item={item} size="lg" />
        <h1 className="h1">{title}</h1>
        {item.original_title && item.original_title !== title && <div className="muted small">{item.original_title}</div>}
        <div className="muted small">{yearOf(item.year)} · {item.creator} · {item.media_type} · {lengthOf(item)}{item.is_georgian ? " · Georgia" : ""}</div>
        {item.isbn && <div className="muted small">ISBN {item.isbn}</div>}
        <p>{desc}</p>
        {fellBack && <p className="muted small">No Georgian text stored yet; showing English.</p>}
        <Chips tags={item.genres} />
        <Chips tags={item.mood_tags} />

        {item.trailer_key && (trailer ? (
          <iframe width="100%" height="200" src={`https://www.youtube-nocookie.com/embed/${item.trailer_key}`} title="Trailer" allow="encrypted-media" allowFullScreen style={{ border: 0 }} />
        ) : <button className="btn" onClick={() => setTrailer(true)}>Watch trailer</button>)}
        {item.media_type === "book" && <Teaser item={item} weights={me.data.weights} />}

        <div className="box stack">
          <strong>My diary</strong>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="want">Want to {item.media_type === "film" ? "watch" : "read"}</option>
            <option value="in_progress">In progress</option>
            <option value="seen">Done</option>
          </select>
          <select className="input" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">No rating</option>
            {RATINGS.map((r) => <option key={r} value={r}>{r} / 5</option>)}
          </select>
          <textarea className="input" rows={3} placeholder="Review (optional)" value={review} onChange={(e) => setReview(e.target.value)} />
          <div className="row">
            <button className="btn btn-primary" onClick={save}>Save</button>
            {prev && <button className="btn" onClick={async () => { await deleteLog(item, prev); await refresh(); }}>Remove</button>}
            {saved && <span className="ok small">Saved</span>}
          </div>
        </div>
        {item.media_type === "book" && <WhereToBuy itemId={item.id} />}
      </div>
    </Shell>
  );
}

function Teaser({ item, weights }: { item: Item; weights: Record<string, number> }) {
  const [frame, setFrame] = useState(-1);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (frame < 0 || frame > 3 || paused) return;
    const t = setTimeout(() => setFrame((f) => f + 1), 3000);
    return () => clearTimeout(t);
  }, [frame, paused]);
  const matched = [...item.genres, ...item.mood_tags].filter((t) => (weights[t.toLowerCase()] ?? 0) > 0);
  const suit = matched.length ? `Who it might suit: readers drawn to ${matched.slice(0, 3).join(", ")}` : `Who it might suit: readers who enjoy ${item.mood_tags.slice(0, 3).join(", ")} books`;
  const frames = [
    (item.description_en.match(/[^.!?]+[.!?]/)?.[0] ?? item.description_en).trim(),
    [...item.genres, ...item.mood_tags].join(" · "),
    `${item.creator}, ${yearOf(item.year)}`,
    suit,
  ];
  if (frame < 0) return <button className="btn" onClick={() => setFrame(0)}>Teaser</button>;
  return (
    <div className="stack">
      <div className="teaser">
        {frame <= 3 ? <div key={frame} className={paused ? "" : "fade"}>{frames[frame]}</div> : <span className="muted">The end</span>}
      </div>
      <div className="row">
        <button className="btn btn-sm" onClick={() => { setPaused(false); setFrame(0); }}>Replay</button>
        <button className="btn btn-sm" disabled={frame > 3} onClick={() => setPaused((p) => !p)}>{paused ? "Play" : "Pause"}</button>
      </div>
      <span className="muted small">Generated summary, not an official trailer</span>
    </div>
  );
}
