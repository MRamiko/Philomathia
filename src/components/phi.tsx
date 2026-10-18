import { useLocale } from "@/lib/locale";
import { Link, useRouterState } from "@tanstack/react-router";
import { formatPrice } from "@/lib/strings";
import { useQuery } from "@tanstack/react-query";
import { rememberTab } from "@/lib/pwa";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SHOW_IMAGES } from "@/lib/config";
import { imageUrl } from '@/lib/images';
import { similar, type Item } from "@/lib/recommend";
import { descOf, lengthOf, titleOf, twoSentences, yearOf } from "@/lib/data";
import { Presence, MotionList } from '@/components/motion';
import { Icon, PhiLogo, type IconName } from './icons';
import { haptic } from '@/lib/timings';
import {WhereToWatch} from './where-to-watch';
import {Button} from './auth-form';

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
  return (
    <>
      <div className="app">
        {offline && <p role="alert" className="offline">{t("You are offline")}</p>}
        <header className="topbar"><PhiLogo /></header>
        {children}
        {footer&&<div className="footer">{footer}</div>}
      </div>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-indicator" style={{ transform: `translateX(${Math.max(0, TABS.findIndex(tab => path.startsWith(tab.to))) * 100}%)` }} />
          {TABS.map((tab) => (
            <Link key={tab.to} to={tab.to} aria-label={tab.label} title={tab.label} onClick={()=>{sessionStorage.setItem('phi-tab-start',String(performance.now()));haptic();}} className={path.startsWith(tab.to) ? "active" : ""}>
              <Icon name={(tab.to.slice(1)==='ask'?'ask':tab.to.slice(1)) as IconName}/>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function Poster({ item, size, eager = false }: { item: Item; size: "sm" | "lg"; eager?: boolean }) {
  const { t, lang: appLang } = useLocale();
  const url=SHOW_IMAGES?imageUrl(item,size):null;
  const [loaded,setLoaded]=useState<string|null>(null);
  const [failed,setFailed]=useState<string|null>(null);
  return (
    <div className={`poster poster-${size}`}>
      {loaded!==url || !url || failed===url ? <span>{t(item.media_type === "book" ? "Book" : "Film")}</span>:null}
      {url && failed!==url && <img key={url} src={url} alt={titleOf(item,appLang)} width={size==='sm'?100:200} height={size==='sm'?150:300} loading={eager?'eager':'lazy'} decoding="async" className={loaded===url?'loaded':'pending'} onLoad={()=>setLoaded(url)} onError={()=>setFailed(url)}/>}
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
          {item.title_ka?.trim()&&item.title_ka!==item.title_en&&<span className="muted small" lang="ka">{item.title_ka}</span>}
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
      const { data,error } = await supabase.from("shop_stock").select("id,price_gel,quantity,updated_at,shops(name,address,city,is_sample)").eq("item_id", itemId);
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
        {rows.length>0&&rows.every((r:any)=>r.shops.is_sample)&&<span className="muted small">{t('Sample stock and prices')}</span>}
      </div>
      {q.error&&<p className="error">{t("Could not load.")}<button className="btn" onClick={()=>q.refetch()}>{t("Retry")}</button></p>}
      {q.isPending&&<Loading/>}
      {!q.isPending&&!rows.length && <p className="muted small">{t('No shop lists this book yet.')}</p>}
      {cheapest && (
        <p className="ok small">
          {t("Cheapest in stock")}: {(cheapest as any).shops.name}, {(cheapest as any).shops.city} · {formatPrice((cheapest as any).price_gel, appLang)}
        </p>
      )}
      <MotionList scope={`stock-${itemId}`}>{rows.map((r: any) => (
        <div key={r.id} className="between small" style={{ padding: "8px 0" }}>
          <span>
            {r.shops.name}
            <br />
            <span className="muted">{r.shops.address}, {r.shops.city}</span>
          </span>
          <span>{r.quantity > 0 ? `${formatPrice(r.price_gel, appLang)} · ${t("{count} left", {count:r.quantity})}` : <span className="stock-out">{t('Out of stock')}</span>}</span>
        </div>
      ))}</MotionList>
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

export function SwipeCard({ item, lang, reason, onLike, onPass, onTap, disabled, leaving, arrival }: {
  disabled?: boolean; leaving?: 'like' | 'pass' | null; arrival?: 'like' | 'pass' | null; item: Item; lang: string; reason: string; onLike: () => void; onPass: () => void; onTap: () => void;
}) {
  const { t, lang: appLang } = useLocale();
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  return (
    <div
      className={`card${drag ? " dragging" : ""}`}
      style={{ transform: `translateX(${leaving ? (leaving === 'like' ? 1 : -1) * window.innerWidth : dx}px) rotate(${leaving ? (leaving === 'like' ? 8 : -8) : Math.max(-8, Math.min(8, Math.round(dx / 16)))}deg)` }}
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
        if (d > 100) { onLike(); }
        else if (d < -100) { onPass(); }
        else { setDx(0); if (!moved.current) onTap(); }
      }}
      onPointerCancel={() => { setDrag(false); setDx(0); start.current = null; }}
    >
      <span className={`swipe-border ${dx < 0 || leaving === 'pass' ? 'pass' : ''}`} style={{ opacity: leaving ? 1 : Math.min(1, Math.abs(dx) / 100) }} />
      {dx >= 40 && <span className="stamp stamp-like" style={{ opacity: Math.min(1, (dx - 20) / 80) }}>{t("LIKE")}</span>}
      {dx <= -40 && <span className="stamp stamp-pass" style={{ opacity: Math.min(1, (-dx - 20) / 80) }}>{t("PASS")}</span>}
      <div className={arrival ? `swipe-undo-${arrival === 'like' ? 'right' : 'left'}` : 'swipe-arrival'}>
      <div className="stack swipe-content">
      <Poster item={item} size="lg" eager />
      <div className="swipe-caption">
      <h2 className="clamp2">{titleOf(item, lang)}</h2>
      {item.title_ka?.trim()&&item.title_ka!==item.title_en&&<span className="small" lang="ka">{item.title_ka}</span>}
      <div className="muted small">
        {yearOf(item.year)} · {item.creator} · {lengthOf(item, appLang)}
      </div>
      <Chips tags={item.genres.slice(0, 2)} />
      <p className="reason"><Icon name="spark"/><b>{reason}</b></p>
      </div>
      </div>
      </div>
    </div>
  );
}

export function ItemDrawer({ item, items, lang, reason, onClose }: { item: Item; items: Item[]; lang: string; reason: string; onClose: () => void }) {
  const { t, lang: appLang } = useLocale();
  const detail=useQuery({queryKey:['item',item.id],staleTime:60000,queryFn:async()=>{const r=await supabase.from('items').select('*').eq('id',item.id).single();if(r.error)throw r.error;return r.data;}});
  const full=detail.data??item;
  return (
    <Presence historyEntry className="drawer-bg" onExit={onClose}>{close => <>
      <div className="drawer-dismiss" onClick={close} />
      <div className="drawer stack" role="dialog" aria-modal="true" aria-label={titleOf(item, lang)}>
        <div className="handle" />
        <div className="between">
          <strong className="h2 clamp2" style={{ flex: 1 }}>{titleOf(item, lang)}</strong>
          <button className="btn icon-btn" aria-label={t('Close')} onClick={close}>✕</button>
        </div>
        {item.title_ka&&<p lang="ka" className="small muted">{item.title_ka}</p>}
        <p>{detail.isPending?'Loading description…':descOf(full, lang)||t("No description available.")}</p>
        {detail.error&&<Button onClick={()=>detail.refetch()}>Retry description</Button>}
        <Chips tags={item.mood_tags} />
        <p className="reason">{t("Why you’re seeing this")}: <b>{reason}</b></p>
        <div className="h2">{t('Similar titles')}</div>
        <MotionList scope={`similar-${item.id}`}>{similar(item, items).map((s) => <ItemRow key={s.id} item={s} lang={lang} />)}</MotionList>
        {item.media_type === "book" && <WhereToBuy itemId={item.id} />}
        {item.media_type === "film" && <WhereToWatch itemId={item.id} />}
        <Link to="/item/$id" params={{ id: item.id }} className="btn btn-block">{t('Open full page')}</Link>
      </div>
    </>}</Presence>
  );
}

export function Loading() {
  const { t, lang: appLang } = useLocale();
  return <div className="loading-indicator stack" role="status"><p className="muted center">{t('Loading…')}<span className="loading-dots" aria-hidden="true"><span>·</span><span>·</span><span>·</span></span></p><div className="loading-surfaces" aria-hidden="true"><div className="loading-surface"/><div className="loading-surface"/></div></div>;
}
