import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {PASSES,normalizeTitle} from './import-rules';
import type {Item} from './recommend';
export const importProgress=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const role=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(role.error||!role.data)throw new Error('Forbidden');
 const r=await context.supabase.from('import_jobs').select('*').order('pass_name');if(r.error)throw r.error;
 const items:Item[]=[];for(let n=0;;n+=1000){const x=await context.supabase.from('items').select('*').range(n,n+999);if(x.error)throw x.error;items.push(...x.data);if(x.data.length<1000)break;}
 const keys=items.map(i=>i.media_type+'|'+normalizeTitle(i.title_en)+'|'+i.year+'|'+normalizeTitle(i.creator));
 const coverage=['film','book'].map(media=>{const rows=items.filter(i=>i.media_type===media);return {media,total:rows.length,georgian:rows.filter(i=>i.is_georgian).length,image:rows.filter(i=>i.image_source&&i.image_ref).length,description:rows.filter(i=>i.description_en?.trim()||i.description_ka?.trim()).length,georgianTitle:rows.filter(i=>i.title_ka?.trim()).length,moods:rows.filter(i=>i.mood_tags.length>=3).length};});
 return {jobs:r.data,coverage,duplicates:keys.length-new Set(keys).size,tmdbConfigured:!!process.env['TMDB_API_KEY']};
});
export const importBatch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{pass:string;action:'start'|'pause'|'resume'|'batch'})=>{if(!PASSES.some(p=>p.id===d.pass)||!['start','pause','resume','batch'].includes(d.action))throw new Error('Invalid import');return d;}).handler(async({context,data})=>{
 const role=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(role.error||!role.data)throw new Error('Forbidden');
 const db=context.supabase;const pass=PASSES.find(p=>p.id===data.pass);if(!pass)throw new Error('Invalid pass');
 if(pass.provider==='tmdb'&&!process.env['TMDB_API_KEY'])throw new Error('TMDB key required');
 const existing=await db.from('import_jobs').select('*').eq('pass_name',pass.id).maybeSingle();if(existing.error)throw existing.error;
 let job=existing.data;
 if(!job){const r=await db.from('import_jobs').insert({provider:pass.provider,pass_name:pass.id,params:{target:pass.target},status:'running'}).select().single();if(r.error)throw r.error;job=r.data;}
 if(data.action==='pause'){const r=await db.from('import_jobs').update({status:'paused',updated_at:new Date().toISOString()}).eq('id',job.id).select().single();if(r.error)throw r.error;return r.data;}
 if(job.status==='done'||data.action==='batch'&&job.status!=='running')return job;
 const lease=await db.from('import_jobs').update({status:'running',updated_at:new Date().toISOString()}).eq('id',job.id).eq('updated_at',job.updated_at).select().maybeSingle();if(lease.error)throw lease.error;if(!lease.data)return job;
 const {runImport}=await import('./import.server');return runImport(db,lease.data,{...(process.env['TMDB_API_KEY']?{tmdb:process.env['TMDB_API_KEY']}:{}),...(process.env['GOOGLE_BOOKS_API_KEY']?{google:process.env['GOOGLE_BOOKS_API_KEY']}:{})});
});
