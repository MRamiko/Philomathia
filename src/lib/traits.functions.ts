import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {ruleFacets,validFacet,FACETS} from './facets';
import type {Item} from './recommend';
export const traitsProgress=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(role.error||!role.data)throw new Error('Forbidden');
 const [total,none,rules,ai,jobs]=await Promise.all([context.supabase.from('items').select('id',{count:'exact',head:true}),context.supabase.from('items').select('id',{count:'exact',head:true}).eq('facets_status','none'),context.supabase.from('items').select('id',{count:'exact',head:true}).eq('facets_status','rules'),context.supabase.from('items').select('id',{count:'exact',head:true}).eq('facets_status','ai'),context.supabase.from('import_jobs').select('*').eq('provider','traits').order('updated_at',{ascending:false})]);
 for(const result of [total,none,rules,ai,jobs])if(result.error)throw result.error;return {total:total.count??0,none:none.count??0,rules:rules.count??0,ai:ai.count??0,jobs:jobs.data??[]};
});
export const traitsBatch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:{mode:'rules'|'ai';command:'start'|'pause'|'resume'|'next'})=>data).handler(async({context,data})=>{
 const role=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(role.error||!role.data)throw new Error('Forbidden');
 const db=context.supabase;
 let job=(await db.from('import_jobs').select('*').eq('provider','traits').eq('pass_name',data.mode).order('updated_at',{ascending:false}).limit(1).maybeSingle()).data;
 if(!job){const created=await db.from('import_jobs').insert({provider:'traits',pass_name:data.mode,status:'pending'}).select('*').single();if(created.error)throw created.error;job=created.data;}
 if(data.command==='pause'){await db.from('import_jobs').update({status:'paused',updated_at:new Date().toISOString()}).eq('id',job.id);return {done:false,status:'paused',processed:job.imported_count};}
 if(data.command==='next'&&['paused','error','done'].includes(job.status))return {done:job.status==='done',status:job.status,processed:job.imported_count};
 await db.from('import_jobs').update({status:'running',last_error:null,updated_at:new Date().toISOString()}).eq('id',job.id);
 const selection=await db.from('items').select('*').eq('facets_status',data.mode==='rules'?'none':'rules').order('popularity',{ascending:false}).limit(data.mode==='rules'?40:10);if(selection.error)throw selection.error;
 const items=selection.data as Item[];if(!items.length){await db.from('import_jobs').update({status:'done'}).eq('id',job.id);return {done:true,status:'done',processed:job.imported_count};}
 try{
 if(data.mode==='rules'){
  const ids=items.map(item=>item.id);
  const existing=await db.from('item_facets').select('item_id,facet,value,source').in('item_id',ids);if(existing.error)throw existing.error;
  const rows=items.flatMap(item=>ruleFacets(item).filter(f=>!existing.data.some(old=>old.item_id===item.id&&old.facet===f.facet&&(old.source==='admin'||old.source==='keyword'||old.value===f.value))).map(f=>({...f,item_id:item.id})));
  if(rows.length){const written=await db.from('item_facets').upsert(rows,{onConflict:'item_id,facet,value',ignoreDuplicates:true});if(written.error)throw written.error;}
  const updated=await db.from('items').update({facets_status:'rules'}).in('id',ids);if(updated.error)throw updated.error;
  const processed=job.imported_count+items.length;await db.from('import_jobs').update({imported_count:processed,cursor:{last_ids:ids},updated_at:new Date().toISOString()}).eq('id',job.id);return {done:false,status:'running',processed};
 }
 let aiRows:{id:string;facets:{facet:string;value:string;confidence:number}[]}[]=[];
 if(data.mode==='ai'){
  const {enrichTraits}=await import('./traits.server');aiRows=await enrichTraits(items);
 }
 for(const item of items){
  const facets=(aiRows.find(row=>row.id===item.id)?.facets??[]).filter(f=>validFacet(f.facet,f.value)&&f.confidence>=0.6&&f.confidence<=1).map(f=>({...f,source:'ai' as const}));
  const existing=await db.from('item_facets').select('facet,value,source').eq('item_id',item.id);if(existing.error)throw existing.error;
  const safe=facets.filter(f=>!existing.data.some(old=>old.facet===f.facet&&(old.source==='admin'||old.source==='keyword'||old.value===f.value)));
  if(safe.length){const written=await db.from('item_facets').upsert(safe.map(f=>({...f,item_id:item.id})),{onConflict:'item_id,facet,value',ignoreDuplicates:true});if(written.error)throw written.error;}
  const updated=await db.from('items').update({facets_status:data.mode}).eq('id',item.id);if(updated.error)throw updated.error;
 }
 const processed=job.imported_count+items.length;await db.from('import_jobs').update({imported_count:processed,updated_at:new Date().toISOString()}).eq('id',job.id);return {done:false,status:'running',processed};
 }catch(error){const message=error instanceof Error?error.message:'Trait enrichment failed';await db.from('import_jobs').update({status:'error',last_error:message,updated_at:new Date().toISOString()}).eq('id',job.id);throw new Error(message);}
});