import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ItemDrawer, Loading, Shell, SwipeCard } from "@/components/phi";
import { swipe, undoSwipe, useItems, useMe, useRefresh } from "@/lib/data";
import { recommend } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: (s: Record<string, unknown>) => ({ tag: typeof s.tag === "string" ? s.tag : undefined }),
  head: () => ({ meta: [{ title: "Discover · Philomathia" }, { name: "description", content: "Swipe through films and books picked for your taste." }] }),
  component: Discover,
});

function Discover() {
  const { tag } = Route.useSearch();
  const nav = useNavigate();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const [media, setMedia] = useState<"film" | "book">("film");
  const [geo, setGeo] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const recs = useMemo(() => {
    if (!items.data || !me.data) return [];
    const excluded = new Set([...me.data.swipes.map((s) => s.item_id), ...me.data.logs.filter((l) => l.status === "seen").map((l) => l.item_id)]);
    return recommend({
      items: items.data, weights: me.data.weights, excludedIds: excluded,
      likedIds: new Set(me.data.swipes.filter((s) => s.action === "like").map((s) => s.item_id)),
      avoidedGenres: me.data.profile.avoided_genres, mediaType: media, georgianOnly: geo, tagFilter: tag,
    }, 10);
  }, [items.data, me.data, media, geo, tag]);

  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  if (!me.data.profile.onboarded && me.data.swipes.length === 0) {
    return (
      <Shell>
        <div className="box stack">
          <strong>Welcome to Philomathia</strong>
          <p className="small muted">Tell us a few things you like to get better first picks. Optional.</p>
          <Link to="/onboarding" className="btn btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>Set up my taste</Link>
          <OnboardSkip />
        </div>
      </Shell>
    );
  }
  const lang = me.data.profile.preferred_language;
  const current = recs[0];
  const last = me.data.swipes[0];
  const lastItem = last && items.data.find((i) => i.id === last.item_id);

  async function act(action: "like" | "pass") {
    if (!current || busy) return;
    setBusy(true);
    try { await swipe(me.data!.uid, current.item, action); await refresh(); } finally { setBusy(false); }
  }
  async function undo() {
    if (!lastItem || busy) return;
    setBusy(true);
    try { await undoSwipe(lastItem, last.action); await refresh(); } finally { setBusy(false); }
  }

  return (
    <Shell>
      <div className="stack">
        <div className="toggle">
          <button className={media === "film" ? "on" : ""} onClick={() => setMedia("film")}>Films</button>
          <button className={media === "book" ? "on" : ""} onClick={() => setMedia("book")}>Books</button>
        </div>
        <div className="between">
          <label className="row small"><input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} /> Georgian only</label>
          {tag && <button className="chip chip-active" onClick={() => nav({ to: "/discover", search: { tag: undefined } })}>{tag} ✕</button>}
        </div>
        {current ? (
          <SwipeCard key={current.item.id} item={current.item} lang={lang} reason={current.reason} onLike={() => act("like")} onPass={() => act("pass")} onTap={() => setOpen(true)} />
        ) : (
          <div className="box"><p>No more picks here. Try the other tab, untick Georgian only, or undo a swipe.</p></div>
        )}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn" disabled={!current || busy} onClick={() => act("pass")}>Pass</button>
          <button className="btn" disabled={!current} onClick={() => setOpen(true)}>Info</button>
          <button className="btn btn-primary" disabled={!current || busy} onClick={() => act("like")}>Like</button>
        </div>
        <button className="btn" disabled={!lastItem || busy} onClick={undo}>Undo last swipe{lastItem ? ` (${lastItem.title_en})` : ""}</button>
      </div>
      {open && current && <ItemDrawer item={current.item} items={items.data} lang={lang} reason={current.reason} onClose={() => setOpen(false)} />}
    </Shell>
  );
}

function OnboardSkip() {
  const refresh = useRefresh();
  const me = useMe();
  return (
    <button className="btn" onClick={async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("profiles").update({ onboarded: true }).eq("id", me.data!.uid);
      refresh();
    }}>Skip</button>
  );
}
