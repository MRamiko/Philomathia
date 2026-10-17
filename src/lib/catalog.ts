import {supabase} from '@/integrations/supabase/client';
import {useQuery} from '@tanstack/react-query';
import type {Item, RecInput} from './recommend';
export async function searchCatalog(q:string,media='all',geo=false,page=1){
 const r=await supabase.rpc('catalog_search',{_query:q.trim(),_media:media,_geo:geo,_page:page});if(r.error)throw r.error;return r.data as unknown as {items:Item[];total:number};
}
export function useCatalogSearch(q:string,media='all',geo=false,page=1){return useQuery({queryKey:['catalog-search',q,media,geo,page],queryFn:()=>searchCatalog(q,media,geo,page)});}
export async function candidateItems(x:Partial<RecInput>,cold:boolean){
 const r=await supabase.rpc('catalog_candidates',{_media:x.mediaType??'either',_geo:x.georgianOnly??false,_avoid:x.avoidedGenres??[],_cold:cold,...(x.minMinutes!=null?{_min_minutes:x.minMinutes}:{}),...(x.maxMinutes!=null?{_max_minutes:x.maxMinutes}:{}),...(x.minPages!=null?{_min_pages:x.minPages}:{}),...(x.maxPages!=null?{_max_pages:x.maxPages}:{})});if(r.error)throw r.error;return r.data as Item[];
}
export function useCandidates(x:Partial<RecInput>,swipes:unknown,cold:boolean){return useQuery({queryKey:['candidates',x,swipes,cold],queryFn:()=>candidateItems(x,cold),refetchOnMount:'always',staleTime:0});}