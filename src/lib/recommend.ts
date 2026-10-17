import type { Database } from '@/integrations/supabase/types';
import { REC, COLD_GEORGIAN_EVERY } from './config';
export type Item = Database['public']['Tables']['items']['Row'];
export const creatorTag = (i: Item) => `creator:${i.creator}`;
export const featuresOf = (i: Item) => [...new Set([...i.genres,...i.mood_tags,...i.keywords].map(t=>t.toLowerCase()))];
export const allTagsOf = (i: Item) => [...featuresOf(i),creatorTag(i)];
export type History = {item_id:string; action:string; created_at:string};
export type RecInput = {items:Item[];historyItems?:Item[];weights:Record<string,number>;excludedIds:Set<string>;likedIds:Set<string>;avoidedGenres:string[];swipes?:History[]|undefined;mediaType?:'film'|'book'|'either'|undefined;georgianOnly?:boolean|undefined;moods?:string[]|undefined;keywords?:string[]|undefined;minMinutes?:number|undefined;maxMinutes?:number|undefined;minPages?:number|undefined;maxPages?:number|undefined;tagFilter?:string|undefined;position?:number|undefined;previousGenres?:string[]|undefined};
export type Rec = {item:Item;score:number;reason:string;matched:string[];exploratory:boolean;parts:{tag:number;creator:number;mood:number;novelty:number;overlap:number};reasonData:{kind:'starter'|'explore'|'match'|'new';title?:string|undefined;titleKa?:string|null|undefined;tags:string[];creator?:string|undefined;moods:string[];keywords:string[]}};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
function hardFilter(i:Item,x:RecInput){
 if(x.excludedIds.has(i.id)|| (x.mediaType&&x.mediaType!=='either'&&i.media_type!==x.mediaType)|| (x.georgianOnly&&!i.is_georgian))return false;
 if(i.genres.some(g=>x.avoidedGenres.some(a=>a.toLowerCase()===g.toLowerCase())))return false;
 if(i.media_type==='film')return (x.maxMinutes==null||(i.runtime_minutes!=null&&i.runtime_minutes<=x.maxMinutes))&&(x.minMinutes==null||(i.runtime_minutes!=null&&i.runtime_minutes>=x.minMinutes));
 return (x.maxPages==null||(i.page_count!=null&&i.page_count<=x.maxPages))&&(x.minPages==null||(i.page_count!=null&&i.page_count>=x.minPages));
}
export const jaccard=(a:string[],b:string[])=>{const A=new Set(a),B=new Set(b);const union=new Set([...A,...B]);return union.size?[...A].filter(t=>B.has(t)).length/union.size:0;};
export function recentWeights(items:Item[],swipes:History[],media:string){
 const out:Record<string,number>={}; const byId=new Map(items.map(i=>[i.id,i]));
 for(const action of ['like','pass'])for(const s of [...swipes].sort((a,b)=>b.created_at.localeCompare(a.created_at)).filter(s=>s.action===action).slice(0,REC.RECENT_PER_ACTION)){
  const i=byId.get(s.item_id);if(!i)continue;const d=(action==='like'?REC.LIKE_DELTA:REC.PASS_DELTA)*(i.media_type===media?1:REC.CROSS_MEDIA);
  for(const t of allTagsOf(i))out[t]=(out[t]??0)+d;
 }return out;
}
function capped(weights:Record<string,number>){const total=Object.values(weights).filter(w=>w>0).reduce((a,b)=>a+b,0);return Object.fromEntries(Object.entries(weights).map(([t,w])=>[t,w>0?Math.min(w,total*REC.TAG_CAP):w]));}
function normalize(weights:Record<string,number>,tags:string[]){const max=Math.max(1,...Object.values(weights).map(Math.abs));return tags.length?clamp(.5+tags.reduce((s,t)=>s+(weights[t]??0),0)/(2*max*tags.length)):.5;}
export function buildReason(matched:string[],creator:string|null,moodHits:string[],kwHits:string[]){return [matched.length?`Matches your interest in ${matched.slice(0,3).join(', ')}`:'',creator?`matches ${creator}`:'',moodHits.length?`fits the mood: ${moodHits.join(', ')}`:'',kwHits.length?`mentions ${kwHits.join(', ')}`:''].filter(Boolean).join('; ');}
export function recommend(x:RecInput,limit=REC.QUEUE_SIZE):Rec[]{
 const context=x.historyItems??x.items;
 const swipes=[...(x.swipes??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const recent=swipes.filter(s=>s.action==='like').slice(0,REC.RECENT_LIKES).map(s=>context.find(i=>i.id===s.item_id)).filter((i):i is Item=>!!i);
 const liked=recent.length?recent:context.filter(i=>x.likedIds.has(i.id));
 const cold=Object.keys(x.weights).length===0&&!swipes.length;
 const top=new Set(Object.entries(x.weights).filter(([t,w])=>w>0&&!t.startsWith('creator:')).sort((a,b)=>b[1]-a[1]).slice(0,REC.TOP_TAGS_FOR_EXPLORE).map(([t])=>t));
 const raw=x.items.filter(i=>hardFilter(i,x)).map(item=>{
  const short=capped(recentWeights(context,swipes,item.media_type));
  const long=capped(Object.fromEntries(Object.entries(x.weights).map(([t,w])=>{const sources=context.filter(i=>allTagsOf(i).includes(t)&&x.likedIds.has(i.id));return [t,w*(sources.length?(sources.filter(i=>i.media_type===item.media_type).length+REC.CROSS_MEDIA*sources.filter(i=>i.media_type!==item.media_type).length)/sources.length:1)];})));
  const feats=featuresOf(item);const blend=Object.fromEntries([...new Set([...Object.keys(long),...Object.keys(short)])].map(t=>[t,(long[t]??0)*(1-REC.SHORT_BLEND)+(short[t]??0)*REC.SHORT_BLEND]));
  const matched=feats.filter(t=>(blend[t]??0)>0).sort((a,b)=>(blend[b]??0)-(blend[a]??0));
  const moods=(x.moods??[]).filter(t=>item.mood_tags.includes(t));const hay=[item.title_en,item.description_en,...feats].join(' ').toLowerCase();
  const kws=(x.keywords??[]).filter(t=>hay.includes(t.toLowerCase()));
  const affinity=normalize(blend,feats); const preference=x.keywords?.length||x.tagFilter?((kws.length+(x.tagFilter&&allTagsOf(item).includes(x.tagFilter)?1:0))/((x.keywords?.length??0)+(x.tagFilter?1:0))):null;
  const parts={tag:preference==null?affinity:(affinity+preference)/2,creator:normalize(blend,[creatorTag(item)]),mood:x.moods?.length?moods.length/x.moods.length:0,novelty:feats.length?feats.filter(t=>!(t in blend)).length/feats.length:1,overlap:Math.max(0,...recent.map(i=>jaccard(feats,featuresOf(i))))};
  const divisor=x.moods?.length?1:1-REC.W_MOOD;
  const score=(REC.W_TAG*parts.tag+REC.W_CREATOR*parts.creator+REC.W_MOOD*parts.mood+REC.W_NOVELTY*parts.novelty)/divisor+REC.OVERLAP_BONUS*parts.overlap;
  const overlapTitle=liked.find(i=>featuresOf(i).some(t=>matched.includes(t)));const overlapTags=overlapTitle?matched.filter(t=>featuresOf(overlapTitle).includes(t)):matched;
  const exploratory=liked.some(i=>i.genres.some(g=>item.genres.includes(g)))&&!feats.some(t=>top.has(t));
  const creator=(blend[creatorTag(item)]??0)>0?item.creator:undefined;
  const kind=cold&&!moods.length&&!kws.length?'starter':exploratory?'explore':matched.length||creator||moods.length||kws.length?'match':'new';
  const reasonData:Rec['reasonData']={kind,tags:overlapTags.slice(0,3),moods,keywords:kws,...(overlapTitle?{title:overlapTitle.title_en,titleKa:overlapTitle.title_ka}:{}),...(creator?{creator}:{})};
  const reason=kind==='starter'?'A varied starter pick':kind==='explore'?'An exploratory pick connected to your recent interests':overlapTitle?`Because you liked ${overlapTitle.title_en}: ${overlapTags.slice(0,3).join(', ')}`:buildReason(matched,creator??null,moods,kws)||'New territory for you, with no strong match yet';
  return {item,score,parts,matched,exploratory,reason,reasonData};
 }).sort((a,b)=>b.score-a.score||a.item.title_en.localeCompare(b.item.title_en));
 const out:Rec[]=[];const genres=[...(x.previousGenres??[])];
 while(out.length<limit&&raw.length){
  const run=genres.slice(-REC.MAX_GENRE_RUN);const last=genres.at(-1);const banned=run.length===REC.MAX_GENRE_RUN&&run.every(g=>g===last)?last:undefined;
  const eligible=raw.filter(r=>r.item.genres[0]!==banned);if(!eligible.length)break;
  const exploratorySlot=((x.position??swipes.length)+out.length+1)%REC.EXPLORE_EVERY===0;
  const unusedGenre=eligible.find(r=>!out.some(o=>o.item.genres[0]===r.item.genres[0]));
  const coldStart=!swipes.length&&!x.likedIds.size;
  const country=coldStart&&!x.georgianOnly?eligible.filter(r=>r.item.is_georgian===(((x.position??0)+out.length+1)%COLD_GEORGIAN_EVERY===0)):eligible;
  const pool=country.length?country:eligible;
  const varied=pool.find(r=>!out.some(o=>o.item.genres[0]===r.item.genres[0]))??pool[0];
  const pick=coldStart?varied:exploratorySlot?eligible.find(r=>r.exploratory)??eligible[0]:eligible.find(r=>!r.exploratory)??eligible[0];if(!pick)break;
  out.push(pick);genres.push(pick.item.genres[0]??'');raw.splice(raw.indexOf(pick),1);
 }return out;
}
export function similar(item:Item,items:Item[],n=3){return items.filter(i=>i.id!==item.id).sort((a,b)=>jaccard(featuresOf(item),featuresOf(b))-jaccard(featuresOf(item),featuresOf(a))).slice(0,n);}
