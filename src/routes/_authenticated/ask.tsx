import { MotionList } from '@/components/motion';
import { useAction } from "@/lib/use-action";
import { rulesParse } from "@/lib/ask-parser";
import { useLocale } from "@/lib/locale";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { ASK_MOODS } from "@/lib/config";
import { parseQuery } from "@/lib/ask.functions";
import { swipe, useItems, useMe, useRefresh } from "@/lib/data";
import { localizedReason } from "@/lib/reasons";
import { recommend, type Rec } from "@/lib/recommend";
import {candidateItems} from '@/lib/catalog';

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({ meta: [{ title: "Ask Phi · Philomathia" }, { name: "description", content: "Find your next film or book by mood and time." }, { property: "og:title", content: "Ask Phi · Philomathia" }, { property: "og:description", content: "Find your next film or book by mood and time." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => null,
});

const FILM_TIME = { "Under 90 min": [null, 89], "90 to 120 min": [90, 120], "2+ hours": [120, null] } as const;
const BOOK_TIME = { "Under 200 pages": [null, 199], "200 to 400 pages": [200, 400], "400+ pages": [400, null] } as const;
const MOODS = Object.keys(ASK_MOODS);

export function Ask() {
  const { t, lang: appLang } = useLocale();
  const action=useAction();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const parse = useServerFn(parseQuery);

  const [media, setMedia] = useState<"film" | "book" | "either">("either");
  const [moods, setMoods] = useState<string[]>([]);
  const [time, setTime] = useState<string>("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ recs: Rec[]; ai: boolean; note: string } | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  if (items.error || me.error) return <Shell><p role="alert" className="error">{t("Could not load.")}</p><button className="btn" onClick={()=>{items.refetch();me.refetch();}}>{t("Retry")}</button></Shell>;
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const lang = appLang;

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
    const d = me.data; if (!d) { setBusy(false); return; }
    let candidates;
    try{candidates=await candidateItems({mediaType,georgianOnly:f.georgian_only,avoidedGenres:d.profile.avoided_genres,minMinutes:minM,maxMinutes:maxM,minPages:minP,maxPages:maxP},!d.swipes.length);}catch{setBusy(false);setRes({recs:[],ai,note:t('Could not load.')});return;}
    const base = {
      items: candidates, historyItems:items.data??[], weights: d.weights, swipes: d.swipes,
      excludedIds: new Set([...d.swipes.map((s) => s.item_id), ...d.logs.filter((l) => l.status === "seen").map((l) => l.item_id)]),
      likedIds: new Set(d.swipes.filter((s) => s.action === "like").map((s) => s.item_id)),
      avoidedGenres: d.profile.avoided_genres, mediaType: mediaType, georgianOnly: f.georgian_only,
      moods: allMoods, keywords: f.keywords,
    };
    let recs = recommend({ ...base, minMinutes: minM, maxMinutes: maxM, minPages: minP, maxPages: maxP }, 5);
    let note = "";
    setRes({ recs, ai, note });
    setBusy(false);
  }

  const translateTime = t;
  const timeOpts = media === "book" ? Object.keys(BOOK_TIME) : media === "film" ? Object.keys(FILM_TIME) : [];
  return (
    <Shell>
      {action.error&&<p className="error" role="alert">{action.error}</p>}
      <h1 className="h1">{t('Ask Phi')}</h1>
      <div className="stack">
        <div className="toggle" style={{ '--selected': ['film','book','either'].indexOf(media), '--segments': 3 } as React.CSSProperties}>
          {(["film", "book", "either"] as const).map((m) => (
            <button key={m} className={media === m ? "on" : ""} onClick={() => { setMedia(m); setTime(""); }}>{m === "film" ? t('Film') : m === "book" ? t('Book') : t('Either')}</button>
          ))}
        </div>
        <div className="row">
          {MOODS.map((m) => (
            <button key={m} className={`chip ${moods.includes(m) ? "chip-active" : ""}`} onClick={() => {setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m]);setRes(null);refresh();}}>{t(m)}</button>
          ))}
        </div>
        {timeOpts.length > 0 && (
          <div className="row">
            {timeOpts.map((t) => <button key={t} className={`chip ${time === t ? "chip-active" : ""}`} onClick={() => setTime(time === t ? "" : t)}>{translateTime(t)}</button>)}
          </div>
        )}
        <input className="input" placeholder={t('a 90-minute thriller for a rainy evening')} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary" disabled={busy} onClick={find}>{busy ? t('Finding…') : t('Find')}</button>
      </div>
      {busy && <Loading />}
      {res && (
        <div style={{ marginTop: 16 }}>
          <span className="chip muted">{res.ai ? t('AI used') : t('Rules only')}</span>
          {res.note && <p className="muted small">{res.note}</p>}
          {res.recs.length === 0 && <p className="muted">{t('No matches. Try fewer filters.')}</p>}
          <MotionList scope="ask-results" setKey={res.recs.map(r=>r.item.id).join('-')}>{res.recs.map((r) => (
            <div key={r.item.id}>
              <ItemRow item={r.item} lang={lang} right={done[r.item.id] ? <span className="small ok">{done[r.item.id]}</span> : (
                <>
                  <button className="btn btn-sm btn-primary" disabled={action.busy} onClick={() => action.run(async()=>{await swipe(me.data?.uid??"",r.item,"like");await refresh();},()=>setDone(d=>({...d,[r.item.id]:t("Liked")})),()=>setDone(d=>{const next={...d};delete next[r.item.id];return next;}))}>{t('Like')}</button>
                  <button className="btn btn-sm" disabled={action.busy} onClick={() => action.run(async()=>{await swipe(me.data?.uid??"",r.item,"pass");await refresh();},()=>setDone(d=>({...d,[r.item.id]:t("Passed")})),()=>setDone(d=>{const next={...d};delete next[r.item.id];return next;}))}>{t('Pass')}</button>
                </>
              )} />
              <p className="small ok" style={{ margin: "8px 0" }}>{localizedReason(r, appLang)}</p>
            </div>
          ))}</MotionList>
        </div>
      )}
    </Shell>
  );
}
