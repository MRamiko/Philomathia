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
    expect(r[0]?.reason).toBe("A varied starter pick");
  });
  it("after liking Memento, Shutter Island ranks first with a reason naming tags", () => {
    const weights: Record<string, number> = { thriller: 3, "psychological thriller": 3, "mind-bending": 3, mysterious: 3, memory: 3, "creator:Christopher Nolan": 3 };
    const r = recommend({ items, weights, excludedIds: new Set(["memento"]), likedIds: new Set(["memento"]), avoidedGenres: [] });
    expect(r[0]?.item.id).toBe("shutter");
    expect(r[0]?.reason).toMatch(/Because you liked memento:.*thriller/);
  });
  it("hard filters runtime and avoided genres", () => {
    const r = recommend({ items, weights: { x: 1 }, excludedIds: new Set(), likedIds: new Set(), avoidedGenres: ["comedy"], maxMinutes: 90 });
    expect(r).toHaveLength(0);
  });
});

import { REC } from './config';
import { recentWeights } from './recommend';
describe('adaptive corrective rules', () => {
 it('onboarding never filters out other genres and queue is at most five',()=>{const r=recommend({items,weights:{comedy:2},excludedIds:new Set(),likedIds:new Set(),avoidedGenres:[]});expect(r.some(r=>r.item.id==='memento')).toBe(true);expect(r.length).toBeLessThanOrEqual(5);});
 it('five science fiction likes overcome an onboarding drama hint',()=>{const catalog=Array.from({length:12},(_,k)=>mk(`sf${k}`,{genres:['science fiction'],keywords:['space']})).concat(Array.from({length:6},(_,k)=>mk(`dr${k}`,{genres:['drama']})));const swipes=catalog.slice(0,5).map((i,k)=>({item_id:i.id,action:'like',created_at:`2026-10-${10+k}`}));const r=recommend({items:catalog,weights:{drama:2,'science fiction':14,space:14},swipes,excludedIds:new Set(swipes.map(s=>s.item_id)),likedIds:new Set(swipes.map(s=>s.item_id)),avoidedGenres:[]});expect(r.filter(r=>r.item.genres[0]==='science fiction').length).toBeGreaterThanOrEqual(3);});
 it('negative weights lower relevance without banning',()=>{const r=recommend({items,weights:{thriller:-10,comedy:2},excludedIds:new Set(),likedIds:new Set(),avoidedGenres:[]});expect(r[0]?.item.id).toBe('amelie');expect(r.some(r=>r.item.id==='shutter')).toBe(true);});
 it('all score parts are normalized and no selected mood means zero mood',()=>{for(const r of recommend({items,weights:{thriller:1000,comedy:-10},excludedIds:new Set(),likedIds:new Set(),avoidedGenres:[]})){for(const p of Object.values(r.parts)){expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThanOrEqual(1);}expect(r.parts.mood).toBe(0);}});
 it('recent signal uses ten per action and half strength across media',()=>{const catalog=Array.from({length:12},(_,k)=>mk(`${k}`,{genres:['science fiction']}));const swipes=catalog.map((i,k)=>({item_id:i.id,action:'like',created_at:String(k).padStart(2,'0')}));expect(recentWeights(catalog,swipes,'film')['science fiction']).toBe(30);expect(recentWeights(catalog,swipes,'book')['science fiction']).toBe(15);});
 it('never places four consecutive first genres',()=>{const catalog=Array.from({length:10},(_,k)=>mk(`${k}`,{genres:['drama']})).concat(mk('comedy',{genres:['comedy']}));const r=recommend({items:catalog,weights:{drama:5},excludedIds:new Set(),likedIds:new Set(),avoidedGenres:[]});expect(r.slice(0,4).filter(r=>r.item.genres[0]==='drama')).toHaveLength(3);});
 it('names the latest liked overlapping metadata, not a hardcoded pair',()=>{const r=recommend({items,weights:{thriller:3,mysterious:3},swipes:[{item_id:'memento',action:'like',created_at:'2026-10-17'}],excludedIds:new Set(['memento']),likedIds:new Set(['memento']),avoidedGenres:[]});expect(r[0]?.reason).toMatch(/Because you liked memento/);expect(r[0]?.reasonData.tags).toContain('thriller');});
 it('central values match requested starting rules',()=>{expect(REC.DECAY).toBe(.97);expect(REC.SHORT_BLEND).toBe(.5);expect(REC.TAG_CAP).toBe(.25);expect(REC.RECENT_LIKES).toBe(5);});
});
