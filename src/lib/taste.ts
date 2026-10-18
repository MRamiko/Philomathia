import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export function useTaste(enabled=true){return useQuery({queryKey:['taste'],enabled,staleTime:60000,queryFn:async()=>{
 const r=await supabase.rpc('refresh_taste',{});if(r.error)throw r.error;
 const [taste,portrait,overrides]=await Promise.all([supabase.from('user_taste').select('*'),supabase.from('user_taste_portrait').select('*').maybeSingle(),supabase.from('user_taste_overrides').select('*')]);
 for(const result of [taste,portrait,overrides])if(result.error)throw result.error;
 return {traits:taste.data??[],portrait:portrait.data,overrides:overrides.data??[]};
}});}