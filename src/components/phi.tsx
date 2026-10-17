import { useLocale } from "@/lib/locale";
import { Link, useRouterState } from "@tanstack/react-router";
import { formatPrice } from "@/lib/strings";
import { useQuery } from "@tanstack/react-query";
import { rememberTab } from "@/lib/pwa";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SHOW_IMAGES } from "@/lib/config";
import { similar, type Item } from "@/lib/recommend";
import { descOf, lengthOf, titleOf, twoSentences, yearOf } from "@/lib/data";

const TABS = [
  { to: "/discover", label: "Discover" },
  { to: "/search", label: "Search" },
  { to: "/library", label: "Library" },
  { to: "/ask", label: "Ask Phi" },
  { to: "/profile", label: "Profile" },
] as const;

export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { t, lang: appLang } = useLocale();
  const [offline,setOffline]=useState(false);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(()=>{rememberTab(path);},[path]);
  useEffect(()=>{
   if(path==='/discover'||!['/search','/library','/ask','/profile'].includes(path))return;
   // A cold launch on another tab must retain Discover beneath it in history.
   if(window.history.length<=2){history.replaceState({...history.state},'', '/discover');history.pushState({...history.state},'',path);}
  },[path]);
  return (
    <>
      <div className="app">
        {offline && <p role="alert" className="offline">{t("You are offline")}</p>}
        <header className="topbar"><span className="brand" aria-hidden="true">Φ</span></header>
        {children}
        <div className="footer">{footer ?? t("Sample data for demo")}</div>
      </div>
      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((tab) => (
            <Link key={tab.to} to={tab.to} className={path.startsWith(tab.to) ? "active" : ""}>
              {t(tab.label)}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function Poster({ item, size }: { item: Item; size: "sm" | "lg" }) {
  const { t, lang: appLang } = useLocale();
  return (
    <div className={`poster poster-${size}`}>
      {SHOW_IMAGES && item.poster_url ? <img src={item.poster_url} alt={item.title_en} /> : <span>{t(item.media_type === "book" ? "Book" : "Film")}</span>}
    </div>
  );
}

export function ItemRow({ item, lang, right }: { item: Item; lang: string; right?: ReactNode }) {
  const { t, lang: appLang } = useLocale();
  return (
    <div className="list-item">
      <Link to="/item/$id" params={{ id: item.id }} style={{ display: "flex", gap: 16, color: "inherit", textDecoration: "none", flex: 1, minWidth: 0 }}>
        <Poster item={item} size="sm" />
        <div className="stack">
          <strong className="clamp2">{titleOf(item, lang)}</strong>
          <span className="muted small">
            {yearOf(item.year)} · {item.creator} · {t(item.media_type)}
          </span>
          <div className="row"><Chips tags={item.genres.slice(0, 2)} />{item.is_georgian && <span className="chip chip-geo">{t("Made in Georgia")}</span>}</div>
          <span className="muted small">{lengthOf(item, appLang)}</span>
        </div>
      </Link>
      {right ? <div className="stack">{right}</div> : null}
    </div>
  );
}

export function WhereToBuy({ itemId }: { itemId: string }) {
  const { t, lang: appLang } = useLocale();
  const q = useQuery({
    queryKey: ["stock", itemId],
    queryFn: async () => {
      const { data,error } = await supabase.from("shop_stock").select("price_gel,quantity,shops(name,address,city)").eq("item_id", itemId);
      if(error)throw error;
      return (data ?? []).sort((a: any, b: any) => (b.quantity > 0 ? 1 : 0) - (a.quantity > 0 ? 1 : 0) || a.price_gel - b.price_gel);
    },
  });
  const rows = q.data ?? [];
  const cheapest = rows.find((r: any) => r.quantity > 0);
  return (
    <div className="box">
      <div className="between">
        <strong>{t('Where to buy')}</strong>
        <span className="muted small">{t('Sample stock and prices')}</span>
      </div>
      {q.error&&<p className="error">{t("Could not load.")}<button className="btn" onClick={()=>q.refetch()}>{t("Retry")}</button></p>}
      {q.isPending&&<Loading/>}
      {!q.isPending&&!rows.length && <p className="muted small">{t('No shop lists this book yet.')}</p>}
      {cheapest && (
        <p className="ok small">
          {t("Cheapest in stock")}: {(cheapest as any).shops.name}, {(cheapest as any).shops.city} · {formatPrice((cheapest as any).price_gel, appLang)}
        </p>
      )}
      {rows.map((r: any, k) => (
        <div key={k} className="between small" style={{ padding: "8px 0" }}>
          <span>
            {r.shops.name}
            <br />
            <span className="muted">{r.shops.address}, {r.shops.city}</span>
          </span>
          <span>{r.quantity > 0 ? `${formatPrice(r.price_gel, appLang)} · ${t("{count} left", {count:r.quantity})}` : <span className="muted">{t('Out of stock')}</span>}</span>
        </div>
      ))}
    </div>
  );
}

export function Chips({ tags }: { tags: string[] }) {
  const { t: translateTag } = useLocale();
  return (
    <div className="row">
      {tags.map((t) => (
        <span key={t} className="chip">{translateTag(t)}</span>
      ))}
    </div>
  );
}

export function SwipeCard({ item, lang, reason, onLike, onPass, onTap, disabled }: {
  disabled?: boolean; item: Item; lang: string; reason: string; onLike: () => void; onPass: () => void; onTap: () => void;
}) {
  const { t, lang: appLang } = useLocale();
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  return (
    <div
      className={`card${drag ? " dragging" : ""}`}
      style={{ transform: `translateX(${dx}px) rotate(${Math.max(-8, Math.min(8, Math.round(dx / 16)))}deg)`, borderColor: dx >= 40 ? "limegreen" : dx <= -40 ? "red" : undefined }}
      onPointerDown={(e) => {
        if (disabled || e.clientX < 24 || e.clientX > window.innerWidth - 24) return;
        start.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
        setDrag(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const d = e.clientX - start.current.x;
        if (Math.abs(d) > 8) moved.current = true;
        setDx(d);
      }}
      onPointerUp={() => {
        if (!start.current) return;
        setDrag(false);
        const d = dx;
        start.current = null;
        if (d > 100) { setDx(0); onLike(); }
        else if (d < -100) { setDx(0); onPass(); }
        else { setDx(0); if (!moved.current) onTap(); }
      }}
      onPointerCancel={() => { setDrag(false); setDx(0); start.current = null; }}
    >
      {dx >= 40 && <span className="stamp stamp-like" style={{ opacity: Math.min(1, (dx - 20) / 80) }}>{t("LIKE")}</span>}
      {dx <= -40 && <span className="stamp stamp-pass" style={{ opacity: Math.min(1, (-dx - 20) / 80) }}>{t("PASS")}</span>}
      <Poster item={item} size="lg" />
      <h2 className="clamp2">{titleOf(item, lang)}</h2>
      <div className="muted small">
        {yearOf(item.year)} · {item.creator} · {lengthOf(item, appLang)}
      </div>
      <Chips tags={item.genres.slice(0, 3)} />
      <p>{twoSentences(descOf(item, lang))||t("No description available.")}</p>
      <p className="reason">{t("Why you’re seeing this")}: <b>{reason}</b></p>
    </div>
  );
}

export function ItemDrawer({ item, items, lang, reason, onClose }: { item: Item; items: Item[]; lang: string; reason: string; onClose: () => void }) {
  const { t, lang: appLang } = useLocale();
  useEffect(()=>{
    history.pushState({...history.state,phiDrawer:true},'');
    const close=()=>onClose();window.addEventListener('popstate',close);
    return()=>{window.removeEventListener('popstate',close);if(history.state?.phiDrawer)history.back();};
  },[]);
  return (
    <div className="drawer-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer stack" role="dialog" aria-label={titleOf(item, lang)}>
        <div className="handle" />
        <div className="between">
          <strong className="h2 clamp2" style={{ flex: 1 }}>{titleOf(item, lang)}</strong>
          <button className="btn icon-btn" aria-label={t('Close')} onClick={onClose}>✕</button>
        </div>
        <p>{descOf(item, lang)||t("No description available.")}</p>
        <Chips tags={item.mood_tags} />
        <p className="reason">{t("Why you’re seeing this")}: <b>{reason}</b></p>
        <div className="h2">{t('Similar titles')}</div>
        {similar(item, items).map((s) => <ItemRow key={s.id} item={s} lang={lang} />)}
        {item.media_type === "book" && <WhereToBuy itemId={item.id} />}
        <Link to="/item/$id" params={{ id: item.id }} className="btn btn-block">{t('Open full page')}</Link>
      </div>
    </div>
  );
}

export function Loading() {
  const { t, lang: appLang } = useLocale();
  return <p className="muted center" role="status">{t('Loading…')}</p>;
}
