import {createFileRoute} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useEffect,useState} from 'react';
import {Shell,Loading,ItemRow} from '@/components/phi';
import {Button} from '@/components/auth-form';
import {parseQuery} from '@/lib/ask.functions';
import {parseIntent,type Intent} from '@/lib/ask-intent';
import {facetLabel} from '@/lib/facets';
import {supabase} from '@/integrations/supabase/client';
import {swipe,useMe,useRefresh} from '@/lib/data';
import type {Item} from '@/lib/recommend';
import {startTiming} from '@/lib/timings';
export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({ meta: [{ title: "Ask Phi · Philomathia" }, { name: "description", content: "Find your next film or book by mood and time." }, { property: "og:title", content: "Ask Phi · Philomathia" }, { property: "og:description", content: "Find your next film or book by mood and time." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => null,
});

type Result={item:Item;reason:string;score:number};
export function Ask(){
 const parse=useServerFn(parseQuery);const me=useMe();const refresh=useRefresh();
 const [text,setText]=useState('');const [media,setMedia]=useState<'either'|'film'|'book'>('either');const [intent,setIntent]=useState<Intent|null>(null);const [results,setResults]=useState<Result[]|null>(null);const [recent,setRecent]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [ai,setAi]=useState(false);const [done,setDone]=useState<string[]>([]);
 useEffect(()=>{try{setRecent(JSON.parse(sessionStorage.getItem('phi-recent-asks')??'[]'));}catch{}},[]);
 async function rank(value:Intent){const finish=startTiming('query time');try{const r=await supabase.rpc('ask_rank',{intent:value as never}).abortSignal(AbortSignal.timeout(8000));if(r.error)throw r.error;setResults(r.data as unknown as Result[]);}finally{finish();}}
 async function find(query=text){if(!query.trim()||busy)return;setText(query);setBusy(true);setError('');setDone([]);let value=parseIntent(query);setAi(false);
 try{const response=await Promise.race([parse({data:{text:query}}),new Promise<null>(resolve=>setTimeout(()=>resolve(null),8000))]);if(response){value=response.intent;setAi(response.aiUsed);if(response.error)setError(response.error);}if(media!=='either')value.media_type=media;setIntent(value);await rank(value);const history=[query,...recent.filter(q=>q!==query)].slice(0,5);setRecent(history);sessionStorage.setItem('phi-recent-asks',JSON.stringify(history));}catch{setError('Could not search. Please retry.');}finally{setBusy(false);}}
 async function remove(kind:keyof Intent,index?:number){if(!intent)return;const value={...intent};if(Array.isArray(value[kind]))(value as any)[kind]=(value[kind] as unknown[]).filter((_,n)=>n!==index);else if(kind==='georgian_only')value.georgian_only=false;else if(kind==='media_type')value.media_type='either';else (value as any)[kind]=null;setIntent(value);setBusy(true);try{await rank(value);}catch{setError('Could not search. Please retry.');}finally{setBusy(false);}}
 return <Shell><div className="section"><h1 className="h1">Ask Phi</h1><textarea className="input" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="Describe what you want..."/><div className="toggle">{(['either','film','book'] as const).map(value=><Button key={value} className={media===value?'on':''} onClick={()=>setMedia(value)}>{value==='either'?'Any':value==='film'?'Films':'Books'}</Button>)}</div><div className="row">{['A short black-and-white drama','Something like Memento','Cozy romantic comedy for tonight','A Georgian book about family'].map(q=><Button className="chip" key={q} onClick={()=>find(q)}>{q}</Button>)}</div><Button className="btn-primary" disabled={busy||!text.trim()} onClick={()=>find()}>Find something</Button>{recent.length>0&&<div className="row">{recent.map(q=><Button className="chip" key={q} onClick={()=>find(q)}>{q}</Button>)}</div>{error&&<p className="error" role="alert">{error}</p>}
 {intent&&<><strong>Understood as:</strong><div className="row">{intent.media_type!=='either'&&<Button className="chip" onClick={()=>remove('media_type')}>{intent.media_type} ×</Button>}{intent.genres.map((v,n)=><Button className="chip" key={v} onClick={()=>remove('genres',n)}>{v} ×</Button>)}{intent.traits.map((v,n)=><Button className="chip trait-chip" data-facet={v.facet} key={v.facet+v.value} onClick={()=>remove('traits',n)}>{facetLabel(v.value)} ×</Button>)}{intent.similar_to.map((v,n)=><Button className="chip" key={v} onClick={()=>remove('similar_to',n)}>Like {v} ×</Button>)}{intent.max_minutes!=null&&<Button className="chip" onClick={()=>remove('max_minutes')}>Up to {intent.max_minutes} min ×</Button>}{intent.max_pages!=null&&<Button className="chip" onClick={()=>remove('max_pages')}>Up to {intent.max_pages} pages ×</Button>}{intent.georgian_only&&<Button className="chip" onClick={()=>remove('georgian_only')}>Georgian only ×</Button>}</div><span className="small muted">{ai?'AI used':'Rules only'}</span></>}
 {busy?<Loading/>:results&&<>{results.length===0?<p>No titles match that request yet. Try fewer constraints.</p>:results.map(result=><div className="stack" key={result.item.id}><ItemRow item={result.item} lang="en"/><p className="reason small">{result.reason}</p><div className="row"><Button disabled={done.includes(result.item.id)} onClick={async()=>{if(!me.data)return;try{await swipe(me.data.uid,result.item,'like');setDone(old=>[...old,result.item.id]);void refresh();}catch{setError('Could not save. Please retry.');}}}>Like</Button><Button disabled={done.includes(result.item.id)} onClick={async()=>{if(!me.data)return;try{await swipe(me.data.uid,result.item,'pass');setDone(old=>[...old,result.item.id]);void refresh();}catch{setError('Could not save. Please retry.');}}}>Pass</Button></div></div>)}</>}
 </div></Shell>;
}
