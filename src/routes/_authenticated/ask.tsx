import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { ASK_MOODS } from "@/lib/config";
import { parseQuery, rewriteReasons } from "@/lib/ask.functions";
import { swipe, useItems, useMe, useRefresh } from "@/lib/data";
import { recommend, type Rec } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({ meta: [{ title: "Ask Phi · Philomathia" }, { name: "description", content: "Find your next film or book by mood and time." }] }),
  component: Ask,
});

const FILM_TIME = { "Under 90 min": [null, 89], "90 to 120 min": [90, 120], "2+ hours": [120, null] } as const;
const BOOK_TIME = { "Under 200 pages": [null, 199], "200 to 400 pages": [200, 400], "400+ pages": [400, null] } as const;
const MOODS = Object.keys(ASK_MOODS);

function rulesParse(text: string) {
  const t = text.toLowerCase();
  const min = t.match(/(\d{2,3})\s*-?\s*(min|minute)/);
  const media = /\b(film|movie|watch)/.test(t) ? "film" : /\b(book|novel|read)/.test(t) ? "book" : "either";
  const moods = MOODS.filter((m) => t.includes(m) || t.includes(m.split(" ")[0]));
  if (/thrill|tense/.test(t) && !moods.includes("suspenseful")) moods.push("suspenseful");
  const words = ["thriller", "mystery", "comedy", "romance", "drama", "science fiction", "fantasy", "war", "poetry", "magical realism", "horror", "animation"];
  return { media_type: media as "film" | "book" | "either", max_minutes: min ? Number(min[1]) : null, moods, georgian_only: /georgia|ქართ/.test(t), keywords: words.filter((w) => t.includes(w)) };
}

function Ask() {
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const parse = useServerFn(parseQuery);
  const rewrite = useServerFn(rewriteReasons);
  const [media, setMedia] = useState<"film" | "book" | "either">("either");
  const [moods, setMoods] = useState<string[]>([]);
  const [time, setTime] = useState<string>("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ recs: Rec[]; ai: boolean; note: string } | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const lang = me.data.profile.preferred_language;

  async function find() {
    setBusy(true); setDone({});
    let f = { media_type: media, max_minutes: null as number | null, moods: [] as string[], georgian_only: false, keywords: [] as string[] };
    let ai = false;
    if (text.trim()) {
      const r = await parse({ data: { text } }).catch(() => null);
      if (r?.filters) { f = r.filters; ai = true; } else f = rulesParse(text);
      if (media !== "either" && f.media_type === "either") f.media_type = media;
    }
    const mediaType = media !== "either" ? media : f.media_type;
    const allMoods = Array.from(new Set([...moods, ...f.moods])).flatMap((m) => ASK_MOODS[m] ?? []);
    let minM: number | undefined, maxM: number | undefined, minP: number | undefined, maxP: number | undefined;
    const ft = (FILM_TIME as any)[time]; const bt = (BOOK_TIME as any)[time];
    if (ft) { minM = ft[0] ?? undefined; maxM = ft[1] ?? undefined; }
    if (bt) { minP = bt[0] ?? undefined; maxP = bt[1] ?? undefined; }
    if (f.max_minutes) maxM = Math.min(maxM ?? 9999, f.max_minutes);
    const d = me.data!;
    const base = {
      items: items.data!, weights: d.weights,
      excludedIds: new Set([...d.swipes.map((s) => s.item_id), ...d.logs.filter((l) => l.status === "seen").map((l) => l.item_id)]),
      likedIds: new Set(d.swipes.filter((s) => s.action === "like").map((s) => s.item_id)),
      avoidedGenres: d.profile.avoided_genres, mediaType: mediaType, georgianOnly: f.georgian_only,
      moods: allMoods, keywords: f.keywords,
    };
    let recs = recommend({ ...base, minMinutes: minM, maxMinutes: maxM, minPages: minP, maxPages: maxP }, 5);
    let note = "";
    if (recs.length < 5) {
      const extra = recommend(base, 50).filter((r) => !recs.some((x) => x.item.id === r.item.id)).slice(0, 5 - recs.length);
      if (extra.length) note = `Only ${recs.length} match your time limit; the rest are the closest picks outside it (runtime shown).`;
      recs = [...recs, ...extra.map((e) => ({ ...e, reason: `${e.reason} (outside your time limit)` }))];
    }
    if (ai && recs.length) {
      const rr = await rewrite({ data: { lang, items: recs.map((r) => ({ title: r.item.title_en, reason: r.reason })) } }).catch(() => null);
      if (rr) recs = recs.map((r, k) => ({ ...r, reason: rr[k] }));
    }
    setRes({ recs, ai, note });
    setBusy(false);
  }

  const timeOpts = media === "book" ? Object.keys(BOOK_TIME) : media === "film" ? Object.keys(FILM_TIME) : [];
  return (
    <Shell>
      <h1 className="h1">Ask Phi</h1>
      <div className="stack">
        <div className="toggle">
          {(["film", "book", "either"] as const).map((m) => (
            <button key={m} className={media === m ? "on" : ""} onClick={() => { setMedia(m); setTime(""); }}>{m === "film" ? "Film" : m === "book" ? "Book" : "Either"}</button>
          ))}
        </div>
        <div className="row">
          {MOODS.map((m) => (
            <button key={m} className={`chip ${moods.includes(m) ? "chip-active" : ""}`} onClick={() => setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])}>{m}</button>
          ))}
        </div>
        {timeOpts.length > 0 && (
          <div className="row">
            {timeOpts.map((t) => <button key={t} className={`chip ${time === t ? "chip-active" : ""}`} onClick={() => setTime(time === t ? "" : t)}>{t}</button>)}
          </div>
        )}
        <input className="input" placeholder="a 90-minute thriller for a rainy evening" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary" disabled={busy} onClick={find}>{busy ? "Finding…" : "Find"}</button>
      </div>
      {res && (
        <div style={{ marginTop: 16 }}>
          <span className="chip muted">{res.ai ? "AI used" : "Rules only"}</span>
          {res.note && <p className="muted small">{res.note}</p>}
          {res.recs.length === 0 && <p className="muted">No matches. Try fewer filters.</p>}
          {res.recs.map((r) => (
            <div key={r.item.id}>
              <ItemRow item={r.item} lang={lang} right={done[r.item.id] ? <span className="small ok">{done[r.item.id]}</span> : (
                <>
                  <button className="btn btn-sm btn-primary" onClick={async () => { await swipe(me.data!.uid, r.item, "like"); setDone({ ...done, [r.item.id]: "Liked" }); refresh(); }}>Like</button>
                  <button className="btn btn-sm" onClick={async () => { await swipe(me.data!.uid, r.item, "pass"); setDone({ ...done, [r.item.id]: "Passed" }); refresh(); }}>Pass</button>
                </>
              )} />
              <p className="small ok" style={{ margin: "8px 0" }}>{r.reason}</p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
