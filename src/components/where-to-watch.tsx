import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { watchProviders } from '@/lib/watch.functions';
import { Button } from './auth-form';
import {useEffect,useState} from 'react';
export function WhereToWatch({itemId}:{itemId:string}){
 const get=useServerFn(watchProviders);const query=useQuery({queryKey:['watch',itemId],staleTime:7*86400000,queryFn:()=>get({data:{itemId}}),retry:false});
 const [slow,setSlow]=useState(false);useEffect(()=>{setSlow(false);if(!query.isPending)return;const timer=window.setTimeout(()=>setSlow(true),3000);return()=>clearTimeout(timer);},[query.isPending,itemId]);
 const providers=query.data?.providers as {stream?:string[];rent?:string[];buy?:string[]}|undefined;
 return <section className="stack"><h2 className="h2">Where to watch</h2>{query.error||slow&&query.isPending?<p role="alert" className="error">Could not check streaming options.<Button onClick={()=>{setSlow(false);void query.refetch();}}>Retry</Button></p>:query.isPending?<div className="loading-surface" role="status" aria-label="Checking streaming options"/>:<>{!providers||![...(providers.stream??[]),...(providers.rent??[]),...(providers.buy??[])].length?<p className="muted small">No streaming options found in Georgia.</p>:Object.entries(providers).map(([kind,names])=>names.length?<div className="stack" key={kind}><strong className="small">{kind==='stream'?'Stream':kind==='rent'Rent':'Buy'}</strong><div className="row">{names.map(name=><span className="chip" key={name}>{name}</span>)}</div></div>:null)}{query.data?.link&&<a href={query.data.link} target="_blank" rel="noreferrer">View on JustWatch</a>}</>}<p className="small muted">Streaming data by JustWatch.</p></section>;
}