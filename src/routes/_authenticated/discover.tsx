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
import { useLocale } from '@/lib/locale';
import { MediaSwitch } from '@/components/media-switch';
import { Icon } from '@/components/icons';
import { Presence } from '@/components/motion';
import { bootMark, renderCounter } from '@/lib/startup-diagnostics';
export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: (s: Record<string, unknown>): { tag?: string | undefined; facet?:string|undefined; value?:string|undefined } => ({ tag: typeof s['tag'] === "string" ? s['tag'] : undefined,facet:typeof s['facet']==='string'?s['facet']:undefined,value:typeof s['value']==='string'?s['value']:undefined }),
  head: () => ({ meta: [{ title: "Discover · Philomathia" }, { name: "description", content: "Swipe through films and books picked for your taste." }, { property: "og:title", content: "Discover · Philomathia" }, { property: "og:description", content: "Swipe through films and books picked for your taste." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => null,
});

export function Discover() {
 renderCounter('Discover');
 const location = useRouterState({ select: s => s.location });
 const search = location.search as { tag?: string; facet?: string; value?: string };
 const me = useMe(); const qc = useQueryClient(); const { t, lang } = useLocale();
 const [media,setMedia] = useState<'film'|'book'>('film');
 const [geo,setGeo] = useState(false); const [open,setOpen] = useState(false);
 const [filterOpen,setFilterOpen] = useState(false);
 const [queue,setQueue] = useState<QueueCard[]>([]); const [loading,setLoading] = useState(true);
 const [error,setError] = useState(''); const [undoing,setUndoing] = useState(false);
 const [pending,setPending] = useState(0); const [last,setLast] = useState<QueueCard|null>(null);
 const shownAt = useRef(performance.now()); const opened = useRef(false);
 const queueRef = useRef(queue); queueRef.current=queue;
 const excluded = useRef(new Set<string>()); const saved = useRef(new Map<string,Promise<boolean>>());
 const writes = useRef<Promise<unknown>>(Promise.resolve());
 const generation = useRef(0); const refilling = useRef(false); const swipeCount = useRef(0);
 const request = useRef<AbortController|null>(null);
 const initial = useRef(performance.now());
 const current = queue[0];
 useEffect(()=>{ const choice=localStorage.getItem('phi-media');if(choice==='film'||choice==='book')setMedia(choice); },[]);
 const filters = { georgian_only:geo,...(search.tag?{tag:search.tag}:{}),...(search.facet?{facet:search.facet,value:search.value}: {}) };
 const filterKey = JSON.stringify(filters);
 async function refill(reset=false) {
  if(refilling.current&&!reset)return;
  const version=reset?++generation.current:generation.current;
  if(reset)request.current?.abort();
  const controller=new AbortController();request.current=controller;
  const deadline=window.setTimeout(()=>controller.abort(),8000);
  refilling.current=true; if(reset){setLoading(true);setQueue([]);}setError('');
  try {
  const ahead=reset?[]:queueRef.current.slice(0,2);
   const cards=await discoverQueue(media,filters,[...excluded.current,...ahead.map(c=>c.item.id)],String(version)+':'+swipeCount.current,controller.signal);
   if(version!==generation.current)return;
   setQueue(old=>{const locked=reset?[]:old.slice(0,2);return [...locked,...cards.filter(c=>!excluded.current.has(c.item.id)&&!locked.some(o=>o.item.id===c.item.id))].slice(0,8);});
  } catch { if(version===generation.current)setError('Could not load your picks. Please retry.'); }
  finally { clearTimeout(deadline); if(version===generation.current){refilling.current=false;setLoading(false);} }
 }
 useEffect(()=>{void refill(true);return()=>{generation.current++;request.current?.abort();};},[media,filterKey]);
 useEffect(()=>{const update=()=>{excluded.current.clear();setLast(null);void refill(true);};window.addEventListener('phi-taste-changed',update);return()=>window.removeEventListener('phi-taste-changed',update);},[media,filterKey]);
 useEffect(()=>{shownAt.current=performance.now();opened.current=false;},[current?.item.id]);
 useEffect(()=>{for(const card of queue.slice(1,3)){const url=SHOW_IMAGES?imageUrl(card.item,'lg'):null;if(url){const img=new Image();img.src=url;}}},[queue[1]?.item.id,queue[2]?.item.id]);
 useEffect(()=>{if(current){recordTiming('time to first card',performance.now()-initial.current);bootMark('first card rendered');}},[loading]);
 function act(action:'like'|'pass') {
  if(!current||undoing)return;
  const start=performance.now(); const card=current;
  excluded.current.add(card.item.id);setQueue(old=>old.filter(c=>c.item.id!==card.item.id));setLast(card);setPending(n=>n+1);haptic();
  requestAnimationFrame(()=>recordTiming('swipe to next card',performance.now()-start));
  const dwell=performance.now()-shownAt.current;
  qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:[{item_id:card.item.id,action,created_at:new Date().toISOString()},...old.swipes]}:old);
  const detailOpened=opened.current;
  const write=writes.current.then(()=>recordSwipe(card.item,action,dwell,detailOpened)).then(ok=>{if(!ok)throw new Error('Not saved');return true;}).catch(()=>{
   excluded.current.delete(card.item.id);setQueue(old=>[card,...old.filter(c=>c.item.id!==card.item.id)].slice(0,8));
   qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:old.swipes.filter(s=>s.item_id!==card.item.id)}:old);
   setError('Could not save that choice. The card is back so you can retry.');return false;
  }).finally(()=>setPending(n=>n-1)); saved.current.set(card.item.id,write);writes.current=write;
  swipeCount.current++;
  void write.then(ok=>{if(!ok)return;if(swipeCount.current%5===0)void supabaseRefresh();if(queueRef.current.length<=3||swipeCount.current%2===0)void refill();});
 }
 async function supabaseRefresh(){try{const {supabase}=await import('@/integrations/supabase/client');const result=await supabase.rpc('refresh_taste',{});if(result.error)setError('Could not refresh your taste. Please retry.');}catch{setError('Could not refresh your taste. Please retry.');}}
 async function undo(){if(!last||undoing)return;setUndoing(true);try{const ok=await saved.current.get(last.item.id);if(ok===false)return;await undoSwipe(last.item,'');excluded.current.delete(last.item.id);setQueue(old=>[last,...old.filter(c=>c.item.id!==last.item.id)].slice(0,8));qc.setQueryData<Me>(['me'],old=>old?{...old,swipes:old.swipes.filter(s=>s.item_id!==last.item.id)}:old);setLast(null);}catch{setError('Could not undo. Please retry.');}finally{setUndoing(false);}}
 return <Shell header={<div className="row discover-tools"><Button className="icon-btn" title="Filters" aria-label="Filters" onClick={()=>setFilterOpen(true)}><Icon name="filter"/></Button><MediaSwitch value={media} onChange={choice=>{setMedia(choice);localStorage.setItem('phi-media',choice);}}/></div>}><div className="section">
  <div className="between"><h1 className="h1">{t('Discover')}</h1><span className="small muted">{t((me.data?.swipes.length??0)<15?'Getting to know you':(me.data?.swipes.length??0)<40?'Learning your taste':'Taste tuned')}</span></div>
  {filterOpen&&<Presence historyEntry className="drawer-bg" onExit={()=>setFilterOpen(false)}>{close=><><div className="drawer-dismiss" onClick={close}/><div className="drawer stack" role="dialog" aria-modal="true" aria-label="Filters"><div className="between"><h2 className="h2">Filters</h2><Button className="icon-btn" aria-label="Close" onClick={close}><Icon name="close"/></Button></div><label className="row"><input type="checkbox" checked={geo} onChange={e=>setGeo(e.target.checked)}/>{t('Georgian only')}</label>{search.facet&&<p>Trait: {search.value?.replaceAll('_',' ')}</p>}</div></>}</Presence>}
  {error&&<p role="alert" className="error">{error}<Button onClick={()=>void refill()}>Retry</Button></p>}
  {loading&&!current?<Loading/>:current?<SwipeCard key={current.item.id} item={current.item} lang={lang} reason={current.reason} onLike={()=>act('like')} onPass={()=>act('pass')} onTap={()=>{opened.current=true;setOpen(true);}} disabled={undoing}/>:!error&&<div className="stack"><h2 className="h2">All caught up.</h2><p className="muted">Try another type of story, change your filters, or undo your last choice.</p><Button onClick={()=>void refill(true)}>Find more picks</Button></div>}
  <div className="swipe-actions"><Button className="btn-danger" title="Pass" aria-label="Pass" disabled={!current||undoing} onClick={()=>act('pass')}><Icon name="close"/></Button><Button className="info-action" title="Info" aria-label="Info" disabled={!current} onClick={()=>{opened.current=true;setOpen(true);}}><Icon name="info"/></Button><Button className="btn-primary" title="Like" aria-label="Like" disabled={!current||undoing} onClick={()=>act('like')}><Icon name="heart"/></Button><Button className="info-action" title="Undo last swipe" aria-label="Undo last swipe" disabled={!last||undoing} onClick={undo}><Icon name="undo"/></Button></div>
  {!me.data?.profile.onboarded&&<Link to="/onboarding" className="btn btn-text">Set up my taste</Link>}
  <span className="small muted" role="status">{pending>0?'Saving your choices…':''}</span>
 </div>{open&&current&&<ItemDrawer item={current.item} items={queue.map(c=>c.item)} lang={lang} reason={current.reason} onClose={()=>setOpen(false)}/>}</Shell>;
}
