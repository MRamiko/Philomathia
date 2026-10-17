import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REC } from "./config";
import { translate, type Locale } from "./strings";
import { allTagsOf, type Item } from "./recommend";
import { cleanDisplayName, displayName, validDisplayName } from './display-name';

export type Log = { id: string; item_id: string; status: string; rating: number | null; review: string | null; logged_at: string };
export type Swipe = { item_id: string; action: string; created_at: string };

export function useItems(itemId?:string) {
  return useQuery({
    queryKey: ["items",itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("popularity",{ascending:false}).limit(300);
      if (error) throw error;
      const user=await supabase.auth.getUser();
      const ids=new Set<string>(itemId?[itemId]:[]);
      if(user.data.user){for(const table of ['swipes','logs'] as const){let offset=0;while(true){const r=await supabase.from(table).select('item_id').range(offset,offset+999);if(r.error)throw r.error;for(const row of r.data??[])ids.add(row.item_id);if((r.data?.length??0)<1000)break;offset+=1000;}}}
      const merged=new Map((data??[]).map(i=>[i.id,i]));const wanted=[...ids].filter(id=>!merged.has(id));
      for(let n=0;n<wanted.length;n+=100){const r=await supabase.from('items').select('*').in('id',wanted.slice(n,n+100));if(r.error)throw r.error;for(const i of r.data??[])merged.set(i.id,i);}
      return [...merged.values()] as Item[];
    },
    staleTime: 60_000,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");
      const [p, s, l, t, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("swipes").select("item_id,action,created_at").order("created_at", { ascending: false }),
        supabase.from("logs").select("id,item_id,status,rating,review,logged_at").order("logged_at", { ascending: false }),
        supabase.from("tag_weights").select("tag,weight"),
        supabase.from("user_roles").select("role,shop_id"),
      ]);
      for (const result of [p,s,l,t,r]) if (result.error) throw result.error;
      let profile = p.data;
      if (!profile) {
        const metadataName = cleanDisplayName(String(u.user?.user_metadata?.['display_name'] ?? ''));
        const name = validDisplayName(metadataName) ? metadataName : Array.from(displayName(null, u.user?.email ?? '')).slice(0,40).join('');
        const repaired = await supabase.from('profiles').upsert({ id: uid, display_name: name, preferred_language: 'en' }, { onConflict: 'id', ignoreDuplicates: true });
        if (repaired.error) throw repaired.error;
        const saved = await supabase.from('profiles').select('*').eq('id',uid).single();
        if (saved.error) throw saved.error;
        profile = saved.data;
      }
      const weights: Record<string, number> = {};
      for (const row of t.data ?? []) weights[row.tag] = Number(row.weight);
      return {
        uid,
        email: u.user?.email ?? "",
        profile,
        swipes: (s.data ?? []) as Swipe[],
        logs: ((l.data ?? []) as any[]).map((x) => ({ ...x, rating: x.rating == null ? null : Number(x.rating) })) as Log[],
        weights,
        roles: (r.data ?? []).map((x) => x.role as string),
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}
export type Me = NonNullable<ReturnType<typeof useMe>["data"]>;

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}

export async function tasteAction(itemId: string | null, kind: string, value: Record<string, unknown> = {}) {
  const { error } = await supabase.rpc("taste_action", { _item: itemId as string, _kind: kind, _value: value as any, _rules: REC });
  if (error) throw error;
}
export async function bump(tags: string[], _delta: number) { await tasteAction(null, "onboard", { tags }); }
export async function swipe(_uid: string, item: Item, action: "like" | "pass") { await tasteAction(item.id, action); }
export async function undoSwipe(item: Item, _action: string) { await tasteAction(item.id, "undo"); }
export async function saveLog(_uid: string, item: Item, _prev: Log | undefined, value: { status: string; rating: number | null; review: string | null }) { await tasteAction(item.id, "log", value); }
export async function deleteLog(item: Item, _prev: Log) { await tasteAction(item.id, "remove_log"); }

export function titleOf(i: Item, lang: string) {
  return lang === "ka" && i.title_ka?.trim() ? i.title_ka : i.title_en;
}
export function descOf(i: Item, lang: string) {
  return lang === "ka" && i.description_ka?.trim() ? i.description_ka : i.description_en;
}
export function lengthOf(i: Item, lang: string="en") {
  const t=(k:string)=>translate(lang==="ka"?"ka":"en",k);
  return i.media_type === "film" ? (i.runtime_minutes ? `${i.runtime_minutes} ${t("min")}` : "") : i.page_count ? `${i.page_count} ${t("pages")}` : "";
}
export function twoSentences(s: string) {
  const m = s.match(/[^.!?]+[.!?]+/g);
  return m ? m.slice(0, 2).join(" ").trim() : s;
}
export const yearOf = (y: number | null) => (y == null ? "" : y < 0 ? `${-y} BC` : String(y));
