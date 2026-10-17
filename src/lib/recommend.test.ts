import { describe, expect, it } from "vitest";
import { recommend, type Item } from "./recommend";

const mk = (id: string, p: Partial<Item>): Item => ({
  id, media_type: "film", title_en: id, title_ka: null, original_title: null, creator: "X", year: 2000, description_en: "", description_ka: null,
  genres: [], mood_tags: [], keywords: [], is_georgian: false, isbn: null, runtime_minutes: 100, page_count: null, trailer_key: null,
  poster_url: null, tmdb_id: null, openlibrary_key: null, wikidata_id: null, source: "seed", created_at: "", ...p,
});
const items = [
  mk("memento", { genres: ["thriller", "psychological thriller"], mood_tags: ["mind-bending", "mysterious"], keywords: ["memory"], creator: "Christopher Nolan" }),
  mk("shutter", { genres: ["thriller", "psychological thriller"], mood_tags: ["mind-bending", "mysterious"], keywords: ["memory"], creator: "Martin Scorsese" }),
  mk("amelie", { genres: ["comedy"], mood_tags: ["funny"], runtime_minutes: 80 }),
];

describe("recommend", () => {
  it("cold start says varied starter pick", () => {
    const r = recommend({ items, weights: {}, excludedIds: new Set(), likedIds: new Set(), avoidedGenres: [] });
    expect(r[0]!.reason).toBe("A varied starter pick");
  });
  it("after liking Memento, Shutter Island ranks first with a reason naming tags", () => {
    const weights: Record<string, number> = { thriller: 3, "psychological thriller": 3, "mind-bending": 3, mysterious: 3, memory: 3, "creator:Christopher Nolan": 3 };
    const r = recommend({ items, weights, excludedIds: new Set(["memento"]), likedIds: new Set(["memento"]), avoidedGenres: [] });
    expect(r[0]!.item.id).toBe("shutter");
    expect(r[0]!.reason).toMatch(/Matches your interest in/);
  });
  it("hard filters runtime and avoided genres", () => {
    const r = recommend({ items, weights: { x: 1 }, excludedIds: new Set(), likedIds: new Set(), avoidedGenres: ["comedy"], maxMinutes: 90 });
    expect(r).toHaveLength(0);
  });
});
