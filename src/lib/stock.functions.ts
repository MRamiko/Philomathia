import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {normalizeTitle} from './import-rules';
type Ctx={supabase:any;userId:string};
async function shopsFor(context:Ctx){
 const r=await context.supabase.from('user_roles').select('role,shop_id').eq('user_id',context.userId);
 if(r.error)throw r.error;
 const roles=r.data??[];
 const admin=roles.some((x:any)=>x.role==='admin');
 const shopIds=roles.filter((x:any)=>x.role==='shop'&&x.shop_id).map((x:any)=>x.shop_id);
 if(!admin&&!shopIds.length)throw new Error('Forbidden');
 if(admin){const s=await context.supabase.from('shops').select('id,name,is_sample').order('name');if(s.error)throw s.error;return {admin:true,shops:s.data??[]};}
 const s=await context.supabase.from('shops').select('id,name,is_sample').in('id',shopIds);if(s.error)throw s.error;
 return {admin:false,shops:s.data??[]};
}
function canWrite(shops:{id:string}[],shopId:string){return shops.some(s=>s.id===shopId);}
export const myShops=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>shopsFor(context as unknown as Ctx));
export const matchStockRows=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{shopId:string;rows:{isbn:string;price:number;quantity:number;title?:string;author?:string}[]})=>{if(!Array.isArray(d.rows)||d.rows.length>1000)throw new Error('Too many rows');return d;}).handler(async({context,data})=>{
 const ctx=context as unknown as Ctx;const {shops}=await shopsFor(ctx);
 if(!canWrite(shops,data.shopId))throw new Error('Forbidden');
 const isbns=[...new Set(data.rows.map(r=>r.isbn))];
 const byIsbn=new Map<string,any>();
 for(let n=0;n<isbns.length;n+=100){const r=await ctx.supabase.from('items').select('id,title_en,title_ka,isbn,creator').eq('media_type','book').in('isbn',isbns.slice(n,n+100));if(r.error)throw r.error;for(const i of r.data??[])if(i.isbn)byIsbn.set(i.isbn,i);}
 // Fallback: normalized title + author match for rows without an ISBN hit.
 const needsFallback=data.rows.filter(r=>!byIsbn.has(r.isbn)&&r.title&&r.author);
 let byIdentity=new Map<string,any>();
 if(needsFallback.length){
  const all:any[]=[];for(let n=0;;n+=1000){const r=await ctx.supabase.from('items').select('id,title_en,title_ka,creator').eq('media_type','book').range(n,n+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}
  byIdentity=new Map(all.map(i=>[normalizeTitle(i.title_en)+'|'+normalizeTitle(i.creator),i]));
 }
 const existing=new Set<string>();
 {const r=await ctx.supabase.from('shop_stock').select('item_id').eq('shop_id',data.shopId);if(r.error)throw r.error;for(const s of r.data??[])existing.add(s.item_id);}
 return data.rows.map(row=>{
  const item=byIsbn.get(row.isbn)??(row.title&&row.author?byIdentity.get(normalizeTitle(row.title)+'|'+normalizeTitle(row.author)):null);
  if(!item)return {...row,itemId:null,matchedTitle:null,status:'not_found' as const};
  return {...row,itemId:item.id,matchedTitle:item.title_ka??item.title_en,status:existing.has(item.id)?'will_update' as const:'valid' as const};
 });
});
export const commitStock=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{shopId:string;rows:{itemId:string;price:number;quantity:number}[];zeroMissing?:boolean})=>{if(!Array.isArray(d.rows)||d.rows.length>1000)throw new Error('Too many rows');return d;}).handler(async({context,data})=>{
 const ctx=context as unknown as Ctx;const {shops}=await shopsFor(ctx);
 if(!canWrite(shops,data.shopId))throw new Error('Forbidden');
 let added=0,updated=0;const failed:{isbn?:string;reason:string}[]=[];
 const existing=new Map<string,string>();
 {const r=await ctx.supabase.from('shop_stock').select('id,item_id').eq('shop_id',data.shopId);if(r.error)throw r.error;for(const s of r.data??[])existing.set(s.item_id,s.id);}
 for(let n=0;n<data.rows.length;n+=100){
  const slice=data.rows.slice(n,n+100);
  const r=await ctx.supabase.from('shop_stock').upsert(slice.map(row=>({shop_id:data.shopId,item_id:row.itemId,price_gel:row.price,quantity:row.quantity,updated_at:new Date().toISOString()})),{onConflict:'shop_id,item_id'});
  if(r.error){for(const row of slice)failed.push({reason:r.error!.message});}
  else{for(const row of slice){if(existing.has(row.itemId))updated++;else added++;}}
 }
 let zeroed=0;
 if(data.zeroMissing){
  const keep=new Set(data.rows.map(r=>r.itemId));
  const toZero=[...existing.entries()].filter(([itemId])=>!keep.has(itemId)).map(([,id])=>id);
  for(let n=0;n<toZero.length;n+=100){const r=await ctx.supabase.from('shop_stock').update({quantity:0,updated_at:new Date().toISOString()}).in('id',toZero.slice(n,n+100));if(r.error)throw r.error;zeroed+=Math.min(toZero.length-n,100);}
 }
 return {added,updated,zeroed,failed};
});
