import { Pagination } from "@/components/pagination";
import { REC } from "@/lib/config";
import { useLocale } from "@/lib/locale";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ItemRow, Loading, Shell } from "@/components/phi";
import { useItems, useMe } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search · Philomathia" }, { name: "description", content: "Search films and books in English or Georgian." }, { property: "og:title", content: "Search · Philomathia" }, { property: "og:description", content: "Search films and books in English or Georgian." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { t, lang: appLang } = useLocale();
  const items = useItems();
  const me = useMe();
  const [page,setPage]=useState(1);
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
  const lang = appLang;
  const translateType = t;
  return (
    <Shell>
      <div className="stack">
        <input className="input" placeholder={t('Title, creator, genre… (English or ქართული)')} value={q} onChange={(e) => {setQ(e.target.value);setPage(1);}} />
        <div className="toggle" style={{ '--selected': ['all','film','book'].indexOf(type), '--segments': 3 } as React.CSSProperties}>
          {(["all", "film", "book"] as const).map((t) => (
            <button key={t} className={type === t ? "on" : ""} onClick={() => {setType(t);setPage(1);}}>{translateType(t === "all" ? "All" : t === "film" ? "Films" : "Books")}</button>
          ))}
        </div>
        <label className="row small"><input type="checkbox" checked={geo} onChange={(e) => {setGeo(e.target.checked);setPage(1);}} />{t('Made in Georgia')}</label>
      </div>
      {items.error ? <p className="error">{t("Could not load.")}<button className="btn" onClick={()=>items.refetch()}>{t("Retry")}</button></p> : !items.data ? <Loading />: results.length === 0 ?<p className="muted">{t('No results')}</p> : <div key={`${q}-${type}-${geo}-${page}`} className={`motion-list ${page > 1 ? 'no-stagger' : ''}`}>{results.slice((page-1)*REC.PAGE_SIZE,page*REC.PAGE_SIZE).map((i) => <ItemRow key={i.id} item={i} lang={lang} />)}</div>}
      <Pagination page={page} total={results.length} onChange={setPage}/>
    </Shell>
  );
}
