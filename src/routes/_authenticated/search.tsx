import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { useItems, useMe } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search · Philomathia" }, { name: "description", content: "Search films and books in English or Georgian." }] }),
  component: SearchPage,
});

function SearchPage() {
  const items = useItems();
  const me = useMe();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "film" | "book">("all");
  const [geo, setGeo] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items.data ?? []).filter((i) => {
      if (type !== "all" && i.media_type !== type) return false;
      if (geo && !i.is_georgian) return false;
      if (!s) return true;
      const hay = [i.title_en, i.title_ka, i.original_title, i.creator, ...i.genres, ...i.keywords].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [items.data, q, type, geo]);
  const lang = me.data?.profile.preferred_language ?? "en";
  return (
    <Shell>
      <div className="stack">
        <input className="input" placeholder="Title, creator, genre… (English or ქართული)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="toggle">
          {(["all", "film", "book"] as const).map((t) => (
            <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t === "all" ? "All" : t === "film" ? "Films" : "Books"}</button>
          ))}
        </div>
        <label className="row small"><input type="checkbox" checked={geo} onChange={(e) => setGeo(e.target.checked)} /> Made in Georgia</label>
      </div>
      {!items.data ? <Loading /> : results.length === 0 ? <p className="muted">No results</p> : results.map((i) => <ItemRow key={i.id} item={i} lang={lang} />)}
    </Shell>
  );
}
