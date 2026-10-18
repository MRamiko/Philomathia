import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {traitsBatch,traitsProgress} from '@/lib/traits.functions';
import {Button} from './auth-form';
export function TraitsTab(){
 const progress=useServerFn(traitsProgress);const batch=useServerFn(traitsBatch);const query=useQuery({queryKey:['traits-progress'],queryFn:()=>progress()});
 const [running,setRunning]=useState<'rules'|'ai'|null>(null);const [error,setError]=useState('');const stop=useRef(false);const busy=useRef(false);
 useEffect(()=>()=>{stop.current=true;},[]);
 async function run(mode:'rules'|'ai'){if(busy.current)return;busy.current=true;stop.current=false;setRunning(mode);setError('');try{let command:'start'|'next'='start';while(!stop.current){const result=await batch({data:{mode,command}});await query.refetch();if(result.done)break;command='next';}if(stop.current)await batch({data:{mode,command:'pause'}});}catch(e){setError(e instanceof Error?e.message:'Could not enrich traits.');}finally{busy.current=false;setRunning(null);await query.refetch();}}
 return <div className="stack"><h2 className="h2">Traits</h2><p>{query.data?query.data.six+' / '+query.data.total+' items have 6 or more traits.':'Loading coverage…'}</p>{error&&<p role="alert" className="error">{error}</p>}{(['rules','ai'] as const).map(mode=><div className="box stack" key={mode}><strong>{mode==='rules'?'Metadata rules':'AI traits'}</strong><span className="small muted">{query.data?.jobs.find(j=>j.pass_name===mode)?.status??'Not started'}</span>{mode==='ai'&&<p className="small">Estimated calls: {Math.ceil((query.data?.rules??0)/10)}. AI usage draws from workspace credits.</p>}<Button disabled={!!running} onClick={()=>run(mode)}>{query.data?.jobs.some(j=>j.pass_name===mode)?'Resume':'Start'}</Button></div>)}{running&&<Button onClick={()=>{stop.current=true;}}>Stop after this batch</Button>}</div>;
}