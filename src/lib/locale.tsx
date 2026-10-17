import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { translate, type Locale } from './strings';
const Context=createContext({lang:'en' as Locale,t:(k:string,v?:Record<string,string|number>)=>translate('en',k,v),setLanguage:async(_l:Locale)=>{}});
export function LocaleProvider({children}:{children:ReactNode}){
 const [lang,setLang]=useState<Locale>('en');const [ready,setReady]=useState(false);const qc=useQueryClient();
 const profile=useQuery({queryKey:['locale-profile'],queryFn:async()=>{const {data}=await supabase.auth.getUser();if(!data.user)return null;const r=await supabase.from('profiles').select('preferred_language').eq('id',data.user.id).maybeSingle();if(r.error)throw r.error;return r.data;}});
 useEffect(()=>{const saved=localStorage.getItem('phi-language');if(saved==='ka'||saved==='en')setLang(saved);setReady(true);},[]);
 useEffect(()=>{if(profile.data){setLang(profile.data.preferred_language==='ka'?'ka':'en');}},[profile.data]);
 useEffect(()=>{if(!ready)return;document.documentElement.lang=lang;localStorage.setItem('phi-language',lang);},[lang,ready]);
 async function setLanguage(next:Locale){const old=lang;setLang(next);const {data}=await supabase.auth.getUser();if(!data.user)return;const {error}=await supabase.from('profiles').update({preferred_language:next}).eq('id',data.user.id);if(error){setLang(old);throw error;}qc.setQueryData(['locale-profile'],{preferred_language:next});await qc.invalidateQueries({queryKey:['me']});}
 return <Context.Provider value={{lang,t:(k,v)=>translate(lang,k,v),setLanguage}}>{children}</Context.Provider>;
}
export const useLocale=()=>useContext(Context);
