import type { Item } from './recommend';
export const FACETS = {
 visual:['black_and_white','desaturated','vivid_color','stylized_palette','naturalistic'],
 cinematography:['static_long_takes','handheld_kinetic','painterly_composed','conventional'],
 pace:['slow_burn','measured','brisk','frenetic'],
 narrative:['linear','nonlinear','puzzle_twist','character_study','ensemble','episodic','fragmentary'],
 tone:['bleak','melancholic','tender','warm','wry_ironic','playful','tense','earnest','surreal','nostalgic'],
 themes:['memory','identity','power_and_politics','family','exile_and_belonging','war_and_conflict','faith_and_morality','class_and_society','love_and_loss','mortality','nature_and_rural_life','art_and_creativity','crime_and_guilt','coming_of_age','technology_and_future'],
 era:['early_or_pre_1945','classic_1945_1969','new_wave_1970s','1980s_90s','2000s_2010s','contemporary'],
 origin:['georgian','soviet_or_post_soviet','european','american','asian','latin_american','middle_eastern_or_african','other'],
 complexity:['accessible','engaging','demanding','experimental'], ending:['resolved','ambiguous','tragic','hopeful'],
 length:['short','standard','long'], prose:['sparse','lyrical','dense_philosophical','conversational','experimental_form'],
 form:['novel','short_stories','poetry','essays_nonfiction','play','verse_epic'], perspective:['first_person','multiple_pov','epistolary','third_person'],
} as const;
export const TASTE_CONFIG = { halfLife:40, earlySwipes:15, earlyMultiplier:1.5, queue:8, locked:2, refreshEvery:5, probeEvery:5, georgianEvery:{less:12,balanced:6,more:3} } as const;
export type Facet = { facet:string; value:string; confidence:number; source:'rule'|'keyword'|'ai'|'admin' };
export function facetLabel(value:string) { return ({black_and_white:'Black and white',slow_burn:'Slow-burn',vivid_color:'Vivid color',early_or_pre_1945:'Before 1945',classic_1945_1969:'Classic era',new_wave_1970s:'1970s new wave','1980s_90s':'1980s and 1990s','2000s_2010s':'2000s and 2010s'} as Record<string,string>)[value] ?? value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase()); }
export function validFacet(facet:string,value:string){const vocabulary=FACETS[facet as keyof typeof FACETS] as readonly string[]|undefined;return !!vocabulary?.includes(value);}
export function ruleFacets(item: Pick<Item,'media_type'|'year'|'runtime_minutes'|'page_count'|'is_georgian'|'genres'|'keywords'|'mood_tags'|'creator'>):Facet[]{
 const out:Facet[]=[];const add=(facet:string,value:string,source:Facet['source']='rule',confidence=1)=>{if(!out.some(v=>v.facet===facet&&v.value===value))out.push({facet,value,source,confidence});};
 if(item.year!=null)add('era',item.year<1945?'early_or_pre_1945':item.year<1970?'classic_1945_1969':item.year<1980?'new_wave_1970s':item.year<2000?'1980s_90s':item.year<2020?'2000s_2010s':'contemporary');
 const length=item.media_type==='film'?item.runtime_minutes:item.page_count;
 if(length!=null)add('length',length<(item.media_type==='film'?90:200)?'short':length>(item.media_type==='film'?150:400)?'long':'standard');
 if(item.is_georgian)add('origin','georgian');
 const words=[...item.keywords,...item.genres].map(v=>v.toLowerCase());
 if(item.media_type==='film'&&words.some(v=>/black[ -]and[ -]white|monochrome/.test(v)))add('visual','black_and_white','keyword');
 for(const genre of item.genres)add('genre',genre.toLowerCase());
 if(item.creator)add('creator',item.creator);
 for(const word of words)for(const value of FACETS.themes){if(word===value.replaceAll('_',' ')||word===value)add('themes',value,'keyword',0.8);}
 for(const mood of item.mood_tags){if((FACETS.tone as readonly string[]).includes(mood))add('tone',mood,'keyword',0.8);if(mood==='slow')add('pace','slow_burn','keyword',0.7);if(mood==='mind-bending')add('narrative','puzzle_twist','keyword',0.7);}
 if(item.media_type==='book')for(const [pattern,value] of [[/short stor/,'short_stories'],[/poetry|poem/,'poetry'],[/essay|nonfiction|non-fiction/,'essays_nonfiction'],[/play|drama/,'play'],[/epic poetry|verse epic/,'verse_epic'],[/novel|fiction/,'novel']] as const){if(words.some(word=>pattern.test(word)))add('form',value,'keyword',0.8);}
 return out;
}
export const ONBOARDING_PAIRS = [
 ['visual','black_and_white','vivid_color'],['pace','slow_burn','brisk'],['narrative','puzzle_twist','linear'],['tone','bleak','warm'],['era','classic_1945_1969','contemporary'],['narrative','ensemble','character_study'],['length','short','long'],['origin','georgian','other'],
] as const;