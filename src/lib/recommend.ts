import type { Database } from "@/integrations/supabase/types";
import { REC } from "./config";

export type Item = Database["public"]["Tables"]["items"]["Row"];

export const creatorTag = (i: Item) => `creator:${i.creator}`;
export const featuresOf = (i: Item) =>
  Array.from(new Set([...i.genres, ...i.mood_tags, ...i.keywords].map((t) => t.toLowerCase())));
export const allTagsOf = (i: Item) => [...featuresOf(i), creatorTag(i)];

export type RecInput = {
  items: Item[];
  weights: Record<string, number>;
  excludedIds: Set<string>; // swiped or seen
  likedIds: Set<string>;
  avoidedGenres: string[];
  mediaType?: "film" | "book" | "either";
  georgianOnly?: boolean;
  moods?: string[]; // stored mood_tags
  keywords?: string[];
  minMinutes?: number;
  maxMinutes?: number;
  minPages?: number;
  maxPages?: number;
  tagFilter?: string;
};

export type Rec = { item: Item; score: number; reason: string; matched: string[]; exploratory: boolean };

function hardFilter(i: Item, x: RecInput) {
  if (x.excludedIds.has(i.id)) return false;
  if (x.mediaType && x.mediaType !== "either" && i.media_type !== x.mediaType) return false;
  if (x.georgianOnly && !i.is_georgian) return false;
  const avoided = x.avoidedGenres.map((g) => g.toLowerCase());
  if (i.genres.some((g) => avoided.includes(g.toLowerCase()))) return false;
  if (i.media_type === "film") {
    if (x.maxMinutes != null && (i.runtime_minutes ?? 9999) > x.maxMinutes) return false;
    if (x.minMinutes != null && (i.runtime_minutes ?? 0) < x.minMinutes) return false;
  } else {
    if (x.maxPages != null && (i.page_count ?? 99999) > x.maxPages) return false;
    if (x.minPages != null && (i.page_count ?? 0) < x.minPages) return false;
  }
  if (x.tagFilter) {
    const t = x.tagFilter.toLowerCase();
    if (!allTagsOf(i).map((a) => a.toLowerCase()).includes(t)) return false;
  }
  return true;
}

export function buildReason(matched: string[], creator: string | null, moodHits: string[], kwHits: string[]): string {
  const parts: string[] = [];
  if (matched.length || creator) {
    const names = [...matched.slice(0, 2), ...(creator ? [creator] : [])];
    parts.push(`Matches your interest in ${joinAnd(names)}`);
  }
  if (moodHits.length) parts.push(`fits the mood: ${joinAnd(moodHits.slice(0, 2))}`);
  if (kwHits.length) parts.push(`mentions ${joinAnd(kwHits.slice(0, 2))}`);
  if (!parts.length) return "";
  const s = parts.join("; ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const joinAnd = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

export function recommend(x: RecInput, limit = 50): Rec[] {
  const candidates = x.items.filter((i) => hardFilter(i, x));
  const positive = Object.entries(x.weights).filter(([, w]) => w > 0);
  const cold = Object.keys(x.weights).length === 0;

  if (cold && !(x.moods?.length || x.keywords?.length)) {
    return varied(candidates, !!x.georgianOnly)
      .slice(0, limit)
      .map((item) => ({ item, score: 0, reason: "A varied starter pick", matched: [], exploratory: false }));
  }

  const top = new Set(
    positive.filter(([t]) => !t.startsWith("creator:")).sort((a, b) => b[1] - a[1]).slice(0, REC.TOP_TAGS_FOR_EXPLORE).map(([t]) => t),
  );
  const likedGenres = new Set(x.items.filter((i) => x.likedIds.has(i.id)).flatMap((i) => i.genres.map((g) => g.toLowerCase())));

  const raw = candidates.map((item) => {
    const feats = featuresOf(item);
    const tagSum = feats.reduce((s, f) => s + (x.weights[f] ?? 0), 0);
    const matched = feats.filter((f) => (x.weights[f] ?? 0) > 0).sort((a, b) => (x.weights[b] ?? 0) - (x.weights[a] ?? 0));
    const cw = x.weights[creatorTag(item)] ?? 0;
    const moodHits = (x.moods ?? []).filter((m) => item.mood_tags.includes(m));
    const moodFit = x.moods?.length ? moodHits.length / x.moods.length : 0;
    const hay = `${item.title_en} ${item.description_en} ${feats.join(" ")}`.toLowerCase();
    const kwHits = (x.keywords ?? []).filter((k) => hay.includes(k.toLowerCase()));
    const known = feats.filter((f) => f in x.weights).length;
    const novelty = feats.length ? 1 - known / feats.length : 1;
    const exploratory = feats.some((f) => likedGenres.has(f)) && !feats.some((f) => top.has(f));
    return { item, tagSum, cw, moodFit, moodHits, kwHits, novelty, matched, exploratory };
  });
  const maxTag = Math.max(1, ...raw.map((r) => Math.abs(r.tagSum)));
  const maxCw = Math.max(1, ...raw.map((r) => Math.abs(r.cw)));

  const scored: Rec[] = raw.map((r) => {
    const kwBoost = x.keywords?.length ? (r.kwHits.length / x.keywords.length) * REC.W_MOOD : 0;
    const score = REC.W_TAG * (r.tagSum / maxTag) + REC.W_CREATOR * (r.cw / maxCw) + REC.W_MOOD * r.moodFit + REC.W_NOVELTY * r.novelty + kwBoost;
    let reason = buildReason(r.matched, r.cw > 0 ? r.item.creator : null, r.moodHits, r.kwHits);
    if (r.exploratory && !reason) {
      const g = featuresOf(r.item).find((f) => likedGenres.has(f));
      reason = `Something different: shares ${g} with a title you liked`;
    }
    if (!reason) reason = cold ? "A varied starter pick" : "New territory for you, with no strong match yet";
    return { item: r.item, score, reason, matched: r.matched, exploratory: r.exploratory };
  });
  scored.sort((a, b) => b.score - a.score);

  // Diversity: roughly every Nth slot goes to the best exploratory pick.
  const main = scored.filter((s) => !s.exploratory);
  const explore = scored.filter((s) => s.exploratory);
  const out: Rec[] = [];
  while (out.length < limit && (main.length || explore.length)) {
    const slot = out.length + 1;
    if (slot % REC.EXPLORE_EVERY === 0 && explore.length) out.push(explore.shift()!);
    else if (main.length) out.push(main.shift()!);
    else out.push(explore.shift()!);
  }
  return out;
}

function varied(items: Item[], georgianFirst: boolean): Item[] {
  const groups = new Map<string, Item[]>();
  const sorted = [...items].sort((a, b) => (georgianFirst ? Number(b.is_georgian) - Number(a.is_georgian) : 0) || a.title_en.localeCompare(b.title_en));
  for (const i of sorted) {
    const g = i.genres[0] ?? "other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(i);
  }
  const lists = [...groups.values()];
  const out: Item[] = [];
  let k = 0;
  while (out.length < items.length) {
    for (const l of lists) if (l[k]) out.push(l[k]);
    k++;
  }
  if (georgianFirst) out.sort((a, b) => Number(b.is_georgian) - Number(a.is_georgian));
  return out;
}

export function similar(item: Item, items: Item[], n = 3): Item[] {
  const f = new Set(featuresOf(item));
  return items
    .filter((i) => i.id !== item.id)
    .map((i) => ({ i, o: featuresOf(i).filter((t) => f.has(t)).length }))
    .sort((a, b) => b.o - a.o)
    .slice(0, n)
    .map((x) => x.i);
}
