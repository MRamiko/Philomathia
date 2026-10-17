import { useLocale } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loading, Shell } from "@/components/phi";
import { supabase } from "@/integrations/supabase/client";
import { MOOD_TAGS, REC } from "@/lib/config";
import { bump, useItems, useMe, useRefresh } from "@/lib/data";
import { allTagsOf } from "@/lib/recommend";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your taste · Philomathia" }, { name: "description", content: "Pick genres, moods and titles you like." }] }),
  component: Onboarding,
});

function Onboarding() {
  const { t: translate, lang: appLang } = useLocale();
  const items = useItems();
  const me = useMe();
  const refresh = useRefresh();
  const nav = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const genres = useMemo(() => Array.from(new Set((items.data ?? []).flatMap((i) => i.genres))).sort(), [items.data]);
  if (!items.data || !me.data) return <Shell><Loading /></Shell>;
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) =>{translate('x !== v) : list.length')}< 5 ? [...list, v] : list);

  async function finish(save: boolean) {
  const { t: translate, lang: appLang } = useLocale();
    if (save) {
      const picked = items.data!.filter((i) => titles.includes(i.id));
      await bump([...tags, ...picked.flatMap(allTagsOf)], REC.ONBOARD_DELTA);
    }
    await supabase.from("profiles").update({ onboarded: true }).eq("id", me.data!.uid);
    await refresh();
    nav({ to: "/discover", search: { tag: undefined } });
  }

  return (
    <Shell>
      <h1 className="h1">{translate('What do you like?')}</h1>
      <div className="h2">{translate("Up to 5 genres or moods")} ({tags.length}/5)</div>
      <div className="row">
        {[...genres, ...MOOD_TAGS].map((t) => (
          <button key={t} className={`chip ${tags.includes(t) ? "chip-active" : ""}`} onClick={() => toggle(tags, setTags, t)}>{translate(t)}</button>
        ))}
      </div>
      <div className="h2">{translate("Up to 5 titles you like")} ({titles.length}/5)</div>
      <div className="row">
        {items.data.map((i) => (
          <button key={i.id} className={`chip ${titles.includes(i.id) ? "chip-active" : ""}`} onClick={() => toggle(titles, setTitles, i.id)}>{i.title_en}</button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => finish(false)}>{translate('Skip')}</button>
        <button className="btn btn-primary" onClick={() => finish(true)}>{translate('Save')}</button>
      </div>
    </Shell>
  );
}
