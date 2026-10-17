import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
import {moodsFor,normalizeTitle,validIsbn} from './import-rules';
type Item=Database['public']['Tables']['items']['Insert'];
let lastRequest=0;
export async function api(url:string,work=false,headers:Record<string,string>={}){
 for(let attempt=0;attempt<=3;attempt++){
  const wait=Math.max(0,(work?200:100)-(Date.now()-lastRequest));if(wait)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
  const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Philomathia/1.0 (hackathon project)',...headers},signal:AbortSignal.timeout(20000)});
  if(res.ok)return res.json();
  if((res.status===429||res.status>=500)&&attempt<3){await new Promise(r=>setTimeout(r,Math.min(3000,Number(res.headers.get('Retry-After')??0)*1000||300*2**attempt)));continue;}
  if(res.status===401||res.status===403)throw new Error('Provider rejected the saved key');
  throw new Error(`Provider returned ${res.status}`);
 }throw new Error('Provider unavailable');
}
export const tmdbUrl=(path:string,key:string,params:Record<string,string>={})=>{const u=new URL('https://api.themoviedb.org/3'+path);u.searchParams.set('api_key',key);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);return u.href;};
export async function existingByTmdbIds(db:SupabaseClient<Database>,ids:number[]){
 const map=new Map<number,string>();for(let n=0;n<ids.length;n+=100){const r=await db.from('items').select('id,tmdb_id').in('tmdb_id',ids.slice(n,n+100));if(r.error)throw r.error;for(const i of r.data??[])if(i.tmdb_id!=null)map.set(i.tmdb_id,i.id);}return map;
}
export function filmItem(d:any,geo:boolean):Item|null{
 const year=Number(String(d.release_date??'').slice(0,4));
 if(!d.title||!year)return null;
 const genres=(d.genres??[]).map((x:any)=>x.name.toLowerCase());const keywords=(d.keywords?.keywords??[]).slice(0,8).map((x:any)=>x.name.toLowerCase());const ka=d.translations?.translations?.find((x:any)=>x.iso_639_1==='ka')?.data;
 return {media_type:'film',tmdb_id:d.id,title_en:d.title,title_ka:ka?.title?.trim()||null,description_ka:ka?.overview?.trim()||null,original_title:d.original_title,creator:d.credits?.crew?.find((x:any)=>x.job==='Director')?.name??'',year,runtime_minutes:d.runtime||null,genres,mood_tags:moodsFor([...genres,...keywords]),keywords,is_georgian:geo,description_en:d.overview??'',trailer_key:d.videos?.results?.find((x:any)=>x.site==='YouTube'&&x.type==='Trailer'&&x.official)?.key??null,image_source:d.poster_path?'tmdb':null,image_ref:d.poster_path??null,popularity:d.vote_count??0,source:'tmdb'};
}
export async function upsertItems(db:SupabaseClient<Database>,items:Item[]){
 const all:Database['public']['Tables']['items']['Row'][]=[];for(let n=0;;n+=1000){const r=await db.from('items').select('*').range(n,n+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}
 const identity=(i:{title_en?:string;year?:number|null;creator?:string})=>normalizeTitle(i.title_en??'')+'|'+i.year+'|'+normalizeTitle(i.creator??'');
 let imported=0,updated=0,skipped=0;const failed:{label:string;reason:string}[]=[];
 for(const item of items){
  try{
   const existing=all.find(i=>(item.tmdb_id&&i.tmdb_id===item.tmdb_id)||(item.openlibrary_key&&i.openlibrary_key===item.openlibrary_key)||(item.wikidata_id&&i.wikidata_id===item.wikidata_id)||(i.media_type===item.media_type&&identity(i)===identity(item)));
   if(existing){const patch:Record<string,unknown>={};for(const [k,v]of Object.entries(item)){const old=(existing as any)[k];if(v!=null&&v!==''&&((old==null||old===''||Array.isArray(old)&&!old.length)||k==='popularity'&&Number(v)>Number(old)))patch[k]=v;}if(item.is_georgian)patch['is_georgian']=true;
    if(Object.keys(patch).length){const r=await db.from('items').update(patch as Database['public']['Tables']['items']['Update']).eq('id',existing.id);if(r.error)throw r.error;Object.assign(existing,patch);updated++;}else skipped++;
   }else{const r=await db.from('items').insert(item).select().single();if(r.error){if(r.error.code==='23505')skipped++;else throw r.error;}else{all.push(r.data);imported++;}}
  }catch(e){failed.push({label:item.title_en,reason:e instanceof Error?e.message:'Import failed'});}
 }
 return {imported,updated,skipped,failed};
}
export async function bookItemFromOpenLibrary(raw:any,googleKey?:string):Promise<Item|null>{
 if(!raw.title||!raw.author_name?.[0]||!raw.first_publish_year)return null;
 let description='';try{const work=await api('https://openlibrary.org'+raw.key+'.json',true);description=typeof work.description==='string'?work.description:work.description?.value??'';}catch{ /* description optional */ }
 let imageSource=raw.cover_i?'openlibrary':null,imageRef=raw.cover_i?String(raw.cover_i):null;
 if(googleKey&&(!description||!imageRef)){try{const g=await api('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent('intitle:'+raw.title+' inauthor:'+raw.author_name[0])+'&key='+encodeURIComponent(googleKey));const b=g.items?.[0]?.volumeInfo;if(b){description=description||b.description||'';if(!imageRef&&b.imageLinks?.thumbnail){imageSource='googlebooks';imageRef=b.imageLinks.thumbnail.replace(/^http:/,'https:');}}}catch{}}
 const subjects=(raw.subject??[]).map((s:string)=>s.toLowerCase());const genres=['fiction','classic literature','science fiction','fantasy','mystery','crime','psychological fiction','magic realism','philosophy','psychology','history','biography','poetry','political science','existentialism','absurdist fiction','historical fiction','short stories','drama','essays'].filter(s=>subjects.some((v:string)=>v.includes(s))).slice(0,4);if(!genres.length)genres.push('fiction');
 return {media_type:'book',openlibrary_key:raw.key,title_en:raw.title,creator:raw.author_name.join(', '),year:raw.first_publish_year,genres,keywords:subjects.slice(0,8),mood_tags:moodsFor([...genres,...subjects]),page_count:raw.number_of_pages_median??null,isbn:(raw.isbn??[]).map(validIsbn).find(Boolean)??null,is_georgian:false,description_en:description,image_source:imageSource,image_ref:imageRef,popularity:raw.edition_count??0,source:'openlibrary'};
}
