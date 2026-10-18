import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {validateIntent,parseIntent} from './ask-intent';
export type Filters={media_type:'film'|'book'|'either';max_minutes:number|null;moods:string[];keywords:string[];georgian_only:boolean};
export const parseQuery=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{text:string})=>({text:String(d.text??'').slice(0,300)})).handler(async({data})=>{
 const {parseAiIntent}=await import('./ask.server');const result=await parseAiIntent(data.text);
 return {intent:validateIntent(result.raw,data.text)??parseIntent(data.text),aiUsed:!!result.raw,error:result.error};
});
export const rewriteReasons=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{lang:string;items:{title:string;reason:string}[]})=>d).handler(async()=>null);
