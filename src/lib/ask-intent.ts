import {FACETS,validFacet,facetLabel} from './facets';
export type Intent={media_type:'film'|'book'|'either';genres:string[];keywords:string[];traits:{facet:string;value:string}[];similar_to:string[];creators:string[];min_year:number|null;max_year:number|null;max_minutes:number|null;max_pages:number|null;georgian_only:boolean;excluded_genres:string[];query:string};
export function parseIntent(text:string):Intent{
 const query=text.trim();const t=query.toLowerCase();const film=/film|movie|watch/.test(t);const book=/book|novel|read/.test(t);
 const intent:Intent={media_type:film?'film':book?'book':'either',genres:[],keywords:[],traits:[],similar_to:[],creators:[],min_year:null,max_year:null,max_minutes:null,max_pages:null,georgian_only:/georgian|georgia/.test(t),excluded_genres:[],query};
 const genres=['drama','thriller','comedy','romance','science fiction','fantasy','war','poetry','horror','animation','mystery','crime','adventure','documentary'];
 for(const genre of genres){const synonym=genre==='romance'?'romantic':genre;if(t.includes(genre)||t.includes(synonym)){if(new RegExp(`(?:no|not|without|avoid) ${genre}`).test(t))intent.excluded_genres.push(genre);else intent.genres.push(genre);}}
 const synonyms:Record<string,[string,string]>={'black and white':['visual','black_and_white'],'black-and-white':['visual','black_and_white'],monochrome:['visual','black_and_white'],'slow-burn':['pace','slow_burn'],'slow burn':['pace','slow_burn'],'fast-paced':['pace','brisk'],'mind-bending':['narrative','puzzle_twist'],bleak:['tone','bleak'],warm:['tone','warm'],cozy:['tone','warm'],cosy:['tone','warm'],melancholic:['tone','melancholic'],surreal:['tone','surreal'],short:['length','short'],long:['length','long']};
 for(const [word,[facet,value]] of Object.entries(synonyms))if(t.includes(word)&&!intent.traits.some(v=>v.facet===facet&&v.value===value))intent.traits.push({facet,value});
 for(const [facet,values] of Object.entries(FACETS))for(const value of values)if(t.includes(value.replaceAll('_',' '))&&!intent.traits.some(v=>v.facet===facet&&v.value===value))intent.traits.push({facet,value});
 const minutes=t.match(/(?:under|less than|up to|maximum|max)?\s*(\d{1,3})\s*(?:min|minute)/);if(minutes)intent.max_minutes=Number(minutes[1])-(t.includes('under ')?1:0);
 const pages=t.match(/(?:under|less than|up to)?\s*(\d{1,4})\s*pages/);if(pages)intent.max_pages=Number(pages[1])-(t.includes('under ')?1:0);
 if(t.includes('short')){if(intent.media_type==='book')intent.max_pages=199;else if(intent.media_type==='film')intent.max_minutes=89;}
 const similar=query.match(/(?:something\s+)?like\s+(.+?)(?:[,.!?]|$)/i);if(similar?.[1])intent.similar_to=[similar[1].trim()];
 const creator=query.match(/(?:by|directed by|written by)\s+(.+?)(?:[,.!?]|$)/i);if(creator?.[1])intent.creators=[creator[1].trim()];
 return intent;
}
export function validateIntent(raw:unknown,text:string):Intent|null{
 if(!raw||typeof raw!=='object')return null;const r=raw as Record<string,unknown>;const fallback=parseIntent(text);const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,6):[];const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
 const normalizeGenre=(genre:string)=>genre.toLowerCase()==='romantic comedy'?['romance','comedy']:genre.toLowerCase()==='sci-fi'?['science fiction']:[genre.toLowerCase()];
 const aiTraits=Array.isArray(r['traits'])?r['traits'].filter((v):v is {facet:string;value:string}=>!!v&&typeof v==='object'&&validFacet(v.facet,v.value)):[];
 const traits=[...fallback.traits,...aiTraits].filter((v,n,a)=>a.findIndex(x=>x.facet===v.facet&&x.value===v.value)===n).slice(0,12);
 const media=fallback.media_type!=='either'?fallback.media_type:r['media_type']==='film'||r['media_type']==='book'?r['media_type']:'either';
 return {...fallback,media_type:media,genres:[...new Set([...fallback.genres,...strings(r['genres']).flatMap(normalizeGenre)])],keywords:strings(r['keywords']),traits,similar_to:[...new Set([...fallback.similar_to,...strings(r['similar_to'])])],creators:strings(r['creators']),min_year:number(r['min_year']),max_year:number(r['max_year']),max_minutes:fallback.max_minutes??number(r['max_minutes']),max_pages:fallback.max_pages??number(r['max_pages']),georgian_only:fallback.georgian_only||r['georgian_only']===true,excluded_genres:[...new Set([...fallback.excluded_genres,...strings(r['excluded_genres'])])]};
}