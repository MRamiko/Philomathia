import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { WATCH_REGIONS, WATCH_FALLBACK } from './watch-regions';
type Providers={stream:string[];rent:string[];buy:string[]};
const empty=(p:any)=>!p||![...(p.stream??[]),...(p.rent??[]),...(p.buy??[])].length;
export const watchProviders=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:{itemId:string;region?:string})=>{if(typeof data?.itemId!=='string')throw new Error('Invalid');if(data.region&&!WATCH_REGIONS.includes(data.region as any))throw new Error('Invalid region');return data;}).handler(async({data,context})=>{
 const item=await context.supabase.from('items').select('id,tmdb_id,media_type').eq('id',data.itemId).single();if(item.error||item.data.media_type!=='film')throw new Error('Film not found');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const regions:string[]=data.region?[data.region]:['GE',...WATCH_FALLBACK];
 const cached=await supabaseAdmin.from('watch_availability').select('*').eq('item_id',data.itemId).in('region',regions);if(cached.error)throw new Error('Could not read streaming options');
 const fresh=new Map((cached.data??[]).filter(r=>Date.now()-Date.parse(r.fetched_at)<7*86400000).map(r=>[r.region,r]));
 const done=(row:any,fallback:boolean)=>({...row,requested:data.region??'GE',fallback});
 if(regions.every(r=>fresh.has(r))){const hit=regions.map(r=>fresh.get(r)).find(r=>!empty(r!.providers))??fresh.get(regions[0]!);return done(hit,hit!.region!==regions[0]);}
 if(!item.data.tmdb_id)return done({item_id:data.itemId,region:regions[0],providers:{},link:null,fetched_at:new Date().toISOString()},false);
 const key=process.env['TMDB_API_KEY'];if(!key)throw new Error('Streaming data is not configured');
 const url=new URL(`https://api.themoviedb.org/3/movie/${item.data.tmdb_id}/watch/providers`);url.searchParams.set('api_key',key);
 const response=await fetch(url);if(!response.ok)throw new Error('Streaming options could not be checked. Please retry.');
 const raw=await response.json() as {results?:Record<string,{link?:string;flatrate?:{provider_name:string}[];rent?:{provider_name:string}[];buy?:{provider_name:string}[]}>};
 const rows=regions.map(region=>{const ge=raw.results?.[region];const providers:Providers={stream:(ge?.flatrate??[]).map(p=>p.provider_name),rent:(ge?.rent??[]).map(p=>p.provider_name),buy:(ge?.buy??[]).map(p=>p.provider_name)};
  let link:string|null=null;try{const c=new URL(ge?.link??'');if(c.protocol==='https:'&&(c.hostname==='themoviedb.org'||c.hostname.endsWith('.themoviedb.org')||c.hostname==='justwatch.com'||c.hostname.endsWith('.justwatch.com')))link=c.href;}catch{}
  return {item_id:data.itemId,region,providers,link,fetched_at:new Date().toISOString()};});
 const saved=await supabaseAdmin.from('watch_availability').upsert(rows);if(saved.error)throw new Error('Could not save streaming options');
 const hit=rows.find(r=>!empty(r.providers))??rows[0]!;return done(hit,hit.region!==regions[0]);
});
