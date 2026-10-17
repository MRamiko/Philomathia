import { useLocale } from "@/lib/locale";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ItemDrawer, Loading, Shell, SwipeCard } from "@/components/phi";
import { swipe, undoSwipe, useItems, useMe, useRefresh } from "@/lib/data";
import { localizedReason } from "@/lib/reasons";
import { recommend } from "@/lib/recommend";
import { motionWait } from '@/components/motion';
import {useCandidates} from '@/lib/catalog';
import {imageUrl} from '@/lib/images';
import {SHOW_IMAGES} from '@/lib/config';

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: (s: Record<string, unknown>): { tag?: string | undefined } => ({ tag: typeof s['tag'] === "string" ? (s['tag'] as string) : undefined }),
  head: () => ({ meta: [{ title: "Discover · Philomathia" }, { name: "description", content: "Swipe through films and books picked for your taste." }, { property: "og:title", content: "Discover · Philomathia" }, { property: "og:description", content: "Swipe through films and books picked for your taste." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Discover,
});

function Discover() {
  const { t, lang: appLang } = useLocale();
  const { tag } = Route.useSearch();
  const nav = useNavigate();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const [media, setMedia] = useState<"film" | "book">("film");
  const [geo, setGeo] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<'like' | 'pass' | null>(null);
  const [arrival, setArrival] = useState<'like' | 'pass' | null>(null);
  const [previousGenres, setPreviousGenres] = useState<string[]>([]);
  const candidates=useCandidates({mediaType:media,georgianOnly:geo,avoidedGenres:me.data?.profile.avoided_genres??[]},me.data?.swipes,!me.data?.swipes.length);
  useEffect(() => { refresh(); const saved=localStorage.getItem("phi-media"); if(saved==="film"||saved==="book")setMedia(saved); }, []);

  const recs = useMemo(() => {
    if (!items.data || !me.data || !candidates.data) return [];
    const excluded = new Set([...me.data.swipes.map((s) => s.item_id), ...me.data.logs.filter((l) => l.status === "seen").map((l) => l.item_id)]);
    return recommend({
      items: candidates.data, historyItems:items.data, weights: me.data.weights, excludedIds: excluded,
      swipes: me.data.swipes, previousGenres: previousGenres.length?previousGenres:me.data.swipes.slice(0,3).reverse().map(s=>items.data?.find(i=>i.id===s.item_id)?.genres[0]??""),
      likedIds: new Set(me.data.swipes.filter((s) => s.action === "like").map((s) => s.item_id)),
      avoidedGenres: me.data.profile.avoided_genres, mediaType: media, georgianOnly: geo, tagFilter: tag,
    }, 5);
  }, [items.data, candidates.data, me.data, media, geo, tag, previousGenres]);
  useEffect(()=>{const next=recs[1]?.item;const url=next&&SHOW_IMAGES?imageUrl(next,'lg'):null;if(url){const img=new Image();img.src=url;}},[recs[1]?.item.id]);

  if (items.error || me.error) return <Shell><p className="error">{t('Could not load.')}<button className="btn" onClick={() => { items.refetch(); me.refetch(); }}>{t('Retry')}</button></p></Shell>;
  if (!items.data || !me.data || !candidates.data) return <Shell><Loading /></Shell>;
  if (!me.data.profile.onboarded && me.data.swipes.length === 0) {
    return (
      <Shell>
        <div className="box stack">
          <strong>{t('Welcome to Philomathia')}</strong>
          <p className="small muted">{t('Tell us a few things you like to get better first picks. Optional.')}</p>
          <Link to="/onboarding" className="btn btn-primary">{t('Set up my taste')}</Link>
          <OnboardSkip />
        </div>
      </Shell>
    );
  }
  const lang = appLang;
  const current = recs.find(r => r.item.id !== hidden);
  const last = me.data.swipes[0];
  const lastItem = last && items.data.find((i) => i.id === last.item_id);

  async function act(action: "like" | "pass") {
    if (!current || busy || !me.data) return;
    setBusy(true); setError(""); setArrival(null); setLeaving(action);
    try { await Promise.all([swipe(me.data.uid, current.item, action), motionWait()]); setHidden(current.item.id); await refresh(); setPreviousGenres(g => [...g, current.item.genres[0] ?? ""].slice(-3)); } catch { setError(t("Could not save. Please retry.")); } finally { setLeaving(null); setHidden(null); setBusy(false); }
  }
  async function undo() {
    if (!lastItem || busy) return;
    setBusy(true);
    try { await undoSwipe(lastItem, last.action); setArrival(last.action === 'like' ? 'like' : 'pass'); await refresh(); setPreviousGenres([]); } catch { setError(t("Could not save. Please retry.")); } finally { setBusy(false); }
  }

  return (
    <Shell>
      <div className="section">
        <div className="stack"><h1 className="h1">{t('Discover')}</h1><p className="lede">{t('Find something worth your time.')}</p></div>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="toggle" style={{ '--selected': media === 'film' ? 0 : 1 } as React.CSSProperties}>
          <button className={media === "film" ? "on" : ""} onClick={() => {setMedia("film");localStorage.setItem("phi-media","film");}}>{t('Films')}</button>
          <button className={media === "book" ? "on" : ""} onClick={() => {setMedia("book");localStorage.setItem("phi-media","book");}}>{t('Books')}</button>
        </div>
        <div className="between">
          <label className="row"><input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} />{t('Georgian only')}</label>
          {tag && <button className="chip chip-active" onClick={() => nav({ to: "/discover", search: { tag: undefined } })}>{tag} ✕</button>}
        </div>
        {current ? (
          <SwipeCard key={current.item.id} item={current.item} lang={lang} reason={localizedReason(current, appLang)} leaving={leaving} arrival={arrival} onLike={() => act("like")} disabled={busy} onPass={() => act("pass")} onTap={() => setOpen(true)} />
        ) : (
          <div className="box"><p>{t('No more picks here. Try the other tab, untick Georgian only, or undo a swipe.')}</p><button className="btn" onClick={() => { setGeo(false); setMedia(media === "film" ? "book" : "film"); if (tag) nav({ to: "/discover", search: { tag: undefined } }); }}>{t('Change filters')}</button></div>
        )}
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button className="btn btn-danger pill" disabled={!current || busy} onClick={() => act("pass")}>{t('Pass')}</button>
          <button className="btn pill" disabled={!current} onClick={() => setOpen(true)}>{t('Info')}</button>
          <button className="btn btn-primary pill" disabled={!current || busy} onClick={() => act("like")}>{t('Like')}</button>
        </div>
        <button className="btn btn-text" disabled={!lastItem || busy} onClick={undo}>{t("Undo last swipe")}{lastItem ? ` (${lastItem.title_en})` : ""}</button>
      </div>
      {open && current && <ItemDrawer item={current.item} items={items.data} lang={lang} reason={localizedReason(current, appLang)} onClose={() => setOpen(false)} />}
    </Shell>
  );
}

function OnboardSkip() {
  const { t, lang: appLang } = useLocale();
  const refresh = useRefresh();
  const me = useMe();
  return (
    <button onClick={async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("profiles").update({ onboarded: true }).eq("id", me.data?.uid ?? "");
      refresh();
    }} className="btn btn-text">{t('Skip')}</button>
  );
}
