import { useAction } from "@/lib/use-action";
import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { MOOD_TAGS, REC } from "@/lib/config";
import { bump, useItems, useMe, useRefresh } from "@/lib/data";
import { allTagsOf } from "@/lib/recommend";
import {useCatalogSearch} from '@/lib/catalog';

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your taste · Philomathia" }, { name: "description", content: "Pick genres, moods and titles you like." }, { property: "og:title", content: "Your taste · Philomathia" }, { property: "og:description", content: "Pick genres, moods and titles you like." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { t: translate, lang: appLang } = useLocale();
  const action=useAction();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const nav = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [search,setSearch]=useState('');
  const searched=useCatalogSearch(search);
  const [selectedItems,setSelectedItems]=useState<import('@/lib/recommend').Item[]>([]);
  const genres = useMemo(() => Array.from(new Set((items.data ?? []).flatMap((i) => i.genres))).sort(), [items.data]);
  if (items.error || me.error) return <Shell><p role="alert" className="error">{translate("Could not load.")}</p><button className="btn" onClick={()=>{items.refetch();me.refetch();}}>{translate("Retry")}</button></Shell>;
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) =>x !== v) : list.length< 5 ? [...list, v] : list);

  async function finish(save: boolean) {
    if (save) {
      const picked = selectedItems.filter((i) => titles.includes(i.id));
      await bump([...tags, ...picked.flatMap(allTagsOf)], REC.ONBOARD_DELTA);
    }
    await supabase.from("profiles").update({ onboarded: true }).eq("id", me.data?.uid??"");
    await refresh();
    nav({ to: "/discover", search: { tag: undefined } });
  }

  return (
    <Shell>
      {action.error&&<p role="alert" className="error">{action.error}</p>}
      <h1 className="h1">{translate('What do you like?')}</h1>
      <div className="h2">{translate("Up to 5 genres or moods")} <span key={tags.length} className="counter-motion">({tags.length} / 5)</span></div>
      <div className="row">
        {[...genres, ...MOOD_TAGS].map((t) => (
          <button key={t} className={`chip ${tags.includes(t) ? "chip-active" : ""}`} onClick={() => toggle(tags, setTags, t)}>{translate(t)}</button>
        ))}
      </div>
      <div className="h2">{translate("Up to 5 titles you like")} <span key={titles.length} className="counter-motion">({titles.length} / 5)</span></div>
      <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={translate('Title, creator, genre… (English or ქართული)')}/>
      <div className="row">
        {(search?searched.data?.items??[]:[...items.data.filter(i=>i.media_type==='film'&&!i.is_georgian).slice(0,12),...items.data.filter(i=>i.media_type==='book'&&!i.is_georgian).slice(0,12),...items.data.filter(i=>i.is_georgian).slice(0,6)]).map((i) => (
          <button key={i.id} className={`chip ${titles.includes(i.id) ? "chip-active" : ""}`} onClick={() => {toggle(titles, setTitles, i.id);setSelectedItems(old=>old.some(x=>x.id===i.id)?old:[...old,i]);}}>{appLang==="ka"&&i.title_ka?.trim()?i.title_ka:i.title_en}</button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={action.busy} onClick={() => action.run(()=>finish(false))}>{translate('Skip')}</button>
        <button className="btn btn-primary" disabled={action.busy} onClick={() => action.run(()=>finish(true))}>{translate('Save')}</button>
      </div>
    </Shell>
  );
}
