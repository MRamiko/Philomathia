import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REC } from "./config";
import { allTagsOf, type Item } from "./recommend";

export type Log = { id: string; item_id: string; status: string; rating: number | null; review: string | null; logged_at: string };
export type Swipe = { item_id: string; action: string; created_at: string };

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("title_en");
      if (error) throw error;
      return data as Item[];
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
      const weights: Record<string, number> = {};
      for (const row of t.data ?? []) weights[row.tag] = Number(row.weight);
      return {
        uid,
        email: u.user?.email ?? "",
        profile: p.data ?? { id: uid, display_name: null, preferred_language: "en", avoided_genres: [] as string[], onboarded: false },
        swipes: (s.data ?? []) as Swipe[],
        logs: ((l.data ?? []) as any[]).map((x) => ({ ...x, rating: x.rating == null ? null : Number(x.rating) })) as Log[],
        weights,
        roles: (r.data ?? []).map((x) => x.role as string),
      };
    },
  });
}
export type Me = NonNullable<ReturnType<typeof useMe>["data"]>;

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me"] });
}

export async function bump(tags: string[], delta: number) {
  if (!tags.length || !delta) return;
  await supabase.rpc("bump_tags", { _tags: tags, _delta: delta });
}

export async function swipe(uid: string, item: Item, action: "like" | "pass") {
  const { error } = await supabase.from("swipes").upsert({ user_id: uid, item_id: item.id, action }, { onConflict: "user_id,item_id" });
  if (error) throw error;
  await bump(allTagsOf(item), action === "like" ? REC.LIKE_DELTA : REC.PASS_DELTA);
}

export async function undoSwipe(item: Item, action: string) {
  const { error } = await supabase.from("swipes").delete().eq("item_id", item.id);
  if (error) throw error;
  await bump(allTagsOf(item), action === "like" ? -REC.LIKE_DELTA : -REC.PASS_DELTA);
}

const ratingEffect = (status: string | undefined, r: number | null | undefined) =>
  status === "seen" && r != null ? (r >= 4 ? REC.HIGH_RATING_DELTA : r <= 2 ? REC.LOW_RATING_DELTA : 0) : 0;

export async function saveLog(uid: string, item: Item, prev: Log | undefined, v: { status: string; rating: number | null; review: string | null }) {
  const { error } = await supabase.from("logs").upsert(
    { user_id: uid, item_id: item.id, status: v.status, rating: v.rating, review: v.review, logged_at: new Date().toISOString() },
    { onConflict: "user_id,item_id" },
  );
  if (error) throw error;
  const delta = ratingEffect(v.status, v.rating) - ratingEffect(prev?.status, prev?.rating);
  await bump(allTagsOf(item), delta);
}

export async function deleteLog(item: Item, prev: Log) {
  await supabase.from("logs").delete().eq("item_id", item.id);
  await bump(allTagsOf(item), -ratingEffect(prev.status, prev.rating));
}

export function titleOf(i: Item, lang: string) {
  return lang === "ka" && i.title_ka ? i.title_ka : i.title_en;
}
export function descOf(i: Item, lang: string) {
  return lang === "ka" && i.description_ka ? i.description_ka : i.description_en;
}
export function lengthOf(i: Item) {
  return i.media_type === "film" ? (i.runtime_minutes ? `${i.runtime_minutes} min` : "") : i.page_count ? `${i.page_count} pages` : "";
}
export function twoSentences(s: string) {
  const m = s.match(/[^.!?]+[.!?]+/g);
  return m ? m.slice(0, 2).join(" ").trim() : s;
}
export const yearOf = (y: number | null) => (y == null ? "" : y < 0 ? `${-y} BC` : String(y));
