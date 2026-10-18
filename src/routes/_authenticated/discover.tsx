import { createFileRoute, Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/auth-form';
import { ItemDrawer, Loading, Shell, SwipeCard } from '@/components/phi';
import { useMe, undoSwipe, type Me } from '@/lib/data';
import { discoverQueue, recordSwipe, type QueueCard } from '@/lib/discover-queue';
import { imageUrl } from '@/lib/images';
import { SHOW_IMAGES } from '@/lib/config';
import { haptic, recordTiming } from '@/lib/timings';
export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: (s: Record<string, unknown>): { tag?: string | undefined } => ({ tag: typeof s['tag'] === "string" ? (s['tag'] as string) : undefined }),
  head: () => ({ meta: [{ title: "Discover · Philomathia" }, { name: "description", content: "Swipe through films and books picked for your taste." }, { property: "og:title", content: "Discover · Philomathia" }, { property: "og:description", content: "Swipe through films and books picked for your taste." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => null,
});

export function Discover() {
 const location = useRouterState({ select: s => s.location });
 const search = location.search as { tag?: string; facet?: string; value?: string };
 const me = useMe(); const qc = useQueryClient();
 const [media,setMedia] = useState<'film'|'book'>('film');
 const [geo,setGeo] = useState(false); const [open,setOpen] = useState(false);
 const [queue,setQueue] = useState<QueueCard[]>([]); const [loading,setLoading] = useState(true);
 const [error,setError] = useState(''); const [undoing,setUndoing] = useState(false);
 const [pending,setPending] = useState(0); const [last,setLast] = useState<QueueCard|null>(null);
 const shownAt = useRef(performance.now()); const opened = useRef(false);
 const queueRef = useRef(queue); queueRef.current=queue;
 const excluded = useRef(new Set<string>()); const saved = useRef(new Map<string,Promise<boolean>>());
 const generation = useRef(0); const refilling = useRef(false); const swipeCount = useRef(0);
 const current = queue[0];
 useEffect(()=>{ const choice=localStorage.getItem('phi-media');if(choice==='film'||choice==='book')setMedia(choice); },[]);
 const filters = { georgian_only:geo,...(search.tag?{tag:search.tag}:{}),...(search.facet?{facet:search.facet,value:search.value}: {}) };
 const filterKey = JSON.stringify(filters);
 async function refill(reset=false) {
  if(refilling.current&&!reset)return;
  const version=reset?++generation.current:generation.current;
  refilling.current=true; if(reset){setLoading(true);setQueue([]);}setError('');
  try {
   const ahead=reset?[]:queueRef.current;
   const cards=await discoverQueue(media,filters,[...excluded.current,...ahead.map(c=>c.item.id)],String(version)+':'+swipeCount.current);
   if(version!==generation.current)return;
   setQueue(old=>reset?cards.filter(c=>!excluded.current.has(c.item.id)):[...old,...cards.filter(c=>!excluded.current.has(c.item.id)&&!old.some(o=>o.item.id===c.item.id))].slice(0,8));
  } catch { if(version===generation.current)setError('Could not load your picks. Please retry.'); }
  finally { if(version===generation.current){refilling.current=false;setLoading(false);} }
 }
 useEffect(()=>{void refill(true);},[media,filterKey]);
 useEffect(()=>{shownAt.current=performance.now();opened.current=false;},[current?.item.id]);
 useEffect(()=>{for(const card of queue.slice(1,3)){const url=SHOW_IMAGES?imageUrl(card.item,'lg'):null;if(url){const img=new Image();img.src=url;}}},[queue[1]?.item.id,queue[2]?.item.id]);
 useEffect(()=>{if(current){recordTiming('time to first card',performance.now()-shownAt.current);}},[loading]);
 function act(action:'like'|'pass') {
  if(!current||undoing)return;
  const start=performance.now(); const card=current;
  excluded.current.add(card.item.id);setQueue(old=>old.filter(c=>c.item.id!==card.item.id));setLast(card);setPending(n=>n+1);haptic();
  requestAnimationFrame(()=>recordTiming('swipe to next card',performance.now()-start));
  const dwell=performance.now()-shownAt.current;
  qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:[{item_id:card.item.id,action,created_at:new Date().toISOString()},...old.swipes]}:old);
  const write=recordSwipe(card.item,action,dwell,opened.current).then(()=>true).catch(()=>{
   excluded.current.delete(card.item.id);setQueue(old=>[card,...old.filter(c=>c.item.id!==card.item.id)].slice(0,8));
   qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:old.swipes.filter(s=>s.item_id!==card.item.id)}:old);
   setError('Could not save that choice. The card is back so you can retry.');return false;
  }).finally(()=>setPending(n=>n-1)); saved.current.set(card.item.id,write);
  swipeCount.current++;
  void write.then(ok=>{if(!ok)return;if(swipeCount.current%5===0)void supabaseRefresh();if(queueRef.current.length<=3||swipeCount.current%2===0)void refill();});
 }
 async function supabaseRefresh(){const {supabase}=await import('@/integrations/supabase/client');await supabase.rpc('refresh_taste',{});}
 async function undo(){if(!last||undoing)return;setUndoing(true);try{const ok=await saved.current.get(last.item.id);if(ok===false)return;await undoSwipe(last.item,'');excluded.current.delete(last.item.id);setQueue(old=>[last,...old.filter(c=>c.item.id!==last.item.id)].slice(0,8));qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:old.swipes.filter(s=>s.item_id!==last.item.id)}:old);setLast(null);}catch{setError('Could not undo. Please retry.');}finally{setUndoing(false);}}
 return <Shell><div className="section">
  <div className="between"><h1 className="h1">Discover</h1><span className="small muted">{(me.data?.swipes.length??0)<15?'Getting to know you':(me.data?.swipes.length??0)<40?'Learning your taste':'Taste tuned'}</span></div>
  <div className="toggle"><Button className={media==='film'?'on':''} onClick={()=>{setMedia('film');localStorage.setItem('phi-media','film');}}>Films</Button><Button className={media==='book'?'on':''} onClick={()=>{setMedia('book');localStorage.setItem('phi-media','book');}}>Books</Button></div>
  <label className="row"><input type="checkbox" checked={geo} onChange={e=>setGeo(e.target.checked)}/>Georgian only</label>
  {error&&<p role="alert" className="error">{error}<Button onClick={()=>void refill()}>Retry</Button></p>}
  {loading&&!current?<Loading/>:current?<SwipeCard key={current.item.id} item={current.item} lang="en" reason={current.reason} onLike={()=>act('like')} onPass={()=>act('pass')} onTap={()=>{opened.current=true;setOpen(true);}} disabled={undoing}/>:<div className="stack"><h2 className="h2">All caught up.</h2><p className="muted">Try another type of story, change your filters, or undo your last choice.</p><Button onClick={()=>void refill(true)}>Find more picks</Button></div>}
  <div className="row"><Button className="btn-danger pill" disabled={!current||undoing} onClick={()=>act('pass')}>Pass</Button><Button className="pill" disabled={!current} onClick={()=>{opened.current=true;setOpen(true);}}>Info</Button><Button className="btn-primary pill" disabled={!current||undoing} onClick={()=>act('like')}>Like</Button></div>
  <Button className="btn-text" disabled={!last||undoing} onClick={undo}>Undo last swipe</Button>
  {!me.data?.profile.onboarded&&<Link to="/onboarding" className="btn btn-text">Set up my taste</Link>}
  <span className="small muted" role="status">{pending>0?'Saving your choices…':''}</span>
 </div>{open&&current&&<ItemDrawer item={current.item} items={queue.map(c=>c.item)} lang="en" reason={current.reason} onClose={()=>setOpen(false)}/>}</Shell>;
}
