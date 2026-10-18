import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
import {Shell,Loading} from '@/components/phi';
import {Button} from '@/components/auth-form';
import {supabase} from '@/integrations/supabase/client';
import {ONBOARDING_PAIRS,facetLabel} from '@/lib/facets';
import {useItems,useMe,useRefresh,swipe} from '@/lib/data';
import {useCatalogSearch} from '@/lib/catalog';
import type {Item} from '@/lib/recommend';
export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your taste · Philomathia" }, { name: "description", content: "Pick genres, moods and titles you like." }, { property: "og:title", content: "Your taste · Philomathia" }, { property: "og:description", content: "Pick genres, moods and titles you like." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Onboarding,
});

function Onboarding(){
 const [step,setStep]=useState(0);const [answers,setAnswers]=useState<{facet:string;value:string}[]>([]);const [query,setQuery]=useState('');const [titles,setTitles]=useState<Item[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const me=useMe();const items=useItems();const search=useCatalogSearch(query);const refresh=useRefresh();const nav=useNavigate();
 async function finish(skip=false){if(!me.data||busy)return;setBusy(true);setError('');try{const result=await supabase.rpc('starting_taste',{answers:skip?[]:answers});if(result.error)throw result.error;if(!skip)for(const item of titles)await swipe(me.data.uid,item,'like');await refresh();await nav({to:'/discover',search:{tag:undefined}});}catch{setError('Could not save your starting taste. Please retry.');}finally{setBusy(false);}}
 const pair=ONBOARDING_PAIRS[step];
 return <Shell><div className="stack"><h1 className="h1">What draws you in?</h1><div className="learning-meter" aria-label={`Step ${Math.min(step+1,9)} of 9`}>{Array.from({length:9},(_,n)=><span key={n} className={n<=step?'complete':''}/>)}</div>{error&&<p className="error">{error}</p>}
 {pair?<><h2 className="h2">This or that?</h2>{pair.slice(1).map(value=><Button className="choice-button" key={value} onClick={()=>{setAnswers(old=>[...old,{facet:pair[0],value}]);setStep(n=>n+1);}}>{facetLabel(value)}</Button>)}<Button className="btn-text" onClick={()=>setStep(n=>n+1)}>Skip this choice</Button></>:<><h2 className="h2">Up to five titles you love</h2><input className="input" placeholder="Find a title…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="row">{(query?search.data?.items??[]:items.data?.slice(0,30)??[]).map(item=><Button className={`chip ${titles.some(i=>i.id===item.id)?'chip-active':''}`} key={item.id} onClick={()=>setTitles(old=>old.some(i=>i.id===item.id)?old.filter(i=>i.id!==item.id):old.length<5?[...old,item]:old)}>{item.title_en}</Button>)}</div><Button className="btn-primary" disabled={busy} onClick={()=>finish()}>Save my starting taste</Button></>}
 <Button className="btn-text" disabled={busy} onClick={()=>finish(true)}>Skip setup</Button></div></Shell>;
}
