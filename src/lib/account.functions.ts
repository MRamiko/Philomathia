import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
export const deleteAccount=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const userId=context.userId;
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 for(const table of ['logs','swipes','tag_weights','taste_events'] as const){
  const r=await supabaseAdmin.from(table).delete().eq('user_id',userId);if(r.error)throw r.error;
 }
 const p=await supabaseAdmin.from('profiles').delete().eq('id',userId);if(p.error)throw p.error;
 const a=await supabaseAdmin.auth.admin.deleteUser(userId);if(a.error)throw a.error;
 return {deleted:true};
});
