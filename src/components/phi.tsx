import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="app">
        <div className="brand">Φ</div>
        {children}
        <div className="footer">{footer ?? "Sample data for demo"}</div>
      </div>
      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} className={path.startsWith(t.to) ? "active" : ""}>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function Poster({ item, size }: { item: Item; size: "sm" | "lg" }) {
  return (
    <div className={`poster poster-${size}`}>
      {SHOW_IMAGES && item.poster_url ? <img src={item.poster_url} alt={item.title_en} /> : null}
    </div>
  );
}

export function ItemRow({ item, lang, right }: { item: Item; lang: string; right?: ReactNode }) {
  return (
    <div className="list-item">
      <Link to="/item/$id" params={{ id: item.id }} style={{ display: "flex", gap: 16, color: "white", textDecoration: "none", flex: 1 }}>
        <Poster item={item} size="sm" />
        <div className="stack">
          <strong>{titleOf(item, lang)}</strong>
          <span className="muted small">
            {yearOf(item.year)} · {item.creator} · {item.media_type}
            {item.is_georgian ? " · Georgia" : ""}
          </span>
          <span className="muted small">{lengthOf(item)}</span>
        </div>
      </Link>
      {right ? <div className="stack">{right}</div> : null}
    </div>
  );
}

export function WhereToBuy({ itemId }: { itemId: string }) {
  const q = useQuery({
    queryKey: ["stock", itemId],
    queryFn: async () => {
      const { data } = await supabase.from("shop_stock").select("price_gel,quantity,shops(name,address,city)").eq("item_id", itemId);
      return (data ?? []).sort((a: any, b: any) => (b.quantity > 0 ? 1 : 0) - (a.quantity > 0 ? 1 : 0) || a.price_gel - b.price_gel);
    },
  });
  const rows = q.data ?? [];
  const cheapest = rows.find((r: any) => r.quantity > 0);
  return (
    <div className="box">
      <div className="between">
        <strong>Where to buy</strong>
        <span className="muted small">Sample data</span>
      </div>
      {!rows.length && <p className="muted small">No shop lists this book yet.</p>}
      {cheapest && (
        <p className="ok small">
          Cheapest in stock: {(cheapest as any).shops.name}, {(cheapest as any).shops.city} · {(cheapest as any).price_gel} GEL
        </p>
      )}
      {rows.map((r: any, k) => (
        <div key={k} className="between small" style={{ padding: "8px 0" }}>
          <span>
            {r.shops.name}
            <br />
            <span className="muted">{r.shops.address}, {r.shops.city}</span>
          </span>
          <span>{r.quantity > 0 ? `${r.price_gel} GEL · ${r.quantity} left` : <span className="muted">Out of stock</span>}</span>
        </div>
      ))}
    </div>
  );
}

export function Chips({ tags }: { tags: string[] }) {
  return (
    <div className="row">
      {tags.map((t) => (
        <span key={t} className="chip">{t}</span>
      ))}
    </div>
  );
}

export function SwipeCard({ item, lang, reason, onLike, onPass, onTap }: {
  item: Item; lang: string; reason: string; onLike: () => void; onPass: () => void; onTap: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  return (
    <div
      className={`card${drag ? " dragging" : ""}`}
      style={{ transform: `translateX(${dx}px) rotate(${Math.round(dx / 16)}deg)`, borderColor: dx > 100 ? "green" : dx < -100 ? "red" : undefined }}
      onPointerDown={(e) => {
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
        setDrag(false);
        const d = dx;
        start.current = null;
        if (d > 100) { setDx(400); setTimeout(onLike, 200); }
        else if (d < -100) { setDx(-400); setTimeout(onPass, 200); }
        else { setDx(0); if (!moved.current) onTap(); }
      }}
      onPointerCancel={() => { setDrag(false); setDx(0); start.current = null; }}
    >
      <Poster item={item} size="lg" />
      <h2 className="h2">{titleOf(item, lang)}</h2>
      <div className="muted small">
        {yearOf(item.year)} · {item.creator} · {lengthOf(item)}
      </div>
      <div style={{ margin: "8px 0" }}><Chips tags={item.genres} /></div>
      <p className="small">{twoSentences(descOf(item, lang))}</p>
      <p className="small ok">Why you're seeing this: {reason}</p>
    </div>
  );
}

export function ItemDrawer({ item, items, lang, reason, onClose }: { item: Item; items: Item[]; lang: string; reason: string; onClose: () => void }) {
  return (
    <div className="drawer-bg">
      <div className="drawer stack">
        <div className="between">
          <strong>{titleOf(item, lang)}</strong>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        <p>{descOf(item, lang)}</p>
        <Chips tags={item.mood_tags} />
        <p className="small ok">Why you're seeing this: {reason}</p>
        <div className="h2">Similar titles</div>
        {similar(item, items).map((s) => <ItemRow key={s.id} item={s} lang={lang} />)}
        {item.media_type === "book" && <WhereToBuy itemId={item.id} />}
        <Link to="/item/$id" params={{ id: item.id }} className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Open full page</Link>
      </div>
    </div>
  );
}

export function Loading() {
  return <p className="muted">Loading…</p>;
}
