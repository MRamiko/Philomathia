import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const watchProviders=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:{itemId:string})=>data).handler(async({data,context})=>{
 const item=await context.supabase.from('items').select('id,tmdb_id,media_type').eq('id',data.itemId).single();if(item.error||item.data.media_type!=='film')throw new Error('Film not found');
 const cached=await context.supabase.from('watch_availability').select('*').eq('item_id',data.itemId).eq('region','GE').maybeSingle();if(cached.error)throw new Error('Could not read streaming options');
 if(cached.data&&Date.now()-Date.parse(cached.data.fetched_at)<7*86400000)return cached.data;
 if(!item.data.tmdb_id)return {item_id:data.itemId,region:'GE',providers:{},link:null,fetched_at:new Date().toISOString()};
 const key=process.env['TMDB_API_KEY'];if(!key)throw new Error('Streaming data is not configured');
 const url=new URL(`https://api.themoviedb.org/3/movie/${item.data.tmdb_id}/watch/providers`);url.searchParams.set('api_key',key);
 const response=await fetch(url);if(!response.ok)throw new Error('Streaming options could not be checked. Please retry.');
 const raw=await response.json() as {results?:{GE?:{link?:string;flatrate?:{provider_name:string}[];rent?:{provider_name:string}[];buy?:{provider_name:string}[]}}};const ge=raw.results?.GE;
 const providers={stream:(ge?.flatrate??[]).map(p=>p.provider_name),rent:(ge?.rent??[]).map(p=>p.provider_name),buy:(ge?.buy??[]).map(p=>p.provider_name)};
 let link:string|null=null;try{const candidate=new URL(ge?.link??'');if(candidate.protocol==='https:'&&(candidate.hostname==='themoviedb.org'||candidate.hostname.endsWith('.themoviedb.org')||candidate.hostname==='justwatch.com'||candidate.hostname.endsWith('.justwatch.com')))link=candidate.href;}catch{}
 const row={item_id:data.itemId,region:'GE',providers,link,fetched_at:new Date().toISOString()};
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const saved=await supabaseAdmin.from('watch_availability').upsert(row);if(saved.error)throw new Error('Could not save streaming options');return row;
});