import { translate, type Locale } from './strings';
import type { Rec } from './recommend';
export function localizedReason(r:Rec,lang:string){
 const t=(k:string,v?:Record<string,string|number>)=>translate(lang,k,v);const d=r.reasonData;
 if(d.kind==='starter')return t('A varied starter pick');if(d.kind==='explore')return t('An exploratory pick connected to your recent interests');
 const tags=d.tags.map(k=>t(k)).join(', ');const parts:string[]=[];
 if(d.title&&tags)parts.push(t('Because you liked {title}: {tags}',{title:d.title,tags}));else if(tags)parts.push(t('Matches your interest in {tags}',{tags}));
 if(d.creator)parts.push(t('Matches creator {creator}',{creator:d.creator}));if(d.moods.length)parts.push(t('Fits the mood: {tags}',{tags:d.moods.map(k=>t(k)).join(', ')}));if(d.keywords.length)parts.push(t('Mentions {tags}',{tags:d.keywords.map(k=>t(k)).join(', ')}));
 return parts.join('; ')||t('New territory for you, with no strong match yet');
}
