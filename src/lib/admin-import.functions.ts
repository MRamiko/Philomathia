import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {normalizeTitle,validIsbn,moodsFor} from './import-rules';
import type {Item} from './recommend';
type Ctx={supabase:any;userId:string};
async function requireAdmin(context:Ctx){
 const role=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(role.error||!role.data)throw new Error('Forbidden');
}
export const checkKeys=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 await requireAdmin(context as unknown as Ctx);
 const tmdbKey=process.env['TMDB_API_KEY'];const googleKey=process.env['GOOGLE_BOOKS_API_KEY'];
 const {api,tmdbUrl}=await import('./admin-import.server');
 let tmdb:'working'|'rejected'|'missing'='missing';
 if(tmdbKey){try{await api(tmdbUrl('/configuration',tmdbKey));tmdb='working';}catch{tmdb='rejected';}}
 let google:'working'|'rejected'|'missing'='missing';
 if(googleKey){try{await api('https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1&key='+encodeURIComponent(googleKey));google='working';}catch{google='rejected';}}
 return {tmdb,google};
});
export const filmSearch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{query?:string;year?:number;mode:'search'|'georgian'|'top';page?:number})=>d).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const key=process.env['TMDB_API_KEY'];if(!key)throw new Error('TMDB key required');
 const {api,tmdbUrl,existingByTmdbIds}=await import('./admin-import.server');
 const page=data.page??1;let result;
 if(data.mode==='search'){if(!data.query?.trim())throw new Error('Enter a title');result=await api(tmdbUrl('/search/movie',key,{query:data.query.trim(),include_adult:'false',page:String(page),...(data.year?{year:String(data.year)}:{})}));}
 else if(data.mode==='georgian')result=await api(tmdbUrl('/discover/movie',key,{with_origin_country:'GE',include_adult:'false',page:String(page)}));
 else result=await api(tmdbUrl('/discover/movie',key,{'vote_count.gte':'1000','vote_average.gte':'6.5',include_adult:'false',sort_by:'vote_count.desc',page:String(page)}));
 const rows=(result.results??[]).map((r:any)=>({tmdb_id:r.id,title:r.title??r.original_title??'',year:Number(String(r.release_date??'').slice(0,4))||null,language:r.original_language??'',rating:r.vote_average??0,poster_path:r.poster_path??null}));
 const existing=await existingByTmdbIds(context.supabase,rows.map((r:any)=>r.tmdb_id));
 return {rows:rows.map((r:any)=>({...r,existing:existing.get(r.tmdb_id)??null})),page,totalPages:Math.min(result.total_pages??1,500)};
});
export const filmCommit=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{ids:number[]})=>{if(!Array.isArray(d.ids)||!d.ids.length||d.ids.length>40)throw new Error('Pick 1 to 40 films');return d;}).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const key=process.env['TMDB_API_KEY'];if(!key)throw new Error('TMDB key required');
 const {api,tmdbUrl,filmItem,upsertItems}=await import('./admin-import.server');
 const items=[];const failed:{label:string;reason:string}[]=[];
 for(const id of data.ids){
  try{const d=await api(tmdbUrl('/movie/'+id,key,{append_to_response:'credits,keywords,videos,translations',language:'en-US'}));
   const geo=(d.production_countries??[]).some((c:any)=>c.iso_3166_1==='GE')||d.original_language==='ka';
   const item=filmItem(d,geo);if(item)items.push(item);else failed.push({label:d.title??String(id),reason:'missing required field'});
  }catch(e){failed.push({label:String(id),reason:e instanceof Error?e.message:'Import failed'});}
 }
 const result=await upsertItems(context.supabase,items);
 return {...result,failed:[...result.failed,...failed]};
});
export const bookSearch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{query:string;provider:'openlibrary'|'google';georgian?:boolean;page?:number})=>{if(!d.query?.trim()&&!d.georgian)throw new Error('Enter a title');return d;}).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const {api}=await import('./admin-import.server');
 const page=data.page??1;let rows:any[]=[];let totalPages=1;
 if(data.provider==='openlibrary'){
  const u=new URL('https://openlibrary.org/search.json');u.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,isbn,edition_count,number_of_pages_median,language');u.searchParams.set('limit','20');u.searchParams.set('page',String(page));
  if(data.georgian)u.searchParams.set('language','geo');if(data.query?.trim())u.searchParams.set('q',data.query.trim());
  const result=await api(u.href);totalPages=Math.min(Math.ceil((result.numFound??0)/20),100);
  rows=(result.docs??[]).map((r:any)=>({key:r.key,title:r.title??'',author:(r.author_name??[]).join(', '),year:r.first_publish_year??null,pages:r.number_of_pages_median??null,cover:r.cover_i?`https://covers.openlibrary.org/b/id/${r.cover_i}-M.jpg`:null}));
 }else{
  const googleKey=process.env['GOOGLE_BOOKS_API_KEY'];if(!googleKey)throw new Error('Google Books key required');
  const q=(data.georgian?'georgian+':'')+(data.query?.trim()||'literature');
  const result=await api('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent(q)+'&maxResults=20&startIndex='+(page-1)*20+'&key='+encodeURIComponent(googleKey));
  totalPages=Math.min(Math.ceil((result.totalItems??0)/20),50);
  rows=(result.items??[]).map((r:any)=>{const v=r.volumeInfo??{};return {key:'gb:'+r.id,title:v.title??'',author:(v.authors??[]).join(', '),year:Number(String(v.publishedDate??'').slice(0,4))||null,pages:v.pageCount??null,cover:v.imageLinks?.thumbnail?.replace(/^http:/,'https:')??null};});
 }
 const found=new Set<string>();for(let n=0;;n+=1000){const r=await context.supabase.from('items').select('title_en,year,creator').eq('media_type','book').range(n,n+999);if(r.error)throw r.error;for(const i of r.data??[])found.add(normalizeTitle(i.title_en)+'|'+i.year+'|'+normalizeTitle(i.creator));if(r.data.length<1000)break;}
 return {rows:rows.map(r=>({...r,exists:found.has(normalizeTitle(r.title)+'|'+r.year+'|'+normalizeTitle(r.author))})),page,totalPages};
});
export const bookCommit=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{rows:{key:string;title:string;author:string;year:number|null;pages:number|null;cover:string|null}[]})=>{if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>40)throw new Error('Pick 1 to 40 books');return d;}).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const {api,bookItemFromOpenLibrary,upsertItems}=await import('./admin-import.server');
 const googleKey=process.env['GOOGLE_BOOKS_API_KEY'];
 const items=[];const failed:{label:string;reason:string}[]=[];
 for(const row of data.rows){
  try{
   if(row.key.startsWith('gb:')){
    const googleKey2=googleKey;if(!googleKey2)throw new Error('Google Books key required');
    const g=await api('https://www.googleapis.com/books/v1/volumes/'+row.key.slice(3)+'?key='+encodeURIComponent(googleKey2));const v=g.volumeInfo??{};
    const isbn=(v.industryIdentifiers??[]).map((x:any)=>validIsbn(x.identifier??'')).find(Boolean)??null;
    const subjects=(v.categories??[]).map((s:string)=>s.toLowerCase());
    items.push({media_type:'book',title_en:v.title??row.title,creator:(v.authors??[row.author]).join(', '),year:Number(String(v.publishedDate??'').slice(0,4))||row.year,genres:subjects.length?subjects.slice(0,4):['fiction'],keywords:subjects.slice(0,8),mood_tags:moodsFor(subjects),page_count:v.pageCount??row.pages,isbn,description_en:v.description??'',image_source:v.imageLinks?.thumbnail?'googlebooks':null,image_ref:v.imageLinks?.thumbnail?.replace(/^http:/,'https:')??null,popularity:v.ratingsCount??0,source:'googlebooks'});
   }else{
    const r=await api('https://openlibrary.org/search.json?fields=key,title,author_name,first_publish_year,cover_i,isbn,edition_count,subject,number_of_pages_median&q='+encodeURIComponent('key:'+row.key));
    const doc=r.docs?.[0]??{key:row.key,title:row.title,author_name:row.author.split(', '),first_publish_year:row.year,number_of_pages_median:row.pages};
    const item=await bookItemFromOpenLibrary(doc,googleKey);if(item)items.push(item);else failed.push({label:row.title,reason:'missing required field'});
   }
  }catch(e){failed.push({label:row.title,reason:e instanceof Error?e.message:'Import failed'});}
 }
 const result=await upsertItems(context.supabase,items);
 return {...result,failed:[...result.failed,...failed]};
});
const WIKIDATA_QUERIES:Record<string,string>={
 films:'SELECT ?work ?workLabel ?workEn ?date ?creatorLabel WHERE { ?work wdt:P31 wd:Q11424 ; wdt:P495 wd:Q230 . OPTIONAL { ?work wdt:P577 ?date } OPTIONAL { ?work wdt:P57 ?creator } OPTIONAL { ?work rdfs:label ?workEn FILTER(LANG(?workEn)="en") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ka,en". } } LIMIT 200',
 books:'SELECT ?work ?workLabel ?workEn ?date ?creatorLabel WHERE { ?work wdt:P50 ?creator . ?creator wdt:P27 wd:Q230 . OPTIONAL { ?work wdt:P577 ?date } OPTIONAL { ?work rdfs:label ?workEn FILTER(LANG(?workEn)="en") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ka,en". } } LIMIT 200',
};
export const wikidataSearch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{kind:'films'|'books'})=>d).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const {api}=await import('./admin-import.server');
 const result=await api('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(WIKIDATA_QUERIES[data.kind]));
 const seen=new Set<string>();const rows=[];
 for(const b of result.results?.bindings??[]){
  const wikidata=b.work.value.split('/').pop();if(seen.has(wikidata))continue;seen.add(wikidata);
  const ka=/[ა-ჰ]/.test(b.workLabel?.value??'')?b.workLabel.value:null;
  rows.push({wikidata_id:wikidata,title_en:b.workEn?.value??b.workLabel?.value??'',title_ka:ka,year:b.date?.value?Number(b.date.value.slice(0,4)):null,creator:b.creatorLabel?.value??''});
 }
 const r=await context.supabase.from('items').select('id,title_en,title_ka,year,creator,wikidata_id').eq('media_type',data.kind==='films'?'film':'book').range(0,999);if(r.error)throw r.error;
 const byWikidata=new Map((r.data??[]).filter(i=>i.wikidata_id).map(i=>[i.wikidata_id,i]));
 const byIdentity=new Map((r.data??[]).map(i=>[normalizeTitle(i.title_en)+'|'+i.year+'|'+normalizeTitle(i.creator),i]));
 return {rows:rows.map(row=>{const match=byWikidata.get(row.wikidata_id)??byIdentity.get(normalizeTitle(row.title_en)+'|'+row.year+'|'+normalizeTitle(row.creator));return {...row,existing:match?{id:match.id,willUpdate:!match.wikidata_id||!match.title_ka}:null};})};
});
export const wikidataCommit=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{kind:'films'|'books';rows:{wikidata_id:string;title_en:string;title_ka:string|null;year:number|null;creator:string}[]})=>{if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>200)throw new Error('Pick 1 to 200 works');return d;}).handler(async({context,data})=>{
 await requireAdmin(context as unknown as Ctx);
 const {upsertItems}=await import('./admin-import.server');
 const items=data.rows.filter(r=>r.title_en&&!/^Q\d+$/.test(r.title_en)).map(r=>({media_type:data.kind==='films'?'film':'book',title_en:r.title_en,title_ka:r.title_ka,creator:r.creator,year:r.year,wikidata_id:r.wikidata_id,is_georgian:true,genres:data.kind==='films'?['drama']:['fiction'],keywords:['Georgian literature'],mood_tags:moodsFor(['fiction']),description_en:'',source:'wikidata'}));
 return upsertItems(context.supabase,items as any);
});
export type {Item};
