import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
import {LANGUAGES,SUBJECTS,moodsFor,normalizeTitle,validIsbn} from './import-rules';
type Item=Database['public']['Tables']['items']['Insert'];
type Cursor={page?:number;group?:number;offset?:number;pending?:any[];finished?:boolean};
export async function runImport(db:SupabaseClient<Database>,job:Database['public']['Tables']['import_jobs']['Row'],keys:{tmdb?:string;google?:string}){
 const start=Date.now();let lastRequest=0;let cursor={...job.cursor as Cursor};let imported=job.imported_count,skipped=job.skipped_count;const reasons={...job.skipped_reasons as Record<string,number>};
 const skip=(reason:string)=>{skipped++;reasons[reason]=(reasons[reason]??0)+1;};
 async function api(url:string,work=false){
  for(let attempt=0;attempt<=3;attempt++){
   const wait=Math.max(0,(work?200:100)-(Date.now()-lastRequest));if(wait)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
   const res=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(Math.max(1000,20000-(Date.now()-start)))});
   if(res.ok)return res.json();
   if((res.status===429||res.status>=500)&&attempt<3){await new Promise(r=>setTimeout(r,Math.min(3000,Number(res.headers.get('Retry-After')??0)*1000||300*2**attempt)));continue;}
   throw new Error(`Provider returned ${res.status}`);
  }throw new Error('Provider unavailable');
 }
 const tmdb=(path:string,params:Record<string,string>={})=>{const u=new URL('https://api.themoviedb.org/3'+path);u.searchParams.set('api_key',keys.tmdb??'');for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);return u.href;};
 const page=cursor.page??1,group=cursor.group??0;
 if(!cursor.pending?.length&&!cursor.finished){
  if(['A','B','C'].includes(job.pass_name)){
   if(!keys.tmdb)throw new Error('TMDB key required');
   const params:Record<string,string>={page:String(page),include_adult:'false',sort_by:'vote_count.desc'};
   if(job.pass_name==='A')Object.assign(params,{'vote_count.gte':'1000','vote_average.gte':'6.5'});
   if(job.pass_name==='B')Object.assign(params,{'vote_count.gte':'200','vote_average.gte':'6.5',with_original_language:LANGUAGES[group]??'fr'});
   if(job.pass_name==='C')Object.assign(params,group===0?{with_origin_country:'GE'}:{with_original_language:'ka'});
   const result=await api(tmdb('/discover/movie',params));cursor.pending=result.results??[];
   const max=Math.min(result.total_pages??1,job.pass_name==='A'?50:job.pass_name==='B'?3:500);
   if(page>=max){cursor.page=1;cursor.group=group+1;cursor.finished=job.pass_name==='A'||(job.pass_name==='B'?group+1>=LANGUAGES.length:group+1>=2);}else cursor.page=page+1;
  }else{
   const groups=job.pass_name==='D'?SUBJECTS:['geo','Georgian literature','Georgian fiction','wikidata'];
   if(group>=groups.length)cursor.finished=true;
   else if(job.pass_name==='E'&&group===3){
    const query=`SELECT ?work ?workLabel ?workEn ?date ?authorLabel WHERE { ?work wdt:P50 ?author . ?author wdt:P27 wd:Q230 . OPTIONAL { ?work wdt:P577 ?date } OPTIONAL { ?work rdfs:label ?workEn FILTER(LANG(?workEn)="en") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ka,en". } } ORDER BY ?work LIMIT 200 OFFSET ${cursor.offset??0}`;
    const result=await api('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query));cursor.pending=result.results?.bindings??[];cursor.offset=(cursor.offset??0)+200;cursor.finished=cursor.pending.length<200;
   }else{
    const u=new URL('https://openlibrary.org/search.json');u.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,isbn,edition_count,subject,number_of_pages_median,language');u.searchParams.set('limit','100');u.searchParams.set('page',String(page));u.searchParams.set('sort','editions');if(job.pass_name==='E'&&group===0)u.searchParams.set('language','geo');else u.searchParams.set('subject',groups[group]??'fiction');
    const result=await api(u.href);cursor.pending=result.docs??[];const max=job.pass_name==='D'?5:20;
    if(page>=max||!cursor.pending?.length||page*100>=(result.numFound??0)){cursor.page=1;cursor.group=group+1;cursor.finished=group+1>=groups.length;}else cursor.page=page+1;
   }
  }
 }
 const all:Database['public']['Tables']['items']['Row'][]=[];for(let n=0;;n+=1000){const r=await db.from('items').select('*').range(n,n+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}
 const identity=(i:{title_en?:string;year?:number|null;creator?:string})=>normalizeTitle(i.title_en??'')+'|'+i.year+'|'+normalizeTitle(i.creator??'');
 let processed=0;
 while(cursor.pending?.length&&processed<40&&Date.now()-start<18000){
  const raw=cursor.pending[0];let item:Item|null=null;let reason='missing required field';
  try{
   if(['A','B','C'].includes(job.pass_name)){
    const geo=job.pass_name==='C';const d=await api(tmdb('/movie/'+raw.id,{append_to_response:'credits,keywords,videos,translations',language:'en-US'}));const year=Number(String(d.release_date??'').slice(0,4));
    if(!d.title||!year)reason='missing required field';else if(!geo&&(!d.poster_path||!d.overview))reason=!d.poster_path?'no poster':'missing required field';else{
     const genres=(d.genres??[]).map((x:any)=>x.name.toLowerCase());const keywords=(d.keywords?.keywords??[]).slice(0,8).map((x:any)=>x.name.toLowerCase());const ka=d.translations?.translations?.find((x:any)=>x.iso_639_1==='ka')?.data;
     item={media_type:'film',tmdb_id:d.id,title_en:d.title,title_ka:ka?.title?.trim()||null,description_ka:ka?.overview?.trim()||null,original_title:d.original_title,creator:d.credits?.crew?.find((x:any)=>x.job==='Director')?.name??'',year,runtime_minutes:d.runtime||null,genres,mood_tags:moodsFor([...genres,...keywords]),keywords,is_georgian:geo,description_en:d.overview??'',trailer_key:d.videos?.results?.find((x:any)=>x.site==='YouTube'&&x.type==='Trailer'&&x.official)?.key??null,image_source:d.poster_path?'tmdb':null,image_ref:d.poster_path??null,popularity:d.vote_count??0,source:'tmdb'};
    }
   }else if(raw.work){
    const title=raw.workEn?.value??raw.workLabel?.value;const year=raw.date?.value?Number(raw.date.value.slice(0,4)):null;const wikidata=raw.work.value.split('/').pop();
    if(title&&!/^Q\d+$/.test(title)&&raw.authorLabel?.value)item={media_type:'book',title_en:title,title_ka:/[\u10a0-\u10ff]/.test(raw.workLabel?.value??'')?raw.workLabel.value:null,creator:raw.authorLabel.value,year,wikidata_id:wikidata,is_georgian:true,genres:['fiction'],keywords:['Georgian literature'],mood_tags:moodsFor(['fiction']),description_en:'',source:'wikidata'};
   }else{
    const geo=job.pass_name==='E';if(!raw.title||!raw.author_name?.[0]||!raw.first_publish_year)reason='missing required field';else if(!geo&&(!raw.cover_i||raw.edition_count<15))reason=!raw.cover_i?'no poster':'below threshold';else{
     let description='';try{const work=await api('https://openlibrary.org'+raw.key+'.json',true);description=typeof work.description==='string'?work.description:work.description?.value??'';}catch{ /* Valid metadata survives a missing description. */ }
     let imageSource=raw.cover_i?'openlibrary':null,imageRef=raw.cover_i?String(raw.cover_i):null;
     if(keys.google&&(!description||!imageRef)){try{const g=await api('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent('intitle:'+raw.title+' inauthor:'+raw.author_name[0])+'&key='+encodeURIComponent(keys.google));const b=g.items?.[0]?.volumeInfo;if(b){description=description||b.description||'';if(!imageRef&&b.imageLinks?.thumbnail){imageSource='googlebooks';imageRef=b.imageLinks.thumbnail.replace(/^http:/,'https:');}}}catch{}}
     const subjects=(raw.subject??[]).map((s:string)=>s.toLowerCase());const genres=SUBJECTS.filter(s=>subjects.some((v:string)=>v.includes(s))).slice(0,4);if(!genres.length)genres.push('fiction');
     item={media_type:'book',openlibrary_key:raw.key,title_en:raw.title,creator:raw.author_name.join(', '),year:raw.first_publish_year,genres,keywords:subjects.slice(0,8),mood_tags:moodsFor([...genres,...subjects]),page_count:raw.number_of_pages_median??null,isbn:(raw.isbn??[]).map(validIsbn).find(Boolean)??null,is_georgian:geo,description_en:description,image_source:imageSource,image_ref:imageRef,popularity:raw.edition_count??0,source:'openlibrary'};
    }
   }
   if(item){
    const existing=all.find(i=>(item?.tmdb_id&&i.tmdb_id===item.tmdb_id)||(item?.openlibrary_key&&i.openlibrary_key===item.openlibrary_key)||(item?.wikidata_id&&i.wikidata_id===item.wikidata_id)||(i.media_type===item?.media_type&&identity(i)===identity(item)));
    if(existing){const patch:Record<string,unknown>={};for(const [k,v]of Object.entries(item)){const old=(existing as any)[k];if(v!=null&&v!==''&&((old==null||old===''||Array.isArray(old)&&!old.length)||k==='popularity'&&Number(v)>Number(old)))patch[k]=v;}if(item.is_georgian)patch['is_georgian']=true;if(existing.source==='seed'&&item.source==='openlibrary')patch['isbn']=item.isbn??null;
     if(Object.keys(patch).length){const r=await db.from('items').update(patch).eq('id',existing.id);if(r.error)throw r.error;Object.assign(existing,patch);}skip('duplicate');
    }else {const r=await db.from('items').insert(item).select().single();if(r.error){if(r.error.code==='23505')skip('duplicate');else throw r.error;}else{all.push(r.data);imported++;}}
   }else skip(reason);
   cursor.pending.shift();processed++;
  }catch(e){
   const message=e instanceof Error?e.message:'Import failed';
   await db.from('import_jobs').update({cursor:cursor as any,imported_count:imported,skipped_count:skipped,skipped_reasons:reasons,status:'error',last_error:message,updated_at:new Date().toISOString()}).eq('id',job.id);throw new Error(message);
  }
  if(['A','B','D'].includes(job.pass_name)&&all.filter(i=>i.media_type===(job.provider==='tmdb'?'film':'book')&&!i.is_georgian).length>=2000){cursor.finished=true;cursor.pending=[];break;}
 }
 const status=cursor.finished&&!cursor.pending?.length?'done':'running';
 const r=await db.from('import_jobs').update({cursor:cursor as any,imported_count:imported,skipped_count:skipped,skipped_reasons:reasons,status,last_error:null,updated_at:new Date().toISOString()}).eq('id',job.id).select().single();if(r.error)throw r.error;return r.data;
}
